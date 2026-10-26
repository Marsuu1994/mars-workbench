import {
  fetchBoardAction,
  getEmptyBoardStateAction,
} from '@/actions/boardActions';
import {EmptyBoard} from '@/components/domain/board/EmptyBoard';
import {BoardPage} from '@/components/domain/board/BoardPage';

export default async function KanbanPage() {
  const board = await fetchBoardAction();

  if (!board) {
    const emptyState = await getEmptyBoardStateAction();
    return (
      <EmptyBoard
        stats={emptyState.kind === 'returning' ? emptyState.stats : undefined}
      />
    );
  }

  return <BoardPage {...board} />;
}
