'use server';

import {fetchBoard, getEmptyBoardState} from '../services/boardService';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';

export async function fetchBoardAction() {
  const userId = await getCurrentUserId();
  return fetchBoard(userId);
}

export async function getEmptyBoardStateAction() {
  const userId = await getCurrentUserId();
  return getEmptyBoardState(userId);
}
