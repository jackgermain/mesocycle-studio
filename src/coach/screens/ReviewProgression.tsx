import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { BackHeader, InfoBanner, Stepper } from "../../components/UI";
import { acknowledgeSignal, getSignal, type ClientSignal } from "../../shared/signals";
import { noteSignalCleared } from "../../shared/openSignals";
import { EFFORT_WORDING } from "../../shared/signalScales";
import { formatSets, plainWhy, proposedSets, readProgression, type ProgressionPayload } from "../../shared/progressionProposal";
import { saveProgressionPayload } from "../../shared/progressionReview";
import { applyProgressionForClient, readClientProgram } from "../clientProgramEdits";
import { dayDisplayTitle } from "../../data/dayNumbering";
import type { PerformedSet } from "../../generator/doubleProgression";

interface Draft {
  sets: PerformedSet[];
  reason: string;
}

/** Next week's numbers, reviewed one exercise at a time.
 *
 * Each exercise is its own decision with its own submit: approve what's suggested, or edit the sets and say
 * why. The reason is required on an edit, because a changed number with no reason teaches nothing. Every
 * submission goes into next week straight away, so a review abandoned halfway still keeps what was
 * decided. The desk notification clears once the last one is in. */
export default function ReviewProgression() {
  const { signalId = "" } = useParams();
  const { state, dispatch } = useCoachStore();
  const { account } = useAuth();
  const [signal, setSignal] = useState<ClientSignal | null>(null);
  const [payload, setPayload] = useState<ProgressionPayload | null>(null);
  const [sourceDayId, setSourceDayId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const s = await getSignal(signalId);
      const p = s ? readProgression(s) : null;
      let dayId = s?.day_id ?? p?.dayId ?? null;
      // Sent before the session's id was stored anywhere: find it by week and day label in the program.
      if (s && p && !dayId && s.day_label) {
        const program = await readClientProgram(s.client_id);
        const week = program?.weeks.find((w) => w.number === p.week);
        dayId = week?.days.find((d) => dayDisplayTitle(d) === s.day_label)?.id ?? null;
      }
      if (!active) return;
      setSignal(s);
      setPayload(p);
      setSourceDayId(dayId);
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [signalId]);

  const units = useMemo(() => {
    const text = payload?.proposals.map((p) => `${p.next} ${p.logged}`).join(" ") ?? "";
    return /\s(lb|kg)\b/.exec(text)?.[1] ?? "lb";
  }, [payload]);

  if (!loaded) {
    return (
      <div className="screen">
        <BackHeader kicker="Desk" title="Next week's numbers" />
        <div className="screen-scroll"><div className="mu">Loading…</div></div>
      </div>
    );
  }
  if (!signal || !payload) {
    return (
      <div className="screen">
        <BackHeader kicker="Desk" title="Next week's numbers" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-warning">This review couldn't be opened. It may already be done, or the numbers in it couldn't be read.</InfoBanner>
        </div>
      </div>
    );
  }

  const isSelf = signal.client_id === account?.id;
  const clientName = isSelf ? "You" : state.clients.find((c) => c.accountId === signal.client_id)?.name ?? "A client";
  const whose = isSelf ? "your" : `${clientName.split(" ")[0]}'s`;
  const total = payload.proposals.length;
  const done = payload.proposals.filter((_, i) => payload.reviews?.[String(i)]).length;

  function startEdit(key: string, suggested: PerformedSet[]) {
    const sets = suggested.length ? suggested.map((s) => ({ ...s })) : [{ reps: 10, load: null }];
    setEditing((e) => ({ ...e, [key]: { sets, reason: "" } }));
  }

  function changeDraft(key: string, change: (d: Draft) => Draft) {
    setEditing((e) => (e[key] ? { ...e, [key]: change(e[key]) } : e));
  }

  function stopEdit(key: string) {
    setEditing((e) => {
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  }

  async function submit(idx: number, verdict: "approved" | "edited", sets: PerformedSet[], note?: string) {
    if (!signal || !payload) return;
    const key = String(idx);
    const proposal = payload.proposals[idx];
    setBusy(key);
    setError(null);

    let applied = false;
    if (proposal.move !== "finished" && sourceDayId && sets.length > 0) {
      const touched = await applyProgressionForClient(signal.client_id, sourceDayId, payload, (i) => (i === idx ? sets : null));
      if (touched === null) {
        setBusy(null);
        setError(`Couldn't update ${whose} program — check your connection and submit again.`);
        return;
      }
      applied = touched > 0;
    }

    const reviews = { ...(payload.reviews ?? {}), [key]: { verdict, sets, note, at: new Date().toISOString(), applied } };
    const complete = payload.proposals.every((_, i) => reviews[String(i)]);
    const next: ProgressionPayload = { ...payload, reviews, completedAt: complete ? new Date().toISOString() : payload.completedAt };
    const saved = await saveProgressionPayload(signal.id, next);
    setBusy(null);
    if (!saved) {
      // Submitting again is safe: writing the same sets into next week twice changes nothing.
      setError(applied ? "Next week was updated, but the review didn't save — submit again." : "That didn't save — check your connection and submit again.");
      return;
    }
    setPayload(next);
    stopEdit(key);
    if (complete) {
      if (await acknowledgeSignal(signal.id)) noteSignalCleared();
      dispatch({ type: "SHOW_TOAST", message: `All ${total} reviewed — next week is set.` });
      setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
    }
  }

  return (
    <div className="screen">
      <BackHeader
        kicker={`${clientName} · ${signal.day_label ?? "Session"} · week ${payload.week} of ${payload.totalWeeks}`}
        title="Next week's numbers"
      />
      <div className="screen-scroll">
        <InfoBanner icon="ph-info">
          Go through each exercise. Approve what's suggested, or tap Edit, change the numbers and say why. Each one goes into {whose} next week as soon as you submit it.
        </InfoBanner>

        {!sourceDayId && (
          <InfoBanner icon="ph-warning">
            Couldn't find which session these came from, so submitting saves your review but can't change next week.
          </InfoBanner>
        )}

        <div className="sh" style={{ margin: 0 }}>{done} of {total} done</div>

        {done === total && (
          <InfoBanner icon="ph-check-circle" tone="accent">All {total} reviewed — next week is set.</InfoBanner>
        )}
        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

        {payload.proposals.map((p, idx) => {
          const key = String(idx);
          const review = payload.reviews?.[key];
          const draft = editing[key];
          const suggested = proposedSets(p) ?? [];
          const canSubmitEdit = !!draft && draft.reason.trim().length > 0 && draft.sets.length > 0 && busy === null;
          return (
            <div
              key={key}
              className="cell elev-sm"
              style={{ display: "flex", flexDirection: "column", gap: 10, borderLeft: review ? "2px solid var(--color-accent)" : undefined }}
            >
              <div className="row" style={{ gap: 10 }}>
                <div
                  style={{
                    width: 28, height: 28, flex: "none", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-heading)", fontSize: 12.5,
                    background: review ? "var(--color-accent-900)" : "var(--color-neutral-900)",
                    color: review ? "var(--color-accent-300)" : "var(--color-neutral-400)",
                  }}
                >
                  {review ? <i className="ph-fill ph-check" style={{ fontSize: 12 }} /> : idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontFamily: "var(--font-heading)" }}>{p.exercise}</div>
                <span className={`tag ${review ? "tag-accent" : "tag-neutral"}`} style={{ flex: "none" }}>
                  {review ? (review.verdict === "approved" ? "Approved" : "Changed") : "To review"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "82px 1fr", rowGap: 6, columnGap: 10, fontSize: 13 }}>
                <span className="mu">This week</span>
                <span className="mono">{p.logged}</span>
                <span className="mu">How hard</span>
                <span>{p.effort ? `${p.effort} · ${EFFORT_WORDING[p.effort - 1] ?? ""}` : "Not rated"}</span>
                <span className="mu">Suggested</span>
                <span className="mono" style={{ color: "var(--color-accent)", fontWeight: 700 }}>{p.next}</span>
                <span className="mu">Why</span>
                <span style={{ lineHeight: 1.5 }}>{plainWhy(p.why)}</span>
              </div>

              {review ? (
                <div className="mu" style={{ lineHeight: 1.55 }}>
                  {review.verdict === "approved"
                    ? `Approved — ${formatSets(review.sets, units)} next week.`
                    : `Changed to ${formatSets(review.sets, units)} — "${review.note}"`}
                  {!review.applied && p.move !== "finished"
                    ? " Saved, but next week's session was already started or isn't in the program, so nothing was written."
                    : ""}
                </div>
              ) : draft ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="sh" style={{ margin: 0 }}>Next week</div>
                  {draft.sets.map((s, k) => (
                    <div key={k} className="row" style={{ gap: 8 }}>
                      <span className="mono mu" style={{ width: 44, flex: "none" }}>Set {k + 1}</span>
                      <div className="row" style={{ gap: 5, flex: 1, justifyContent: "center" }}>
                        <Stepper
                          value={s.reps}
                          min={1}
                          width={32}
                          fontSize={16}
                          onChange={(v: number) => changeDraft(key, (d) => ({ ...d, sets: d.sets.map((x, j) => (j === k ? { ...x, reps: v } : x)) }))}
                        />
                        <span className="mu" style={{ fontSize: 11 }}>reps</span>
                      </div>
                      <div className="row" style={{ gap: 5, flex: 1, justifyContent: "center" }}>
                        <input
                          className="input mono"
                          type="number"
                          inputMode="decimal"
                          value={s.load ?? ""}
                          placeholder="BW"
                          aria-label={`Set ${k + 1} weight`}
                          style={{ width: 72, height: 38, textAlign: "center", padding: "0 6px" }}
                          onChange={(ev) => {
                            const n = parseFloat(ev.target.value);
                            changeDraft(key, (d) => ({ ...d, sets: d.sets.map((x, j) => (j === k ? { ...x, load: Number.isFinite(n) ? n : null } : x)) }));
                          }}
                        />
                        <span className="mu" style={{ fontSize: 11 }}>{units}</span>
                      </div>
                      <button
                        aria-label={`Remove set ${k + 1}`}
                        disabled={draft.sets.length <= 1}
                        onClick={() => changeDraft(key, (d) => ({ ...d, sets: d.sets.filter((_, j) => j !== k) }))}
                        style={{ flex: "none", background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", opacity: draft.sets.length <= 1 ? 0.3 : 1, padding: 4 }}
                      >
                        <i className="ph ph-x" style={{ fontSize: 15 }} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => changeDraft(key, (d) => ({ ...d, sets: [...d.sets, { ...(d.sets[d.sets.length - 1] ?? { reps: 10, load: null }) }] }))}
                    style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 5, padding: 0 }}
                  >
                    <i className="ph ph-plus-circle" style={{ fontSize: 14 }} />
                    Add a set
                  </button>
                  <div className="field">
                    <label>Why are you changing it?</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 72, lineHeight: 1.5 }}
                      value={draft.reason}
                      placeholder="e.g. Elbow was sore — keep it at 10 reps another week."
                      onChange={(ev) => changeDraft(key, (d) => ({ ...d, reason: ev.target.value }))}
                    />
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className="btn btn-solid"
                      style={{ flex: 1, height: 46, opacity: canSubmitEdit ? 1 : 0.45, cursor: canSubmitEdit ? "pointer" : "not-allowed" }}
                      disabled={!canSubmitEdit}
                      onClick={() => submit(idx, "edited", draft.sets, draft.reason.trim())}
                    >
                      {busy === key ? "Saving…" : "Submit change"}
                    </button>
                    <button className="btn btn-ghost" style={{ flex: "none", height: 46, padding: "0 16px" }} disabled={busy !== null} onClick={() => stopEdit(key)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-solid" style={{ flex: 1, height: 46 }} disabled={busy !== null} onClick={() => submit(idx, "approved", suggested)}>
                    {busy === key ? "Saving…" : "Approve"}
                  </button>
                  <button className="btn btn-secondary" style={{ flex: 1, height: 46 }} disabled={busy !== null} onClick={() => startEdit(key, suggested)}>
                    Edit
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
