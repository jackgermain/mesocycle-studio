import React, { useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { BackHeader, InfoBanner, ActionGroup, ActionRow } from "../../components/UI";
import { buildBlankProgram } from "../mockData";
import { duplicateProgram, csvDraftDaysToCoachProgram } from "../programOps";
import { expandCoachProgramToProgram } from "../../shared/programConvert";
import { parseCsvToDraftDays } from "../csvProgram";
import { writeProgramToClient } from "../assignProgram";
import type { CoachProgram } from "../types";

type Mode = "choose" | "confirmExisting" | "pickToEdit" | "csv";

export default function AssignProgram() {
  const { clientId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const forcedProgramId = searchParams.get("programId");
  const { state, dispatch } = useCoachStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>(forcedProgramId ? "confirmExisting" : "choose");
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
  const clientId2 = client.id;
  const clientName = client.name;

  /** Adds a fresh (or duplicated) program to the coach's library and opens the real builder to finish
   * it — drag to reorder, edit sets/reps/load, everything ProgramDetail already does. Carries clientId
   * along so ProgramDetail can offer a one-tap "finish assigning to them" once it's ready. */
  function createAndEdit(program: CoachProgram) {
    dispatch({ type: "ADD_PROGRAM", program });
    nav(`/coach/programs/${program.id}?assignTo=${clientId2}`);
  }

  async function finishAssignExisting(cp: CoachProgram) {
    setBusy(true);
    setError(null);
    try {
      const program = expandCoachProgramToProgram(cp, coachName);
      await writeProgramToClient(accountId, program);
      dispatch({ type: "ASSIGN_PROGRAM", clientId: clientId2, programName: program.name, totalWeeks: program.totalWeeks, sourceProgramId: cp.id });
      dispatch({ type: "SHOW_TOAST", message: `${program.name} assigned to ${clientName}.` });
      setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
      nav(`/coach/clients/${clientId2}`, { replace: true });
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
            <ActionRow
              icon="ph-plus-circle"
              iconBg="var(--color-accent-900)"
              iconColor="var(--color-accent)"
              label="Build from scratch"
              subtitle="Opens the full builder — days, exercises, sets, everything"
              onClick={() => createAndEdit(buildBlankProgram(`${client.name.split(" ")[0]}'s Program`))}
            />
            <ActionRow icon="ph-stack" label="Use one of your programs" subtitle={`${state.programs.length} saved — starts you a copy to edit for them`} onClick={() => setMode("pickToEdit")} />
            <ActionRow icon="ph-file-arrow-up" label="Import from a spreadsheet" subtitle="CSV: Day, Exercise, Muscle, Sets, Reps" onClick={() => setMode("csv")} />
          </ActionGroup>
        </div>
      </div>
    );
  }

  if (mode === "pickToEdit") {
    return (
      <div className="screen">
        <BackHeader kicker={client.name} title="Use one of your programs" />
        <div className="screen-scroll">
          {state.programs.length === 0 && <InfoBanner icon="ph-tray">No saved programs yet — build one from scratch instead.</InfoBanner>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {state.programs.map((p) => (
              <button key={p.id} className="link-row" style={{ padding: "11px 12px" }} onClick={() => createAndEdit(duplicateProgram(p, `${p.name} — ${client.name.split(" ")[0]}`))}>
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

  if (mode === "confirmExisting") {
    return (
      <ConfirmExistingStep
        programs={state.programs}
        client={client}
        busy={busy}
        error={error}
        initialPickedId={forcedProgramId}
        onBack={() => nav(-1)}
        onAssign={finishAssignExisting}
      />
    );
  }

  return (
    <CsvStep
      client={client}
      busy={busy}
      error={error}
      onBack={() => setMode("choose")}
      onCreate={(program) => createAndEdit(program)}
    />
  );
}

function ConfirmExistingStep({
  programs,
  client,
  busy,
  error,
  initialPickedId,
  onBack,
  onAssign,
}: {
  programs: CoachProgram[];
  client: { name: string };
  busy: boolean;
  error: string | null;
  initialPickedId?: string | null;
  onBack: () => void;
  onAssign: (p: CoachProgram) => void;
}) {
  const picked = programs.find((p) => p.id === initialPickedId) ?? null;
  if (!picked) return <div className="screen-scroll">Not found.</div>;

  return (
    <div className="screen">
      <div className="hdr">
        <button className="back" onClick={onBack} aria-label="Back">
          <i className="ph ph-caret-left" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="k">{client.name}</div>
          <div className="h1 trunc">{picked.name}</div>
        </div>
      </div>
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

function CsvStep({
  client,
  busy,
  error,
  onBack,
  onCreate,
}: {
  client: { name: string };
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onCreate: (program: CoachProgram) => void;
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
      <div className="hdr">
        <button className="back" onClick={onBack} aria-label="Back">
          <i className="ph ph-caret-left" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="k">{client.name}</div>
          <div className="h1 trunc">Import from a spreadsheet</div>
        </div>
      </div>
      <div className="screen-scroll">
        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
        <InfoBanner icon="ph-info">
          Export a CSV with a header row: <strong>Day, Exercise, Muscle, Sets, Reps, Load</strong>. Sets/Reps/Load are optional per row — anything left blank starts at a plain 3×10. You'll get a chance to fix anything in the full builder afterward.
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
            onClick={() => parsed && onCreate(csvDraftDaysToCoachProgram(programName || `${client.name}'s Program`, parsed.days, weeksCount))}
          >
            Create &amp; open in builder
          </button>
        </div>
      </div>
    </div>
  );
}
