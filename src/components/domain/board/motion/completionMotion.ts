/**
 * What plays when a Todo card is completed with ✓ Complete (board spec ›
 * FX-1, FX-2): a juice on a copy of the card where it stands, then the toss
 * into today's ring. The copy is laid over the page, so no column clips it;
 * the motion itself is the fx-* utilities' (globals.css), and this module
 * only places the copy and waits for each utility to end.
 */

/** The four juices, one picked at random for each completion */
export const Juice = {
  WOBBLE: 'WOBBLE',
  SHINE: 'SHINE',
  BURST: 'BURST',
  FLIP: 'FLIP',
} as const;
export type Juice = (typeof Juice)[keyof typeof Juice];

const JUICES: readonly Juice[] = Object.values(Juice);

const JUICE_CLASS: Record<Juice, string> = {
  [Juice.WOBBLE]: 'fx-juice-wobble',
  [Juice.SHINE]: 'fx-juice-shine',
  [Juice.BURST]: 'fx-juice-burst',
  [Juice.FLIP]: 'fx-juice-flip',
};

/** How many chips the burst throws, and the gold they alternate with */
const BURST_CHIP_COUNT = 12;
const BURST_GOLD = 'var(--color-warning)';
/** How far a chip flies: this share of the card's longer side, plus up to
    `jitter` px; its direction strays by up to `angleJitter` radians */
const BURST_REACH = {ratio: 0.45, jitter: 40, angleJitter: 0.4};
/** How far each chip turns as it flies, in degrees: the first, then this much
    more for each one after it */
const BURST_CHIP_TURN = {first: 200, step: 30};
/** Where the burst's +1 starts: this far in from the card's right edge and
    above its top, in px */
const BURST_PLUS_OFFSET = {fromRight: 28, above: 6};
/** How high the toss's arc rises above a straight line, in px */
const TOSS_ARC_HEIGHT = 48;
/** The copy flies above everything on the board, a lifted card included */
const COPY_Z_INDEX = '60';
/** The pose every juice ends in, which the toss starts from */
const LIFT_POSE = 'rotate(-4deg) scale(1.07)';

/** A juice at random, never the one played last (FX-1). */
export function pickJuice(
  lastJuice: Juice | null,
  random: () => number = Math.random,
): Juice {
  const choices = JUICES.filter(juice => juice !== lastJuice);
  return choices[Math.floor(random() * choices.length)];
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Resolves once every animation on the element and inside it has ended. */
async function waitForAnimations(element: Element): Promise<void> {
  await Promise.allSettled(
    element.getAnimations({subtree: true}).map(({finished}) => finished),
  );
}

/**
 * Appends a fixed element to `host` at the viewport point (left, top). A fixed
 * element's origin is its containing block's, which isn't the viewport's
 * under any ancestor with a transform, a filter or `contain`, so the element
 * is measured at (0, 0) first and moved by the difference.
 */
function placeFixed(
  host: Element,
  element: HTMLElement,
  left: number,
  top: number,
) {
  Object.assign(element.style, {position: 'fixed', left: '0', top: '0'});
  host.append(element);
  const origin = element.getBoundingClientRect();
  element.style.left = `${left - origin.left}px`;
  element.style.top = `${top - origin.top}px`;
}

function makeGhost(host: Element, card: HTMLElement): HTMLElement {
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true) as HTMLElement;
  for (const {name} of [...ghost.attributes]) {
    if (name !== 'class') ghost.removeAttribute(name);
  }
  ghost.querySelectorAll('button').forEach(button => {
    button.tabIndex = -1;
  });
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    margin: '0',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: COPY_Z_INDEX,
    pointerEvents: 'none',
  });
  placeFixed(host, ghost, rect.left, rect.top);
  card.style.visibility = 'hidden';
  return ghost;
}

