import Link from 'next/link';
import {
  ArrowLeftIcon,
  Squares2X2Icon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

/* Scenario index. Each entry is a page that composes real page components
   with fixture data — the screen-level source of truth that replaces the
   per-feature HTML mockups. */
const SCENARIOS: {href: string; title: string; note: string}[] = [
  {
    href: '/design/scenarios/board',
    title: 'Board',
    note: 'New user, returning recap, mid-week, and a Friday at-risk board.',
  },
];

export default function ScenariosIndexPage() {
  return (
    <div className="fx-shell-bg min-h-screen text-base-content">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-10">
        <div className="flex flex-col gap-1">
          <Link
            href="/design"
            className="flex items-center gap-1 text-sm text-base-content/50 hover:text-base-content"
          >
            <ArrowLeftIcon className="size-4" />
            Design Console
          </Link>
          <h1 className="text-2xl font-bold">Scenarios</h1>
          <p className="max-w-2xl text-sm text-base-content/60">
            Real page components rendered with fixture data across the states
            that are hard to reach against live data. These are the screen-level
            source of truth.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {SCENARIOS.map(scenario => (
            <Link
              key={scenario.href}
              href={scenario.href}
              className="fx-card group flex items-center gap-4 rounded-xl border border-base-content/10 bg-base-100 p-4"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Squares2X2Icon className="size-5" />
              </span>
              <div className="flex-1">
                <div className="font-semibold">{scenario.title}</div>
                <div className="text-sm text-base-content/50">
                  {scenario.note}
                </div>
              </div>
              <ArrowRightIcon className="size-4 text-base-content/30 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
