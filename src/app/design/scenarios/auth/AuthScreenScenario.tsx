import type {ReactNode} from 'react';

interface AuthScreenScenarioProps {
  children: ReactNode;
}

/**
 * Frame-safe stand-in for the OAuth layout's full-viewport centering: the
 * screen centers in the frame and scrolls inside it when taller (h-full,
 * not min-h-dvh). The screen's fixed backdrop anchors to the frame via its
 * [contain:layout].
 */
export const AuthScreenScenario = ({children}: AuthScreenScenarioProps) => (
  <div className="h-full overflow-y-auto">
    <div className="flex min-h-full items-center justify-center">
      {children}
    </div>
  </div>
);
