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
import { useDictation } from "../shared/useDictation";
import { parsePrompt } from "../generator/parsePrompt";
import { planWeek } from "../generator/sessionStructure";
import { selectForWeek } from "../generator/select";
import { weekToDraftDays } from "../generator/toDraft";
import { defaultProfile, type EmphasisProfile } from "../generator/coverage";
import { BUILT_IN_TEMPLATES, FREQUENCIES, groupedByCategory } from "../coach/builtInTemplates";
import {
  applyOverride,
  clearTemplateOverride,
  fetchTemplateOverrides,
  saveTemplateOverride,
  type OverrideMap,
  type TemplateOverride,
} from "../shared/templateOverrides";
import type { TemplateSex } from "../coach/womensTemplates";
import type { GoalPriority } from "../generator/weeklyVolume";
import type { Equipment } from "../data/types";
import { blankIntake, TRAINING_AGE_LABELS, type TrainingAge } from "../shared/intake";
import { muscleColorVar } from "../shared/muscleColor";

const LOAD_MODE_OPTIONS: { value: LoadMode; label: string }[] = [
  { value: "lb", label: "None" },
  { value: "pct1rm", label: "%1RM" },
  { value: "rpe", label: "RPE" },
  { value: "rir", label: "RIR" },
];

type Mode = "choose" | "generate" | "scratch" | "templates" | "csv" | "editMesocycle";
const DOW_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type ScratchSeed = {
  name: string;
  days: DraftDay[];
  weeks: number;
  dows?: number[];
  openEnded?: boolean;
  /** Set when the editor was opened to change a TEMPLATE rather than to build a program. Saving then writes
   * an override that everybody sees (migration 0029) instead of starting a block for this person. */
  templateId?: string;
};

/** The questionnaire's answer tables. Each maps a tap onto something the generator actually consumes, so a
 * question that changes nothing does not get asked.
 *
 * **The seven emphasis labels collapse onto two rotations, and that is a known limitation rather than an
 * oversight.** `EmphasisProfile` is two values wide and G112 records why that is too coarse: "Chest &
 * Triceps" and "Back & Biceps" are agonist pairings and "Chest & Back" is a push/pull one, so none of them
 * is expressible as a region. The answer is stored and shown back; until the profile type widens, the
 * pairings steer the goal ordering only. */
const EMPHASIS_OPTIONS: { value: string; label: string; profile: EmphasisProfile; goal: GoalPriority }[] = [
  { value: "lower", label: "Lower body", profile: "glute-priority", goal: "lower-aesthetic" },
  { value: "glutes", label: "Glutes", profile: "glute-priority", goal: "lower-aesthetic" },
  { value: "upper", label: "Upper body", profile: "upper-priority", goal: "upper-aesthetic" },
  { value: "chest-back", label: "Chest & back", profile: "upper-priority", goal: "upper-aesthetic" },
  { value: "chest-tri", label: "Chest & triceps", profile: "upper-priority", goal: "upper-aesthetic" },
  { value: "back-bi", label: "Back & biceps", profile: "upper-priority", goal: "upper-aesthetic" },
  { value: "arms-delts", label: "Arms & shoulders", profile: "upper-priority", goal: "upper-aesthetic" },
];

/** Bodyweight rides along with the dumbbell and barbell answers on purpose: someone whose gym is a pair of
 * dumbbells can still do a push-up, and narrowing to the single implement leaves slots the library cannot
 * fill, which surface as "— pick an exercise —" placeholders in the review. */
const WHERE_OPTIONS: { value: string; label: string; equipment?: Equipment[] }[] = [
  { value: "full", label: "Full gym" },
  { value: "dumbbell", label: "Dumbbells", equipment: ["dumbbell", "bodyweight"] },
  { value: "barbell", label: "Barbell", equipment: ["barbell", "bodyweight"] },
  { value: "machines", label: "Machines & cables", equipment: ["machine", "cable"] },
  { value: "bodyweight", label: "Bodyweight", equipment: ["bodyweight"] },
];

