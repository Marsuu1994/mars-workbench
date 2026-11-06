interface BacklogDescriptionProps {
  description: string | null;
}

/** A backlog card's description under its title, clamped to two lines */
export const BacklogDescription = ({description}: BacklogDescriptionProps) =>
  description ? (
    <p className="-mt-0.5 line-clamp-2 break-words text-xs leading-[1.4] text-base-content/58">
      {description}
    </p>
  ) : null;
