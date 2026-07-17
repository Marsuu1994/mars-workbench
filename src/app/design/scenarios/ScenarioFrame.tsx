import type {ReactNode} from 'react';
import {cn} from '@/components/ui/cn';
import {InteractionShield} from '../InteractionShield';

/** How a scenario frame sizes itself. */
export type ScenarioDisplay = 'fill' | 'fit';

interface ScenarioFrameProps {
  title: string;
  /** What state this scenario captures — the reason it's worth pinning */
  note?: string;
  /**
   * fill (default): the frame fills the remaining viewport — a 1:1 stand-in
   * for an app page inside AppShell's definite-height <main>, so h-full
   * chains (board columns, backlog) resolve exactly like production.
   * fit: partial display — the frame wraps its content with generous
   * vertical padding; tall content scrolls with the page.
   */
  display?: ScenarioDisplay;
  /** Dim the frame interior like a modal backdrop and center the panel. */
  overlay?: boolean;
  children: ReactNode;
}

/**
 * A labeled viewport frame around a scenario screen.
 *
 * Scenarios compose the real page components fed fixture data, so their
 * handlers are wired to live server actions and navigation. The frame wraps
 * them in an InteractionShield: hover states and scrolling stay live, but
 * clicks/submits/drags are swallowed and can never fire against fixture ids.
 * `contain: layout` makes the frame the containing block for `position:
 * fixed` descendants (e.g. the mobile dock) so they anchor inside the frame,
 * and `overflow-hidden` clips them to it.
 *
 * In fill mode the shield is `absolute inset-0` rather than a flex-1 child:
 * min-height:0 can't stop a flex item's *min-content contribution* from
 * propagating to ancestors (it's a floor, not a cap), so in-flow board
 * content would push the page past h-dvh and silently unbound the frame.
 * An abspos child contributes nothing to intrinsic sizing — the box's
 * [contain:layout] is already its containing block. min-h-96 keeps short
 * viewports usable by degrading into page scroll.
 *
 * The overlay backdrop is painted on the frame box itself (not a content
 * wrapper), so it always spans the whole framed area: in fit mode the box is
 * exactly content + padding tall, in fill mode it is the whole frame.
 */
export const ScenarioFrame = ({
  title,
  note,
  display = 'fill',
  overlay = false,
  children,
}: ScenarioFrameProps) => {
  const fill = display === 'fill';

  return (
    <div className={cn('flex flex-col gap-2', fill && 'min-h-0 flex-1')}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold">{title}</h3>
        {note && <p className="text-sm text-base-content/50">{note}</p>}
      </div>
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-xl border border-base-content/15 [contain:layout]',
          fill && 'min-h-96 flex-1',
          overlay && 'bg-base-300/60',
        )}
      >
        <InteractionShield
          className={cn(
            fill && 'absolute inset-0',
            fill && overlay && 'flex items-center justify-center p-4 md:p-6',
            !fill && 'py-12',
            !fill && overlay && 'flex flex-col items-center px-4 md:px-6',
          )}
        >
          {children}
        </InteractionShield>
      </div>
    </div>
  );
};
