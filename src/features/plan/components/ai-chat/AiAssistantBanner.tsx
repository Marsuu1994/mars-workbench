"use client";

import { useTranslations } from "next-intl";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useAiPlanChat } from "@/features/plan/hooks/useAiPlanChat";

interface AiAssistantBannerProps {
  /** Plan id whose stats seed the returning-user welcome (the pending plan). */
  contextPlanId?: string;
}

/** Entry point in the plan form: opens the AI chat modal and starts a chat. */
export const AiAssistantBanner = ({ contextPlanId }: AiAssistantBannerProps) => {
  const t = useTranslations("AiChat");
  const { init } = useAiPlanChat();

  return (
    <div className="flex items-center gap-4 rounded-lg border border-base-content/10 bg-base-200 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
        <SparklesIcon className="size-[18px]" />
      </span>
      <p className="flex-1 text-[13px] leading-snug text-base-content/60">{t("bannerPrompt")}</p>
      <button
        type="button"
        onClick={() => init(contextPlanId)}
        className="btn btn-sm gap-1.5 border-info/30 bg-info/10 text-info hover:border-info hover:bg-info/20"
      >
        <SparklesIcon className="size-3.5" />
        {t("bannerButton")}
      </button>
    </div>
  );
};
