import { draftPlanResponseSchema } from "@/schemas";
import type { ActiveChatMessage } from "../types/aiChat";
import type { NewUiMessage } from "../store/aiPlanChatStore";
import { MessageRole, MessageType } from "@/utils/enums";

/**
 * Rebuild the client `UiMessage[]` from persisted chat rows so a chat can be
 * resumed. The first assistant TEXT turn becomes the `welcome` (its chips are
 * supplied by the caller, which resolves the new/returning set via i18n); later
 * assistant TEXT turns are clarifying replies; DRAFT_PLAN turns parse their JSON
 * content back into a draft. Rows that fail to parse are skipped. Rehydrated
 * drafts are never `approved` (an in-progress chat is unapproved by definition).
 */
export function reconstructMessages(
  messages: ActiveChatMessage[],
  welcomeChips: string[]
): NewUiMessage[] {
  const result: NewUiMessage[] = [];
  let welcomeSeen = false;

  for (const message of messages) {
    if (message.role === MessageRole.USER) {
      result.push({ role: "user", type: "user", text: message.content });
      continue;
    }

    if (message.role !== MessageRole.ASSISTANT) continue; // ignore system turns

    if (message.type === MessageType.DRAFT_PLAN) {
      const parsed = draftPlanResponseSchema.safeParse(safeJsonParse(message.content));
      if (parsed.success) {
        result.push({ role: "assistant", type: "draft", draft: parsed.data });
      }
      continue;
    }

    // assistant TEXT — first one is the welcome, the rest are clarifying replies.
    if (!welcomeSeen) {
      welcomeSeen = true;
      result.push({
        role: "assistant",
        type: "welcome",
        text: message.content,
        chips: [...welcomeChips],
      });
    } else {
      result.push({ role: "assistant", type: "text", text: message.content });
    }
  }

  return result;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
