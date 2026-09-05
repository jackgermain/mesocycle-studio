import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { InfoBanner } from "../components/UI";
import { deleteFeedback, listFeedbackForAdmin, sendFeedback, type FeedbackNote } from "../shared/signals";

/** App feedback and bug reports, from anyone using the app to whoever owns it. Deliberately separate from
 * coach<->client messaging: an independent coach isn't anyone's client, so there's no thread they could
 * use, and a bug report shouldn't land in a coaching conversation anyway. */
export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { account } = useAuth();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit() {
    if (!account || !body.trim()) return;
    setSending(true);
    setFailed(false);
    const ok = await sendFeedback(account.id, body.trim());
    setSending(false);
    if (ok) {
      setSent(true);
      setBody("");
    } else {
      setFailed(true);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Feedback</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Report a bug or idea</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {sent ? (
          <>
            <InfoBanner icon="ph-check-circle" tone="accent">Sent — thanks. This goes straight to whoever builds the app, not to your coach.</InfoBanner>
            <button className="btn btn-secondary btn-block" style={{ height: 44 }} onClick={onClose}>
              Close
            </button>
          </>
        ) : (
          <>
            <div className="mu" style={{ lineHeight: 1.55 }}>
              Anything broken, confusing, or missing. Goes to whoever builds the app — not to your coach.
            </div>
            {failed && <InfoBanner icon="ph-warning">Couldn't send that — check your connection and try again.</InfoBanner>}
            <div className="field">
              <label>What happened?</label>
              <textarea
                className="input"
                style={{ minHeight: 110, lineHeight: 1.5 }}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g. the weight box won't let me type a decimal"
                autoFocus
              />
            </div>
            <button
              className="btn btn-primary btn-block"
              style={{ height: 48, opacity: body.trim() && !sending ? 1 : 0.5 }}
              disabled={!body.trim() || sending}
              onClick={submit}
            >
              <i className="ph ph-paper-plane-tilt" style={{ fontSize: 14 }} />
              {sending ? "Sending…" : "Send"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** The receiving end, for the platform owner only. */
export function FeedbackInbox({ onClose, onCountChange }: { onClose: () => void; onCountChange?: (n: number) => void }) {
  const [notes, setNotes] = useState<FeedbackNote[] | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    const ok = await deleteFeedback(id);
    setRemoving(null);
    if (!ok) return;
    setNotes((prev) => {
      const next = (prev ?? []).filter((n) => n.id !== id);
      onCountChange?.(next.length);
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    listFeedbackForAdmin().then((rows) => {
      if (!active) return;
      setNotes(rows);
      onCountChange?.(rows.length);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80%" }}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Feedback</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>From your users</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          {notes === null && <div className="mu" style={{ textAlign: "center", padding: 20 }}>Loading…</div>}
          {notes?.length === 0 && <div className="mu" style={{ textAlign: "center", padding: 20 }}>No feedback yet.</div>}
          {notes?.map((n) => (
            <div key={n.id} className="cell" style={{ opacity: removing === n.id ? 0.5 : 1 }}>
              <div className="row" style={{ marginBottom: 5 }}>
                <span style={{ flex: 1, fontSize: 12.5, fontFamily: "var(--font-heading)" }}>{n.author_name}</span>
                <span className="mu">{new Date(n.created_at).toLocaleDateString()}</span>
                <button
                  onClick={() => remove(n.id)}
                  disabled={removing === n.id}
                  aria-label={`Delete feedback from ${n.author_name}`}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-600)", display: "flex", padding: 2, marginLeft: 8, flex: "none" }}
                >
                  <i className="ph ph-trash" style={{ fontSize: 14 }} />
                </button>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{n.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
