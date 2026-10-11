import {TaskStatus} from './enums';

/** The one field a step's progress reads. */
interface StepStatus {
  status: TaskStatus;
}

export const isStepDone = ({status}: StepStatus) => status === TaskStatus.DONE;

/** A project's progress: its DONE steps. */
export const countDoneSteps = (steps: readonly StepStatus[]) =>
  steps.filter(isStepDone).length;

/**
 * All steps done: at least one step, every one DONE. Derived, never stored —
 * adding a step makes the project active again.
 */
export const isAllStepsDone = (steps: readonly StepStatus[]) =>
  steps.length > 0 && steps.every(isStepDone);

/**
 * Renumber a project's unfinished steps after a reorder: they take over the
 * step numbers they already hold, ascending, in their new order — so done
 * steps keep theirs and the numbers stay contiguous. Shared by the server's
 * reorder and the Projects page's optimistic one, so the two always agree.
 */
export function assignStepNumbers(
  orderedStepIds: readonly string[],
  currentNumbers: readonly number[],
): Map<string, number> {
  const ascendingNumbers = [...currentNumbers].sort(
    (left, right) => left - right,
  );
  return new Map(
    orderedStepIds.map((stepId, position) => [
      stepId,
      ascendingNumbers[position],
    ]),
  );
}
