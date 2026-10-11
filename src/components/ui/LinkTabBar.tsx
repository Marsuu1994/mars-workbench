import Link from 'next/link';
import {cn} from './cn';

interface LinkTab {
  label: string;
  href: string;
}

interface LinkTabBarProps {
  /** Tabs in order; each one is a page */
  tabs: LinkTab[];
  /** The current page's tab */
  activeHref: string;
  /** Accessible name for the nav */
  ariaLabel: string;
  className?: string;
}

/**
 * Tabs that switch pages: a segmented rail of links, the current page's tab
 * tinted primary and marked `aria-current`. For switching panels inside one
 * page, use a tablist of buttons instead.
 */
export const LinkTabBar = ({
  tabs,
  activeHref,
  ariaLabel,
  className,
}: LinkTabBarProps) => (
  <nav
    aria-label={ariaLabel}
    className={cn(
      'inline-flex gap-1 rounded-box border border-base-content/10 bg-base-100/80 p-1',
      className,
    )}
  >
    {tabs.map(({label, href}) => {
      const isActive = href === activeHref;
      return (
        <Link
          key={href}
          href={href}
          aria-current={isActive ? 'page' : undefined}
          className={`whitespace-nowrap rounded-field px-3 py-1.5 text-xs font-semibold transition-colors ${
            isActive
              ? 'bg-primary/15 text-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
        >
          {label}
        </Link>
      );
    })}
  </nav>
);
