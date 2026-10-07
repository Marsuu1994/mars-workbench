/* Auth scenario fixtures. */

import type {OAuthConsentRequest} from '@/types/oauth';

export const SCENARIO_USER = {
  name: 'Liang Jun',
  email: 'liang@example.com',
};

export const SCENARIO_PLAN_ID = 'scn-plan';

export const SCENARIO_CONSENT_REQUEST: OAuthConsentRequest = {
  authorizationId: 'scn-authorization',
  clientName: 'Claude',
  clientLogoUrl: null,
  returnHost: 'claude.ai',
  scopes: ['openid', 'email', 'profile'],
  userEmail: SCENARIO_USER.email,
};
