import {twMerge} from 'tailwind-merge';

/**
 * Merge Tailwind class lists with conflict resolution (later wins).
 * Every ui/ component funnels its className prop through this so caller
 * overrides beat component defaults deterministically — raw template
 * strings made the winner a CSS-order coin flip (the SizeChip
 * double-chip bug).
 */
export const cn = (...classes: Array<string | false | null | undefined>) =>
  twMerge(classes.filter(Boolean).join(' '));
