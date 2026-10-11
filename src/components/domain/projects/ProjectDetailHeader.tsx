import {useTranslations} from 'next-intl';
import {PencilSquareIcon} from '@heroicons/react/24/outline';
import type {ProjectHeaderModel} from '@/utils/projectViewUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {cn} from '@/components/ui/cn';
import {OUTLINE_BUTTON} from './constants';

interface ProjectDetailHeaderProps {
  project: ProjectHeaderModel;
  onEdit: () => void;
}

const {fill, track} = TASK_KIND_STYLE[TaskKind.PROJECT];

/** The selected project's title, goal and progress, with Edit. */
export const ProjectDetailHeader = ({
  project,
  onEdit,
}: ProjectDetailHeaderProps) => {
  const t = useTranslations('Projects.Detail');
  const {title, goal, doneCount, stepCount} = project;

  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="fx-display text-[19px] font-bold md:text-xl">{title}</h2>
        {goal && (
          <p className="mt-1 text-[13px] text-base-content/60">{goal}</p>
        )}
        <div className="fx-num mt-3 flex items-center gap-3 text-[11.5px] text-base-content/60">
          <ProgressBar
            value={stepCount ? (doneCount / stepCount) * 100 : 0}
            fillClassName={fill}
            className={cn('max-w-[360px] flex-1', track)}
          />
          {t('stepsProgress', {done: doneCount, total: stepCount})}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className={cn(OUTLINE_BUTTON, 'btn-sm shrink-0')}
      >
        <PencilSquareIcon className="size-3" />
        {t('edit')}
      </button>
    </div>
  );
};
