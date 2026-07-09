import type {RiskLevel} from '@/utils/taskUtils';

/* Risk edge-border recipes. Tailwind needs literal class strings, so the
   three placements live as const maps instead of a class builder. */

/** Desktop board card: left edge, preserved on hover (md and up only). */
export const RISK_BORDER_DESKTOP_LEFT: Record<RiskLevel, string> = {
  danger: 'md:border-l-4 md:border-l-error md:hover:border-l-error',
  warning: 'md:border-l-4 md:border-l-warning md:hover:border-l-warning',
  normal: '',
};

/** Mobile board card: top edge, scoped below md, preserved on hover. */
export const RISK_BORDER_MOBILE_TOP: Record<RiskLevel, string> = {
  danger:
    'max-md:border-t-[3px] max-md:border-t-error max-md:hover:border-t-error',
  warning:
    'max-md:border-t-[3px] max-md:border-t-warning max-md:hover:border-t-warning',
  normal: '',
};

/** Sheet row card: static left edge with a transparent placeholder so
    rows stay aligned whether or not they carry risk. */
export const RISK_BORDER_LEFT: Record<RiskLevel, string> = {
  danger: 'border-l-4 border-l-error',
  warning: 'border-l-4 border-l-warning',
  normal: 'border-l-4 border-l-transparent',
};
