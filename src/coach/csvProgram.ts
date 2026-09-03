import type { DraftDay } from "../shared/programConvert";

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
 * one: whatever's in the sheet becomes the actual program. */
export function parseCsvToDraftDays(text: string): CsvParseResult {
  const rows = parseCsv(text);
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
