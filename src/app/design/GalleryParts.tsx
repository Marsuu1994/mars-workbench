import type {ReactNode} from 'react';

interface ZoneProps {
  title: string;
  /** One-line orientation for the whole group of sections */
  description?: string;
  children: ReactNode;
}

/** A top-level layer of the system (Tokens, UI primitives, Overlays, Domain). */
export const Zone = ({title, description, children}: ZoneProps) => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <h2 className="fx-label fx-label-bright text-sm">{title}</h2>
        <hr className="fx-rule flex-1" />
      </div>
      {description && (
        <p className="text-sm text-base-content/50">{description}</p>
      )}
    </div>
    <div className="flex flex-col gap-8">{children}</div>
  </div>
);

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** A titled block grouping one family of component variants. */
export const Section = ({title, description, children}: SectionProps) => (
  <section className="flex flex-col gap-4">
    <div className="flex flex-col gap-1">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-base-content/60">{description}</p>
      )}
    </div>
    <div className="rounded-lg border border-base-content/10 bg-base-100 p-5">
      {children}
    </div>
  </section>
);

interface VariantProps {
  label: string;
  children: ReactNode;
}

/** A single labeled specimen within a section. */
export const Variant = ({label, children}: VariantProps) => (
  <div className="flex flex-col items-start gap-2">
    <span className="text-[11px] font-medium uppercase tracking-wide text-base-content/40">
      {label}
    </span>
    {children}
  </div>
);

/** Flex-wrapping row for laying specimens side by side. */
export const Row = ({children}: {children: ReactNode}) => (
  <div className="flex flex-wrap items-start gap-6">{children}</div>
);
