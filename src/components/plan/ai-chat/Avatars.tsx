import {SparklesIcon} from '@heroicons/react/24/outline';

/** Assistant (bot) avatar. */
export const BotAvatar = () => (
  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
    <SparklesIcon className="size-3.5" />
  </span>
);

/** User avatar — a fixed monogram, not user-facing copy. */
export const UserAvatar = () => (
  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-info/10 text-[11px] font-semibold text-info">
    U
  </span>
);
