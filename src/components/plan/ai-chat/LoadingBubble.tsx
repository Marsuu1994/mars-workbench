import {BotAvatar} from './Avatars';

interface LoadingBubbleProps {
  label: string;
}

/** Transient assistant bubble shown while a server action is in flight. */
export const LoadingBubble = ({label}: LoadingBubbleProps) => (
  <div className="flex items-start gap-2.5">
    <BotAvatar />
    <div className="rounded-xl rounded-tl-sm border border-base-content/10 bg-base-200 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="loading loading-dots loading-sm text-base-content/40" />
        <span className="text-xs text-base-content/40">{label}</span>
      </div>
    </div>
  </div>
);
