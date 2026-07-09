import type {ReactNode} from 'react';

interface ScenarioFrameProps {
  title: string;
  /** What state this scenario captures — the reason it's worth pinning */
  note?: string;
  /** Fixed frame height standing in for a device viewport */
  height?: number;
  /**
   * Scenarios are visual references composed from the real page components fed
   * fixture data. Their handlers are wired to live server actions and
   * navigation, so the frame is `inert` by default — interactions are disabled
   * so a drag or a CTA click can't fire a real action against fixture IDs.
   * Opt back in only for a scenario that intentionally demos live interaction.
   */
  interactive?: boolean;
  children: ReactNode;
}

/**
 * A labeled fixed-height viewport frame. Scenario pages compose the real
 * page components inside these frames with fixture data, so each frame is
 * pixel-identical to production for that state.
 */
export const ScenarioFrame = ({
  title,
  note,
  height = 620,
  interactive = false,
  children,
}: ScenarioFrameProps) => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-col gap-0.5">
      <h3 className="text-base font-semibold">{title}</h3>
      {note && <p className="text-sm text-base-content/50">{note}</p>}
    </div>
    <div
      className="overflow-hidden rounded-xl border border-base-content/15"
      style={{height}}
      inert={!interactive}
    >
      {children}
    </div>
  </div>
);
