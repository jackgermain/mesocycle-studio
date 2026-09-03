import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { StoreProvider, useStore } from "../../state/store";
import { BackHeader, InfoBanner, StatCell } from "../../components/UI";
import { createInvite, findInviteForClient } from "../../shared/invites";
import type { TrainingDay } from "../../data/types";
import type { ClientFlag } from "../types";

export default function ClientDetail() {
  const { clientId = "" } = useParams();
  const { state, dispatch } = useCoachStore();
  const nav = useNavigate();
  const [invite, setInvite] = useState(() => findInviteForClient(clientId));
  const [copied, setCopied] = useState(false);
  const found = state.clients.find((c) => c.id === clientId);
  if (!found) return <div className="screen-scroll">Not found.</div>;
  const client = found;

  function sendInvite() {
    const created = createInvite(client.id, client.name);
    setInvite(created);
  }

  function copyLink() {
    if (!invite) return;
    const url = `${window.location.origin}${window.location.pathname}#/invite/${invite.code}`;
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
    dispatch({ type: "SEND_MESSAGE", threadId: client.id, text: `Hey ${client.name.split(" ")[0]}, quick reminder to log your weigh-in when you get a chance 👍` });
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

  return (
    <div className="screen">
      <BackHeader kicker={client.status === "unassigned" ? "Not assigned" : `${client.programName} · week ${client.week} of ${client.totalWeeks}`} title={client.name} />
      <div className="screen-scroll">
        {client.status === "unassigned" ? (
          <>
            <InfoBanner icon="ph-user-plus">This client hasn't been assigned a program yet.</InfoBanner>

            {!invite && (
              <button className="btn btn-primary btn-block" style={{ height: 46 }} onClick={sendInvite}>
                <i className="ph ph-paper-plane-tilt" style={{ fontSize: 15 }} />
                Invite {client.name.split(" ")[0]} to the app
              </button>
            )}

            {invite && (
              <div className="cell" style={{ padding: 12 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontFamily: "var(--font-heading)" }}>Invite link</span>
                  <span className={`tag ${invite.usedAt ? "tag-accent" : "tag-neutral"}`}>{invite.usedAt ? "Accepted" : "Pending"}</span>
                </div>
                <div className="mu trunc" style={{ padding: "8px 10px", background: "var(--color-neutral-900)", borderRadius: 7, fontFamily: "monospace" }}>
                  {window.location.origin}
                  {window.location.pathname}#/invite/{invite.code}
                </div>
                <button className="btn btn-secondary btn-block" style={{ height: 40, marginTop: 8, fontSize: 12.5 }} onClick={copyLink}>
                  {copied ? "Copied" : "Copy link to send yourself"}
                </button>
                <div className="mu" style={{ marginTop: 8, lineHeight: 1.6 }}>
                  Prototype note: nothing is emailed automatically — copy this and send it however you'd reach {client.name.split(" ")[0]} (email, text). Opening it walks them through creating their own account, and from then on they only see the program you build for them.
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

            <NotLoggedSection clientId={client.id} clientName={client.name} />

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

        {client.status !== "unassigned" && (
          <button className="btn btn-primary btn-block" style={{ height: 44 }} onClick={() => nav(`/coach/clients/${client.id}/log`)}>
            <i className="ph ph-pencil-simple-line" style={{ fontSize: 15 }} />
            Log a session in person
          </button>
        )}
        {client.status !== "unassigned" && (
          <button className="btn btn-secondary btn-block" style={{ height: 44 }} onClick={() => nav(`/coach/clients/${client.id}/nutrition`)}>
            <i className="ph ph-fork-knife" style={{ fontSize: 15 }} />
            Nutrition protocol
          </button>
        )}
        <button className="btn btn-secondary btn-block" style={{ height: 44 }} onClick={() => nav(`/coach/messages/${client.id}`)}>
          <i className="ph ph-chat-circle" style={{ fontSize: 15 }} />
          Message {client.name.split(" ")[0]}
        </button>
      </div>
    </div>
  );
}

type NotLoggedItem = { exercise: string; logged: number; total: number };

/** Every client has their own linked program store now (keyed by their client id), so this is always computed live. */
function NotLoggedSection({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <StoreProvider profileId={clientId}>
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
