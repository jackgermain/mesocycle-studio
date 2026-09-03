import type { DraftDay } from "../shared/programConvert";
import { libraryExercises } from "./exerciseLibrary";

/** A minimal RFC-4180-ish CSV parser -- handles quoted fields, escaped quotes ("") inside them, and both
 * \n and \r\n line endings. No external dependency needed for a format this simple. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

export interface CsvParseResult {
  days: DraftDay[];
  rowCount: number;
  errors: string[];
}

const REQUIRED_HEADERS = ["day", "exercise", "muscle"];

/** Turns "Day, Exercise, Muscle, Sets, Reps, Load" rows into the same DraftDay[] shape the from-scratch
 * builder uses, grouped by day in first-seen order. Sets/Reps/Load are optional per row -- missing ones
 * fall back to buildProgramFromDraft's plain 3×10 default. This is a real conversion, not a preview of
 * one: whatever's in the sheet becomes the actual program. Shared by both the CSV and Excel parsers below,
 * since both just need to get to a plain string[][] grid first. */
export function rowsToDraftDays(rows: string[][]): CsvParseResult {
  const errors: string[] = [];
  if (rows.length === 0) return { days: [], rowCount: 0, errors: ["The file is empty."] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length) {
    return { days: [], rowCount: 0, errors: [`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. First row must be a header: Day, Exercise, Muscle, Sets, Reps, Load.`] };
  }

  const idx = {
    day: header.indexOf("day"),
    exercise: header.indexOf("exercise"),
    muscle: header.indexOf("muscle"),
    sets: header.indexOf("sets"),
    reps: header.indexOf("reps"),
    load: header.indexOf("load"),
  };

  const dayOrder: string[] = [];
  const byDay = new Map<string, DraftDay>();
  let rowCount = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const dayName = (row[idx.day] ?? "").trim();
    const exerciseName = (row[idx.exercise] ?? "").trim();
    const muscle = (row[idx.muscle] ?? "").trim();
    if (!dayName && !exerciseName && !muscle) continue;
    if (!dayName || !exerciseName || !muscle) {
      errors.push(`Row ${r + 1}: needs Day, Exercise, and Muscle (got "${dayName}", "${exerciseName}", "${muscle}").`);
      continue;
    }
    const sets = idx.sets >= 0 && row[idx.sets]?.trim() ? Number(row[idx.sets]) : undefined;
    const reps = idx.reps >= 0 && row[idx.reps]?.trim() ? Number(row[idx.reps]) : undefined;
    const load = idx.load >= 0 && row[idx.load]?.trim() ? Number(row[idx.load]) : undefined;
    if (sets !== undefined && (!Number.isFinite(sets) || sets <= 0)) {
      errors.push(`Row ${r + 1}: "${row[idx.sets]}" isn't a valid number of sets.`);
      continue;
    }
    if (reps !== undefined && (!Number.isFinite(reps) || reps <= 0)) {
      errors.push(`Row ${r + 1}: "${row[idx.reps]}" isn't a valid rep count.`);
      continue;
    }

    if (!byDay.has(dayName)) {
      byDay.set(dayName, { name: dayName, exercises: [] });
      dayOrder.push(dayName);
    }
    byDay.get(dayName)!.exercises.push({ name: exerciseName, muscle, sets, reps, load: load !== undefined && Number.isFinite(load) ? load : undefined });
    rowCount++;
  }

  return { days: dayOrder.map((d) => byDay.get(d)!), rowCount, errors };
}

export function parseCsvToDraftDays(text: string): CsvParseResult {
  return rowsToDraftDays(parseCsv(text));
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-/(])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function isTierCode(v: string): boolean {
  return /^T\d+$/i.test(v.trim());
}

function normalizeExerciseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A spreadsheet's own muscle-group tag next to an exercise is often stale -- copy-pasted from a previous
 * row and never updated (a real, common issue in hand-maintained templates, not something we can fix by
 * parsing more carefully). Matching the exercise name against the app's own library gives a more reliable
 * answer when the name is recognizable, so this is tried first and the sheet's tag is only a fallback. */
function guessMuscleFromLibrary(name: string): string | undefined {
  const norm = normalizeExerciseName(name);
  if (!norm) return undefined;
  const tokens = new Set(norm.split(" ").filter(Boolean));

  let best: { muscle: string; score: number } | undefined;
  for (const ex of libraryExercises) {
    const exNorm = normalizeExerciseName(ex.name);
    if (!exNorm) continue;
    if (exNorm === norm) return ex.muscle;

    const exTokens = exNorm.split(" ").filter(Boolean);
    const overlap = exTokens.filter((t) => tokens.has(t)).length;
    // Requiring 2+ shared words (not just a single generic one like "press" or "raise") before counting
    // it as a match keeps this from confidently mislabeling an exercise the library doesn't actually have.
    if (overlap < 2) continue;
    const score = overlap / exTokens.length;
    if (!best || score > best.score) best = { muscle: ex.muscle, score };
  }
  return best?.muscle;
}

/** Parses the "RP-style" periodization layout some coaches use instead of a flat table: multiple training
 * days laid out side by side across the sheet, each a fixed-width block of columns -- a tier code (T1, T2…)
 * and exercise name on one row, then one row per set with Set/Rep/Load/Time columns for week 1 (and further
 * week blocks to the right, which this only reads the first of -- the app already handles week-to-week
 * progression itself once a program is running, so this just needs a starting point). A muscle-group tag
 * follows each exercise's set rows in the same tier column. Detected structurally (by finding "DAY n" and
 * "T<n>" cells and the "SET" sub-header) rather than by fixed row/column numbers, since blank rows between
 * exercises vary by how many sets each one has. */
