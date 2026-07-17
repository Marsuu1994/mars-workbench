import type {ReactNode} from 'react';
import {InteractionShield} from '../InteractionShield';

interface ScenarioFrameProps {
  title: string;
  /** What state this scenario captures — the reason it's worth pinning */
  note?: string;
  children: ReactNode;
}

/**
 * A labeled viewport frame that fills the remaining page height (flex-1) and
 * grows with tall content — long scenarios (e.g. the plan form) scroll with
 * the page, not inside the frame.
 *
 * Scenarios compose the real page components fed fixture data, so their
 * handlers are wired to live server actions and navigation. The frame wraps
 * them in an InteractionShield: hover states and scrolling stay live, but
 * clicks/submits/drags are swallowed and can never fire against fixture ids.
 * `contain: layout` makes the frame the containing block for `position:
 * fixed` descendants (e.g. the mobile dock) so they anchor inside the frame,
 * and `overflow-hidden` clips them to it.
 */
export const ScenarioFrame = ({title, note, children}: ScenarioFrameProps) => (
  <div className="flex flex-1 flex-col gap-2">
    <div className="flex flex-col gap-0.5">
      <h3 className="text-base font-semibold">{title}</h3>
      {note && <p className="text-sm text-base-content/50">{note}</p>}
    </div>
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-base-content/15 [contain:layout]">
      <InteractionShield className="flex-1">{children}</InteractionShield>
    </div>
  </div>
);
