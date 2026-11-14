'use client';

import {ConsentScreen} from '@/components/domain/auth/ConsentScreen';
import {AuthScreenScenario} from './AuthScreenScenario';
import {SCENARIO_CONSENT_REQUEST} from './fixtures';

/** Stands in for the bound server action; the frame's shield swallows clicks. */
const NO_DECISION = async () => {};

/**
 * The real ConsentScreen against the fixture request. Its pending state is
 * not pinned: holding it means an async transition that never settles, and
 * React entangles every later transition with it — Next's navigation
 * included — so no link on the page would work until a reload.
 */
export const ConsentScenario = () => (
  <AuthScreenScenario>
    <ConsentScreen
      request={SCENARIO_CONSENT_REQUEST}
      onDecision={NO_DECISION}
    />
  </AuthScreenScenario>
);
