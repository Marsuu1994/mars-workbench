'use client';

import {useState} from 'react';
import Link from 'next/link';

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
} from './constants';

export const DesignGallery = () => {
  const [tabIndex, setTabIndex] = useState(0);

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
      <Link href={SCENARIOS_HREF} className="btn btn-sm btn-ghost shrink-0">
        Scenarios
      </Link>
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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6 md:p-10">
      {renderHeader()}
      <TabBar
        ariaLabel="Component layers"
        labels={[...GALLERY_TAB_LABELS]}
        activeIndex={tabIndex}
        onChange={setTabIndex}
      />
      {renderActiveTab()}
    </div>
  );
};
