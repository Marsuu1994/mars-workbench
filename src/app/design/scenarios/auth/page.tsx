import {SettingsContent} from '@/components/domain/auth/SettingsContent';
import {BottomTabBar} from '@/components/application/BottomTabBar';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {LoginScenario} from './LoginScenario';
import {SCENARIO_USER, SCENARIO_PLAN_ID} from './fixtures';

const AUTH_SCENARIOS: ScenarioTab[] = [
  {
    label: 'Login',
    title: 'Login',
    note: 'Glow + grid atmosphere, brand mark, Google sign-in — the only unauthenticated screen.',
    content: <LoginScenario />,
  },
  {
    label: 'Settings (mobile)',
    title: 'Settings (mobile)',
    note: 'Profile card with bottom-anchored sign-out and version line, above the mobile dock (Settings active).',
    height: 560,
    content: (
      <div className="flex h-full flex-col bg-base-200/20 p-3">
        {/* [contain:layout] pins the fixed dock to this phone column. */}
        <div className="relative mx-auto flex min-h-0 w-full max-w-[430px] flex-1 flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-lg [contain:layout]">
          <div className="min-h-0 flex-1 overflow-y-auto pb-16">
            <SettingsContent user={SCENARIO_USER} />
          </div>
          <BottomTabBar
            user={SCENARIO_USER}
            activePlanId={SCENARIO_PLAN_ID}
            pathname="/kanban/settings"
          />
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
