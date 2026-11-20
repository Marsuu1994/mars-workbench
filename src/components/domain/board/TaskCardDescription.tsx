interface TaskCardDescriptionProps {
  description: string | null;
}

/**
 * A card's description under its title, on the board's columns and in the
 * backlog: cut off after two lines with an ellipsis, so a long one doesn't
 * stretch the card. Renders nothing without a description.
 */
export const TaskCardDescription = ({description}: TaskCardDescriptionProps) =>
  description ? (
    <p className="-mt-0.5 line-clamp-2 break-words text-xs leading-snug text-base-content/60">
      {description}
    </p>
  ) : null;
