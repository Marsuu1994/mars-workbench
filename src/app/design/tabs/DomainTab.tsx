'use client';

import {useState} from 'react';
import Link from 'next/link';
import {DragDropContext, Droppable} from '@hello-pangea/dnd';
import {ArrowRightIcon} from '@heroicons/react/24/outline';

import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TaskTypeBadge} from '@/components/domain/shared/TaskTypeBadge';
import BoardHeader from '@/components/domain/shared/BoardHeader';
import TaskCard from '@/components/domain/board/TaskCard';
import {TaskCardMiniFace} from '@/components/domain/board/TaskCardMiniFace';
import MobileBacklogCard from '@/components/domain/board/MobileBacklogCard';
import BoardColumn from '@/components/domain/board/BoardColumn';
import ProgressDashboard from '@/components/domain/board/ProgressDashboard';
import MatrixTaskCard from '@/components/domain/priorities/MatrixTaskCard';
import {DumpEntryCard} from '@/components/domain/dump/DumpEntryCard';
import TemplateItem from '@/components/domain/plan/TemplateItem';
import {PlanTaskRow} from '@/components/domain/plan/PlanTaskRow';
import {StepPath} from '@/components/domain/board/StepPath';
import {ProjectsHeader} from '@/components/domain/projects/ProjectsHeader';
import {ProjectListItem} from '@/components/domain/projects/ProjectListItem';
import {ArchivedProjectRow} from '@/components/domain/projects/ArchivedProjectRow';
import {ProjectStepRow} from '@/components/domain/projects/ProjectStepRow';
import {ThemePicker} from '@/components/domain/auth/ThemePicker';
import type {ThemeName} from '@/utils/theme';
import {BotAvatar, UserAvatar} from '@/components/domain/plan/ai-chat/Avatars';
import {SuggestionChips} from '@/components/domain/plan/ai-chat/SuggestionChips';
import {LoadingBubble} from '@/components/domain/plan/ai-chat/LoadingBubble';

import {Zone, Section, Variant, Row} from '../GalleryParts';
import {InteractionShield} from '../InteractionShield';
import {SIZE_TO_POINTS, TaskStatus, TaskType} from '@/utils/enums';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {
  SIZE_FIXTURES,
  TYPE_FIXTURES,
  SUGGESTION_CHIPS,
  LOADING_LABEL,
  TASK_CARD_FIXTURES,
  MINI_CARD_FIXTURES,
  STEP_PATH_FIXTURES,
  PLAN_TASK_ROW_FIXTURES,
  MATRIX_CARD_FIXTURES,
  DUMP_CARD_FIXTURES,
  PROGRESS_FIXTURE,
  BOARD_HEADER_PERIOD,
  BOARD_COLUMN_STATUS,
  BOARD_COLUMN_CARDS,
  TEMPLATE_FIXTURE,
  SCENARIO_HREFS,
  PROJECTS_HEADER_DEMO_ACTION,
  PROJECT_LIST_ITEM_FIXTURES,
  ARCHIVED_PROJECT_FIXTURE,
  PROJECT_STEP_ROW_FIXTURES,
} from '../constants';

/** Right-aligned Zone action linking a feature group to its scenario page(s). */
const ScenarioLink = ({href, label}: {href: string; label: string}) => (
  <Link
    href={href}
    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
  >
    {label}
    <ArrowRightIcon className="size-3" />
  </Link>
);

