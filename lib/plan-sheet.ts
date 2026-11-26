import type { PlanDay, WeekPlanInput } from "@/lib/types";
import { addDays, mondayOf, weekday, WEEKDAYS } from "@/lib/week";

const OVERVIEW_RE = /[（(]?鳥瞰[）)]?/;
const WEEKDAY_RE = /^(?:星期|禮拜|週|周)([一二三四五六日天])$/;
// "加3:1-5" → "加"; a ref that starts with a number ("3:15-20") borrows the book before it
const BOOK_RE = /^([^\d\s:：、,，]+?)\s*\d/;

type SheetWeek = WeekPlanInput & { weekStart: string };

/** "2026-11-02", "2026/11/2", "11/2" or "1月4日" (in `year`) → [year, month, day] */
function parseDate(cell: string, year: number): [number, number, number] | null {
  const m = cell.trim().match(/^(?:(\d{4})[-/.年])?(\d{1,2})[-/.月](\d{1,2})日?$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return [y ? Number(y) : year, Number(mo), Number(d)];
}

function iso([y, m, d]: readonly [number, number, number]): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "加拉太書鳥瞰" → { ref: "加拉太書", overview: true } */
export function parseDay(cell = ""): PlanDay {
  const overview = OVERVIEW_RE.test(cell);
  const ref = cell.replace(OVERVIEW_RE, "").trim();
  return overview ? { ref, overview } : { ref };
}

function splitRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(line.includes("\t") ? "\t" : ",").map((c) => c.trim()));
}

type Columns = { theme: number; date: number; weekday: number; ref: number };

/** Column positions from a header row such as 主題・日期・禮拜幾・經文 */
function headerColumns(cells: string[]): Columns | null {
  const date = cells.indexOf("日期");
  const ref = cells.indexOf("經文");
  const weekday = cells.findIndex((c) => /^(禮拜幾|星期|星期幾|週)$/.test(c));
  if (date < 0 || ref < 0 || weekday < 0) return null;
  return { date, ref, weekday, theme: cells.indexOf("主題") };
}

/** Without a header: the cell before 星期X is the date, the one after it the passage */
function guessColumns(cells: string[]): Columns | null {
  const weekday = cells.findIndex((c) => WEEKDAY_RE.test(c));
  if (weekday < 1) return null;
  return { theme: weekday - 2, date: weekday - 1, weekday, ref: weekday + 1 };
}

/**
 * One row per day, as in 靈修講道進度: 主題, 日期, 禮拜幾, 經文, …
 * The dates often show only month and day, so each takes the year (this, the
 * one before or after) whose weekday matches 禮拜幾. A Sunday row's 主題 and
 * 經文 are that week's sermon theme and passage; a 主題 on a weekday becomes its 節期與備註.
 */
function parseDayRows(rows: string[][], year: number): SheetWeek[] {
  const weeks = new Map<string, SheetWeek>();
  let header: Columns | null = null;
  let book = "";

  for (const cells of rows) {
    header = headerColumns(cells) ?? header;
    const cols = header ?? guessColumns(cells);
    if (!cols) continue;
    const parsed = parseDate(cells[cols.date] ?? "", year);
    if (!parsed) continue;

    const day = cells[cols.weekday]?.match(WEEKDAY_RE)?.[1]?.replace("天", "日");
    const candidates = [parsed, [parsed[0] - 1, parsed[1], parsed[2]], [parsed[0] + 1, parsed[1], parsed[2]]] as const;
    const date = iso(day ? (candidates.find((c) => weekday(iso(c)) === day) ?? parsed) : parsed);

    const weekStart = mondayOf(date);
    const week =
      weeks.get(weekStart) ??
      ({ weekStart, sundayTheme: null, sundayPassage: null, days: WEEKDAYS.map(() => ({ ref: "" })) } as SheetWeek);
    weeks.set(weekStart, week);

    let ref = cells[cols.ref] ?? "";
    const own = ref.match(BOOK_RE);
    if (own) book = own[1];
    else if (/^\d/.test(ref) && book) ref = `${book}${ref}`;

    const index = WEEKDAYS.findIndex((_, i) => addDays(weekStart, i) === date);
    if (index >= 0) {
      week.days[index] = parseDay(ref);
      // A 主題 on a weekday (春節連假) is a season or note, not the sermon
      const mark = cols.theme >= 0 ? cells[cols.theme] : "";
      if (mark && !week.note?.split("、").includes(mark)) week.note = week.note ? `${week.note}、${mark}` : mark;
    } else {
      week.sundayTheme = (cols.theme >= 0 && cells[cols.theme]) || week.sundayTheme;
      week.sundayPassage = ref || week.sundayPassage;
    }
  }
  // Dates laid out ahead with nothing filled in yet would only blank out a week
  return [...weeks.values()]
    .filter((w) => w.sundayTheme || w.sundayPassage || w.days.some((d) => d.ref))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/**
 * Rows pasted from a spreadsheet, tab- or comma-separated, in either layout:
 * - one row per day (主題, 日期, 禮拜幾, 經文 …), recognised by its header or a 星期X column;
 * - one row per week: 日期（那週任一天）, 主日主題, 主日經文, 一, 二, 三, 四, 五, 六.
 * Rows without a date are skipped. "鳥瞰" in a passage marks an overview day.
 */
export function parseSheet(text: string, year: number): SheetWeek[] {
  const rows = splitRows(text);
  if (rows.some((cells) => headerColumns(cells) || guessColumns(cells))) return parseDayRows(rows, year);

  const out: SheetWeek[] = [];
  for (const cells of rows) {
    const parsed = parseDate(cells[0] ?? "", year);
    if (!parsed) continue;
    out.push({
      weekStart: mondayOf(iso(parsed)),
      sundayTheme: cells[1] || null,
      sundayPassage: cells[2] || null,
      days: WEEKDAYS.map((_, i) => parseDay(cells[3 + i])),
    });
  }
  return out;
}
