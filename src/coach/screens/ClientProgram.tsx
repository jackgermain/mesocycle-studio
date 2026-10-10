import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StoreProvider, useStore } from "../../state/store";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { BackHeader, InfoBanner, Stepper } from "../../components/UI";
import { dayDisplayTitle, friendlyDate } from "../../data/dayNumbering";
import { phaseLabelForWeek } from "../../data/phaseLabels";
import { isoToday } from "../../shared/dayStatus";
import { dayIsAhead, lockReason } from "../../shared/forwardOnly";
import { LOAD_LABELS, LOAD_RANGE, loadModeOf } from "../loadMode";
import type { Program, TrainingDay, WorkExercise, WorkSet } from "../../data/types";

/** Hand-writing a client's prescription: the numbers themselves, week by week, day by day.
 *
 * **This is the screen the coach side did not have.** There were seventeen coach routes and not one of them
 * opened a client's block to change a number. The only ways a figure could reach a roster client's program
 * were to replace the whole program (which also replaces every logged session inside it, since the sets and
 * their statuses live in that same object), to let the AI editor do it, or to wait for the progression
 * algorithm to propose something and correct the proposal. That last one is why every complaint about the
 * app "changing my program" was really a complaint about the only lever that existed.
 *
 * Built on the same pattern as `NutritionProtocol` and `LogSession`: mount the CLIENT'S own `StoreProvider`
 * under their real account id, and every reducer the client-facing app already has operates on them. So
 * this needed no new editing logic beyond `EDIT_PRESCRIPTION` — the one act the reducer genuinely could not
 * perform, because `EDIT_SET_TARGET` writes `actual` (what was lifted) and nothing wrote `prescribed`.
 *
 * Forward only, per Jack. A logged session is the record every progression, volume rule and chart reads
 * from; the rule is in `shared/forwardOnly.ts` and the reducer enforces it independently of this screen.
 */
export default function ClientProgram() {
  const { clientId = "" } = useParams();
  const { state: coachState } = useCoachStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const client = coachState.clients.find((c) => c.id === clientId);

  if (!client) return <div className="screen-scroll">Not found.</div>;

  if (!client.accountId) {
    return (
      <div className="screen">
        <BackHeader kicker={client.name} title="Program" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-hourglass">
            {client.name.split(" ")[0]} hasn't accepted their invite yet — you can write their numbers once they have.
          </InfoBanner>
        </div>
      </div>
    );
  }

  return (
    <StoreProvider accountId={client.accountId} ownerName={client.name} coachName={account?.display_name ?? "Coach"}>
      <ProgramGate clientName={client.name} onBack={() => nav(`/coach/clients/${clientId}`)} />
    </StoreProvider>
  );
}

/** Waits for the client's row before the editor mounts.
 *
 * Split in two deliberately. The editor seeds `useState` from the program (which week to open on), and a
 * component that mounts once before its data arrives and again after would capture the empty value forever
 * — the same trap documented for `Reorder` in CLAUDE.md. Hoisting a hook is not enough when the state is
 * seeded from the thing being awaited; the mount has to be delayed instead. */
export function ProgramGate({ clientName, onBack }: { clientName: string; onBack: () => void }) {
  const { state, ready } = useStore();

  if (!ready) {
    return (
      <div className="screen">
        <BackHeader kicker={clientName} title="Program" onBack={onBack} />
        <div className="screen-scroll">Loading…</div>
      </div>
    );
  }

  if (state.program.weeks.length === 0) {
    return (
      <div className="screen">
        <BackHeader kicker={clientName} title="Program" onBack={onBack} />
        <div className="screen-scroll">
          <InfoBanner icon="ph-barbell">
            {clientName.split(" ")[0]} has no program yet. Assign one first, then come back here to set the numbers.
          </InfoBanner>
        </div>
      </div>
    );
  }

  return <ProgramEditor clientName={clientName} onBack={onBack} />;
}

/** The week to open on: the one today falls in, else the first with anything still ahead, else the last.
 *
 * Opening on week 1 of a block in its fourth week would put the coach on a screen where every day is
 * locked, which reads as the editor being broken rather than as history being protected. */
function openingWeek(program: Program, today: string): number {
  const containingToday = program.weeks.find((w) => w.days.some((d) => d.date === today));
  if (containingToday) return containingToday.number;
  const firstAhead = program.weeks.find((w) => w.days.some((d) => dayIsAhead(d, today)));
  if (firstAhead) return firstAhead.number;
  return program.weeks[program.weeks.length - 1]?.number ?? 1;
}

