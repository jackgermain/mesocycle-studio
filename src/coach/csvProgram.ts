import type { DraftDay, DraftExercise } from "../shared/programConvert";
import { canonicalizeImportedName } from "./exerciseLibrary";

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
  /** Weekdays the sheet itself names, as offsets from Monday, when the layout carries them (a "D1 (Monday)"
   * header does; a flat table does not). Without this a Mon/Wed/Fri/Sat program imports onto four
   * consecutive days, which is a different program -- see G119 and G122. */
  dows?: number[];
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
    byDay.get(dayName)!.exercises.push({ ...canonicalizeImportedName(exerciseName, muscle), sets, reps, load: load !== undefined && Number.isFinite(load) ? load : undefined });
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
        ...canonicalizeImportedName(titleCase(name), sheetMuscle),
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

function sheetRows(wb: { Sheets: Record<string, unknown> }, name: string): string[][] {
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: "" });
  return raw.map((r) => r.map((c) => String(c ?? "").trim()));
}

const WEEKDAY_INDEX: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
  mon: 0, tue: 1, tues: 1, wed: 2, thu: 3, thur: 3, thurs: 3, fri: 4, sat: 5, sun: 6,
};

/** "D1 (Monday)", "D2", "Day 3 (Friday)", and "D1 (Monday) 2/2" -- the day heading in these sheets.
 *
 * **The trailing date is load-bearing and was missed the first time.** A real client program dates every
 * day in its own heading ("D1 (Monday) 2/2", "D2 (Tuesday) 2/3"). Anchoring immediately after the weekday
 * made that entire file unreadable: no day columns, so no days AND no error, so the user was handed the
 * generic "couldn't read this sheet" message -- the same silent failure this parser was written to replace.
 *
 * Only a date-shaped token is allowed after the weekday, so a heading with arbitrary prose after it is
 * still refused rather than half-read. */
const DAY_HEADER = /^(?:D|DAY)\s*(\d+)\s*(?:\(\s*([A-Za-z]+)\s*\))?(?:\s+[\d/.-]+)?\s*$/i;

/** The heading that announces the next week block -- "Week 2  —  w/c Mon Feb 9, 2026".
 *
 * It sits in the same column as that day's exercises, below a gap, so it has to be rejected by name. The
 * structural alternative -- ending a day at its first blank row -- was tried and was wrong: a real client
 * sheet leaves three empty rows mid-column and then resumes, and that rule silently dropped the exercise
 * underneath. The legitimate gap is longer than the terminating one, so counting blanks cannot separate
 * them. Matching the label is narrow and safe: no exercise is called "Week something". */
const WEEK_LABEL = /^week\b/i;

/** Column headings that mean "this column holds a number about the exercise to my left". */
const FIELD_HEADS = new Set(["sets", "set", "reps", "rep", "weight", "load", "rir", "rpe", "time"]);

/** The week-block layout every real sheet in this project actually uses.
 *
 * This is a THIRD dialect, and it exists because the other two could not read a single one of Jack's files.
 * `rowsToDraftDays` wants a flat header row; `parseGridLayoutToDraftDays` wants the literal text "DAY 1"
 * plus "T1"/"T2" tier codes and a "SET" sub-header. What his sheets have is:
 *
 *     D1 (Monday) | Sets | Reps |  | D2 (Wednesday) | Sets | Reps |  | D3 (Friday) | Sets | Reps
 *     Lat Pulldown |  2.0 | 16,13 |  | 2 Arm Dumbbell Row | 3.0 | 14,11 | …
 *
 * Days run side by side across the sheet; exercises run down under each day; the whole header block repeats
 * every dozen rows, once per week. Measured against three real files, the old pair returned zero days and --
 * worse -- zero errors, so the user was shown the flat parser's "first row must be a header" message, which
 * describes a problem they do not have.
 *
 * Four decisions worth stating, because none of them is forced by the data:
 *
 *   - **Only the first week block is read.** Every week in a block repeats the same split (G116), and the
 *     app runs its own week-to-week progression once a program starts, so what it needs from a sheet is a
 *     starting point. `parseGridLayoutToDraftDays` already took this view for the same reason.
 *   - **The weekday in the heading becomes the program's training day.** A Mon/Wed/Fri/Sat sheet that
 *     imports onto four consecutive days is a different program from the one that was uploaded.
 *   - **Reps take the FIRST number in a list.** "11,9,7" is a descending prescription and the app stores one
 *     rep target per exercise, which seeds every set; seeding from the top set is how the sheet was written.
 *     (The other grid parser takes the last, but there each set is its own ROW, so "last" means something
 *     different there than it would here.)
 *   - **Muscle is inferred from the exercise name**, since this layout has no muscle column at all.
 *     `canonicalizeImportedName` already does exactly this and falls back to "General".
 */
