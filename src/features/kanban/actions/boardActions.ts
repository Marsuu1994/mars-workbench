"use server";

import { fetchBoard } from "../services/boardService";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";

export async function fetchBoardAction() {
  const userId = await getCurrentUserId();
  return fetchBoard(userId);
}
