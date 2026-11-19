import {cn} from './cn';

interface FinishBoxProps {
  /** What was finished, said in a few words */
  title: string;
  /** Whole sentences under the title, each starting on its own line */
  lines: string[];
  className?: string;
}

/**
 * A finish line where a list used to be: a dashed box with a title and a
 * sentence or two, no button. It eases in when it appears.
 */
export const FinishBox = ({title, lines, className}: FinishBoxProps) => (
  <div
    className={cn(
      'fx-boot-in fx-finish-box flex flex-col items-center gap-2 rounded-card border border-dashed border-success/40 px-3.5 py-[18px] text-center',
      className,
    )}
  >
    <p className="text-sm font-bold text-base-content">{title}</p>
    <div className="flex flex-col gap-0.5 text-xs leading-[1.45] text-base-content/55">
      {lines.map(line => (
        <p key={line}>{line}</p>
      ))}
    </div>
  </div>
);
