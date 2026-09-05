import React, { useRef, useState } from "react";
import { useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { MAX_VIDEO_BYTES, sendFormCheck } from "./formChecks";
import { InfoBanner } from "../components/UI";

/** "Does this look right?" -- a clip of one set, sent to the coach, attached to the lift it was of.
 *
 * The exercise, day and set context ride along automatically. Asking someone to type "this was my third
 * set of incline press on Tuesday" is how a form check ends up as an unanswerable video in a DM thread. */
export function FormCheckSheet({
  exerciseName, dayId, dayLabel, onClose,
}: {
  exerciseName: string;
  dayId?: string;
  dayLabel?: string;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();
  const { account } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coachName = state.program.coachName;
  const tooBig = !!file && file.size > MAX_VIDEO_BYTES;

  async function send() {
    if (!file || !account?.coach_id) return;
    setSending(true);
    setError(null);
    const result = await sendFormCheck({
      clientId: account.id,
      coachId: account.coach_id,
      exerciseName,
      dayId,
      dayLabel,
      note,
      file,
    });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    dispatch({ type: "SHOW_TOAST", message: `Sent to ${coachName} — they'll reply on this one.` });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Form check</div>
            <div style={{ fontSize: "var(--text-md)", fontWeight: 600, marginTop: 2 }}>{exerciseName}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", display: "flex", padding: 4 }}
          >
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {!account?.coach_id ? (
          <InfoBanner icon="ph-info">You don't have a coach attached to this account, so there's nobody to send this to.</InfoBanner>
        ) : (
          <>
            <p className="mu" style={{ lineHeight: 1.6 }}>
              A few seconds of one working set is enough. Side-on usually shows more than head-on.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              capture="environment"
              hidden
              onChange={(e) => {
                setError(null);
                setFile(e.target.files?.[0] ?? null);
              }}
            />

            <button className="add-row" onClick={() => fileRef.current?.click()}>
              <i className="ph ph-video-camera" style={{ fontSize: 15, marginRight: 6 }} />
              {file ? "Choose a different clip" : "Record or choose a clip"}
            </button>

            {file && (
              <div className="cell row" style={{ marginTop: 8 }}>
                <i className="ph-fill ph-film-slate" style={{ fontSize: 18, color: "var(--color-accent)", flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trunc" style={{ fontSize: "var(--text-sm)" }}>{file.name || "Clip"}</div>
                  <div className="mu" style={{ marginTop: 1 }}>
                    <span className="mono">{(file.size / 1048576).toFixed(1)}</span> MB
                  </div>
                </div>
              </div>
            )}

            {tooBig && (
              <InfoBanner icon="ph-warning">
                That clip is over 60MB. A few seconds of the working set is plenty — try a shorter one.
              </InfoBanner>
            )}

            <div className="field" style={{ marginTop: 10 }}>
              <label>Anything you want them to look at?</label>
              <textarea
                className="input"
                style={{ minHeight: 70, lineHeight: 1.5 }}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. my lower back rounds on the last couple of reps"
              />
            </div>

            {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

            <button
              className="btn btn-primary btn-block"
              style={{ height: 48, marginTop: 4, opacity: file && !tooBig && !sending ? 1 : 0.45 }}
              disabled={!file || tooBig || sending}
              onClick={send}
            >
              {sending ? "Sending…" : `Send to ${coachName.split(" ")[0]}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
