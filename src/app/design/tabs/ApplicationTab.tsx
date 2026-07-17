'use client';

import {AppSidebar} from '@/components/application/AppSidebar';
import {BottomTabBar} from '@/components/application/BottomTabBar';
import {InteractionShield} from '../InteractionShield';
import {Section, Variant, Row} from '../GalleryParts';
import {
  APP_USER,
  APP_PLAN_ID,
  SIDEBAR_VARIANTS,
  DOCK_DEMO_PATHNAME,
} from '../constants';

/** Non-visual application pieces, documented rather than rendered. */
const SHELL_NOTES: {name: string; note: string}[] = [
  {
    name: 'AppShell',
    note: 'Route-aware frame: sidebar + <main> + dock; chromeless on /design; owns scroll on self-scrolling routes.',
  },
  {
    name: 'BreakpointProvider',
    note: 'useBreakpoint() context over the md matchMedia query; SSR defaults to desktop.',
  },
  {
    name: 'ThemeProvider',
    note: 'Sets mars-dark (18:00–06:00) / mars-light by wall clock and registers the PWA service worker.',
  },
];

/**
 * src/components/application/ — the once-rendered app frame. Specimens are
 * inert: their sign-out / collapse / nav handlers are live, so interaction is
 * disabled and states are pinned via the components' gallery override props.
 */
export const ApplicationTab = () => {
  const renderSidebar = () => (
    <Section
      title="AppSidebar"
      description="Desktop collapsible nav rail: brand, workspace links with active states, user footer with sign-out. States pinned via the pathname/collapsed overrides."
    >
      <Row>
        {SIDEBAR_VARIANTS.map(({label, pathname, activePlanId, collapsed}) => (
          <Variant key={label} label={label}>
            <InteractionShield className="flex h-[440px] overflow-hidden rounded-lg border border-base-content/10">
              <AppSidebar
                user={APP_USER}
                activePlanId={activePlanId}
                pathname={pathname}
                collapsed={collapsed}
              />
            </InteractionShield>
          </Variant>
        ))}
      </Row>
    </Section>
  );

  const renderDock = () => (
    <Section
      title="BottomTabBar"
      description="Mobile dock with the four workspace tabs; the active tab follows the route (pinned here via the pathname override)."
    >
      <Variant label="Board active">
        <InteractionShield className="relative h-20 w-full max-w-[430px] overflow-hidden rounded-lg border border-base-content/10 bg-base-100 [contain:layout]">
          <BottomTabBar
            user={APP_USER}
            activePlanId={APP_PLAN_ID}
            pathname={DOCK_DEMO_PATHNAME}
          />
        </InteractionShield>
      </Variant>
    </Section>
  );

  const renderShellNotes = () => (
    <Section
      title="Shell & providers"
      description="The application layer's non-visual pieces — composed once in the root layout."
    >
      <div className="flex flex-col gap-2">
        {SHELL_NOTES.map(({name, note}) => (
          <div
            key={name}
            className="flex flex-col gap-0.5 md:flex-row md:gap-3"
          >
            <span className="fx-label w-44 shrink-0 pt-0.5">{name}</span>
            <span className="text-sm text-base-content/60">{note}</span>
          </div>
        ))}
      </div>
    </Section>
  );

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-base-content/50">
        src/components/application/ — the once-rendered app frame and providers.
        Specimens render inert with fixture identity; the settings screen and
        login live in the Auth scenarios.
      </p>
      {renderSidebar()}
      {renderDock()}
      {renderShellNotes()}
    </div>
  );
};
