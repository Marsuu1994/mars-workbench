"use client";

import { useState } from "react";
import { CheckIcon, ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { UiMessage } from "@/features/kanban/types/aiChat";
import { BotAvatar, UserAvatar } from "./Avatars";
import { DraftPlanCards } from "./DraftPlanCards";
import { SuggestionChips } from "./SuggestionChips";

interface ChatMessageProps {
  message: UiMessage;
  /** True only for the newest draft message — older drafts render collapsed. */
  isLatestDraft: boolean;
  onChipSelect: (chip: string) => void;
}

export const ChatMessage = ({ message, isLatestDraft, onChipSelect }: ChatMessageProps) => {
  const [expanded, setExpanded] = useState(false);

  // User turn
  if (message.role === "user") {
    return (
      <div className="flex flex-row-reverse items-start gap-2.5">
        <UserAvatar />
        <div className="max-w-[85%] rounded-xl rounded-tr-sm border border-info/15 bg-info/10 px-4 py-3 text-[13px] leading-relaxed">
          {message.text}
        </div>
      </div>
    );
  }

  // Assistant text (welcome or clarifying reply)
  if (message.type === "welcome" || message.type === "text") {
    return (
      <div className="flex items-start gap-2.5">
        <BotAvatar />
        <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-base-content/10 bg-base-200 px-4 py-3 text-[13px] leading-relaxed">
          <div className="whitespace-pre-line">{message.text}</div>
          {message.type === "welcome" && message.chips && message.chips.length > 0 && (
            <SuggestionChips chips={message.chips} onSelect={onChipSelect} />
          )}
        </div>
      </div>
    );
  }

  // Assistant draft
  const { draft, approved } = message;
  const isCollapsed = !isLatestDraft && !approved;

  // Superseded draft, collapsed into a one-line summary until expanded.
  if (isCollapsed && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2.5 rounded-lg border border-base-content/10 bg-base-200 px-3.5 py-2.5 text-xs text-base-content/60 opacity-60 transition-opacity hover:opacity-90"
      >
        <ChevronRightIcon className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">
          Previous draft ({draft.draftTemplates.length} template
          {draft.draftTemplates.length !== 1 ? "s" : ""})
        </span>
        <ChevronDownIcon className="size-3 shrink-0" />
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <BotAvatar />
      <div
        className={`max-w-[85%] rounded-xl rounded-tl-sm border px-4 py-3 text-[13px] leading-relaxed ${
          approved
            ? "border-success/30 bg-success/10"
            : "border-base-content/10 bg-base-200"
        }`}
      >
        {approved && (
          <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-success">
            <CheckIcon className="size-3 stroke-2" />
            Created
          </div>
        )}
        <div>{draft.message}</div>
        <DraftPlanCards templates={draft.draftTemplates} />
        {draft.followUp && !approved && (
          <div className="mt-3 text-xs text-base-content/60">{draft.followUp}</div>
        )}
      </div>
    </div>
  );
};
