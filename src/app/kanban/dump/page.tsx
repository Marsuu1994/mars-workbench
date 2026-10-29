import {
  countDumpEntriesAction,
  fetchDumpEntriesAction,
} from '@/actions/dumpActions';
import {getISOWeekKey, getTodayDate} from '@/utils/dateUtils';
import {DumpScreen} from '@/components/domain/dump/DumpScreen';

export default async function DumpPage() {
  // Dump is plan-independent — no ensureSynced; the header badge is just the
  // current ISO week.
  const [feed, totalCount] = await Promise.all([
    fetchDumpEntriesAction({}),
    countDumpEntriesAction(),
  ]);
  // The cursorless first page can only succeed; fall back to empty on the
  // (unreachable) error branch so the types stay honest.
  const feedData = 'data' in feed ? feed.data : null;
  const {entries, nextCursor} = feedData ?? {entries: [], nextCursor: null};

  return (
    <DumpScreen
      periodKey={getISOWeekKey(getTodayDate())}
      initialEntries={entries}
      initialNextCursor={nextCursor}
      initialTotalCount={totalCount}
    />
  );
}