function ProgramEditor({ clientName, onBack }: { clientName: string; onBack: () => void }) {
  const { state } = useStore();
  const today = isoToday();
  const program = state.program;
  const [weekNumber, setWeekNumber] = useState(() => openingWeek(program, today));

  // The program can change under us (a client finishing a session, a reassignment), so never trust a stored
  // week number to still exist.
  const week = program.weeks.find((w) => w.number === weekNumber) ?? program.weeks[0];
  const editableDays = week.days.filter((d) => dayIsAhead(d, today)).length;

  return (
    <div className="screen">
      <BackHeader kicker={clientName} title="Program" onBack={onBack} />
      <div className="screen-scroll">
        <WeekPicker program={program} today={today} selected={week.number} onSelect={setWeekNumber} />

        <div className="mu" style={{ margin: "2px 0 12px", fontSize: 11.5 }}>
          {phaseLabelForWeek(program, week)} · {week.days.length} session{week.days.length === 1 ? "" : "s"}
          {editableDays === 0 ? " · all logged" : ` · ${editableDays} still ahead`}
        </div>

        {editableDays < week.days.length && (
          <InfoBanner icon="ph-lock-simple">
            Sessions already logged are shown but can't be changed — they're the record your progressions and
            charts are read from. Edits apply forward only.
          </InfoBanner>
        )}

        {week.days.map((day) => (
          <DayCard key={day.id} day={day} today={today} />
        ))}
      </div>
    </div>
  );
}

/** Horizontal week strip. Reads as a row of weeks and every one is a real button with a 44px target —
 * the Progress tab's week bar learned the same lesson: a 3px bar is not a control. */
