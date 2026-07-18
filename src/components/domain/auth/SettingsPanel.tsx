'use client';

import {useTranslations} from 'next-intl';
import {ArrowRightStartOnRectangleIcon} from '@heroicons/react/24/outline';
import {SheetCloseButton} from '@/components/ui/overlay/SheetCloseButton';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {ConfirmButton} from '@/components/ui/ConfirmButton';
import type {ThemeName} from '@/utils/theme';
import {ThemePicker} from './ThemePicker';

interface SettingsPanelProps {
  user: {name: string; email: string};
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onSignOut: () => Promise<void>;
  onClose: () => void;
  /** Design gallery/scenario override — pins the sign-out confirm state. */
  signOutTriggered?: boolean;
}

/**
 * Settings overlay content, shell-free so scenarios can mount it inline:
 * identity card → theme picker → two-step sign-out → version.
 */
export const SettingsPanel = ({
  user,
  theme,
  onThemeChange,
  onSignOut,
  onClose,
  signOutTriggered,
}: SettingsPanelProps) => {
  const t = useTranslations('Settings');

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold">{t('title')}</h2>
      <SheetCloseButton onClick={onClose} label={t('closeAria')} />
    </div>
  );

  const renderIdentity = () => (
    <div className="flex items-center gap-3 rounded-card border border-base-content/10 bg-base-200 px-3.5 py-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-info to-secondary text-sm font-bold text-white">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-base-content">
          {user.name}
        </div>
        <div className="truncate text-[11px] text-base-content/50">
          {user.email}
        </div>
      </div>
    </div>
  );

  const renderThemeSection = () => (
    <div>
      <SectionLabel className="mb-2 block">{t('themeSection')}</SectionLabel>
      <ThemePicker value={theme} onChange={onThemeChange} />
    </div>
  );

  const renderSignOut = () => (
    <ConfirmButton
      icon={<ArrowRightStartOnRectangleIcon className="size-[18px]" />}
      label={t('signOut')}
      confirmPrompt={t('signOutConfirm')}
      confirmLabel={t('signOut')}
      cancelLabel={t('cancel')}
      onConfirm={onSignOut}
      triggered={signOutTriggered}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {renderHeader()}
      {renderIdentity()}
      {renderThemeSection()}
      {renderSignOut()}
      <div className="text-center text-[11px] text-base-content/30">
        {t('version')}
      </div>
    </div>
  );
};
