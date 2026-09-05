import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export function BackHeader({ kicker, title, right, onBack }: { kicker: string; title: string; right?: React.ReactNode; onBack?: () => void }) {
  const nav = useNavigate();
  return (
    <div className="hdr">
      <button className="back" onClick={onBack ?? (() => nav(-1))} aria-label="Back">
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
        <i className="ph ph-x" style={{ fontSize: 16 }} />
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

/** A number with +/- buttons that can also just be typed into. The +/- alone is fine on a phone but
 * miserable for going from 135 to 315, and worse with a keyboard on the web build. Keeps its own draft
 * text while focused so a half-typed "" or "3" isn't immediately fought back to the last committed
 * number; commits on blur or Enter, and falls back to the last good value if what's typed isn't a number.
 * `width` is worth setting where the value can get long (loads) or is always short (days per week). */
export function Stepper({
  value,
  onChange,
  step = 1,
  unitLabel,
  min = 0,
  max,
  width = 46,
  fontSize = 15,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  unitLabel?: string;
  min?: number;
  max?: number;
  width?: number;
  fontSize?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(String(value));
  }, [value]);

  function clamp(n: number) {
    return Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, n));
  }
  // Takes the raw string off the event target rather than reading the `text` state, so a commit can never
  // run against a stale closure if the blur lands in the same tick as the last keystroke.
  function commit(raw: string) {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onChange(+clamp(n).toFixed(2));
    else setText(String(value));
  }

  return (
    <div className="row" style={{ gap: 4, justifyContent: "center" }}>
      <button
        onClick={() => onChange(+clamp(value - step).toFixed(2))}
        aria-label="decrease"
        style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex", padding: 4, flex: "none" }}
      >
        <i className="ph ph-minus" style={{ fontSize: 12 }} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          }
        }}
        style={{
          width,
          flex: "none",
          textAlign: "center",
          background: "none",
          border: "none",
          outline: "none",
          fontFamily: "var(--font-heading)",
          fontSize,
          color: "inherit",
          padding: 0,
        }}
      />
      {unitLabel ? <span style={{ fontSize: 11, color: "var(--color-neutral-500)", marginLeft: -2 }}>{unitLabel}</span> : null}
      <button
        onClick={() => onChange(+clamp(value + step).toFixed(2))}
        aria-label="increase"
        style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex", padding: 4, flex: "none" }}
      >
        <i className="ph ph-plus" style={{ fontSize: 12 }} />
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
      <i className={`ph ${icon}`} style={{ fontSize: 14, color: iconColor, flex: "none", marginTop: 1 }} />
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color }}>{children}</div>
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
          <Logomark size={120} />
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 32, fontWeight: 800, letterSpacing: "0.01em", lineHeight: 1, marginTop: 20, textTransform: "uppercase" }}>Jacked</div>
          <div className="mu" style={{ marginTop: 14, fontSize: 12.5 }}>Coach-programmed training, in your pocket.</div>

          <div style={{ width: "100%", marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Anyone whose account predates password auth (created via the old magic-link flow) has no password on
 * file at all — this lets them set one while their session is still valid, since without it they'd have
 * no way back in once that session ends. */
export function SetPasswordCard() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setDone(true);
      setPassword("");
    }
  }

  return (
    <div className="cell">
      <div className="row" style={{ marginBottom: 8 }}>
        <i className="ph ph-lock-key" style={{ fontSize: 14, color: "var(--color-accent-300)", marginRight: 6 }} />
        <span style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Set a password</span>
      </div>
      <div className="mu" style={{ marginBottom: 9, lineHeight: 1.5 }}>
        Set a password so you can sign back in directly next time, without needing an email link.
      </div>
      {done ? (
        <InfoBanner icon="ph-check-circle" tone="accent">Password set — use it to sign in next time.</InfoBanner>
      ) : (
        <>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" style={{ height: 40, fontSize: 12.5 }} />
          {error && <div className="mu" style={{ marginTop: 6 }}>{error}</div>}
          <button className="btn btn-solid btn-block" style={{ height: 48, marginTop: 8, fontSize: 12.5, opacity: password.length >= 6 && !busy ? 1 : 0.5 }} disabled={password.length < 6 || busy} onClick={save}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </>
      )}
    </div>
  );
}

