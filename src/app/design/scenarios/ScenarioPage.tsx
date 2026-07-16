import Link from 'next/link';
import type {ReactNode} from 'react';
import {ArrowLeftIcon} from '@heroicons/react/24/outline';

interface ScenarioPageProps {
  title: string;
  description: string;
  /** Literal max-w-* class for the content column */
  maxWidthClass?: string;
  children: ReactNode;
}

/** Shared chrome of every scenario page: back link, heading, content column. */
export const ScenarioPage = ({
  title,
  description,
  maxWidthClass = 'max-w-[1600px]',
  children,
}: ScenarioPageProps) => (
  <div className="fx-shell-bg min-h-screen text-base-content">
    <div className={`mx-auto flex ${maxWidthClass} flex-col gap-8 p-6 md:p-10`}>
      <div className="flex flex-col gap-1">
        <Link
          href="/design/scenarios"
          className="flex items-center gap-1 text-sm text-base-content/50 hover:text-base-content"
        >
          <ArrowLeftIcon className="size-4" />
          Scenarios
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="max-w-2xl text-sm text-base-content/60">{description}</p>
      </div>

      {children}
    </div>
  </div>
);
