'use client';

import {useState, useTransition} from 'react';
import {useTranslations} from 'next-intl';
import {
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  DocumentMagnifyingGlassIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import {cn} from '@/components/ui/cn';
import {SectionLabel} from '@/components/ui/SectionLabel';
import type {OAuthConsentRequest} from '@/types/oauth';
import {ConsentDecision} from '@/utils/oauthConsent';
import {AuthBackdrop} from './AuthBackdrop';
import {BrandIcon} from './BrandIcon';

interface ConsentScreenProps {
  request: OAuthConsentRequest;
  /** Records the decision with Supabase and leaves for the client. */
  onDecision: (decision: ConsentDecision) => Promise<void>;
}

/** What a granted token can do — every MCP tool, whatever the scopes say. */
const CAPABILITIES = [
  {
    Icon: DocumentMagnifyingGlassIcon,
    title: 'readContextTitle',
    description: 'readContextDescription',
  },
  {
    Icon: PencilSquareIcon,
    title: 'writePlansTitle',
    description: 'writePlansDescription',
  },
] as const;

/** Deny then Allow, left to right. */
const DECISION_BUTTONS = [
  {
    decision: ConsentDecision.DENY,
    label: 'deny',
    pendingLabel: 'denying',
    className: 'btn-ghost border-base-content/15 hover:bg-base-content/5',
  },
  {
    decision: ConsentDecision.APPROVE,
    label: 'allow',
    pendingLabel: 'allowing',
    className: 'btn-primary',
  },
] as const;

const FADE_UP = [
  'animate-[fadeUp_0.6s_ease_0.1s_forwards] opacity-0',
  'animate-[fadeUp_0.6s_ease_0.25s_forwards] opacity-0',
  'animate-[fadeUp_0.6s_ease_0.4s_forwards] opacity-0',
] as const;

/**
 * The OAuth authorization page: who is asking (client tile ⇄ brand mark),
 * which account approves, what access it grants, where the browser returns,
 * and the Deny / Allow decision. Presentational — the page loads the request
 * and passes the bound server actions, so scenarios render it with fixtures.
 */
export const ConsentScreen = ({request, onDecision}: ConsentScreenProps) => {
  const t = useTranslations('OAuthConsent');
  const [isPending, startTransition] = useTransition();
  const [chosenDecision, setChosenDecision] = useState<ConsentDecision | null>(
    null,
  );
  const {clientName, clientLogoUrl, returnHost, scopes, userEmail} = request;

  const handleDecision = (decision: ConsentDecision) => {
    if (isPending) return;
    setChosenDecision(decision);
    startTransition(async () => {
      await onDecision(decision);
    });
  };

  const renderClientTile = () => (
    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-base-content/10 bg-neutral text-[22px] font-semibold text-neutral-content">
      {clientLogoUrl ? (
        // Any https origin a client registers; not worth a remotePatterns
        // wildcard for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clientLogoUrl} alt="" className="size-full object-cover" />
      ) : (
        Array.from(clientName)[0]?.toUpperCase()
      )}
    </div>
  );

  const renderLinkDots = () => (
    <span className="flex gap-1.5" aria-hidden>
      <span className="size-1 rounded-full bg-current" />
      <span className="size-1 rounded-full bg-current" />
    </span>
  );

  const renderHeader = () => (
    <>
      <div className={cn('flex items-center gap-3.5', FADE_UP[0])}>
        {renderClientTile()}
        <div className="flex items-center gap-1.5 text-base-content/35">
          {renderLinkDots()}
          <ArrowsRightLeftIcon className="size-[18px]" aria-hidden />
          {renderLinkDots()}
        </div>
        <BrandIcon />
      </div>

      <div className={cn('flex flex-col gap-2.5 text-center', FADE_UP[0])}>
        <h1 className="text-[21px] leading-snug font-semibold tracking-tight text-base-content">
          {t.rich('title', {
            client: clientName,
            strong: chunks => <b className="font-bold">{chunks}</b>,
          })}
        </h1>
        <p className="text-[13px] text-base-content/55">
          {t.rich('signedInAs', {
            email: userEmail,
            strong: chunks => (
              <strong className="font-medium text-base-content/85">
                {chunks}
              </strong>
            ),
          })}
        </p>
      </div>
    </>
  );

  const renderCapabilities = () => (
    <div
      className={cn(
        'fx-panel flex w-full flex-col gap-3.5 px-4.5 py-4',
        FADE_UP[1],
      )}
    >
      <SectionLabel>
        {t('capabilitiesLabel', {client: clientName})}
      </SectionLabel>
      {CAPABILITIES.map(({Icon, title, description}) => (
        <div key={title} className="flex items-start gap-3">
          <Icon className="mt-px size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <div className="text-sm font-medium text-base-content">
              {t(title)}
            </div>
            <div className="mt-0.5 text-[12.5px] leading-normal text-base-content/55">
              {t(description)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderReturnHost = () => (
    <div className={cn('flex w-full flex-col gap-3', FADE_UP[1])}>
      <div className="flex items-center gap-2.5 text-[13px] text-base-content/60">
        <ArrowTopRightOnSquareIcon
          className="size-[18px] shrink-0"
          aria-hidden
        />
        <span>
          {t.rich('returnTo', {
            host: returnHost,
            chip: chunks => (
              <span className="rounded-[5px] bg-base-content/7 px-1.5 py-0.5 font-mono text-[12.5px] text-base-content">
                {chunks}
              </span>
            ),
          })}
        </span>
      </div>
      <p className="pl-7 text-[12.5px] leading-normal text-base-content/50">
        {t('caution')}
      </p>
    </div>
  );

  const renderActions = () => (
    <div className={cn('grid w-full grid-cols-2 gap-3', FADE_UP[2])}>
      {DECISION_BUTTONS.map(({decision, label, pendingLabel, className}) => {
        const isChosen = isPending && chosenDecision === decision;
        return (
          <button
            key={decision}
            type="button"
            onClick={() => handleDecision(decision)}
            aria-disabled={isPending}
            className={cn(
              'btn h-12 text-[15px]',
              className,
              isPending && 'pointer-events-none',
              isPending && !isChosen && 'opacity-50',
            )}
          >
            {isChosen && (
              <span
                className="loading loading-spinner loading-sm"
                aria-hidden
              />
            )}
            {t(isChosen ? pendingLabel : label)}
          </button>
        );
      })}
    </div>
  );

  const renderScopes = () =>
    scopes.length > 0 && (
      <p
        className={cn(
          'flex flex-wrap items-center justify-center gap-1.5 text-[11.5px] text-base-content/30',
          FADE_UP[2],
        )}
      >
        {t('scopes')}
        {scopes.map((scope, index) => (
          <span key={scope} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>·</span>}
            <code className="font-mono text-[11px]">{scope}</code>
          </span>
        ))}
      </p>
    );

  return (
    <>
      <AuthBackdrop />

      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-7 px-5 py-8 md:px-8 md:py-10">
        {renderHeader()}
        <div
          className={cn(
            'h-px w-full bg-linear-to-r from-transparent via-base-content/8 to-transparent',
            FADE_UP[1],
          )}
        />
        {renderCapabilities()}
        {renderReturnHost()}
        {renderActions()}
        {renderScopes()}
      </div>
    </>
  );
};
