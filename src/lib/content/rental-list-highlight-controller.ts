import { RENTAL_LIST_COLORS } from '../rental-list-colors';
import { normalizeText } from '../text';
import { injectStyle } from './inject-style';

/**
 * Highlights cells of the rental list (/rental/rent) for rows that are
 * currently "Vermietet":
 *
 * - `overdue`      — "Mietende" reached → that cell turns yellow
 * - `overdue30`    — "Mietende" 30 minutes or more ago → that cell turns orange
 * - `overdue60`    — "Mietende" 60 minutes or more ago → that cell turns red
 * - `overdueBadge` — adds a black badge with the overdue duration to that cell
 * - `openAmount`   — "Offener Betrag" > 0 → that cell turns red
 *
 * Every rule has its own settings toggle and is registered separately, but all
 * of them share this single controller so that only one observer/timer exists.
 * The overdue colours cannot stack — the most severe enabled one wins. Rules
 * that target different cells combine freely.
 */
export type RentalListHighlightRule =
  | 'openAmount'
  | 'overdue'
  | 'overdue30'
  | 'overdue60'
  | 'overdueBadge';

const STYLE_ID = 'approom-rental-list-highlight-style';
const END_CELL_ATTRIBUTE = 'data-app-room-overdue';
const BADGE_ATTRIBUTE = 'data-app-room-overdue-badge';
const OPEN_AMOUNT_CELL_ATTRIBUTE = 'data-app-room-open-amount';
const OVERDUE_COLOR_VARIABLE = '--approom-overdue-color';

const STATUS_RENTED = 'Vermietet';
// "Mietende" cannot be hidden via the column chooser, so it is a safe anchor.
const END_COLUMN_HEADER = 'Mietende';
const STATUS_CELL_SELECTOR = '.column-status-class';
const END_CELL_SELECTOR = '.column-end-class';
const OPEN_AMOUNT_CELL_SELECTOR = '.column-paymentStatus-class';
const BODY_ROW_SELECTOR = 'tr[data-pc-section="bodyrow"]';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const OVERDUE_THRESHOLDS: Array<{ rule: RentalListHighlightRule; offset: number; color: string }> = [
  { rule: 'overdue60', offset: 60 * MINUTE, color: RENTAL_LIST_COLORS.overdue60 },
  { rule: 'overdue30', offset: 30 * MINUTE, color: RENTAL_LIST_COLORS.overdue30 },
  { rule: 'overdue', offset: 0, color: RENTAL_LIST_COLORS.overdue },
];

const MIN_REFRESH_DELAY = 1000;
const MAX_REFRESH_DELAY = 12 * HOUR;

const STYLE = `
td[${END_CELL_ATTRIBUTE}] {
  background-color: var(${OVERDUE_COLOR_VARIABLE}, transparent) !important;
}
span[${BADGE_ATTRIBUTE}] {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 9px;
  background-color: #000;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  white-space: nowrap;
  vertical-align: middle;
}
td[${OPEN_AMOUNT_CELL_ATTRIBUTE}] {
  background-color: ${RENTAL_LIST_COLORS.openAmount} !important;
}
`;

type RowHighlight = {
  /** Background of the "Mietende" cell, or null when it should stay untouched. */
  overdueColor: string | null;
  /** Text of the overdue badge in the "Mietende" cell, or null for no badge. */
  badgeText: string | null;
  /** "Offener Betrag" > 0 — colours that cell red. */
  highlightOpenAmount: boolean;
  nextChangeAt: number | null;
};

