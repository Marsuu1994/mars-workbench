'use client';

import {useState} from 'react';
import {toFormErrorMessage} from '@/utils/formErrors';
import {useWaitForFreshData} from './useWaitForFreshData';

interface UseModalSubmitOptions {
  /** The page's server prop the write's result shows up in */
  freshData: unknown;
  onClose: () => void;
}

/**
 * A form modal's submit: runs the action and shows its error, or, once it
 * has saved, keeps the modal pending until the page's revalidated props have
 * landed, then runs `onSuccess` and closes. The modal and the list behind it
 * change together, so the list never shows its old data after the close.
 */
export function useModalSubmit({freshData, onClose}: UseModalSubmitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waitForFreshData = useWaitForFreshData(freshData);

  async function submit<Result extends {error?: object}>(
    action: () => Promise<Result>,
    onSuccess?: (result: Extract<Result, {error?: undefined}>) => void,
  ) {
    setError(null);
    setIsSubmitting(true);
    const freshDataArrived = waitForFreshData();

    const result = await action();
    if (result.error) {
      setError(toFormErrorMessage(result.error));
      setIsSubmitting(false);
      return;
    }

    await freshDataArrived;
    // The error branch returned above; a generic doesn't narrow on its own
    onSuccess?.(result as Extract<Result, {error?: undefined}>);
    onClose();
  }

  /** Back to a fresh form's state, for a panel that resets its fields */
  const reset = () => {
    setError(null);
    setIsSubmitting(false);
  };

  return {isSubmitting, error, submit, reset};
}
