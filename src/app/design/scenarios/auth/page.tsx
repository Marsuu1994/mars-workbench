import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {ConsentInvalidScreen} from '@/components/domain/auth/ConsentInvalidScreen';
import {AuthScreenScenario} from './AuthScreenScenario';
import {ConsentScenario} from './ConsentScenario';
import {LoginScenario} from './LoginScenario';
import {SettingsScenario} from './SettingsScenario';

// Both settings tabs mount the same panel; the confirm tab reaches its state
// the way a user would — one click on Sign out.
const settingsPanel = (
  <div className="flex justify-center p-4">
    <div className="fx-panel-solid w-full max-w-[430px] rounded-box p-0">
      <SettingsScenario />
    </div>
  </div>
);

const AUTH_SCENARIOS: ScenarioTab[] = [
  {
    label: 'Login',
    title: 'Login',
    note: 'Glow + grid atmosphere, brand mark, Google sign-in — the only unauthenticated screen.',
    content: <LoginScenario />,
  },
  {
    label: 'OAuth consent',
    title: 'OAuth consent — request',
    note: 'Where Supabase sends a signed-in user when Claude asks to connect: client tile ⇄ brand mark, the approving account, what access it grants, the host the browser returns to, Deny / Allow.',
    content: <ConsentScenario />,
  },
  {
    label: 'OAuth consent — allowing',
    title: 'OAuth consent — allowing',
    note: 'Same screen one click later: Allow pressed and waiting on the server action — spinner on the pressed button, both buttons inert — reached by a play step that clicks Allow.',
    content: <ConsentScenario />,
    play: [{click: {label: 'OAuthConsent.allow'}}],
  },
  {
    label: 'OAuth consent — invalid link',
    title: 'OAuth consent — invalid link',
    note: 'The authorization request is missing, unknown, expired or already decided — generic copy and a way home.',
    content: (
      <AuthScreenScenario>
        <ConsentInvalidScreen />
      </AuthScreenScenario>
    ),
  },
  {
    label: 'Settings',
    title: 'Settings overlay — rest',
    note: 'The one settings panel (identity, theme picker, sign-out at rest) — mobile sheet and desktop modal render this same component, so presentation is not a separate state.',
    display: 'fit',
    content: settingsPanel,
  },
  {
    label: 'Settings — sign-out confirm',
    title: 'Settings overlay — sign-out confirm',
    note: 'Same panel one click later: the two-step sign-out in its confirm state (Cancel / Sign out), reached by a play step that clicks Sign out.',
    display: 'fit',
    content: settingsPanel,
    play: [{click: {label: 'Settings.signOut'}}],
  },
];

export default function AuthScenarioPage() {
  return (
    <ScenarioPage
      title="Auth scenarios"
      description="Login, OAuth consent and settings with fixture identity. The
        app sidebar's expanded/collapsed states live in the Design Console's
        Application tab — they are component states, not screens."
      maxWidthClass="max-w-4xl"
    >
      <ScenarioTabs tabs={AUTH_SCENARIOS} />
    </ScenarioPage>
  );
}
