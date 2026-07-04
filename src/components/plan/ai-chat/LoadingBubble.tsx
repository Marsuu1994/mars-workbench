import { BotAvatar } from "./Avatars";

interface LoadingBubbleProps {
  label: string;
}

/** Transient assistant bubble shown while a server action is in flight —
    the holo border + pulsing LED mark the AI channel as live. */
export const LoadingBubble = ({ label }: LoadingBubbleProps) => (
  <div className="flex items-start gap-2.5">
    <BotAvatar />
    <div className="fx-holo rounded-xl rounded-tl-sm px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="fx-led fx-led-pulse text-secondary" />
        <span className="loading loading-dots loading-sm text-base-content/40" />
        <span className="text-xs text-base-content/40">{label}</span>
      </div>
    </div>
  </div>
);
