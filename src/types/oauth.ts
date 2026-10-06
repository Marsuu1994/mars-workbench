/**
 * One OAuth authorization request as the consent page shows it — mapped from
 * Supabase's authorization details so the screen never sees SDK shapes.
 */
export type OAuthConsentRequest = {
  authorizationId: string;
  clientName: string;
  /** The client's registered logo, when it is an https URL. */
  clientLogoUrl: string | null;
  /**
   * Host of the redirect URI the user returns to. Client names are
   * self-asserted under dynamic registration; this is the part to trust.
   */
  returnHost: string;
  scopes: string[];
  userEmail: string;
};

/** Supabase already holds consent for these scopes: go straight back. */
export type OAuthConsentRedirect = {
  redirectUrl: string;
};
