// Injects demo rows into the rental list so every case of the row colouring
// (see rental-list-highlight-controller.ts) can be shown on demand, without
// waiting for real rentals to become overdue. Off by default.
import { normalizeText } from '../text';

const DEMO_ROW_ATTRIBUTE = 'data-app-room-demo-row';
const BODY_ROW_SELECTOR = 'tr[data-pc-section="bodyrow"]';
const END_COLUMN_HEADER = 'Mietende';
// The expectation text goes into the remark column; the cloned template row would
// otherwise show the real rental's remark there.
const REMARK_COLUMN_HEADER = 'Bemerkung';

const MINUTE = 60 * 1000;
// Every demo row is a rented one — that is the only status the colouring reacts to.
const DEMO_STATUS = 'Vermietet';
// The ERP's badge colour for "Vermietet". The cloned template row may carry any
// other status colour, so it has to be overwritten to match the status text.
const DEMO_STATUS_BADGE_CLASS = 'ar-color-badge-content-yellow';
const BADGE_COLOR_CLASS_PATTERN = /ar-color-badge-content-[\w-]+/g;
const STATUS_BADGE_SELECTOR = '.column-status-class [class*="ar-color-badge-content-"]';

type DemoRow = {
  label: string;
  /** Minutes relative to now — negative is in the past. */
  endsInMinutes: number;
  openAmount: string;
  expectation: string;
};

// The overdue rows sit exactly one minute past their threshold, so each one
// shows the first minute in which its colour applies.
const DEMO_ROWS: DemoRow[] = [
  {
    label: 'DEMO 1',
    endsInMinutes: 300,
    openAmount: '0.00',
    expectation: 'Mietende kräftig grün (über 3 Std. 30 Min.) + Badge „-5 Std."',
  },
  {
    label: 'DEMO 2',
    endsInMinutes: 120,
    openAmount: '0.00',
    expectation: 'Mietende halb blasses Grün + Badge „-2 Std."',
  },
  {
    label: 'DEMO 3',
    endsInMinutes: 10,
    openAmount: '0.00',
    expectation: 'Mietende fast weisses Grün + Badge „-10 Min."',
  },
  {
    label: 'DEMO 4',
    endsInMinutes: -1,
    openAmount: '0.00',
    expectation: 'Mietende gelb + Badge „+1 Min."',
  },
  {
    label: 'DEMO 5',
    endsInMinutes: -31,
    openAmount: '0.00',
    expectation: 'Mietende orange + Badge „+31 Min."',
  },
  {
    label: 'DEMO 6',
    endsInMinutes: -61,
    openAmount: '0.00',
    expectation: 'Mietende rot + Badge „+1 Std. 1 Min."',
  },
  {
    label: 'DEMO 7',
    endsInMinutes: 120,
    openAmount: '45.00',
    expectation: 'Mietende grün, zusätzlich „Offener Betrag" rot.',
  },
  {
    label: 'DEMO 8',
    endsInMinutes: -61,
    openAmount: '120.00',
    expectation: 'Mietende rot + Badge, „Offener Betrag" rot.',
  },
  {
    label: 'DEMO 9',
    endsInMinutes: -29.5,
    openAmount: '0.00',
    expectation: 'Gelb, wechselt nach ~30 Sek. auf orange (Badge zählt mit).',
  },
  {
    label: 'DEMO 10',
    endsInMinutes: 1.5,
    openAmount: '0.00',
    expectation:
      'Blassestes Grün, wechselt in rund einer Minute auf gelb (Badge „-1 Min." → „+0 Min.").',
  },
];

