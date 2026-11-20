/*
 * A page's open modal, as search params: `?modal=<kind>` plus the ids that
 * kind opens with (`?modal=editStep&stepId=…`). Pure, so the page that
 * reads them and anything that builds a link to them (a notification, an
 * email, a test) share one format. Other search params on the page, like
 * the Projects page's `?project=`, are left as they are.
 */

/** The search param that names a page's open modal. */
export const MODAL_SEARCH_PARAM = 'modal';

/** A page's modals: each kind, with the search params it opens with. */
export type ModalParamKeys = Record<string, readonly string[]>;

/** Each kind's params, as strings keyed by the names its keys list. */
export type ModalParamsOf<Keys extends ModalParamKeys> = {
  [Kind in keyof Keys]: Record<Keys[Kind][number], string>;
};

/** The open modal: its kind and the params it was opened with. */
export type OpenModalOf<Keys extends ModalParamKeys> = {
  [Kind in keyof Keys]: {kind: Kind; params: ModalParamsOf<Keys>[Kind]};
}[keyof Keys];

/**
 * The modal the URL opens, or null: no `modal` param, a kind the page
 * doesn't have, or a kind with one of its params missing or empty.
 */
export function readOpenModal<Keys extends ModalParamKeys>(
  searchParams: URLSearchParams,
  keys: Keys,
): OpenModalOf<Keys> | null {
  const kind = searchParams.get(MODAL_SEARCH_PARAM);
  if (kind === null || !Object.hasOwn(keys, kind)) return null;
  const params: Record<string, string> = {};
  for (const key of keys[kind]) {
    const value = searchParams.get(key);
    if (!value) return null;
    params[key] = value;
  }
  return {kind, params} as OpenModalOf<Keys>;
}

/** The search without any of the page's modal params, as `?…` or ''. */
export function getSearchWithoutModal(
  search: string,
  keys: ModalParamKeys,
): string {
  const searchParams = new URLSearchParams(search);
  searchParams.delete(MODAL_SEARCH_PARAM);
  for (const kindKeys of Object.values(keys)) {
    for (const key of kindKeys) searchParams.delete(key);
  }
  const query = searchParams.toString();
  return query === '' ? '' : `?${query}`;
}

/**
 * The search that opens `kind` with `params`, keeping the page's other
 * params and dropping any modal open before it, as `?…`.
 */
export function getSearchWithModal<
  Keys extends ModalParamKeys,
  Kind extends keyof Keys & string,
>(
  search: string,
  keys: Keys,
  kind: Kind,
  params: ModalParamsOf<Keys>[Kind],
): string {
  const searchParams = new URLSearchParams(getSearchWithoutModal(search, keys));
  searchParams.set(MODAL_SEARCH_PARAM, kind);
  for (const [key, value] of Object.entries<string>(params)) {
    searchParams.set(key, value);
  }
  return `?${searchParams.toString()}`;
}

/** A link that opens the page at `pathname` with `kind` open on it. */
export const getModalHref = <
  Keys extends ModalParamKeys,
  Kind extends keyof Keys & string,
>(
  pathname: string,
  keys: Keys,
  kind: Kind,
  params: ModalParamsOf<Keys>[Kind],
) => `${pathname}${getSearchWithModal('', keys, kind, params)}`;
