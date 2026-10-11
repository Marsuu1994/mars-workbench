import type {ReactNode} from 'react';

/**
 * A stand-in for the live modal box (OverlayShell's modal-box: solid panel,
 * corner brackets from md, max-w-lg) around a modal's inline `*Panel`. The
 * live OverlayShell is a top-layer <dialog> that would escape the scenario
 * frame; the dimmed backdrop and centering come from the frame's overlay
 * mode.
 */
export const ModalPanelFrame = ({children}: {children: ReactNode}) => (
  <div className="fx-panel-solid rounded-box md:fx-corners w-full max-w-lg p-0">
    {children}
  </div>
);
