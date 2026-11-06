'use client';

import type {BacklogGroups} from '@/utils/boardCardUtils';
import {MobileBacklogPanel} from '@/components/domain/board/MobileBacklogPanel';
import {BacklogGroupList} from '@/components/domain/board/backlog-group/BacklogGroupList';
import {BoardPageContext} from '@/components/domain/board/BoardPageContext';
import {inertBoardPageContext} from '../../constants';

interface MobileBacklogSheetFrameProps {
  /** Staged tasks — the header badge */
  count: number;
  /** The staged groups, as toBacklogGroups derives them from the fixtures */
  groups: BacklogGroups;
}

const NOOP = () => {};

/**
 * The live mobile backlog sheet's panel, rendered inline in a phone-width
 * sheet frame — no top-layer <dialog>, so it stays inside the scenario frame
 * and inherits its inertness. Outside BoardPage, its groups read an inert
 * page context.
 */
export const MobileBacklogSheetFrame = ({
  count,
  groups,
}: MobileBacklogSheetFrameProps) => (
  <div className="flex h-full flex-col bg-base-200/20 p-3">
    <div className="mx-auto flex h-[640px] min-h-0 w-full max-w-[430px] flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-lg">
      <MobileBacklogPanel count={count} onClose={NOOP}>
        <BoardPageContext value={inertBoardPageContext()}>
          <BacklogGroupList groups={groups} variant="mobile" />
        </BoardPageContext>
      </MobileBacklogPanel>
    </div>
  </div>
);
