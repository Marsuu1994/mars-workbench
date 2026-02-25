/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskModal from "../task-modal/TaskModal";

// ─── Mock server actions ───────────────────────────────────────────────

const mockCreateTemplateAction = vi.fn();
const mockUpdateTemplateAction = vi.fn();
const mockCreateAdhocAction = vi.fn();

vi.mock("@/features/kanban/actions/templateActions", () => ({
  createTaskTemplateAction: (...args: unknown[]) => mockCreateTemplateAction(...args),
  updateTaskTemplateAction: (...args: unknown[]) => mockUpdateTemplateAction(...args),
}));

vi.mock("@/features/kanban/actions/taskActions", () => ({
  createAdhocTaskAction: (...args: unknown[]) => mockCreateAdhocAction(...args),
}));

// ─── HTMLDialogElement polyfill ────────────────────────────────────────

beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= vi.fn(function (
    this: HTMLDialogElement
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close ??= vi.fn(function (
    this: HTMLDialogElement
  ) {
    this.removeAttribute("open");
  });
});

afterEach(cleanup);

// ─── Defaults ──────────────────────────────────────────────────────────

function getDefaultProps() {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };
}

const sampleTemplate = {
  id: "tpl-1",
  userId: null,
  title: "Exercise",
  description: "Morning workout",
  points: 5,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ─────────────────────────────────────────────────────────────

describe("TaskModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTemplateAction.mockResolvedValue({ data: { id: "new-tpl" } });
    mockUpdateTemplateAction.mockResolvedValue({ data: { id: "tpl-1" } });
    mockCreateAdhocAction.mockResolvedValue({ data: { id: "new-task" } });
  });

  // ── Mode detection ──

  it("renders in create mode by default (no template)", () => {
    render(<TaskModal {...getDefaultProps()} />);

    expect(screen.getByText("Create Task Template")).toBeInTheDocument();
  });

  it("renders in edit mode when template is provided", () => {
    render(<TaskModal {...getDefaultProps()} template={sampleTemplate} />);

    expect(screen.getByText("Edit Task Template")).toBeInTheDocument();
  });

  it("renders in adhoc mode when mode prop is set", () => {
    render(<TaskModal {...getDefaultProps()} mode="adhoc" />);

    expect(screen.getByText("Add Ad-hoc Task")).toBeInTheDocument();
  });

  // ── Form population ──

  it("populates form from template in edit mode", async () => {
    render(<TaskModal {...getDefaultProps()} template={sampleTemplate} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Exercise")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Morning workout")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  });

  it("starts with empty form in create mode", async () => {
    render(<TaskModal {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Solve 3 LeetCode/)).toHaveValue("");
    });
  });

  it("starts with defaults for adhoc mode (empty title, 1 point)", async () => {
    render(<TaskModal {...getDefaultProps()} mode="adhoc" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/File tax report/)).toHaveValue("");
    });
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  // ── Adhoc info banner ──

  it("shows ad-hoc info banner in adhoc mode", () => {
    render(<TaskModal {...getDefaultProps()} mode="adhoc" />);

    expect(
      screen.getByText(/Ad-hoc tasks are one-off items/)
    ).toBeInTheDocument();
  });

  it("does not show ad-hoc info banner in create mode", () => {
    render(<TaskModal {...getDefaultProps()} />);

    expect(
      screen.queryByText(/Ad-hoc tasks are one-off items/)
    ).not.toBeInTheDocument();
  });

  // ── Submission ──

  it("calls createTaskTemplateAction in create mode", async () => {
    const user = userEvent.setup();
    const props = getDefaultProps();
    render(<TaskModal {...props} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Solve 3 LeetCode/)).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText(/Solve 3 LeetCode/), "New Template");
    await user.click(screen.getByRole("button", { name: /Create Template/ }));

    await waitFor(() => {
      expect(mockCreateTemplateAction).toHaveBeenCalledWith(
        expect.objectContaining({ title: "New Template" })
      );
    });
    expect(props.onSaved).toHaveBeenCalledOnce();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("calls updateTaskTemplateAction in edit mode", async () => {
    const user = userEvent.setup();
    render(<TaskModal {...getDefaultProps()} template={sampleTemplate} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Exercise")).toBeInTheDocument();
    });
    const titleInput = screen.getByDisplayValue("Exercise");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated");
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => {
      expect(mockUpdateTemplateAction).toHaveBeenCalledWith(
        "tpl-1",
        expect.objectContaining({ title: "Updated" })
      );
    });
  });

  it("calls createAdhocTaskAction in adhoc mode", async () => {
    const user = userEvent.setup();
    render(<TaskModal {...getDefaultProps()} mode="adhoc" initialStatus="DOING" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/File tax report/)).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText(/File tax report/), "Quick task");
    await user.click(screen.getByRole("button", { name: /Add to Board/ }));

    await waitFor(() => {
      expect(mockCreateAdhocAction).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Quick task", status: "DOING" })
      );
    });
  });

  // ── Error handling ──

  it("displays error message on action failure", async () => {
    const user = userEvent.setup();
    mockCreateTemplateAction.mockResolvedValue({
      error: { formErrors: ["Title already exists"] },
    });
    render(<TaskModal {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Solve 3 LeetCode/)).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText(/Solve 3 LeetCode/), "Duplicate");
    await user.click(screen.getByRole("button", { name: /Create Template/ }));

    await waitFor(() => {
      expect(screen.getByText("Title already exists")).toBeInTheDocument();
    });
  });

  it("does not call onSaved/onClose on error", async () => {
    const user = userEvent.setup();
    const props = getDefaultProps();
    mockCreateTemplateAction.mockResolvedValue({
      error: { formErrors: ["Failed"] },
    });
    render(<TaskModal {...props} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Solve 3 LeetCode/)).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText(/Solve 3 LeetCode/), "Bad");
    await user.click(screen.getByRole("button", { name: /Create Template/ }));

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
    expect(props.onSaved).not.toHaveBeenCalled();
  });
});
