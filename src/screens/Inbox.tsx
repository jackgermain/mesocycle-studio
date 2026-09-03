import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../state/store";
import { TabBar } from "../components/TabBar";
import { BackHeader } from "../components/UI";

interface Bubble {
  from: "coach" | "client";
  text: string;
  time: string;
  attachedSet?: string;
  actionReceipt?: string;
}

const THREADS: Record<string, { name: string; context: string; time: string; preview: string; unread: boolean; bubbles: Bubble[] }> = {
  dana: {
    name: "Dana",
    context: "Hypertrophy 8 · wk 3 · your coach",
    time: "08:19",
    preview: "Skip it. I've swapped today's hack squat for a leg press with a shorter range — same sets, same RIR.",
    unread: true,
    bubbles: [
      { from: "client", text: "Knee felt a little off on the second set — should I skip hack squat today?", time: "08:12" },
      { from: "coach", text: "Skip it. I've swapped today's hack squat for a leg press with a shorter range — same sets, same RIR.", time: "08:19", actionReceipt: "Hack Squat → Leg Press · week 3" },
      { from: "client", text: "Perfect, thank you 🙏", time: "08:21" },
    ],
  },
  broadcast: {
    name: "Broadcast · Hypertrophy 8",
    context: "From Dana to all assigned clients",
    time: "Sun",
    preview: "Week 4 is the last accumulation week — push it.",
    unread: false,
    bubbles: [{ from: "coach", text: "Week 4 is the last accumulation week — push it.", time: "Sun 09:02" }],
  },
};

export default function Inbox() {
  const { state } = useStore();
  const nav = useNavigate();
  return (
    <div className="screen">
      <div className="hdr">
        <div style={{ flex: 1 }}>
          <div className="k">1 unread · 2 threads</div>
          <div className="h1">Inbox</div>
        </div>
        <button className="btn btn-secondary btn-icon">
          <i className="ph ph-pencil-simple-line" style={{ fontSize: 16 }} />
        </button>
      </div>
      <div className="screen-scroll">
        <div className="input row" style={{ height: 38, gap: 8, color: "var(--color-neutral-600)" }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 15 }} />
          <span style={{ fontSize: 14 }}>Search messages</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {Object.entries(THREADS).map(([id, t]) => (
            <button key={id} className="link-row elev-sm" style={{ alignItems: "flex-start", padding: "11px 12px" }} onClick={() => nav(`/inbox/${id}`)}>
              <div className="avatar" style={id === "broadcast" ? { background: "var(--color-accent-900)", color: "var(--color-accent-300)" } : undefined}>
                {id === "broadcast" ? <i className="ph ph-megaphone" style={{ fontSize: 14 }} /> : t.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row">
                  <div className="name" style={{ flex: 1 }}>{t.name}</div>
                  <span className="mu">{t.time}</span>
                </div>
                <div className="mu trunc" style={{ marginTop: 3, color: t.unread ? "var(--color-neutral-200)" : undefined }}>
                  {t.preview}
                </div>
              </div>
              {t.unread && <div style={{ width: 7, height: 7, flex: "none", borderRadius: "50%", background: "var(--color-accent)", marginTop: 6 }} />}
            </button>
          ))}
        </div>
      </div>
      <TabBar />
    </div>
  );
}

export function Thread() {
  const { threadId = "" } = useParams();
  const thread = THREADS[threadId];
  const [draft, setDraft] = useState("");
  const [bubbles, setBubbles] = useState(thread?.bubbles ?? []);
  if (!thread) return <div className="screen-scroll">Not found.</div>;

  function send() {
    if (!draft.trim()) return;
    setBubbles((b) => [...b, { from: "client", text: draft.trim(), time: "now" }]);
    setDraft("");
  }

  return (
    <div className="screen">
      <BackHeader kicker={thread.context} title={thread.name} />
      <div className="screen-scroll" style={{ justifyContent: "flex-end", gap: 10 }}>
        {bubbles.map((b, i) => (
          <div key={i} style={{ alignSelf: b.from === "coach" ? "flex-start" : "flex-end", maxWidth: "84%" }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: b.from === "coach" ? "12px 12px 12px 4px" : "12px 12px 4px 12px",
                background: b.from === "coach" ? "var(--color-surface)" : "var(--color-accent-900)",
                border: b.from === "client" ? "1px solid var(--color-accent-800)" : undefined,
              }}
            >
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: b.from === "client" ? "var(--color-accent-100)" : "var(--color-text)" }}>{b.text}</div>
              {b.actionReceipt && (
                <div style={{ marginTop: 8, padding: "8px 9px", borderRadius: 8, background: "var(--color-accent-800)" }}>
                  <div className="row" style={{ gap: 7, fontSize: 11.5, color: "var(--color-accent-100)" }}>
                    <i className="ph ph-arrows-left-right" style={{ fontSize: 13 }} />
                    {b.actionReceipt}
                  </div>
                </div>
              )}
              <div className="mu" style={{ marginTop: 5, fontSize: 10.5, textAlign: b.from === "client" ? "right" : "left" }}>{b.time}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: "none", padding: "8px 12px 18px", background: "#1b1e2e", borderTop: "1px solid var(--color-neutral-900)" }}>
        <div className="row" style={{ gap: 8 }}>
          <i className="ph ph-plus-circle" style={{ fontSize: 22, color: "var(--color-neutral-500)", flex: "none" }} />
          <input className="input" style={{ flex: 1, height: 40 }} placeholder={`Message ${thread.name}`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <button onClick={send} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <i className="ph-fill ph-paper-plane-right" style={{ fontSize: 19, color: "var(--color-accent)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
