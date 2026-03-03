import { PlusIcon, CheckIcon } from "@heroicons/react/24/outline";

interface TaskModalFooterProps {
  mode: "create" | "edit" | "adhoc";
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
}

const BUTTON_CONFIG: Record<
  TaskModalFooterProps["mode"],
  { icon: typeof PlusIcon; label: string }
> = {
  create: { icon: PlusIcon, label: "Create Template" },
  edit: { icon: CheckIcon, label: "Save Changes" },
  adhoc: { icon: PlusIcon, label: "Add to Board" },
};

export default function TaskModalFooter({
  mode,
  isSubmitting,
  error,
  onClose,
}: TaskModalFooterProps) {
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
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <Icon className="size-4" />
          )}
          {config.label}
        </button>
      </div>
    </>
  );
}