export function parseWeekBlockLayoutToDraftDays(rows: string[][]): CsvParseResult {
  const cell = (r: number, c: number) => String(rows[r]?.[c] ?? "").trim();

  const headerCellsAt = (r: number) => {
    const found: { col: number; n: number; weekday?: string }[] = [];
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      const m = cell(r, c).match(DAY_HEADER);
      if (m) found.push({ col: c, n: Number(m[1]), weekday: m[2]?.toLowerCase() });
    }
    return found;
  };

  // The first header row that also has a Sets/Reps-style column beside a day. That second condition is what
  // keeps this parser off the "DAY 1" + tier-code dialect, which the grid parser below handles properly.
  let headerRow = -1;
  let dayCells: { col: number; n: number; weekday?: string }[] = [];
  for (let r = 0; r < rows.length && headerRow === -1; r++) {
    const found = headerCellsAt(r);
    if (!found.length) continue;
    const hasField = found.some((d) => {
      for (let c = d.col + 1; c <= d.col + 6; c++) if (FIELD_HEADS.has(cell(r, c).toLowerCase())) return true;
      return false;
    });
    if (hasField) {
      headerRow = r;
      dayCells = found;
    }
  }
  if (headerRow === -1) return { days: [], rowCount: 0, errors: [] };

  // Week one ends where week two's header begins.
  let endRow = rows.length;
  for (let r = headerRow + 1; r < rows.length; r++) {
    if (headerCellsAt(r).length) {
      endRow = r;
      break;
    }
  }

  const days: DraftDay[] = [];
  const dows: number[] = [];
  let rowCount = 0;

  dayCells.forEach((day, i) => {
    const limit = dayCells[i + 1]?.col ?? day.col + 8;
    const fields: Record<string, number> = {};
    for (let c = day.col + 1; c < limit; c++) {
      const head = cell(headerRow, c).toLowerCase();
      if (FIELD_HEADS.has(head) && fields[head] === undefined) fields[head] = c;
    }

    const exercises: DraftExercise[] = [];
    for (let r = headerRow + 1; r < endRow; r++) {
      const name = cell(r, day.col);
      // Blanks are skipped rather than ending the day -- see WEEK_LABEL for why the obvious alternative is
      // wrong. What must not be read as an exercise is the next week block's label or another day heading.
      if (!name || DAY_HEADER.test(name) || WEEK_LABEL.test(name)) continue;
      const sets = firstNumber(cell(r, fields.sets ?? fields.set ?? -1));
      const reps = firstNumber(cell(r, fields.reps ?? fields.rep ?? -1));
      const load = firstNumber(cell(r, fields.weight ?? fields.load ?? -1));
      exercises.push({
        ...canonicalizeImportedName(titleCase(name)),
        sets: sets !== undefined ? Math.round(sets) : undefined,
        reps: reps !== undefined ? Math.round(reps) : undefined,
        load,
      });
      rowCount++;
    }

    // A day column with a heading but nothing under it is a rest day in that block -- Jack's own sheet has
    // an empty Friday for nine weeks. Dropping it keeps `days` and `dows` the same length, which matters
    // because buildProgramFromDraft pairs them by index.
    if (!exercises.length) return;
    days.push({ name: day.weekday ? titleCase(day.weekday) : `Day ${day.n}`, exercises });
    const dow = day.weekday ? WEEKDAY_INDEX[day.weekday] : undefined;
    if (dow !== undefined) dows.push(dow);
  });

  if (!days.length) return { days: [], rowCount: 0, errors: ["Found day headings but no exercises under them."] };
  return { days, rowCount, errors: [], dows: dows.length === days.length ? dows : undefined };
}

