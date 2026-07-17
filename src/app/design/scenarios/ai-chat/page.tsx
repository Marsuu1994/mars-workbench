import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {AiChatScenario} from './AiChatScenario';
import {AI_CHAT_SEEDS} from './fixtures';

const AI_CHAT_SCENARIOS: ScenarioTab[] = AI_CHAT_SEEDS.map(
  ({label, title, note, seed}) => ({
    label,
    title,
    note,
    overlay: true,
    content: <AiChatScenario seed={seed} />,
  }),
);

export default function AiChatScenarioPage() {
  return (
    <ScenarioPage
      title="Plan — AI assist plan creation"
      description="The real AI Plan Assistant modal content across its lifecycle —
        welcome, generation, drafts, approval, and failure — rendered inline by
        seeding the chat store with fixture conversations."
      maxWidthClass="max-w-4xl"
    >
      <ScenarioTabs tabs={AI_CHAT_SCENARIOS} />
    </ScenarioPage>
  );
}
