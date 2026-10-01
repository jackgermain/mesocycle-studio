import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { CloseHeader, InfoBanner } from "../components/UI";
import { dayDisplayTitle } from "../data/dayNumbering";
import type { TrainingDay, TrainingWeek } from "../data/types";
import { roundLabels } from "../shared/supersetGroups";

/** Split in two on purpose. The working order is seeded from the day, so the hook holding it can't simply
 * move above the "not found" check the way it can elsewhere -- seeding it before the program has loaded
 * would leave it stuck on an empty list. Doing the lookup in an outer component instead means the inner
 * one only ever mounts with a real day, and mounts fresh if the day changes. */
export default function Reorder() {
  const { dayId = "" } = useParams();
  const { state } = useStore();
  const found = findDay(state.program, dayId);
  if (!found) return <div className="screen-scroll">Not found.</div>;
  return <ReorderInner key={dayId} dayId={dayId} day={found.day} week={found.week} />;
}

function ReorderInner({ dayId, day, week }: { dayId: string; day: TrainingDay; week: TrainingWeek }) {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const initialOrder = day.order.length ? day.order : Object.keys(day.exercises);
  const [order, setOrder] = useState(initialOrder);
  const labels = roundLabels(day);

  function move(id: string, dir: -1 | 1) {
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }

  function moveToEnd(id: string) {
    setOrder((o) => [...o.filter((x) => x !== id), id]);
  }

  /* Supersets are applied IMMEDIATELY rather than on Save, because they are a different kind of edit: the
   * order here is a local draft until saved, but linking two exercises writes through to every remaining
   * week of this session at once. Jack: "I'd like to be able to add one or even more exercises to be able
   * to superset, and then have rep progressions and set progressions for them individually." */
  function linkedTo(a: string, b: string): boolean {
    const idA = day.exercises[a]?.supersetId;
    return !!idA && idA === day.exercises[b]?.supersetId;
  }

  function toggleLink(a: string, b: string) {
    if (linkedTo(a, b)) {
      dispatch({ type: "SET_SUPERSET", dayId, keys: [a, b], supersetId: null });
      dispatch({ type: "SHOW_TOAST", message: "Separated — they rest between sets again." });
    } else {
      // Joining onto an existing round keeps its id, so a third exercise extends A1/A2 into A1/A2/A3
      // rather than starting a new one next to it.
      const existing = day.exercises[a]?.supersetId ?? day.exercises[b]?.supersetId;
      const id = existing ?? `ss-${a}-${b}`;
      dispatch({ type: "SET_SUPERSET", dayId, keys: [a, b], supersetId: id });
      dispatch({ type: "SHOW_TOAST", message: "Supersetted — one of each is one set, no rest between." });
    }
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  }

  function save() {
    dispatch({ type: "REORDER_EXERCISES", dayId, order });
    nav(-1);
  }

  return (
    <div className="screen">
      <CloseHeader kicker={`${dayDisplayTitle(day)} · Week ${week.number}`} title="Change the order" />
      <div className="screen-scroll">
        {/* The scope has to be said out loud. This used to reorder this one week and nothing else, so week 2
            of the same session kept the order it was generated with and the two read as different programs
            -- Jack: "the split is selected in week one, and it stays like that throughout the whole
            program." It now carries forward, and a change that reaches other weeks must say so. */}
        <InfoBanner icon="ph-info">
          Station busy? Move anything up or down, or tap an exercise to start it now. Unticked sets travel with it.
          This order carries into every later week of this session.
        </InfoBanner>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {order.map((id, i) => {
            const ex = day.exercises[id];
            if (!ex) return null;
            const doneCount = ex.sets.filter((s) => s.checked).length;
            const isDone = doneCount === ex.sets.length;
            const inProgress = doneCount > 0 && !isDone;
            const label = labels[id];
            return (
              <React.Fragment key={id}>
              <div
                className="cell row"
                style={{ opacity: isDone ? 0.6 : 1, border: inProgress ? "1px solid var(--color-accent)" : undefined, background: inProgress ? "var(--color-accent-900)" : "var(--color-surface)" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button disabled={i === 0} onClick={() => move(id, -1)} style={{ background: "none", border: "none", color: i === 0 ? "var(--color-neutral-800)" : "var(--color-neutral-500)", cursor: i === 0 ? "default" : "pointer", padding: 2 }}>
                    <i className="ph ph-caret-up" style={{ fontSize: 12 }} />
                  </button>
                  <button disabled={i === order.length - 1} onClick={() => move(id, 1)} style={{ background: "none", border: "none", color: i === order.length - 1 ? "var(--color-neutral-800)" : "var(--color-neutral-500)", cursor: i === order.length - 1 ? "default" : "pointer", padding: 2 }}>
                    <i className="ph ph-caret-down" style={{ fontSize: 12 }} />
                  </button>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trunc" style={{ fontSize: 12.5, color: inProgress ? "var(--color-accent-100)" : "var(--color-text)" }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: inProgress ? "var(--color-accent-300)" : "var(--color-neutral-500)", marginTop: 1 }}>
                    {doneCount} of {ex.sets.length} sets{inProgress ? " · in progress" : ""}
                  </div>
                </div>
                {label && (
                  <span className="tag tag-accent" style={{ flex: "none" }}>{label}</span>
                )}
                {isDone ? (
                  <i className="ph-fill ph-check-circle" style={{ fontSize: 16, color: "var(--color-accent)", flex: "none" }} />
                ) : inProgress ? (
                  <span style={{ fontSize: 11, color: "var(--color-accent-300)", flex: "none" }}>in progress</span>
                ) : null}
              </div>
              {/* The link sits BETWEEN two rows, because that is what it joins. A per-exercise "make this a
                  superset" control cannot say which neighbour it means, and chaining two links is what
                  builds a round of three or more without a separate multi-select. */}
              {i < order.length - 1 && (
                <button
                  onClick={() => toggleLink(id, order[i + 1])}
                  style={{
                    alignSelf: "center", background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6, padding: "2px 8px", fontSize: 11,
                    color: linkedTo(id, order[i + 1]) ? "var(--color-accent-300)" : "var(--color-neutral-600)",
                  }}
                >
                  <i className={`ph ${linkedTo(id, order[i + 1]) ? "ph-link" : "ph-link-simple-break"}`} style={{ fontSize: 13 }} />
                  {linkedTo(id, order[i + 1]) ? "Superset — no rest between" : "Superset with next"}
                </button>
              )}
              </React.Fragment>
            );
          })}
        </div>

        <div>
          <div className="sh">Or park one</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {order
              .filter((id) => day.exercises[id] && day.exercises[id].sets.some((s) => s.checked) && day.exercises[id].sets.some((s) => !s.checked))
              .map((id) => (
                <button key={id} className="link-row" style={{ padding: "11px 12px" }} onClick={() => moveToEnd(id)}>
                  <div style={{ flex: 1, fontSize: 12.5 }}>Move {day.exercises[id].name} to the end</div>
                  <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
                </button>
              ))}
            {order.filter((id) => day.exercises[id] && day.exercises[id].sets.some((s) => s.checked) && day.exercises[id].sets.some((s) => !s.checked)).length === 0 && (
              <div className="mu">Nothing in progress to park right now.</div>
            )}
          </div>
        </div>

        <InfoBanner icon="ph-eye" tone="accent">
          {state.program.coachName} sees the order you actually trained in, so they can fix the program if it keeps happening.
        </InfoBanner>

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={save}>
            Save this order
          </button>
        </div>
      </div>
    </div>
  );
}
