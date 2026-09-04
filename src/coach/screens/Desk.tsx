import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { acknowledgeSignal, isJointUrgent, listRecentSignals, recurrenceCount, type ClientSignal } from "../../shared/signals";
import { HeroHeader, HeroStat, SetPasswordCard, SignOutButton, ActionGroup, ActionRow } from "../../components/UI";
import { CoachTabBar } from "../components/CoachTabBar";
import type { ClientStatus } from "../types";

const STATUS_COLOR: Record<ClientStatus, string> = {
  "on-track": "var(--color-accent)",
  behind: "var(--color-accent-700)",
  "at-risk": "var(--color-neutral-500)",
  paused: "var(--color-neutral-800)",
  unassigned: "var(--color-neutral-900)",
};
const STATUS_LABEL: Record<ClientStatus, string> = {
  "on-track": "on track",
  behind: "behind",
  "at-risk": "at risk",
  paused: "paused",
  unassigned: "unassigned",
};
const STATUS_ORDER: ClientStatus[] = ["on-track", "behind", "at-risk", "paused"];

/** A small, stable (not re-randomized every render) height variance per client so the roster bar reads as
 * a real skyline rather than a flat block of color -- purely visual texture, not tied to any real metric. */
function barHeightPct(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100;
  return 55 + (h % 46);
}

