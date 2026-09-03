import React, { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { supabase } from "../lib/supabase";
import { TabBar } from "../components/TabBar";
import { InfoBanner, HeroHeader } from "../components/UI";
import { formatMessageTime } from "../shared/formatTime";

interface Bubble {
  from: "coach" | "client";
  text: string;
  time: string;
  attached?: string;
  receipt?: string;
}
interface Thread {
  clientName: string;
  context: string;
  bubbles: Bubble[];
}

/** The client's one real conversation with their coach — no separate list screen, since there's only
 * ever this one thread. Reads/writes through get_my_thread / send_client_message, the two RPCs that let
 * a client touch their own slice of the coach's threads without any broader access. */
export default function Inbox() {
  const { state } = useStore();
  const [thread, setThread] = useState<Thread | "loading" | null>("loading");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase.rpc("get_my_thread");
    if (error) {
      setError(error.message);
      return;
    }
    setThread((data as Thread | null) ?? null);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    const { error } = await supabase.rpc("send_client_message", { p_text: text });
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDraft("");
    await refresh();
  }

  const bubbles = thread === "loading" || thread === null ? [] : thread.bubbles;
  const coachName = state.program.coachName;

  return (
    <div className="screen">
      <HeroHeader kicker={coachName} title="Inbox" />
      <div className="screen-scroll" style={{ justifyContent: bubbles.length ? "flex-end" : "flex-start", gap: 4 }}>
        {thread === "loading" && <div className="mu">Loading…</div>}
        {thread !== "loading" && bubbles.length === 0 && (
          <InfoBanner icon="ph-chat-circle-dots">
            No messages yet — send {coachName.split(" ")[0]} something below and they'll see it.
          </InfoBanner>
        )}
        {bubbles.map((b, i) => {
          const prev = bubbles[i - 1];
          const senderChanged = !prev || prev.from !== b.from;
          return (
            <div key={i} style={{ alignSelf: b.from === "coach" ? "flex-start" : "flex-end", maxWidth: "84%", marginTop: senderChanged ? 12 : 0 }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: b.from === "coach" ? "12px 12px 12px 4px" : "12px 12px 4px 12px",
                  background: b.from === "client" ? "var(--color-accent)" : "var(--color-surface)",
                  border: b.from === "coach" ? "1px solid var(--color-neutral-800)" : undefined,
                }}
              >
                <div style={{ fontSize: 13.5, lineHeight: 1.5, fontWeight: b.from === "client" ? 600 : 400, color: b.from === "client" ? "#0b1710" : "var(--color-text)" }}>{b.text}</div>
                {b.receipt && (
                  <div style={{ marginTop: 8, padding: "8px 9px", borderRadius: 8, background: "rgba(11, 23, 16, 0.15)" }}>
                    <div className="row" style={{ gap: 7, fontSize: 11.5 }}>
                      <i className="ph ph-arrows-left-right" style={{ fontSize: 13 }} />
                      {b.receipt}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 5, fontSize: 10.5, textAlign: b.from === "client" ? "right" : "left", opacity: 0.7 }}>{formatMessageTime(b.time)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ flex: "none", padding: "8px 12px 18px", background: "#1b1e2e", borderTop: "1px solid var(--color-neutral-900)" }}>
        {error && (
          <div style={{ marginBottom: 8 }}>
            <InfoBanner icon="ph-warning">Couldn't send: {error}</InfoBanner>
          </div>
        )}
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1, height: 42 }}
            placeholder={`Message ${coachName.split(" ")[0]}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !sending && send()}
          />
          <button onClick={send} disabled={sending || !draft.trim()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", opacity: sending || !draft.trim() ? 0.4 : 1 }}>
            <i className="ph-fill ph-paper-plane-right" style={{ fontSize: 22, color: "var(--color-accent)" }} />
          </button>
        </div>
      </div>
      <TabBar />
    </div>
  );
}
