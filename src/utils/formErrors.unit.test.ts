import {describe, expect, it} from 'vitest';
import {toFormErrorMessage} from './formErrors';

describe('toFormErrorMessage', () => {
  it('joins form-level and field messages, so a field error never shows blank', () => {
    expect(
      toFormErrorMessage({
        formErrors: ['Plan not found'],
        fieldErrors: {title: ['Title is required'], size: undefined},
      }),
    ).toBe('Plan not found, Title is required');
    expect(
      toFormErrorMessage({formErrors: [], fieldErrors: {goal: ['Too long']}}),
    ).toBe('Too long');
  });

  it('falls back to the raw shape for anything else', () => {
    expect(toFormErrorMessage({code: 'oops'})).toBe('{"code":"oops"}');
  });
});
