"use client";

import { useTranslations } from "next-intl";
import { SparklesIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useAiPlanChat } from "@/hooks/useAiPlanChat";

interface AiAssistantBannerProps {
  /** Plan id whose stats seed the returning-user welcome (the pending plan). */
  contextPlanId?: string;
}

/**
 * Entry point in the plan form: opens the AI chat modal and starts a chat.
 * Desktop shows the prompt banner with a button; mobile compacts to a
 * single tappable row (title + subtitle + chevron).
 */
export const AiAssistantBanner = ({ contextPlanId }: AiAssistantBannerProps) => {
  const t = useTranslations("AiChat");
  const { init } = useAiPlanChat();

  const renderDesktop = () => (
    <div className="hidden md:flex items-center gap-4 rounded-lg border border-base-content/10 bg-base-200 p-3.5">
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

  const renderMobile = () => (
    <button
      type="button"
      onClick={() => init(contextPlanId)}
      className="md:hidden flex w-full items-center gap-3 rounded-[10px] border border-base-content/10 bg-base-200 px-3 py-2.5 text-left cursor-pointer"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-info/20 bg-info/10 text-info">
        <SparklesIcon className="size-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold">{t("bannerTitleMobile")}</span>
        <span className="block text-[11px] text-base-content/50">{t("bannerSubMobile")}</span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-base-content/40" />
    </button>
  );

  return (
    <>
      {renderDesktop()}
      {renderMobile()}
    </>
  );
};
