import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { StoreProvider, useStore } from "../../state/store";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { ActionGroup, ActionRow, InfoBanner } from "../../components/UI";
import { createInvite } from "../../shared/invites";
import { shareBaseUrl } from "../../shared/appUrl";
import type { TrainingDay } from "../../data/types";
import type { ClientFlag } from "../types";

export default function ClientDetail() {
  const { clientId = "" } = useParams();
  const { state, dispatch } = useCoachStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const found = state.clients.find((c) => c.id === clientId);

  // Kept above the "not found" return with the rest of the hooks: the roster loads asynchronously, so
  // this component renders once before the client exists and again after, and a hook below the return
  // would run only on the second of those (React error #310).
  const foundAccountId = found?.accountId;
  const [accountActive, setAccountActive] = useState<boolean | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!foundAccountId) return;
    let active = true;
    supabase
      .from("accounts")
      .select("active")
      .eq("id", foundAccountId)
      .maybeSingle()
      .then(({ data }) => active && setAccountActive((data?.active as boolean | undefined) ?? true));
    return () => {
      active = false;
    };
  }, [foundAccountId]);

  if (!found) return <div className="screen-scroll">Not found.</div>;
  const client = found;

  async function sendInvite() {
    if (!account) return;
    setSending(true);
    try {
      const invite = await createInvite(account.id, client.name, client.role ?? "client");
      dispatch({ type: "SET_CLIENT_INVITE_CODE", clientId: client.id, code: invite.code });
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (!client.inviteCode) return;
    const url = `${shareBaseUrl()}#/invite/${client.inviteCode}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const maxLoad = Math.max(...client.loadHistory, 1);

  function applyFlag(flagId: string, tagLabel: string) {
    dispatch({ type: "APPLY_FLAG", clientId: client.id, flagId });
    dispatch({ type: "SHOW_TOAST", message: `Applied ${tagLabel || "the change"} for ${client.name}.` });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  }
  function dismissFlag(flagId: string) {
    dispatch({ type: "DISMISS_FLAG", clientId: client.id, flagId });
  }
  function remindWeighIn() {
    if (!client.accountId) return;
    dispatch({ type: "SEND_MESSAGE", threadId: client.accountId, text: `Hey ${client.name.split(" ")[0]}, quick reminder to log your weigh-in when you get a chance 👍`, clientName: client.name });
    dispatch({ type: "SHOW_TOAST", message: `Reminder sent to ${client.name}.` });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  }

  function flagPrimaryLabel(f: ClientFlag) {
    if (f.type === "weigh-in-missed") return "Remind";
    if (f.type === "joint") return "Swap exercise";
    return "Apply";
  }
  function flagPrimaryAction(f: ClientFlag) {
    if (f.type === "weigh-in-missed") return remindWeighIn;
    if (f.type === "joint") return () => nav(`/coach/clients/${client.id}/log`);
    return () => applyFlag(f.id, f.tagLabel);
  }

  const accepted = !!client.accountId;

  async function toggleAccess() {
    if (!client.accountId || accountActive === null) return;
    setRevoking(true);
    const next = !accountActive;
    const { error } = await supabase.from("accounts").update({ active: next }).eq("id", client.accountId);
    setRevoking(false);
    if (!error) {
      setAccountActive(next);
      dispatch({ type: "SHOW_TOAST", message: next ? `${client.name}'s access restored.` : `${client.name}'s access revoked.` });
      setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
    }
  }

  return (
    <div className="screen">
      <div className="hdr hero" style={{ paddingBottom: 16 }}>
        <div className="row" style={{ width: "100%", marginBottom: accepted ? 14 : 0 }}>
          <button className="back" onClick={() => nav(-1)} aria-label="Back">
            <i className="ph ph-caret-left" />
          </button>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 14, boxShadow: "0 0 0 1px var(--color-accent-700)" }}>{client.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="k">{accepted ? `${client.programName} · week ${client.week} of ${client.totalWeeks}` : "Not accepted yet"}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 21, lineHeight: 1.15 }} className="trunc">{client.name}</div>
          </div>
        </div>
        {accepted && (
          <div className="row" style={{ gap: 0, alignItems: "stretch", width: "100%" }}>
            <div style={{ flex: 1, paddingRight: 12, borderRight: "1px solid var(--color-neutral-800)" }}>
              <div className="scr">Adherence</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 21, marginTop: 3, color: "var(--color-accent-300)" }}>{client.adherencePct}%</div>
            </div>
            <div style={{ flex: 1, padding: "0 12px", borderRight: "1px solid var(--color-neutral-800)" }}>
              <div className="scr">Week</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 21, marginTop: 3 }}>{client.week} / {client.totalWeeks}</div>
            </div>
            <div style={{ flex: 1, paddingLeft: 12 }}>
              <div className="scr">Flags</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 21, marginTop: 3, color: client.flags.length ? "var(--color-neutral-200)" : undefined }}>{client.flags.length}</div>
            </div>
          </div>
        )}
      </div>
      <div className="screen-scroll">
        {accepted && accountActive === false && <InfoBanner icon="ph-lock-simple">Access is revoked — {client.name.split(" ")[0]} can't sign in right now.</InfoBanner>}

        {!accepted ? (
          <>
            <InfoBanner icon="ph-user-plus">
              {client.role === "friend" ? "This friend/family invite hasn't been accepted yet." : "This client hasn't accepted their invite yet."}
            </InfoBanner>

            {!client.inviteCode && (
              <button className="btn btn-primary btn-block" style={{ height: 48, opacity: sending ? 0.6 : 1 }} disabled={sending} onClick={sendInvite}>
                <i className="ph ph-paper-plane-tilt" style={{ fontSize: 14 }} />
                {sending ? "Sending…" : `Invite ${client.name.split(" ")[0]} to the app`}
              </button>
            )}

            {client.inviteCode && (
              <div className="cell">
                <div className="row" style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Invite link</span>
                  <span className="tag tag-neutral">Pending</span>
                </div>
                <div className="mu trunc" style={{ padding: "8px 10px", background: "var(--color-neutral-900)", borderRadius: 7, fontFamily: "monospace" }}>
                  {shareBaseUrl()}#/invite/{client.inviteCode}
                </div>
                <button className="btn btn-secondary btn-block" style={{ height: 44, marginTop: 8, fontSize: 12.5 }} onClick={copyLink}>
                  {copied ? "Copied" : "Copy link to send yourself"}
                </button>
                <div className="mu" style={{ marginTop: 8, lineHeight: 1.6 }}>
                  Send this however you'd reach {client.name.split(" ")[0]} (email, text). Opening it walks them through a real sign-in — from then on
                  {client.role === "friend" ? " they can build or clone their own programs, and you can still view and edit anything they set up." : " they only see the program you build for them."}
                </div>
              </div>
            )}

            <ActionGroup>
              <ActionRow
                icon="ph-trash"
                iconBg="var(--color-neutral-900)"
                iconColor="var(--color-neutral-400)"
                tone="danger"
                label="Remove from roster"
                onClick={() => {
                  if (window.confirm(`Remove ${client.name} from your roster? This just removes them from your list — it doesn't delete anything if they've already signed up under a different entry.`)) {
                    dispatch({ type: "REMOVE_CLIENT", clientId: client.id });
                    nav("/coach/clients", { replace: true });
                  }
                }}
              />
            </ActionGroup>
          </>
        ) : (
          <>
            {client.flags.length > 0 && (
              <div>
                <div className="sh">Needs a decision</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {client.flags.map((f) => (
                    <div key={f.id} className="cell elev-sm">
                      <div className="row">
                        <span className={`tag ${f.type === "volume-proposal" ? "tag-accent" : "tag-neutral"}`}>{f.type.replace("-", " ")}</span>
                        {f.tagLabel && <span className="tag tag-outline" style={{ marginLeft: 6 }}>{f.tagLabel}</span>}
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 8 }}>{f.note}</div>
                      {f.evidence && (
                        <div style={{ marginTop: 8, padding: "9px 10px", borderRadius: 8, background: "var(--color-accent-900)", color: "var(--color-accent-200)", fontSize: 12.5, lineHeight: 1.5 }}>
                          {f.evidence}
                        </div>
                      )}
                      <div className="row" style={{ gap: 8, marginTop: 10 }}>
                        <button className="btn btn-primary" style={{ flex: 1, height: 36, fontSize: 12.5 }} onClick={flagPrimaryAction(f)}>
                          {flagPrimaryLabel(f)}
                        </button>
                        <button className="btn btn-secondary" style={{ flex: 1, height: 36, fontSize: 12.5 }} onClick={() => dismissFlag(f.id)}>
                          Keep as is
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="cell elev-sm">
              <div className="row" style={{ marginBottom: 9 }}>
                <div style={{ flex: 1, fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Load progression</div>
                <span className="mu">7 weeks</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 60 }}>
                {client.loadHistory.map((v, i) => (
                  <div key={i} style={{ flex: 1, height: `${(v / maxLoad) * 100}%`, borderRadius: "3px 3px 0 0", background: i === client.loadHistory.length - 1 ? "var(--color-accent)" : "var(--color-accent-700)" }} />
                ))}
              </div>
            </div>

            <NotLoggedSection accountId={client.accountId!} clientName={client.name} coachName={account?.display_name ?? "Coach"} />

            {client.recentSessions.length > 0 && (
              <div>
                <div className="sh">Recent sessions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {client.recentSessions.map((s, i) => (
                    <div key={i} className="cell row">
                      <span style={{ flex: 1, fontSize: 12.5 }}>{s.label}</span>
                      <span className={`tag ${s.status === "Complete" ? "tag-accent" : "tag-neutral"}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {accepted && (
          <div>
            <div className="sh">Actions</div>
            <ActionGroup>
              <ActionRow
                icon="ph-stack"
                iconBg="var(--color-accent-900)"
                iconColor="var(--color-accent)"
                label={client.status === "unassigned" ? "Assign a program" : "Change their program"}
                subtitle={client.status === "unassigned" ? "From scratch, a saved program, or a spreadsheet" : client.programName}
                onClick={() => nav(`/coach/clients/${client.id}/assign`)}
              />
              <ActionRow icon="ph-pencil-simple-line" label="Log a session in person" onClick={() => nav(`/coach/clients/${client.id}/log`)} />
              <ActionRow icon="ph-fork-knife" label="Nutrition protocol" onClick={() => nav(`/coach/clients/${client.id}/nutrition`)} />
              <ActionRow icon="ph-chat-circle" label={`Message ${client.name.split(" ")[0]}`} onClick={() => nav(`/coach/messages/${client.accountId}`)} />
              {accountActive !== null && (
                <ActionRow
                  icon={accountActive ? "ph-lock-simple" : "ph-lock-key-open"}
                  iconColor={accountActive ? "var(--color-neutral-400)" : "var(--color-accent)"}
                  tone={accountActive ? "danger" : "accent"}
                  disabled={revoking}
                  label={revoking ? "Working…" : accountActive ? `Revoke ${client.name.split(" ")[0]}'s access` : `Restore ${client.name.split(" ")[0]}'s access`}
                  onClick={toggleAccess}
                />
              )}
            </ActionGroup>
          </div>
        )}
      </div>
    </div>
  );
}

