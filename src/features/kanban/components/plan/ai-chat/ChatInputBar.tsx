"use client";

import { useTranslations } from "next-intl";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useAiPlanChatStore } from "@/features/kanban/store/aiPlanChatStore";
import { useAiPlanChat } from "@/features/kanban/hooks/useAiPlanChat";

interface ChatInputBarProps {
  /** When a draft exists, the input sits above the create bar (no bottom border). */
  combined: boolean;
}

export const ChatInputBar = ({ combined }: ChatInputBarProps) => {
  const t = useTranslations("AiChat");
  const input = useAiPlanChatStore((state) => state.input);
  const status = useAiPlanChatStore((state) => state.status);
  const setInput = useAiPlanChatStore((state) => state.setInput);
  const { send } = useAiPlanChat();

  const isBusy =
    status === "initializing" || status === "generating" || status === "approving";
  const canSend = !isBusy && input.trim().length > 0;

  const handleSend = () => {
    if (canSend) send(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`flex-shrink-0 border-t border-base-content/10 px-5 ${
        combined ? "pb-2.5 pt-3.5" : "py-3.5"
      }`}
    >
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isBusy}
          placeholder={combined ? t("placeholderRefine") : t("placeholderDefault")}
          className="textarea textarea-bordered min-h-10 flex-1 resize-none py-2.5 text-[13px] leading-snug"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="btn btn-primary btn-square shrink-0"
        >
          <PaperAirplaneIcon className="size-4" />
        </button>
      </div>
      {!combined && (
        <p className="mt-1.5 text-[11px] text-base-content/40">{t("inputNote")}</p>
      )}
    </div>
  );
};
