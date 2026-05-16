import { getSettings } from '../settings';
import { injectStyle } from './inject-style';

const MANAGED_ATTRIBUTE = 'data-app-room-ma-btn';

export class RechnungenMitarbeiterController {
  private observer: MutationObserver | null = null;
  private prozent = 12;

  mount(tbody: HTMLElement) {
    void this.initialize(tbody);
  }

  private async initialize(tbody: HTMLElement) {
    const settings = await getSettings();
    this.prozent = settings.rechnungenMitarbeiterPreisProzent;
    injectStyle('app-room-ma-btn-styles', `
      button[${MANAGED_ATTRIBUTE}]:disabled:hover,
      button[${MANAGED_ATTRIBUTE}]:disabled:focus {
        background-color: #fff;
        border-color: #ccc;
        color: #333;
        box-shadow: none;
      }
    `);
    this.applyToAllRows(tbody);

    if (this.observer) return;
    this.observer = new MutationObserver(() => this.applyToAllRows(tbody));
    this.observer.observe(tbody, { childList: true, subtree: true });
  }

  private applyToAllRows(tbody: HTMLElement) {
    for (const row of tbody.querySelectorAll<HTMLTableRowElement>('tr')) {
      this.applyToRow(row);
    }
  }

  private parseEp(helpIcon: HTMLElement): number | null {
    const match = (helpIcon.getAttribute('data-original-title') ?? '').match(/EP:\s*([\d.,]+)/);
    if (!match) return null;
    const ep = parseFloat(match[1].replace(',', '.'));
    return isNaN(ep) ? null : ep;
  }

  private computePrice(ep: number): number {
    return Math.round(ep * (1 + this.prozent / 100) * 100) / 100;
  }

  private applyToRow(row: HTMLTableRowElement) {
    const helpIcon = row.querySelector<HTMLElement>('.pe-7s-help1');
    if (!helpIcon || row.querySelector(`[${MANAGED_ATTRIBUTE}]`)) return;

    const rowNum = row.querySelector<HTMLInputElement>('.pos_rows')?.value;
    if (!rowNum) return;

    const priceInput = document.getElementById(
      `mat_pos_rowprice_${rowNum}`,
    ) as HTMLInputElement | null;
    const countInput = document.getElementById(
      `mat_pos_count_${rowNum}`,
    ) as HTMLInputElement | null;
    if (!priceInput || !countInput) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-xs btn-default';
    btn.style.width = '100%';
    btn.textContent = `EP+${this.prozent}%`;
    btn.setAttribute(MANAGED_ATTRIBUTE, 'true');
    btn.addEventListener('click', () => this.applyPrice(helpIcon, btn, priceInput, countInput));

    const syncState = () => this.syncButtonState(btn, helpIcon, priceInput, countInput);
    priceInput.addEventListener('blur', syncState);
    countInput.addEventListener('blur', syncState);
    syncState();

    const wrapper = document.createElement('div');
    wrapper.style.clear = 'both';
    wrapper.style.paddingTop = '6px';
    wrapper.append(btn);
    priceInput.after(wrapper);
  }

  private parseCount(countInput: HTMLInputElement): number | null {
    const count = parseFloat(countInput.value.replace(',', '.'));
    return isNaN(count) || count <= 0 ? null : count;
  }

  private syncButtonState(btn: HTMLButtonElement, helpIcon: HTMLElement, priceInput: HTMLInputElement, countInput: HTMLInputElement) {
    const ep = this.parseEp(helpIcon);
    const count = this.parseCount(countInput);
    if (ep === null || count === null) return;
    const current = parseFloat(priceInput.value.replace(',', '.'));
    btn.disabled = !isNaN(current) && current.toFixed(2) === (this.computePrice(ep) * count).toFixed(2);
  }

  private applyPrice(helpIcon: HTMLElement, btn: HTMLButtonElement, priceInput: HTMLInputElement, countInput: HTMLInputElement) {
    const ep = this.parseEp(helpIcon);
    const count = this.parseCount(countInput);
    if (ep === null || count === null) return;

    priceInput.value = (this.computePrice(ep) * count).toFixed(2);
    priceInput.dispatchEvent(new Event('change', { bubbles: true }));

    this.syncButtonState(btn, helpIcon, priceInput, countInput);
  }
}