type NotLoggedItem = { exercise: string; logged: number; total: number };

/** Every accepted client has their own linked account now, so this is always computed live from their
 * real client_state. */
function NotLoggedSection({ accountId, clientName, coachName }: { accountId: string; clientName: string; coachName: string }) {
  return (
    <StoreProvider accountId={accountId} ownerName={clientName} coachName={coachName}>
      <LiveWeightTrend />
      <LiveNotLoggedList clientName={clientName} />
    </StoreProvider>
  );
}

/** Real week-over-week bodyweight rate, computed from the client's own logged weigh-ins -- same formula as
 * the "Trend weight" card on the client's own Progress > Body tab, so the number the coach sees here always
 * matches what the client sees themselves. */
function LiveWeightTrend() {
  const { state } = useStore();
  const p = state.profile;
  const history = state.weighIns.slice(-14);
  if (history.length === 0) return null;

  const latest = history[history.length - 1].weight;
  const first = history[0].weight;
  const totalChange = Math.round((latest - first) * 10) / 10;
  const weeks = Math.max(1, history.length / (p.weighInsPerWeek || 3));
  const ratePerWeek = Math.round((totalChange / weeks) * 10) / 10;

  return (
    <div className="cell elev-sm">
      <div className="row" style={{ alignItems: "baseline" }}>
        <div style={{ flex: 1 }}>
          <div className="scr">Trend weight</div>
          <div className="num" style={{ fontWeight: 700, fontSize: 21, lineHeight: 1.1, marginTop: 3 }}>
            {latest.toFixed(1)} <span style={{ fontSize: 12.5, color: "var(--color-neutral-500)" }}>{p.units}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12.5, color: ratePerWeek <= 0 ? "var(--color-accent-300)" : "var(--color-neutral-300)" }}>
            {ratePerWeek > 0 ? "+" : ""}
            {ratePerWeek} {p.units}/wk
          </div>
          <div className="mu" style={{ marginTop: 2 }}>
            {totalChange > 0 ? "+" : ""}
            {totalChange} total · {history.length} weigh-ins
          </div>
        </div>
      </div>
    </div>
  );
}

