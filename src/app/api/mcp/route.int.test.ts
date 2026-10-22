/**
 * The MCP endpoint end to end, minus HTTP and OAuth: JSON-RPC requests go
 * straight to the route handler, acting as MCP_DEV_USER_ID (local development
 * identity), through the tool schemas and services into the test database.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {prisma} from '@/lib/prisma';
import {PriorityQuadrant, TaskSize, TaskType} from '@/utils/enums';
import {newHabit, newUserId} from '../../../../test/factories';
import {MOMENTS, freezeTime} from '../../../../test/time';
import {POST} from './route';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  vi.stubEnv('MCP_DEV_USER_ID', userId);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  freezeTime(MOMENTS.WEDNESDAY_NOON);
});

interface ToolResult {
  content: {type: string; text: string}[];
  structuredContent?: Record<string, never>;
  isError?: boolean;
}

/** Sends one JSON-RPC request; streamable HTTP may answer as an SSE event. */
const sendRpc = async (
  method: string,
  params: object,
  headers: Record<string, string> = {},
) => {
  const response = await POST(
    new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...headers,
      },
      body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params}),
    }),
  );
  const text = await response.text();
  const event = text.split('\n').find(line => line.startsWith('data: '));
  return {
    status: response.status,
    body: text ? JSON.parse(event ? event.slice('data: '.length) : text) : null,
  };
};

const callTool = async (name: string, toolArguments: object = {}) => {
  const {body} = await sendRpc('tools/call', {name, arguments: toolArguments});
  return body.result as ToolResult;
};

describe('tools/list', () => {
  it("is Claude's contract: names, schemas and descriptions", async () => {
    const {status, body} = await sendRpc('tools/list', {});
    expect(status).toBe(200);
    const tools = body.result.tools as {name: string}[];
    expect(tools.map(({name}) => name)).toEqual([
      'get_planning_guide_before_everything',
      'get_planning_context',
      'create_plan',
      'update_plan',
      'update_habit',
      'create_project',
      'update_project',
      'create_one_off_tasks',
      'update_one_off_tasks',
    ]);
    // A change here changes what Claude sees: update the snapshot on purpose
    expect(tools).toMatchSnapshot();
  });
});

describe('tools/call', () => {
  it('reads the planning guide', async () => {
    const result = await callTool('get_planning_guide_before_everything');
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });

  it('plans a week: project, plan, update, habit — then reads it back', async () => {
    const project = await callTool('create_project', {
      title: 'Spanish A2',
      steps: [{title: 'Unit 1', size: TaskSize.SMALL}],
    });
    const {projectId, steps} = project.structuredContent!.project as {
      projectId: string;
      steps: {stepId: string}[];
    };

    const created = await callTool('create_plan', {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
      addProjectStepIds: [steps[0].stepId],
    });
    expect(created.isError).toBeUndefined();
    const {planId, templates} = created.structuredContent!.plan as {
      planId: string;
      templates: {templateId: string}[];
    };

    const updated = await callTool('update_plan', {
      planId,
      description: 'Spanish week',
    });
    expect(updated.isError).toBeUndefined();

    const habit = await callTool('update_habit', {
      templateId: templates[0].templateId,
      title: 'Morning run',
    });
    expect(habit.structuredContent).toMatchObject({
      habit: {title: 'Morning run'},
    });

    const renamed = await callTool('update_project', {
      projectId,
      title: 'Spanish A2 course',
    });
    expect(renamed.isError).toBeUndefined();

    const context = await callTool('get_planning_context');
    expect(context.structuredContent).toMatchObject({
      activePlan: {planId, description: 'Spanish week'},
      projects: [{projectId, title: 'Spanish A2 course'}],
    });
    expect(await prisma.plan.count({where: {userId}})).toBe(1);
  });

  it('keeps one-offs: create a batch, read the matrix, mark one done', async () => {
    await callTool('create_plan', {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
    });
    const created = await callTool('create_one_off_tasks', {
      tasks: [
        {
          title: 'Renew passport',
          size: TaskSize.SMALL,
          quadrant: PriorityQuadrant.SCHEDULE,
        },
        {
          title: 'Book dentist',
          size: TaskSize.EXTRA_SMALL,
          quadrant: PriorityQuadrant.DO_FIRST,
        },
      ],
    });
    expect(created.isError).toBeUndefined();
    const [passport, dentist] = created.structuredContent!.oneOffTasks as {
      taskId: string;
    }[];

    const done = await callTool('update_one_off_tasks', {
      completeTaskIds: [dentist.taskId],
    });
    expect(done.structuredContent).toMatchObject({
      completedTasks: [{taskId: dentist.taskId, state: 'DONE'}],
    });

    const context = await callTool('get_planning_context');
    expect(context.structuredContent).toMatchObject({
      activePlan: {
        oneOffTasks: [{taskId: dentist.taskId, status: 'DONE'}],
      },
      oneOffTasks: [{taskId: passport.taskId, state: 'UNTRACKED'}],
    });
  });

  it('answers a planning error with isError and the reason', async () => {
    const result = await callTool('update_plan', {
      planId: newUserId(),
      description: 'Nothing to update',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/no active plan/i);
  });

  it('rejects arguments that fail the schema before any service runs', async () => {
    const result = await callTool('create_project', {title: ''});
    expect(result.isError).toBe(true);
    expect(await prisma.project.count({where: {userId}})).toBe(0);
  });
});

describe('authentication', () => {
  it('answers 401 to a bearer token that does not verify', async () => {
    const {status} = await sendRpc(
      'tools/list',
      {},
      {authorization: 'Bearer not-a-jwt'},
    );
    expect(status).toBe(401);
  });
});