/** Feature components composed from the primitives, across their states. */
export const DomainTab = () => {
  const [demoTheme, setDemoTheme] = useState<ThemeName>('mars-dark');
  const [templateSelected, setTemplateSelected] = useState(true);
  const [templateCfg, setTemplateCfg] = useState<{
    type: TaskType;
    frequency: number;
  }>({
    type: TaskType.DAILY,
    frequency: 3,
  });

  const renderBoardHeader = () => (
    <Section
      title="BoardHeader"
      description="Board page title bar. Documents a known accent drift — primary (cyan) on mobile, success (green) from md up — tracked separately for the uniform-header pass."
    >
      <div className="overflow-hidden rounded-lg border border-base-content/10">
        <BoardHeader periodKey={BOARD_HEADER_PERIOD} />
      </div>
    </Section>
  );

  const renderSizeChips = () => (
    <Section
      title="SizeChip"
      description="Inline size + Fibonacci points indicator used on cards and template rows."
    >
      <Row>
        {SIZE_FIXTURES.map(({size, points}) => (
          <Variant key={size} label={size}>
            <SizeChip size={size} points={points} />
          </Variant>
        ))}
      </Row>
    </Section>
  );

  const renderTypeBadges = () => (
    <Section
      title="TaskTypeBadge"
      description="Semantic badge for a template's recurrence type — used by the AI plan draft cards; board cards show their kind instead."
    >
      <Row>
        {TYPE_FIXTURES.map(type => (
          <Variant key={type} label={type}>
            <TaskTypeBadge type={type} />
          </Variant>
        ))}
      </Row>
    </Section>
  );

  const renderTaskCards = () => (
    <Section
      title="TaskCard"
      description="The board's kind-first card, every kind in every place it sits: kind + context (plan line, step n/N, quadrant), the title, then the kind's signal and a neutral size — a habit's week dots in order, filled when done, with the card's own dot ringed; a project step's path, its own step outlined. A step names its project in place of the kind label. No risk. Below md the same card shows its 136px mini face (next section)."
    >
      <DragDropContext onDragEnd={() => undefined}>
        <Droppable droppableId="gallery-cards">
          {provided => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-wrap items-start gap-6"
            >
              {TASK_CARD_FIXTURES.map(({label, card}, index) => (
                <Variant key={card.task.id} label={label}>
                  <div className="w-64">
                    <TaskCard card={card} index={index} />
                  </div>
                </Variant>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </Section>
  );

  const renderMiniFaces = () => (
    <Section
      title="TaskCardMiniFace"
      description="The 136px face TaskCard shows in the mobile board rows: kind label (a step's project name), a two-line title, then the week dots or the path (the card's own mark outlined) and the size. Shown here in the card's mobile frame."
    >
      <Row>
        {MINI_CARD_FIXTURES.map(({label, card}) => (
          <Variant key={card.task.id} label={label}>
            <div
              className={`card fx-card bg-base-100/70 border border-base-content/10 w-[136px] h-[92px] ${
                TASK_KIND_STYLE[card.kind].edge
              }`}
            >
              <TaskCardMiniFace card={card} />
            </div>
          </Variant>
        ))}
      </Row>
    </Section>
  );

  const renderStepPath = () => (
    <Section
      title="StepPath"
      description="A project step card's signal: one segment per step in path order, filled when done, the card's own step outlined. Past 24 steps the segments give way to one continuous bar."
    >
      <Row>
        {STEP_PATH_FIXTURES.map(({label, step}) => (
          <Variant key={label} label={label}>
            <div className="flex flex-col gap-3">
              <StepPath step={step} variant="card" />
              <StepPath step={step} variant="mini" />
            </div>
          </Variant>
        ))}
      </Row>
    </Section>
  );

  const renderMobileBacklogCard = () => (
    <Section
      title="MobileBacklogCard"
      description="The mobile backlog sheet's card: the full face on a plain card, with the ↑ Todo pull beside the title."
    >
      <div className="flex max-w-sm flex-col gap-2.5">
        {MINI_CARD_FIXTURES.slice(0, 2).map(({card}) => (
          <MobileBacklogCard
            key={card.task.id}
            card={{...card, task: {...card.task, status: TaskStatus.BACKLOG}}}
            onPull={() => undefined}
          />
        ))}
      </div>
    </Section>
  );

  const renderBoardColumn = () => (
    <Section
      title="BoardColumn"
      description="One kanban column: LED-accented header, count badge, and a droppable list — a frame the board renders its cards into."
    >
      <DragDropContext onDragEnd={() => undefined}>
        <div className="max-w-sm">
          <BoardColumn
            status={BOARD_COLUMN_STATUS}
            count={BOARD_COLUMN_CARDS.length}
          >
            {BOARD_COLUMN_CARDS.map((card, index) => (
              <TaskCard key={card.task.id} card={card} index={index} />
            ))}
          </BoardColumn>
        </div>
      </DragDropContext>
    </Section>
  );

  const renderProgress = () => (
    <Section
      title="ProgressDashboard"
      description="Adaptive progress header — ring + metrics on desktop, linear bars on mobile."
    >
      <div className="overflow-hidden rounded-lg border border-base-content/10">
        <ProgressDashboard {...PROGRESS_FIXTURE} />
      </div>
    </Section>
  );

  const renderMatrixCards = () => (
    <Section
      title="MatrixTaskCard"
      description="Priorities-page card — hover reveals the Move-to send button (tracked cards keep it: Done is still a valid move); tracked cards dim with a This Week tag (★ on mobile)."
    >
      <DragDropContext onDragEnd={() => undefined}>
        <Droppable droppableId="gallery-matrix-cards">
          {provided => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-wrap items-start gap-6"
            >
              {MATRIX_CARD_FIXTURES.map((fixture, index) => (
                <Variant key={fixture.task.id} label={fixture.label}>
                  <div className="w-64">
                    <MatrixTaskCard
                      task={fixture.task}
                      index={index}
                      isTracked={fixture.isTracked}
                      hasActivePlan
                      isPopoverOpen={false}
                      onSendToggle={() => undefined}
                      onTrack={() => undefined}
                      onComplete={() => undefined}
                      onTap={() => undefined}
                    />
                  </div>
                </Variant>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </Section>
  );

  const renderDumpCards = () => (
    <Section
      title="DumpEntryCard"
      description="A single dumped entry — mono timestamp over the content; entries past six lines clamp with a Show more toggle."
    >
      <div className="flex max-w-md flex-col gap-3">
        {DUMP_CARD_FIXTURES.map(({label, entry}) => (
          <Variant key={entry.id} label={label}>
            <div className="w-full">
              <DumpEntryCard entry={entry} />
            </div>
          </Variant>
        ))}
      </div>
    </Section>
  );

  const renderTemplateItem = () => (
    <Section
      title="TemplateItem"
      description="A selectable plan-template row — checkbox, size chip, and (when selected) the type/frequency config strip built on ChoicePills + Stepper."
    >
      <div className="max-w-md">
        <TemplateItem
          template={TEMPLATE_FIXTURE}
          isSelected={templateSelected}
          config={templateSelected ? templateCfg : undefined}
          onToggle={() => setTemplateSelected(v => !v)}
          onConfigChange={setTemplateCfg}
          onEdit={() => undefined}
        />
      </div>
    </Section>
  );

  const renderPlanTaskRows = () => (
    <Section
      title="PlanTaskRow"
      description="A one-off or project step already on the plan: the form can only keep it or let it go. The checkbox and selected wash take the kind's colour; deselected, the row says where the task goes."
    >
      <div className="flex max-w-md flex-col gap-4">
        {PLAN_TASK_ROW_FIXTURES.map(({label, size, ...row}) => (
          <Variant key={label} label={label}>
            {/* Full width, as in the plan form */}
            <div className="self-stretch">
              <PlanTaskRow
                {...row}
                size={size}
                points={SIZE_TO_POINTS[size]}
                onToggle={() => undefined}
              />
            </div>
          </Variant>
        ))}
      </div>
    </Section>
  );

  const renderProjectsHeader = () => (
    <Section
      title="ProjectsHeader"
      description="The Projects page header: Plan with the week, the hub's tabs (Projects active) and the page action from md up; on mobile the week number and full-width tabs under the title."
    >
      <InteractionShield className="overflow-hidden rounded-lg border border-base-content/10">
        <ProjectsHeader
          action={
            <button type="button" className="btn btn-primary btn-sm">
              {PROJECTS_HEADER_DEMO_ACTION}
            </button>
          }
        />
      </InteractionShield>
    </Section>
  );

  const renderProjectListItems = () => (
    <Section
      title="ProjectListItem"
      description="A project in the list: from md up a card with done/total, the progress bar, the next step (or All steps done / No steps yet) and how many steps are on this week, ringed when selected; below md a row with a chevron. A link — mobile opens the project's page, desktop selects it in place."
    >
      <InteractionShield className="flex flex-wrap items-start gap-6">
        {PROJECT_LIST_ITEM_FIXTURES.map(({label, project, isSelected}) => (
          <Variant key={project.id} label={label}>
            <div className="w-72">
              <ProjectListItem
                project={project}
                isSelected={isSelected}
                href={`#${project.id}`}
                onSelect={() => undefined}
              />
            </div>
          </Variant>
        ))}
      </InteractionShield>
    </Section>
  );

  const renderArchivedProjectRow = () => (
    <Section
      title="ArchivedProjectRow"
      description="An archived project at the bottom of the list: title and progress on a dashed row, Unarchive (disabled while it runs)."
    >
      <div className="w-72">
        <ArchivedProjectRow
          project={ARCHIVED_PROJECT_FIXTURE}
          onUnarchive={async () => undefined}
        />
      </div>
    </Section>
  );

  const renderProjectStepRows = () => (
    <Section
      title="ProjectStepRow"
      description="One step of a path, by state: done (locked, with its day), on this week (tinted, its board status; × while still in the backlog), left on last week's plan (muted, no ×), upcoming (size + This week, disabled without a plan). ✎ on every step that isn't done; from md up a drag hint and the description."
    >
      <div className="flex max-w-2xl flex-col gap-4">
        {PROJECT_STEP_ROW_FIXTURES.map(({label, row}) => (
          <Variant key={label} label={label}>
            <div className="self-stretch">
              <ProjectStepRow
                row={row}
                onEdit={() => undefined}
                onSchedule={() => undefined}
                onTakeBack={() => undefined}
              />
            </div>
          </Variant>
        ))}
      </div>
    </Section>
  );

  const renderChatPrimitives = () => (
    <Section
      title="AI chat primitives"
      description="Building blocks of the plan-assistant conversation."
    >
      <div className="flex flex-col gap-6">
        <Row>
          <Variant label="Bot avatar">
            <BotAvatar />
          </Variant>
          <Variant label="User avatar">
            <UserAvatar />
          </Variant>
        </Row>
        <Variant label="Loading bubble">
          <LoadingBubble label={LOADING_LABEL} />
        </Variant>
        <Variant label="Suggestion chips">
          <SuggestionChips
            chips={SUGGESTION_CHIPS}
            onSelect={() => undefined}
          />
        </Variant>
      </div>
    </Section>
  );

  const renderThemePicker = () => (
    <Section
      title="ThemePicker"
      description="Three theme cards (preview swatch + name/tagline + check ring) on ChoicePills; selection here is local — the live panel stamps data-theme and persists the cookie."
    >
      <div className="max-w-md">
        <ThemePicker value={demoTheme} onChange={setDemoTheme} />
      </div>
    </Section>
  );

  return (
    <div className="flex flex-col gap-10">
      <p className="text-sm text-base-content/50">
        src/components/domain/ — feature components composed from the
        primitives, rendered with fixture data across their states. Full screens
        live in the scenario pages.
      </p>

      <Zone
        title="Shared"
        description="domain/shared/ — chips and headers reused across features. The shared TaskModal's states live as tabs in the Plan (templates) and Priorities (add-task) scenarios."
      >
        {renderBoardHeader()}
        {renderSizeChips()}
        {renderTypeBadges()}
      </Zone>

      <Zone
        title="Board"
        description="Screen states (empty boards, backlog, full weeks) live in the Board scenarios."
        action={
          <ScenarioLink href={SCENARIO_HREFS.board} label="Board scenarios" />
        }
      >
        {renderTaskCards()}
        {renderMiniFaces()}
        {renderStepPath()}
        {renderMobileBacklogCard()}
        {renderBoardColumn()}
        {renderProgress()}
      </Zone>

      <Zone
        title="Priorities"
        description="The full matrix, track popover and mobile sheet live in the Priorities scenarios."
        action={
          <ScenarioLink
            href={SCENARIO_HREFS.priorities}
            label="Priorities scenarios"
          />
        }
      >
        {renderMatrixCards()}
      </Zone>

      <Zone
        title="Plan"
        description="The create/edit forms, review panel and template modal live in the Plan scenarios; the assistant's full lifecycle in the AI plan creation scenarios."
        action={
          <span className="flex items-center gap-3">
            <ScenarioLink href={SCENARIO_HREFS.plan} label="Plan scenarios" />
            <ScenarioLink
              href={SCENARIO_HREFS.aiChat}
              label="AI plan creation scenarios"
            />
          </span>
        }
      >
        {renderTemplateItem()}
        {renderPlanTaskRows()}
        {renderChatPrimitives()}
      </Zone>

      <Zone
        title="Projects"
        description="The whole page — list + detail, all steps done, no plan / between weeks — and the project and step modals live in the Projects scenarios."
        action={
          <ScenarioLink
            href={SCENARIO_HREFS.projects}
            label="Projects scenarios"
          />
        }
      >
        {renderProjectsHeader()}
        {renderProjectListItems()}
        {renderArchivedProjectRow()}
        {renderProjectStepRows()}
      </Zone>

      <Zone
        title="Dump"
        description="The full capture page — composer over the day-grouped feed — and the empty state live in the Dump scenarios."
        action={
          <ScenarioLink href={SCENARIO_HREFS.dump} label="Dump scenarios" />
        }
      >
        {renderDumpCards()}
      </Zone>

      <Zone
        title="Auth"
        description="The settings overlay's both presentations (mobile sheet / desktop modal, sign-out confirm) live in the Auth scenarios."
        action={
          <ScenarioLink href={SCENARIO_HREFS.auth} label="Auth scenarios" />
        }
      >
        {renderThemePicker()}
      </Zone>
    </div>
  );
};
