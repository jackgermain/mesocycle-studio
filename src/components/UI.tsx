import React from "react";
import { useNavigate } from "react-router-dom";

export function BackHeader({ kicker, title, right }: { kicker: string; title: string; right?: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="hdr">
      <button className="back" onClick={() => nav(-1)} aria-label="Back">
        <i className="ph ph-caret-left" />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="k">{kicker}</div>
        <div className="h1 trunc">{title}</div>
      </div>
      {right}
    </div>
  );
}

export function CloseHeader({ kicker, title, right, onClose }: { kicker: string; title: string; right?: React.ReactNode; onClose?: () => void }) {
  const nav = useNavigate();
  return (
    <div className="hdr">
      <button className="back" style={{ color: "var(--color-neutral-400)" }} onClick={() => (onClose ? onClose() : nav(-1))} aria-label="Close">
        <i className="ph ph-x" style={{ fontSize: 19 }} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="k">{kicker}</div>
        <div className="h1 trunc">{title}</div>
      </div>
      {right}
    </div>
  );
}

export function Meter({ pct, color = "var(--color-accent)", large }: { pct: number; color?: string; large?: boolean }) {
  return (
    <div className={`meter${large ? " lg" : ""}`}>
      <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={`seg-opt${o.value === value ? " on" : ""}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, unitLabel, min = 0 }: { value: number; onChange: (v: number) => void; step?: number; unitLabel?: string; min?: number }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} aria-label="decrease">
        <i className="ph ph-minus" style={{ fontSize: 13 }} />
      </button>
      <span className="val">
        {value}
        {unitLabel ? <span style={{ fontSize: 10, color: "var(--color-neutral-500)", marginLeft: 2 }}>{unitLabel}</span> : null}
      </span>
      <button onClick={() => onChange(+(value + step).toFixed(2))} aria-label="increase">
        <i className="ph ph-plus" style={{ fontSize: 13 }} />
      </button>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="toast">
      <div className="row" style={{ gap: 8 }}>
        <i className="ph-fill ph-check-circle" style={{ color: "var(--color-accent)", fontSize: 16 }} />
        <span>{message}</span>
      </div>
    </div>
  );
}

export function InfoBanner({ icon, tone = "neutral", children }: { icon: string; tone?: "neutral" | "accent"; children: React.ReactNode }) {
  const bg = tone === "accent" ? "var(--color-accent-900)" : "var(--color-neutral-900)";
  const color = tone === "accent" ? "var(--color-accent-200)" : "var(--color-neutral-400)";
  const iconColor = tone === "accent" ? "var(--color-accent)" : "var(--color-neutral-400)";
  return (
    <div className="row" style={{ gap: 8, padding: "10px 11px", borderRadius: 8, background: bg, alignItems: "flex-start" }}>
      <i className={`ph ${icon}`} style={{ fontSize: 15, color: iconColor, flex: "none", marginTop: 1 }} />
      <div style={{ fontSize: 12, lineHeight: 1.5, color }}>{children}</div>
    </div>
  );
}

export function StatCell({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="scr">{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, marginTop: 2, color: valueColor }}>{value}</div>
    </div>
  );
}
