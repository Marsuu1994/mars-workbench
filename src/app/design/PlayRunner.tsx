'use client';

import {useLayoutEffect, type RefObject} from 'react';
import {
  useTranslations,
  type Messages,
  type MessageKeys,
  type NestedKeyOf,
} from 'next-intl';

/**
 * An en.json key whose message is a control's accessible name. Typed, so a
 * renamed or deleted key fails tsc instead of breaking a scenario.
 */
export type PlayLabel = MessageKeys<Messages, NestedKeyOf<Messages>>;

/** The control to act on, found by its accessible name. */
export type PlayTarget = (
  | {
      /** App copy: the en.json key of the control's name */
      label: PlayLabel;
    }
  | {
      /** Copy outside en.json (gallery demo strings): the name itself */
      name: string;
    }
) & {
  /** CSS selector narrowing the search, e.g. one fixture card */
  within?: string;
};

/**
 * One user action replayed after mount. Plain data, not a function: scenario
 * tabs are declared in server components and handed to the client tabs.
 */
export interface PlayStep {
  click: PlayTarget;
}

interface PlayRunnerProps {
  steps: PlayStep[];
  /**
   * The element a play searches within and opens the click gate on — a
   * frame's InteractionShield, or a gallery `<Play>` box.
   */
  scopeRef: RefObject<HTMLDivElement | null>;
  onError: (message: string) => void;
}

const INTERACTIVE =
  'button, a[href], [role="button"], input, select, textarea, summary';

const normalize = (text: string | null) =>
  (text ?? '').replace(/\s+/g, ' ').trim();

/** The names a user or a screen reader knows a control by. */
const namesOf = (element: Element) =>
  [
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.textContent,
  ].map(normalize);

/** Clicks the single control named `name`, opening the gate just for it. */
const clickByName = (root: HTMLElement, name: string, within?: string) => {
  const scope = within ? root.querySelector(within) : root;
  if (!scope) throw new Error(`nothing matches "${within}"`);

  const matches = Array.from(
    scope.querySelectorAll<HTMLElement>(INTERACTIVE),
  ).filter(element => namesOf(element).includes(name));
  if (matches.length !== 1) {
    throw new Error(`${matches.length} controls named "${name}"`);
  }

  // InteractionShield lets a click through only while this gate is open, so
  // human clicks stay swallowed.
  root.dataset.playing = 'true';
  try {
    matches[0].click();
  } finally {
    delete root.dataset.playing;
  }
};

/** Lets React commit the previous step before the next one looks for its target. */
const nextTask = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Reaches a pinned state the way a user would: after mount it clicks real
 * controls, so the component gets there through its own handlers and needs
 * no scenario-only props. Each target must resolve to exactly one control;
 * anything else is reported through `onError` instead of silently leaving
 * the rest state on screen. Render it after the scope element, never inside
 * it — a parent's ref is attached only after its children's layout effects.
 */
export const PlayRunner = ({steps, scopeRef, onError}: PlayRunnerProps) => {
  const t = useTranslations();

  // Layout effect: the first step lands before the browser paints, so the
  // rest state never flashes.
  useLayoutEffect(() => {
    // Once per mounted scope, i.e. per fresh mount of the content: StrictMode
    // re-runs effects and Fast Refresh can remount the runner alone, and a
    // second pass would click again (undoing a toggle).
    const root = scopeRef.current;
    if (!root) {
      // Rendered inside its own scope (see Play): fail loudly, never silently.
      onError('Play failed: the scope element is not mounted yet');
      return;
    }
    if (root.dataset.played) return;
    root.dataset.played = 'true';

    const run = async () => {
      for (let index = 0; index < steps.length; index++) {
        if (index > 0) await nextTask();
        if (!root.isConnected) return;
        const {within, ...target} = steps[index].click;
        const name = 'label' in target ? t(target.label) : target.name;
        try {
          clickByName(root, name, within);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(`Play step ${index + 1} failed: ${reason}`);
        }
      }
    };

    run().catch((error: Error) => {
      console.error(error);
      onError(error.message);
    });
  }, [steps, scopeRef, onError, t]);

  return null;
};