/** The burst's chips and its +1, thrown from the card's centre. */
function throwBurst(host: Element, card: HTMLElement, kindColor: string) {
  const rect = card.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const reach = Math.max(rect.width, rect.height) * BURST_REACH.ratio;
  for (let index = 0; index < BURST_CHIP_COUNT; index++) {
    const angle =
      (index / BURST_CHIP_COUNT) * Math.PI * 2 +
      Math.random() * BURST_REACH.angleJitter;
    const distance = reach + Math.random() * BURST_REACH.jitter;
    const chip = document.createElement('i');
    chip.className = 'fx-juice-chip';
    chip.setAttribute('aria-hidden', 'true');
    chip.style.setProperty(
      '--fx-chip-color',
      index % 2 === 0 ? kindColor : BURST_GOLD,
    );
    chip.style.setProperty('--fx-chip-x', `${Math.cos(angle) * distance}px`);
    chip.style.setProperty('--fx-chip-y', `${Math.sin(angle) * distance}px`);
    chip.style.setProperty(
      '--fx-chip-turn',
      `${BURST_CHIP_TURN.first + index * BURST_CHIP_TURN.step}deg`,
    );
    placeFixed(host, chip, centerX, centerY);
    chip.addEventListener('animationend', () => chip.remove());
  }
  const plus = document.createElement('b');
  plus.className = 'fx-juice-plus';
  plus.textContent = '+1';
  plus.setAttribute('aria-hidden', 'true');
  plus.style.setProperty('--fx-chip-color', kindColor);
  placeFixed(
    host,
    plus,
    rect.right - BURST_PLUS_OFFSET.fromRight,
    rect.top - BURST_PLUS_OFFSET.above,
  );
  plus.addEventListener('animationend', () => plus.remove());
}

/** Tosses the ghost from where it stands into the ring, along an arc. */
async function toss(ghost: HTMLElement, ring: Element) {
  const from = ghost.getBoundingClientRect();
  const to = ring.getBoundingClientRect();
  const shiftX = to.left + to.width / 2 - (from.left + from.width / 2);
  const shiftY = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost.style.setProperty('--fx-toss-x', `${shiftX}px`);
  ghost.style.setProperty('--fx-toss-y', `${shiftY}px`);
  ghost.style.setProperty(
    '--fx-toss-cy',
    `${Math.min(shiftY, 0) / 2 - TOSS_ARC_HEIGHT}px`,
  );
  ghost.classList.add('fx-toss');
  await waitForAnimations(ghost);
}

interface CompletionMotion {
  /** The card that was completed */
  card: HTMLElement;
  /** Today's ring, where the card lands */
  ring: Element;
  /** Where the copy and the burst's chips are laid, over the board */
  host: Element;
  juice: Juice;
  /** The card's kind colour, for the burst's chips */
  kindColor: string;
}

/**
 * Plays a completion and resolves once the card has landed; the returned
 * function takes the copy away, once the card has left Todo. Under reduced
 * motion the card only fades out where it stands (fx-fade-out).
 */
export async function playCompletion({
  card,
  ring,
  host,
  juice,
  kindColor,
}: CompletionMotion): Promise<() => void> {
  if (prefersReducedMotion()) {
    card.classList.add('fx-fade-out');
    await waitForAnimations(card);
    return () => {};
  }
  const ghost = makeGhost(host, card);
  ghost.classList.add(JUICE_CLASS[juice]);
  if (juice === Juice.BURST) throwBurst(host, card, kindColor);
  await waitForAnimations(ghost);
  // The juice ends in the lift pose fx-toss starts from
  ghost.classList.remove(JUICE_CLASS[juice]);
  ghost.style.transform = LIFT_POSE;
  await toss(ghost, ring);
  return () => ghost.remove();
}

/**
 * Slides each card that moved up into a gap with fx-slide: `before` holds
 * where each one stood, by its task's id, before the card above it left.
 */
export function slideIntoGap(
  cards: Iterable<HTMLElement>,
  before: Map<string, number>,
  readId: (card: HTMLElement) => string | undefined,
) {
  if (prefersReducedMotion()) return;
  for (const card of cards) {
    const id = readId(card);
    const top = id ? before.get(id) : undefined;
    if (top === undefined) continue;
    const shift = top - card.getBoundingClientRect().top;
    if (shift <= 0) continue;
    card.style.setProperty('--fx-slide-from', `${shift}px`);
    restartAnimationClass(card, 'fx-slide');
    card.addEventListener(
      'animationend',
      () => card.classList.remove('fx-slide'),
      {once: true},
    );
  }
}

/** Plays a class's animation again from its start on an element. */
export function restartAnimationClass(element: Element, className: string) {
  element.classList.remove(className);
  // Reading the layout makes the animation start over when the class returns
  void (element as HTMLElement).offsetWidth;
  element.classList.add(className);
}

/** The pulses asked for when ✓ Complete is pressed, and when today's ring
    closes (FX-7), in ms: on, off, on */
export const COMPLETE_VIBRATION = [12, 40, 24];
export const RING_CLOSE_VIBRATION = [20, 60, 40];

/** Asks the device to vibrate, where it can; not motion, so reduced motion
    doesn't stop it (FX-7). */
export function vibrate(pattern: number[]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

/** A clock for measuring presses in ms; read only in event handlers. */
export const readPressClock = (): number => performance.now();
