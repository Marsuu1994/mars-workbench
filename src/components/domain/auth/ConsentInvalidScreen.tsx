import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {ExclamationTriangleIcon} from '@heroicons/react/24/outline';
import {AuthBackdrop} from './AuthBackdrop';
import {CONSENT_INVALID_HOME_HREF} from './constants';

/**
 * The OAuth consent page when its authorization request is missing, unknown,
 * expired or already decided. Generic on purpose: the page cannot tell an
 * expired request from a forged one, nor which client started the flow.
 */
export const ConsentInvalidScreen = () => {
  const t = useTranslations('OAuthConsent');

  return (
    <>
      <AuthBackdrop />

      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-7 px-5 py-8 md:px-8 md:py-10">
        <div className="flex size-14 animate-[fadeUp_0.6s_ease_0.1s_forwards] items-center justify-center rounded-2xl border border-warning/30 bg-warning/12 text-warning opacity-0">
          <ExclamationTriangleIcon className="size-7" aria-hidden />
        </div>
        <h1 className="animate-[fadeUp_0.6s_ease_0.1s_forwards] text-center text-[21px] leading-snug font-semibold tracking-tight text-base-content opacity-0">
          {t('invalidTitle')}
        </h1>
        <p className="max-w-80 animate-[fadeUp_0.6s_ease_0.25s_forwards] text-center text-sm leading-relaxed text-base-content/60 opacity-0">
          {t('invalidDescription')}
        </p>
        <Link
          href={CONSENT_INVALID_HOME_HREF}
          className="btn h-12 w-full animate-[fadeUp_0.6s_ease_0.4s_forwards] border-base-content/10 bg-neutral text-[15px] font-medium text-neutral-content opacity-0"
        >
          {t('goHome')}
        </Link>
      </div>
    </>
  );
};
