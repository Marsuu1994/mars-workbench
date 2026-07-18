import {useEffect, type RefObject} from 'react';

/**
 * The one sync point between an `isOpen` prop and the native <dialog>.
 * Guards against redundant calls so parent re-renders and dialog-initiated
 * closes (Esc, backdrop form) never double-fire showModal()/close().
 */
export const useDialogSync = (
  ref: RefObject<HTMLDialogElement | null>,
  isOpen: boolean,
) => {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first focusable element — usually a header
      // close button, which then paints the app-wide :focus-visible ring on
      // every open. Park initial focus on the dialog container instead
      // (WAI-ARIA APG dialog pattern); Tab still reaches the controls with
      // their ring intact.
      dialog.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [ref, isOpen]);
};
