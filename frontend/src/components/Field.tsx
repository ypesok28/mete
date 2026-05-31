"use client";

// Reusable input atoms — light operations-console pass. Every editable control carries its FULL
// name (no abbreviations), its UNIT, and a plain-language "what is this?" help tooltip, plus a
// provenance source-tag. The number control is string-buffered so it is genuinely editable (the
// old leading-0 could not be replaced), selects-all on focus, and has −/+ steppers.

import { useEffect, useRef, useState } from "react";
import { Info, Minus, Plus } from "lucide-react";
import { sourceTag } from "@/lib/data";
import { FIELD_META, type FieldMeta } from "@/lib/fieldMeta";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Apply a one-shot CSS flash class whenever `value` changes after mount.
function useChangeFlash<T>(value: T): boolean {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prev.current = value;
      return;
    }
    if (prev.current === value) return;
    prev.current = value;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 460);
    return () => clearTimeout(t);
  }, [value]);
  return flash;
}

// A genuinely-editable number buffer. Holds the raw string so the user can clear it, replace the
// leading 0, or type freely; commits a parsed number upward; normalizes on blur. Fixes the old
// "the 0 can't be edited" bug (which came from binding the input straight to the numeric value).
function useNumberInput(value: number, onChange: (n: number) => void, min?: number) {
  const [text, setText] = useState<string>(() => String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(Number.isFinite(value) ? String(value) : "");
  }, [value]);

  const clamp = (n: number) => (min != null ? Math.max(min, n) : n);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    if (raw === "" || raw === "-" || raw === ".") return; // allow transient states
    const n = Number(raw);
    if (Number.isFinite(n)) onChange(clamp(n));
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    focused.current = true;
    e.target.select();
  };
  const onBlur = () => {
    focused.current = false;
    const n = Number(text);
    if (text === "" || !Number.isFinite(n)) {
      const fallback = clamp(Number.isFinite(value) ? value : (min ?? 0));
      setText(String(fallback));
      onChange(fallback);
    } else {
      const c = clamp(n);
      setText(String(c));
      if (c !== value) onChange(c);
    }
  };
  return { text, onInputChange, onFocus, onBlur };
}

// The "what is this?" help affordance — a small info dot whose tooltip explains the field in
// plain language (so an operator who's never heard the term can learn it).
export function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-label="What is this?"
          className="grid size-3.5 shrink-0 cursor-default place-items-center rounded-full text-ink-faint transition-colors hover:text-gate"
        >
          <Info className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[17rem] text-pretty text-[12px] leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

// The source-tag chip — a real shadcn Tooltip reveals the citation on hover/focus. Honesty
// made visible. (Opens to the right so it never clips off the left edge of the rail.)
function SourceChip({ tag, citation }: { tag: string; citation: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default rounded-[5px] border border-line bg-base px-1.5 py-[1px] font-mono text-[8.5px] uppercase tracking-tag text-ink-mute transition-colors hover:border-gate/40 hover:bg-gate-wash hover:text-gate">
          {tag}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[18rem] text-pretty">
        {citation}
      </TooltipContent>
    </Tooltip>
  );
}

// A column header for dense matrices (the targets table): full name + unit, with the
// plain-language help on hover. Keeps the grid compact while staying unabbreviated + learnable.
export function ColumnHeader({ metaKey }: { metaKey: string }) {
  const m: FieldMeta = FIELD_META[metaKey] ?? { label: metaKey, help: "" };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          className="flex cursor-default flex-col items-center leading-none"
        >
          <span className="text-[9.5px] font-semibold text-ink-mute">{m.label}</span>
          {m.unit ? (
            <span className="mono mt-0.5 text-[8px] lowercase tracking-tag text-ink-faint">
              {m.unit}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[16rem] text-pretty text-[12px] leading-relaxed">
        {m.help}
      </TooltipContent>
    </Tooltip>
  );
}

// The stepper-wrapped number input shared by NumberField (and reusable elsewhere).
function StepperInput({
  value,
  onChange,
  step = 1,
  min,
  unit,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  unit?: string;
  ariaLabel?: string;
}) {
  const flash = useChangeFlash(value);
  const { text, onInputChange, onFocus, onBlur } = useNumberInput(value, onChange, min);
  const clamp = (n: number) => (min != null ? Math.max(min, n) : n);
  const bump = (dir: 1 | -1) => onChange(clamp((Number.isFinite(value) ? value : 0) + dir * step));

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div
        className={`flex items-center rounded-lg border border-line bg-base shadow-[inset_0_1px_2px_rgba(28,26,23,0.04)] transition-all duration-150 focus-within:border-gate/70 focus-within:bg-surface focus-within:ring-2 focus-within:ring-gate/20 ${flash ? "input-flash" : ""}`}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="decrease"
          onClick={() => bump(-1)}
          className="grid h-7 w-6 cursor-pointer place-items-center rounded-l-lg text-ink-mute transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <Minus className="size-3" />
        </button>
        <input
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          className="mono w-[3rem] bg-transparent text-center text-[12.5px] text-ink outline-none"
          value={text}
          onChange={onInputChange}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="increase"
          onClick={() => bump(1)}
          className="grid h-7 w-6 cursor-pointer place-items-center rounded-r-lg text-ink-mute transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <Plus className="size-3" />
        </button>
      </div>
      {unit ? (
        <span className="mono w-9 shrink-0 text-left text-[10px] lowercase tracking-tag text-ink-faint">
          {unit}
        </span>
      ) : null}
    </div>
  );
}

interface NumberFieldProps {
  metaKey: string; // key into FIELD_META — drives full label / unit / help
  value: number;
  tagKey?: string; // raw wire field for the provenance source-tag (often differs from metaKey)
  step?: number;
  min?: number;
  onChange: (next: number) => void;
}

export function NumberField({ metaKey, value, tagKey, step = 1, min, onChange }: NumberFieldProps) {
  const meta: FieldMeta = FIELD_META[metaKey] ?? { label: metaKey, help: "" };
  const tag = tagKey ? sourceTag(tagKey) : undefined;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] leading-tight text-ink-soft">
        <span className="truncate font-medium">{meta.label}</span>
        {meta.sub ? <span className="shrink-0 text-ink-faint">· {meta.sub}</span> : null}
        {meta.help ? <HelpTip text={meta.help} /> : null}
        {tag ? <SourceChip tag={tag.tag} citation={tag.citation} /> : null}
      </span>
      <StepperInput
        value={value}
        onChange={onChange}
        step={step}
        min={min}
        unit={meta.unit}
        ariaLabel={meta.label}
      />
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

export function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="flex w-full cursor-pointer items-center justify-between rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-base">
      <span className="text-[12px] font-medium text-ink-soft">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

// A compact inline editable number cell for dense grids (the target matrix, the envelope axes).
// Same string-buffer editability + select-on-focus as the stepper input, minus the steppers.
export function CellInput({
  value,
  onChange,
  min,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  ariaLabel?: string;
}) {
  const flash = useChangeFlash(value);
  const { text, onInputChange, onFocus, onBlur } = useNumberInput(value, onChange, min);
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      className={`mono w-full rounded-lg border border-line bg-base px-1.5 py-1 text-center text-[11.5px] text-ink shadow-[inset_0_1px_2px_rgba(28,26,23,0.04)] outline-none transition-all duration-150 hover:border-gate/40 focus:border-gate/70 focus:bg-surface focus:ring-2 focus:ring-gate/20 ${flash ? "input-flash" : ""}`}
      value={text}
      onChange={onInputChange}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}
