import { getSettings } from '../settings';

const FILTER_ATTR = 'data-ar-erfasst-filtered';
const STYLE_ID = 'app-room-erfasst-filter-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `li.multiselect__element[${FILTER_ATTR}] { display: none !important; }`;
  document.head.append(style);
}

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
    injectStyles();

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
