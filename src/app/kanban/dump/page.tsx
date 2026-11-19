import {
  countDumpEntriesAction,
  fetchDumpEntriesAction,
} from '@/actions/dumpActions';
import {getTodayDate} from '@/utils/dateUtils';
import {toDumpPageProps} from '@/utils/dump';
import {DumpPage} from '@/components/domain/dump/DumpPage';

export default async function KanbanDumpPage() {
  // Dump is plan-independent — no ensureSynced
  const [feed, totalCount] = await Promise.all([
    fetchDumpEntriesAction({}),
    countDumpEntriesAction(),
  ]);

  return <DumpPage {...toDumpPageProps(feed, totalCount, getTodayDate())} />;
}
