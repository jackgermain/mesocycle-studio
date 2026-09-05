import React, { useEffect, useState } from "react";
import { answerFormCheck, formCheckVideoUrl, type FormCheck } from "../../shared/formChecks";
import { InfoBanner } from "../../components/UI";

/** The coach's side: watch the clip, answer the question.
 *
 * The reply is stored on the form check itself rather than sent as a message, so it stays attached to the
 * video and the lift it was about. A coaching answer read six weeks later without the clip beside it is
 * most of the way to useless. */
export function CoachFormCheckSheet({
  check, clientName, onClose, onAnswered,
}: {
  check: FormCheck;
  clientName: string;
  onClose: () => void;
  onAnswered: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState(check.coach_reply ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    formCheckVideoUrl(check.video_path).then((u) => {
      if (!active) return;
      setUrl(u);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [check.video_path]);

  async function save() {
    if (!reply.trim()) return;
    setSaving(true);
    setError(null);
    const ok = await answerFormCheck(check.id, reply);
    setSaving(false);
    if (!ok) {
      setError("That didn't save. Try again in a moment.");
      return;
    }
    onAnswered();
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="scr">Form check · {clientName}</div>
            <div className="trunc" style={{ fontSize: "var(--text-md)", fontWeight: 600, marginTop: 2 }}>{check.exercise_name}</div>
            {check.day_label && <div className="mu" style={{ marginTop: 1 }}>{check.day_label}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", display: "flex", padding: 4 }}
          >
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {loading ? (
          <div className="mu" style={{ padding: "24px 0", textAlign: "center" }}>Loading the clip…</div>
        ) : url ? (
          <video
            src={url}
            controls
            playsInline
            style={{ width: "100%", borderRadius: "var(--radius-md)", background: "var(--color-surface-sunken)", maxHeight: "46vh" }}
          />
        ) : (
          <InfoBanner icon="ph-warning">That video couldn't be loaded.</InfoBanner>
        )}

        {check.note && (
          <div className="cell" style={{ borderLeft: "2px solid var(--color-accent)" }}>
            <div className="scr" style={{ color: "var(--color-accent-300)", marginBottom: 3 }}>They asked</div>
            <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.55 }}>{check.note}</div>
          </div>
        )}

        <div className="field">
          <label>Your answer</label>
          <textarea
            className="input"
            style={{ minHeight: 84, lineHeight: 1.5 }}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="What to change, and what to keep doing."
          />
        </div>

        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

        <button
          className="btn btn-primary btn-block"
          style={{ height: 48, opacity: reply.trim() && !saving ? 1 : 0.45 }}
          disabled={!reply.trim() || saving}
          onClick={save}
        >
          {saving ? "Sending…" : check.answered_at ? "Update the answer" : "Send the answer"}
        </button>
      </div>
    </div>
  );
}
