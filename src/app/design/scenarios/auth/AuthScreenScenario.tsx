import type {ReactNode} from 'react';

interface AuthScreenScenarioProps {
  children: ReactNode;
}

/**
 * Frame-safe stand-in for the OAuth layout's full-viewport centering, in a
 * page-mode frame: the screen centers in the frame, and a taller screen
 * grows the frame so the console page scrolls (flex-1, not min-h-dvh). The
 * screen's fixed backdrop anchors to the frame via its [contain:layout].
 */
export const AuthScreenScenario = ({children}: AuthScreenScenarioProps) => (
  <div className="flex flex-1 items-center justify-center">{children}</div>
);
