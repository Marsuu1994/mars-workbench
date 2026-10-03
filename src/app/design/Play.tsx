'use client';

import {useRef, useState, type ReactNode} from 'react';
import {PlayRunner, type PlayStep} from './PlayRunner';

interface PlayProps {
  steps: PlayStep[];
  children: ReactNode;
}

/**
 * The gallery's counterpart of a scenario tab's `play`: mounts a live
 * specimen and replays the steps on it, so an interaction state (a confirm
 * armed, say) is reached through the component's own handlers instead of an
 * override prop. A failed step is printed under the specimen.
 */
export const Play = ({steps, children}: PlayProps) => {
  const scopeRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // The runner must follow the scoped box, not sit inside it: React attaches
  // a host element's ref only after its children's layout effects ran, so a
  // nested runner would find the scope still unset.
  return (
    <>
      <div ref={scopeRef} className="flex w-full flex-col gap-1.5">
        {children}
        {error && <p className="text-xs font-semibold text-error">{error}</p>}
      </div>
      <PlayRunner steps={steps} scopeRef={scopeRef} onError={setError} />
    </>
  );
};
