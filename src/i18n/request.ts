import {getRequestConfig} from 'next-intl/server';

/**
 * Single-locale setup ("App Router without i18n routing"). The locale is fixed
 * to `en` for now, so next-intl needs no middleware and the existing Supabase
 * auth proxy (src/proxy.ts) is left untouched. When real localization lands,
 * resolve `locale` here from a cookie/header/route param instead of hardcoding.
 */
export const DEFAULT_LOCALE = 'en';

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`./${locale}.json`)).default,
  };
});