export function parseGridLayoutToDraftDays(rows: string[][]): CsvParseResult {
  const dayCols: { col: number; label: string }[] = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      const m = String(rows[r][c] ?? "").trim().match(/^DAY\s*(\d+)$/i);
      if (m) dayCols.push({ col: c - 1, label: `Day ${m[1]}` });
    }
  }
  if (dayCols.length === 0) {
    return { days: [], rowCount: 0, errors: [] };
  }

  const days: DraftDay[] = [];
  let rowCount = 0;

  for (const { col: tierCol, label: dayLabel } of dayCols) {
    if (tierCol < 0) continue;
    const nameCol = tierCol + 1;
    const tierRows: number[] = [];
    for (let r = 0; r < rows.length; r++) {
      if (isTierCode(String(rows[r]?.[tierCol] ?? ""))) tierRows.push(r);
    }
    if (tierRows.length === 0) continue;

    const weekdayRaw = String(rows[tierRows[0] - 1]?.[nameCol] ?? "").trim();
    const dayName = weekdayRaw && !/^(WEEK|BASE|LOAD|SET|REP|TIME)/i.test(weekdayRaw) ? titleCase(weekdayRaw) : dayLabel;

    // The Set/Rep/Load header only appears once, above this day's first exercise -- every exercise below
    // shares the same columns, so this is found once per day rather than re-searched per exercise.
    const headerRow = rows[tierRows[0] - 1] ?? [];
    let setCol = -1;
    for (let c = nameCol + 1; c <= tierCol + 12; c++) {
      if (String(headerRow[c] ?? "").trim().toUpperCase() === "SET") {
        setCol = c;
        break;
      }
    }
    if (setCol === -1) continue;
    const repCol = setCol + 1;
    const loadCol = setCol + 2;

    const exercises: DraftDay["exercises"] = [];

    for (let ti = 0; ti < tierRows.length; ti++) {
      const r = tierRows[ti];
      const name = String(rows[r]?.[nameCol] ?? "").trim();
      if (!name) continue;

      const nextTierRow = tierRows[ti + 1] ?? rows.length;
      let sets = 0;
      let lastReps = "";
      let lastLoad = "";
      let rr = r;
      while (rr < nextTierRow) {
        const setVal = String(rows[rr]?.[setCol] ?? "").trim();
        const repVal = String(rows[rr]?.[repCol] ?? "").trim();
        if (!setVal && !repVal) break;
        sets++;
        if (repVal) lastReps = repVal;
        const loadVal = String(rows[rr]?.[loadCol] ?? "").trim();
        if (loadVal) lastLoad = loadVal;
        rr++;
      }
      if (sets === 0) continue;

      let sheetMuscle = "";
      for (let mr = rr; mr < nextTierRow; mr++) {
        const v = String(rows[mr]?.[tierCol] ?? "").trim();
        if (v) {
          if (!isTierCode(v)) sheetMuscle = titleCase(v);
          break;
        }
      }

      const reps = Number(lastReps);
      const load = Number(lastLoad);
      exercises.push({
        name: titleCase(name),
        muscle: guessMuscleFromLibrary(name) || sheetMuscle || "General",
        sets,
        reps: Number.isFinite(reps) && reps > 0 ? reps : undefined,
        load: Number.isFinite(load) && load > 0 ? load : undefined,
      });
      rowCount++;
    }

    if (exercises.length > 0) days.push({ name: dayName, exercises });
  }

  return { days, rowCount, errors: days.length === 0 ? ["Found a day layout but couldn't read any exercises from it."] : [] };
}

declare const XLSX: {
  read(data: ArrayBuffer, opts: { type: string }): { SheetNames: string[]; Sheets: Record<string, unknown> };
  utils: { sheet_to_json(sheet: unknown, opts: { header: number; raw: boolean; defval: string }): unknown[][] };
};

/** Every sheet in a workbook, in order -- used to let the user pick which one to import when a file has
 * more than one (a periodized template often has one sheet per training phase). */
export async function listXlsxSheetNames(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return wb.SheetNames;
}

/** Parses a real .xlsx/.xls workbook the same way parseCsvToDraftDays parses a CSV. Tries the plain
 * "Day, Exercise, Muscle…" header format first (the common case for a simple export); if that sheet isn't
 * laid out that way, falls back to the day-block grid layout above rather than just failing, since a coach
 * uploading their actual program spreadsheet is far more likely to have that than a hand-typed flat table.
 * Uses the SheetJS `XLSX` global loaded via script tag in index.html rather than an npm dependency, since
 * this environment has no npm registry access to install one. */
export async function parseXlsxToDraftDays(file: File, sheetName?: string): Promise<CsvParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const name = sheetName ?? wb.SheetNames[0];
  const sheet = wb.Sheets[name];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  const rows = raw.map((r) => r.map((c) => String(c ?? "").trim()));

  const flat = rowsToDraftDays(rows);
  if (flat.days.length > 0) return flat;
  const grid = parseGridLayoutToDraftDays(rows);
  if (grid.days.length > 0) return grid;
  return flat;
}
