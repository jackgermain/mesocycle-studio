import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { StoreProvider, useStore } from "../../state/store";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { BackHeader, InfoBanner } from "../../components/UI";
import { dayDisplayTitle } from "../../data/dayNumbering";
import { phaseLabelForWeek } from "../../data/phaseLabels";
import { ExerciseSection } from "../../screens/ExerciseSection";
import { equipmentOf } from "../../screens/exerciseHelpers";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { SwapScopeSheet } from "../../shared/SwapScopeSheet";
import { RemoveExerciseSheet } from "../../shared/RemoveExerciseSheet";
import { AiEditShell } from "../components/AiEditSheet";
import { reconcileLiveProgram, diffProgram, summarizeProgramForAi } from "../../shared/liveProgramAiEdit";
import { getSignal, type ClientSignal } from "../../shared/signals";
import { jointReasonLabels } from "../../data/mockData";
import type { Program, TrainingDay } from "../../data/types";
import type { LibraryExercise } from "../types";

/** Coach-side "I trained them in person today" logger. Wraps the client's own store — keyed by their
 * real account id — so a set logged here writes to the exact same place their own app reads from, same
 * as if they'd logged it themselves. Works for any client on the roster, not just one hardcoded id. */
export default function LogSession() {
  const { clientId = "" } = useParams();
  const { state: coachState } = useCoachStore();
  const { account } = useAuth();
  const client = coachState.clients.find((c) => c.id === clientId);
  const nav = useNavigate();

  if (!client) return <div className="screen-scroll">Not found.</div>;

  if (!client.accountId) {
    return (
      <div className="screen">
        <BackHeader kicker={client.name} title="Log a session" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-hourglass">{client.name.split(" ")[0]} hasn't accepted their invite yet — you can log for them once they have.</InfoBanner>
        </div>
      </div>
    );
  }

  return (
    <StoreProvider accountId={client.accountId} ownerName={client.name} coachName={account?.display_name ?? "Coach"}>
      <LogSessionInner clientName={client.name} onDone={() => nav(`/coach/clients/${clientId}`)} />
    </StoreProvider>
  );
}

/** Which session a report came from. `day_id` is the reliable answer but only exists from migration 0015
 * on, and even then the day can be gone -- reassigning or rebuilding a program replaces every day in it,
 * so a report can outlive the session it describes. Falling back to the calendar date the report was
 * filed on catches the older ones, since feedback is answered at the end of the session it's about.
 * Returns null when the original session genuinely isn't in the program any more, which the screen says
 * out loud rather than quietly showing today's instead. */
function resolveReportedDay(program: Program, signal: ClientSignal | null): { dayId: string | null; exact: boolean } {
  const miss = { dayId: null, exact: false };
  if (!signal) return miss;
  const days = program.weeks.flatMap((w) => w.days);
  if (days.length === 0) return miss;

  if (signal.day_id && days.some((d) => d.id === signal.day_id)) return { dayId: signal.day_id, exact: true };

  const filed = new Date(signal.created_at);
  const iso = `${filed.getFullYear()}-${String(filed.getMonth() + 1).padStart(2, "0")}-${String(filed.getDate()).padStart(2, "0")}`;
  const sameDay = days.find((d) => d.date === iso);
  if (sameDay) return { dayId: sameDay.id, exact: true };

  // Nothing lines up by date, so the program was rebuilt after this was filed. The best remaining guess is
  // the last session they actually trained on or before that date -- feedback is answered at the end of a
  // session, so that's the one it describes. Landing on a near-miss beats dumping the coach into a
  // thirty-row picker, which is where this used to end up -- but it is a guess, and the screen says so.
  const before = days.filter((d) => d.date <= iso);
  const trained = [...before].reverse().find((d) => Object.values(d.exercises).some((ex) => ex.sets.some((s) => s.checked)));
  return { dayId: trained?.id ?? before[before.length - 1]?.id ?? days[0].id, exact: false };
}

/** Arriving from a pain report on the desk. The whole point is to land on the day it happened rather than
 * make the coach find it among thirty, so the report is resolved before the body mounts and the day
 * picker is skipped entirely. Split out for the same reason as Reorder: the selected day is *seeded* from
 * the report, so the hook holding it can't run until the report is in hand. */
