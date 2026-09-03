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

/** Full-page, vertically centered splash layout used by every signed-out screen (sign in, invite
 * accept, coach bootstrap) — the app's logo badge and name stay constant, whatever's specific to that
 * screen goes below as children. */
/** The app's icon mark, big and boxless — a flat glowing dumbbell rather than an icon-in-a-badge, so it
 * reads with the same confidence as a dedicated brand lockup instead of "an app icon shown large." */
export function Logomark({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 1024 564" fill="none" style={{ filter: "drop-shadow(0 10px 26px rgba(76, 224, 143, 0.5))" }}>
      <defs>
        <linearGradient id="logomarkGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ef0ac" />
          <stop offset="100%" stopColor="#33c97a" />
        </linearGradient>
      </defs>
      <g fill="url(#logomarkGradient)">
        <rect x="0" y="98" width="132" height="268" rx="36" />
        <rect x="892" y="98" width="132" height="268" rx="36" />
        <rect x="158" y="170" width="72" height="124" rx="18" />
        <rect x="794" y="170" width="72" height="124" rx="18" />
        <rect x="228" y="199" width="568" height="66" rx="33" />
      </g>
    </svg>
  );
}

export function AuthHero({ children }: { children: React.ReactNode }) {
  return (
    <div className="screen" style={{ background: "radial-gradient(130% 90% at 50% -8%, #1f2f28, #161826 55%)" }}>
      <div className="screen-scroll" style={{ gap: 0, padding: "24px 24px calc(24px + env(safe-area-inset-bottom))" }}>
        <div style={{ margin: "auto 0", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ marginBottom: 20 }}>
            <Logomark size={128} />
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 40, fontWeight: 700, letterSpacing: -1, lineHeight: 1 }}>JACKED</div>
          <div className="mu" style={{ marginTop: 8, fontSize: 13 }}>Coach-programmed training, in your pocket.</div>

          <div style={{ width: "100%", marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        </div>
      </div>
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