function parseAmount(value: string) {
  const cleaned = normalizeText(value).replace(/[^\d.,-]/g, '');
  const normalized =
    cleaned.includes(',') && !cleaned.includes('.')
      ? cleaned.replace(',', '.')
      : cleaned.replace(/,/g, '');
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseEndDate(value: string) {
  const match = normalizeText(value).match(/^(\d{2})\.(\d{2})\.(\d{4})(?: (\d{1,2}):(\d{2}))?/);
  if (!match) {
    return null;
  }

  const [, day, month, year, hours, minutes] = match;
  // A date without a time is only overdue once the day is over.
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hours === undefined ? 23 : Number(hours),
    minutes === undefined ? 59 : Number(minutes),
  );

  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function formatOverdue(elapsed: number) {
  const totalMinutes = Math.floor(elapsed / MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `+${minutes} Min.`;
  }

  return minutes === 0 ? `+${hours} Std.` : `+${hours} Std. ${minutes} Min.`;
}

function findRentalTable() {
  const header = Array.from(document.querySelectorAll<HTMLElement>('th span')).find(
    (span) => normalizeText(span.textContent) === END_COLUMN_HEADER,
  );

  return header?.closest('table') ?? null;
}

function isRented(row: HTMLTableRowElement) {
  const statusCell = row.querySelector(STATUS_CELL_SELECTOR);
  if (!statusCell) {
    return false;
  }

  return Array.from(statusCell.querySelectorAll('span')).some(
    (badge) => normalizeText(badge.textContent) === STATUS_RENTED,
  );
}

/** Puts the badge right after the date text, so it stays on the same line. */
function setOverdueBadge(endCell: HTMLElement, text: string | null) {
  const existing = endCell.querySelector<HTMLElement>(`span[${BADGE_ATTRIBUTE}]`);

  if (!text) {
    existing?.remove();
    return;
  }

  if (existing) {
    // Assigning identical text would still replace the text node and retrigger
    // the observer, so only write when it actually changed.
    if (existing.textContent !== text) {
      existing.textContent = text;
    }
    return;
  }

  const dateSpan = Array.from(endCell.querySelectorAll('span')).find(
    (span) => !span.querySelector('span') && !span.hasAttribute(BADGE_ATTRIBUTE),
  );
  if (!dateSpan) {
    return;
  }

  const badge = document.createElement('span');
  badge.setAttribute(BADGE_ATTRIBUTE, 'true');
  badge.textContent = text;
  dateSpan.after(badge);
}

/** The row is not (or not yet) overdue — only the open-amount cell may be marked. */
function withoutOverdue(highlightOpenAmount: boolean): RowHighlight {
  return { overdueColor: null, badgeText: null, highlightOpenAmount, nextChangeAt: null };
}

function applyRowHighlight(row: HTMLTableRowElement, state: RowHighlight) {
  const endCellContent = row.querySelector<HTMLElement>(END_CELL_SELECTOR);
  const endCell = endCellContent?.closest('td') ?? null;

  if (endCellContent && endCell) {
    if (state.overdueColor) {
      if (!endCell.hasAttribute(END_CELL_ATTRIBUTE)) {
        endCell.setAttribute(END_CELL_ATTRIBUTE, 'true');
      }

      if (endCell.style.getPropertyValue(OVERDUE_COLOR_VARIABLE) !== state.overdueColor) {
        endCell.style.setProperty(OVERDUE_COLOR_VARIABLE, state.overdueColor);
      }
    } else if (endCell.hasAttribute(END_CELL_ATTRIBUTE)) {
      endCell.removeAttribute(END_CELL_ATTRIBUTE);
      endCell.style.removeProperty(OVERDUE_COLOR_VARIABLE);
    }

    setOverdueBadge(endCellContent, state.badgeText);
  }

  const openAmountCell = row.querySelector(OPEN_AMOUNT_CELL_SELECTOR)?.closest('td') ?? null;
  if (openAmountCell && state.highlightOpenAmount !== openAmountCell.hasAttribute(OPEN_AMOUNT_CELL_ATTRIBUTE)) {
    openAmountCell.toggleAttribute(OPEN_AMOUNT_CELL_ATTRIBUTE, state.highlightOpenAmount);
  }
}

export class RentalListHighlightController {
  private readonly enabledRules = new Set<RentalListHighlightRule>();

  private root: HTMLElement | null = null;

  private observer: MutationObserver | null = null;

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  mount(rule: RentalListHighlightRule) {
    this.enabledRules.add(rule);
    injectStyle(STYLE_ID, STYLE);
    this.bindRoot();
    this.apply();
  }

  private bindRoot() {
    const table = findRentalTable();
    if (!table) {
      return;
    }

    // The rows may live in a sibling table of a scrollable datatable, so watch
    // the whole datatable container instead of just the anchored table.
    const root =
      table.closest<HTMLElement>('[data-pc-name="datatable"]') ?? table.parentElement ?? table;

    if (this.root === root) {
      return;
    }

    this.observer?.disconnect();
    this.root = root;
    this.observer = new MutationObserver(() => this.apply());
    this.observer.observe(root, { childList: true, subtree: true });
  }

  private apply() {
    if (!this.root) {
      return;
    }

    this.observer?.disconnect();

    try {
      const now = Date.now();
      let nextChangeAt = Number.POSITIVE_INFINITY;

      for (const row of this.root.querySelectorAll<HTMLTableRowElement>(BODY_ROW_SELECTOR)) {
        const state = this.evaluateRow(row, now);
        applyRowHighlight(row, state);

        if (state.nextChangeAt !== null) {
          nextChangeAt = Math.min(nextChangeAt, state.nextChangeAt);
        }
      }

      this.scheduleRefresh(nextChangeAt, now);
    } finally {
      this.observer?.observe(this.root, { childList: true, subtree: true });
    }
  }

  private evaluateRow(row: HTMLTableRowElement, now: number): RowHighlight {
    if (!isRented(row)) {
      return withoutOverdue(false);
    }

    const highlightOpenAmount =
      this.enabledRules.has('openAmount') &&
      parseAmount(row.querySelector(OPEN_AMOUNT_CELL_SELECTOR)?.textContent ?? '') > 0;

    const endsAt = parseEndDate(row.querySelector(END_CELL_SELECTOR)?.textContent ?? '');
    if (endsAt === null) {
      return withoutOverdue(highlightOpenAmount);
    }

    let overdueColor: string | null = null;
    let nextChangeAt: number | null = null;

    const track = (timestamp: number) => {
      nextChangeAt = nextChangeAt === null ? timestamp : Math.min(nextChangeAt, timestamp);
    };

    for (const threshold of OVERDUE_THRESHOLDS) {
      if (!this.enabledRules.has(threshold.rule)) {
        continue;
      }

      const reachedAt = endsAt + threshold.offset;

      if (now >= reachedAt) {
        // Thresholds are ordered most severe first — the first hit wins.
        overdueColor = overdueColor ?? threshold.color;
        continue;
      }

      // Re-evaluate exactly when this row crosses the threshold.
      track(reachedAt);
    }

    let badgeText: string | null = null;

    if (this.enabledRules.has('overdueBadge')) {
      if (now >= endsAt) {
        badgeText = formatOverdue(now - endsAt);
        // The badge counts minutes, so it needs the next whole minute after Mietende.
        track(endsAt + (Math.floor((now - endsAt) / MINUTE) + 1) * MINUTE);
      } else {
        track(endsAt);
      }
    }

    return { overdueColor, badgeText, highlightOpenAmount, nextChangeAt };
  }

  private scheduleRefresh(nextChangeAt: number, now: number) {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (!Number.isFinite(nextChangeAt)) {
      return;
    }

    const delay = Math.min(Math.max(nextChangeAt - now, MIN_REFRESH_DELAY), MAX_REFRESH_DELAY);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.apply();
    }, delay);
  }
}