function WeekPicker({
  program,
  today,
  selected,
  onSelect,
}: {
  program: Program;
  today: string;
  selected: number;
  onSelect: (n: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 0 10px", scrollbarWidth: "none" }}>
      {program.weeks.map((w) => {
        const on = w.number === selected;
        const allLogged = w.days.length > 0 && w.days.every((d) => !dayIsAhead(d, today));
        return (
          <button
            key={w.number}
            onClick={() => onSelect(w.number)}
            aria-pressed={on}
            style={{
              flex: "none",
              minWidth: 52,
              minHeight: 44,
              borderRadius: 10,
              border: on ? "1px solid var(--color-accent)" : "1px solid var(--color-line)",
              background: on ? "color-mix(in srgb, var(--color-accent) 14%, transparent)" : "transparent",
              color: on ? "var(--color-accent)" : allLogged ? "var(--color-muted)" : "var(--color-text)",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <span>W{w.number}</span>
            <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.75, letterSpacing: 0.3 }}>
              {w.phase === "deload" ? "DL" : allLogged ? "DONE" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DayCard({ day, today }: { day: TrainingDay; today: string }) {
  const locked = lockReason(day, today);
  const exercises = day.order.map((id) => day.exercises[id]).filter(Boolean);

  return (
    <div className="card" style={{ marginBottom: 12, opacity: locked ? 0.72 : 1 }}>
      <div className="row" style={{ alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{dayDisplayTitle(day)}</span>
        <span className="mu" style={{ fontSize: 11 }}>{day.label}</span>
        <span style={{ flex: 1 }} />
        {locked && (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 0.4,
              padding: "3px 7px",
              borderRadius: 6,
              border: "1px solid var(--color-line)",
              color: "var(--color-muted)",
            }}
          >
            {locked === "logged" ? "LOGGED" : "PAST"}
          </span>
        )}
      </div>
      <div className="mu" style={{ fontSize: 11, marginBottom: 10 }}>
        {friendlyDate(day.date)}
        {day.muscleSummary ? ` · ${day.muscleSummary}` : ""}
      </div>

      {exercises.length === 0 && <div className="mu" style={{ fontSize: 12 }}>No exercises in this session.</div>}

      {exercises.map((ex) => (
        <ExerciseRows key={ex.id} dayId={day.id} ex={ex} locked={locked !== null} />
      ))}
    </div>
  );
}

function ExerciseRows({ dayId, ex, locked }: { dayId: string; ex: WorkExercise; locked: boolean }) {
  const { dispatch } = useStore();
  const mode = loadModeOf(ex);
  const work = ex.sets.filter((s) => !s.removed);

  return (
    <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: 9, marginTop: 9 }}>
      <div className="row" style={{ alignItems: "baseline", gap: 7, marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, fontWeight: 650, flex: 1 }}>{ex.name}</span>
        {ex.supersetId && (
          <span
            title="Part of a superset — one set of each member is one round."
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.4, color: "var(--color-accent)" }}
          >
            SUPERSET
          </span>
        )}
        <span className="mu" style={{ fontSize: 10.5 }}>{ex.muscle}</span>
      </div>

      {work.map((set) => (
        <SetRow key={set.id} dayId={dayId} ex={ex} set={set} mode={mode} locked={locked} />
      ))}

      {!locked && (
        <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
          <SmallButton onClick={() => dispatch({ type: "ADD_SET", dayId, exerciseId: ex.id })}>+ Set</SmallButton>
          {work.length > 1 && (
            // DROP_SET, not REMOVE_SET: the client-facing one marks the set `removed` with a reason and
            // files a removal record, which is "I skipped this and here's why". A coach deciding against a
            // set is changing the prescription, so the set simply goes.
            <SmallButton onClick={() => dispatch({ type: "DROP_SET", exerciseKey: ex.id, scope: "day", dayId })}>
              − Set
            </SmallButton>
          )}
        </div>
      )}
    </div>
  );
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        minHeight: 34,
        padding: "0 11px",
        borderRadius: 8,
        border: "1px solid var(--color-line)",
        background: "transparent",
        color: "var(--color-text)",
        fontSize: 11.5,
        fontWeight: 650,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SetRow({
  dayId,
  ex,
  set,
  mode,
  locked,
}: {
  dayId: string;
  ex: WorkExercise;
  set: WorkSet;
  mode: ReturnType<typeof loadModeOf>;
  locked: boolean;
}) {
  const { dispatch } = useStore();
  // A ticked set inside an open session is history too, so it locks on its own — see forwardOnly.ts. The
  // reducer refuses it either way; this is so the screen says the same thing the reducer will do.
  const readOnly = locked || set.checked;
  const edit = (patch: { reps?: number; load?: number | null; effort?: number }) =>
    dispatch({ type: "EDIT_PRESCRIPTION", dayId, exerciseId: ex.id, setId: set.id, ...patch });

  const reps = set.prescribed.reps;
  const range = LOAD_RANGE[mode];
  // In every mode but pounds the prescription lives in `effort.value` with `load` left null.
  const byEffort = mode !== "lb";
  const effortValue = typeof set.prescribed.effort?.value === "number" ? set.prescribed.effort.value : null;

  return (
    <div className="row" style={{ gap: 9, alignItems: "center", padding: "4px 0" }}>
      <span
        className="mu"
        style={{ width: 26, flex: "none", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3 }}
      >
        {set.isWarmup ? "WU" : set.index}
      </span>

      {/* Reps. An AMRAP set prescribes "6+" rather than a number, which no stepper can represent — shown as
          it is rather than silently rounded into a number that changes what the set means. */}
      {typeof reps === "number" && !readOnly ? (
        <Stepper value={reps} onChange={(n) => edit({ reps: Math.max(0, n) })} unitLabel={ex.timed ? "SEC" : "REPS"} />
      ) : (
        <span style={{ fontSize: 13, fontWeight: 650, minWidth: 46 }}>
          {reps}
          <span className="mu" style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 3 }}>
            {ex.timed ? "SEC" : "REPS"}
          </span>
        </span>
      )}

      <span style={{ flex: 1 }} />

      {/* Load, or the effort number that stands in for it. */}
      {readOnly ? (
        <span style={{ fontSize: 13, fontWeight: 650 }}>
          {byEffort
            ? `${effortValue ?? "—"} ${LOAD_LABELS[mode]}`
            : set.prescribed.load == null
              ? "Bodyweight"
              : `${set.prescribed.load} ${LOAD_LABELS.lb}`}
        </span>
      ) : byEffort ? (
        <Stepper
          value={effortValue ?? range.min}
          onChange={(n) => edit({ effort: n })}
          step={range.step}
          min={range.min}
          max={range.max}
          unitLabel={LOAD_LABELS[mode]}
        />
      ) : set.prescribed.load == null ? (
        <SmallButton onClick={() => edit({ load: 0 })}>Bodyweight · add load</SmallButton>
      ) : (
        <Stepper
          value={set.prescribed.load}
          onChange={(n) => edit({ load: n })}
          step={range.step}
          min={range.min}
          max={range.max}
          unitLabel={LOAD_LABELS.lb}
        />
      )}
    </div>
  );
}