function formatDateTime(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function findTable() {
  const header = Array.from(document.querySelectorAll<HTMLElement>('th span')).find(
    (span) => normalizeText(span.textContent) === END_COLUMN_HEADER,
  );

  return header?.closest('table') ?? null;
}

/** Writes into the innermost span of a cell, which is where the ERP puts its text. */
function setCellText(row: HTMLTableRowElement, cellClass: string, text: string) {
  const cell = row.querySelector(`.${cellClass}`);
  if (!cell) {
    return;
  }

  const leafSpan = Array.from(cell.querySelectorAll('span')).find(
    (span) => !span.querySelector('span'),
  );

  if (leafSpan) {
    leafSpan.textContent = text;
    return;
  }

  const span = document.createElement('span');
  span.textContent = text;
  cell.append(span);
}

/**
 * The remark column has no stable `column-*-class`, so it is located by its header
 * text. Returns -1 when the column is not shown.
 */
function findColumnIndexByHeader(table: HTMLTableElement, headerLabel: string) {
  return Array.from(table.querySelectorAll<HTMLTableCellElement>('thead tr th')).findIndex(
    (header) => normalizeText(header.textContent) === headerLabel,
  );
}

/** Replaces the whole cell content — the template's remark can span several lines. */
function setCellTextByIndex(row: HTMLTableRowElement, columnIndex: number, text: string) {
  const cell = row.cells[columnIndex];
  if (!cell) {
    return;
  }

  const span = document.createElement('span');
  span.textContent = text;
  cell.replaceChildren(span);
}

function setStatusBadgeColor(row: HTMLTableRowElement) {
  for (const badge of Array.from(row.querySelectorAll(STATUS_BADGE_SELECTOR))) {
    badge.className = badge.className.replace(BADGE_COLOR_CLASS_PATTERN, DEMO_STATUS_BADGE_CLASS);
  }
}

function buildDemoRow(template: HTMLTableRowElement, demoRow: DemoRow, remarkColumnIndex: number) {
  const row = template.cloneNode(true) as HTMLTableRowElement;
  row.setAttribute(DEMO_ROW_ATTRIBUTE, 'true');

  setCellText(row, 'column-identification-class', demoRow.label);
  setCellText(row, 'column-start-class', formatDateTime(Date.now() - 4 * 60 * MINUTE));
  setCellText(row, 'column-end-class', formatDateTime(Date.now() + demoRow.endsInMinutes * MINUTE));
  setCellText(row, 'column-customer-class', demoRow.label);
  setCellTextByIndex(row, remarkColumnIndex, demoRow.expectation);
  setCellText(row, 'column-totalPrice-class', '222.00');
  setCellText(row, 'column-paymentStatus-class', demoRow.openAmount);
  setCellText(row, 'column-status-class', DEMO_STATUS);
  setStatusBadgeColor(row);

  return row;
}

export class RentalListDemoRowsController {
  private observer: MutationObserver | null = null;

  private tbody: HTMLTableSectionElement | null = null;

  mount() {
    const tbody = findTable()?.tBodies[0] ?? null;
    if (!tbody || this.tbody === tbody) {
      return;
    }

    this.observer?.disconnect();
    this.tbody = tbody;
    this.insertRows();

    // Re-insert if the ERP re-renders the list. Idempotent: when the demo rows
    // are already there this makes no mutation, so it cannot loop.
    this.observer = new MutationObserver(() => this.insertRows());
    this.observer.observe(tbody, { childList: true });
  }

  private insertRows() {
    const tbody = this.tbody;
    if (!tbody || tbody.querySelector(`[${DEMO_ROW_ATTRIBUTE}]`)) {
      return;
    }

    const template = tbody.querySelector<HTMLTableRowElement>(BODY_ROW_SELECTOR);
    if (!template) {
      return;
    }

    const table = tbody.closest('table');
    const remarkColumnIndex = table ? findColumnIndexByHeader(table, REMARK_COLUMN_HEADER) : -1;

    this.observer?.disconnect();

    try {
      const fragment = document.createDocumentFragment();
      for (const demoRow of DEMO_ROWS) {
        fragment.append(buildDemoRow(template, demoRow, remarkColumnIndex));
      }
      tbody.prepend(fragment);
    } finally {
      this.observer?.observe(tbody, { childList: true });
    }
  }
}
