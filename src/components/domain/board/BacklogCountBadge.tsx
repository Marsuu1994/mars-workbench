interface BacklogCountBadgeProps {
  count: number;
}

/**
 * The backlog's staged-card count — the desktop rail and panel header, the
 * mobile pill and sheet header.
 */
export const BacklogCountBadge = ({count}: BacklogCountBadgeProps) => (
  <span className="badge badge-primary badge-sm font-bold">{count}</span>
);
