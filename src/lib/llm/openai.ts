import OpenAI from "openai";

// Singleton OpenAI client (mirrors the prisma singleton in src/lib/prisma.ts so
// dev hot-reload doesn't spawn a new client per module reload).
const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

export const openai =
  globalForOpenAI.openai ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;

// Model for AI draft-plan generation. Overridable via env without a code change.
export const DRAFT_PLAN_MODEL = process.env.OPENAI_DRAFT_PLAN_MODEL ?? "gpt-5-nano";
