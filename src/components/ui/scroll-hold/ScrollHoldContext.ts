import {createContext, use} from 'react';

/**
 * The nearest held scroll container's `holdScrollHeight` (useScrollHold), for
 * controls deep inside it that are about to shrink its content. Outside one
 * it does nothing.
 */
export const ScrollHoldContext = createContext<() => void>(() => undefined);

export const useHoldScrollHeight = (): (() => void) => use(ScrollHoldContext);
