import { XMarkIcon } from "@heroicons/react/24/outline";

interface TaskModalHeaderProps {
  mode: "create" | "edit" | "adhoc";
  onClose: () => void;
}

const TITLE: Record<TaskModalHeaderProps["mode"], string> = {
  create: "Create Task Template",
  edit: "Edit Task Template",
  adhoc: "Add Ad-hoc Task",
};

export default function TaskModalHeader({ mode, onClose }: TaskModalHeaderProps) {
  return (
    <div className="flex items-center justify-between -mx-6 px-6 pb-4 mb-4 border-b border-base-content/10">
      <h3 className="font-bold text-lg">
        {TITLE[mode]}
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
