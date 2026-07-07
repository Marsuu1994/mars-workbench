import {cn} from '../cn';

interface FormErrorAlertProps {
  error: string | null;
  className?: string;
}

/** Form-level error banner; renders nothing while there is no error. */
export const FormErrorAlert = ({error, className}: FormErrorAlertProps) =>
  error ? (
    <div className={cn('alert alert-error text-sm', className)}>{error}</div>
  ) : null;