/** The first number in a cell, so "2.0" is 2 and "11,9,7" is 11. Returns undefined for "" and for text. */
function firstNumber(raw: string): number | undefined {
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return undefined;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Tries the plain "Day, Exercise, Muscle…" header format first (the common case for a simple export), then
 * the two real-spreadsheet layouts, rather than just failing -- a coach uploading their actual program is far
 * more likely to have one of those than a hand-typed flat table.
 *
 * When everything fails the error has to describe what was actually wanted. It used to return the flat
 * parser's "first row must be a header" message for any unreadable file, including sheets that were nowhere
 * near that format, because the grid parser returned no days AND no errors -- a silent failure that made the
 * flat error the only thing left to show. */
export function resolveDraftDays(rows: string[][]): CsvParseResult {
  const flat = rowsToDraftDays(rows);
  if (flat.days.length > 0) return flat;
  const weekBlock = parseWeekBlockLayoutToDraftDays(rows);
  if (weekBlock.days.length > 0) return weekBlock;
  const grid = parseGridLayoutToDraftDays(rows);
  if (grid.days.length > 0) return grid;

  // Prefer a real explanation from whichever layout got furthest over the flat parser's generic one.
  const specific = [...weekBlock.errors, ...grid.errors];
  if (specific.length) return { days: [], rowCount: 0, errors: specific };
  return {
    days: [],
    rowCount: 0,
    errors: [
      "Couldn't read this sheet. It needs either a header row (Day, Exercise, Muscle, Sets, Reps, Load), or day columns headed like \"D1 (Monday)\" with Sets and Reps beside them and the exercises listed underneath.",
    ],
  };
}

/** Every sheet in a workbook, in order -- used to let the user pick which one to import when a file has
 * more than one (a periodized template often has one sheet per training phase). */
export async function listXlsxSheetNames(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return wb.SheetNames;
}

/** Parses a real .xlsx/.xls workbook the same way parseCsvToDraftDays parses a CSV. Uses the SheetJS
 * `XLSX` global loaded via script tag in index.html rather than an npm dependency, since this environment
 * has no npm registry access to install one. */
export async function parseXlsxToDraftDays(file: File, sheetName?: string): Promise<CsvParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return resolveDraftDays(sheetRows(wb, sheetName ?? wb.SheetNames[0]));
}

/** Converts a OneDrive/SharePoint "anyone with the link can view" sharing URL into the legacy OneDrive
 * API's anonymous direct-download endpoint, so a linked spreadsheet can be re-fetched from the browser with
 * no sign-in required -- the same technique a number of unofficial "OneDrive direct link" tools use
 * client-side. Only works when the link is actually set to allow anonymous viewing; Microsoft Graph's
 * modern /shares endpoint requires an auth token even for "anonymous" links, but this older API doesn't. */
function oneDriveDownloadUrl(shareUrl: string): string {
  const base64 = btoa(shareUrl.trim());
  const encoded = "u!" + base64.replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
  return `https://api.onedrive.com/v1.0/shares/${encoded}/root/content`;
}

function isOneDriveShareUrl(url: string): boolean {
  return /^https:\/\/(1drv\.ms|[^/]*\.sharepoint\.com|onedrive\.live\.com)\//i.test(url.trim());
}

async function fetchWorkbookBuffer(url: string): Promise<ArrayBuffer> {
  const fetchUrl = isOneDriveShareUrl(url) ? oneDriveDownloadUrl(url) : url;
  let res: Response;
  try {
    res = await fetch(fetchUrl);
  } catch {
    throw new Error("Couldn't reach that link. Check it's set to \"Anyone with the link can view.\"");
  }
  if (!res.ok) {
    throw new Error(`Couldn't download that file (${res.status}). Check it's set to "Anyone with the link can view."`);
  }
  return res.arrayBuffer();
}

/** Same as listXlsxSheetNames, but for a file reached by URL (a OneDrive/SharePoint share link, or any
 * other directly-fetchable .xlsx URL) instead of a local upload -- lets a program stay linked to a
 * spreadsheet that keeps changing, re-synced on demand rather than re-uploaded by hand each time. */
export async function listXlsxSheetNamesFromUrl(url: string): Promise<string[]> {
  const buf = await fetchWorkbookBuffer(url);
  const wb = XLSX.read(buf, { type: "array" });
  return wb.SheetNames;
}

export async function parseXlsxFromUrl(url: string, sheetName?: string): Promise<CsvParseResult> {
  const buf = await fetchWorkbookBuffer(url);
  const wb = XLSX.read(buf, { type: "array" });
  return resolveDraftDays(sheetRows(wb, sheetName ?? wb.SheetNames[0]));
}
