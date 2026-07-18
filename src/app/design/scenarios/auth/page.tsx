import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {LoginScenario} from './LoginScenario';
import {SettingsScenario} from './SettingsScenario';

const AUTH_SCENARIOS: ScenarioTab[] = [
  {
    label: 'Login',
    title: 'Login',
    note: 'Glow + grid atmosphere, brand mark, Google sign-in — the only unauthenticated screen.',
    content: <LoginScenario />,
  },
  {
    label: 'Settings',
    title: 'Settings overlay — rest',
    note: 'The one settings panel (identity, theme picker, sign-out at rest) — mobile sheet and desktop modal render this same component, so presentation is not a separate state.',
    display: 'fit',
    content: (
      <div className="flex justify-center p-4">
        <div className="fx-panel-solid w-full max-w-[430px] rounded-box p-6">
          <SettingsScenario />
        </div>
      </div>
    ),
  },
  {
    label: 'Settings — sign-out confirm',
    title: 'Settings overlay — sign-out confirm',
    note: 'Same panel with the two-step sign-out pinned in its triggered state (Cancel / Sign out).',
    display: 'fit',
    content: (
      <div className="flex justify-center p-4">
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
