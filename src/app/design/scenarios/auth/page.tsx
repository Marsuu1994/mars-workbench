import {BottomTabBar} from '@/components/application/BottomTabBar';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {LoginScenario} from './LoginScenario';
import {SettingsScenario} from './SettingsScenario';
import {SCENARIO_USER, SCENARIO_PLAN_ID} from './fixtures';

const AUTH_SCENARIOS: ScenarioTab[] = [
  {
    label: 'Login',
    title: 'Login',
    note: 'Glow + grid atmosphere, brand mark, Google sign-in — the only unauthenticated screen.',
    content: <LoginScenario />,
  },
  {
    label: 'Settings overlay',
    title: 'Settings overlay — both presentations',
    note: 'One OverlayShell responsive overlay, two breakpoint presentations: the mobile bottom sheet (rest state, dock trigger pressed) and the desktop centered modal (sign-out pinned in its confirm state).',
    display: 'fit',
    content: (
      <div className="flex flex-wrap items-start justify-center gap-8 p-4">
        {/* Mobile: bottom-sheet presentation above the pressed dock trigger.
            [contain:layout] pins the fixed dock to this phone column. */}
        <div className="relative flex h-[560px] w-full max-w-[390px] flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-lg [contain:layout]">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-16">
            <SettingsScenario />
          </div>
          <BottomTabBar
            user={SCENARIO_USER}
            activePlanId={SCENARIO_PLAN_ID}
            pathname="/kanban"
            settingsOpen
          />
        </div>
        {/* Desktop: centered-modal presentation, sign-out confirm pinned. */}
        <div className="fx-panel-solid w-full max-w-[430px] rounded-box p-6">
          <SettingsScenario signOutTriggered />
        </div>
      </div>
    ),
  },
];

export default function AuthScenarioPage() {
  return (
    <ScenarioPage
      title="Auth scenarios"
      description="Login and settings with fixture identity. The app sidebar's
        expanded/collapsed states live in the Design Console's Application tab —
        they are component states, not screens."
      maxWidthClass="max-w-4xl"
    >
      <ScenarioTabs tabs={AUTH_SCENARIOS} />
    </ScenarioPage>
  );
}
