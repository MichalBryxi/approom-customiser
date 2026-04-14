import type { PrintJobEntry } from './types';

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function isElementVisible(element: Element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden';
}

function getVisibleColumnHeaders(table: HTMLTableElement) {
  return Array.from(table.querySelectorAll<HTMLTableCellElement>('thead tr th')).filter(isElementVisible);
}

function getVisibleRowCells(row: HTMLTableRowElement) {
  return Array.from(row.cells).filter(isElementVisible);
}

export function extractVisibleEntriesFromRow(row: HTMLTableRowElement): PrintJobEntry[] {
  const table = row.closest('table');
  if (!(table instanceof HTMLTableElement)) {
    throw new Error('The active row is not inside a table.');
  }

  const headers = getVisibleColumnHeaders(table);
  const cells = getVisibleRowCells(row);
  const entries: PrintJobEntry[] = [];
  const totalColumns = Math.min(headers.length, cells.length);

  for (let index = 0; index < totalColumns; index += 1) {
    const key = normalizeText(headers[index]?.textContent);
    if (!key) {
      continue;
    }

    const value = normalizeText(cells[index]?.textContent) || '-';
    entries.push({ key, value });
  }

  return entries;
}