function computeNotLogged(day: TrainingDay): NotLoggedItem[] {
  const exIds = day.order.length ? day.order : Object.keys(day.exercises);
  const out: NotLoggedItem[] = [];
  for (const id of exIds) {
    const ex = day.exercises[id];
    if (!ex) continue;
    const active = ex.sets.filter((s) => !s.removed);
    const logged = active.filter((s) => s.checked).length;
    if (logged < active.length) out.push({ exercise: ex.name, logged, total: active.length });
  }
  return out;
}

function LiveNotLoggedList({ clientName }: { clientName: string }) {
  const { state } = useStore();
  const today = state.program.weeks.flatMap((w) => w.days).find((d) => d.status === "today");
  const items = today ? computeNotLogged(today) : [];
  return <NotLoggedList items={items} clientName={clientName} />;
}

function NotLoggedList({ items, clientName }: { items: NotLoggedItem[]; clientName: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="sh">Not yet logged today</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((it) => (
          <div key={it.exercise} className="cell row">
            <span style={{ flex: 1, fontSize: 12.5 }}>{it.exercise}</span>
            <span className="tag tag-neutral">
              {it.logged}/{it.total} sets
            </span>
          </div>
        ))}
      </div>
      <div className="mu" style={{ marginTop: 7 }}>{clientName.split(" ")[0]} hasn't logged these yet — nudge them, or log it yourself if they trained with you.</div>
    </div>
  );
}
