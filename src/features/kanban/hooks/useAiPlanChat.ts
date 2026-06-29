"use client";

import { useCallback } from "react";
import {
  approveDraftPlanAction,
  createAiChatAction,
  generateDraftPlanAction,
  getActiveAiChatAction,
  resumeDraftPlanAction,
} from "../actions/aiChatActions";
import { useAiPlanChatStore } from "../store/aiPlanChatStore";
import { reconstructMessages } from "../utils/reconstructChat";

type ActionError = { formErrors: string[]; fieldErrors: Record<string, unknown> };
type DraftActionResult = Awaited<ReturnType<typeof generateDraftPlanAction>>;

// Mirror the error-flattening used in TaskModal / PlanForm.
function extractError(error: ActionError | unknown): string {
  if (error && typeof error === "object" && "formErrors" in error) {
    const formErrors = (error as ActionError).formErrors;
    if (formErrors.length > 0) return formErrors.join(", ");
  }
  return "Something went wrong, please try again.";
}

// Shared tail of generate/resume: append the draft (or a clarifying text reply)
// and return to idle, or surface the error and re-enable input.
function applyDraftResult(result: DraftActionResult): void {
  const store = useAiPlanChatStore.getState();
  if ("error" in result) {
    store.setError(extractError(result.error));
    store.setStatus("idle");
    return;
  }

  const draft = result.data;
  if (draft.draftTemplates.length > 0) {
    store.setLatestDraft(draft);
  } else {
    // Clarifying-question turn: render the reply as plain text, no draft cards.
    const replyText = [draft.message, draft.followUp].filter(Boolean).join("\n\n");
    store.appendMessage({ role: "assistant", type: "text", text: replyText });
  }
  store.setStatus("idle");
}

/**
 * Bridge between the pure chat store and the server actions. The store never
 * touches the network (AGENTS.md); this hook orchestrates the action calls and
 * writes results back into the store.
 */
export function useAiPlanChat() {
  // Zustand action methods are stable references that always operate on current
  // state, so it is safe to keep one `store` handle and call its actions after
  // an await — we never read a captured state *value* post-await.

  // Regenerate from existing history without appending a new user turn — used to
  // pick up a generation that was interrupted (e.g. the app was closed mid-run).
  const resume = useCallback(async (chatId: string) => {
    const store = useAiPlanChatStore.getState();
    store.setError(null);
    store.setStatus("generating");
    applyDraftResult(await resumeDraftPlanAction({ chatId }));
  }, []);

  const init = useCallback(
    async (planId?: string) => {
      const store = useAiPlanChatStore.getState();

      // Same in-memory session: the chat is already loaded — just reveal it.
      // Keeps state across dismiss/reopen and lets an in-flight generation
      // finish into the store (no reload, no double-generation). Excludes the
      // `created` state so reopening after an approval starts a fresh chat
      // instead of showing the stale success banner.
      if (store.chatId && store.status !== "created") {
        store.open();
        return;
      }

      store.reset();
      store.open();
      store.setStatus("initializing");

      // Fresh memory (e.g. page reload): the DB is the source of truth. Resume
      // the user's most recent unapproved chat if one exists.
      const active = await getActiveAiChatAction();
      if (active.data) {
        const { chatId, messages, hasStats, pendingGeneration } = active.data;
        store.hydrate({ chatId, messages: reconstructMessages(messages, hasStats) });
        // Last turn was an unanswered user message → finish the interrupted run.
        if (pendingGeneration) await resume(chatId);
        return;
      }

      // No resumable chat — create a fresh one.
      const result = await createAiChatAction(planId ? { planId } : {});
      if ("error" in result) {
        store.setError(extractError(result.error));
        store.setStatus("idle");
        return;
      }

      const { chatId, message, suggestionChips } = result.data;
      store.setChatId(chatId);
      store.appendMessage({
        role: "assistant",
        type: "welcome",
        text: message,
        chips: [...suggestionChips],
      });
      store.setStatus("idle");
    },
    [resume]
  );

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message) return;

    const store = useAiPlanChatStore.getState();
    if (!store.chatId || store.status === "generating" || store.status === "approving") {
      return;
    }

    store.appendMessage({ role: "user", type: "user", text: message });
    store.setInput("");
    store.setError(null);
    store.setStatus("generating");

    applyDraftResult(await generateDraftPlanAction({ chatId: store.chatId, message }));
  }, []);

  const approve = useCallback(async () => {
    const store = useAiPlanChatStore.getState();
    if (!store.chatId || !store.latestDraft || store.status === "approving") return;

    store.setError(null);
    store.setStatus("approving");

    const result = await approveDraftPlanAction({ chatId: store.chatId });
    if ("error" in result) {
      store.setError(extractError(result.error));
      store.setStatus("idle");
      return;
    }

    store.markLatestApproved(result.data.planId);
  }, []);

  return { init, send, approve };
}
