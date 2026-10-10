'use client';

import type {BoardCard} from '@/utils/boardCardUtils';
import {MobileBacklogPanel} from '@/components/domain/board/MobileBacklogPanel';
import MobileBacklogCard from '@/components/domain/board/MobileBacklogCard';

interface MobileBacklogSheetFrameProps {
  /** The staged cards, as toBoardCards derives them from the fixtures */
  cards: BoardCard[];
}

const NOOP = () => {};

/**
 * The live mobile backlog sheet's panel, rendered inline in a phone-width
 * sheet frame — no top-layer <dialog>, so it stays inside the scenario frame
 * and inherits its inertness.
 */
export const MobileBacklogSheetFrame = ({
  cards,
}: MobileBacklogSheetFrameProps) => (
  <div className="flex h-full flex-col bg-base-200/20 p-3">
    <div className="mx-auto flex min-h-0 w-full max-w-[430px] flex-1 flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-lg">
      <MobileBacklogPanel count={cards.length} onClose={NOOP}>
        {cards.map(card => (
          <MobileBacklogCard key={card.task.id} card={card} onPull={NOOP} />
        ))}
      </MobileBacklogPanel>
    </div>
  </div>
);
