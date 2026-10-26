import {DumpPage} from '@/components/domain/dump/DumpPage';
import {toDumpPageProps} from '@/utils/dump';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {DUMP_FEED_ENTRIES, DUMP_TODAY} from './fixtures';

const DUMP_SCENARIOS: ScenarioTab[] = [
  {
    label: 'Feed',
    title: 'Dump — populated feed',
    note: 'Day-grouped entries (Today / Yesterday / older) with one long entry showing the 6-line clamp + Show more. nextCursor is null so the infinite-scroll observer stays inert against the fixtures.',
    content: (
      <DumpPage
        {...toDumpPageProps(
          {data: {entries: DUMP_FEED_ENTRIES, nextCursor: null}},
          DUMP_FEED_ENTRIES.length,
          DUMP_TODAY,
        )}
      />
    ),
  },
  {
    label: 'Empty',
    title: 'Dump — empty',
    note: 'First visit: the composer over the empty-state feed.',
    content: (
      <DumpPage
        {...toDumpPageProps(
          {data: {entries: [], nextCursor: null}},
          0,
          DUMP_TODAY,
        )}
      />
    ),
  },
];

export default function DumpScenarioPage() {
  return (
    <ScenarioPage
      title="Dump scenarios"
      description="The real dump page (BoardHeader + composer + day-grouped feed) fed
        fixture entries — the populated feed with Today/Yesterday/older headers
        and the 6-line clamp, plus the empty state. nextCursor is pinned
        null so the load-more observer stays inert against the fixtures."
    >
      <ScenarioTabs tabs={DUMP_SCENARIOS} />
    </ScenarioPage>
  );
}
