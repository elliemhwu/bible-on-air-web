// ── Studio (晴空) ────────────────────────────────────────────────────────

export const stBtnPrimary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-st-primary px-4 text-sm font-medium text-st-on-primary hover:opacity-90 disabled:opacity-50 transition";

export const stBtnSecondary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-st-line-strong bg-st-surface px-3.5 text-sm text-st-ink hover:border-st-accent disabled:opacity-50 transition";

export const stBtnGold =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-st-gold bg-st-surface px-3.5 text-sm text-st-gold-soft-ink hover:bg-st-warm disabled:opacity-50 transition";

export const stBtnGhost =
  "inline-flex h-8 items-center justify-center gap-1 rounded-lg px-2 text-sm text-st-muted hover:bg-st-soft hover:text-st-ink disabled:opacity-40 transition";

export const stCard = "rounded-[14px] border border-st-line bg-st-surface";

export const stInput =
  "rounded-lg border border-st-line-strong bg-st-surface px-2.5 py-1.5 text-sm text-st-ink placeholder:text-st-placeholder outline-none focus:border-st-accent focus:ring-2 focus:ring-st-accent/20 transition";

/** Segmented control: wrap buttons in `stSegment`, style each with `stSegmentItem(active)` */
export const stSegment = "inline-flex rounded-[10px] bg-st-bg p-[3px]";
export const stSegmentItem = (active: boolean) =>
  `rounded-lg px-3.5 py-1.5 text-sm transition ${active ? "bg-st-surface font-medium text-st-ink shadow-sm" : "text-st-ink-2 hover:text-st-ink"}`;

/** A spreadsheet-like cell: borderless until hovered or focused */
export const stCellInput =
  "w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-st-ink placeholder:text-st-placeholder outline-none transition hover:border-st-line focus:border-st-accent focus:bg-st-surface focus:ring-2 focus:ring-st-accent/20";
