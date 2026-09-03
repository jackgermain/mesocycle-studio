import React, { useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { BackHeader, InfoBanner, ActionGroup, ActionRow } from "../../components/UI";
import { libraryExercises, MUSCLE_GROUPS } from "../exerciseLibrary";
import { buildProgramFromDraft, expandCoachProgramToProgram } from "../../shared/programConvert";
import type { DraftDay } from "../../shared/programConvert";
import type { LibraryExercise } from "../types";
import { writeProgramToClient } from "../assignProgram";
import { parseCsvToDraftDays } from "../csvProgram";
import type { Program } from "../../data/types";

type Mode = "choose" | "scratch" | "existing" | "csv";

export default function AssignProgram() {
  const { clientId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const forcedProgramId = searchParams.get("programId");
  const { state, dispatch } = useCoachStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>(forcedProgramId ? "existing" : "choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = state.clients.find((c) => c.id === clientId);
  const coachName = account?.display_name ?? "Coach";

  if (!client) return <div className="screen-scroll">Not found.</div>;
  if (!client.accountId) {
    return (
      <div className="screen">
        <BackHeader kicker={client.name} title="Assign a program" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-hourglass">{client.name.split(" ")[0]} hasn't accepted their invite yet — you can assign a program once they do.</InfoBanner>
        </div>
      </div>
    );
  }
  const accountId = client.accountId;

  async function finishAssign(program: Program, sourceProgramId?: string) {
    setBusy(true);
    setError(null);
    try {
      await writeProgramToClient(accountId, program);
      dispatch({ type: "ASSIGN_PROGRAM", clientId: client!.id, programName: program.name, totalWeeks: program.totalWeeks, sourceProgramId });
      dispatch({ type: "SHOW_TOAST", message: `${program.name} assigned to ${client!.name}.` });
      setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
      nav(`/coach/clients/${client!.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this — try again.");
      setBusy(false);
    }
  }

  if (mode === "choose") {
    return (
      <div className="screen">
        <BackHeader kicker={client.name} title="Assign a program" />
        <div className="screen-scroll">
          {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
          <ActionGroup>
            <ActionRow icon="ph-plus-circle" iconBg="var(--color-accent-900)" iconColor="var(--color-accent)" label="Build from scratch" subtitle="Pick days and exercises for them specifically" onClick={() => setMode("scratch")} />
            <ActionRow icon="ph-stack" label="Use one of your programs" subtitle={`${state.programs.length} saved`} onClick={() => setMode("existing")} />
            <ActionRow icon="ph-file-arrow-up" label="Import from a spreadsheet" subtitle="CSV: Day, Exercise, Muscle, Sets, Reps" onClick={() => setMode("csv")} />
          </ActionGroup>
        </div>
      </div>
    );
  }

  if (mode === "existing") {
    return (
      <ExistingStep
        programs={state.programs}
        client={client}
        coachName={coachName}
        busy={busy}
        error={error}
        initialPickedId={forcedProgramId}
        onBack={() => (forcedProgramId ? nav(-1) : setMode("choose"))}
        onAssign={(cp) => finishAssign(expandCoachProgramToProgram(cp, coachName), cp.id)}
      />
    );
  }

  if (mode === "csv") {
    return <CsvStep client={client} coachName={coachName} busy={busy} error={error} onBack={() => setMode("choose")} onAssign={finishAssign} />;
  }

  return <ScratchStep client={client} coachName={coachName} busy={busy} error={error} onBack={() => setMode("choose")} onAssign={finishAssign} />;
}

function SubHeader({ clientName, title, onBack }: { clientName: string; title: string; onBack: () => void }) {
  return (
    <div className="hdr">
      <button className="back" onClick={onBack} aria-label="Back">
        <i className="ph ph-caret-left" />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="k">{clientName}</div>
        <div className="h1 trunc">{title}</div>
      </div>
    </div>
  );
}

function ExistingStep({
  programs,
  client,
  coachName,
  busy,
  error,
  initialPickedId,
  onBack,
  onAssign,
}: {
  programs: ReturnType<typeof useCoachStore>["state"]["programs"];
  client: { name: string };
  coachName: string;
  busy: boolean;
  error: string | null;
  initialPickedId?: string | null;
  onBack: () => void;
  onAssign: (p: (typeof programs)[number]) => void;
}) {
  const [pickedId, setPickedId] = useState<string | null>(initialPickedId ?? null);
  const picked = programs.find((p) => p.id === pickedId) ?? null;

  if (picked) {
    return (
      <div className="screen">
        <SubHeader clientName={client.name} title={picked.name} onBack={() => setPickedId(null)} />
        <div className="screen-scroll">
          {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
          <div className="cell" style={{ padding: 14 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{picked.name}</div>
            <div className="mu" style={{ marginTop: 4 }}>{picked.weeks} weeks · {picked.daysPerWeek} days/week · {picked.days.reduce((n, d) => n + d.exercises.length, 0)} exercises</div>
          </div>
          <InfoBanner icon="ph-info">This starts {client.name.split(" ")[0]} at week 1, day 1 — their own copy, editable from here on without touching this saved program.</InfoBanner>
          <div style={{ marginTop: "auto", paddingBottom: 8 }}>
            <button className="btn btn-solid btn-block" style={{ height: 48, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => onAssign(picked)}>
              {busy ? "Assigning…" : `Assign to ${client.name.split(" ")[0]}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <SubHeader clientName={client.name} title="Use one of your programs" onBack={onBack} />
      <div className="screen-scroll">
        {programs.length === 0 && <InfoBanner icon="ph-tray">No saved programs yet — build one from the Programs tab first, or build one from scratch for {client.name.split(" ")[0]} right now.</InfoBanner>}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {programs.map((p) => (
            <button key={p.id} className="link-row" style={{ padding: "11px 12px" }} onClick={() => setPickedId(p.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trunc" style={{ fontSize: 13.5, fontFamily: "var(--font-heading)" }}>{p.name}</div>
                <div className="mu" style={{ marginTop: 2 }}>{p.weeks} weeks · {p.daysPerWeek} days/week{p.isTemplate ? " · template" : ""}</div>
              </div>
              <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScratchStep({
  client,
  coachName,
  busy,
  error,
  onBack,
  onAssign,
}: {
  client: { name: string };
  coachName: string;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onAssign: (p: Program) => void;
}) {
  const [name, setName] = useState(`${client.name.split(" ")[0]}'s Program`);
  const [weeksCount, setWeeksCount] = useState(6);
  const [days, setDays] = useState<DraftDay[]>([{ name: "Day 1", exercises: [] }, { name: "Day 2", exercises: [] }, { name: "Day 3", exercises: [] }]);
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const totalExercises = days.reduce((n, d) => n + d.exercises.length, 0);

  function setDaysCount(n: number) {
    const count = Math.max(1, Math.min(7, n));
    setDays((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push({ name: `Day ${next.length + 1}`, exercises: [] });
      return next;
    });
  }
  function renameDay(i: number, dayName: string) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, name: dayName } : d)));
  }
  function addExercise(i: number, ex: LibraryExercise) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, exercises: [...d.exercises, { name: ex.name, muscle: ex.muscle }] } : d)));
    setPickerDay(null);
  }
  function removeExercise(i: number, exIdx: number) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) } : d)));
  }

  return (
    <div className="screen">
      <SubHeader clientName={client.name} title="Build from scratch" onBack={onBack} />
      <div className="screen-scroll">
        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
        <div className="field">
          <label>Program name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="row" style={{ gap: 8 }}>
          <div className="cell" style={{ flex: 1, padding: 9 }}>
            <div className="scr">Weeks</div>
            <div className="row" style={{ marginTop: 3, gap: 4 }}>
              <button onClick={() => setWeeksCount((v) => Math.max(1, v - 1))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
                <i className="ph ph-minus" style={{ fontSize: 11 }} />
              </button>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, flex: 1, textAlign: "center" }}>{weeksCount}</span>
              <button onClick={() => setWeeksCount((v) => Math.min(16, v + 1))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
                <i className="ph ph-plus" style={{ fontSize: 11 }} />
              </button>
            </div>
          </div>
          <div className="cell" style={{ flex: 1, padding: 9 }}>
            <div className="scr">Days / week</div>
            <div className="row" style={{ marginTop: 3, gap: 4 }}>
              <button onClick={() => setDaysCount(days.length - 1)} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
                <i className="ph ph-minus" style={{ fontSize: 11 }} />
              </button>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, flex: 1, textAlign: "center" }}>{days.length}</span>
              <button onClick={() => setDaysCount(days.length + 1)} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
                <i className="ph ph-plus" style={{ fontSize: 11 }} />
              </button>
            </div>
          </div>
        </div>

        {days.map((d, i) => (
          <div key={i} className="cell" style={{ padding: 11 }}>
            <input className="input" style={{ height: 34, fontSize: 13 }} value={d.name} onChange={(e) => renameDay(i, e.target.value)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {d.exercises.map((ex, ei) => (
                <div key={ei} className="row" style={{ padding: "7px 9px", background: "var(--color-neutral-900)", borderRadius: 7 }}>
                  <span style={{ flex: 1, fontSize: 12.5 }}>{ex.name}</span>
                  <button onClick={() => removeExercise(i, ei)} style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer" }}>
                    <i className="ph ph-x" style={{ fontSize: 13 }} />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary btn-block" style={{ height: 34, marginTop: 8, fontSize: 12 }} onClick={() => setPickerDay(i)}>
              <i className="ph ph-plus" style={{ fontSize: 12 }} />
              Add exercise
            </button>
          </div>
        ))}

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button
            className="btn btn-solid btn-block"
            style={{ height: 48, opacity: totalExercises > 0 && !busy ? 1 : 0.5 }}
            disabled={totalExercises === 0 || busy}
            onClick={() => onAssign(buildProgramFromDraft(name || `${client.name}'s Program`, days, weeksCount, coachName))}
          >
            {busy ? "Assigning…" : `Assign to ${client.name.split(" ")[0]}`}
          </button>
          {totalExercises === 0 && <div className="mu" style={{ textAlign: "center", marginTop: 7 }}>Add at least one exercise to a day first.</div>}
        </div>
      </div>

      {pickerDay !== null && <ExercisePicker onPick={(ex) => addExercise(pickerDay, ex)} onClose={() => setPickerDay(null)} />}
    </div>
  );
}

function ExercisePicker({ onPick, onClose }: { onPick: (e: LibraryExercise) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const filtered = libraryExercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()) && (!muscle || e.muscle === muscle) && e.kind !== "cardio");

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" style={{ maxHeight: "82%", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Add</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Pick an exercise</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="input row" style={{ height: 38, gap: 8, color: "var(--color-neutral-600)", flex: "none" }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 15 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises" style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--color-text)", fontSize: 14 }} autoFocus />
        </div>
        <div className="row hscroll" style={{ gap: 6, flex: "none", marginTop: 8 }}>
          <button className={`chip${muscle === null ? " on" : ""}`} onClick={() => setMuscle(null)}>All</button>
          {MUSCLE_GROUPS.map((m) => (
            <button key={m} className={`chip${muscle === m ? " on" : ""}`} onClick={() => setMuscle(m)}>{m}</button>
          ))}
        </div>

        <div style={{ overflowY: "auto", marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((e) => (
            <button key={e.id} className="cell row" style={{ padding: "10px 11px", textAlign: "left", cursor: "pointer" }} onClick={() => onPick(e)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trunc" style={{ fontSize: 13.5 }}>{e.name}</div>
                <div className="mu" style={{ marginTop: 2 }}>{e.muscle}</div>
              </div>
              <i className="ph ph-arrow-right" style={{ fontSize: 14, color: "var(--color-accent)" }} />
            </button>
          ))}
          {filtered.length === 0 && <div className="mu" style={{ padding: "8px 2px" }}>No exercises match.</div>}
        </div>
      </div>
    </div>
  );
}

function CsvStep({
  client,
  coachName,
  busy,
  error,
  onBack,
  onAssign,
}: {
  client: { name: string };
  coachName: string;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onAssign: (p: Program) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ReturnType<typeof parseCsvToDraftDays> | null>(null);
  const [programName, setProgramName] = useState(`${client.name.split(" ")[0]}'s Program`);
  const [weeksCount, setWeeksCount] = useState(6);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setParsed(parseCsvToDraftDays(String(reader.result ?? "")));
    reader.readAsText(file);
  }

  const totalExercises = parsed?.days.reduce((n, d) => n + d.exercises.length, 0) ?? 0;

  return (
    <div className="screen">
      <SubHeader clientName={client.name} title="Import from a spreadsheet" onBack={onBack} />
      <div className="screen-scroll">
        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
        <InfoBanner icon="ph-info">
          Export a CSV with a header row: <strong>Day, Exercise, Muscle, Sets, Reps, Load</strong>. Sets/Reps/Load are optional per row — anything left blank starts at a plain 3×10.
        </InfoBanner>

        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <button className="cell row" style={{ padding: 14, textAlign: "left", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
          <i className="ph ph-file-arrow-up" style={{ fontSize: 20, color: "var(--color-accent-300)", marginRight: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="trunc" style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{fileName ?? "Choose a CSV file"}</div>
            <div className="mu" style={{ marginTop: 2 }}>{fileName ? "Tap to choose a different file" : "From Excel, Google Sheets, or Numbers — export as CSV first"}</div>
          </div>
        </button>

        {parsed && parsed.errors.length > 0 && (
          <InfoBanner icon="ph-warning">
            {parsed.errors.length} row{parsed.errors.length > 1 ? "s" : ""} skipped: {parsed.errors.slice(0, 4).join(" ")}
            {parsed.errors.length > 4 ? ` …and ${parsed.errors.length - 4} more.` : ""}
          </InfoBanner>
        )}

        {parsed && parsed.days.length > 0 && (
          <>
            <div className="field">
              <label>Program name</label>
              <input className="input" value={programName} onChange={(e) => setProgramName(e.target.value)} />
            </div>
            <div className="cell" style={{ padding: 9 }}>
              <div className="scr">Weeks (repeats this template)</div>
              <div className="row" style={{ marginTop: 3, gap: 8, justifyContent: "center" }}>
                <button onClick={() => setWeeksCount((v) => Math.max(1, v - 1))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer" }}>
                  <i className="ph ph-minus" style={{ fontSize: 13 }} />
                </button>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{weeksCount}</span>
                <button onClick={() => setWeeksCount((v) => Math.min(16, v + 1))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer" }}>
                  <i className="ph ph-plus" style={{ fontSize: 13 }} />
                </button>
              </div>
            </div>

            <div>
              <div className="sh">Parsed from your file · {parsed.rowCount} rows</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {parsed.days.map((d, i) => (
                  <div key={i} className="cell" style={{ padding: 11 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 13.5 }}>{d.name}</div>
                    <div className="mu" style={{ marginTop: 4, lineHeight: 1.6 }}>
                      {d.exercises.map((e) => `${e.name}${e.sets ? ` (${e.sets}×${e.reps ?? 10})` : ""}`).join(" · ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button
            className="btn btn-solid btn-block"
            style={{ height: 48, opacity: totalExercises > 0 && !busy ? 1 : 0.5 }}
            disabled={totalExercises === 0 || busy}
            onClick={() => parsed && onAssign(buildProgramFromDraft(programName || `${client.name}'s Program`, parsed.days, weeksCount, coachName))}
          >
            {busy ? "Assigning…" : `Assign to ${client.name.split(" ")[0]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
