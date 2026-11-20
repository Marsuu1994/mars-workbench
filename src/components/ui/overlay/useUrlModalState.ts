'use client';

import {useEffect, useRef} from 'react';
import {useSearchParams} from 'next/navigation';
import {
  getSearchWithModal,
  getSearchWithoutModal,
  readOpenModal,
  type ModalParamKeys,
  type ModalParamsOf,
} from '@/utils/modalUrl';

/** Marks a history entry this page pushed to open a modal. */
const OPENED_IN_APP_STATE_KEY = 'modalOpenedInApp';

const isEntryOpenedInApp = () =>
  (window.history.state as Record<string, unknown> | null)?.[
    OPENED_IN_APP_STATE_KEY
  ] === true;

/**
 * A page's open modal, kept in the URL (`?modal=<kind>&<id>=…`,
 * src/utils/modalUrl.ts), so a link (a notification, a refresh, a shared
 * URL) opens the page with the modal already open, and the browser's back
 * closes it. Like the Projects page's `?project=`, the URL changes on the
 * client: Next's router follows history.pushState without a request.
 *
 * Opening pushes an entry. Closing goes back to the entry before it when
 * the page pushed it, so back and forward step through the modal once;
 * a modal the page was loaded with has no entry of the page's own before
 * it, so closing replaces its entry instead, and back then leaves the page.
 */
export function useUrlModalState<Keys extends ModalParamKeys>(keys: Keys) {
  const searchParams = useSearchParams();
  const openModal = readOpenModal(searchParams, keys);
  // history.back() lands later (popstate), so a second close before it
  // lands, as a save's onSuccess and onClose both closing, must not go
  // back twice. Cleared once the URL has changed.
  const wentBackFromHref = useRef<string | null>(null);
  useEffect(() => {
    wentBackFromHref.current = null;
  }, [searchParams]);

  const showModal = <Kind extends keyof Keys & string>(
    kind: Kind,
    params: ModalParamsOf<Keys>[Kind],
  ) => {
    const search = getSearchWithModal(
      window.location.search,
      keys,
      kind,
      params,
    );
    // Next's router keeps the state object and adds its own keys to it
    window.history.pushState({[OPENED_IN_APP_STATE_KEY]: true}, '', search);
  };

  // Every close path reaches here, the dialog's own close event included,
  // which also fires once the URL has already closed the modal (back)
  const closeModal = () => {
    const {href, pathname, search} = window.location;
    if (!readOpenModal(new URLSearchParams(search), keys)) return;
    if (wentBackFromHref.current === href) return;
    if (isEntryOpenedInApp()) {
      wentBackFromHref.current = href;
      window.history.back();
      return;
    }
    window.history.replaceState(
      null,
      '',
      `${pathname}${getSearchWithoutModal(search, keys)}`,
    );
  };

  return {openModal, showModal, closeModal};
}
