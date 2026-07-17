'use client';

import {useState, type ReactNode} from 'react';
import {TabBar} from '@/components/ui/TabBar';
import {ScenarioFrame, type ScenarioDisplay} from './ScenarioFrame';

export interface ScenarioTab {
  /** Short label shown in the tab bar */
  label: string;
  /** Frame heading — the scenario's full title */
  title: string;
  /** What state this scenario captures — the reason it's worth pinning */
  note?: string;
  /** Frame sizing — see ScenarioFrame. fill (default) or fit. */
  display?: ScenarioDisplay;
  /** Dim the frame interior like a modal backdrop and center the panel. */
  overlay?: boolean;
  /** The scenario screen, composed from real page components + fixtures */
  content: ReactNode;
}

interface ScenarioTabsProps {
  tabs: ScenarioTab[];
}

/**
 * Tab-controlled switching between scenario states: one frame is shown at a
 * time and the tab bar swaps between them. Only the active scenario is
 * mounted, so inactive screens never render.
 */
export const ScenarioTabs = ({tabs}: ScenarioTabsProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = tabs[activeIndex];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TabBar
        ariaLabel="Scenarios"
        labels={tabs.map(tab => tab.label)}
        activeIndex={activeIndex}
        onChange={setActiveIndex}
      />

      {/* Key by tab so switching always remounts the scenario: two tabs can
          render the same component (e.g. the board with the backlog closed
          vs. open), and without a fresh mount React would reuse the instance
          and ignore its new initial state (the backlog would stay as the
          first-mounted tab left it). */}
      <ScenarioFrame
        key={activeIndex}
        title={active.title}
        note={active.note}
        display={active.display}
        overlay={active.overlay}
      >
        {active.content}
      </ScenarioFrame>
    </div>
  );
};
