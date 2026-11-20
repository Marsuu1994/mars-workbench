// Spec: design/specs/board.md
import {describe, expect, it} from 'vitest';
import {Juice, pickJuice} from './completionMotion';

const JUICES = Object.values(Juice);

describe('pickJuice', () => {
  it('FX-1 picks one of the four juices, at random', () => {
    const picks = [0, 0.3, 0.6, 0.99].map(random =>
      pickJuice(null, () => random),
    );

    expect(new Set(picks)).toEqual(new Set(JUICES));
  });

  it('FX-1 never picks the juice that played last', () => {
    for (const last of JUICES) {
      for (const random of [0, 0.34, 0.67, 0.99]) {
        expect(pickJuice(last, () => random)).not.toBe(last);
      }
    }
  });
});
