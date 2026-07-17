'use client';

import {useState} from 'react';
import {
  InboxStackIcon,
  CheckIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

import {Pill} from '@/components/ui/Pill';
import {InstanceBadge} from '@/components/ui/InstanceBadge';
import {EmptyState} from '@/components/ui/EmptyState';
import {TabBar} from '@/components/ui/TabBar';
import {StatBlock} from '@/components/ui/StatBlock';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {FieldRow} from '@/components/ui/form/FieldRow';
import {ChoicePills} from '@/components/ui/form/ChoicePills';
import {Stepper} from '@/components/ui/form/Stepper';
import {SubmitButton} from '@/components/ui/form/SubmitButton';
import {FormErrorAlert} from '@/components/ui/form/FormErrorAlert';
import {BottomSheet} from '@/components/ui/overlay/BottomSheet';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {Popover} from '@/components/ui/overlay/Popover';
import {SheetCloseButton} from '@/components/ui/overlay/SheetCloseButton';

import {Zone, Section, Variant, Row} from '../GalleryParts';
import {
  PILL_COLORS,
  PILL_SIZES,
  EMPTY_STATE_DEMO_TITLE,
  EMPTY_STATE_DEMO_DESC,
  EMPTY_STATE_DEMO_CTA,
  TABBAR_DEMO_LABELS,
  POPOVER_DEMO_ANCHOR,
  POPOVER_DEMO_TITLE,
  POPOVER_DEMO_BODY,
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
  FORM_DEMO_ERROR,
  CONTENT_STATS,
  CONTENT_BARS,
  CONTENT_SECTION_LABELS,
} from '../constants';

/** src/components/ui/ — generic primitives with zero domain imports. */
export const UiTab = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shellOpen, setShellOpen] = useState(false);
  const [choice, setChoice] = useState<string>(FORM_DEMO_CHOICES[0].value);
  const [freq, setFreq] = useState(FORM_DEMO_STEP_MIN);
  const [demoTab, setDemoTab] = useState(0);

  const renderPills = () => (
    <Section
      title="Pill"
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

  const renderInstanceBadge = () => (
    <Section
      title="InstanceBadge"
      description="'#n' chip marking one instance of a multi-frequency template; composes Pill."
    >
      <Row>
        <Variant label="sm (default)">
          <Row>
            <InstanceBadge index={0} />
            <InstanceBadge index={1} />
          </Row>
        </Variant>
        <Variant label="xs">
          <InstanceBadge index={2} size="xs" />
        </Variant>
      </Row>
    </Section>
  );

  const renderFormKit = () => (
    <Section
      title="Form kit"
      description="The canonical form building blocks: FieldRow (label + required + hint), ChoicePills (mutually-exclusive group), Stepper (−/+), SubmitButton (spinner swap), FormErrorAlert."
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

        <Variant label="FormErrorAlert">
          <FormErrorAlert error={FORM_DEMO_ERROR} className="w-full max-w-md" />
        </Variant>
      </div>
    </Section>
  );

  const renderContentBlocks = () => (
    <Section
      title="Content blocks"
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

  const renderEmptyState = () => (
    <Section
      title="EmptyState"
      description="Generic centered zero state: icon + title + description + CTA. EmptyBoard composes this with board copy and the recap stats."
    >
      <div className="rounded-lg border border-base-content/10 bg-base-200/40 py-10">
        <EmptyState
          icon={<SignalIcon className="size-14 text-base-content/20" />}
          title={EMPTY_STATE_DEMO_TITLE}
          description={EMPTY_STATE_DEMO_DESC}
          action={
            <button type="button" className="btn btn-primary btn-sm">
              {EMPTY_STATE_DEMO_CTA}
            </button>
          }
        />
      </div>
    </Section>
  );

  const renderTabBar = () => (
    <Section
      title="TabBar"
      description="The chip-row tab strip behind the gallery layers and scenario states — the bar only; panels stay with the caller."
    >
      <TabBar
        ariaLabel="TabBar demo"
        labels={TABBAR_DEMO_LABELS}
        activeIndex={demoTab}
        onChange={setDemoTab}
      />
    </Section>
  );

  const renderBottomSheet = () => (
    <Section
      title="BottomSheet"
      description="The uniform mobile sheet container: optional pinned header + subheader, internal scroll region, explicit backdrop dismissal."
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
      title="OverlayShell"
      description="The one dialog shell behind every modal: responsive sheet-to-center morph, HUD panel chrome (fx-panel-solid + fx-boot-in), optional reticle corners, explicit dismissOnBackdrop contract."
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
        boxClassName="max-w-lg pt-4 md:pt-6"
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

  const renderPopover = () => (
    <Section
      title="Popover"
      description="Anchored panel below a position:relative parent with an arrow notch; the click-away layer stays page-level (see the matrix)."
    >
      <div className="pb-28">
        <div className="relative inline-block">
          <button type="button" className="btn btn-outline btn-sm">
            {POPOVER_DEMO_ANCHOR}
          </button>
          <Popover align="left" className="w-56">
            <SectionLabel className="mb-1.5 block">
              {POPOVER_DEMO_TITLE}
            </SectionLabel>
            <p className="text-xs text-base-content/60">{POPOVER_DEMO_BODY}</p>
          </Popover>
        </div>
      </div>
    </Section>
  );

  const renderSheetCloseButton = () => (
    <Section
      title="SheetCloseButton"
      description="The standard overlay close affordance — a down-chevron in sheet/modal headers app-wide."
    >
      <SheetCloseButton onClick={() => undefined} label="Close" />
    </Section>
  );

  return (
    <div className="flex flex-col gap-10">
      <p className="text-sm text-base-content/50">
        src/components/ui/ — the structural layer on top of the FX skin, generic
        primitives with zero domain imports. New UI composes these; it never
        hand-rolls the recipes.
      </p>

      <Zone title="Primitives">
        {renderPills()}
        {renderInstanceBadge()}
        {renderFormKit()}
        {renderContentBlocks()}
        {renderEmptyState()}
        {renderTabBar()}
      </Zone>

      <Zone
        title="Overlays"
        description="ui/overlay/ — the one dialog stack. Every sheet, modal and popover routes through OverlayShell."
      >
        {renderBottomSheet()}
        {renderModalShell()}
        {renderPopover()}
        {renderSheetCloseButton()}
      </Zone>
    </div>
  );
};
