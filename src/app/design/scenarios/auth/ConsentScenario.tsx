'use client';

import {ConsentScreen} from '@/components/domain/auth/ConsentScreen';
import {AuthScreenScenario} from './AuthScreenScenario';
import {SCENARIO_CONSENT_REQUEST} from './fixtures';

/** Never settles, so a play-clicked decision holds its pending state. */
const NEVER_SETTLES = () => new Promise<void>(() => {});

/**
 * The real ConsentScreen against the fixture request. Its handlers stand in
 * for the bound server actions and never settle: the frame's shield swallows
 * human clicks, and the Allowing tab's play click stays pending on screen.
 */
export const ConsentScenario = () => (
  <AuthScreenScenario>
    <ConsentScreen
      request={SCENARIO_CONSENT_REQUEST}
      onDecision={NEVER_SETTLES}
      onSwitchAccount={NEVER_SETTLES}
    />
  </AuthScreenScenario>
);