function LogSessionInner({ clientName, onDone }: { clientName: string; onDone: () => void }) {
  const [params] = useSearchParams();
  const signalId = params.get("signal");
  const [signal, setSignal] = useState<ClientSignal | null | undefined>(signalId ? undefined : null);

  useEffect(() => {
    if (!signalId) return;
    let active = true;
    getSignal(signalId).then((s) => active && setSignal(s));
    return () => {
      active = false;
    };
  }, [signalId]);

  if (signal === undefined) {
    return (
      <div className="screen">
        <BackHeader kicker={clientName} title="Log a session" />
        <div className="screen-scroll">
          <div className="mu" style={{ textAlign: "center", padding: 24 }}>Loading…</div>
        </div>
      </div>
    );
  }

  return <LogSessionBody clientName={clientName} onDone={onDone} signal={signal} requestedDay={params.get("day")} requestedExercise={params.get("exercise")} />;
}

function LogSessionBody({
  clientName,
  onDone,
  signal,
  requestedDay,
  requestedExercise,
}: {
  clientName: string;
  onDone: () => void;
  signal: ClientSignal | null;
  requestedDay: string | null;
  requestedExercise: string | null;
}) {
  const { state, dispatch } = useStore();
  const todayDay = state.program.weeks.flatMap((w) => w.days).find((d) => d.status === "today");

  const reported = resolveReportedDay(state.program, signal);
  const [selectedId, setSelectedId] = useState<string | null>(reported.dayId ?? requestedDay ?? todayDay?.id ?? null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [swapKey, setSwapKey] = useState<string | null>(requestedExercise);
  // A report from before the client was asked which exercise it was (or where they said it wasn't any
  // single one) still deserves to be actionable -- the coach usually knows, or can ask. Naming it here
  // unlocks the same swap/warm-up/remove actions as a report that came with one.
  const [manualExercise, setManualExercise] = useState<string | null>(null);
  // Whether the swap in flight came from the pain card. Only affects which muscle the picker opens
  // filtered to -- the scope is always asked, because "just this session" and "for the rest of the block"
  // are both real answers to pain and only the coach knows which one they mean.
  const [painScope, setPainScope] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeKey, setRemoveKey] = useState<string | null>(null);
  const [showAiEdit, setShowAiEdit] = useState(false);
  // Picking the replacement and deciding how far it reaches are two steps: the picked exercise is held
  // here until a scope is chosen, so nothing is written until the coach says how far it should go.
  // Declared up here with the rest, not down beside applySwap where it reads better -- everything below
  // is past an early return, and a hook there only runs on some renders (React error #310).
  const [pendingSwap, setPendingSwap] = useState<LibraryExercise | null>(null);
  const nav = useNavigate();

  if (!selectedId) {
    return (
      <div className="screen">
        <BackHeader kicker={clientName} title="Log a session" />
        <div className="screen-scroll">
          {state.program.weeks.length === 0 ? (
            <InfoBanner icon="ph-hourglass">{clientName.split(" ")[0]} doesn't have a program built yet — add days and exercises from Programs first, then come back here to log for them.</InfoBanner>
          ) : (
            <>
              <InfoBanner icon="ph-user-focus">You're logging a set for {clientName} — it lands in their app exactly as if they'd tapped it in themselves.</InfoBanner>
              <DayPicker program={state.program} onPick={setSelectedId} />
            </>
          )}
        </div>
      </div>
    );
  }

  const found = state.program.weeks.flatMap((w) => w.days.map((d) => ({ d, w }))).find((x) => x.d.id === selectedId);
  if (!found) return <div className="screen-scroll">Not found.</div>;
  const { d: day, w: week } = found;
  const exIds = day.order.length ? day.order : Object.keys(day.exercises);
  const swappingEx = swapKey ? day.exercises[swapKey] : null;

  // The report names the exercise, not its key, so it's matched back by name within this day. It can come
  // up empty -- the movement may already have been swapped out since -- in which case the report is still
  // worth showing, just without the actions.
  const painName = signal?.exercise ?? manualExercise;
  const painKey = painName
    ? exIds.find((id) => day.exercises[id]?.name.trim().toLowerCase() === painName.trim().toLowerCase()) ?? null
    : null;
  const painEx = painKey ? day.exercises[painKey] : null;
  const reportedDayGuessed = !!signal && !reported.exact;

  /** The open report as a sentence, so an instruction like "swap this for something easier on his
   * shoulder" resolves without the coach restating any of it. */
  const painContext = signal
    ? [
        `${clientName.split(" ")[0]} reported ${signal.kind === "joint" ? "joint pain" : signal.kind === "soreness" ? "unrecovered soreness" : "a low pump"}`,
        signal.note ? `at the ${signal.note}` : null,
        signal.exercise ? `on ${signal.exercise}` : null,
        `severity ${signal.severity}${signal.kind === "joint" ? ` of 4 (${jointReasonLabels[signal.severity - 1]})` : " of 5"}`,
        signal.detail ? `— ${signal.detail}` : null,
        `Reported ${new Date(signal.created_at).toLocaleDateString()}; you're looking at ${dayDisplayTitle(day)} of week ${week.number}.`,
      ]
        .filter(Boolean)
        .join(" ")
    : undefined;

  function toast(message: string) {
    dispatch({ type: "SHOW_TOAST", message });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  }

  function applySwap(scope: "day" | "mesocycle") {
    if (!swapKey || !pendingSwap) return;
    dispatch({
      type: "SWAP_EXERCISE",
      exerciseKey: swapKey,
      replacement: { name: pendingSwap.name, muscle: pendingSwap.muscle, equipment: equipmentOf({ name: pendingSwap.name }), hasVideo: pendingSwap.hasVideo },
      scope,
      dayId: day.id,
    });
    toast(scope === "day" ? `Swapped to ${pendingSwap.name} for today.` : `Swapped to ${pendingSwap.name} for the rest of the block.`);
    setPendingSwap(null);
    setSwapKey(null);
    setPainScope(false);
  }

  function removePainExercise() {
    if (!painKey || !painEx) return;
    dispatch({ type: "REMOVE_EXERCISE", exerciseKey: painKey, scope: "mesocycle", dayId: day.id });
    toast(`${painEx.name} removed from the rest of the block.`);
    setConfirmRemove(false);
  }

  /** One warm-up added to every session this exercise still appears in -- same reach as the swap and the
   * removal beside it, so all three answers to a pain report behave the same way. */
  function addWarmupRestOfBlock() {
    if (!painKey || !painEx) return;
    let n = 0;
    for (const week of state.program.weeks) {
      for (const d of week.days) {
        if (d.status === "done" || !d.exercises[painKey]) continue;
        dispatch({ type: "ADD_SET", dayId: d.id, exerciseId: painKey, warmup: true });
        n++;
      }
    }
    toast(`Warm-up set added to ${painEx.name} — ${n} session${n === 1 ? "" : "s"} updated.`);
  }

  return (
    <div className="screen">
      <BackHeader
        kicker={`${clientName} · week ${week.number}`}
        title={dayDisplayTitle(day)}
        // Back goes up one level to the day list rather than straight out of the screen; from the list
        // itself it falls through to normal history and leaves. Replaces a "Pick a different day" row
        // that was doing the back button's job.
        onBack={() => setSelectedId(null)}
      />
      <div className="screen-scroll" onClick={() => openMenu && setOpenMenu(null)}>
        {signal ? (
          <div className="cell elev-sm" style={{ borderLeft: "2px solid var(--color-accent)", padding: 12 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Only claim "here" when this really is the session it came from. */}
                <div className="scr" style={{ color: "var(--color-accent-300)" }}>
                  {reported.exact && reported.dayId === day.id ? "Reported here" : `Reported ${new Date(signal.created_at).toLocaleDateString()}`}
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, marginTop: 2 }}>
                  {signal.kind === "joint" ? "Joint pain" : signal.kind === "soreness" ? "Still sore" : "Low pump"}
                  {signal.note ? ` — ${signal.note}` : ""}
                </div>
              </div>
              <span className="tag tag-accent" style={{ flex: "none" }}>
                {signal.severity}
                {signal.kind === "joint" ? " of 4" : " of 5"}
              </span>
            </div>
            {signal.kind === "joint" && (
              <div className="mu" style={{ lineHeight: 1.5 }}>
                {jointReasonLabels[signal.severity - 1]}
                {signal.exercise ? ` · on ${signal.exercise}` : ""}
                {signal.detail ? ` · ${signal.detail}` : ""}
              </div>
            )}

            {reportedDayGuessed && (
              <div className="mu" style={{ marginTop: 8, lineHeight: 1.5 }}>
                {clientName.split(" ")[0]} sent this on {new Date(signal.created_at).toLocaleDateString()}, but there's no
                session in their program from that day — the program changed after they sent it. {dayDisplayTitle(day)} is
                the closest one. Tap back to pick a different day.
              </div>
            )}

            {/* No exercise on the report -- either it predates the question or they said it wasn't any one
                movement. The coach usually knows which it was, so let them say and act on it. */}
            {!painEx && !painName && exIds.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="sh" style={{ marginTop: 0 }}>Which exercise was it?</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {exIds.map((id) => {
                    const ex = day.exercises[id];
                    if (!ex) return null;
                    return (
                      <button key={id} className="chip" onClick={() => setManualExercise(ex.name)}>
                        {ex.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!painEx && painName && (
              <div className="mu" style={{ marginTop: 8 }}>
                {painName} isn't in this session — it looks like it's already been changed.
              </div>
            )}

            {painEx && (
              <>
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button
                    className="btn btn-solid"
                    style={{ flex: 1, height: 34, fontSize: 12.5 }}
                    onClick={() => {
                      setPainScope(true);
                      setSwapKey(painKey);
                    }}
                  >
                    Swap it
                  </button>
                  <button className="btn btn-secondary" style={{ flex: 1, height: 34, fontSize: 12.5 }} onClick={() => setConfirmRemove(true)}>
                    Remove it
                  </button>
                </div>
                <button className="btn btn-secondary btn-block" style={{ height: 34, fontSize: 12.5, marginTop: 8 }} onClick={addWarmupRestOfBlock}>
                  <i className="ph ph-thermometer-simple" style={{ fontSize: 14 }} />
                  Add a warm-up set to {painEx.name}
                </button>
                <button className="btn btn-secondary btn-block" style={{ height: 34, fontSize: 12.5, marginTop: 8 }} onClick={() => setShowAiEdit(true)}>
                  <i className="ph ph-sparkle" style={{ fontSize: 14, color: "var(--color-accent-300)" }} />
                  Or say what you want done
                </button>
                <div className="mu" style={{ marginTop: 8 }}>All three apply to the rest of the block. Sessions already logged stay as they were.</div>
              </>
            )}
          </div>
        ) : (
          <InfoBanner icon="ph-user-focus">Logging for {clientName}, in person — this writes straight to their app.</InfoBanner>
        )}

        {exIds.map((id, i) => {
          const ex = day.exercises[id];
          if (!ex) return null;
          return (
            <ExerciseSection
              key={id}
              index={i + 1}
              dayId={day.id}
              ex={ex}
              menuOpen={openMenu === id}
              onToggleMenu={(e) => {
                e.stopPropagation();
                setOpenMenu((m) => (m === id ? null : id));
              }}
              onAddSet={() => {
                dispatch({ type: "ADD_SET", dayId: day.id, exerciseId: id });
                setOpenMenu(null);
              }}
              onAddWarmup={() => {
                dispatch({ type: "ADD_SET", dayId: day.id, exerciseId: id, warmup: true });
                setOpenMenu(null);
              }}
              // No reason asked here: a coach editing the prescription isn't explaining a missed set to
              // themselves. The set goes, and stays gone for the rest of the block.
              onRemoveSet={() => {
                setOpenMenu(null);
                dispatch({ type: "DROP_SET", exerciseKey: id, scope: "mesocycle", dayId: day.id });
                toast(`Dropped a set from ${ex.name} for the rest of the block.`);
              }}
              onSwap={() => {
                setOpenMenu(null);
                setSwapKey(id);
              }}
              onRemoveExercise={() => {
                setOpenMenu(null);
                setRemoveKey(id);
              }}
            />
          );
        })}

        <button className="cell row" style={{ padding: "12px 12px", textAlign: "left", cursor: "pointer" }} onClick={() => setShowAiEdit(true)}>
          <i className="ph ph-sparkle" style={{ fontSize: 18, color: "var(--color-accent-300)", marginRight: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>Edit with AI</div>
            <div className="mu" style={{ marginTop: 2 }}>
              Change {clientName.split(" ")[0]}'s numbers by asking — "add 5 reps next week". You check it before it saves.
            </div>
          </div>
          <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
        </button>

        <div style={{ paddingBottom: 8 }}>
          <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={onDone}>
            Done — back to {clientName.split(" ")[0]}
          </button>
          <div className="mu" style={{ textAlign: "center", marginTop: 7 }}>
            {clientName.split(" ")[0]} will see this the next time they open their app. They still answer their own pump/joint feedback for it.
          </div>
        </div>
      </div>

      {swapKey && swappingEx && !pendingSwap && (
        <ExercisePickerSheet
          kicker="Swap"
          title={swappingEx.name}
          excludeName={swappingEx.name}
          // Coming from a pain report, start filtered to the muscle being replaced -- the replacement has
          // to keep the same slot in the week, so the whole library isn't a useful starting point.
          initialMuscle={painScope ? swappingEx.muscle : undefined}
          onPick={setPendingSwap}
          onClose={() => {
            setSwapKey(null);
            setPainScope(false);
          }}
        />
      )}
      {swapKey && swappingEx && pendingSwap && (
        <SwapScopeSheet fromName={swappingEx.name} toName={pendingSwap.name} onChoose={applySwap} onClose={() => setPendingSwap(null)} />
      )}

      {showAiEdit && (
        <AiEditShell
          title={`${clientName} · ${state.program.name}`}
          examples={
            signal
              ? ["Swap that exercise for something easier on the joint", "Add two warm-up sets to it", "Drop it for the rest of the block", "Cut its load by 20% for the next two weeks"]
              : ["Add 5 reps to everything next week", "Add 10 lb to every lift next week", "Take next week's rest down to 60 seconds", "Make every exercise 1 set this week"]
          }
          context={painContext}
          placeholder={signal ? "e.g. swap that for something that doesn't bother his shoulder" : undefined}
          buildPayload={() => summarizeProgramForAi(state.program, week.number)}
          build={(result) => (result.weeks ? reconcileLiveProgram(state.program, result.weeks) : state.program)}
          diff={(next) => diffProgram(state.program, next)}
          onApply={(next, changes, summary) => {
            dispatch({
              type: "SET_PROGRAM",
              program: { ...next, lastAiEdit: { at: new Date().toISOString(), summary, exerciseIds: changes.map((c) => c.exerciseId).filter((id): id is string => !!id) } },
            });
            toast(`Applied — ${changes.length} change${changes.length === 1 ? "" : "s"}.`);
            setShowAiEdit(false);
          }}
          onClose={() => setShowAiEdit(false)}
        />
      )}

      {removeKey && day.exercises[removeKey] && (
        <RemoveExerciseSheet
          name={day.exercises[removeKey].name}
          onChoose={(scope) => {
            const removed = day.exercises[removeKey].name;
            dispatch({ type: "REMOVE_EXERCISE", exerciseKey: removeKey, scope, dayId: day.id });
            toast(scope === "day" ? `Removed ${removed} for today.` : `Removed ${removed} from the rest of the block.`);
            setRemoveKey(null);
          }}
          onClose={() => setRemoveKey(null)}
        />
      )}

      {confirmRemove && painEx && (
        <div className="sheet-backdrop" onClick={() => setConfirmRemove(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="scr">Remove</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, marginBottom: 6 }}>Drop {painEx.name}?</div>
            <div className="mu" style={{ lineHeight: 1.55 }}>
              It comes out of every session left in the block, and nothing replaces it — that muscle loses those sets for
              the rest of the mesocycle. Sessions already logged keep it.
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 42 }} onClick={() => setConfirmRemove(false)}>
                Keep it
              </button>
              <button className="btn btn-solid" style={{ flex: 1, height: 42 }} onClick={removePainExercise}>
                Remove it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DayPicker({ program, onPick }: { program: Program; onPick: (id: string) => void }) {
  return (
    <div>
      {program.weeks.map((week) => (
        <div key={week.number}>
          <div className="sh">
            Week {week.number} · {phaseLabelForWeek(program, week)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {week.days.map((day) => (
              <DayRow key={day.id} day={day} onPick={onPick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DayRow({ day, onPick }: { day: TrainingDay; onPick: (id: string) => void }) {
  const exIds = day.order.length ? day.order : Object.keys(day.exercises);
  const totalSets = exIds.reduce((n, id) => n + (day.exercises[id]?.sets.length ?? 0), 0);
  const doneSets = exIds.reduce((n, id) => n + (day.exercises[id]?.sets.filter((s) => s.checked).length ?? 0), 0);
  return (
    <button className="cell row" style={{ padding: "10px 12px", textAlign: "left", cursor: "pointer" }} onClick={() => onPick(day.id)}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5 }}>{dayDisplayTitle(day)}</div>
        <div className="mu" style={{ marginTop: 2 }}>
          {day.dow} · {day.date} · {doneSets} of {totalSets} sets logged
        </div>
      </div>
      {day.status === "today" && <span className="tag tag-accent">Today</span>}
      <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)", marginLeft: 8 }} />
    </button>
  );
}
