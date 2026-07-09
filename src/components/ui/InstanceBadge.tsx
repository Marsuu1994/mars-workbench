import {Pill, type PillSize} from './Pill';
import {cn} from './cn';

interface InstanceBadgeProps {
  /** 0-based instance index within the template's generation batch */
  index: number;
  size?: PillSize;
  mdSize?: PillSize;
  className?: string;
}

/** `#n` chip marking one instance of a multi-frequency template. */
export const InstanceBadge = ({
  index,
  size,
  mdSize,
  className,
}: InstanceBadgeProps) => (
  <Pill
    color="primary"
    size={size}
    mdSize={mdSize}
    className={cn('font-bold', className)}
  >
    #{index + 1}
  </Pill>
);
