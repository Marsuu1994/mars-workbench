"use server";

import { fetchBoard } from "../services/boardService";

export async function fetchBoardAction() {
  return fetchBoard();
}
