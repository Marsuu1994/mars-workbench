'use client';

import {useState} from 'react';
import {DragDropContext, Droppable} from '@hello-pangea/dnd';
import {
  SunIcon,
  MoonIcon,
  InboxStackIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

import {Pill} from '@/components/ui/Pill';
import {SizeChip} from '@/components/ui/SizeChip';
import {TaskTypeBadge} from '@/components/ui/TaskTypeBadge';
import {InstanceBadge} from '@/components/ui/InstanceBadge';
import {RiskBadge} from '@/components/ui/RiskBadge';
import {RolloverTag} from '@/components/ui/RolloverTag';
import {BottomSheet} from '@/components/ui/overlay/BottomSheet';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {FieldRow} from '@/components/ui/form/FieldRow';
import {ChoicePills} from '@/components/ui/form/ChoicePills';
import {Stepper} from '@/components/ui/form/Stepper';
import {SubmitButton} from '@/components/ui/form/SubmitButton';
import {StatBlock} from '@/components/ui/StatBlock';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {SectionLabel} from '@/components/ui/SectionLabel';
import TaskCard from '@/components/board/TaskCard';
import BoardColumn from '@/components/board/BoardColumn';
import BoardHeader from '@/components/shared/BoardHeader';
import MatrixTaskCard from '@/components/priorities/MatrixTaskCard';
import TemplateItem from '@/components/plan/TemplateItem';
import ProgressDashboard from '@/components/board/ProgressDashboard';
import EmptyBoard from '@/components/board/EmptyBoard';
import {BotAvatar, UserAvatar} from '@/components/plan/ai-chat/Avatars';
import {SuggestionChips} from '@/components/plan/ai-chat/SuggestionChips';
import {LoadingBubble} from '@/components/plan/ai-chat/LoadingBubble';

import {Zone, Section, Variant, Row} from './GalleryParts';
import {TaskType} from '@/utils/enums';
import {
  GALLERY_TITLE_ACCENT,
  GALLERY_TITLE_REST,
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
  TOKEN_SWATCHES,
  LED_STATES,
  CHIP_SPECIMENS,
  PILL_COLORS,
  PILL_SIZES,
  SHEET_DEMO_TITLE,
  SHEET_DEMO_OPEN,
  SHEET_DEMO_CLOSE,
  SHEET_DEMO_HINT,
  SHEET_DEMO_ROWS,
  SHELL_DEMO_OPEN,
  SHELL_DEMO_TITLE,
  SHELL_DEMO_BODY,
  SHELL_DEMO_CLOSE_ACTION,
  FORM_DEMO_FIELD_LABEL,
  FORM_DEMO_FIELD_HINT,
  FORM_DEMO_FIELD_PLACEHOLDER,
  FORM_DEMO_CHOICE_LABEL,
  FORM_DEMO_CHOICES,
  FORM_DEMO_STEP_LABEL,
  FORM_DEMO_STEP_DEC,
  FORM_DEMO_STEP_INC,
  FORM_DEMO_STEP_MIN,
  FORM_DEMO_STEP_MAX,
  FORM_DEMO_SUBMIT,
  CONTENT_STATS,
  CONTENT_BARS,
  CONTENT_SECTION_LABELS,
  BOARD_HEADER_PERIOD,
  BOARD_COLUMN_STATUS,
  BOARD_COLUMN_TASKS,
  BOARD_COLUMN_RISK,
  TEMPLATE_FIXTURE,
} from './constants';

export const DesignGallery = () => {
  const [theme, setTheme] = useState<string>(THEME_DARK);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shellOpen, setShellOpen] = useState(false);
  const [choice, setChoice] = useState<string>(FORM_DEMO_CHOICES[0].value);
  const [freq, setFreq] = useState(FORM_DEMO_STEP_MIN);
  const [templateSelected, setTemplateSelected] = useState(true);
  const [templateCfg, setTemplateCfg] = useState<{
    type: TaskType;
    frequency: number;
  }>({
    type: TaskType.DAILY,
    frequency: 3,
  });
  const isDark = theme === THEME_DARK;

  const renderHeader = () => (
    <header className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">
          <span className="fx-text-gradient">{GALLERY_TITLE_ACCENT}</span>{' '}
          {GALLERY_TITLE_REST}
        </h1>
        <p className="max-w-2xl text-sm text-base-content/60">
          {GALLERY_SUBTITLE}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setTheme(isDark ? THEME_LIGHT : THEME_DARK)}
        className="btn btn-sm btn-outline shrink-0"
      >
        {isDark ? (
          <SunIcon className="size-4" />
        ) : (
          <MoonIcon className="size-4" />
        )}
        {isDark ? 'Light' : 'Dark'}
      </button>
    </header>
  );

  const renderPalette = () => (
    <Section
      title="Palette"
      description="Seven OKLCH hue-wheel stops with matched chroma bands; every pair is WCAG-verified (dark ≥ 7:1, light ≥ 4.5:1)."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {TOKEN_SWATCHES.map(({name, swatch, role}) => (
          <div key={name} className="flex flex-col gap-1.5">
            <div
              className={`flex h-14 items-end justify-between rounded-lg px-2.5 py-1.5 ${swatch}`}
            >
              <span className="text-[11px] font-semibold">Aa</span>
              <span className="fx-num text-[10px] opacity-70">4.5+</span>
            </div>
            <span className="fx-label">{name}</span>
            <span className="text-[11px] leading-tight text-base-content/50">
              {role}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );

  const renderHudPrimitives = () => (
    <Section
      title="HUD primitives"
      description="The fx-* utility layer: console chips, status LEDs, telemetry type, glow actions, holo borders, reticle framing."
    >
      <div className="flex flex-col gap-6">
        <Row>
          <Variant label="Console chips (fx-chip)">
            <div className="flex gap-2">
              {CHIP_SPECIMENS.map(({label, className}) => (
                <span
                  key={label}
                  className={`fx-chip rounded px-2 py-0.5 text-[10px] font-semibold ${className}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </Variant>
          <Variant label="Status LEDs (fx-led)">
            <div className="flex items-center gap-4">
              {LED_STATES.map(({label, className, pulse}) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span
                    className={`fx-led ${pulse ? 'fx-led-pulse' : ''} ${className}`}
                  />
                  <span className="text-xs text-base-content/60">{label}</span>
                </span>
              ))}
            </div>
          </Variant>
        </Row>
        <Row>
          <Variant label="Telemetry type (fx-label / fx-num)">
            <div className="flex flex-col gap-1">
              <span className="fx-label">Week Progress</span>
              <span className="fx-num text-lg font-bold text-primary">
                47 / 82
              </span>
            </div>
          </Variant>
          <Variant label="Glow actions (fx-glow)">
            <div className="flex gap-3">
              <button type="button" className="btn btn-primary fx-glow btn-sm">
                Launch
              </button>
              <button
                type="button"
                className="btn btn-accent fx-glow-accent btn-sm"
              >
                Abort
              </button>
            </div>
          </Variant>
          <Variant label="AI holo border (fx-holo)">
            <div className="fx-holo rounded-xl px-4 py-2.5">
              <span className="flex items-center gap-2 text-xs text-base-content/60">
                <span className="fx-led fx-led-pulse text-secondary" />
                {LOADING_LABEL}
              </span>
            </div>
          </Variant>
        </Row>
        <Row>
          <Variant label="Reticle panel (fx-panel-solid + fx-corners)">
            <div className="fx-panel-solid fx-corners w-56 p-4">
              <span className="fx-label fx-label-bright">Q1 · Do First</span>
              <p className="mt-1 text-xs text-base-content/60">
                Urgent and important.
              </p>
            </div>
          </Variant>
          <Variant label="Drop target (fx-target)">
            <div className="fx-target flex h-20 w-56 items-center justify-center">
              <span className="fx-label text-accent">Drop here</span>
            </div>
          </Variant>
          <Variant label="Luminous rule (fx-rule)">
            <div className="flex w-56 flex-col gap-2">
              <span className="text-xs text-base-content/60">Section A</span>
              <hr className="fx-rule" />
              <span className="text-xs text-base-content/60">Section B</span>
            </div>
          </Variant>
        </Row>
      </div>
    </Section>
  );

  const renderPills = () => (
    <Section
      title="Pill (ui)"
      description="The one tinted-pill primitive: fx-chip recipe + text token + size preset. Every badge in the app composes this — never hand-roll a pill."
    >
      <div className="flex flex-col gap-6">
        {PILL_SIZES.map(size => (
          <Variant key={size} label={`size: ${size}`}>
            <Row>
              {PILL_COLORS.map(color => (
                <Pill key={color} color={color} size={size}>
                  {color}
                </Pill>
              ))}
            </Row>
          </Variant>
        ))}
        <Variant label="responsive (size=xs, mdSize=sm) + shape override">
          <Row>
            <Pill color="info" size="xs" mdSize="sm">
              responsive
            </Pill>
            <Pill color="success" size="md" className="rounded-full">
              rounded-full
            </Pill>
          </Row>
        </Variant>
      </div>
    </Section>
  );

  const renderBadgeFamily = () => (
    <Section
      title="Badge family (ui)"
      description="Domain chips built on Pill: multi-instance index, risk level, rollover marker."
    >
      <Row>
        <Variant label="InstanceBadge (sm / xs)">
          <Row>
            <InstanceBadge index={0} />
            <InstanceBadge index={1} />
            <InstanceBadge index={2} size="xs" />
          </Row>
        </Variant>
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

  const renderOverlays = () => (
    <Section
      title="BottomSheet (ui)"
      description="The uniform mobile sheet container: grip bar, optional pinned header + subheader, internal scroll region, explicit backdrop dismissal."
    >
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => setSheetOpen(true)}
      >
        {SHEET_DEMO_OPEN}
      </button>
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        closeLabel={SHEET_DEMO_CLOSE}
        mobileOnly={false}
        header={{
          icon: <InboxStackIcon className="size-5 text-primary" />,
          title: SHEET_DEMO_TITLE,
          badge: <Pill color="primary">{SHEET_DEMO_ROWS.length}</Pill>,
        }}
        subheader={
          <div className="px-4 py-2.5 text-xs text-base-content/50 border-b border-base-content/10">
            {SHEET_DEMO_HINT}
          </div>
        }
        scrollable
        bodyClassName="p-4 flex flex-col gap-2"
      >
        {SHEET_DEMO_ROWS.map(row => (
          <div
            key={row}
            className="rounded-card border border-base-content/10 bg-base-100 px-3.5 py-3 text-sm"
          >
            {row}
          </div>
        ))}
      </BottomSheet>
    </Section>
  );

  const renderModalShell = () => (
    <Section
      title="OverlayShell (ui)"
      description="The one dialog shell behind every modal: responsive sheet-to-center morph, HUD panel chrome (fx-panel-solid + fx-boot-in), optional reticle corners and grip, explicit dismissOnBackdrop contract."
    >
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => setShellOpen(true)}
      >
        {SHELL_DEMO_OPEN}
      </button>
      <OverlayShell
        variant="responsive"
        isOpen={shellOpen}
        onClose={() => setShellOpen(false)}
        dismissOnBackdrop={false}
        corners
        grip
        boxClassName="max-w-lg pt-2 md:pt-6"
      >
        <h3 className="text-lg font-semibold">{SHELL_DEMO_TITLE}</h3>
        <p className="py-3 text-sm text-base-content/60">{SHELL_DEMO_BODY}</p>
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-primary flex-1 md:flex-none"
            onClick={() => setShellOpen(false)}
          >
            {SHELL_DEMO_CLOSE_ACTION}
          </button>
        </div>
      </OverlayShell>
    </Section>
  );

  const renderFormKit = () => (
    <Section
      title="Form kit (ui)"
      description="The canonical form building blocks: FieldRow (label + required + hint), ChoicePills (mutually-exclusive group), Stepper (−/+), SubmitButton (spinner swap)."
    >
      <div className="flex flex-col gap-5">
        <FieldRow
          label={FORM_DEMO_FIELD_LABEL}
          required
          labelHint={FORM_DEMO_FIELD_HINT}
        >
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder={FORM_DEMO_FIELD_PLACEHOLDER}
          />
        </FieldRow>

        <FieldRow label={FORM_DEMO_CHOICE_LABEL} required>
          <ChoicePills
            layout="fill"
            value={choice}
            onChange={setChoice}
            options={FORM_DEMO_CHOICES.map(c => ({
              value: c.value,
              label: c.label,
            }))}
            pillClass="flex items-center justify-center py-2 rounded-full text-xs font-bold"
            selectedClass="bg-secondary/10 border-secondary text-secondary"
            unselectedClass="bg-base-200 border-base-300 text-base-content/50 hover:border-base-content/30"
          />
        </FieldRow>

        <Row>
          <Variant label={FORM_DEMO_STEP_LABEL}>
            <Stepper
              value={freq}
              min={FORM_DEMO_STEP_MIN}
              max={FORM_DEMO_STEP_MAX}
              onChange={setFreq}
              decreaseLabel={FORM_DEMO_STEP_DEC}
              increaseLabel={FORM_DEMO_STEP_INC}
            />
          </Variant>
          <Variant label="SubmitButton (idle / submitting)">
            <Row>
              <SubmitButton
                isSubmitting={false}
                icon={<CheckIcon className="size-4" />}
              >
                {FORM_DEMO_SUBMIT}
              </SubmitButton>
              <SubmitButton isSubmitting>{FORM_DEMO_SUBMIT}</SubmitButton>
            </Row>
          </Variant>
        </Row>
      </div>
    </Section>
  );

  const renderContentBlocks = () => (
    <Section
      title="Content blocks (ui)"
      description="StatBlock (telemetry value + micro-label), ProgressBar (linear track + fill), SectionLabel (mono uppercase header)."
    >
      <div className="flex flex-col gap-6">
        <Variant label="StatBlock">
          <Row>
            {CONTENT_STATS.map(stat => (
              <StatBlock
                key={stat.label}
                value={stat.value}
                valueClassName={stat.valueClass}
                label={stat.label}
              />
            ))}
          </Row>
        </Variant>
        <Variant label="ProgressBar">
          <div className="flex w-72 flex-col gap-3">
            {CONTENT_BARS.map(bar => (
              <div key={bar.label} className="flex items-center gap-2">
                <SectionLabel className="w-20 shrink-0">
                  {bar.label}
                </SectionLabel>
                <ProgressBar
                  value={bar.value}
                  fillClassName={bar.fill}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </Variant>
        <Variant label="SectionLabel (muted / bright)">
          <Row>
            {CONTENT_SECTION_LABELS.map(label => (
              <SectionLabel key={label}>{label}</SectionLabel>
            ))}
            <SectionLabel bright>Bright</SectionLabel>
          </Row>
        </Variant>
      </div>
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
          <SuggestionChips
            chips={SUGGESTION_CHIPS}
            onSelect={() => undefined}
          />
        </Variant>
      </div>
    </Section>
  );

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
    <div
      data-theme={theme}
      className="fx-shell-bg min-h-screen text-base-content"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-12 p-6 md:p-10">
        {renderHeader()}

        <Zone
          title="Tokens & FX"
          description="The visual foundation — OKLCH palette and the fx-* skin utilities every ui/ component composes."
        >
          {renderPalette()}
          {renderHudPrimitives()}
        </Zone>

        <Zone
          title="UI primitives"
          description="src/components/ui/ — the structural layer on top of the FX skin. New UI composes these; it never hand-rolls the recipes."
        >
          {renderPills()}
          {renderBadgeFamily()}
          {renderSizeChips()}
          {renderTypeBadges()}
          {renderFormKit()}
          {renderContentBlocks()}
        </Zone>

        <Zone
          title="Overlays"
          description="ui/overlay/ — the one dialog stack. Every sheet, modal and popover routes through OverlayShell."
        >
          {renderOverlays()}
          {renderModalShell()}
        </Zone>

        <Zone
          title="Domain components"
          description="Feature components composed from the primitives above, rendered with fixture data across their states."
        >
          {renderBoardHeader()}
          {renderTaskCards()}
          {renderBoardColumn()}
          {renderMatrixCards()}
          {renderTemplateItem()}
          {renderProgress()}
          {renderChatPrimitives()}
          {renderEmptyState()}
        </Zone>
      </div>
    </div>
  );
};
