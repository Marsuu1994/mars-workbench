/**
 * How long a finished write waits for the page's revalidated props before it
 * carries on anyway. Every write that waits revalidates the page, so this
 * only guards against a response that never lands.
 */
export const FRESH_DATA_TIMEOUT_MS = 5000;
