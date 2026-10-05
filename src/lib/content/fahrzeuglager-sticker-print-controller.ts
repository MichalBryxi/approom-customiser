import { normalizeText } from '../text';
import { getColumnIndex } from './dom';
import {
  type FahrzeuglagerStickerRow,
  printFahrzeuglagerStickers,
} from '../fahrzeuglager-sticker-print';

const BUTTON_ATTR = 'data-fahrzeuglager-sticker-print';

export class FahrzeuglagerStickerPrintController {
  mount(wrapper: HTMLElement) {
    if (wrapper.querySelector(`[${BUTTON_ATTR}]`)) return;

    // The anchor (#list_button_primary) is inside a <form> inside #hbreadcrumb.
    // Move the wrapper to the end of #hbreadcrumb so it becomes a proper sibling
    // of the other forms and appears leftmost in the toolbar (float:right reverses DOM order).
    const hbreadcrumb = document.getElementById('hbreadcrumb');
    if (hbreadcrumb) hbreadcrumb.append(wrapper);

    // Match the float+margin style of the sibling <form> elements in #hbreadcrumb.
    wrapper.style.cssText = 'float: right; margin-left: 3px; margin-top: 3px;';

    const icon = document.createElement('i');
    icon.className = 'fa fa-print';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-default';
    btn.setAttribute(BUTTON_ATTR, 'true');
    btn.append(icon, ' Etiketten drucken');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handlePrintClick();
    });
    wrapper.append(btn);
  }

  private extractRows(): FahrzeuglagerStickerRow[] {
    // Full list: #lagerliste_table. Filtered-by-type view: a different DataTables table,
    // recognisable by its Rahmennr. spans — try the known one first, then any such table.
    const candidates = [
      document.querySelector<HTMLTableElement>('#lagerliste_table'),
      ...Array.from(document.querySelectorAll<HTMLTableElement>('table')).filter((table) =>
        table.tBodies[0]?.querySelector('[title="Rahmennr."]'),
      ),
    ].filter((table): table is HTMLTableElement => table !== null);

    for (const table of new Set(candidates)) {
      const rows = this.extractTableRows(table);
      if (rows.length > 0) return rows;
    }
    return [];
  }

  private extractTableRows(table: HTMLTableElement): FahrzeuglagerStickerRow[] {
    const markeIndex = this.findColumnIndex(table, ['Marke']);
    const modellIndex = this.findColumnIndex(table, ['Modell']);
    const rhIndex = this.findColumnIndex(table, ['RH / Form', 'RH', 'Rahmenhöhe', 'Grösse', 'Größe']);

    return Array.from(table.tBodies)
      .flatMap((tbody) => Array.from(tbody.rows))
      .map((row) => this.extractRow(row, markeIndex, modellIndex, rhIndex))
      .filter((r): r is FahrzeuglagerStickerRow => r !== null);
  }

  // DataTables with scrolling moves the visible header into a separate table inside
  // the same .dataTables_wrapper, so fall back to the wrapper's other tables.
  private findColumnIndex(table: HTMLTableElement, labels: string[]): number {
    const wrapper = table.closest('.dataTables_wrapper');
    const headerTables = [
      table,
      ...Array.from(wrapper?.querySelectorAll<HTMLTableElement>('table') ?? []),
    ];
    for (const headerTable of headerTables) {
      for (const label of labels) {
        const index = getColumnIndex(headerTable, label);
        if (index !== -1) return index;
      }
    }
    return -1;
  }

  private extractRow(
    row: HTMLTableRowElement,
    markeIndex: number,
    modellIndex: number,
    rhIndex: number,
  ): FahrzeuglagerStickerRow | null {
    const marke = normalizeText(row.cells[markeIndex]?.textContent);
    if (!marke) return null;

    const modell = normalizeText(row.cells[modellIndex]?.textContent);

    // RH/Form cell: first line is Rahmenhöhe (e.g. "S"), second line is frame form (e.g. "High").
    // innerText splits on <br> as newlines; take only the first line.
    const rhCell = row.cells[rhIndex] as HTMLElement | undefined;
    const rahmenhoehe = rhCell ? normalizeText(rhCell.innerText.split('\n')[0]) : '';

    // Rahmennummer is in a <span title="Rahmennr."> within the Rh.-Nr. cell.
    const rahmennummer = normalizeText(
      row.querySelector<HTMLElement>('[title="Rahmennr."]')?.textContent,
    );

    return { marke, modell, rahmenhoehe, rahmennummer };
  }

  private handlePrintClick() {
    const rows = this.extractRows();
    if (rows.length === 0) {
      window.alert('Keine Zeilen gefunden.');
      return;
    }
    printFahrzeuglagerStickers(rows);
  }
}