/** G120: four, six, or open-ended, and nothing else. An open-ended block is built at six weeks and marked so
 * it can be extended rather than ending — the weeks are real either way. */
const LENGTH_OPTIONS: { value: string; label: string; weeks: number }[] = [
  { value: "4", label: "4 weeks", weeks: 4 },
  { value: "6", label: "6 weeks", weeks: 6 },
  { value: "open", label: "Keep going until I end it", weeks: 6 },
];

/** G118: in by default rather than asked for. "Abs, calves, forearms, and traps, of course, they're in."
 * The frequency weighting he wanted — "accessories are mostly given when you're training four or five, six
 * times a week" — is not enforced here; it falls out of planCoverage's budget, which spends the mandatory
 * list first. Measured: 3 small-muscle slots a week at two days, 13 at six. */
const DEFAULT_SMALL_MUSCLES = ["Abs", "Obliques", "Calves", "Forearms", "Traps"];

/** Mon/Tue/Thu/Fri — two on, one off, two on, two off. What all ten of Jack's four-day templates run, and
 * not what an even spread produces (G111, G119). */
const DEFAULT_TRAINING_DOWS = [0, 1, 3, 4];

/** One question: a label and a row of chips. Matches IntakeForm's pattern, which has the same job. */
function Ask<T extends string>({ label, hint, options, value, onPick }: {
  label: string;
  hint?: string;
  options: [T, string][];
  value: T | undefined;
  onPick: (v: T | undefined) => void;
}) {
  return (
    <div className="cell">
      <div className="sh">{label}</div>
      {hint && <div className="mu" style={{ marginTop: 2, marginBottom: 7 }}>{hint}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: hint ? 0 : 7 }}>
        {options.map(([v, text]) => (
          <button key={v} className={`chip${value === v ? " on" : ""}`} onClick={() => onPick(value === v ? undefined : v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

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

          <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={() => setMode("generate")}>
            Generate program
          </button>

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

  if (mode === "generate") {
    return (
      <GenerateStep
        // The emphasis defaults off the sex stored for the nutrition maths (N10) rather than being asked
        // again -- a woman who has not said otherwise gets the glute-forward rotation, which is what
        // coverage.ts's defaultProfile already encodes.
        profile={defaultProfile(state.profile.sex)}
        onBack={() => setMode("choose")}
        onReview={(seed) => {
          setScratchSeed(seed);
          setMode("scratch");
        }}
      />
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
        // The nutrition work (N10) is the only place sex is stored, as "male" | "female". Anyone who has not
        // answered it gets the women's set, which is the only one written so far -- and TemplatesStep falls
        // back across populations anyway, so nobody lands on an empty screen while the library is half built.
        sex={state.profile.sex === "male" ? "men" : "women"}
        onBack={() => setMode("choose")}
        onUse={(cp) => {
          setScratchSeed({ ...coachProgramToDraft(cp), dows: cp.trainingDows });
          setMode("scratch");
        }}
        // Same editor, different destination -- carrying templateId is what turns "save" from "start this
        // block for me" into "change this template for everyone". The editMesocycle branch above already
        // works this way, reusing ScratchStep and routing its save elsewhere.
        onEdit={(cp) => {
          setScratchSeed({ ...coachProgramToDraft(cp), dows: cp.trainingDows, templateId: cp.id });
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
        // Editing a template rather than building a block. The save writes an override that every account
        // reads (migration 0029) instead of starting this person on a program -- so a set removed here is a
        // set removed for everybody. Converted through csvDraftDaysToCoachProgram because the override
        // stores BuilderDay[], the same shape the rest of the template library is in.
        if (scratchSeed?.templateId) {
          const templateId = scratchSeed.templateId;
          saveTemplateOverride({
            templateId,
            name,
            days: csvDraftDaysToCoachProgram(name, days, weeksCount).days,
            hidden: false,
          })
            .then(() => {
              setScratchSeed(null);
              setMode("templates");
            })
            .catch((e) => {
              dispatch({ type: "SHOW_TOAST", message: e instanceof Error ? e.message : "That didn't save." });
              setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3500);
            });
          return;
        }
        // G120: a block asked for as "keep going until I end it" carries that through from the questionnaire,
        // so nothing downstream presents it as finishing. The weeks themselves are ordinary and dated.
        const built = buildProgramFromDraft(name, days, weeksCount, state.profile.name, dows);
        dispatch({ type: "SET_PROGRAM", program: scratchSeed?.openEnded ? { ...built, openEnded: true } : built });
        nav("/block");
      }}
    />
  );
}

function TemplatesStep({ coachName, sex, onBack, onUse, onEdit }: { coachName: string; sex: TemplateSex; onBack: () => void; onUse: (t: Awaited<ReturnType<typeof listCoachTemplates>>[number]) => void; onEdit: (t: Awaited<ReturnType<typeof listCoachTemplates>>[number]) => void }) {
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof listCoachTemplates>> | null>(null);
  const { account } = useAuth();
  // Only the platform owner changes the shipped library, because a change here lands on every account
  // (migration 0029). The database enforces it too -- hiding the controls is not access control.
  const canEditLibrary = !!account?.is_platform_admin;

  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Delete and Edit change the library on every account, so neither fires on the tap that asks for it.
  // Jack lost a template to a single tap: "I clicked delete and it deleted whatever the first program was
  // at the top of the list for all womens."
  const [confirming, setConfirming] = useState<{ id: string; action: "delete" | "edit" } | null>(null);

  useEffect(() => {
    let active = true;
    fetchTemplateOverrides().then((o) => active && setOverrides(o));
    return () => {
      active = false;
    };
  }, []);

  /** Upserts the whole row, so the fields not being changed have to be carried across -- otherwise renaming
   * a template would blank out an edit to its exercises, and vice versa. */
  async function patch(templateId: string, change: Partial<TemplateOverride>) {
    const current = overrides[templateId];
    setErr(null);
    try {
      await saveTemplateOverride({
        templateId,
        name: current?.name ?? null,
        days: current?.days ?? null,
        hidden: current?.hidden ?? false,
        ...change,
      });
      setOverrides(await fetchTemplateOverrides());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't save.");
    }
  }

  async function restoreToShipped(templateId: string) {
    setErr(null);
    try {
      await clearTemplateOverride(templateId);
      setOverrides(await fetchTemplateOverrides());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't save.");
    }
  }

  useEffect(() => {
    let active = true;
    listCoachTemplates().then((t) => active && setTemplates(t));
    return () => {
      active = false;
    };
  }, []);

  // Built-in templates ship with the app and need no round trip. Until now the ONLY source was the coach's
  // own coach_state, so a template written in code was unreachable however good it was -- Jack, on the
  // six-day glute split: "that one needs to be an official one 100%... Put that one up on the app now."
  //
  // Which set is showing is a CHOICE, not an inference. It used to be derived from profile.sex, which is
  // only ever set by the nutrition questions (N10) -- so anyone who had not answered those got the women's
  // set and the thirty men's templates were in the bundle, unreachable. A coach also needs both sets on one
  // screen regardless of their own sex, since they write for other people.
  //
  // The profile still picks the STARTING side, so the common case needs no tap.
  const [who, setWho] = useState<TemplateSex>(sex);
  const groups = groupedByCategory(who);

  // Days a week is the first thing anyone filters on: you know what you can train before you know what
  // kind of program you want. null is "all", so the page still opens showing everything.
  const [days, setDays] = useState<number | null>(null);
  const matches = (frequency: number) => days === null || frequency === days;

  // Overrides are applied BEFORE the filters run, so the count shown beside the heading always matches what
  // is actually on screen. applyOverride returns null for a template that has been deleted for everyone.
  const visible = groups
    .map((g) => ({
      ...g,
      templates: g.templates
        .map((t) => ({ t, program: applyOverride(t.program, overrides[t.program.id]) }))
        .filter((x): x is { t: typeof x.t; program: NonNullable<typeof x.program> } => x.program !== null)
        .filter((x) => matches(x.t.frequency)),
    }))
    .filter((g) => g.templates.length > 0);

  // Every deleted template, not only those on whichever side of the men/women switch is showing. Scoped to
  // `groups` this was a trap: a template deleted from the women's list was invisible from the men's tab, so
  // the way back existed only if you already knew which tab to look on.
  const removed = BUILT_IN_TEMPLATES.filter((t) => overrides[t.program.id]?.hidden);
  const savedVisible = (templates ?? []).filter((t) => matches(t.daysPerWeek));

  return (
    <div className="screen">
      <SubHeader title="Templates" onBack={onBack} />
      <div className="screen-scroll">
        <div className="cell">
          <div className="sh" style={{ marginBottom: 7 }}>Days a week</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button className={`chip${days === null ? " on" : ""}`} onClick={() => setDays(null)}>All</button>
            {FREQUENCIES.map((f) => (
              <button key={f} className={`chip${days === f ? " on" : ""}`} onClick={() => setDays(f)}>
                {f} days
              </button>
            ))}
          </div>

          <div className="sh" style={{ marginTop: 13, marginBottom: 7 }}>Men or women</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button className={`chip${who === "women" ? " on" : ""}`} onClick={() => setWho("women")}>Women's</button>
            <button className={`chip${who === "men" ? " on" : ""}`} onClick={() => setWho("men")}>Men's</button>
          </div>
        </div>

        {/* Says which set is on screen. The template names are not a reliable label on their own -- the
            men's all carry "(Men)" but the original women's twenty-two predate the split and carry nothing,
            so without this you cannot tell whose list you are looking at from the names alone. */}
        <div className="sh" style={{ marginTop: 10, marginBottom: 2 }}>
          {who === "women" ? "Women's" : "Men's"} templates · {visible.reduce((n, g) => n + g.templates.length, 0)}
          {days !== null ? ` at ${days} days a week` : ""}
        </div>

        {visible.length === 0 && (
          <InfoBanner icon="ph-tray">No {who === "women" ? "women's" : "men's"} templates at {days} days a week yet.</InfoBanner>
        )}

        {err && <InfoBanner icon="ph-warning">{err}</InfoBanner>}

        {/* Deleting hides rather than destroys -- a template is a code constant and cannot be removed from
            the bundle, so there is always a way back. This sits ABOVE the list on purpose: below it, the way
            back was under thirty-nine cards, which is no use to someone who has just deleted something by
            accident and is looking for it. It only appears when something is actually deleted. */}
        {canEditLibrary && removed.length > 0 && (
          <>
            <button className="btn btn-ghost" style={{ fontSize: 12.5, marginTop: 6 }} onClick={() => setShowRemoved((v) => !v)}>
              {showRemoved ? "Hide" : "Show"} deleted ({removed.length})
            </button>
            {showRemoved &&
              removed.map((t) => (
                <div key={t.program.id} className="cell">
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>
                    {overrides[t.program.id]?.name || t.program.name}
                  </div>
                  {/* Says which set it came from, because this list is no longer filtered by the men/women
                      switch -- without it, a restored name gives no clue where it will reappear. */}
                  <div className="mu" style={{ marginTop: 2 }}>
                    {t.sex === "women" ? "Women's" : "Men's"} · {t.frequency} days a week
                  </div>
                  <button
                    className="btn btn-primary btn-block"
                    style={{ height: 44, marginTop: 7, fontSize: 12.5 }}
                    onClick={() => void restoreToShipped(t.program.id)}
                  >
                    Put it back for everyone
                  </button>
                </div>
              ))}
          </>
        )}

        {visible.map((g) => (
          <div key={g.category}>
            <div className="sh" style={{ marginTop: 6, marginBottom: 4 }}>{g.label}</div>
            {g.templates.map(({ t, program }) => (
              <div key={program.id} className="cell">
                {renaming === program.id ? (
                  <>
                    <input
                      className="input"
                      style={{ height: 38, fontSize: 13 }}
                      value={draftName}
                      autoFocus
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void patch(program.id, { name: draftName.trim() || null });
                          setRenaming(null);
                        }
                        if (e.key === "Escape") setRenaming(null);
                      }}
                    />
                    {/* The rename used to commit on blur, which made it a silent write to every account:
                        tapping another card's Delete would save this rename on the way past, then delete
                        that one. Nothing leaves this card now without the named button being pressed. */}
                    <div className="row" style={{ gap: 6, marginTop: 7 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ height: 36, flex: 1, fontSize: 12 }}
                        onClick={() => {
                          void patch(program.id, { name: draftName.trim() || null });
                          setRenaming(null);
                        }}
                      >
                        Save for everyone
                      </button>
                      <button className="btn btn-primary" style={{ height: 36, flex: 1, fontSize: 12 }} onClick={() => setRenaming(null)}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{program.name}</div>
                )}
                <div className="mu" style={{ marginTop: 2 }}>{t.frequency} days a week · {program.intendedFor}</div>
                <button className="btn btn-primary btn-block" style={{ height: 48, marginTop: 9, fontSize: 12.5 }} onClick={() => onUse(program)}>
                  Use this template
                </button>
                {canEditLibrary && renaming !== program.id && (
                  confirming?.id === program.id ? (
                    <>
                      <div style={{ marginTop: 7 }}>
                        <InfoBanner icon="ph-warning">
                          {confirming.action === "delete"
                            ? `Delete "${program.name}" for everyone? It leaves every account's template list. You can put it back from "Show deleted" at the top of this screen.`
                            : `Edit "${program.name}" for everyone? Whatever you save replaces this template on every account.`}
                        </InfoBanner>
                      </div>
                      {/* Cancel sits where Delete just was, deliberately. This row appears under a finger
                          that has already tapped the rightmost of three buttons, so putting the confirm
                          there would re-create the exact accident that lost a template. The banner above
                          also pushes the row down. A stray second tap cancels. */}
                      <div className="row" style={{ gap: 6, marginTop: 7 }}>
                        <button
                          className="btn btn-secondary"
                          style={{ height: 36, flex: 1, fontSize: 12 }}
                          onClick={() => {
                            const { action } = confirming;
                            setConfirming(null);
                            if (action === "delete") void patch(program.id, { hidden: true });
                            else onEdit(program);
                          }}
                        >
                          {confirming.action === "delete" ? "Delete for everyone" : "Edit for everyone"}
                        </button>
                        <button className="btn btn-primary" style={{ height: 36, flex: 1, fontSize: 12 }} onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="row" style={{ gap: 6, marginTop: 7 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ height: 36, flex: 1, fontSize: 12 }}
                        onClick={() => {
                          setDraftName(program.name);
                          setRenaming(program.id);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ height: 36, flex: 1, fontSize: 12 }}
                        onClick={() => setConfirming({ id: program.id, action: "edit" })}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ height: 36, flex: 1, fontSize: 12 }}
                        onClick={() => setConfirming({ id: program.id, action: "delete" })}
                      >
                        Delete
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="sh" style={{ marginTop: 14, marginBottom: 4 }}>Saved by {coachName}</div>
        {templates?.length === 0 && <InfoBanner icon="ph-tray">{coachName} hasn't saved any templates yet.</InfoBanner>}
        {/* The saved list filters on the same control, so the number of days shown on screen always means
            the same thing whichever section you are looking at. */}
        {savedVisible.map((t) => (
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

/** The questions, then Generate.
 *
 * Jack: "on this screen we need a list of questions for them to answer", and "for these questions, just have
 * it click buttons for the most part". So the answers are chips; the box at the bottom is for whatever the
 * questions did not cover, and feeds the same options through parsePrompt.
 *
 * What is NOT asked is as deliberate as what is. Abs, calves, forearms and traps are in by default (G118)
 * rather than being a question -- "of course, they're in". There is no "how many days" question either,
 * because picking the weekdays answers it (G119). And sex, height and bodyweight are already known from the
 * nutrition work, so they are not asked twice; age is prefilled from it when it is there.
 *
 * The three layers underneath -- planWeek for the shape of the week, selectForWeek for which exercise goes in
 * each slot, profileFor for sets and reps -- existed for a long time with nothing able to reach them. This is
 * the way in.
 *
 * Two things are deliberate. `understood` is shown BEFORE generating, so a misreading of the typed sentence is
 * visible and correctable rather than silently baked into a block. And nothing is saved as a program: this
 * lands in the same editor the spreadsheet and photo imports land in, so every choice can be changed first. */
function GenerateStep({ profile, onBack, onReview }: {
  profile: EmphasisProfile;
  onBack: () => void;
  onReview: (seed: ScratchSeed) => void;
}) {
  const { state, dispatch } = useStore();
  const intake = state.intake ?? blankIntake();
  const [emphasis, setEmphasis] = useState<string | undefined>(undefined);
  const [dows, setDows] = useState<number[]>(DEFAULT_TRAINING_DOWS);
  const [where, setWhere] = useState<string | undefined>("full");
  const [length, setLength] = useState<string | undefined>("6");
  const [experience, setExperience] = useState<TrainingAge | undefined>(intake.trainingAge);
  const [age, setAge] = useState<string>(() => {
    const known = state.profile.ageYears ?? intake.age;
    return known ? String(known) : "";
  });
  const [injuries, setInjuries] = useState(intake.injuries ?? "");
  const [text, setText] = useState("");
  // Dictated text appends rather than replaces -- the recogniser fires once per utterance, and someone
  // adding "and no barbells" after a pause should not lose the first sentence.
  const dictation = useDictation((heard) => setText((t) => (t ? `${t} ${heard}` : heard)));
  const [error, setError] = useState<string | null>(null);
  const parsed = parsePrompt(text);

  function generate() {
    const days = dows.length;
    const picked = EMPHASIS_OPTIONS.find((e) => e.value === emphasis);
    const week = planWeek(days, {
      profile: picked?.profile ?? parsed.profile ?? profile,
      goal: picked?.goal ?? parsed.goal,
      // G118: the small muscles go in by default. Anything named in the text box is added, not substituted.
      wants: [...new Set([...DEFAULT_SMALL_MUSCLES, ...parsed.wants])],
    });
    if (!week) {
      setError(`Nothing planned for ${days} day${days === 1 ? "" : "s"} a week — pick between 2 and 6 days.`);
      return;
    }
    const equipment = WHERE_OPTIONS.find((w) => w.value === where)?.equipment ?? parsed.equipment;
    const filled = selectForWeek(week, { equipment: equipment ? new Set(equipment) : undefined });
    const chosen = LENGTH_OPTIONS.find((l) => l.value === length) ?? LENGTH_OPTIONS[1];

    // The two questions IntakeForm also asks are written back to the intake record rather than living only
    // in this screen's state -- nobody should have to answer the same question twice, and the AI import path
    // already reads `injuries` from there.
    const ageNum = Number(age);
    dispatch({
      type: "SET_INTAKE",
      intake: {
        ...intake,
        trainingAge: experience,
        age: Number.isFinite(ageNum) && ageNum > 0 ? ageNum : intake.age,
        injuries: injuries.trim() || undefined,
      },
    });

    onReview({
      name: "Generated program",
      // No strength bias: G121 puts the default at the high-rep end ("for the most part I would keep the
      // reps a little bit higher"), and the question that let someone opt into heavier openers was removed.
      // profileFor still takes the dial, so restoring the choice later is a UI change, not an engine one.
      days: weekToDraftDays(filled),
      weeks: chosen.weeks,
      dows,
      openEnded: length === "open",
    });
  }

  return (
    <div className="screen">
      <SubHeader title="Generate a program" onBack={onBack} />
      <div className="screen-scroll">
        <Ask
          label="What do you want to bring up?"
          options={EMPHASIS_OPTIONS.map((e) => [e.value, e.label] as [string, string])}
          value={emphasis}
          onPick={setEmphasis}
        />

        {/* G119: which weekdays, not how many. "They don't have to be four consecutive days. The person can
            pick. But have it pick the days of the week before it generates the program." The count of days
            selected is the training frequency, so there is no separate question for it. */}
        <div className="cell">
          <div className="sh" style={{ marginBottom: 7 }}>Which days will you train?</div>
          <DayOfWeekPicker value={dows} onChange={setDows} />
        </div>

        <Ask
          label="Where will you train?"
          options={WHERE_OPTIONS.map((w) => [w.value, w.label] as [string, string])}
          value={where}
          onPick={setWhere}
        />

        <Ask
          label="How long?"
          options={LENGTH_OPTIONS.map((l) => [l.value, l.label] as [string, string])}
          value={length}
          onPick={setLength}
        />

        <Ask
          label="How long have you been training?"
          options={Object.entries(TRAINING_AGE_LABELS) as [TrainingAge, string][]}
          value={experience}
          onPick={setExperience}
        />

        <div className="cell">
          <div className="sh" style={{ marginBottom: 7 }}>How old are you?</div>
          <input
            className="input"
            style={{ height: 40, width: 96 }}
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="—"
          />
        </div>

        <div className="cell">
          <div className="sh">Anything sore, injured, or off limits?</div>
          <div className="mu" style={{ marginTop: 2, marginBottom: 7 }}>Optional, and in your own words.</div>
          <input
            className="input"
            style={{ height: 40 }}
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder="e.g. left shoulder on overhead work"
          />
        </div>

        <div className="field">
          <label>Anything else?</label>
          <textarea
            className="input"
            style={{ minHeight: 66, lineHeight: 1.5 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. no barbells, keep sessions under an hour"
          />
          {dictation.supported && (
            <button
              className={`btn ${dictation.listening ? "btn-solid" : "btn-secondary"}`}
              style={{ height: 36, marginTop: 8, width: "100%" }}
              onClick={dictation.toggle}
            >
              <i className={dictation.listening ? "ph-fill ph-microphone" : "ph ph-microphone"} style={{ fontSize: 14 }} />
              {dictation.listening ? "Listening — tap when you're done" : "Say it instead"}
            </button>
          )}
          {dictation.error && <div className="mu" style={{ marginTop: 6 }}>{dictation.error}</div>}
        </div>

        {parsed.understood.length > 0 && (
          <div className="cell">
            <div className="scr" style={{ marginBottom: 6 }}>What it understood</div>
            <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>
              {parsed.understood.map((u) => (
                <span key={u} className="chip on">{u}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mu" style={{ lineHeight: 1.55 }}>
          Nothing is saved yet — you land in the editor and can change anything before it becomes your program.
        </div>

        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={generate}>
            Continue
          </button>
        </div>
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
      // Both of these can throw, and neither used to be caught.
      //
      // XLSX is a CDN global (see the script tag in index.html), so it is undefined if that request failed
      // -- an installed PWA opened offline, a slow phone, a blocked CDN -- and XLSX.read throws on a file
      // it cannot open. With no catch the rejection was unhandled and setParsed was never called, so the
      // screen stayed exactly as it was: no program, and no error either, because the error banner is
      // gated on `parsed &&` and parsed was still null. Nothing happened and nothing said why.
      listXlsxSheetNames(file)
        .then((names) => {
          setSheetNames(names);
          setSelectedSheet(names[0]);
          return parseXlsxToDraftDays(file, names[0]).then(setParsed);
        })
        .catch((e) =>
          setParsed({
            days: [],
            rowCount: 0,
            errors: [
              `Couldn't open this file: ${e instanceof Error ? e.message : String(e)}. If you're offline, the spreadsheet reader may not have loaded — reconnect and try again.`,
            ],
          }),
        );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setParsed(parseCsvToDraftDays(String(reader.result ?? "")));
      } catch (e) {
        setParsed({ days: [], rowCount: 0, errors: [`Couldn't read this file: ${e instanceof Error ? e.message : String(e)}`] });
      }
    };
    reader.onerror = () => setParsed({ days: [], rowCount: 0, errors: ["Couldn't read that file off the disk. Try picking it again."] });
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
            {/* "1 row skipped" was counting ERRORS, not rows. A file the parser couldn't read at all has one
                error and zero rows, so it announced "1 row skipped" for a sheet where nothing was imported —
                which reads as a near-miss when it is a total failure. */}
            {parsed.rowCount === 0
              ? "Couldn't import this file: "
              : `${parsed.errors.length} row${parsed.errors.length > 1 ? "s" : ""} skipped: `}
            {parsed.errors.slice(0, 4).join(" ")}
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
            onClick={() => parsed && onReview({ name: name || "My Program", days: parsed.days, weeks: weeksCount, dows: parsed.dows })}
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
          {/* A rename the importer made on its own has to be visible, or the coach has no way to know the
              sheet said something else. Shown only when it happened -- sourceName is absent otherwise. */}
          <div className="mu" style={{ marginTop: 1 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: muscleColorVar(ex.muscle) }}>
              <i style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flex: "none" }} />
              {ex.muscle}
            </span>
            {ex.sourceName && <span style={{ opacity: 0.75 }}> · sheet said "{ex.sourceName}"</span>}
          </div>
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex" }} aria-label={`Remove ${ex.name}`}>
          <i className="ph ph-trash" style={{ fontSize: 14 }} />
        </button>
      </div>

      <div className="row" style={{ marginBottom: 8 }}>
        <Seg<LoadMode> value={mode} onChange={(m) => onChange({ loadMode: m, load: undefined })} options={LOAD_MODE_OPTIONS} />
      </div>

      {/* A weight column appears whenever the mode's own number isn't the weight, so "70% at 315" is
          sayable here as well as in the coach builder. */}
      <div className="scr" style={{ display: "grid", gridTemplateColumns: mode === "lb" ? "1fr 1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 8, padding: "0 0 4px" }}>
        <span style={{ textAlign: "center" }}>sets</span>
        <span style={{ textAlign: "center" }}>reps</span>
        {mode !== "lb" && <span style={{ textAlign: "center" }}>weight</span>}
        <span style={{ textAlign: "center" }}>{LOAD_LABELS[mode]}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <MiniStepper value={sets} min={1} max={10} step={1} onChange={(v) => onChange({ sets: Math.round(v) })} />
        <MiniStepper value={reps} min={1} max={50} step={1} onChange={(v) => onChange({ reps: Math.round(v) })} />
        {mode !== "lb" && (
          <MiniStepper value={ex.weight ?? 0} min={0} max={999} step={5} onChange={(v) => onChange({ weight: Math.max(0, Math.round(v)) })} />
        )}
        <MiniStepper value={load} min={range.min} max={range.max} step={range.step} onChange={(v) => onChange({ load: clampLoadValue(v, mode) })} />
      </div>
    </div>
  );
}

