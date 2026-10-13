/* Projects page constants. Style tokens are literal classes only —
   Tailwind can't see interpolated names. */

/** A quiet outlined button (Edit, Unarchive, Add step): hairline at rest,
    primary on hover. */
export const OUTLINE_BUTTON =
  'btn border-base-content/15 bg-transparent shadow-none hover:border-primary hover:bg-transparent hover:text-primary';

/** A step row's small text action (+ This week, ×). */
export const ROW_ACTION_BUTTON =
  'fx-num inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-field border border-base-content/10 px-2 text-[10.5px] font-semibold text-base-content/60 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-base-content/10 disabled:hover:text-base-content/60';

/** A step row's ✎. */
export const ROW_ICON_BUTTON =
  'grid h-6 w-[26px] shrink-0 cursor-pointer place-items-center rounded-field border border-base-content/10 text-base-content/45 transition-colors hover:border-primary hover:text-primary';

/** The detail's one drop zone: the open steps. */
export const STEP_LIST_DROPPABLE_ID = 'project-steps';

export const PROJECTS_HREF = '/kanban/projects';
export const CREATE_PLAN_HREF = '/kanban/plans/new';

/** A project selected: the list route with `?project=`, changed on the
    client (history.pushState) so Next's router follows without a request. */
export const getProjectHref = (projectId: string) =>
  `${PROJECTS_HREF}?project=${projectId}`;
