"use client";

import { useTranslations } from "next-intl";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TaskModalHeaderProps {
  mode: "create" | "edit" | "adhoc";
  onClose: () => void;
}

const HEADER_KEY: Record<
  TaskModalHeaderProps["mode"],
  "header.create" | "header.edit" | "header.adhoc"
> = {
  create: "header.create",
  edit: "header.edit",
  adhoc: "header.adhoc",
};

export default function TaskModalHeader({ mode, onClose }: TaskModalHeaderProps) {
  const t = useTranslations("TaskModal");

  return (
    <div className="flex items-center justify-between -mx-6 px-6 pb-4 mb-4 border-b border-base-content/10">
      <h3 className="font-bold text-lg">
        {t(HEADER_KEY[mode])}
      </h3>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        onClick={onClose}
      >
        <XMarkIcon className="size-5" />
      </button>
    </div>
  );
}