export function SignOutButton() {
  const { signOut } = useAuth();
  const nav = useNavigate();
  async function handle() {
    await signOut();
    nav("/", { replace: true });
  }
  return (
    <button className="btn btn-secondary btn-block" style={{ height: 44, marginTop: 4 }} onClick={handle}>
      <i className="ph ph-sign-out" style={{ fontSize: 14 }} />
      Sign out
    </button>
  );
}

/** One row in a grouped, settings-style action list — an icon chip, a label (+ optional subtitle), and a
 * chevron. Several of these inside an ActionGroup read as one structured block instead of a stack of
 * separately-floating full-width buttons. */
export function ActionRow({
  icon,
  iconColor = "var(--color-neutral-300)",
  iconBg = "var(--color-neutral-900)",
  label,
  subtitle,
  tone,
  disabled,
  onClick,
}: {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  label: React.ReactNode;
  subtitle?: React.ReactNode;
  tone?: "danger" | "accent";
  disabled?: boolean;
  onClick: () => void;
}) {
  const labelColor = tone === "danger" ? "var(--color-neutral-300)" : tone === "accent" ? "var(--color-accent-200)" : undefined;
  return (
    <button className="action-row" disabled={disabled} onClick={onClick} style={{ opacity: disabled ? 0.55 : 1 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <i className={`ph-fill ${icon}`} style={{ fontSize: 16, color: iconColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="trunc" style={{ fontSize: 12.5, fontFamily: "var(--font-heading)", fontWeight: 500, color: labelColor }}>{label}</div>
        {subtitle && <div className="mu trunc" style={{ marginTop: 1 }}>{subtitle}</div>}
      </div>
      <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)", flex: "none" }} />
    </button>
  );
}

export function ActionGroup({ children }: { children: React.ReactNode }) {
  return <div className="cell" style={{ display: "flex", flexDirection: "column" }}>{children}</div>;
}

/** The gradient "hero" header used at the top of every main tab — a kicker line, a big bold title, an
 * optional right-side slot (avatar, action button), and room for a HeroStat box below. */
export function HeroHeader({ kicker, title, right, children }: { kicker?: string; title: string; right?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="hdr hero">
      <div className="row" style={{ width: "100%", marginBottom: children ? 14 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {kicker && <div className="k">{kicker}</div>}
          <div className="trunc" style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 21, lineHeight: 1.1, marginTop: kicker ? 3 : 0, letterSpacing: "-0.01em" }}>
            {title}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/** A boxed, oversized stat used inside a HeroHeader — one big number carries far more weight than a tiny
 * uppercase kicker, with room for a secondary breakdown list (Desk's volume/joint/weigh-in counts,
 * Messages' thread count) alongside it. */
export function HeroStat({ value, label, valueColor = "var(--color-accent)", children }: { value: React.ReactNode; label: React.ReactNode; valueColor?: string; children?: React.ReactNode }) {
  return (
    <div className="hero-box">
      <div className="row" style={{ gap: 0, alignItems: "stretch", width: "100%" }}>
        <div style={{ flex: children ? "none" : 1, paddingRight: children ? 14 : 0, borderRight: children ? "1px solid var(--color-neutral-800)" : undefined }}>
          <div className="num" style={{ fontSize: 32, lineHeight: 1, color: valueColor }}>{value}</div>
          <div className="scr" style={{ marginTop: 5, lineHeight: 1.3 }}>{label}</div>
        </div>
        {children && <div style={{ flex: 1, paddingLeft: 14, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7, minWidth: 0 }}>{children}</div>}
      </div>
    </div>
  );
}

export function StatCell({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="scr">{label}</div>
      <div className="num" style={{ fontWeight: 700, fontSize: 16, marginTop: 2, color: valueColor }}>{value}</div>
    </div>
  );
}
