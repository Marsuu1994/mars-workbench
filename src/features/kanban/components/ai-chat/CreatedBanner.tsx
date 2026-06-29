"use client";

import { useRouter } from "next/navigation";
import { CheckIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { useAiPlanChatStore } from "@/features/kanban/store/aiPlanChatStore";
import { summarizeDraftTemplates } from "@/features/kanban/utils/draftSummary";
import { CREATED_TITLE, VIEW_BOARD_LABEL } from "./constants";

/** Success banner shown after the plan is created. */
export const CreatedBanner = () => {
  const router = useRouter();
  const latestDraft = useAiPlanChatStore((state) => state.latestDraft);
  const close = useAiPlanChatStore((state) => state.close);

  const { total, newCount, existing } = summarizeDraftTemplates(
    latestDraft?.draftTemplates ?? []
  );

  const handleViewBoard = () => {
    close();
    router.push("/kanban");
  };

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-t border-base-content/10 bg-success/10 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-success-content">
          <CheckIcon className="size-4 stroke-2" />
        </span>
        <div>
          <div className="text-[13px] font-semibold">{CREATED_TITLE}</div>
          <div className="text-xs text-base-content/60">
            {total} template{total !== 1 ? "s" : ""} added &middot; {newCount} new,{" "}
            {existing} existing
          </div>
        </div>
      </div>
      <button type="button" onClick={handleViewBoard} className="btn btn-primary btn-sm">
        {VIEW_BOARD_LABEL}
        <ArrowRightIcon className="size-4" />
      </button>
    </div>
  );
};
