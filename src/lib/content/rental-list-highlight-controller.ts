import { getOnTimeColor, RENTAL_LIST_COLORS } from '../rental-list-colors';
import { normalizeText } from '../text';
import { injectStyle } from './inject-style';

/**
 * Highlights cells of the rental list (/rental/rent). For rows that are
 * currently "Vermietet":
 *
 * - `onTime`       — "Mietende" still ahead → that cell turns green, fading from
 *                    full green at 3.5 hours left to almost white at the Mietende
 * - `overdue`      — "Mietende" reached → that cell turns yellow
 * - `overdue30`    — "Mietende" 30 minutes or more ago → that cell turns orange
 * - `overdue60`    — "Mietende" 60 minutes or more ago → that cell turns red
 * - `overdueBadge` — adds a badge with the remaining ("-2 Std.", white) or the
 *                    overdue ("+45 Min.", black) duration to that cell
 * - `openAmount`   — "Offener Betrag" > 0 → that cell turns red
 *
 * For rows that are "Reserviert":
 *
 * - `reservedPaid` — "Offener Betrag" is 0 → the "Status" cell turns red
 *
 * Every rule has its own settings toggle and is registered separately, but all
 * of them share this single controller so that only one observer/timer exists.
 * The "Mietende" colours cannot stack — `onTime` and the overdue colours are
 * mutually exclusive by time, and of the overdue ones the most severe enabled
 * one wins. Rules that target different cells combine freely.
 */
export type RentalListHighlightRule =
  | 'openAmount'
  | 'onTime'
  | 'overdue'
  | 'overdue30'
  | 'overdue60'
  | 'overdueBadge'
  | 'reservedPaid';

const STYLE_ID = 'approom-rental-list-highlight-style';
// Also set for the green "still on time" colouring, hence the neutral name.
const END_CELL_ATTRIBUTE = 'data-app-room-end-highlight';
const BADGE_ATTRIBUTE = 'data-app-room-overdue-badge';
const OPEN_AMOUNT_CELL_ATTRIBUTE = 'data-app-room-open-amount';
const RESERVED_PAID_CELL_ATTRIBUTE = 'data-app-room-reserved-paid';
const END_COLOR_VARIABLE = '--approom-end-color';

const STATUS_RENTED = 'Vermietet';
const STATUS_RESERVED = 'Reserviert';
// "Mietende" cannot be hidden via the column chooser, so it is a safe anchor.
const END_COLUMN_HEADER = 'Mietende';
const STATUS_CELL_SELECTOR = '.column-status-class';
const END_CELL_SELECTOR = '.column-end-class';
const OPEN_AMOUNT_CELL_SELECTOR = '.column-paymentStatus-class';
const BODY_ROW_SELECTOR = 'tr[data-pc-section="bodyrow"]';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
// From this much time left the green stays at its most vivid; below it the
// shade fades towards white, one step per minute.
const ON_TIME_WINDOW = 3.5 * HOUR;
const ON_TIME_STEPS = ON_TIME_WINDOW / MINUTE;
const OVERDUE_THRESHOLDS: Array<{ rule: RentalListHighlightRule; offset: number; color: string }> = [
  { rule: 'overdue60', offset: 60 * MINUTE, color: RENTAL_LIST_COLORS.overdue60 },
  { rule: 'overdue30', offset: 30 * MINUTE, color: RENTAL_LIST_COLORS.overdue30 },
  { rule: 'overdue', offset: 0, color: RENTAL_LIST_COLORS.overdue },
];

const MIN_REFRESH_DELAY = 1000;
const MAX_REFRESH_DELAY = 12 * HOUR;

