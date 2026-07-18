'use client';

import {useTranslations} from 'next-intl';
import {CheckIcon} from '@heroicons/react/24/outline';
import {ChoicePills} from '@/components/ui/form/ChoicePills';
import type {ThemeName} from '@/utils/theme';
import {THEME_ORDER, THEME_PREVIEWS} from './constants';

interface ThemePickerProps {
  value: ThemeName;
  onChange: (theme: ThemeName) => void;
}

/** Three theme cards: mini palette preview + name/tagline + selected check. */
export const ThemePicker = ({value, onChange}: ThemePickerProps) => {
  const t = useTranslations('Settings');

  const renderThemeOption = (theme: ThemeName, selected: boolean) => (
    <>
      <span
        className={`relative block h-11 w-full rounded-[8px] border border-base-content/20 ${THEME_PREVIEWS[theme].swatchClass}`}
      >
        <span className="absolute bottom-1.5 left-1.5 flex gap-1">
          {THEME_PREVIEWS[theme].dotClasses.map(dot => (
            <span key={dot} className={`size-[7px] rounded-full ${dot}`} />
          ))}
        </span>
      </span>
      <span className="mt-2 block text-xs font-semibold text-base-content">
        {t(`themeNames.${theme}`)}
      </span>
      <span className="block text-2xs text-base-content/50">
        {t(`themeTaglines.${theme}`)}
      </span>
      {selected && (
        <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-content">
          <CheckIcon className="size-2.5" strokeWidth={3.5} />
        </span>
      )}
    </>
  );

  return (
    <ChoicePills<ThemeName>
      options={THEME_ORDER.map(theme => ({
        value: theme,
        label: (selected: boolean) => renderThemeOption(theme, selected),
      }))}
      value={value}
      onChange={onChange}
      layout="fill"
      className="gap-2.5"
      pillClass="relative rounded-card p-2.5 text-left"
      selectedClass="border-primary bg-base-200 shadow-[0_0_0_1px_var(--color-primary)]"
      unselectedClass="border-base-content/10 bg-base-200 hover:border-base-content/25"
    />
  );
};
