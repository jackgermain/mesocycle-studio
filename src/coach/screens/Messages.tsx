import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { CoachTabBar } from "../components/CoachTabBar";
import { FeedbackSheet, FeedbackInbox } from "../../shared/FeedbackSheet";
import { listFeedbackForAdmin } from "../../shared/signals";
import { BackHeader, HeroHeader, HeroStat } from "../../components/UI";
import { formatMessageTime, formatThreadPreviewTime } from "../../shared/formatTime";

type Filter = "unread" | "all" | "flagged";

export default function Messages() {
  const { state } = useCoachStore();
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const { account } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFeedbackInbox, setShowFeedbackInbox] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);

  // Deleting a note is how it gets cleared, so the number still sitting there is the number still needing
  // attention -- no separate unread flag to keep in sync.
  useEffect(() => {
    if (!account?.is_platform_admin) return;
    let active = true;
    listFeedbackForAdmin().then((rows) => active && setFeedbackCount(rows.length));
    return () => {
      active = false;
    };
  }, [account?.is_platform_admin]);
  const unreadCount = state.threads.filter((t) => t.unread).length;

  const filtered = state.threads.filter((t) => (filter === "unread" ? t.unread : filter === "flagged" ? t.context.toLowerCase().includes("flag") : true));

  return (
    <div className="screen">
      <HeroHeader
        title="Messages"
        right={
          <div className="row" style={{ gap: 8 }}>
            {account?.is_platform_admin && (
              <button
                className="btn btn-secondary btn-icon"
                style={{ position: "relative" }}
                aria-label={`Feedback from users${feedbackCount > 0 ? ` (${feedbackCount} new)` : ""}`}
                onClick={() => setShowFeedbackInbox(true)}
              >
                <i className="ph ph-tray" style={{ fontSize: 16 }} />
                {feedbackCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      minWidth: 17,
                      height: 17,
                      padding: "0 4px",
                      borderRadius: 9,
                      background: "var(--color-accent)",
                      color: "#0b1710",
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-heading)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {feedbackCount}
                  </span>
                )}
              </button>
            )}
            <button className="btn btn-secondary btn-icon" aria-label="Send feedback about the app" onClick={() => setShowFeedback(true)}>
              <i className="ph ph-megaphone-simple" style={{ fontSize: 16 }} />
            </button>
            <button className="btn btn-secondary btn-icon" aria-label="New message" onClick={() => nav("/coach/clients")}>
              <i className="ph ph-pencil-simple-line" style={{ fontSize: 16 }} />
            </button>
          </div>
        }
      >
        <HeroStat value={unreadCount} label="unread" valueColor={unreadCount > 0 ? "var(--color-accent)" : "var(--color-neutral-200)"}>
          <div className="row" style={{ fontSize: 12 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Total threads</span>
            <span style={{ fontFamily: "var(--font-heading)", color: "var(--color-neutral-200)" }}>{state.threads.length}</span>
          </div>
        </HeroStat>
      </HeroHeader>
      <div className="screen-scroll">
        <div className="input row" style={{ height: 38, gap: 8, color: "var(--color-neutral-600)" }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 15 }} />
          <span style={{ fontSize: 14 }}>Search messages</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip${filter === "unread" ? " on" : ""}`} onClick={() => setFilter("unread")}>Unread {unreadCount}</button>
          <button className={`chip${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>All</button>
          <button className={`chip${filter === "flagged" ? " on" : ""}`} onClick={() => setFilter("flagged")}>Flagged</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {filtered.map((t) => (
            <button key={t.id} className="link-row elev-sm" style={{ alignItems: "flex-start", padding: "11px 12px" }} onClick={() => nav(`/coach/messages/${t.id}`)}>
              <div className="avatar" style={t.isBroadcast ? { background: "var(--color-accent-900)", color: "var(--color-accent-300)" } : undefined}>
                {t.isBroadcast ? <i className="ph ph-megaphone" style={{ fontSize: 14 }} /> : t.clientName.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row">
                  <div className="name" style={{ flex: 1 }}>{t.clientName}</div>
                  <span className="mu">{formatThreadPreviewTime(t.time)}</span>
                </div>
                <div className="mu trunc" style={{ marginTop: 3, color: t.unread ? "var(--color-neutral-200)" : undefined }}>{t.preview}</div>
              </div>
              {t.unread && <div style={{ width: 7, height: 7, flex: "none", borderRadius: "50%", background: "var(--color-accent)", marginTop: 6 }} />}
            </button>
          ))}
        </div>
      </div>
      <CoachTabBar />
      {showFeedback && <FeedbackSheet onClose={() => setShowFeedback(false)} />}
      {showFeedbackInbox && <FeedbackInbox onClose={() => setShowFeedbackInbox(false)} onCountChange={setFeedbackCount} />}
    </div>
  );
}

export function CoachThread() {
  const { threadId = "" } = useParams();
  const { state, dispatch } = useCoachStore();
  const nav = useNavigate();
  const existingThread = state.threads.find((t) => t.id === threadId) ?? state.threads.find((t) => t.clientId === threadId);
  // No messages yet with this person — fall back to their roster name so the empty thread still renders
  // (and the first message sent creates the real thread).
  const rosterClient = !existingThread ? state.clients.find((c) => c.accountId === threadId) : null;
  const [draft, setDraft] = useState("");
  if (!existingThread && !rosterClient) return <div className="screen-scroll">Not found.</div>;

  const thread = existingThread ?? { id: threadId, clientId: threadId, clientName: rosterClient!.name, context: "", unread: false, time: "", preview: "", bubbles: [] as { from: "coach" | "client"; text: string; time: string; attached?: string; receipt?: string }[] };

  useEffect(() => {
    if (existingThread?.unread) dispatch({ type: "MARK_READ", threadId: existingThread.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingThread?.id, existingThread?.unread]);

  function send() {
    if (!draft.trim()) return;
    dispatch({ type: "SEND_MESSAGE", threadId: thread.id, text: draft.trim(), clientName: thread.clientName });
    setDraft("");
  }

  return (
    <div className="screen">
      <BackHeader kicker={thread.context} title={thread.clientName} />
      <div className="screen-scroll" style={{ justifyContent: "flex-end", gap: 4 }}>
        {thread.bubbles.map((b, i) => {
          const prev = thread.bubbles[i - 1];
          const senderChanged = !prev || prev.from !== b.from;
          return (
            <div key={i} style={{ alignSelf: b.from === "client" ? "flex-start" : "flex-end", maxWidth: "84%", marginTop: senderChanged ? 12 : 0 }}>
              {b.attached ? (
                <div style={{ borderRadius: 12, background: "var(--color-neutral-900)", border: "1px solid var(--color-neutral-800)", padding: "10px 11px" }}>
                  <div className="row" style={{ gap: 7, marginBottom: 7 }}>
                    <i className="ph ph-paperclip" style={{ fontSize: 13, color: "var(--color-neutral-500)" }} />
                    <span className="scr">attached from their log</span>
                  </div>
                  <div className="row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{b.text}</div>
                      <div className="mu" style={{ marginTop: 2 }}>{b.attached}</div>
                    </div>
                    <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: b.from === "client" ? "12px 12px 12px 4px" : "12px 12px 4px 12px",
                    background: b.from === "coach" ? "var(--color-accent)" : "var(--color-surface)",
                    border: b.from === "client" ? "1px solid var(--color-neutral-800)" : undefined,
                  }}
                >
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, fontWeight: b.from === "coach" ? 600 : 400, color: b.from === "coach" ? "#0b1710" : "var(--color-text)" }}>{b.text}</div>
                  {b.receipt && (
                    <div style={{ marginTop: 8, padding: "8px 9px", borderRadius: 8, background: "rgba(11, 23, 16, 0.15)" }}>
                      <div className="row" style={{ gap: 7, fontSize: 11.5 }}>
                        <i className="ph ph-arrows-left-right" style={{ fontSize: 13 }} />
                        {b.receipt}
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 5, fontSize: 10.5, textAlign: b.from === "coach" ? "right" : "left", opacity: b.from === "coach" ? 0.7 : undefined, color: b.from === "coach" ? "#0b1710" : "var(--color-neutral-500)" }}>{formatMessageTime(b.time)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ flex: "none", padding: "8px 12px 18px", background: "#1b1e2e", borderTop: "1px solid var(--color-neutral-900)" }}>
        <div className="row" style={{ gap: 8 }}>
          <i className="ph ph-plus-circle" style={{ fontSize: 22, color: "var(--color-neutral-500)", flex: "none" }} />
          <input className="input" style={{ flex: 1, height: 40 }} placeholder={`Message ${thread.clientName}`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <button onClick={send} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <i className="ph-fill ph-paper-plane-right" style={{ fontSize: 19, color: "var(--color-accent)" }} />
          </button>
        </div>
        {thread.clientId !== thread.id && (
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <button className="chip" onClick={() => nav(`/coach/clients/${thread.clientId}`)}>Open their profile</button>
          </div>
        )}
      </div>
    </div>
  );
}
