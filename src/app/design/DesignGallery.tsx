"use client";

import { useState } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

import { SizeChip } from "@/features/kanban/components/shared/SizeChip";
import TaskTypeBadge from "@/features/kanban/components/shared/TaskTypeBadge";
import TaskCard from "@/features/kanban/components/kanban/TaskCard";
import MatrixTaskCard from "@/features/kanban/components/priorities/MatrixTaskCard";
import ProgressDashboard from "@/features/kanban/components/kanban/ProgressDashboard";
import EmptyBoard from "@/features/kanban/components/kanban/EmptyBoard";
import { BotAvatar, UserAvatar } from "@/features/kanban/components/plan/ai-chat/Avatars";
import { SuggestionChips } from "@/features/kanban/components/plan/ai-chat/SuggestionChips";
import { LoadingBubble } from "@/features/kanban/components/plan/ai-chat/LoadingBubble";

import { Section, Variant, Row } from "./GalleryParts";
import {
  GALLERY_TITLE,
  GALLERY_SUBTITLE,
  THEME_DARK,
  THEME_LIGHT,
  TODAY,
  SIZE_FIXTURES,
  TYPE_FIXTURES,
  SUGGESTION_CHIPS,
  LOADING_LABEL,
  TASK_CARD_FIXTURES,
  MATRIX_CARD_FIXTURES,
  PROGRESS_FIXTURE,
} from "./constants";

export const DesignGallery = () => {
  const [theme, setTheme] = useState<string>(THEME_DARK);
  const isDark = theme === THEME_DARK;

  const renderHeader = () => (
    <header className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{GALLERY_TITLE}</h1>
        <p className="max-w-2xl text-sm text-base-content/60">{GALLERY_SUBTITLE}</p>
      </div>
      <button
        type="button"
        onClick={() => setTheme(isDark ? THEME_LIGHT : THEME_DARK)}
        className="btn btn-sm btn-outline shrink-0"
      >
        {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        {isDark ? "Light" : "Dark"}
      </button>
    </header>
  );

  const renderSizeChips = () => (
    <Section
      title="SizeChip"
      description="Inline size + Fibonacci points indicator used on cards and template rows."
    >
      <Row>
        {SIZE_FIXTURES.map(({ size, points }) => (
          <Variant key={size} label={size}>
            <SizeChip size={size} points={points} />
          </Variant>
        ))}
      </Row>
    </Section>
  );

  const renderTypeBadges = () => (
    <Section title="TaskTypeBadge" description="Semantic badge for a task's recurrence type.">
      <Row>
        {TYPE_FIXTURES.map((type) => (
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
      description="The board's core card across its risk, rollover, multi-instance, and done states."
    >
      <DragDropContext onDragEnd={() => undefined}>
        <Droppable droppableId="gallery-cards">
          {(provided) => (
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

  const renderMatrixCards = () => (
    <Section
      title="MatrixTaskCard"
      description="Priorities-page card — hover reveals the track send button; tracked cards dim with a This Week tag (★ on mobile)."
    >
      <DragDropContext onDragEnd={() => undefined}>
        <Droppable droppableId="gallery-matrix-cards">
          {(provided) => (
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
          <SuggestionChips chips={SUGGESTION_CHIPS} onSelect={() => undefined} />
        </Variant>
      </div>
    </Section>
  );

  const renderEmptyState = () => (
    <Section
      title="EmptyBoard"
      description="Full-page empty state shown when no plan is active — new user vs. returning user (last period's recap)."
    >
      <div className="flex flex-col gap-6">
        <Variant label="New user">
          <div className="w-full overflow-hidden rounded-lg border border-base-content/10 [&>div]:!min-h-[420px]">
            <EmptyBoard />
          </div>
        </Variant>
        <Variant label="Returning user">
          <div className="w-full overflow-hidden rounded-lg border border-base-content/10 [&>div]:!min-h-[420px]">
            <EmptyBoard
              stats={{
                completionRate: 0.75,
                completedCount: 12,
                totalCount: 16,
                totalPoints: 47,
                dailyCompletionRate: 0.8,
              }}
            />
          </div>
        </Variant>
      </div>
    </Section>
  );

  return (
    <div data-theme={theme} className="min-h-screen bg-base-200 text-base-content">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 p-6 md:p-10">
        {renderHeader()}
        {renderSizeChips()}
        {renderTypeBadges()}
        {renderTaskCards()}
        {renderMatrixCards()}
        {renderProgress()}
        {renderChatPrimitives()}
        {renderEmptyState()}
      </div>
    </div>
  );
};
