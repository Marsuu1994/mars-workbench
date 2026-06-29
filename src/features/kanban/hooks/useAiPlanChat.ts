"use client";

import { useCallback } from "react";
import {
  approveDraftPlanAction,
  createAiChatAction,
  generateDraftPlanAction,
} from "../actions/aiChatActions";
import { useAiPlanChatStore } from "../store/aiPlanChatStore";

type ActionError = { formErrors: string[]; fieldErrors: Record<string, unknown> };

// Mirror the error-flattening used in TaskModal / PlanForm.
function extractError(error: ActionError | unknown): string {
  if (error && typeof error === "object" && "formErrors" in error) {
    const formErrors = (error as ActionError).formErrors;
    if (formErrors.length > 0) return formErrors.join(", ");
  }
  return "Something went wrong, please try again.";
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
  const init = useCallback(async (planId?: string) => {
    const store = useAiPlanChatStore.getState();
    store.reset();
    store.open();
    store.setStatus("initializing");

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
  }, []);

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

    const result = await generateDraftPlanAction({ chatId: store.chatId, message });
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
