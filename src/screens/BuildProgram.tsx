import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../state/store";
import { BackHeader, InfoBanner, Seg } from "../components/UI";
import { libraryExercises, MUSCLE_GROUPS } from "../coach/exerciseLibrary";
import type { LibraryExercise, LoadMode } from "../coach/types";
import { LOAD_LABELS, LOAD_RANGE, LOAD_DEFAULT, clampLoadValue } from "../coach/loadMode";
import { listCoachTemplates } from "../shared/templates";
import { DayOfWeekPicker } from "../shared/DayOfWeekPicker";
import { SimpleExercisePicker } from "../shared/SimpleExercisePicker";
import { defaultDows, resizeDows } from "../shared/trainingDays";
import { buildProgramFromDraft, draftDaysFromProgram, dowsFromProgram, mergeEditedDraftIntoProgram } from "../shared/programConvert";
import type { DraftDay, DraftExercise } from "../shared/programConvert";
import { parseCsvToDraftDays, parseXlsxToDraftDays, listXlsxSheetNames, parseXlsxFromUrl, listXlsxSheetNamesFromUrl } from "../coach/csvProgram";
import { AiImportSheet } from "../shared/AiImportSheet";
import { AiNotes } from "../shared/AiNotes";
import type { AiProgramResult } from "../shared/aiImport";
import type { CsvParseResult } from "../coach/csvProgram";
import { coachProgramToDraft, csvDraftDaysToCoachProgram } from "../coach/programOps";
import { writeTemplateToCoach } from "../coach/assignProgram";
import { useAuth } from "../lib/auth";

const LOAD_MODE_OPTIONS: { value: LoadMode; label: string }[] = [
  { value: "lb", label: "None" },
  { value: "pct1rm", label: "%1RM" },
  { value: "rpe", label: "RPE" },
  { value: "rir", label: "RIR" },
];

type Mode = "choose" | "scratch" | "templates" | "csv" | "editMesocycle";
const DOW_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type ScratchSeed = { name: string; days: DraftDay[]; weeks: number; dows?: number[] };

/** BackHeader's own back button always pops browser history, which would leave this screen entirely from
 * a sub-step reached by local state (not a route) — this small header calls back into that state instead. */
function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="hdr">
      <button className="back" onClick={onBack} aria-label="Back">
        <i className="ph ph-caret-left" />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="k">Build a program</div>
        <div className="h1 trunc">{title}</div>
      </div>
    </div>
  );
}

