'use client';

import {useRef, useState, type ReactNode} from 'react';
import {cn} from '@/components/ui/cn';
import {InteractionShield} from '../InteractionShield';
import {PlayRunner, type PlayStep} from '../PlayRunner';
import {SCENARIO_PAGE_MIN_HEIGHT, SCENARIO_SCREEN_HEIGHT} from '../constants';

/** How a scenario frame sizes itself. */
export type ScenarioDisplay = 'screen' | 'page' | 'fit';

interface ScenarioFrameProps {
  title: string;
  /** What state this scenario captures — the reason it's worth pinning */
  note?: string;
  /**
   * screen (default): an app page that scrolls inside itself (board columns,
   * backlog, the Projects panes). The frame is exactly as tall as a typical
   * browser window (SCENARIO_SCREEN_HEIGHT), whatever the console's own
   * window is, so h-full chains resolve the way a user sees them.
   * page: a page that scrolls as a whole in production (login, OAuth
   * consent). The frame is at least as tall as a browser window and grows
   * with the content, so the console page scrolls instead of the frame.
   * fit: everything standalone (empty states, sheets, inline modal panels)
   * — the frame wraps its content with generous vertical padding; tall
   * content scrolls with the page. Combine with `overlay` for modal panels.
   */
  display?: ScenarioDisplay;
  /** Dim the frame interior like a modal backdrop and center the panel. */
  overlay?: boolean;
  /** Steps replayed after mount to reach the pinned state — see PlayRunner. */
  play?: PlayStep[];
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
 * In screen mode the shield is `absolute inset-0` rather than a flex-1
 * child: min-height:0 can't stop a flex item's *min-content contribution*
 * from propagating to ancestors (it's a floor, not a cap), so in-flow board
 * content would stretch the frame past its fixed height. An abspos child
 * contributes nothing to intrinsic sizing — the box's [contain:layout] is
 * already its containing block. In page mode the shield stays in flow so
 * the content can grow the frame.
 *
 * The overlay backdrop is painted on the frame box itself (not a content
 * wrapper), so it always spans the whole framed area: in fit mode the box is
 * exactly content + padding tall, in screen mode it is the whole frame.
 *
 * A tab that pins an interaction state declares `play` steps instead of
 * passing scenario-only props: PlayRunner clicks the real controls after
 * mount, through the shield's gate. A failed step is printed under the note
 * so a broken play never passes for the rest state. Time is frozen inside
 * the frame (`data-time="frozen"`): `fx-countdown` clocks hold, so a pinned
 * toast neither drains nor dismisses itself.
 */
export const ScenarioFrame = ({
  title,
  note,
  display = 'screen',
  overlay = false,
  play,
  children,
}: ScenarioFrameProps) => {
  const isScreen = display === 'screen';
  const isPage = display === 'page';
  const isFit = display === 'fit';
  const shieldRef = useRef<HTMLDivElement>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold">{title}</h3>
        {note && <p className="text-sm text-base-content/50">{note}</p>}
        {playError && (
          <p role="alert" className="text-sm font-semibold text-error">
            {playError}
          </p>
        )}
      </div>
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-xl border border-base-content/15 [contain:layout]',
          isScreen && SCENARIO_SCREEN_HEIGHT,
          isPage && SCENARIO_PAGE_MIN_HEIGHT,
          overlay && 'bg-base-300/60',
        )}
        data-time="frozen"
      >
        <InteractionShield
          ref={shieldRef}
          className={cn(
            isScreen && 'absolute inset-0',
            isScreen &&
              overlay &&
              'flex items-center justify-center p-4 md:p-6',
            isPage && 'flex flex-1 flex-col',
            isFit && 'py-12',
            isFit && overlay && 'flex flex-col items-center px-4 md:px-6',
          )}
        >
          {children}
        </InteractionShield>
        {play && (
          <PlayRunner
            steps={play}
            scopeRef={shieldRef}
            onError={setPlayError}
          />
        )}
      </div>
    </div>
  );
};
