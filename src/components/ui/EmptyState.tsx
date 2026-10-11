import type {ReactNode} from 'react';
import {cn} from './cn';

type EmptyStateVariant = 'page' | 'inline';

interface EmptyStateProps {
  /** Large muted glyph above the title */
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Action(s) below the copy — a CTA link/button */
  action?: ReactNode;
  /** Extra content between description and action (e.g. a stat recap) */
  children?: ReactNode;
  /** page = a whole screen's zero state · inline = a dashed box inside a
      section (an empty list) */
  variant?: EmptyStateVariant;
  className?: string;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const VARIANT_STYLE: Record<
  EmptyStateVariant,
  {root: string; title: string; description: string}
> = {
  page: {
    root: 'gap-4',
    title: 'text-2xl font-semibold',
    description: 'text-base-content/60 text-center max-w-md',
  },
  inline: {
    root: 'gap-2.5 rounded-box border border-dashed border-base-content/15 p-6 text-center text-[13px] text-base-content/55',
    title: 'text-[15px] font-semibold text-base-content',
    description: 'max-w-md',
  },
};

/** Centered icon + title + description + CTA — the app's empty/zero state. */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  children,
  variant = 'page',
  className,
}: EmptyStateProps) => {
  const {
    root,
    title: titleStyle,
    description: descriptionStyle,
  } = VARIANT_STYLE[variant];
  // A page's zero state is its heading; an inline one sits under a section's
  const Title = variant === 'page' ? 'h1' : 'h3';

  return (
    <div className={cn('flex flex-col items-center', root, className)}>
      {icon}
      <Title className={titleStyle}>{title}</Title>
      {description && <p className={descriptionStyle}>{description}</p>}
      {children}
      {action}
    </div>
  );
};
