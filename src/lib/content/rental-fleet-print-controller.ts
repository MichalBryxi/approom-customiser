import type { RentalFleetRow } from '../types';
import { normalizeText } from '../text';
import { printFleetLabels } from '../fleet-label-print';

const PRINT_BUTTON_SELECTOR = '[data-app-room-fleet-print-button="true"]';

export class RentalFleetPrintController {
  mount(wrapper: HTMLElement) {
    if (wrapper.querySelector(PRINT_BUTTON_SELECTOR)) {
      return;
    }

    // Copy style from the adjacent toolbar button (wrapper sits before button[data-button-index="0"])
    const nextSibling = wrapper.nextElementSibling;
    const referenceButton =
      nextSibling instanceof HTMLButtonElement
        ? nextSibling
        : nextSibling?.querySelector<HTMLButtonElement>('button');

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.appRoomFleetPrintButton = 'true';

    if (referenceButton) {
      button.className = referenceButton.className;
      button.style.cssText = referenceButton.style.cssText;
    } else {
      button.className = 'btn btn-secondary pos-relative';
      button.style.cssText = 'color: white; font-size: 13px;';
    }

    const icon = document.createElement('i');
    icon.className = 'fal fa-print mr-md-2 mr-0';

    const label = document.createElement('span');
    label.className = 'd-md-inline d-none';
    label.textContent = 'Drucken';

    button.append(icon, label);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.handlePrintClick();
    });

    wrapper.replaceChildren(button);
  }

  extractRows(): RentalFleetRow[] {
    const tbody = document.querySelector<HTMLTableSectionElement>('table.p-datatable-table tbody');
    if (!tbody) return [];

    return Array.from(tbody.rows)
      .map((row) => this.extractRow(row))
      .filter((row): row is RentalFleetRow => row !== null);
  }

  private extractRow(row: HTMLTableRowElement): RentalFleetRow | null {
    const rentEan = normalizeText(row.querySelector('.column-rentean-class span')?.textContent);
    if (!rentEan) return null;

    return {
      rentEan,
      groesse: normalizeText(row.querySelector('.column-size-class span')?.textContent),
      mietart: normalizeText(row.querySelector('.column-type-class span')?.textContent),
      produkt: normalizeText(row.querySelector('.column-pricename-class span')?.textContent),
      mietobjekt: normalizeText(row.querySelector('.column-name-class span')?.textContent),
      artNr: normalizeText(row.querySelector('.column-artNumber-class span')?.textContent),
      modell: normalizeText(row.querySelector('.column-model-class span')?.textContent),
      marke: normalizeText(row.querySelector('.column-brand-class span')?.textContent),
      farbe: normalizeText(row.querySelector('.column-color-class span')?.textContent),
      rahmennummer: normalizeText(row.querySelector('.column-serial-class span')?.textContent),
      jahrgang: normalizeText(row.querySelector('.column-year-class span')?.textContent),
    };
  }

  private handlePrintClick() {
    const rows = this.extractRows();
    if (rows.length === 0) {
      window.alert('Keine Zeilen gefunden.');
      return;
    }
    printFleetLabels(rows);
  }
}
