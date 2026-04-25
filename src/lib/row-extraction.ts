import type { PrintJobEntry, PrintRow } from './types';
import { normalizeText } from './text';

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

function getVisibleHeaderCellPairs(row: HTMLTableRowElement) {
  const table = row.closest('table');
  if (!(table instanceof HTMLTableElement)) {
    throw new Error('The active row is not inside a table.');
  }

  const headers = getVisibleColumnHeaders(table);
  const cells = getVisibleRowCells(row);
  const totalColumns = Math.min(headers.length, cells.length);

  return Array.from({ length: totalColumns }, (_, index) => ({
    header: headers[index],
    cell: cells[index],
  }));
}

export function extractVisibleEntriesFromRow(row: HTMLTableRowElement): PrintJobEntry[] {
  const entries: PrintJobEntry[] = [];

  for (const { header, cell } of getVisibleHeaderCellPairs(row)) {
    const key = normalizeText(header?.textContent);
    if (!key) {
      continue;
    }

    const value = normalizeText(cell?.textContent) || '-';
    entries.push({ key, value });
  }

  return entries;
}

function buildRowRecord(row: HTMLTableRowElement) {
  const entries = extractVisibleEntriesFromRow(row);
  return entries.reduce<Record<string, string>>((acc, entry) => {
    acc[entry.key] = entry.value;
    return acc;
  }, {});
}

function splitRentEans(value: string) {
  return value
    .split(/[\s,;]+/g)
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function getCellTextByHeader(row: HTMLTableRowElement, headerLabel: string) {
  const pair = getVisibleHeaderCellPairs(row).find(
    ({ header }) => normalizeText(header?.textContent).toLowerCase() === headerLabel.toLowerCase(),
  );

  return normalizeText(pair?.cell?.textContent) || '';
}

function getCellLinesByHeader(
  row: HTMLTableRowElement,
  headerLabel: string,
  options?: { preserveEmpty?: boolean },
) {
  const pair = getVisibleHeaderCellPairs(row).find(
    ({ header }) => normalizeText(header?.textContent).toLowerCase() === headerLabel.toLowerCase(),
  );

  if (!(pair?.cell instanceof HTMLElement)) {
    return [];
  }

  const lines = pair.cell.innerText
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => normalizeText(line));

  return options?.preserveEmpty ? lines : lines.filter(Boolean);
}

export function extractPrintableRowsFromTable(table: HTMLTableElement): PrintRow[] {
  const rows = Array.from(table.tBodies[0]?.rows ?? []).filter((row): row is HTMLTableRowElement =>
    row instanceof HTMLTableRowElement,
  );

  return rows.flatMap((row) => {
    const kunde = getCellTextByHeader(row, 'Kunde') || '-';
    const mietartikelLines = getCellLinesByHeader(row, 'Mietartikel');
    const remarkLines = getCellLinesByHeader(row, 'Bemerkung', { preserveEmpty: true });
    const rentEans = splitRentEans(getCellTextByHeader(row, 'Rent-EAN'));

    const printableRentEans = rentEans.length > 0 ? rentEans : ['-'];

    return printableRentEans.map<PrintRow>((rentEan, index) => {
      const mietartikel = mietartikelLines[index] || '-';
      const remark = remarkLines[index] || '';
      const middleColumnValue = remark ? `${mietartikel}; ${remark}` : mietartikel;

      return [
        { key: 'Kunde', value: kunde },
        { key: 'Mietartikel', value: middleColumnValue },
        { key: 'Rent-EAN', value: rentEan },
      ];
    });
  });
}
