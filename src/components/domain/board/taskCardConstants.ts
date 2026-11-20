/** Most segments a step path draws; a longer project shows one continuous
    bar (done / total) instead, so segments never shrink to slivers. */
export const STEP_PATH_MAX_SEGMENTS = 24;

/** How long ✓ Complete ignores presses after it appears (TAP-3), so a quick
    double press on the round mark selects a card without finishing it. */
export const ARM_DEBOUNCE_MS = 350;
