import React, { useState } from "react";
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

function LogSessionInner({ clientName, onDone }: { clientName: string; onDone: () => void }) {
  const { state, dispatch } = useStore();
  const [params] = useSearchParams();
  const todayDay = state.program.weeks.flatMap((w) => w.days).find((d) => d.status === "today");
  const requestedDay = params.get("day");
  const [selectedId, setSelectedId] = useState<string | null>(requestedDay ?? todayDay?.id ?? null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [swapKey, setSwapKey] = useState<string | null>(params.get("exercise"));
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

  // Picking the replacement and deciding how far it reaches are two steps: the picked exercise is held
  // here until a scope is chosen, so nothing is written until the coach says how far it should go.
  const [pendingSwap, setPendingSwap] = useState<LibraryExercise | null>(null);

  function applySwap(scope: "day" | "mesocycle") {
    if (!swapKey || !pendingSwap) return;
    dispatch({
      type: "SWAP_EXERCISE",
      exerciseKey: swapKey,
      replacement: { name: pendingSwap.name, muscle: pendingSwap.muscle, equipment: equipmentOf({ name: pendingSwap.name }), hasVideo: pendingSwap.hasVideo },
      scope,
      dayId: day.id,
    });
    dispatch({
      type: "SHOW_TOAST",
      message: scope === "day" ? `Swapped to ${pendingSwap.name} for today.` : `Swapped to ${pendingSwap.name} for the rest of the block.`,
    });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
    setPendingSwap(null);
    setSwapKey(null);
  }

  return (
    <div className="screen">
      <BackHeader kicker={`${clientName} · week ${week.number}`} title={dayDisplayTitle(day)} />
      <div className="screen-scroll" onClick={() => openMenu && setOpenMenu(null)}>
        <InfoBanner icon="ph-user-focus">Logging for {clientName}, in person — this writes straight to their app.</InfoBanner>

        <button className="link-row" style={{ padding: "9px 12px", color: "var(--color-neutral-400)" }} onClick={() => setSelectedId(null)}>
          <i className="ph ph-calendar" style={{ fontSize: 15 }} />
          <span style={{ flex: 1, fontSize: 12.5 }}>Pick a different day</span>
          <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
        </button>

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
              onRemoveSet={() => {
                setOpenMenu(null);
                const target = ex.sets.find((s) => !s.checked) ?? ex.sets[ex.sets.length - 1];
                nav(`/block/day/${day.id}/exercise/${id}/remove/${target.id}`);
              }}
              onSwap={() => {
                setOpenMenu(null);
                setSwapKey(id);
              }}
            />
          );
        })}

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
        <ExercisePickerSheet kicker="Swap" title={swappingEx.name} excludeName={swappingEx.name} onPick={setPendingSwap} onClose={() => setSwapKey(null)} />
      )}
      {swapKey && swappingEx && pendingSwap && (
        <SwapScopeSheet fromName={swappingEx.name} toName={pendingSwap.name} onChoose={applySwap} onClose={() => setPendingSwap(null)} />
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
