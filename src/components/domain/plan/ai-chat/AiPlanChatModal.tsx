'use client';

import {useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {SparklesIcon, XMarkIcon} from '@heroicons/react/24/outline';
import {useAiPlanChatStore} from '@/store/aiPlanChatStore';
import {useAiPlanChat} from '@/hooks/useAiPlanChat';
import {Pill} from '@/components/ui/Pill';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {ChatMessage} from './ChatMessage';
import {ChatInputBar} from './ChatInputBar';
import {CreateActionBar} from './CreateActionBar';
import {CreatedBanner} from './CreatedBanner';
import {LoadingBubble} from './LoadingBubble';

/**
 * The chat modal's header + conversation + footer, sans dialog shell. Reads
 * the conversation from aiPlanChatStore. The live modal wraps it in
 * OverlayShell; design scenarios seed the store and mount it inline so each
 * chat state renders inside a frame instead of the browser top layer.
 */
export const AiChatModalContent = () => {
  const t = useTranslations('AiChat');
  const bodyRef = useRef<HTMLDivElement>(null);

  const messages = useAiPlanChatStore(state => state.messages);
  const status = useAiPlanChatStore(state => state.status);
  const error = useAiPlanChatStore(state => state.error);
  const latestDraft = useAiPlanChatStore(state => state.latestDraft);
  const close = useAiPlanChatStore(state => state.close);
  const {send, approve} = useAiPlanChat();

  // Keep the conversation pinned to the newest message.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, status]);

  // Index of the newest draft message — only it stays expanded with the create bar.
  let lastDraftIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant' && message.type === 'draft') {
      lastDraftIndex = i;
      break;
    }
  }

  const isCreated = status === 'created';
  const showCreateBar = latestDraft !== null && !isCreated;

  const renderHeader = () => (
    <div className="fx-hairline-top flex flex-shrink-0 items-center justify-between border-b border-base-content/10 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg border border-secondary/20 bg-secondary/10 text-secondary">
          <SparklesIcon className="size-3.5" />
        </span>
        <span className="text-base font-semibold">{t('modalTitle')}</span>
        <Pill color="secondary" className="rounded-full uppercase">
          {t('betaLabel')}
        </Pill>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label={t('closeAria')}
        className="btn btn-ghost btn-sm btn-square"
      >
        <XMarkIcon className="size-5" />
      </button>
    </div>
  );

  const renderBody = () => (
    <div
      ref={bodyRef}
      className="flex flex-1 flex-col gap-4 overflow-y-auto p-5"
    >
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          isLatestDraft={index === lastDraftIndex}
          onChipSelect={send}
        />
      ))}
      {status === 'initializing' && (
        <LoadingBubble label={t('loadingInitializing')} />
      )}
      {status === 'generating' && (
        <LoadingBubble label={t('loadingGenerating')} />
      )}
    </div>
  );

  const renderFooter = () => {
    if (isCreated) return <CreatedBanner />;
    return (
      <>
        {error && (
          <div className="flex-shrink-0 border-t border-base-content/10 px-5 pt-3">
            <div className="alert alert-error py-2 text-xs">{error}</div>
          </div>
        )}
        <ChatInputBar combined={latestDraft !== null} />
        {showCreateBar && <CreateActionBar onApprove={approve} />}
      </>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderBody()}
      {renderFooter()}
    </>
  );
};

export const AiPlanChatModal = () => {
  const t = useTranslations('AiChat');
  const isOpen = useAiPlanChatStore(state => state.isOpen);
  const close = useAiPlanChatStore(state => state.close);

  return (
    <OverlayShell
      variant="center"
      isOpen={isOpen}
      onClose={close}
      closeLabel={t('closeBackdrop')}
      boxClassName="flex h-[700px] max-h-[80vh] w-[640px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0"
    >
      <AiChatModalContent />
    </OverlayShell>
  );
};
