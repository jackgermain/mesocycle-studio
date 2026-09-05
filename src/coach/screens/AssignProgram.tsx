import React, { useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { BackHeader, InfoBanner, ActionGroup, ActionRow, Stepper } from "../../components/UI";
import { buildBlankProgram } from "../mockData";
import { duplicateProgram, csvDraftDaysToCoachProgram } from "../programOps";
import { expandCoachProgramToProgram } from "../../shared/programConvert";
import { parseCsvToDraftDays, parseXlsxToDraftDays, listXlsxSheetNames, parseXlsxFromUrl, listXlsxSheetNamesFromUrl } from "../csvProgram";
import { AiImportSheet } from "../../shared/AiImportSheet";
import { AiNotes } from "../../shared/AiNotes";
import type { AiProgramResult } from "../../shared/aiImport";
import type { CsvParseResult } from "../csvProgram";
import { writeProgramToClient, queueProgramForClient } from "../assignProgram";
import type { CoachProgram } from "../types";

type Mode = "editOrNew" | "choose" | "confirmExisting" | "pickToEdit" | "csv";

export default function AssignProgram() {
  const { clientId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const forcedProgramId = searchParams.get("programId");
  const { state, dispatch } = useCoachStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const client = state.clients.find((c) => c.id === clientId);
  const hasCurrentProgram = !!client?.assignedProgramId;
  const [mode, setMode] = useState<Mode>(forcedProgramId ? "confirmExisting" : hasCurrentProgram ? "editOrNew" : "choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  // Only real, explicitly-saved templates make sense as a starting point to duplicate — a still-in-
  // progress draft (someone else's working copy, or one of this coach's own unfinished ones) isn't a
  // sensible thing to offer here.
  const visiblePrograms = state.programs.filter((p) => p.isTemplate);

  /** Adds a fresh (or duplicated) program to the coach's library — hidden from the Programs list until
   * explicitly saved — and opens the real builder to finish it: drag to reorder, edit sets/reps/load,
   * everything ProgramDetail already does. Carries clientId along so ProgramDetail can offer a one-tap
   * "finish assigning to them" once it's ready. */
  function createAndEdit(program: CoachProgram) {
    dispatch({ type: "ADD_PROGRAM", program: { ...program, pendingForClientId: clientId2 } });
    nav(`/coach/programs/${program.id}?assignTo=${clientId2}`);
  }

  async function finishAssign(cp: CoachProgram, timing: "now" | "queued", sourceProgramId?: string) {
    setBusy(true);
    setError(null);
    try {
      const program = expandCoachProgramToProgram(cp, coachName);
      if (timing === "now") await writeProgramToClient(accountId, program);
      else await queueProgramForClient(accountId, program);
      dispatch({ type: "ASSIGN_PROGRAM", clientId: clientId2, programId: cp.id, programName: program.name, totalWeeks: program.totalWeeks, mode: timing, sourceProgramId });
      dispatch({
        type: "SHOW_TOAST",
        message: timing === "now" ? `${program.name} assigned to ${clientName}.` : `${program.name} queued — starts once ${clientName.split(" ")[0]} finishes their current block.`,
      });
      setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3500);
      nav(`/coach/clients/${clientId2}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this — try again.");
      setBusy(false);
    }
  }

  if (mode === "editOrNew") {
    return (
      <div className="screen">
        <BackHeader kicker={client.name} title="Assign a program" />
        <div className="screen-scroll">
          <ActionGroup>
            <ActionRow
              icon="ph-pencil-simple-line"
              iconBg="var(--color-accent-900)"
              iconColor="var(--color-accent)"
              label="Edit their current program"
              subtitle={client.programName}
              onClick={() => nav(`/coach/programs/${client.assignedProgramId}?assignTo=${clientId2}`)}
            />
            <ActionRow icon="ph-plus-circle" label="Start a new program" subtitle="From scratch, a saved program, or a spreadsheet" onClick={() => setMode("choose")} />
          </ActionGroup>
        </div>
      </div>
    );
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
            <ActionRow icon="ph-stack" label="Use one of your programs" subtitle={`${visiblePrograms.length} template${visiblePrograms.length === 1 ? "" : "s"} — starts you a copy to edit for them`} onClick={() => setMode("pickToEdit")} />
            <ActionRow icon="ph-file-arrow-up" label="Import a program" subtitle="Excel or CSV, or a photo or PDF of a written program" onClick={() => setMode("csv")} />
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
          {visiblePrograms.length === 0 && <InfoBanner icon="ph-tray">No saved templates yet — build one from scratch instead.</InfoBanner>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {visiblePrograms.map((p) => (
              <button key={p.id} className="link-row" style={{ padding: "11px 12px" }} onClick={() => createAndEdit(duplicateProgram(p, `${p.name} — ${client.name.split(" ")[0]}`))}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trunc" style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>{p.name}</div>
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
        allPrograms={state.programs}
        client={client}
        busy={busy}
        error={error}
        initialPickedId={forcedProgramId}
        onBack={() => nav(-1)}
        onAssign={(cp, timing) => finishAssign(cp, timing)}
      />
    );
  }

  return <CsvStep client={client} busy={busy} error={error} onBack={() => setMode("choose")} onCreate={(program) => createAndEdit(program)} />;
}

function ConfirmExistingStep({
  allPrograms,
  client,
  busy,
  error,
  initialPickedId,
  onBack,
  onAssign,
}: {
  allPrograms: CoachProgram[];
  client: { name: string; assignedProgramId?: string };
  busy: boolean;
  error: string | null;
  initialPickedId?: string | null;
  onBack: () => void;
  onAssign: (p: CoachProgram, timing: "now" | "queued") => void;
}) {
  const picked = allPrograms.find((p) => p.id === initialPickedId) ?? null;
  if (!picked) return <div className="screen-scroll">Not found.</div>;

  const isEditingCurrent = picked.id === client.assignedProgramId;
  const hasDifferentCurrent = !!client.assignedProgramId && !isEditingCurrent;

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

        {isEditingCurrent ? (
          <>
            <InfoBanner icon="ph-info">Updates what {client.name.split(" ")[0]} is already on — their in-progress logs for this block stay put.</InfoBanner>
            <div style={{ marginTop: "auto", paddingBottom: 8 }}>
              <button className="btn btn-solid btn-block" style={{ height: 48, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => onAssign(picked, "now")}>
                {busy ? "Saving…" : `Update ${client.name.split(" ")[0]}'s program`}
              </button>
            </div>
          </>
        ) : hasDifferentCurrent ? (
          <>
            <InfoBanner icon="ph-info">{client.name.split(" ")[0]} is already on a different program — choose how this one should take over.</InfoBanner>
            <div style={{ marginTop: "auto", paddingBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-solid btn-block" style={{ height: 48, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => onAssign(picked, "now")}>
                {busy ? "Assigning…" : "Start now — ends their current program"}
              </button>
              <button className="btn btn-secondary btn-block" style={{ height: 44, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => onAssign(picked, "queued")}>
                Queue — starts once their current one ends
              </button>
            </div>
          </>
        ) : (
          <>
            <InfoBanner icon="ph-info">This starts {client.name.split(" ")[0]} at week 1, day 1 — their own copy, editable from here on without touching this saved program.</InfoBanner>
            <div style={{ marginTop: "auto", paddingBottom: 8 }}>
              <button className="btn btn-solid btn-block" style={{ height: 48, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => onAssign(picked, "now")}>
                {busy ? "Assigning…" : `Assign to ${client.name.split(" ")[0]}`}
              </button>
            </div>
          </>
        )}
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
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [source, setSource] = useState<{ type: "file"; file: File } | { type: "url"; url: string } | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [programName, setProgramName] = useState(`${client.name.split(" ")[0]}'s Program`);
  const [weeksCount, setWeeksCount] = useState(6);
  const [linkInput, setLinkInput] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [aiNotes, setAiNotes] = useState<string[]>([]);

  /** Same landing spot as a spreadsheet import: the parsed days fill the preview below and nothing is
   * assigned until the button at the bottom. Notes are kept apart from `errors` -- "I guessed this" is a
   * different thing from "this row was unusable". */
  function applyAi(result: AiProgramResult, sourceLabel: string) {
    setShowAi(false);
    setSource(null);
    setSheetNames([]);
    setSelectedSheet(null);
    setFileName(sourceLabel);
    setParsed({ days: result.days, rowCount: result.days.reduce((n, d) => n + d.exercises.length, 0), errors: [] });
    setAiNotes(result.notes ?? []);
    if (result.name) setProgramName(result.name);
    if (result.weeks) setWeeksCount(Math.max(1, Math.min(16, result.weeks)));
  }

  function handleFile(file: File) {
    setAiNotes([]);
    setFileName(file.name);
    setSource({ type: "file", file });
    setSheetNames([]);
    setSelectedSheet(null);
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      listXlsxSheetNames(file).then((names) => {
        setSheetNames(names);
        setSelectedSheet(names[0]);
        parseXlsxToDraftDays(file, names[0]).then(setParsed);
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setParsed(parseCsvToDraftDays(String(reader.result ?? "")));
    reader.readAsText(file);
  }

  function handleLink() {
    const url = linkInput.trim();
    if (!url) return;
    setLinkBusy(true);
    setLinkError(null);
    listXlsxSheetNamesFromUrl(url)
      .then((names) => {
        setFileName(url.length > 46 ? url.slice(0, 43) + "…" : url);
        setSource({ type: "url", url });
        setSheetNames(names);
        setSelectedSheet(names[0]);
        return parseXlsxFromUrl(url, names[0]).then(setParsed);
      })
      .catch((e) => setLinkError(e instanceof Error ? e.message : "Couldn't read that link."))
      .finally(() => setLinkBusy(false));
  }

  function pickSheet(sheetName: string) {
    setSelectedSheet(sheetName);
    if (!source) return;
    if (source.type === "file") parseXlsxToDraftDays(source.file, sheetName).then(setParsed);
    else parseXlsxFromUrl(source.url, sheetName).then(setParsed);
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
          <div className="h1 trunc">Import a program</div>
        </div>
      </div>
      <div className="screen-scroll">
        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
        <InfoBanner icon="ph-info">
          Upload an Excel (.xlsx) or CSV file with a header row: <strong>Day, Exercise, Muscle, Sets, Reps, Load</strong>. Sets/Reps/Load are optional per row — anything left blank starts at a plain 3×10. You'll get a chance to fix anything in the full builder afterward.
        </InfoBanner>

        <input ref={fileRef} type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <button className="cell row" style={{ padding: 14, textAlign: "left", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
          <i className="ph ph-file-arrow-up" style={{ fontSize: 20, color: "var(--color-accent-300)", marginRight: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="trunc" style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{fileName ?? "Choose a file"}</div>
            <div className="mu" style={{ marginTop: 2 }}>{fileName ? "Tap to choose a different file" : "Excel or CSV, from Excel, Google Sheets, or Numbers"}</div>
          </div>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 2px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-neutral-800)" }} />
          <span className="mu">or</span>
          <div style={{ flex: 1, height: 1, background: "var(--color-neutral-800)" }} />
        </div>

        <button className="cell row" style={{ padding: 14, textAlign: "left", cursor: "pointer" }} onClick={() => setShowAi(true)}>
          <i className="ph ph-sparkle" style={{ fontSize: 20, color: "var(--color-accent-300)", marginRight: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>From a photo or PDF</div>
            <div className="mu" style={{ marginTop: 2 }}>Snap a written program or pick one from your camera roll, and say how you want it built</div>
          </div>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 2px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-neutral-800)" }} />
          <span className="mu">or</span>
          <div style={{ flex: 1, height: 1, background: "var(--color-neutral-800)" }} />
        </div>

        <div className="cell" style={{ padding: 12 }}>
          <div className="scr" style={{ marginBottom: 6 }}>Link a OneDrive file</div>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1, height: 36, fontSize: 12.5 }}
              placeholder="Paste a OneDrive share link"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
            />
            <button className="btn btn-secondary" style={{ height: 36, flex: "none", fontSize: 12.5, opacity: linkBusy ? 0.6 : 1 }} disabled={linkBusy} onClick={handleLink}>
              {linkBusy ? "Fetching…" : "Fetch"}
            </button>
          </div>
          <div className="mu" style={{ marginTop: 6 }}>
            In OneDrive, set the file to share as "Anyone with the link can view," then paste that link here. Re-run this any time the sheet changes to pull the latest version — no re-uploading.
          </div>
        </div>
        {linkError && <InfoBanner icon="ph-warning">{linkError}</InfoBanner>}

        <AiNotes notes={aiNotes} verb="assign" />

        {sheetNames.length > 1 && (
          <div>
            <div className="sh">This file has {sheetNames.length} sheets — which one?</div>
            <div className="row hscroll" style={{ gap: 6 }}>
              {sheetNames.map((s) => (
                <button key={s} className={`chip${selectedSheet === s ? " on" : ""}`} onClick={() => pickSheet(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

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
              <div className="row" style={{ marginTop: 3, justifyContent: "center" }}>
                <Stepper value={weeksCount} onChange={setWeeksCount} min={1} max={16} width={34} fontSize={16} />
              </div>
            </div>

            <div>
              <div className="sh">Parsed from your file · {parsed.rowCount} rows</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {parsed.days.map((d, i) => (
                  <div key={i} className="cell" style={{ padding: 11 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 12.5 }}>{d.name}</div>
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
      {showAi && <AiImportSheet onParsed={applyAi} onClose={() => setShowAi(false)} />}
    </div>
  );
}
