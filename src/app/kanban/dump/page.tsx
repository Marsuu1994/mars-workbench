import {fetchDumpEntriesAction} from '@/actions/dumpActions';
import {countDumpEntries} from '@/lib/db/dumpEntries';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';
import {getISOWeekKey, getTodayDate} from '@/utils/dateUtils';
import {DumpScreen} from '@/components/domain/dump/DumpScreen';

export default async function DumpPage() {
  // Dump is plan-independent — no ensureSynced; the header badge is just the
  // current ISO week. userId is resolved here for the direct count read.
  const userId = await getCurrentUserId();
  const [feed, totalCount] = await Promise.all([
    fetchDumpEntriesAction({}),
    countDumpEntries(userId),
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
