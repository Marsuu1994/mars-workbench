import type {ReactNode} from 'react';
import {cn} from '../cn';

interface FieldRowProps {
  label: ReactNode;
  /** Renders the red asterisk after the label */
  required?: boolean;
  /** Muted inline note after the label (e.g. "used by the AI assistant") */
  labelHint?: ReactNode;
  className?: string;
  labelClassName?: string;
  /** The control (input/textarea/picker) plus any hint rows below it */
  children: ReactNode;
}

/** The canonical form field row: label (+required star, +inline hint) over a control. */
export const FieldRow = ({
  label,
  required,
  labelHint,
  className,
  labelClassName,
  children,
}: FieldRowProps) => (
  <div className={cn('form-control', className)}>
    <label className="label">
      <span className={cn('label-text text-xs font-medium', labelClassName)}>
        {label} {required && <span className="text-error">*</span>}
        {labelHint && (
          <>
            {' '}
            <span className="text-base-content/40">{labelHint}</span>
          </>
        )}
      </span>
    </label>
    {children}
  </div>
);
