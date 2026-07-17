import type {ReactNode} from 'react';
import {DesignShell} from './DesignShell';

export default function DesignLayout({children}: {children: ReactNode}) {
  return <DesignShell>{children}</DesignShell>;
}