export default function Desk() {
  const { state, dispatch } = useCoachStore();
  const { account, enterClientPreview } = useAuth();
  const coachName = account?.display_name ?? "Coach";
  const nav = useNavigate();
  const [showAccount, setShowAccount] = useState(false);
  const [allSignals, setAllSignals] = useState<ClientSignal[]>([]);

  // Real client-reported feedback (pump, joint pain, unhealed soreness), as opposed to the demo flags
  // below it. Loaded straight from the database rather than coach_state, since a client writes these
  // into their own row of client_signals and the coach only reads them.
  useEffect(() => {
    let active = true;
    listRecentSignals().then((rows) => active && setAllSignals(rows));
    return () => {
      active = false;
    };
  }, []);

  // Kept out of the open list once actioned, but still in allSignals so it keeps counting toward whether
  // the same complaint is recurring.
  const signals = useMemo(() => allSignals.filter((s) => !s.acknowledged_at), [allSignals]);

  async function clearSignal(id: string) {
    const ok = await acknowledgeSignal(id);
    if (ok) setAllSignals((prev) => prev.map((s) => (s.id === id ? { ...s, acknowledged_at: new Date().toISOString() } : s)));
  }

  function signalClientName(s: ClientSignal): string {
    return state.clients.find((c) => c.accountId === s.client_id)?.name ?? "A client";
  }

  function signalText(s: ClientSignal): string {
    if (s.kind === "joint") return `Joint pain${s.note ? ` — ${s.note}` : ""}`;
    if (s.kind === "soreness") return `${s.muscle} still sore${s.note ? ` — ${s.note.toLowerCase()}` : ""}`;
    return `${s.muscle} pump was low`;
  }

  const allFlags = useMemo(() => state.clients.flatMap((c) => c.flags.map((f) => ({ client: c, flag: f }))), [state.clients]);
  const counts = {
    volume: allFlags.filter((f) => f.flag.type === "volume-proposal").length,
    joint: allFlags.filter((f) => f.flag.type === "joint").length,
    weighin: allFlags.filter((f) => f.flag.type === "weigh-in-missed").length,
  };
  const decideNow = allFlags.slice(0, 3);
  const assigned = state.clients.filter((c) => c.status !== "unassigned");
  const rosterSegments: { status: ClientStatus; count: number }[] = STATUS_ORDER
    .map((status) => ({ status, count: assigned.filter((c) => c.status === status).length }))
    .filter((s) => s.count > 0);
  const rosterBars = [...assigned].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  function applyProposal(clientId: string, flagId: string, tagLabel: string) {
    dispatch({ type: "APPLY_FLAG", clientId, flagId });
    dispatch({ type: "SHOW_TOAST", message: `Applied ${tagLabel} — next week's numbers updated.` });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  }

  function remindWeighIn(clientId: string, clientName: string) {
    dispatch({ type: "SEND_MESSAGE", threadId: clientId, text: `Hey ${clientName.split(" ")[0]}, quick reminder to log your weigh-in when you get a chance 👍` });
    dispatch({ type: "SHOW_TOAST", message: `Reminder sent to ${clientName}.` });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  }

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="screen">
      <HeroHeader
        kicker={dateLabel}
        title={`${greeting}, ${coachName}`}
        right={
          <button
            className="avatar"
            style={{ width: 38, height: 38, boxShadow: "0 0 0 1px var(--color-accent-700)", border: "none", cursor: "pointer" }}
            aria-label="Account"
            onClick={() => setShowAccount(true)}
          >
            {coachName.slice(0, 2).toUpperCase()}
          </button>
        }
      >
        <HeroStat value={allFlags.length + signals.length} label={<>decisions<br />waiting</>}>
          <div className="row" style={{ fontSize: 12 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Volume proposals</span>
            <span style={{ fontFamily: "var(--font-heading)", color: "var(--color-accent-300)" }}>{counts.volume}</span>
          </div>
          <div className="row" style={{ fontSize: 12 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Joint flags</span>
            <span style={{ fontFamily: "var(--font-heading)", color: "var(--color-neutral-200)" }}>{counts.joint}</span>
          </div>
          <div className="row" style={{ fontSize: 12 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Missed weigh-ins</span>
            <span style={{ fontFamily: "var(--font-heading)", color: "var(--color-neutral-200)" }}>{counts.weighin}</span>
          </div>
        </HeroStat>
      </HeroHeader>

      <div className="screen-scroll">
        <div>
          <div className="sh">Roster this week · {assigned.length} clients</div>
          <div className="cell" style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 2, height: 32, alignItems: "flex-end" }}>
              {rosterBars.map((c) => (
                <div
                  key={c.id}
                  style={{ flex: 1, minWidth: 2, height: `${barHeightPct(c.id)}%`, borderRadius: 2, background: STATUS_COLOR[c.status] }}
                  title={`${c.name} · ${STATUS_LABEL[c.status]}`}
                />
              ))}
            </div>
            <div className="row" style={{ marginTop: 10, gap: 14, fontSize: 11, color: "var(--color-neutral-400)", flexWrap: "wrap" }}>
              {rosterSegments.map((s) => (
                <span key={s.status} className="row" style={{ gap: 5, width: "auto" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLOR[s.status], flex: "none" }} />
                  {s.count} {STATUS_LABEL[s.status]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {signals.length > 0 && (
          <div>
            <div className="sh">From your clients · {signals.length}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {signals.map((s) => {
                const urgent = s.kind === "joint" && isJointUrgent(s.severity);
                const times = recurrenceCount(allSignals, s);
                return (
                  <div key={s.id} className="cell elev-sm" style={urgent ? { borderLeft: "2px solid var(--color-accent)" } : undefined}>
                    <div className="row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="name">{signalClientName(s)}</div>
                        <div className="mu" style={{ marginTop: 1 }}>
                          {signalText(s)}
                          {s.day_label ? ` · ${s.day_label}` : ""}
                        </div>
                      </div>
                      <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span className={`tag ${urgent ? "tag-accent" : "tag-neutral"}`}>
                          {s.kind === "joint" ? "Joint" : s.kind === "soreness" ? "Soreness" : "Pump"}
                        </span>
                        {times > 1 && (
                          <span className="tag tag-accent" title={`Reported ${times} times in the last 90 days`}>
                            {times}× recurring
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-block" style={{ height: 34, fontSize: 12.5, marginTop: 9 }} onClick={() => clearSignal(s.id)}>
                      Mark as read
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="sh" style={{ flex: 1, margin: 0 }}>Decide now</div>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--color-accent)" }} onClick={() => nav("/coach/clients")}>
              Review all {allFlags.length}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {decideNow.map(({ client, flag: f }, i) => (
              <div key={f.id} className="cell elev-sm" style={i === 0 ? { borderLeft: "2px solid var(--color-accent)" } : undefined}>
                <button className="row" style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "inherit", textAlign: "left", padding: 0 }} onClick={() => nav(`/coach/clients/${client.id}`)}>
                  <div className="avatar">{client.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name">{client.name}</div>
                    <div className="mu trunc" style={{ marginTop: 1 }}>{f.note}</div>
                  </div>
                  {f.tagLabel && <span className={`tag ${f.type === "volume-proposal" ? "tag-accent" : "tag-neutral"}`}>{f.tagLabel}</span>}
                </button>
                {f.type === "volume-proposal" && (
                  <div className="row" style={{ gap: 8, marginTop: 10 }}>
                    <button className="btn btn-solid" style={{ flex: 1, height: 36, fontSize: 12.5 }} onClick={() => applyProposal(client.id, f.id, f.tagLabel)}>
                      Apply
                    </button>
                    <button className="btn btn-secondary" style={{ flex: "none", height: 36, fontSize: 12.5 }} onClick={() => nav(`/coach/clients/${client.id}`)}>
                      Open
                    </button>
                  </div>
                )}
                {f.type === "weigh-in-missed" && (
                  <div className="row" style={{ gap: 8, marginTop: 10 }}>
                    <button className="btn btn-solid" style={{ flex: 1, height: 36, fontSize: 12.5 }} onClick={() => remindWeighIn(client.id, client.name)}>
                      Remind
                    </button>
                    <button className="btn btn-secondary" style={{ flex: "none", height: 36, fontSize: 12.5 }} onClick={() => nav(`/coach/clients/${client.id}`)}>
                      Open
                    </button>
                  </div>
                )}
                {f.type === "joint" && (
                  <div className="row" style={{ gap: 8, marginTop: 10 }}>
                    <button className="btn btn-solid" style={{ flex: 1, height: 36, fontSize: 12.5 }} onClick={() => nav(`/coach/clients/${client.id}/log`)}>
                      Swap exercise
                    </button>
                    <button className="btn btn-secondary" style={{ flex: "none", height: 36, fontSize: 12.5 }} onClick={() => nav(`/coach/clients/${client.id}`)}>
                      Open
                    </button>
                  </div>
                )}
              </div>
            ))}
            {decideNow.length === 0 && <div className="mu">Nothing needs you right now.</div>}
          </div>
        </div>

        <div>
          <div className="sh">Quick actions</div>
          <button className="cell row" style={{ gap: 10, padding: 14, textAlign: "left", cursor: "pointer" }} onClick={() => nav("/coach/clients")}>
            <div style={{ width: 34, height: 34, flex: "none", borderRadius: 10, background: "var(--color-accent-900)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ph-fill ph-user-plus" style={{ fontSize: 17, color: "var(--color-accent)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontFamily: "var(--font-heading)", fontWeight: 700 }}>Assign a client</div>
              <div className="mu">{state.clients.filter((c) => c.status === "unassigned").length} waiting</div>
            </div>
          </button>
        </div>
      </div>

      <CoachTabBar />

      {showAccount && (
        <div className="sheet-backdrop" onClick={() => setShowAccount(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div className="scr">Signed in as</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{coachName}</div>
              </div>
              <button onClick={() => setShowAccount(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                <i className="ph ph-x" style={{ fontSize: 18 }} />
              </button>
            </div>
            <ActionGroup>
              <ActionRow
                icon="ph-barbell"
                iconBg="var(--color-accent-900)"
                iconColor="var(--color-accent)"
                label="Train as myself"
                subtitle="Build your own program, log real workouts, see real progress"
                onClick={() => {
                  enterClientPreview();
                  setShowAccount(false);
                  nav("/block");
                }}
              />
              {account?.is_platform_admin && (
                <ActionRow
                  icon="ph-shield-check"
                  label="Platform admin"
                  subtitle="Revoke or restore any coach's access"
                  onClick={() => {
                    setShowAccount(false);
                    nav("/coach/admin");
                  }}
                />
              )}
            </ActionGroup>
            <SetPasswordCard />
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
