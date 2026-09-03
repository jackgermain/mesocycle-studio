import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { StoreProvider, useStore } from "../../state/store";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { BackHeader, InfoBanner, StatCell } from "../../components/UI";
import { createInvite } from "../../shared/invites";
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
    const url = `${window.location.origin}${window.location.pathname}#/invite/${client.inviteCode}`;
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
  const [accountActive, setAccountActive] = useState<boolean | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!client.accountId) return;
    let active = true;
    supabase
      .from("accounts")
      .select("active")
      .eq("id", client.accountId)
      .maybeSingle()
      .then(({ data }) => active && setAccountActive((data?.active as boolean | undefined) ?? true));
    return () => {
      active = false;
    };
  }, [client.accountId]);

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
      <BackHeader kicker={accepted ? `${client.programName} · week ${client.week} of ${client.totalWeeks}` : "Not accepted yet"} title={client.name} />
      <div className="screen-scroll">
        {accepted && accountActive === false && <InfoBanner icon="ph-lock-simple">Access is revoked — {client.name.split(" ")[0]} can't sign in right now.</InfoBanner>}

        {!accepted ? (
          <>
            <InfoBanner icon="ph-user-plus">
              {client.role === "friend" ? "This friend/family invite hasn't been accepted yet." : "This client hasn't accepted their invite yet."}
            </InfoBanner>

            {!client.inviteCode && (
              <button className="btn btn-primary btn-block" style={{ height: 46, opacity: sending ? 0.6 : 1 }} disabled={sending} onClick={sendInvite}>
                <i className="ph ph-paper-plane-tilt" style={{ fontSize: 15 }} />
                {sending ? "Sending…" : `Invite ${client.name.split(" ")[0]} to the app`}
              </button>
            )}

            {client.inviteCode && (
              <div className="cell" style={{ padding: 12 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontFamily: "var(--font-heading)" }}>Invite link</span>
                  <span className="tag tag-neutral">Pending</span>
                </div>
                <div className="mu trunc" style={{ padding: "8px 10px", background: "var(--color-neutral-900)", borderRadius: 7, fontFamily: "monospace" }}>
                  {window.location.origin}
                  {window.location.pathname}#/invite/{client.inviteCode}
                </div>
                <button className="btn btn-secondary btn-block" style={{ height: 40, marginTop: 8, fontSize: 12.5 }} onClick={copyLink}>
                  {copied ? "Copied" : "Copy link to send yourself"}
                </button>
                <div className="mu" style={{ marginTop: 8, lineHeight: 1.6 }}>
                  Send this however you'd reach {client.name.split(" ")[0]} (email, text). Opening it walks them through a real sign-in — from then on
                  {client.role === "friend" ? " they can build or clone their own programs, and you can still view and edit anything they set up." : " they only see the program you build for them."}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="cell row" style={{ gap: 8 }}>
              <StatCell label="Adherence" value={`${client.adherencePct}%`} valueColor="var(--color-accent-300)" />
              <StatCell label="Week" value={`${client.week} / ${client.totalWeeks}`} />
              <StatCell label="Flags" value={client.flags.length} valueColor={client.flags.length ? "var(--color-neutral-200)" : undefined} />
            </div>

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
                      <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>{f.note}</div>
                      {f.evidence && (
                        <div style={{ marginTop: 8, padding: "9px 10px", borderRadius: 8, background: "var(--color-accent-900)", color: "var(--color-accent-200)", fontSize: 12, lineHeight: 1.5 }}>
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
                <div style={{ flex: 1, fontSize: 13, fontFamily: "var(--font-heading)" }}>Load progression</div>
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
                    <div key={i} className="cell row" style={{ padding: "10px 12px" }}>
                      <span style={{ flex: 1, fontSize: 13 }}>{s.label}</span>
                      <span className={`tag ${s.status === "Complete" ? "tag-accent" : "tag-neutral"}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {accepted && (
          <button className="btn btn-primary btn-block" style={{ height: 44 }} onClick={() => nav(`/coach/clients/${client.id}/log`)}>
            <i className="ph ph-pencil-simple-line" style={{ fontSize: 15 }} />
            Log a session in person
          </button>
        )}
        {accepted && (
          <button className="btn btn-secondary btn-block" style={{ height: 44 }} onClick={() => nav(`/coach/clients/${client.id}/nutrition`)}>
            <i className="ph ph-fork-knife" style={{ fontSize: 15 }} />
            Nutrition protocol
          </button>
        )}
        {accepted && (
          <button className="btn btn-secondary btn-block" style={{ height: 44 }} onClick={() => nav(`/coach/messages/${client.accountId}`)}>
            <i className="ph ph-chat-circle" style={{ fontSize: 15 }} />
            Message {client.name.split(" ")[0]}
          </button>
        )}

        {accepted && accountActive !== null && (
          <button
            className="btn btn-secondary btn-block"
            style={{ height: 44, color: accountActive ? "var(--color-neutral-400)" : "var(--color-accent)", opacity: revoking ? 0.6 : 1 }}
            disabled={revoking}
            onClick={toggleAccess}
          >
            <i className={`ph ${accountActive ? "ph-lock-simple" : "ph-lock-key-open"}`} style={{ fontSize: 15 }} />
            {revoking ? "Working…" : accountActive ? `Revoke ${client.name.split(" ")[0]}'s access` : `Restore ${client.name.split(" ")[0]}'s access`}
          </button>
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
      <LiveNotLoggedList clientName={clientName} />
    </StoreProvider>
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
          <div key={it.exercise} className="cell row" style={{ padding: "10px 12px" }}>
            <span style={{ flex: 1, fontSize: 13 }}>{it.exercise}</span>
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
