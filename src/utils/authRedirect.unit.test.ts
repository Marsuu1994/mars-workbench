import {describe, expect, it} from 'vitest';
import {
  buildAuthNextCookie,
  getSafeNextPath,
  withNextParam,
} from './authRedirect';

describe('getSafeNextPath', () => {
  it.each([
    ['/kanban/projects?project=1#top', '/kanban/projects?project=1#top'],
    ['/kanban/../design', '/design'],
  ])('keeps an in-app path: %s', (next, path) => {
    expect(getSafeNextPath(next)).toBe(path);
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['kanban'],
    ['https://evil.example/kanban'],
    ['//evil.example'],
    ['/\\evil.example'],
    ['/\t/evil.example'],
    ['/\n/evil.example'],
  ])('sends %j home, never off the site', next => {
    expect(getSafeNextPath(next)).toBe('/');
  });
});

describe('buildAuthNextCookie', () => {
  it('carries the path to the callback for ten minutes', () => {
    expect(buildAuthNextCookie('/kanban?x=1', true)).toBe(
      'mw-auth-next=%2Fkanban%3Fx%3D1; Path=/auth/callback; Max-Age=600; SameSite=Lax; Secure',
    );
  });

  it('expires the cookie for the home page, and skips Secure on http', () => {
    expect(buildAuthNextCookie('/', false)).toBe(
      'mw-auth-next=%2F; Path=/auth/callback; Max-Age=0; SameSite=Lax',
    );
  });
});

describe('withNextParam', () => {
  it('adds next unless it is the home page', () => {
    expect(withNextParam('/auth/login', '/kanban?x=1')).toBe(
      '/auth/login?next=%2Fkanban%3Fx%3D1',
    );
    expect(withNextParam('/auth/login', '/')).toBe('/auth/login');
  });
});
