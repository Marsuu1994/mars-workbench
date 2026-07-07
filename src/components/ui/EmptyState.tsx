import type {ReactNode} from 'react';
import {cn} from './cn';

interface EmptyStateProps {
  /** Large muted glyph above the title */
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Action(s) below the copy — a CTA link/button */
  action?: ReactNode;
  /** Extra content between description and action (e.g. a stat recap) */
  children?: ReactNode;
  className?: string;
}

/** Centered icon + title + description + CTA — the app's empty/zero state. */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center gap-4', className)}>
    {icon}
    <h1 className="text-2xl font-semibold">{title}</h1>
    {description && (
      <p className="text-base-content/60 text-center max-w-md">{description}</p>
    )}
    {children}
    {action}
  </div>
);
