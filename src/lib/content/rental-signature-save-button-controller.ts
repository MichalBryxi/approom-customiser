const SAVE_BUTTON_SELECTOR = '[role="dialog"] button:has(.fa-save)';

export class RentalSignatureSaveButtonController {
  private observer: MutationObserver | null = null;

  mount() {
    if (this.observer) return;
    this.observer = new MutationObserver(() => this.tryStyle());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private tryStyle() {
    const btn = document.querySelector<HTMLButtonElement>(SAVE_BUTTON_SELECTOR);
    if (!btn || btn.classList.contains('btn-success')) return;
    btn.classList.remove('btn-outline-secondary');
    btn.classList.add('btn-success');
  }
}
