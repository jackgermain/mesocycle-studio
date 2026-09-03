import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { BackHeader, InfoBanner } from "../components/UI";
import { libraryExercises, MUSCLE_GROUPS } from "../coach/exerciseLibrary";
import type { LibraryExercise } from "../coach/types";
import { listCoachTemplates } from "../shared/templates";
import { buildProgramFromDraft, expandCoachProgramToProgram } from "../shared/programConvert";
import type { DraftDay } from "../shared/programConvert";
import { parseCsvToDraftDays, parseXlsxToDraftDays, listXlsxSheetNames, parseXlsxFromUrl, listXlsxSheetNamesFromUrl } from "../coach/csvProgram";
import type { CsvParseResult } from "../coach/csvProgram";
import { csvDraftDaysToCoachProgram } from "../coach/programOps";
import { writeTemplateToCoach } from "../coach/assignProgram";
import { useAuth } from "../lib/auth";

type Mode = "choose" | "scratch" | "templates" | "csv";
type ScratchSeed = { name: string; days: DraftDay[]; weeks: number };

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
  const [mode, setMode] = useState<Mode>("choose");
  const [scratchSeed, setScratchSeed] = useState<ScratchSeed | null>(null);

  if (mode === "choose") {
    return (
      <div className="screen">
        <BackHeader kicker="Your program" title="Build a program" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-info">Nothing here is prescribed by {state.program.coachName === state.profile.name ? "anyone" : "your coach"} — build your own from scratch, or start from one of {state.program.coachName}'s templates and make it yours.</InfoBanner>

          <button className="cell row" style={{ padding: "14px 12px", textAlign: "left", cursor: "pointer" }} onClick={() => setMode("scratch")}>
            <i className="ph ph-plus-circle" style={{ fontSize: 20, color: "var(--color-accent-300)", marginRight: 4 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>Build from scratch</div>
              <div className="mu" style={{ marginTop: 2 }}>Pick how many days a week, then add whatever exercises you want to each.</div>
            </div>
            <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
          </button>

          <button className="cell row" style={{ padding: "14px 12px", textAlign: "left", cursor: "pointer" }} onClick={() => setMode("templates")}>
            <i className="ph ph-stack" style={{ fontSize: 20, color: "var(--color-accent-300)", marginRight: 4 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>Use a saved template</div>
              <div className="mu" style={{ marginTop: 2 }}>Clone one of {state.program.coachName}'s templates and adjust the sets to fit you.</div>
            </div>
            <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
          </button>

          <button className="cell row" style={{ padding: "14px 12px", textAlign: "left", cursor: "pointer" }} onClick={() => setMode("csv")}>
            <i className="ph ph-file-arrow-up" style={{ fontSize: 20, color: "var(--color-accent-300)", marginRight: 4 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>Import from a spreadsheet</div>
              <div className="mu" style={{ marginTop: 2 }}>Upload an Excel or CSV file of days and exercises and we'll convert it for you.</div>
            </div>
            <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
          </button>
        </div>
      </div>
    );
  }

  if (mode === "templates") {
    return <TemplatesStep coachName={state.program.coachName} onBack={() => setMode("choose")} onUse={(program) => { dispatch({ type: "SET_PROGRAM", program }); nav("/block"); }} />;
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

  return (
    <ScratchStep
      ownerName={state.profile.name}
      seed={scratchSeed}
      onBack={() => {
        setScratchSeed(null);
        setMode("choose");
      }}
      onCreate={(program) => {
        dispatch({ type: "SET_PROGRAM", program });
        nav("/block");
      }}
    />
  );
}

function TemplatesStep({ coachName, onBack, onUse }: { coachName: string; onBack: () => void; onUse: (p: ReturnType<typeof expandCoachProgramToProgram>) => void }) {
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
          <div key={t.id} className="cell" style={{ padding: 12 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{t.name}</div>
            <div className="mu" style={{ marginTop: 2 }}>{t.weeks} weeks · {t.daysPerWeek} days/week</div>
            <button className="btn btn-primary btn-block" style={{ height: 38, marginTop: 9, fontSize: 12.5 }} onClick={() => onUse(expandCoachProgramToProgram(t, coachName))}>
              Use this template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScratchStep({ ownerName, seed, onBack, onCreate }: { ownerName: string; seed: ScratchSeed | null; onBack: () => void; onCreate: (p: ReturnType<typeof buildProgramFromDraft>) => void }) {
  const { account } = useAuth();
  const { dispatch: clientDispatch } = useStore();
  const [name, setName] = useState(seed?.name || "My Program");
  const [weeksCount, setWeeksCount] = useState(seed?.weeks ?? 6);
  const [days, setDays] = useState<DraftDay[]>(seed?.days.length ? seed.days : [{ name: "Day 1", exercises: [] }, { name: "Day 2", exercises: [] }, { name: "Day 3", exercises: [] }]);
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

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
      <SubHeader title="From scratch" onBack={onBack} />
      <div className="screen-scroll">
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
            className="btn btn-primary btn-block"
            style={{ height: 46, opacity: totalExercises > 0 ? 1 : 0.5 }}
            disabled={totalExercises === 0}
            onClick={() => onCreate(buildProgramFromDraft(name || "My Program", days, weeksCount, ownerName))}
          >
            Start this program
          </button>
          {account?.role === "coach" && (
            <button
              className="btn btn-secondary btn-block"
              style={{ height: 40, marginTop: 8, fontSize: 12.5, opacity: totalExercises > 0 && !savingTemplate ? 1 : 0.5 }}
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

  function handleFile(file: File) {
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
      <SubHeader title="Import from a spreadsheet" onBack={onBack} />
      <div className="screen-scroll">
        <InfoBanner icon="ph-info">
          Upload an Excel (.xlsx) or CSV file with a header row: <strong>Day, Exercise, Muscle, Sets, Reps, Load</strong>. Sets/Reps/Load are optional per row — anything left blank starts at a plain 3×10.
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

        {parsed && parsed.days.length > 0 && (
          <>
            <div className="field">
              <label>Program name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
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
            className="btn btn-primary btn-block"
            style={{ height: 46, opacity: totalExercises > 0 ? 1 : 0.5 }}
            disabled={totalExercises === 0}
            onClick={() => parsed && onReview({ name: name || "My Program", days: parsed.days, weeks: weeksCount })}
          >
            Review & customize
          </button>
        </div>
      </div>
    </div>
  );
}

function SimpleExercisePicker({ onPick, onClose }: { onPick: (e: LibraryExercise) => void; onClose: () => void }) {
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
