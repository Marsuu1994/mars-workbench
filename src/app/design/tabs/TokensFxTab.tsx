'use client';

import {Section, Variant, Row} from '../GalleryParts';
import {
  TOKEN_SWATCHES,
  LED_STATES,
  CHIP_SPECIMENS,
  LOADING_LABEL,
} from '../constants';

/**
 * The visual foundation — OKLCH palette and the fx-* skin utilities every
 * ui/ component composes.
 */
export const TokensFxTab = () => {
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

  const renderP5Utilities = () => (
    <Section
      title="P5 utilities (p5-dark only)"
      description="Calling Card opt-in utilities — inert in the mars themes (cycle the theme bottom-right to see them): display voice, ransom tiles, slash rule, oblique cuts, star-burst."
    >
      <div className="flex flex-col gap-6">
        <Variant label="fx-display + fx-tile / fx-tile-red">
          <div className="fx-display text-2xl">
            Take your <span className="fx-tile fx-tile-red">time</span>
          </div>
        </Variant>
        <Variant label="fx-slash">
          <div>
            <span className="fx-display text-lg">Heist plan</span>
            <span className="fx-slash" />
          </div>
        </Variant>
        <Variant label="fx-cut / fx-cut-sm / fx-cut-lg (pair shadows via parent drop-shadow)">
          <Row>
            <div className="fx-cut bg-neutral px-6 py-4 text-xs">fx-cut</div>
            <div className="fx-cut-sm bg-neutral px-6 py-4 text-xs">
              fx-cut-sm
            </div>
            <div className="fx-cut-lg bg-neutral px-6 py-4 text-xs">
              fx-cut-lg
            </div>
          </Row>
        </Variant>
        <Variant label="fx-burst (max one per view)">
          <div className="fx-burst size-20" />
        </Variant>
      </div>
    </Section>
  );

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-base-content/50">
        The visual foundation — OKLCH palette and the fx-* skin utilities every
        ui/ component composes.
      </p>
      {renderPalette()}
      {renderHudPrimitives()}
      {renderP5Utilities()}
    </div>
  );
};
