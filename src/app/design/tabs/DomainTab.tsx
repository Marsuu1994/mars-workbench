'use client';

import {useState} from 'react';
import Link from 'next/link';
import {DragDropContext, Droppable} from '@hello-pangea/dnd';
import {ArrowRightIcon} from '@heroicons/react/24/outline';

import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TaskTypeBadge} from '@/components/domain/shared/TaskTypeBadge';
import {RiskBadge} from '@/components/domain/shared/RiskBadge';
import {RolloverTag} from '@/components/domain/shared/RolloverTag';
import BoardHeader from '@/components/domain/shared/BoardHeader';
import TaskCard from '@/components/domain/board/TaskCard';
import BoardColumn from '@/components/domain/board/BoardColumn';
import ProgressDashboard from '@/components/domain/board/ProgressDashboard';
import MatrixTaskCard from '@/components/domain/priorities/MatrixTaskCard';
import TemplateItem from '@/components/domain/plan/TemplateItem';
import {ThemePicker} from '@/components/domain/auth/ThemePicker';
import type {ThemeName} from '@/utils/theme';
import {BotAvatar, UserAvatar} from '@/components/domain/plan/ai-chat/Avatars';
import {SuggestionChips} from '@/components/domain/plan/ai-chat/SuggestionChips';
import {LoadingBubble} from '@/components/domain/plan/ai-chat/LoadingBubble';

import {Zone, Section, Variant, Row} from '../GalleryParts';
import {TaskType} from '@/utils/enums';
import {
  TODAY,
  SIZE_FIXTURES,
  TYPE_FIXTURES,
  SUGGESTION_CHIPS,
  LOADING_LABEL,
  TASK_CARD_FIXTURES,
  MATRIX_CARD_FIXTURES,
  PROGRESS_FIXTURE,
  BOARD_HEADER_PERIOD,
  BOARD_COLUMN_STATUS,
  BOARD_COLUMN_TASKS,
  BOARD_COLUMN_RISK,
  TEMPLATE_FIXTURE,
  SCENARIO_HREFS,
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
      description="Semantic badge for a task's recurrence type."
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

  const renderRiskAndRollover = () => (
    <Section
      title="RiskBadge & RolloverTag"
      description="Risk-level chip (at risk / urgent) and the rolled-over-from marker."
    >
      <Row>
        <Variant label="RiskBadge">
          <Row>
            <RiskBadge level="warning" />
            <RiskBadge level="danger" />
          </Row>
        </Variant>
        <Variant label="RolloverTag">
          <RolloverTag date={TODAY} />
        </Variant>
      </Row>
    </Section>
  );

  const renderTaskCards = () => (
    <Section
      title="TaskCard"
      description="The board's core card across its risk, rollover, multi-instance, and done states."
    >
      <DragDropContext onDragEnd={() => undefined}>
        <Droppable droppableId="gallery-cards">
          {provided => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-wrap items-start gap-6"
            >
              {TASK_CARD_FIXTURES.map((fixture, index) => (
                <Variant key={fixture.task.id} label={fixture.label}>
                  <div className="w-56">
                    <TaskCard
                      task={fixture.task}
                      taskType={fixture.taskType}
                      index={index}
                      today={TODAY}
                      riskLevel={fixture.riskLevel}
                      frequency={fixture.frequency}
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

  const renderBoardColumn = () => (
    <Section
      title="BoardColumn"
      description="One kanban column: LED-accented header, count badge, and a droppable task list."
    >
      <DragDropContext onDragEnd={() => undefined}>
        <div className="max-w-sm">
          <BoardColumn
            status={BOARD_COLUMN_STATUS}
            tasks={BOARD_COLUMN_TASKS}
            today={TODAY}
            riskMap={new Map(BOARD_COLUMN_RISK)}
            templateFreqMap={new Map()}
          />
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
      description="Priorities-page card — hover reveals the track send button; tracked cards dim with a This Week tag (★ on mobile)."
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
        {renderRiskAndRollover()}
      </Zone>

      <Zone
        title="Board"
        description="Screen states (empty boards, backlog, full weeks) live in the Board scenarios."
        action={
          <ScenarioLink href={SCENARIO_HREFS.board} label="Board scenarios" />
        }
      >
        {renderTaskCards()}
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
        {renderChatPrimitives()}
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
