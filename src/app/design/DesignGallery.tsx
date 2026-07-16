'use client';

import {useState} from 'react';
import Link from 'next/link';
import {SunIcon, MoonIcon} from '@heroicons/react/24/outline';

import {TabBar} from '@/components/ui/TabBar';
import {TokensFxTab} from './tabs/TokensFxTab';
import {UiTab} from './tabs/UiTab';
import {ApplicationTab} from './tabs/ApplicationTab';
import {DomainTab} from './tabs/DomainTab';
import {
  GALLERY_TITLE_ACCENT,
  GALLERY_TITLE_REST,
  GALLERY_SUBTITLE,
  GALLERY_TAB_LABELS,
  SCENARIOS_HREF,
  THEME_DARK,
  THEME_LIGHT,
} from './constants';

export const DesignGallery = () => {
  const [theme, setTheme] = useState<string>(THEME_DARK);
  const [tabIndex, setTabIndex] = useState(0);
  const isDark = theme === THEME_DARK;

  const renderHeader = () => (
    <header className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">
          <span className="fx-text-gradient">{GALLERY_TITLE_ACCENT}</span>{' '}
          {GALLERY_TITLE_REST}
        </h1>
        <p className="max-w-2xl text-sm text-base-content/60">
          {GALLERY_SUBTITLE}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href={SCENARIOS_HREF} className="btn btn-sm btn-ghost">
          Scenarios
        </Link>
        <button
          type="button"
          onClick={() => setTheme(isDark ? THEME_LIGHT : THEME_DARK)}
          className="btn btn-sm btn-outline"
        >
          {isDark ? (
            <SunIcon className="size-4" />
          ) : (
            <MoonIcon className="size-4" />
          )}
          {isDark ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  );

  const renderActiveTab = () => {
    switch (tabIndex) {
      case 0:
        return <TokensFxTab />;
      case 1:
        return <UiTab />;
      case 2:
        return <ApplicationTab />;
      default:
        return <DomainTab />;
    }
  };

  return (
    <div
      data-theme={theme}
      className="fx-shell-bg min-h-screen text-base-content"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-10">
        {renderHeader()}
        <TabBar
          ariaLabel="Component layers"
          labels={[...GALLERY_TAB_LABELS]}
          activeIndex={tabIndex}
          onChange={setTabIndex}
        />
        {renderActiveTab()}
      </div>
    </div>
  );
};
