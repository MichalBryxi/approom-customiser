import { getSettings } from '../settings';
import { injectStyle } from './inject-style';

const FILTER_ATTR = 'data-ar-erfasst-filtered';

export class RentalErfasstDurchFilterController {
  private observer: MutationObserver | null = null;
  private regex: RegExp | null = null;

  mount() {
    void this.initialize();
  }

  private async initialize() {
    const settings = await getSettings();
    const pattern = settings.rentalErfasstDurchFilterPattern.trim();
    this.regex = pattern ? new RegExp(pattern, 'i') : null;
    injectStyle('app-room-erfasst-filter-styles', `li.multiselect__element[${FILTER_ATTR}] { display: none !important; }`);

    if (this.observer) return;
    this.observer = new MutationObserver(() => this.applyFilter());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private applyFilter() {
    const wrapper = document.querySelector(
      '.multiselect:has(input[name="rental.rent.form.user"]) .multiselect__content-wrapper',
    );
    if (!wrapper) return;

    for (const item of wrapper.querySelectorAll<HTMLElement>('li.multiselect__element')) {
      const text = item.querySelector('.medium-text')?.textContent?.trim() ?? '';
      if (!text) continue;
      const filtered = this.regex !== null && !this.regex.test(text);
      if (filtered) {
        item.setAttribute(FILTER_ATTR, '');
      } else {
        item.removeAttribute(FILTER_ATTR);
      }
    }
  }
}
