/**
 * Renders a page's container, or a component under it, inside the providers
 * the root layout gives every page: the copy (next-intl, `en.json`) and the
 * breakpoint. Server actions are the mock boundary — each test file mocks
 * the action modules its tree imports (`vi.mock('@/actions/…')`); a
 * revalidated page is `rerender` with the server's new props.
 */
import type {ReactNode} from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {render} from 'vitest-browser-react';
import {BreakpointProvider} from '@/components/application/BreakpointProvider';
import {KANBAN_TZ} from '@/utils/dateUtils';
import messages from '@/i18n/en.json';

/** The app's one locale (`src/i18n/request.ts`, server-only). */
const LOCALE = 'en';

const PageProviders = ({children}: {children: ReactNode}) => (
  <NextIntlClientProvider
    locale={LOCALE}
    messages={messages}
    timeZone={KANBAN_TZ}
  >
    <BreakpointProvider>{children}</BreakpointProvider>
  </NextIntlClientProvider>
);

export const renderPage = (page: ReactNode) =>
  render(page, {wrapper: PageProviders});
