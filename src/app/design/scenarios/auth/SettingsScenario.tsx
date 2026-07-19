'use client';

import {useState} from 'react';
import {SettingsPanel} from '@/components/domain/auth/SettingsPanel';
import type {ThemeName} from '@/utils/theme';
import {SCENARIO_USER} from './fixtures';

interface SettingsScenarioProps {
  /** Pin the sign-out row in its confirm state. */
  signOutTriggered?: boolean;
}

/**
 * Settings overlay content mounted inline (the live SettingsSheet's
 * top-layer dialog would escape the scenario frame). Theme selection is
 * local-only here — no data-theme stamp, no cookie write; the frame's
 * InteractionShield swallows clicks anyway.
 */
export const SettingsScenario = ({signOutTriggered}: SettingsScenarioProps) => {
  const [theme, setTheme] = useState<ThemeName>('mars-dark');

  return (
    <SettingsPanel
      user={SCENARIO_USER}
      theme={theme}
      onThemeChange={setTheme}
      onSignOut={async () => {}}
      onClose={() => {}}
      signOutTriggered={signOutTriggered}
    />
  );
};
