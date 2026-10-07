'use client';

import {ConsentScreen} from '@/components/domain/auth/ConsentScreen';
import {AuthScreenScenario} from './AuthScreenScenario';
import {SCENARIO_CONSENT_REQUEST} from './fixtures';

/** Never settles, so a play-clicked decision holds its pending state. */
const NEVER_SETTLES = () => new Promise<void>(() => {});

/**
 * The real ConsentScreen against the fixture request. Its decision handler
 * stands in for the bound server action and never settles: the frame's shield
 * swallows human clicks, and the Allowing tab's play click stays pending.
 */
export const ConsentScenario = () => (
  <AuthScreenScenario>
    <ConsentScreen
      request={SCENARIO_CONSENT_REQUEST}
      onDecision={NEVER_SETTLES}
    />
  </AuthScreenScenario>
);
