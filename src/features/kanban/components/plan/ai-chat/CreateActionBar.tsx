"use client";

import { useTranslations } from "next-intl";
import { CheckIcon } from "@heroicons/react/24/outline";
import { useAiPlanChatStore } from "@/features/kanban/store/aiPlanChatStore";
import { summarizeDraftTemplates } from "@/features/kanban/utils/draftSummary";

interface CreateActionBarProps {
  onApprove: () => void;
}

/** Persistent bar under the input once a draft exists: summary + approve. */
export const CreateActionBar = ({ onApprove }: CreateActionBarProps) => {
  const t = useTranslations("AiChat");
  const latestDraft = useAiPlanChatStore((state) => state.latestDraft);
  const status = useAiPlanChatStore((state) => state.status);

  if (!latestDraft) return null;

  const { total, newCount, existing } = summarizeDraftTemplates(latestDraft.draftTemplates);
  const isApproving = status === "approving";

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-t border-dashed border-base-content/15 bg-base-200 px-5 py-3.5">
      <div className="text-[13px] text-base-content/60">
        <span className="font-semibold text-info">{total}</span> template
        {total !== 1 ? "s" : ""} &middot;{" "}
        <span className="font-semibold text-info">{newCount}</span> new,{" "}
        <span className="font-semibold text-info">{existing}</span> existing
      </div>
      <button
        type="button"
        onClick={onApprove}
        disabled={isApproving}
        className="btn btn-primary btn-sm"
      >
        {isApproving ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <CheckIcon className="size-4" />
        )}
        {t("approveButton")}
      </button>
    </div>
  );
};
