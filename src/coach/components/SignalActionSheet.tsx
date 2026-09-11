import React, { useState } from "react";
import type { ClientSignal } from "../../shared/signals";
import { EFFORT_WORDING } from "../../shared/signalScales";
import { decodeProgression, type ProgressionPayload } from "../../shared/progressionProposal";
import { saveProgressionPayload } from "../../shared/progressionReview";
import { InfoBanner } from "../../components/UI";
import { addWarmupSetForClient, applyProgressionForClient } from "../clientProgramEdits";

/** What a coach can do about a report without leaving the desk. Adding a warm-up set is the one response
 * that's genuinely a single decision -- it costs no training volume and needs no choice about what to put
 * in its place -- so it happens right here. Swapping or dropping the movement is a judgement call that
 * wants the session in front of you, so it lives one tap away in the day itself, which "Open their
 * session" now goes straight to. Both need the client to have named the exercise (migration 0014); an
 * older report, or one where they said it wasn't any single movement, can only be opened and read.
 *
 * A progression signal is reviewed here: every exercise from the session with what was logged, how hard
 * it was, and the proposed next week, each marked Good or Bad. Every one needs a verdict before approval,
 * because the verdicts are the training data. Approval writes only the Good ones into next week. */
export function SignalActionSheet({
  signal,
  clientName,
  onOpenSession,
  onApplied,
  onClose,
  week,
  totalWeeks,
  canOpenSession = true,
  onDetailSaved,
}: {
  signal: ClientSignal;
  clientName: string;
  /** Where in the block this happened. A coach reads "week 2 of 8" very differently from "week 7 of 8" --
   * the same report early in a block is a prescription that needs changing, and late in one is a block
   * that is nearly over. Absent when the client has no program running. */
  week?: number;
  totalWeeks?: number;
  onOpenSession: () => void;
  onApplied: (message: string) => void;
  onClose: () => void;
  /** False for a coach's own sessions -- they are not on their own roster, so there is no client session
   * to open, and the row would close the sheet and go nowhere. */
  canOpenSession?: boolean;
  /** Called with a progression signal's new detail once a review or approval is saved, so the desk's copy
   * matches what was stored and reopening the sheet shows the verdicts already given. */
  onDetailSaved?: (detail: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [review, setReview] = useState<ProgressionPayload | null>(() =>
    signal.kind === "progression" ? decodeProgression(signal.detail) : null,
  );
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    const p = signal.kind === "progression" ? decodeProgression(signal.detail) : null;
    for (const [k, r] of Object.entries(p?.reviews ?? {})) if (r.note) out[k] = r.note;
    return out;
  });
  const exercise = signal.exercise ?? null;
  const first = clientName.split(" ")[0];
  const shownWeek = review?.week ?? week;
  const shownTotal = review?.totalWeeks ?? totalWeeks;
  const locked = !!review?.approvedAt || busy !== null;
  const unreviewed = review ? review.proposals.filter((_, i) => !review.reviews?.[String(i)]).length : 0;
  const canApprove = !!review && !review.approvedAt && unreviewed === 0 && busy === null && !!signal.day_id;

  function describe(touched: number | null, done: string): string | null {
    if (touched === null) return `Couldn't update ${first}'s program — check your connection and try again.`;
    if (touched === 0) return `${exercise} isn't in any of ${first}'s remaining sessions, so there was nothing to change.`;
    return `${done} — ${touched} session${touched === 1 ? "" : "s"} updated.`;
  }

  async function addWarmup() {
    if (!exercise) return;
    setBusy("warmup");
    setFailed(null);
    const touched = await addWarmupSetForClient(signal.client_id, exercise);
    setBusy(null);
    const msg = describe(touched, `Warm-up set added to ${exercise}`);
    if (touched === null || touched === 0) return setFailed(msg);
    onApplied(msg!);
  }

  /** Shown straight away, saved in the background. A verdict that didn't save says so rather than looking
   * recorded -- this is training data, and a silent loss is the one outcome worse than an error. */
  async function persist(next: ProgressionPayload) {
    setReview(next);
    setFailed(null);
    const detail = await saveProgressionPayload(signal.id, next);
    if (detail) onDetailSaved?.(detail);
    else setFailed("That didn't save — check your connection and tap it again.");
  }

  function rate(idx: number, verdict: "good" | "bad") {
    if (!review || locked) return;
    const key = String(idx);
    const note = verdict === "bad" ? notes[key]?.trim() || undefined : undefined;
    void persist({ ...review, reviews: { ...(review.reviews ?? {}), [key]: { verdict, note, at: new Date().toISOString() } } });
  }

  function saveNote(idx: number) {
    const key = String(idx);
    const current = review?.reviews?.[key];
    if (!review || !current || current.verdict !== "bad" || locked) return;
    const note = notes[key]?.trim() || undefined;
    if (note === current.note) return;
    void persist({ ...review, reviews: { ...review.reviews, [key]: { ...current, note } } });
  }

  async function approve() {
    if (!review || !signal.day_id || review.approvedAt) return;
    const good = review.proposals.filter((_, i) => review.reviews?.[String(i)]?.verdict === "good").length;
    const bad = review.proposals.length - good;
    setBusy("approve");
    setFailed(null);
    let touched = 0;
    if (good > 0) {
      const result = await applyProgressionForClient(
        signal.client_id,
        signal.day_id,
        review,
        (i) => review.reviews?.[String(i)]?.verdict === "good",
      );
      if (result === null) {
        setBusy(null);
        setFailed(`Couldn't update ${first === "You" ? "your" : `${first}'s`} program — check your connection and try again.`);
        return;
      }
      touched = result;
    }
    const approved: ProgressionPayload = { ...review, approvedAt: new Date().toISOString(), appliedCount: touched };
    const detail = await saveProgressionPayload(signal.id, approved);
    setBusy(null);
    if (detail) {
      setReview(approved);
      onDetailSaved?.(detail);
    }
    onApplied(
      good === 0
        ? "Approved — every exercise marked Bad, so next week stays as programmed."
        : touched === 0
          ? "Approved — nothing changed: next week's session is already started, or the block ends here."
          : `Approved — next week updated on ${touched} exercise${touched === 1 ? "" : "s"}${bad ? `, ${bad} left as programmed` : ""}.`,
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85%", overflowY: "auto" }}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">{clientName}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
              {/* Every kind names itself. "effort" and "nutrition" both fell through to "Low pump" here,
                  so a failure on a final set was reported to the coach as a pump problem. */}
              {signal.kind === "progression"
                ? "Next week's numbers"
                : signal.kind === "joint"
                  ? "Joint pain"
                  : signal.kind === "soreness"
                    ? "Still sore"
                    : signal.kind === "effort"
                      ? "Hit failure"
                      : signal.kind === "nutrition"
                        ? signal.detail === "missed" ? "No meals logged" : "Off target"
                        : "Low pump"}
              {signal.note ? ` — ${signal.note}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="cell" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {exercise && (
            <div style={{ fontSize: 12.5 }}>
              <span className="mu">On </span>
              {exercise}
            </div>
          )}
          {/* A progression's detail is its JSON payload, rendered below -- never as text. */}
          {signal.detail && signal.kind !== "progression" && <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{signal.detail}</div>}
          <div className="mu">
            {signal.day_label ?? "Session"}
            {shownWeek ? ` · week ${shownWeek}${shownTotal ? ` of ${shownTotal}` : ""}` : ""}
            {` · ${signal.kind === "progression" ? "sent" : "reported"} ${new Date(signal.created_at).toLocaleDateString()}`}
          </div>
        </div>

        {signal.kind === "progression" && !review && (
          <InfoBanner icon="ph-warning">These numbers couldn't be read — open the session to see what was logged.</InfoBanner>
        )}

        {review && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {review.proposals.map((p, idx) => {
              const key = String(idx);
              const verdict = review.reviews?.[key]?.verdict;
              return (
                <div key={`${p.exercise}-${idx}`} className="cell" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 13.5 }}>{p.exercise}</div>
                  <div style={{ fontSize: 12.5 }}>
                    <span className="mu">Did </span>
                    {p.logged}
                    {p.effort ? <span className="mu">{` · how hard ${p.effort} (${EFFORT_WORDING[p.effort - 1] ?? ""})`}</span> : null}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--color-accent)" }}>
                    <span className="mu">Next week </span>
                    {p.next}
                  </div>
                  <div style={{ fontSize: 12 }}>{p.label}</div>
                  <div className="mu" style={{ lineHeight: 1.5 }}>{p.why}</div>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
                    <button
                      className={`pill-opt${verdict === "good" ? " on" : ""}`}
                      style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 }}
                      disabled={locked}
                      onClick={() => rate(idx, "good")}
                    >
                      <i className={`ph${verdict === "good" ? "-fill" : ""} ph-thumbs-up`} style={{ fontSize: 15 }} />
                      Good
                    </button>
                    <button
                      className={`pill-opt${verdict === "bad" ? " on" : ""}`}
                      style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 }}
                      disabled={locked}
                      onClick={() => rate(idx, "bad")}
                    >
                      <i className={`ph${verdict === "bad" ? "-fill" : ""} ph-thumbs-down`} style={{ fontSize: 15 }} />
                      Bad
                    </button>
                  </div>
                  {verdict === "bad" && (
                    <textarea
                      className="input"
                      style={{ minHeight: 64, lineHeight: 1.5, marginTop: 4 }}
                      value={notes[key] ?? ""}
                      disabled={locked}
                      placeholder="What would you have done instead? Optional."
                      onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))}
                      onBlur={() => saveNote(idx)}
                    />
                  )}
                </div>
              );
            })}

            <div>
              <button
                className="btn btn-solid btn-block"
                style={{ height: 48, opacity: canApprove ? 1 : 0.45, cursor: canApprove ? "pointer" : "not-allowed" }}
                disabled={!canApprove}
                onClick={approve}
              >
                {busy === "approve" ? "Approving…" : review.approvedAt ? "Approved" : "Approve next week"}
              </button>
              <div className="mu" style={{ textAlign: "center", marginTop: 7, lineHeight: 1.5 }}>
                {review.approvedAt
                  ? `Approved ${new Date(review.approvedAt).toLocaleDateString()}.`
                  : !signal.day_id
                    ? "This one can't be applied — it doesn't say which session it came from."
                    : unreviewed > 0
                      ? `Mark every exercise Good or Bad to approve · ${unreviewed} left`
                      : "Good ones go into next week's session. Bad ones don't — that exercise stays as programmed."}
              </div>
            </div>
          </div>
        )}

        {failed && <InfoBanner icon="ph-warning">{failed}</InfoBanner>}

        {canOpenSession && (
          <button className="link-row" style={{ padding: "12px 12px" }} disabled={!!busy} onClick={onOpenSession}>
            <i className="ph ph-arrow-square-out" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5 }}>Open their session</div>
              <div className="mu" style={{ marginTop: 1 }}>
                {exercise
                  ? `Goes straight to ${exercise} on the day it happened, where you can swap or drop it.`
                  : signal.kind === "progression"
                    ? "Opens the session these numbers came from."
                    : "Opens the day it was reported on, where you can say which exercise it was and act on it."}
              </div>
            </div>
          </button>
        )}

        {signal.kind === "progression" ? null : exercise ? (
          <button className="link-row" style={{ padding: "12px 12px" }} disabled={!!busy} onClick={addWarmup}>
            <i className="ph ph-thermometer-simple" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5 }}>{busy === "warmup" ? "Adding…" : "Add a warm-up set"}</div>
              <div className="mu" style={{ marginTop: 1 }}>One more warm-up on {exercise}, every session that's left. Keeps the working volume.</div>
            </div>
          </button>
        ) : (
          <div className="mu" style={{ lineHeight: 1.55 }}>
            {signal.kind === "joint"
              ? `${first} didn't name an exercise, so there's nothing to add a warm-up to from here — open the session and you can pick which one it was.`
              : "Open the session to see what they logged."}
          </div>
        )}
      </div>
    </div>
  );
}
