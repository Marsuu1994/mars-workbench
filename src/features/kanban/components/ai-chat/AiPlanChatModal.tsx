"use client";

import { useEffect, useRef } from "react";
import { SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAiPlanChatStore } from "@/features/kanban/store/aiPlanChatStore";
import { useAiPlanChat } from "@/features/kanban/hooks/useAiPlanChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInputBar } from "./ChatInputBar";
import { CreateActionBar } from "./CreateActionBar";
import { CreatedBanner } from "./CreatedBanner";
import { LoadingBubble } from "./LoadingBubble";
import {
  LOADING_LABEL_GENERATING,
  LOADING_LABEL_INITIALIZING,
  MODAL_BETA_LABEL,
  MODAL_TITLE,
} from "./constants";

export const AiPlanChatModal = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const isOpen = useAiPlanChatStore((state) => state.isOpen);
  const messages = useAiPlanChatStore((state) => state.messages);
  const status = useAiPlanChatStore((state) => state.status);
  const error = useAiPlanChatStore((state) => state.error);
  const latestDraft = useAiPlanChatStore((state) => state.latestDraft);
  const close = useAiPlanChatStore((state) => state.close);
  const { send, approve } = useAiPlanChat();

  // Sync the native <dialog> with store-driven open state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Keep the conversation pinned to the newest message.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, status]);

  // Index of the newest draft message — only it stays expanded with the create bar.
  let lastDraftIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "assistant" && message.type === "draft") {
      lastDraftIndex = i;
      break;
    }
  }

  const isCreated = status === "created";
  const showCreateBar = latestDraft !== null && !isCreated;

  const renderHeader = () => (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-base-content/10 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg border border-info/20 bg-info/10 text-info">
          <SparklesIcon className="size-3.5" />
        </span>
        <span className="text-base font-semibold">{MODAL_TITLE}</span>
        <span className="rounded-full bg-info/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-info">
          {MODAL_BETA_LABEL}
        </span>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="btn btn-ghost btn-sm btn-square"
      >
        <XMarkIcon className="size-5" />
      </button>
    </div>
  );

  const renderBody = () => (
    <div ref={bodyRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          isLatestDraft={index === lastDraftIndex}
          onChipSelect={send}
        />
      ))}
      {status === "initializing" && <LoadingBubble label={LOADING_LABEL_INITIALIZING} />}
      {status === "generating" && <LoadingBubble label={LOADING_LABEL_GENERATING} />}
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
    <dialog ref={dialogRef} className="modal" onClose={close}>
      <div className="modal-box flex h-[700px] max-h-[80vh] w-[640px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0">
        {renderHeader()}
        {renderBody()}
        {renderFooter()}
      </div>

      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Close">
          close
        </button>
      </form>
    </dialog>
  );
};
