'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {createClient} from '@/lib/supabase/client';
import {useSettingsStore} from '@/store/settingsStore';
import {updateThemeAction} from '@/actions/settingsActions';
import type {ThemeName} from '@/utils/theme';
import {SettingsPanel} from './SettingsPanel';

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
