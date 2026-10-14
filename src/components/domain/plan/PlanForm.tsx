'use client';

import {useRef, useState, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {CheckIcon, MoonIcon, BoltIcon} from '@heroicons/react/24/outline';
import {
  TaskType,
  TaskStatus,
  PeriodType,
  PlanMode,
  TaskSize,
} from '@/utils/enums';
import {getWeekDateRange} from '@/utils/dateUtils';
import {TaskKind} from '@/utils/taskUtils';
import {Pill, type PillColor} from '@/components/ui/Pill';
import {FieldRow} from '@/components/ui/form/FieldRow';
import {ChoicePills} from '@/components/ui/form/ChoicePills';
import {SubmitButton} from '@/components/ui/form/SubmitButton';
import {FormErrorAlert} from '@/components/ui/form/FormErrorAlert';
import {SectionLabel} from '@/components/ui/SectionLabel';
import type {TaskTemplateItem} from '@/lib/db/taskTemplates';
import type {PlanStepItem} from '@/lib/db/projects';
import {sizeToPoints} from '@/utils/enums';
import {
  createPlanAction,
  updatePlanAction,
  countIncompleteByTemplateAction,
} from '@/actions/planActions';
import TemplateItem from './TemplateItem';
import {PlanTaskRow, type PlanTaskStatus} from './PlanTaskRow';
import TaskModal from '@/components/domain/shared/task-modal/TaskModal';
import {ReviewChangesModal} from './ReviewChangesModal';
import {AiAssistantBanner} from './ai-chat/AiAssistantBanner';
import {AiPlanChatModal} from './ai-chat/AiPlanChatModal';

interface PlanTemplateConfig {
  type: TaskType;
  frequency: number;
}

interface InitialPlanTemplate {
  templateId: string;
  type: TaskType;
  frequency: number;
}

export interface AdhocTaskItem {
  id: string;
  planId: string | null;
  title: string;
  size: TaskSize;
  points: number;
  status: string;
}

interface PlanFormProps {
  templates: TaskTemplateItem[];
  mode: 'create' | 'edit';
  planId?: string;
  initialPlanTemplates?: InitialPlanTemplate[];
  initialDescription?: string;
  initialPlanMode?: PlanMode;
  adhocTasks?: AdhocTaskItem[];
  initialAdhocTaskIds?: string[];
  /** The plan's unfinished project steps — select / deselect only */
  projectSteps?: PlanStepItem[];
  initialProjectStepIds?: string[];
  /** Plan whose stats seed the AI assistant's returning-user welcome. */
  aiContextPlanId?: string;
  /** Plan period (edit mode) — shown as the week range in the mobile topbar. */
  periodKey?: string;
}

/* Plan-mode segmented control — one config drives both options; the label
   body lives in renderModeOption (component scope, needs i18n). */
const PLAN_MODE_OPTIONS: {
  value: PlanMode;
  selectedClass: string;
  icon: typeof MoonIcon;
  accentText: string;
  labelKey: 'NORMAL' | 'EXTREME';
  descKey: 'normalModeShortDesc' | 'extremeModeShortDesc';
}[] = [
  {
    value: PlanMode.NORMAL,
    selectedClass: 'border-info/50 bg-info/5',
    icon: MoonIcon,
    accentText: 'text-info',
    labelKey: 'NORMAL',
    descKey: 'normalModeShortDesc',
  },
  {
    value: PlanMode.EXTREME,
    selectedClass: 'border-error/50 bg-error/5',
    icon: BoltIcon,
    accentText: 'text-error',
    labelKey: 'EXTREME',
    descKey: 'extremeModeShortDesc',
  },
];

export default function PlanForm({
  templates,
  mode,
  planId,
  initialPlanTemplates = [],
  initialDescription = '',
  initialPlanMode = PlanMode.NORMAL,
  adhocTasks = [],
  initialAdhocTaskIds = [],
  projectSteps = [],
  initialProjectStepIds = [],
  aiContextPlanId,
  periodKey,
}: PlanFormProps) {
  const router = useRouter();
  const t = useTranslations('Plan');
  const tMode = useTranslations('Enums.PlanMode');

  // Map from templateId → {type, frequency} for selected templates
  const [selectedTemplates, setSelectedTemplates] = useState<
    Map<string, PlanTemplateConfig>
  >(
    new Map(
      initialPlanTemplates.map(pt => [
        pt.templateId,
        {type: pt.type, frequency: pt.frequency},
      ]),
    ),
  );
  const [description, setDescription] = useState(initialDescription);
  const [planMode, setPlanMode] = useState<PlanMode>(initialPlanMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<TaskTemplateItem | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [incompleteCounts, setIncompleteCounts] = useState<
    Record<string, number>
  >({});
  const [selectedAdhocIds, setSelectedAdhocIds] = useState<Set<string>>(
    new Set(initialAdhocTaskIds),
  );
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(
    new Set(initialProjectStepIds),
  );

  // Cache configs when templates are unchecked so re-checking restores them
  const configCache = useRef(new Map<string, PlanTemplateConfig>());

  function toggleTemplate(id: string) {
    setSelectedTemplates(prev => {
      const next = new Map(prev);
      if (next.has(id)) {
        configCache.current.set(id, next.get(id)!);
        next.delete(id);
      } else {
        const cached = configCache.current.get(id);
        const initial = initialPlanTemplates.find(pt => pt.templateId === id);
        next.set(
          id,
          cached ??
            (initial
              ? {type: initial.type, frequency: initial.frequency}
              : {type: TaskType.DAILY, frequency: 1}),
        );
      }
      return next;
    });
  }

  function updateConfig(id: string, config: PlanTemplateConfig) {
    setSelectedTemplates(prev => {
      const next = new Map(prev);
      next.set(id, config);
      return next;
    });
  }

  function toggleAdhocTask(id: string) {
    setSelectedAdhocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleProjectStep(id: string) {
    setSelectedStepIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Compute diff between initial and current state (edit mode only)
  function computeDiff() {
    const initialMap = new Map(
      initialPlanTemplates.map(pt => [pt.templateId, pt]),
    );
    const templateTitleMap = new Map(templates.map(t => [t.id, t.title]));
    const templateSizeMap = new Map(templates.map(t => [t.id, t.size]));
    const templatePointsMap = new Map(
      templates.map(t => [t.id, sizeToPoints(t.size)]),
    );

    const added = Array.from(selectedTemplates.entries())
      .filter(([id]) => !initialMap.has(id))
      .map(([id, cfg]) => ({
        templateId: id,
        title: templateTitleMap.get(id) ?? '',
        size: (templateSizeMap.get(id) ?? 'MEDIUM') as TaskSize,
        points: templatePointsMap.get(id) ?? 0,
        type: cfg.type,
        frequency: cfg.frequency,
      }));

    const removed = initialPlanTemplates
      .filter(pt => !selectedTemplates.has(pt.templateId))
      .map(pt => ({
        templateId: pt.templateId,
        title: templateTitleMap.get(pt.templateId) ?? '',
        size: (templateSizeMap.get(pt.templateId) ?? 'MEDIUM') as TaskSize,
        points: templatePointsMap.get(pt.templateId) ?? 0,
        type: pt.type,
        frequency: pt.frequency,
      }));

    const modified = Array.from(selectedTemplates.entries())
      .filter(([id, cfg]) => {
        const init = initialMap.get(id);
        return (
          init && (init.type !== cfg.type || init.frequency !== cfg.frequency)
        );
      })
      .map(([id, cfg]) => {
        const init = initialMap.get(id)!;
        return {
          templateId: id,
          title: templateTitleMap.get(id) ?? '',
          fromType: init.type,
          fromFrequency: init.frequency,
          toType: cfg.type,
          toFrequency: cfg.frequency,
        };
      });

    // Ad-hoc diff
    const initialAdhocSet = new Set(initialAdhocTaskIds);
    const addedAdhoc = adhocTasks.filter(
      t => selectedAdhocIds.has(t.id) && !initialAdhocSet.has(t.id),
    );
    const removedAdhoc = adhocTasks.filter(
      t => !selectedAdhocIds.has(t.id) && initialAdhocSet.has(t.id),
    );

    // Step diff: the form only lets steps go (back to their project)
    const initialStepSet = new Set(initialProjectStepIds);
    const removedSteps = projectSteps
      .filter(
        step => !selectedStepIds.has(step.id) && initialStepSet.has(step.id),
      )
      .map(({id, title, size, points, projectTitle, instanceIndex}) => ({
        id,
        title,
        size,
        points,
        projectTitle,
        stepNumber: instanceIndex,
      }));

    const modeChanged = planMode !== initialPlanMode;

    return {
      added,
      removed,
      modified,
      addedAdhoc,
      removedAdhoc,
      removedSteps,
      modeChanged,
      fromMode: initialPlanMode,
      toMode: planMode,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'edit') {
      const {
        added,
        removed,
        modified,
        addedAdhoc,
        removedAdhoc,
        removedSteps,
        modeChanged,
      } = computeDiff();
      const hasChanges =
        added.length > 0 ||
        removed.length > 0 ||
        modified.length > 0 ||
        addedAdhoc.length > 0 ||
        removedAdhoc.length > 0 ||
        removedSteps.length > 0 ||
        modeChanged;
      if (hasChanges) {
        // Fetch incomplete task counts for removed + modified templates
        const affectedIds = [
          ...removed.map(t => t.templateId),
          ...modified.map(t => t.templateId),
        ];
        if (affectedIds.length > 0) {
          const counts = await countIncompleteByTemplateAction(
            planId!,
            affectedIds,
          );
          setIncompleteCounts(counts);
        } else {
          setIncompleteCounts({});
        }
        setIsReviewModalOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    await submitPlan();
  }

  async function handleReviewConfirm() {
    setIsSubmitting(true);
    await submitPlan();
  }

  async function submitPlan() {
    const templatesPayload = Array.from(selectedTemplates.entries()).map(
      ([templateId, cfg]) => ({
        templateId,
        type: cfg.type,
        frequency: cfg.frequency,
      }),
    );

    let result;
    switch (mode) {
      case 'create':
        result = await createPlanAction({
          periodType: PeriodType.WEEKLY,
          description: description.trim() || undefined,
          mode: planMode,
          templates: templatesPayload,
          adhocTaskIds: Array.from(selectedAdhocIds),
          projectStepIds: Array.from(selectedStepIds),
        });
        break;
      case 'edit':
        // Only what the user let go: whatever else is on the week by now
        // (tracked, scheduled or added by Claude meanwhile) stays
        result = await updatePlanAction(planId!, {
          description: description.trim() || undefined,
          mode: planMode,
          templates: templatesPayload,
          removeAdhocTaskIds: initialAdhocTaskIds.filter(
            taskId => !selectedAdhocIds.has(taskId),
          ),
          removeProjectStepIds: initialProjectStepIds.filter(
            stepId => !selectedStepIds.has(stepId),
          ),
        });
        break;
    }

    if (result.error) {
      const err = result.error;
      const message =
        'formErrors' in err ? err.formErrors.join(', ') : JSON.stringify(err);
      setError(message);
      setIsSubmitting(false);
      setIsReviewModalOpen(false);
      return;
    }

    router.push('/kanban');
  }

  const diff =
    mode === 'edit'
      ? computeDiff()
      : {
          added: [],
          removed: [],
          modified: [],
          addedAdhoc: [],
          removedAdhoc: [],
          removedSteps: [],
          modeChanged: false,
          fromMode: initialPlanMode,
          toMode: planMode,
        };

  const modeOptionLabel = (
    o: (typeof PLAN_MODE_OPTIONS)[number],
    selected: boolean,
  ) => {
    const Icon = o.icon;
    const accent = selected ? o.accentText : 'text-base-content/30';
    return (
      <>
        <Icon className={`size-4 ${accent}`} />
        <span className={`text-[13px] font-semibold tracking-wide ${accent}`}>
          {tMode(o.labelKey)}
        </span>
        <span
          className={`text-[11px] ${selected ? 'text-base-content/60' : 'text-base-content/30'}`}
        >
          {t(o.descKey)}
        </span>
      </>
    );
  };

  /** A section of tasks already on the plan: label, count pill, rows. */
  const renderCarriedSection = (
    label: string,
    countColor: PillColor,
    countLabel: string,
    rows: ReactNode,
  ) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-base-content/60">
          {label}
        </span>
        <Pill color={countColor} className="rounded-full">
          {countLabel}
        </Pill>
      </div>
      <div className="flex flex-col gap-2">{rows}</div>
    </div>
  );

  const renderAdhocRow = (task: AdhocTaskItem) => (
    <PlanTaskRow
      key={task.id}
      kind={TaskKind.ONE_OFF}
      title={task.title}
      size={task.size}
      points={task.points}
      status={TaskStatus.TODO}
      isSelected={selectedAdhocIds.has(task.id)}
      returnsTo={t('returnsToMatrix')}
      onToggle={() => toggleAdhocTask(task.id)}
    />
  );

  // Unfinished steps on a plan are staged (backlog) or on the board (todo)
  const toPlanTaskStatus = (status: PlanStepItem['status']): PlanTaskStatus =>
    status === TaskStatus.BACKLOG ? TaskStatus.BACKLOG : TaskStatus.TODO;

  const renderStepRow = (step: PlanStepItem) => (
    <PlanTaskRow
      key={step.id}
      kind={TaskKind.PROJECT}
      title={step.title}
      context={step.projectTitle}
      size={step.size}
      points={step.points}
      status={toPlanTaskStatus(step.status)}
      isSelected={selectedStepIds.has(step.id)}
      returnsTo={t('returnsToProject', {
        project: step.projectTitle,
        number: step.instanceIndex,
      })}
      onToggle={() => toggleProjectStep(step.id)}
    />
  );

  // The counts name only the sections the form shows
  const renderSummary = () => {
    const templateCount = selectedTemplates.size;
    const adhocCount = selectedAdhocIds.size;
    const stepCount = selectedStepIds.size;
    const hasAdhoc = adhocTasks.length > 0;
    const hasSteps = projectSteps.length > 0;
    if (hasAdhoc && hasSteps) {
      return t('summaryWithAdhocAndSteps', {
        templateCount,
        adhocCount,
        stepCount,
      });
    }
    if (hasSteps) return t('summaryWithSteps', {templateCount, stepCount});
    if (hasAdhoc) return t('summaryWithAdhoc', {templateCount, adhocCount});
    return t('summary', {templateCount});
  };

  // Heading scrolls with the form on both breakpoints; the page chrome
  // (Kanban Planner + Planning Mode badge) lives in the plans layout.
  const renderHeading = () => (
    <>
      <h2 className="text-xl md:text-2xl font-bold mb-1">
        {mode === 'create' ? t('createTitle') : t('updateTitle')}
      </h2>
      {mode === 'create' && (
        <p className="text-sm md:text-base text-base-content/50 mb-5 md:mb-7">
          {t('createSubtitle')}
        </p>
      )}
      {mode === 'edit' &&
        (periodKey ? (
          <p className="text-sm md:text-base text-base-content/50 mb-5 md:mb-7">
            {getWeekDateRange(periodKey)}
          </p>
        ) : (
          <div className="mb-6" />
        ))}
    </>
  );

  return (
    <>
      {renderHeading()}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 pb-16 md:pb-0"
      >
        {/* Description */}
        <FieldRow
          label={t('descriptionLabel')}
          labelClassName="text-base-content/60"
        >
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </FieldRow>

        {/* AI Assistant entry (create mode only) */}
        {mode === 'create' && (
          <AiAssistantBanner contextPlanId={aiContextPlanId} />
        )}

        {/* Plan Mode */}
        <div className="rounded-lg border border-base-content/10 bg-base-200 p-3.5">
          <SectionLabel className="block mb-2">
            {t('planModeLabel')}
          </SectionLabel>
          <div className="rounded-lg border border-base-content/10 bg-base-100 p-[3px]">
            <ChoicePills
              layout="fill"
              className="gap-0"
              value={planMode}
              onChange={setPlanMode}
              options={PLAN_MODE_OPTIONS.map(o => ({
                value: o.value,
                selectedClass: o.selectedClass,
                label: (selected: boolean) => modeOptionLabel(o, selected),
              }))}
              pillClass="flex flex-col items-center gap-0.5 rounded-md px-3 py-2.5"
              unselectedClass="border-transparent"
            />
          </div>
        </div>

        {/* Template picker */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-base-content/60">
              {t('taskTemplatesLabel')}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs border border-base-content/15 hover:bg-base-content/5"
              onClick={() => {
                setEditingTemplate(null);
                setIsModalOpen(true);
              }}
            >
              {t('newTemplateButton')}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {templates.map(t => (
              <TemplateItem
                key={t.id}
                template={t}
                isSelected={selectedTemplates.has(t.id)}
                config={selectedTemplates.get(t.id)}
                onToggle={() => toggleTemplate(t.id)}
                onConfigChange={cfg => updateConfig(t.id, cfg)}
                onEdit={() => {
                  setEditingTemplate(t);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>

          {templates.length === 0 && (
            <p className="text-sm text-base-content/50 text-center py-8">
              {t('noTemplates')}
            </p>
          )}
        </div>

        {/* One-off tasks and project steps already on the plan */}
        {adhocTasks.length > 0 &&
          renderCarriedSection(
            t('adhocTasksLabel'),
            'warning',
            t('taskCount', {count: adhocTasks.length}),
            adhocTasks.map(renderAdhocRow),
          )}
        {projectSteps.length > 0 &&
          renderCarriedSection(
            t('projectStepsLabel'),
            'secondary',
            t('stepCount', {count: projectSteps.length}),
            projectSteps.map(renderStepRow),
          )}

        {/* Error */}
        <FormErrorAlert error={error} />

        {/* Summary + Actions — sticky bar above the dock on mobile, inline on desktop */}
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-30 flex items-center gap-3 border-t border-base-content/10 bg-base-100 px-4 py-2.5 md:static md:inset-x-auto md:z-auto md:justify-between md:gap-2 md:bg-transparent md:px-0 md:py-0 md:pt-5">
          <div className="flex-1 text-[11px] leading-snug text-base-content/50 md:flex-none md:text-sm">
            {renderSummary()}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/kanban"
              className="btn btn-ghost hidden md:inline-flex"
            >
              {t('cancel')}
            </Link>
            <SubmitButton
              isSubmitting={isSubmitting}
              icon={<CheckIcon className="size-4" />}
              disabled={
                selectedTemplates.size === 0 &&
                selectedAdhocIds.size === 0 &&
                selectedStepIds.size === 0
              }
            >
              {mode === 'create' ? t('startWeek') : t('updatePlan')}
            </SubmitButton>
          </div>
        </div>
      </form>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => router.refresh()}
        template={editingTemplate}
      />
      <ReviewChangesModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={handleReviewConfirm}
        added={diff.added}
        removed={diff.removed}
        modified={diff.modified}
        addedAdhoc={diff.addedAdhoc}
        removedAdhoc={diff.removedAdhoc}
        removedSteps={diff.removedSteps}
        incompleteCounts={incompleteCounts}
        isSubmitting={isSubmitting}
        modeChanged={diff.modeChanged}
        fromMode={diff.fromMode}
        toMode={diff.toMode}
      />
      {mode === 'create' && <AiPlanChatModal />}
    </>
  );
}
