/**
 * The iOS app's capture endpoint end to end, minus HTTP: requests go straight
 * to the route handler, through the token check, the schema and the service
 * into the test database.
 */
import {randomUUID} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {prisma} from '@/lib/prisma';
import {DUMP_BATCH_LIMIT, DUMP_PAGE_PATH} from '@/utils/dump';
import {newUserId} from '../../../../../test/factories';
import {MOMENTS, freezeTime} from '../../../../../test/time';
import {POST} from './route';

vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));

const TOKEN = 'test-native-token';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  vi.stubEnv('NATIVE_API_TOKEN', TOKEN);
  vi.stubEnv('NATIVE_API_USER_ID', userId);
  vi.mocked(revalidatePath).mockClear();
  freezeTime(MOMENTS.WEDNESDAY_NOON);
});

const post = async (body: unknown, token = TOKEN) => {
  const response = await POST(
    new Request('http://localhost:3000/api/v1/dump-entries', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
  return {status: response.status, body: await response.json()};
};

const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

const entry = (content: string, capturedAt = anHourAgo()) => ({
  id: randomUUID(),
  content,
  capturedAt: capturedAt.toISOString(),
});

const storedEntries = () =>
  prisma.dumpEntry.findMany({
    where: {userId},
    orderBy: {createdAt: 'asc'},
    select: {id: true, content: true, createdAt: true},
  });

describe('POST /api/v1/dump-entries', () => {
  it('stores each entry with its own id and the moment it was written down', async () => {
    const first = entry('Call the dentist', new Date(Date.now() - 7200000));
    const second = entry('  An idea\nwith two lines  ');

    const {status, body} = await post({entries: [first, second]});

    expect(status).toBe(200);
    expect(body).toEqual({acceptedIds: [first.id, second.id]});
    expect(await storedEntries()).toEqual([
      {
        id: first.id,
        content: 'Call the dentist',
        createdAt: new Date(first.capturedAt),
      },
      {
        id: second.id,
        content: 'An idea\nwith two lines',
        createdAt: new Date(second.capturedAt),
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(DUMP_PAGE_PATH);
  });

  it('stores an entry sent twice once, and accepts it both times', async () => {
    const thought = entry('Sent again after a lost answer');

    await post({entries: [thought]});
    const {status, body} = await post({entries: [thought, entry('New one')]});

    expect(status).toBe(200);
    expect(body.acceptedIds).toContain(thought.id);
    expect(await storedEntries()).toHaveLength(2);
  });

  it('lowercases an upper-case id, as Swift writes them', async () => {
    const thought = entry('From the phone');
    const upperCaseId = thought.id.toUpperCase();

    const {body} = await post({entries: [{...thought, id: upperCaseId}]});

    expect(body).toEqual({acceptedIds: [thought.id]});
    expect(await storedEntries()).toMatchObject([{id: thought.id}]);
  });

  it('stores an entry from the future as now', async () => {
    const fromTheFuture = entry(
      'Phone clock runs fast',
      new Date(Date.now() + 600000),
    );

    await post({entries: [fromTheFuture]});

    expect(await storedEntries()).toMatchObject([{createdAt: new Date()}]);
  });

  it('keeps milliseconds and drops anything finer', async () => {
    const thought = {
      ...entry('Precise'),
      capturedAt: '2026-10-13T11:00:00.123456+00:00',
    };

    await post({entries: [thought]});

    expect(await storedEntries()).toMatchObject([
      {createdAt: new Date('2026-10-13T11:00:00.123Z')},
    ]);
  });

  it('refuses a request without the right token and writes nothing', async () => {
    const {status, body} = await post({entries: [entry('Hi')]}, 'wrong');

    expect(status).toBe(401);
    expect(body).toEqual({error: {code: 'unauthorized'}});
    expect(await storedEntries()).toEqual([]);
  });

  it('refuses a whole batch when one entry is invalid', async () => {
    const cases = [
      'not json',
      {entries: []},
      {entries: [entry('Fine'), entry('   ')]},
      {entries: [entry('x'.repeat(10001))]},
      {entries: [{...entry('Fine'), id: 'not-a-uuid'}]},
      {entries: [{...entry('Fine'), capturedAt: 'yesterday'}]},
      {
        entries: Array.from({length: DUMP_BATCH_LIMIT + 1}, (_, index) =>
          entry(`Thought ${index}`),
        ),
      },
    ];

    for (const body of cases) {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('invalid_body');
    }
    expect(await storedEntries()).toEqual([]);
  });
});
