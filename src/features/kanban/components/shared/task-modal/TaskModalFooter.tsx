"use client";

import { useTranslations } from "next-intl";
import { PlusIcon, CheckIcon } from "@heroicons/react/24/outline";

interface TaskModalFooterProps {
  mode: "create" | "edit" | "adhoc";
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
}

const BUTTON_CONFIG: Record<
  TaskModalFooterProps["mode"],
  { icon: typeof PlusIcon }
> = {
  create: { icon: PlusIcon },
  edit: { icon: CheckIcon },
  adhoc: { icon: PlusIcon },
};

export default function TaskModalFooter({
  mode,
  isSubmitting,
  error,
  onClose,
}: TaskModalFooterProps) {
  const t = useTranslations("TaskModal");
  const config = BUTTON_CONFIG[mode];
  const Icon = config.icon;

  return (
    <>
      {error && <div className="alert alert-error text-sm">{error}</div>}
      <div className="modal-action">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {t("cancel")}
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <Icon className="size-4" />
          )}
          {t(`submit.${mode}`)}
        </button>
      </div>
    </>
  );
}
