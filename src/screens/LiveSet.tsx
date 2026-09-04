import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { CloseHeader, Stepper } from "../components/UI";
import { dayDisplayTitle } from "../data/dayNumbering";

export default function LiveSet() {
  const { dayId = "", exerciseId = "", setId = "" } = useParams();
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const found = findDay(state.program, dayId);
  const ex = found?.day.exercises[exerciseId];
  const set = ex?.sets.find((s) => s.id === setId);
  if (!found || !ex || !set) return <div className="screen-scroll">Not found.</div>;

  const kicker = `${dayDisplayTitle(found.day)} · set ${set.index} of ${ex.sets.length}`;

  if (set.type === "cluster" && set.prescribed.cluster) {
    return <ClusterLive kicker={kicker} exName={ex.name} dayId={dayId} exerciseId={exerciseId} setId={setId} />;
  }
  if (set.prescribed.tempo) {
    return <TempoLive kicker={kicker} exName={ex.name} dayId={dayId} exerciseId={exerciseId} setId={setId} />;
  }
  return <AssistedLive kicker={kicker} exName={ex.name} dayId={dayId} exerciseId={exerciseId} setId={setId} />;
}

function ClusterLive({ kicker, exName, dayId, exerciseId, setId }: { kicker: string; exName: string; dayId: string; exerciseId: string; setId: string }) {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const found = findDay(state.program, dayId)!;
  const ex = found.day.exercises[exerciseId];
  const set = ex.sets.find((s) => s.id === setId)!;
  const spec = set.prescribed.cluster!;
  const [blocks, setBlocks] = useState<number[]>(() => spec.repsPerCluster.map(() => 0));
  const [current, setCurrent] = useState(0);
  const [resting, setResting] = useState(false);
  const [secLeft, setSecLeft] = useState(spec.intraRestSec);

  useEffect(() => {
    if (!resting) return;
    if (secLeft <= 0) {
      setResting(false);
      return;
    }
    const t = setTimeout(() => setSecLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, secLeft]);

  function logBlock() {
    const next = [...blocks];
    next[current] = spec.repsPerCluster[current];
    setBlocks(next);
    if (current < spec.clusters - 1) {
      setCurrent((c) => c + 1);
      setSecLeft(spec.intraRestSec);
      setResting(true);
    }
  }

  function finish() {
    dispatch({
      type: "TICK_SET",
      dayId,
      exerciseId,
      setId,
      actual: { reps: blocks.reduce((a, b) => a + b, 0), load: set.prescribed.load, clusterBlocks: blocks.filter((b) => b > 0) },
    });
    nav(-1);
  }

  const allLogged = blocks.every((b) => b > 0);

  return (
    <div className="screen">
      <CloseHeader kicker={kicker} title={exName} />
      <div className="screen-scroll">
        <div className="cell row" style={{ padding: "10px 12px" }}>
          <div style={{ flex: 1, fontSize: 12.5, color: "var(--color-neutral-400)" }}>
            {set.prescribed.load ? `${set.prescribed.load} ${state.profile.units}` : "Bodyweight"} · {spec.clusters} × {spec.repsPerCluster[0]} · {spec.intraRestSec}s between
          </div>
          <span className="tag tag-accent">{set.prescribed.effort.scale} {set.prescribed.effort.value}</span>
        </div>

        <div className="cell elev-md" style={{ border: "1px solid var(--color-accent)", padding: 16, textAlign: "center" }}>
          {resting ? (
            <>
              <div className="k">Cluster {current + 1} of {spec.clusters} · rest</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 46, lineHeight: 1.05, marginTop: 6, color: "var(--color-accent)" }}>
                0:{String(secLeft).padStart(2, "0")}
              </div>
              <div className="mu" style={{ marginTop: 6 }}>Next: {spec.repsPerCluster[current]} more reps</div>
            </>
          ) : (
            <>
              <div className="k">Cluster {current + 1} of {spec.clusters}</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 32, lineHeight: 1.1, marginTop: 6 }}>{spec.repsPerCluster[current]} reps</div>
            </>
          )}
          <div className="row" style={{ gap: 5, marginTop: 16 }}>
            {spec.repsPerCluster.map((r, i) => {
              const done = blocks[i] > 0;
              const isCurrent = i === current && !done;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 8,
                    background: done ? "var(--color-accent-900)" : "transparent",
                    border: done ? "1px solid var(--color-accent-800)" : `1px dashed ${isCurrent ? "var(--color-accent)" : "var(--color-neutral-700)"}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  <span style={{ fontSize: 15, fontFamily: "var(--font-heading)", color: done ? "var(--color-accent-100)" : "var(--color-accent-300)" }}>{r}</span>
                  <span style={{ fontSize: 8.5, color: done ? "var(--color-accent-400)" : "var(--color-neutral-500)" }}>{done ? "done" : "to go"}</span>
                </div>
              );
            })}
          </div>
          {resting ? (
            <button className="btn btn-primary btn-block" style={{ height: 46, marginTop: 14 }} onClick={() => setResting(false)}>
              Skip rest, start now
            </button>
          ) : !blocks[current] ? (
            <button className="btn btn-primary btn-block" style={{ height: 46, marginTop: 14 }} onClick={logBlock}>
              Log this block · {spec.repsPerCluster[current]} reps
            </button>
          ) : null}
        </div>

        <div className="mu" style={{ lineHeight: 1.5 }}>Counts as one set of {spec.repsPerCluster.reduce((a, b) => a + b, 0)} against {ex.muscle.toLowerCase()} volume, not {spec.clusters}.</div>

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button className="btn btn-primary btn-block" style={{ height: 46, opacity: allLogged ? 1 : 0.45, cursor: allLogged ? "pointer" : "not-allowed" }} disabled={!allLogged} onClick={finish}>
            Finish set
          </button>
        </div>
      </div>
    </div>
  );
}

function TempoLive({ kicker, exName, dayId, exerciseId, setId }: { kicker: string; exName: string; dayId: string; exerciseId: string; setId: string }) {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const found = findDay(state.program, dayId)!;
  const ex = found.day.exercises[exerciseId];
  const set = ex.sets.find((s) => s.id === setId)!;
  const tempo = set.prescribed.tempo!;
  const [phase, setPhase] = useState<"eccentric" | "isometric" | "concentric">(tempo.eccentric ? "eccentric" : "isometric");
  const [secLeft, setSecLeft] = useState(tempo[phase] || tempo.isometric);
  const [rep, setRep] = useState(1);
  const reps = typeof set.prescribed.reps === "number" ? set.prescribed.reps : 10;

  useEffect(() => {
    if (secLeft <= 0) return;
    const t = setTimeout(() => setSecLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secLeft]);

  function finish() {
    dispatch({ type: "TICK_SET", dayId, exerciseId, setId, actual: { reps, load: set.prescribed.load } });
    nav(-1);
  }

  const phaseLabel = { eccentric: "Eccentric", isometric: "Isometric", concentric: "Concentric" }[phase];

  return (
    <div className="screen">
      <CloseHeader kicker={kicker} title={exName} />
      <div className="screen-scroll">
        <div className="cell row" style={{ padding: "10px 12px" }}>
          <div style={{ flex: 1, fontSize: 12.5, color: "var(--color-neutral-400)" }}>
            {set.prescribed.load} {state.profile.units} · {reps} reps · {set.prescribed.effort.scale} {set.prescribed.effort.value}
          </div>
          <span className="tag tag-accent">ecc {tempo.eccentric} · iso {tempo.isometric} · con {tempo.concentric}</span>
        </div>

        <div className="cell elev-md" style={{ border: "1px solid var(--color-accent)", padding: "18px 14px", textAlign: "center" }}>
          <div className="k">Rep {rep} of {reps}</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 26, lineHeight: 1.2, marginTop: 8, color: "var(--color-accent-100)" }}>{phaseLabel}</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 52, lineHeight: 1, marginTop: 6, color: "var(--color-accent)" }}>{secLeft}</div>
          <div className="mu" style={{ marginTop: 6 }}>Hold at the {tempo.holdAt}</div>
        </div>

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, height: 44 }}
              onClick={() => {
                if (rep < reps) {
                  setRep((r) => r + 1);
                  setPhase("eccentric");
                  setSecLeft(tempo.eccentric || tempo.isometric);
                } else {
                  finish();
                }
              }}
            >
              {rep < reps ? "Next rep" : "Finish set"}
            </button>
            <button className="btn btn-secondary" style={{ flex: "none", height: 44, fontSize: 12.5 }} onClick={finish}>
              Drop the hold
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistedLive({ kicker, exName, dayId, exerciseId, setId }: { kicker: string; exName: string; dayId: string; exerciseId: string; setId: string }) {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const found = findDay(state.program, dayId)!;
  const ex = found.day.exercises[exerciseId];
  const set = ex.sets.find((s) => s.id === setId)!;
  const assist = set.prescribed.assistance!;
  const reps = typeof set.prescribed.reps === "number" ? set.prescribed.reps : 8;
  const isSplit = assist.type === "part-band";
  const [unassisted, setUnassisted] = useState(assist.splitUnassisted ?? reps);
  const [assisted, setAssisted] = useState(assist.splitAssisted ?? 0);

  function verify() {
    dispatch({
      type: "TICK_SET",
      dayId,
      exerciseId,
      setId,
      actual: { reps: unassisted + assisted, load: set.prescribed.load, assistanceSplit: isSplit ? { unassisted, assisted } : undefined },
    });
    nav(-1);
  }

  return (
    <div className="screen">
      <CloseHeader kicker={kicker} title={exName} />
      <div className="screen-scroll">
        <div className="cell elev-md" style={{ border: "1px solid var(--color-accent)", padding: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <div className="k">Set {set.index} · {assist.type === "none" ? "unassisted" : isSplit ? "part-assisted" : assist.type}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 19, marginTop: 3 }}>
              {reps} reps{isSplit ? ` · ${unassisted} free + ${assisted} assisted` : assist.detail ? ` · ${assist.detail}` : ""}
            </div>
          </div>

          {isSplit ? (
            <>
              <div className="scr" style={{ marginBottom: 6 }}>How did the {reps} break down?</div>
              <div className="row" style={{ gap: 9 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 46, borderRadius: 8, background: "var(--color-neutral-900)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Stepper value={unassisted} onChange={setUnassisted} min={0} width={40} fontSize={18} />
                  </div>
                  <div className="mu" style={{ textAlign: "center", marginTop: 5, fontSize: 10.5 }}>unassisted</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 46, borderRadius: 8, background: "var(--color-accent-900)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Stepper value={assisted} onChange={setAssisted} min={0} width={40} fontSize={18} />
                  </div>
                  <div style={{ textAlign: "center", marginTop: 5, fontSize: 10.5, color: "var(--color-accent-300)" }}>assisted</div>
                </div>
              </div>
              <div className="scr" style={{ margin: "12px 0 6px" }}>Assistance used</div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <span className="chip on">{assist.detail ?? "Band"}</span>
              </div>
            </>
          ) : (
            <div className="row" style={{ gap: 9 }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: 46, borderRadius: 8, background: "var(--color-neutral-900)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Stepper value={unassisted} onChange={setUnassisted} min={0} width={40} fontSize={18} />
                </div>
                <div className="mu" style={{ textAlign: "center", marginTop: 5, fontSize: 10.5 }}>reps</div>
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-block" style={{ height: 48, marginTop: 14 }} onClick={verify}>
            <i className="ph ph-check" style={{ fontSize: 16 }} />
            Verify set
          </button>
          {set.lastWeek && <div className="mu" style={{ marginTop: 8, textAlign: "center" }}>Last week: {set.lastWeek}</div>}
        </div>

        <div className="mu" style={{ lineHeight: 1.5 }}>Progress here can be assistance coming off, not just reps going up.</div>
      </div>
    </div>
  );
}