const STYLE = `
td[${END_CELL_ATTRIBUTE}] {
  background-color: var(${END_COLOR_VARIABLE}, transparent) !important;
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
span[${BADGE_ATTRIBUTE}="remaining"] {
  background-color: #fff;
  color: #000;
  /* Inset instead of a border so the badge keeps the same size as the black
     one — without an outline it would vanish on a barely green cell. */
  box-shadow: inset 0 0 0 1px #adb5bd;
}
td[${OPEN_AMOUNT_CELL_ATTRIBUTE}] {
  background-color: ${RENTAL_LIST_COLORS.openAmount} !important;
}
td[${RESERVED_PAID_CELL_ATTRIBUTE}] {
  background-color: ${RENTAL_LIST_COLORS.reservedPaid} !important;
}
`;

/** White counts down to the Mietende, black counts up from it. */
type BadgeVariant = 'remaining' | 'overdue';

type RowHighlight = {
  /** Background of the "Mietende" cell, or null when it should stay untouched. */
  endCellColor: string | null;
  /** Badge in the "Mietende" cell, or null for no badge. */
  badge: { text: string; variant: BadgeVariant } | null;
  /** "Offener Betrag" > 0 — colours that cell red. */
  highlightOpenAmount: boolean;
  /** "Reserviert" with nothing left to pay — colours the "Status" cell red. */
  highlightReservedPaid: boolean;
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

function formatDuration(totalMinutes: number, sign: '+' | '-') {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${sign}${minutes} Min.`;
  }

  return minutes === 0 ? `${sign}${hours} Std.` : `${sign}${hours} Std. ${minutes} Min.`;
}

function findRentalTable() {
  const header = Array.from(document.querySelectorAll<HTMLElement>('th span')).find(
    (span) => normalizeText(span.textContent) === END_COLUMN_HEADER,
  );

  return header?.closest('table') ?? null;
}

function hasStatus(row: HTMLTableRowElement, status: string) {
  const statusCell = row.querySelector(STATUS_CELL_SELECTOR);
  if (!statusCell) {
    return false;
  }

  return Array.from(statusCell.querySelectorAll('span')).some(
    (badge) => normalizeText(badge.textContent) === status,
  );
}

/** Null when the "Offener Betrag" column is hidden via the column chooser. */
function readOpenAmount(row: HTMLTableRowElement) {
  const cell = row.querySelector(OPEN_AMOUNT_CELL_SELECTOR);
  return cell ? parseAmount(cell.textContent ?? '') : null;
}

function toggleCellAttribute(row: HTMLTableRowElement, selector: string, attribute: string, on: boolean) {
  const cell = row.querySelector(selector)?.closest('td') ?? null;
  if (cell && on !== cell.hasAttribute(attribute)) {
    cell.toggleAttribute(attribute, on);
  }
}

/** Puts the badge right after the date text, so it stays on the same line. */
function setOverdueBadge(endCell: HTMLElement, state: RowHighlight['badge']) {
  const existing = endCell.querySelector<HTMLElement>(`span[${BADGE_ATTRIBUTE}]`);

  if (!state) {
    existing?.remove();
    return;
  }

  if (existing) {
    // Assigning identical text would still replace the text node and retrigger
    // the observer, so only write when it actually changed.
    if (existing.textContent !== state.text) {
      existing.textContent = state.text;
    }
    if (existing.getAttribute(BADGE_ATTRIBUTE) !== state.variant) {
      existing.setAttribute(BADGE_ATTRIBUTE, state.variant);
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
  badge.setAttribute(BADGE_ATTRIBUTE, state.variant);
  badge.textContent = state.text;
  dateSpan.after(badge);
}

/** The "Mietende" is unusable (not rented, unparsable date) — leave that cell alone. */
function withoutEndHighlight(
  highlightOpenAmount: boolean,
  highlightReservedPaid = false,
): RowHighlight {
  return {
    endCellColor: null,
    badge: null,
    highlightOpenAmount,
    highlightReservedPaid,
    nextChangeAt: null,
  };
}

function applyRowHighlight(row: HTMLTableRowElement, state: RowHighlight) {
  const endCellContent = row.querySelector<HTMLElement>(END_CELL_SELECTOR);
  const endCell = endCellContent?.closest('td') ?? null;

  if (endCellContent && endCell) {
    if (state.endCellColor) {
      if (!endCell.hasAttribute(END_CELL_ATTRIBUTE)) {
        endCell.setAttribute(END_CELL_ATTRIBUTE, 'true');
      }

      if (endCell.style.getPropertyValue(END_COLOR_VARIABLE) !== state.endCellColor) {
        endCell.style.setProperty(END_COLOR_VARIABLE, state.endCellColor);
      }
    } else if (endCell.hasAttribute(END_CELL_ATTRIBUTE)) {
      endCell.removeAttribute(END_CELL_ATTRIBUTE);
      endCell.style.removeProperty(END_COLOR_VARIABLE);
    }

    setOverdueBadge(endCellContent, state.badge);
  }

  toggleCellAttribute(row, OPEN_AMOUNT_CELL_SELECTOR, OPEN_AMOUNT_CELL_ATTRIBUTE, state.highlightOpenAmount);
  toggleCellAttribute(
    row,
    STATUS_CELL_SELECTOR,
    RESERVED_PAID_CELL_ATTRIBUTE,
    state.highlightReservedPaid,
  );
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
    if (!hasStatus(row, STATUS_RENTED)) {
      const highlightReservedPaid =
        this.enabledRules.has('reservedPaid') &&
        hasStatus(row, STATUS_RESERVED) &&
        readOpenAmount(row) === 0;

      return withoutEndHighlight(false, highlightReservedPaid);
    }

    const highlightOpenAmount =
      this.enabledRules.has('openAmount') && (readOpenAmount(row) ?? 0) > 0;

    const endsAt = parseEndDate(row.querySelector(END_CELL_SELECTOR)?.textContent ?? '');
    if (endsAt === null) {
      return withoutEndHighlight(highlightOpenAmount);
    }

    let endCellColor: string | null = null;
    let nextChangeAt: number | null = null;

    const track = (timestamp: number) => {
      nextChangeAt = nextChangeAt === null ? timestamp : Math.min(nextChangeAt, timestamp);
    };

    // The whole minutes still left, counted the way the countdown badge shows
    // them: 1 for anything inside the last minute, 0 once the Mietende is due.
    const remainingMinutes = Math.max(Math.ceil((endsAt - now) / MINUTE), 0);
    // When that count ticks down — the moment both the green shade and the
    // countdown badge change. Only meaningful before the Mietende.
    const remainingTick = endsAt - (remainingMinutes - 1) * MINUTE;

    if (this.enabledRules.has('onTime') && now < endsAt) {
      endCellColor = getOnTimeColor(Math.min(remainingMinutes, ON_TIME_STEPS) / ON_TIME_STEPS);
      // Above the window the shade stays at full green, so the next change is
      // the moment the row enters the window.
      track(remainingMinutes > ON_TIME_STEPS ? endsAt - ON_TIME_WINDOW : remainingTick);
    }

    for (const threshold of OVERDUE_THRESHOLDS) {
      if (!this.enabledRules.has(threshold.rule)) {
        continue;
      }

      const reachedAt = endsAt + threshold.offset;

      if (now >= reachedAt) {
        // Thresholds are ordered most severe first — the first hit wins.
        endCellColor = endCellColor ?? threshold.color;
        continue;
      }

      // Re-evaluate exactly when this row crosses the threshold.
      track(reachedAt);
    }

    let badge: RowHighlight['badge'] = null;

    if (this.enabledRules.has('overdueBadge')) {
      if (now >= endsAt) {
        const overdueMinutes = Math.floor((now - endsAt) / MINUTE);
        badge = { text: formatDuration(overdueMinutes, '+'), variant: 'overdue' };
        // The badge counts minutes, so it needs the next whole minute after Mietende.
        track(endsAt + (overdueMinutes + 1) * MINUTE);
      } else {
        badge = { text: formatDuration(remainingMinutes, '-'), variant: 'remaining' };
        track(remainingTick);
      }
    }

    return { endCellColor, badge, highlightOpenAmount, highlightReservedPaid: false, nextChangeAt };
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
