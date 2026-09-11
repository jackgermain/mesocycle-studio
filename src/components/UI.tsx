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
    <div
      className="screen"
      style={{
        // Was #1f2f28 into #161826 -- the old navy palette, which is why this screen and the splash never
        // matched the app behind them. Now the real page colour, lit from above so the mark has a halo,
        // with a much fainter glow off the floor: without it the lower half is a dead black rectangle.
        background:
          "radial-gradient(78% 42% at 50% -4%, rgba(76, 224, 143, 0.22), rgba(11, 12, 17, 0) 66%)," +
          "radial-gradient(130% 60% at 50% 106%, rgba(76, 224, 143, 0.07), rgba(11, 12, 17, 0) 62%)," +
          "var(--color-bg)",
      }}
    >
      <div className="screen-scroll" style={{ gap: 0, padding: "24px 24px calc(24px + env(safe-area-inset-bottom))" }}>
        {/* Capped at a sign-in card's width and centred both ways. A phone is narrower than the cap, so nothing
            changes there; on a computer the form used to stretch across the whole window -- a Sign in button
            1400px wide -- because this scroller sets its own padding and so opts out of the page column. */}
        <div style={{ margin: "auto", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Logomark size={120} />
          {/* Bigger and tighter than before. Uppercase at negative tracking reads as a brand rather than
              as a heading, which is what this screen is doing. */}
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 40, fontWeight: 800, letterSpacing: "-0.015em", lineHeight: 1, marginTop: 22, textTransform: "uppercase" }}>Jacked</div>
          <div style={{ width: 48, height: 2, borderRadius: 2, background: "var(--color-accent)", marginTop: 18, opacity: 0.9 }} />
          <div className="mu" style={{ marginTop: 10, fontSize: 12.5, letterSpacing: "0.02em" }}>Coach-programmed training, in your pocket.</div>

          <div style={{ width: "100%", marginTop: 34, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
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

/** One line of the panel. `display` overrides what gets printed on the right when the figure isn't a
 * plain count — a coach's name, "8 weeks". */
export interface HeroRow {
  label: React.ReactNode;
  value?: number;
  display?: React.ReactNode;
  /** How urgent this row is, and they are ranked: danger (red) is a body part complaining, warn (orange)
   * is something a coach has to chase, caution (yellow) is a client's own admin slipping. Reserve them —
   * if every row is coloured, none of them is. */
  tone?: "danger" | "warn" | "caution";
}

/** The headline panel at the top of every screen.
 *
 * A mesh gradient under frosted glass: three blurred pools of green and cyan bled past the panel's bounds
 * and clipped back, with the rows floating above them on smoked glass. The figure is cut out of a
 * gradient rather than filled, so it belongs to the light rather than sitting on it.
 *
 * `quiet` drops the light instead of switching it off. That state — a roster in good shape, nothing
 * waiting — is what a coach sees most days, and the version of this panel that just printed a big 0 beside
 * four more zeros read as data that had failed to load rather than as good news. */
/** Where the ring's arc tops out. Past ten waiting, the ring is simply full and the figure carries the
 * rest -- a gauge with no ceiling is just a number drawn in a circle. */
const RING_FULL_AT = 10;

/** A zero row is never coloured whatever its tone -- nothing is wrong, so nothing should read as wrong. */
const HERO_TONE: Record<string, string> = {
  danger: "var(--color-danger)",
  warn: "var(--color-warning)",
  caution: "var(--color-caution)",
  none: "var(--color-neutral-200)",
};

/** The dial stays the accent whatever the rows say.
 *
 * It briefly took the colour of the worst row, on the reasoning that the ring should answer "how bad" and
 * the list "what". It looked wrong: a red or yellow ring is the largest, brightest thing on the screen and
 * the whole panel turns into an alarm, which is not what a roster with two joint flags on it deserves.
 * The rows carry the severity; the ring carries the count. */
const RING_COLOR = "var(--color-accent)";

/** The dial. Drawn rather than charted: one arc, the figure inside it, and no axis or scale, because
 * "how much is waiting" has no units worth labelling.
 *
 * At zero the ring closes into a complete circle in a muted tone instead of showing an empty track. A
 * finished circle reads as done; an empty one reads as broken, and that is the state a coach with a
 * healthy roster sees most days. */
function HeroRing({ value, quiet, color }: { value: number; quiet?: boolean; color: string }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  const frac = quiet ? 1 : Math.min(1, Math.max(0.06, value / RING_FULL_AT));
  return (
    <div style={{ position: "relative", width: 84, height: 84, flex: "none" }}>
      <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <defs>
          {/* One hue, lit across the arc. A gradient between two different alert colours would read as
              a scale from one problem to another, which is not what it means. */}
          <linearGradient id="hero-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.55" />
            <stop offset="55%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx="42" cy="42" r={R} fill="none"
          stroke={quiet ? "var(--color-neutral-800)" : "url(#hero-ring)"}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          style={{ transition: "stroke-dashoffset 500ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: quiet ? "var(--color-neutral-500)" : color }}>{value}</span>
        <span className="scr" style={{ fontSize: 8.5, marginTop: 3 }}>{quiet ? "all clear" : "waiting"}</span>
      </div>
    </div>
  );
}

export function HeroStat({
  value,
  label,
  quiet,
  rows,
  ring,
  children,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  /** True when there is nothing to report. */
  quiet?: boolean;
  rows?: HeroRow[];
  /** Draw the figure as a dial with the rows beside it, instead of above them. Roughly half the height,
   * which is why the Desk uses it — that screen's panel is the tallest and sits in a fixed header. */
  ring?: boolean;
  children?: React.ReactNode;
}) {
  if (ring && typeof value === "number") {
    return (
      <div className={`hero-box${quiet ? " is-quiet" : ""}`}>
        <div className="hero-inner row" style={{ gap: 16, alignItems: "center" }}>
          <HeroRing value={value} quiet={quiet} color={RING_COLOR} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
            {rows?.map((r, i) => (
              <div key={i} className="row" style={{ fontSize: 12.5 }}>
                <span style={{ flex: 1, minWidth: 0, color: "var(--color-neutral-400)" }}>{r.label}</span>
                <span
                  className={r.value === undefined ? undefined : "num"}
                  style={{
                    fontWeight: r.value === undefined ? 500 : 700,
                    color: r.value ? HERO_TONE[r.tone ?? "none"] : "var(--color-neutral-200)",
                  }}
                >
                  {r.display ?? r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`hero-box${quiet ? " is-quiet" : ""}`}>
      <div className="hero-inner">
        <div className="row" style={{ alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: rows?.length || children ? 16 : 0 }}>
          <span className="hero-value">{value}</span>
          <span className="scr" style={{ textAlign: "right", lineHeight: 1.3 }}>{label}</span>
        </div>

        {rows && rows.length > 0 && (
          <div className="hero-rows">
            {rows.map((r, i) => (
              <div key={i} className="row" style={{ fontSize: 12.5 }}>
                <span style={{ flex: 1, minWidth: 0, color: "var(--color-neutral-400)" }}>{r.label}</span>
                <span
                  className={r.value === undefined ? undefined : "num"}
                  style={{
                    fontWeight: r.value === undefined ? 500 : 700,
                    fontFamily: r.value === undefined ? "var(--font-heading)" : undefined,
                    color: r.value ? HERO_TONE[r.tone ?? "none"] : "var(--color-neutral-200)",
                  }}
                >
                  {r.display ?? r.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {children}
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
