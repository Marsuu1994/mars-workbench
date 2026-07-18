'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {ArrowRightStartOnRectangleIcon} from '@heroicons/react/24/outline';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {SheetCloseButton} from '@/components/ui/overlay/SheetCloseButton';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {ConfirmButton} from '@/components/ui/ConfirmButton';
import {createClient} from '@/lib/supabase/client';
import {useSettingsStore} from '@/store/settingsStore';
import {updateThemeAction} from '@/actions/settingsActions';
import type {ThemeName} from '@/utils/theme';
import {ThemePicker} from './ThemePicker';

interface SettingsPanelProps {
  user: {name: string; email: string};
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onSignOut: () => Promise<void>;
  onClose: () => void;
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

interface SettingsSheetProps {
  user: {name: string; email: string} | null;
  /** Server-resolved theme cookie — seeds the picker's optimistic state. */
  initialTheme: ThemeName;
}

/**
 * The one settings overlay (mobile bottom sheet / desktop centered modal),
 * opened from the dock's Settings tab and the sidebar user row via
 * settingsStore. Theme changes apply optimistically (data-theme stamp)
 * and persist through updateThemeAction (SSR cookie).
 */
export const SettingsSheet = ({user, initialTheme}: SettingsSheetProps) => {
  const router = useRouter();
  const t = useTranslations('Settings');
  const isOpen = useSettingsStore(s => s.isOpen);
  const close = useSettingsStore(s => s.close);
  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  if (!user) {
    return null;
  }

  const handleThemeChange = (next: ThemeName) => {
    if (next === theme) {
      return;
    }
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    void updateThemeAction(next);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    close();
    router.push('/auth/login');
  };

  return (
    <OverlayShell
      variant="responsive"
      isOpen={isOpen}
      onClose={close}
      dismissOnBackdrop
      closeLabel={t('closeBackdrop')}
      boxClassName="md:max-w-[430px]"
    >
      {/* key remount resets the armed sign-out state on every open */}
      <SettingsPanel
        key={String(isOpen)}
        user={user}
        theme={theme}
        onThemeChange={handleThemeChange}
        onSignOut={handleSignOut}
        onClose={close}
      />
    </OverlayShell>
  );
};
