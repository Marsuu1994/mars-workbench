'use client';

import {useState, type ReactNode} from 'react';
import {ScenarioFrame} from './ScenarioFrame';

export interface ScenarioTab {
  /** Short label shown in the tab bar */
  label: string;
  /** Frame heading — the scenario's full title */
  title: string;
  /** What state this scenario captures — the reason it's worth pinning */
  note?: string;
  /** Fixed frame height standing in for a device viewport */
  height?: number;
  /** The scenario screen, composed from real page components + fixtures */
  content: ReactNode;
}

interface ScenarioTabsProps {
  tabs: ScenarioTab[];
}

/**
 * Tab-controlled switching between scenario states, mirroring the screen
 * navigator of the HTML mockups these scenarios replace: one frame is shown
 * at a time and the tab bar swaps between them. Only the active scenario is
 * mounted, so inactive boards never render.
 */
export const ScenarioTabs = ({tabs}: ScenarioTabsProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = tabs[activeIndex];

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Scenarios"
        className="flex flex-wrap gap-1 self-start rounded-xl border border-base-content/10 bg-base-100/60 p-1"
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveIndex(index)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-base-content/50 hover:text-base-content'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Key by tab so switching always remounts the scenario: two tabs can
          render the same component (e.g. the board with the backlog closed
          vs. open), and without a fresh mount React would reuse the instance
          and ignore its new initial state (the backlog would stay as the
          first-mounted tab left it). */}
      <ScenarioFrame
        key={activeIndex}
        title={active.title}
        note={active.note}
        height={active.height}
      >
        {active.content}
      </ScenarioFrame>
    </div>
  );
};
