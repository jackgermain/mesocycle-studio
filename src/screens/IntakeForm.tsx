import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { CloseHeader, InfoBanner } from "../components/UI";
import {
  GOAL_LABELS, GYM_ACCESS_LABELS, INTAKE_VERSION, RECOVERY_MUSCLES, SESSION_LENGTH_LABELS,
  TRAINING_AGE_LABELS, blankIntake, isIntakeUsable,
  type Goal, type GymAccess, type Intake, type SessionLength, type TrainingAge,
} from "../shared/intake";

/** The intake questionnaire.
 *
 * Structured fields and free text side by side on purpose. The structured half is what rules can compute
 * against -- how many days, what equipment, how long they've trained. The free text is where everything
 * nobody anticipated lives, and it is what the model reads: a shoulder that only complains after benching,
 * a condition that changes what's safe, a job that rules out mornings.
 *
 * Nothing is required. A half-finished intake is worth more than none, and the builder's job is to say
 * what it couldn't determine rather than to refuse. */
export default function IntakeForm() {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const [draft, setDraft] = useState<Intake>(() => ({ ...blankIntake(), ...(state.intake ?? {}) }));

  const set = <K extends keyof Intake>(key: K, value: Intake[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function toggleMuscle(m: string) {
    setDraft((d) => {
      const cur = d.slowToRecover ?? [];
      return { ...d, slowToRecover: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] };
    });
  }

  function save() {
    dispatch({ type: "SET_INTAKE", intake: { ...draft, completedAt: new Date().toISOString(), version: INTAKE_VERSION } });
    dispatch({ type: "SHOW_TOAST", message: "Saved — your coach can see this now." });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2800);
    nav(-1);
  }

  return (
    <div className="screen">
      <CloseHeader kicker="About you" title="A few things first" />
      <div className="screen-scroll">
        <InfoBanner icon="ph-info">
          This is what your programming gets built from. Skip anything you'd rather not answer — it just
          means fewer things can be tailored.
        </InfoBanner>

        <Choice
          label="How long have you been training?"
          options={Object.entries(TRAINING_AGE_LABELS) as [TrainingAge, string][]}
          value={draft.trainingAge}
          onPick={(v) => set("trainingAge", v)}
        />

        <Choice
          label="What are you after?"
          options={Object.entries(GOAL_LABELS) as [Goal, string][]}
          value={draft.goal}
          onPick={(v) => set("goal", v)}
        />

        <div>
          <div className="sh">How many days a week can you train?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                className={`chip${draft.sessionsPerWeek === n ? " on" : ""}`}
                onClick={() => set("sessionsPerWeek", draft.sessionsPerWeek === n ? undefined : n)}
              >
                <span className="mono">{n}</span>
              </button>
            ))}
          </div>
        </div>

        <Choice
          label="How long is a session?"
          options={Object.entries(SESSION_LENGTH_LABELS) as [SessionLength, string][]}
          value={draft.sessionLength}
          onPick={(v) => set("sessionLength", v)}
        />

        <Choice
          label="Where do you train?"
          options={Object.entries(GYM_ACCESS_LABELS) as [GymAccess, string][]}
          value={draft.gymAccess}
          onPick={(v) => set("gymAccess", v)}
        />

        <div className="field">
          <label>What equipment do you actually have?</label>
          <textarea
            className="input"
            style={{ minHeight: 76, lineHeight: 1.5 }}
            value={draft.equipmentNotes ?? ""}
            onChange={(e) => set("equipmentNotes", e.target.value)}
            placeholder="Machines, brands, dumbbell range, anything missing. The more specific the better — it decides which exercises can be prescribed."
          />
        </div>

        <div className="field">
          <label>Any injuries, past or present?</label>
          <textarea
            className="input"
            style={{ minHeight: 76, lineHeight: 1.5 }}
            value={draft.injuries ?? ""}
            onChange={(e) => set("injuries", e.target.value)}
            placeholder="What, when, and what makes it worse. 'Right shoulder, hurts overhead but only after benching' is more useful than 'shoulder'."
          />
        </div>

        <div className="field">
          <label>Any medical conditions we should know about?</label>
          <textarea
            className="input"
            style={{ minHeight: 64, lineHeight: 1.5 }}
            value={draft.conditions ?? ""}
            onChange={(e) => set("conditions", e.target.value)}
            placeholder="Anything that changes what's safe or sensible for you to train."
          />
          <div className="mu" style={{ marginTop: 6 }}>
            {state.program.coachName} reads this personally. Nothing here is used to make a medical decision.
          </div>
        </div>

        <div>
          <div className="sh">Anything that's slow to recover?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {RECOVERY_MUSCLES.map((m) => (
              <button
                key={m}
                className={`chip${draft.slowToRecover?.includes(m) ? " on" : ""}`}
                onClick={() => toggleMuscle(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Anything else worth knowing?</label>
          <textarea
            className="input"
            style={{ minHeight: 76, lineHeight: 1.5 }}
            value={draft.anythingElse ?? ""}
            onChange={(e) => set("anythingElse", e.target.value)}
            placeholder="Schedule, sleep, stress, what you enjoy, what you'll never do."
          />
        </div>

        <div className="field">
          <label>Age (optional)</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            value={draft.age ?? ""}
            onChange={(e) => set("age", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g. 34"
          />
        </div>

        {!isIntakeUsable(draft) && (
          <InfoBanner icon="ph-info">
            Training history, goal, days a week and where you train are the four that most change what gets
            built. You can still save without them.
          </InfoBanner>
        )}

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Choice<T extends string>({
  label, options, value, onPick,
}: {
  label: string;
  options: [T, string][];
  value: T | undefined;
  onPick: (v: T | undefined) => void;
}) {
  return (
    <div>
      <div className="sh">{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(([v, text]) => (
          <button key={v} className={`chip${value === v ? " on" : ""}`} onClick={() => onPick(value === v ? undefined : v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