export default function BuildProgram() {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const editRequested = searchParams.get("edit") === "1";
  // Arrived from "Block complete -> change it first". Same editor as a from-scratch build, seeded with the
  // finished block, so saving creates a NEW program with fresh dates rather than editing the old one in
  // place -- which is what "edit" does and is the opposite of repeating.
  const repeatRequested = searchParams.get("repeat") === "1" && state.program.weeks.length > 0;
  const [mode, setMode] = useState<Mode>(editRequested && state.program.weeks.length > 0 ? "editMesocycle" : repeatRequested ? "scratch" : "choose");
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [scratchSeed, setScratchSeed] = useState<ScratchSeed | null>(() => {
    if (editRequested && state.program.weeks.length > 0) {
      return { name: state.program.name, days: draftDaysFromProgram(state.program), weeks: state.program.totalWeeks };
    }
    if (repeatRequested) {
      // dows come off the calendar because a Program stores dates, not a pattern -- without them the
      // rebuild falls back to an even spread and a Mon/Wed/Sat block comes back on different days.
      return {
        name: state.program.name,
        days: draftDaysFromProgram(state.program),
        weeks: state.program.totalWeeks || state.program.weeks.length,
        dows: dowsFromProgram(state.program),
      };
    }
    return null;
  });

  if (mode === "choose") {
    const hasCurrentProgram = state.program.weeks.length > 0;
    return (
      <div className="screen">
        <BackHeader kicker="Your program" title={hasCurrentProgram ? "Your programs" : "Build a program"} />
        <div className="screen-scroll">
          {hasCurrentProgram && (
            <>
              <div className="cell row" style={{ cursor: "default", borderColor: "var(--color-accent-700)" }}>
                <i className="ph-fill ph-calendar-check" style={{ fontSize: 20, color: "var(--color-accent)", marginRight: 4 }} />
                <button
                  onClick={() => nav("/block")}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit" }}
                >
                  <div className="trunc" style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{state.program.name}</div>
                  <div className="mu trunc" style={{ marginTop: 2 }}>Jump back in and log today's lift.</div>
                </button>
                <button
                  onClick={() => {
                    setRenameText(state.program.name);
                    setRenaming(true);
                  }}
                  aria-label="Rename program"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", display: "flex", padding: 4, flex: "none" }}
                >
                  <i className="ph ph-pencil-simple" style={{ fontSize: 14 }} />
                </button>
                <button onClick={() => nav("/block")} aria-label="Open current program" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flex: "none", padding: 0 }}>
                  <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
                </button>
              </div>
              <div className="sh">Or start a new block</div>
            </>
          )}

          <InfoBanner icon="ph-info">Nothing here is prescribed by {state.program.coachName === state.profile.name ? "anyone" : "your coach"} — build your own from scratch, or start from one of {state.program.coachName}'s templates and make it yours.</InfoBanner>

          <button className="cell row" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setMode("scratch")}>
            <i className="ph ph-plus-circle" style={{ fontSize: 20, color: "var(--color-accent-300)", marginRight: 4 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>Build from scratch</div>
              <div className="mu" style={{ marginTop: 2 }}>Pick how many days a week, then add whatever exercises you want to each.</div>
            </div>
            <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
          </button>

          <button className="cell row" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setMode("templates")}>
            <i className="ph ph-stack" style={{ fontSize: 20, color: "var(--color-accent-300)", marginRight: 4 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>Use a saved template</div>
              <div className="mu" style={{ marginTop: 2 }}>Clone one of {state.program.coachName}'s templates and adjust the sets to fit you.</div>
            </div>
            <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
          </button>

          <button className="cell row" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setMode("csv")}>
            <i className="ph ph-file-arrow-up" style={{ fontSize: 20, color: "var(--color-accent-300)", marginRight: 4 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>Import a program</div>
              <div className="mu" style={{ marginTop: 2 }}>An Excel or CSV file, or a photo or PDF of a written program.</div>
            </div>
            <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
          </button>
        </div>

      {renaming && (
        <div className="sheet-backdrop" onClick={() => setRenaming(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div className="scr">Program</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Rename</div>
              </div>
              <button onClick={() => setRenaming(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                <i className="ph ph-x" style={{ fontSize: 16 }} />
              </button>
            </div>
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameText.trim()) {
                    dispatch({ type: "RENAME_PROGRAM", name: renameText.trim() });
                    setRenaming(false);
                  }
                }}
              />
            </div>
            <button
              className="btn btn-primary btn-block"
              style={{ height: 48, opacity: renameText.trim() ? 1 : 0.5 }}
              disabled={!renameText.trim()}
              onClick={() => {
                dispatch({ type: "RENAME_PROGRAM", name: renameText.trim() });
                setRenaming(false);
              }}
            >
              Save name
            </button>
          </div>
        </div>
      )}
      </div>
    );
  }

  if (mode === "templates") {
    // Picking a template used to set the program and jump straight to today's session, which left no way
    // to change anything -- and if today happened to be a rest day in that split, it landed on an empty
    // day with nothing to do. Every other way in (from scratch, spreadsheet, photo) reviews first, so
    // this one does too.
    return (
      <TemplatesStep
        coachName={state.program.coachName}
        onBack={() => setMode("choose")}
        onUse={(cp) => {
          setScratchSeed({ ...coachProgramToDraft(cp), dows: cp.trainingDows });
          setMode("scratch");
        }}
      />
    );
  }

  if (mode === "csv") {
    return (
      <CsvStep
        onBack={() => setMode("choose")}
        onReview={(seed) => {
          setScratchSeed(seed);
          setMode("scratch");
        }}
      />
    );
  }

  if (mode === "editMesocycle") {
    return (
      <ScratchStep
        editMode
        seed={scratchSeed}
        // Reached by a direct link from the "..." menu on today's workout (/build?edit=1), not by
        // stepping through this screen's own choose→scratch flow -- so "back" here means "back to where
        // that came from" (real browser history), not "back to the Build-a-program hub" like the other
        // branches below, which only exist because THIS screen's own internal nav got them there.
        onBack={() => nav(-1)}
        onCreate={(name, days) => {
          dispatch({ type: "SET_PROGRAM", program: mergeEditedDraftIntoProgram(state.program, days, name) });
          nav("/block");
        }}
      />
    );
  }

  return (
    <ScratchStep
      seed={scratchSeed}
      onBack={() => {
        setScratchSeed(null);
        setMode("choose");
      }}
      onCreate={(name, days, weeksCount, dows) => {
        dispatch({ type: "SET_PROGRAM", program: buildProgramFromDraft(name, days, weeksCount, state.profile.name, dows) });
        nav("/block");
      }}
    />
  );
}

function TemplatesStep({ coachName, onBack, onUse }: { coachName: string; onBack: () => void; onUse: (t: Awaited<ReturnType<typeof listCoachTemplates>>[number]) => void }) {
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof listCoachTemplates>> | null>(null);

  useEffect(() => {
    let active = true;
    listCoachTemplates().then((t) => active && setTemplates(t));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="screen">
      <SubHeader title="Saved templates" onBack={onBack} />
      <div className="screen-scroll">
        {templates?.length === 0 && <InfoBanner icon="ph-tray">{coachName} hasn't saved any templates yet.</InfoBanner>}
        {(templates ?? []).map((t) => (
          <div key={t.id} className="cell">
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{t.name}</div>
            <div className="mu" style={{ marginTop: 2 }}>{t.weeks} weeks · {t.daysPerWeek} days/week</div>
            <button className="btn btn-primary btn-block" style={{ height: 48, marginTop: 9, fontSize: 12.5 }} onClick={() => onUse(t)}>
              Use this template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScratchStep({ seed, editMode, onBack, onCreate }: { seed: ScratchSeed | null; editMode?: boolean; onBack: () => void; onCreate: (name: string, days: DraftDay[], weeksCount: number, dows: number[]) => void }) {
  const { account } = useAuth();
  const { dispatch: clientDispatch } = useStore();
  const [name, setName] = useState(seed?.name || "My Program");
  const [weeksCount, setWeeksCount] = useState(seed?.weeks ?? 6);
  const [days, setDays] = useState<DraftDay[]>(seed?.days.length ? seed.days : [{ name: "Day 1", exercises: [] }, { name: "Day 2", exercises: [] }, { name: "Day 3", exercises: [] }]);
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  // A template that trains Mon/Wed/Sat should open on Mon/Wed/Sat, not on an even spread that happens to
  // land elsewhere -- otherwise a day someone thinks of as Saturday quietly becomes a different weekday.
  const [dows, setDows] = useState<number[]>(() =>
    seed?.dows?.length ? resizeDows(seed.dows, seed.days.length || 3) : defaultDows(seed?.days.length || 3),
  );

  function saveAsTemplate() {
    if (!account) return;
    setSavingTemplate(true);
    const template = { ...csvDraftDaysToCoachProgram(name || "My Program", days, weeksCount), isTemplate: true, visibility: "private" as const };
    writeTemplateToCoach(account.id, template)
      .then(() => {
        clientDispatch({ type: "SHOW_TOAST", message: "Saved as a template — find it in Programs > Templates." });
        setTimeout(() => clientDispatch({ type: "CLEAR_TOAST" }), 3200);
      })
      .catch(() => {
        clientDispatch({ type: "SHOW_TOAST", message: "Couldn't save that template — try again." });
        setTimeout(() => clientDispatch({ type: "CLEAR_TOAST" }), 3200);
      })
      .finally(() => setSavingTemplate(false));
  }

  const totalExercises = days.reduce((n, d) => n + d.exercises.length, 0);

  function setDaysCount(n: number) {
    const count = Math.max(1, Math.min(7, n));
    setDays((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push({ name: `Day ${next.length + 1}`, exercises: [] });
      return next;
    });
    setDows((prev) => resizeDows(prev, count));
  }

  /** Picking weekdays is what decides how many sessions a week there are, so the day list follows the
   * selection rather than the two drifting apart. */
  function setTrainingDows(next: number[]) {
    setDows(next);
    setDaysCount(next.length);
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
  function updateExercise(i: number, exIdx: number, patch: Partial<DraftExercise>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, exercises: d.exercises.map((e, ei) => (ei === exIdx ? { ...e, ...patch } : e)) } : d)));
  }

  return (
    <div className="screen">
      <SubHeader title={editMode ? "Edit block" : "From scratch"} onBack={onBack} />
      <div className="screen-scroll">
        <div className="field">
          <label>Program name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {editMode ? (
          <InfoBanner icon="ph-info">Editing what's still ahead — any week already done stays exactly as logged.</InfoBanner>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <div className="cell" style={{ flex: 1 }}>
              <div className="scr">Weeks</div>
              <div className="row" style={{ marginTop: 3, gap: 4 }}>
                <button onClick={() => setWeeksCount((v) => Math.max(1, v - 1))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
                  <i className="ph ph-minus" style={{ fontSize: 12 }} />
                </button>
                <span className="num" style={{ fontWeight: 700, fontSize: 14, flex: 1, textAlign: "center" }}>{weeksCount}</span>
                <button onClick={() => setWeeksCount((v) => Math.min(16, v + 1))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
                  <i className="ph ph-plus" style={{ fontSize: 12 }} />
                </button>
              </div>
            </div>
            <div className="cell" style={{ flex: 1 }}>
              <div className="scr">Days / week</div>
              <div className="row" style={{ marginTop: 3, gap: 4 }}>
                <button onClick={() => setDaysCount(days.length - 1)} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
                  <i className="ph ph-minus" style={{ fontSize: 12 }} />
                </button>
                <span className="num" style={{ fontWeight: 700, fontSize: 14, flex: 1, textAlign: "center" }}>{days.length}</span>
                <button onClick={() => setDaysCount(days.length + 1)} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0 }}>
                  <i className="ph ph-plus" style={{ fontSize: 12 }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {!editMode && (
          <div className="cell">
            <div className="scr" style={{ marginBottom: 7 }}>Training days</div>
            <DayOfWeekPicker value={dows} onChange={setTrainingDows} />
          </div>
        )}

        {days.map((d, i) => (
          <div key={i} className="cell" style={d.exercises.length === 0 ? { border: "1px solid var(--color-warning)" } : undefined}>
            <input className="input" style={{ height: 34, fontSize: 12.5 }} value={d.name} onChange={(e) => renameDay(i, e.target.value)} />
            {/* An empty day still gets scheduled, so it becomes a real dated session with nothing in it.
                Saying so here is the difference between noticing now and finding out on the morning. */}
            {d.exercises.length === 0 && (
              <div className="mu" style={{ marginTop: 6, color: "var(--color-warning)" }}>
                Nothing in this day — it will show up as a rest day on {DOW_NAMES[dows[Math.min(i, dows.length - 1)]] ?? "its scheduled day"}.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {d.exercises.map((ex, ei) => (
                <DraftExerciseCard key={ei} ex={ex} onChange={(patch) => updateExercise(i, ei, patch)} onRemove={() => removeExercise(i, ei)} />
              ))}
            </div>
            <button className="btn btn-secondary btn-block" style={{ height: 44, marginTop: 8, fontSize: 12.5 }} onClick={() => setPickerDay(i)}>
              <i className="ph ph-plus" style={{ fontSize: 12 }} />
              Add exercise
            </button>
          </div>
        ))}

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button
            className="btn btn-primary btn-block"
            style={{ height: 48, opacity: totalExercises > 0 ? 1 : 0.5 }}
            disabled={totalExercises === 0}
            onClick={() => onCreate(name || "My Program", days, weeksCount, dows)}
          >
            {editMode ? "Save changes" : "Start this program"}
          </button>
          {!editMode && account?.role === "coach" && (
            <button
              className="btn btn-secondary btn-block"
              style={{ height: 44, marginTop: 8, fontSize: 12.5, opacity: totalExercises > 0 && !savingTemplate ? 1 : 0.5 }}
              disabled={totalExercises === 0 || savingTemplate}
              onClick={saveAsTemplate}
            >
              {savingTemplate ? "Saving…" : "Save as a template instead"}
            </button>
          )}
          {totalExercises === 0 && <div className="mu" style={{ textAlign: "center", marginTop: 7 }}>Add at least one exercise to a day first.</div>}
        </div>
      </div>

      {pickerDay !== null && (
        <SimpleExercisePicker onPick={(ex) => addExercise(pickerDay, ex)} onClose={() => setPickerDay(null)} />
      )}
    </div>
  );
}

function CsvStep({ onBack, onReview }: { onBack: () => void; onReview: (seed: ScratchSeed) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [source, setSource] = useState<{ type: "file"; file: File } | { type: "url"; url: string } | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [name, setName] = useState("My Program");
  const [weeksCount, setWeeksCount] = useState(6);
  const [linkInput, setLinkInput] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [aiNotes, setAiNotes] = useState<string[]>([]);

  /** The AI import lands in the same preview as a spreadsheet: its days become `parsed`, and nothing is
   * built until the same Build button at the bottom. Its notes are kept apart from `errors` because they
   * mean something different -- "I guessed this" rather than "this row was unusable". */
  function applyAi(result: AiProgramResult, sourceLabel: string) {
    setShowAi(false);
    setSource(null);
    setSheetNames([]);
    setSelectedSheet(null);
    setFileName(sourceLabel);
    setParsed({ days: result.days, rowCount: result.days.reduce((n, d) => n + d.exercises.length, 0), errors: [] });
    setAiNotes(result.notes ?? []);
    if (result.name) setName(result.name);
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
      <SubHeader title="Import a program" onBack={onBack} />
      <div className="screen-scroll">
        <InfoBanner icon="ph-info">
          Upload an Excel (.xlsx) or CSV file with a header row: <strong>Day, Exercise, Muscle, Sets, Reps, Load</strong>. Sets/Reps/Load are optional per row — anything left blank starts at a plain 3×10.
        </InfoBanner>

        <input ref={fileRef} type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <button className="cell row" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
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

        <button className="cell row" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setShowAi(true)}>
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

        <div className="cell">
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
            In OneDrive, set the file to share as "Anyone with the link can view," then paste that link here. Re-run this any time you edit the sheet to pull the latest version — no re-uploading.
          </div>
        </div>
        {linkError && <InfoBanner icon="ph-warning">{linkError}</InfoBanner>}

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

        <AiNotes notes={aiNotes} verb="build" />

        {parsed && parsed.days.length > 0 && (
          <>
            <div className="field">
              <label>Program name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="cell">
              <div className="scr">Weeks (repeats this template)</div>
              <div className="row" style={{ marginTop: 3, gap: 8, justifyContent: "center" }}>
                <button onClick={() => setWeeksCount((v) => Math.max(1, v - 1))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer" }}>
                  <i className="ph ph-minus" style={{ fontSize: 12 }} />
                </button>
                <span className="num" style={{ fontWeight: 700, fontSize: 16 }}>{weeksCount}</span>
                <button onClick={() => setWeeksCount((v) => Math.min(16, v + 1))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer" }}>
                  <i className="ph ph-plus" style={{ fontSize: 12 }} />
                </button>
              </div>
            </div>

            <div>
              <div className="sh">Parsed from your file · {parsed.rowCount} rows</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {parsed.days.map((d, i) => (
                  <div key={i} className="cell">
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
            className="btn btn-primary btn-block"
            style={{ height: 48, opacity: totalExercises > 0 ? 1 : 0.5 }}
            disabled={totalExercises === 0}
            onClick={() => parsed && onReview({ name: name || "My Program", days: parsed.days, weeks: weeksCount })}
          >
            Review & customize
          </button>
        </div>
      </div>
      {showAi && <AiImportSheet onParsed={applyAi} onClose={() => setShowAi(false)} />}
    </div>
  );
}

/** A single set target, editable both by tapping +/- or by typing an exact value directly -- keeps its own
 * draft text while focused so a mid-edit "" isn't fought back to the last committed number, and commits on
 * blur/Enter. Same interaction pattern as the set-logging inputs on the actual workout screen. */
function MiniStepper({ value, onChange, step, min, max }: { value: number; onChange: (v: number) => void; step: number; min: number; max?: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  function clamp(n: number) {
    return max !== undefined ? Math.min(max, Math.max(min, n)) : Math.max(min, n);
  }
  function commit() {
    const n = parseFloat(text);
    if (Number.isFinite(n)) onChange(clamp(n));
    else setText(String(value));
  }
  return (
    <div className="row" style={{ justifyContent: "center", gap: 4, flex: 1, minWidth: 0, border: "1px solid var(--color-divider)", borderRadius: 7, padding: "5px 2px" }}>
      <button onClick={() => onChange(clamp(+(value - step).toFixed(2)))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0, flex: "none" }}>
        <i className="ph ph-minus" style={{ fontSize: 12 }} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            e.currentTarget.blur();
          }
        }}
        style={{ width: 30, minWidth: 0, textAlign: "center", background: "none", border: "none", outline: "none", fontFamily: "var(--font-heading)", fontSize: 12.5, color: "inherit", padding: 0 }}
      />
      <button onClick={() => onChange(clamp(+(value + step).toFixed(2)))} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", padding: 0, flex: "none" }}>
        <i className="ph ph-plus" style={{ fontSize: 12 }} />
      </button>
    </div>
  );
}

/** One exercise's prescription while building or editing a mesocycle -- sets/reps/load target with the
 * same load-mode choice (lb, %1RM, RPE, RIR) the coach's own program builder already offers, since a
 * self-directed lifter needs the same flexibility a coach prescribing for someone else has. Every value is
 * both tappable (+/-) and directly typeable. */
function DraftExerciseCard({ ex, onChange, onRemove }: { ex: DraftExercise; onChange: (patch: Partial<DraftExercise>) => void; onRemove: () => void }) {
  const mode = ex.loadMode ?? "lb";
  const sets = ex.sets ?? 3;
  const reps = ex.reps ?? 10;
  const load = ex.load ?? LOAD_DEFAULT[mode];
  const range = LOAD_RANGE[mode];

  return (
    <div className="cell" style={{ background: "var(--color-neutral-900)" }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="trunc" style={{ fontSize: 12.5 }}>{ex.name}</div>
          <div className="mu" style={{ marginTop: 1 }}>{ex.muscle}</div>
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex" }} aria-label={`Remove ${ex.name}`}>
          <i className="ph ph-trash" style={{ fontSize: 14 }} />
        </button>
      </div>

      <div className="row" style={{ marginBottom: 8 }}>
        <Seg<LoadMode> value={mode} onChange={(m) => onChange({ loadMode: m, load: undefined })} options={LOAD_MODE_OPTIONS} />
      </div>

      <div className="scr" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "0 0 4px" }}>
        <span style={{ textAlign: "center" }}>sets</span>
        <span style={{ textAlign: "center" }}>reps</span>
        <span style={{ textAlign: "center" }}>{LOAD_LABELS[mode]}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <MiniStepper value={sets} min={1} max={10} step={1} onChange={(v) => onChange({ sets: Math.round(v) })} />
        <MiniStepper value={reps} min={1} max={50} step={1} onChange={(v) => onChange({ reps: Math.round(v) })} />
        <MiniStepper value={load} min={range.min} max={range.max} step={range.step} onChange={(v) => onChange({ load: clampLoadValue(v, mode) })} />
      </div>
    </div>
  );
}

