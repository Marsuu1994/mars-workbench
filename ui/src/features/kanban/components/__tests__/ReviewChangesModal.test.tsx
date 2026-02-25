/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewChangesModal } from "../ReviewChangesModal";

// ─── HTMLDialogElement polyfill (jsdom doesn't implement showModal/close) ──

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
    onConfirm: vi.fn(),
    added: [] as { templateId: string; title: string; points: number; type: string; frequency: number }[],
    removed: [] as { templateId: string; title: string; points: number; type: string; frequency: number }[],
    modified: [] as { templateId: string; title: string; fromType: string; fromFrequency: number; toType: string; toFrequency: number }[],
    incompleteCounts: {} as Record<string, number>,
    isSubmitting: false,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe("ReviewChangesModal", () => {
  it("renders the header", () => {
    render(<ReviewChangesModal {...getDefaultProps()} />);

    expect(screen.getByText("Review Plan Changes")).toBeInTheDocument();
  });

  it("renders added templates section", () => {
    render(
      <ReviewChangesModal
        {...getDefaultProps()}
        added={[
          { templateId: "t1", title: "Exercise", points: 3, type: "DAILY", frequency: 2 },
        ]}
      />
    );

    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getByText("1 template")).toBeInTheDocument();
    expect(screen.getByText("Exercise")).toBeInTheDocument();
    expect(screen.getByText("3 pts")).toBeInTheDocument();
  });

  it("renders removed templates section with incomplete count", () => {
    render(
      <ReviewChangesModal
        {...getDefaultProps()}
        removed={[
          { templateId: "t2", title: "Reading", points: 5, type: "WEEKLY", frequency: 1 },
        ]}
        incompleteCounts={{ t2: 3 }}
      />
    );

    expect(screen.getByText("Removed")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(
      screen.getByText("3 Todo / In Progress tasks will be deleted from the board")
    ).toBeInTheDocument();
  });

  it("shows 'No active tasks on the board' when incomplete count is 0", () => {
    render(
      <ReviewChangesModal
        {...getDefaultProps()}
        removed={[
          { templateId: "t2", title: "Reading", points: 5, type: "WEEKLY", frequency: 1 },
        ]}
      />
    );

    expect(screen.getByText("No active tasks on the board")).toBeInTheDocument();
  });

  it("renders modified templates with from/to diff", () => {
    render(
      <ReviewChangesModal
        {...getDefaultProps()}
        modified={[
          {
            templateId: "t3",
            title: "Coding",
            fromType: "DAILY",
            fromFrequency: 1,
            toType: "WEEKLY",
            toFrequency: 3,
          },
        ]}
      />
    );

    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(screen.getByText("Coding")).toBeInTheDocument();
    // "from" strikethrough contains "Daily · 1× per day"
    expect(screen.getByText(/1× per day/)).toBeInTheDocument();
    // "to" highlighted contains "Weekly · 3× per week"
    expect(screen.getByText(/3× per week/)).toBeInTheDocument();
  });

  it("renders added ad-hoc tasks", () => {
    render(
      <ReviewChangesModal
        {...getDefaultProps()}
        addedAdhoc={[{ id: "a1", title: "Buy groceries", points: 2 }]}
      />
    );

    expect(screen.getByText("Ad-hoc Tasks")).toBeInTheDocument();
    expect(screen.getByText("Added to board")).toBeInTheDocument();
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
  });

  it("renders removed ad-hoc tasks", () => {
    render(
      <ReviewChangesModal
        {...getDefaultProps()}
        removedAdhoc={[{ id: "a2", title: "Old task", points: 1 }]}
      />
    );

    expect(screen.getByText("Removed from board")).toBeInTheDocument();
    expect(screen.getByText("Old task")).toBeInTheDocument();
    expect(
      screen.getByText("Will be moved to unassigned pool")
    ).toBeInTheDocument();
  });

  it("hides sections with no changes", () => {
    render(<ReviewChangesModal {...getDefaultProps()} />);

    expect(screen.queryByText("Added")).not.toBeInTheDocument();
    expect(screen.queryByText("Removed")).not.toBeInTheDocument();
    expect(screen.queryByText("Modified")).not.toBeInTheDocument();
    expect(screen.queryByText("Ad-hoc Tasks")).not.toBeInTheDocument();
  });

  it("always shows the global note about Done/Expired tasks", () => {
    render(<ReviewChangesModal {...getDefaultProps()} />);

    expect(
      screen.getByText(/Done and Expired tasks are never affected/)
    ).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const props = getDefaultProps();
    render(<ReviewChangesModal {...props} />);

    const confirmBtn = screen.getByRole("button", { name: /Confirm/ });
    await user.click(confirmBtn);

    expect(props.onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const props = getDefaultProps();
    render(<ReviewChangesModal {...props} />);

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelBtn);

    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("disables buttons when isSubmitting is true", () => {
    render(<ReviewChangesModal {...getDefaultProps()} isSubmitting={true} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Confirm/ })).toBeDisabled();
  });

  it("pluralizes template count correctly for multiple", () => {
    render(
      <ReviewChangesModal
        {...getDefaultProps()}
        added={[
          { templateId: "t1", title: "A", points: 1, type: "DAILY", frequency: 1 },
          { templateId: "t2", title: "B", points: 2, type: "WEEKLY", frequency: 1 },
        ]}
      />
    );

    expect(screen.getByText("2 templates")).toBeInTheDocument();
  });

  it("uses singular for 1 removed task incomplete count", () => {
    render(
      <ReviewChangesModal
        {...getDefaultProps()}
        removed={[
          { templateId: "t1", title: "Solo", points: 1, type: "DAILY", frequency: 1 },
        ]}
        incompleteCounts={{ t1: 1 }}
      />
    );

    expect(
      screen.getByText("1 Todo / In Progress task will be deleted from the board")
    ).toBeInTheDocument();
  });
});
