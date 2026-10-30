import type { PlanDay, WeekPlanInput } from "@/lib/types";
import { mondayOf, WEEKDAYS } from "@/lib/week";

const OVERVIEW_RE = /[（(]?鳥瞰[）)]?/;

/** "2026-11-02", "2026/11/2" or "11/2" (in `year`) → "2026-11-02" */
function parseDate(cell: string, year: number): string | null {
  const m = cell.trim().match(/^(?:(\d{4})[-/.])?(\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y ?? year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseDay(cell = ""): PlanDay {
  const overview = OVERVIEW_RE.test(cell);
  const ref = cell.replace(OVERVIEW_RE, "").trim();
  return overview ? { ref, overview } : { ref };
}

/**
 * Rows pasted from a spreadsheet, tab- or comma-separated:
 * 日期（那週任一天）, 主日主題, 主日經文, 一, 二, 三, 四, 五, 六
 * A header row or rows without a date are skipped. "鳥瞰" in a cell marks an overview day.
 */
export function parseSheet(text: string, year: number): (WeekPlanInput & { weekStart: string })[] {
  const out: (WeekPlanInput & { weekStart: string })[] = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(line.includes("\t") ? "\t" : ",");
    const date = parseDate(cells[0] ?? "", year);
    if (!date) continue;
    out.push({
      weekStart: mondayOf(date),
      sundayTheme: cells[1]?.trim() || null,
      sundayPassage: cells[2]?.trim() || null,
      days: WEEKDAYS.map((_, i) => parseDay(cells[3 + i])),
    });
  }
  return out;
}
