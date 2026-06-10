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
    const table = document.querySelector<HTMLTableElement>('#lagerliste_table');
    if (!table) return [];

    const markeIndex = getColumnIndex(table, 'Marke');
    const modellIndex = getColumnIndex(table, 'Modell');
    const rhIndex = getColumnIndex(table, 'RH / Form');

    return Array.from(table.tBodies[0]?.rows ?? [])
      .map((row) => this.extractRow(row, markeIndex, modellIndex, rhIndex))
      .filter((r): r is FahrzeuglagerStickerRow => r !== null);
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
