import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getNativeApiUserId} from './auth';

const TOKEN = 'a-long-random-token';
const USER_ID = '6f0c7f8e-1d2b-4c3a-9e8f-0a1b2c3d4e5f';

const requestWith = (authorization?: string) =>
  new Request('http://localhost:3000/api/v1/dump-entries', {
    method: 'POST',
    headers: authorization ? {authorization} : {},
  });

beforeEach(() => {
  vi.stubEnv('NATIVE_API_TOKEN', TOKEN);
  vi.stubEnv('NATIVE_API_USER_ID', USER_ID);
});

describe('getNativeApiUserId', () => {
  it('acts as the configured user for the configured token', () => {
    expect(getNativeApiUserId(requestWith(`Bearer ${TOKEN}`))).toBe(USER_ID);
    expect(getNativeApiUserId(requestWith(`bearer ${TOKEN}`))).toBe(USER_ID);
  });

  it('refuses a request without the token', () => {
    expect(getNativeApiUserId(requestWith())).toBeUndefined();
    expect(getNativeApiUserId(requestWith('Bearer'))).toBeUndefined();
    expect(getNativeApiUserId(requestWith(`Basic ${TOKEN}`))).toBeUndefined();
    expect(getNativeApiUserId(requestWith('Bearer wrong'))).toBeUndefined();
    expect(getNativeApiUserId(requestWith(`Bearer ${TOKEN}x`))).toBeUndefined();
  });

  it('refuses every request while the deployment is not configured', () => {
    vi.stubEnv('NATIVE_API_TOKEN', '');
    expect(getNativeApiUserId(requestWith('Bearer '))).toBeUndefined();
    expect(getNativeApiUserId(requestWith(`Bearer ${TOKEN}`))).toBeUndefined();

    vi.stubEnv('NATIVE_API_TOKEN', TOKEN);
    vi.stubEnv('NATIVE_API_USER_ID', 'not-a-uuid');
    expect(getNativeApiUserId(requestWith(`Bearer ${TOKEN}`))).toBeUndefined();
  });
});
