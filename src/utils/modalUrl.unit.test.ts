import {describe, expect, it} from 'vitest';
import {
  getModalHref,
  getSearchWithModal,
  getSearchWithoutModal,
  readOpenModal,
} from './modalUrl';

const KEYS = {
  newProject: [],
  editStep: ['stepId'],
  moveStep: ['stepId', 'projectId'],
} as const;

const read = (search: string) =>
  readOpenModal(new URLSearchParams(search), KEYS);

describe('readOpenModal', () => {
  it('reads a kind with no params', () => {
    expect(read('?modal=newProject')).toEqual({kind: 'newProject', params: {}});
  });

  it('reads a kind with its params, ignoring the page’s other params', () => {
    expect(read('?project=p1&modal=moveStep&stepId=s1&projectId=p2')).toEqual({
      kind: 'moveStep',
      params: {stepId: 's1', projectId: 'p2'},
    });
  });

  it('opens nothing without a modal, for an unknown kind or a missing param', () => {
    expect(read('?project=p1')).toBeNull();
    expect(read('?modal=deleteEverything')).toBeNull();
    expect(read('?modal=toString')).toBeNull();
    expect(read('?modal=editStep')).toBeNull();
    expect(read('?modal=editStep&stepId=')).toBeNull();
  });
});

describe('getSearchWithModal', () => {
  it('keeps the page’s other params and replaces an open modal', () => {
    expect(
      getSearchWithModal(
        '?project=p1&modal=editStep&stepId=s1',
        KEYS,
        'newProject',
        {},
      ),
    ).toBe('?project=p1&modal=newProject');
  });
});

describe('getSearchWithoutModal', () => {
  it('drops the modal and its params, and nothing else', () => {
    expect(
      getSearchWithoutModal('?project=p1&modal=editStep&stepId=s1', KEYS),
    ).toBe('?project=p1');
    expect(getSearchWithoutModal('?modal=newProject', KEYS)).toBe('');
  });
});

describe('getModalHref', () => {
  it('builds a link that the page reads back as the same modal', () => {
    const href = getModalHref('/kanban/projects', KEYS, 'editStep', {
      stepId: 's1',
    });
    expect(href).toBe('/kanban/projects?modal=editStep&stepId=s1');
    expect(read(new URL(href, 'https://example.test').search)).toEqual({
      kind: 'editStep',
      params: {stepId: 's1'},
    });
  });
});
