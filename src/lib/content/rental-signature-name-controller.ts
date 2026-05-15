import { setInputValue } from './dom';

const GREETING_SELECTOR = '[role="dialog"] .ql-editor';
const NAME_INPUT_SELECTOR = 'input[name="rental.rent.modal.signature.name"]';

export class RentalSignatureNameController {
  private observer: MutationObserver | null = null;

  // Cached when the greeting is visible (State 1). Used when the Name input
  // appears (State 2) after Vue removes the greeting block on checkbox check.
  private cachedName = '';

  mount() {
    if (this.observer) return;
    this.observer = new MutationObserver(() => this.apply());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private apply() {
    this.tryCacheName();
    this.tryFill();
  }

  private tryCacheName() {
    if (this.cachedName) return;

    const greetingEl = document.querySelector(GREETING_SELECTOR);
    if (!greetingEl) return;

    // The greeting text ("Hi Michal") is the first text node, before the first <br>.
    const firstNode = greetingEl.firstChild;
    const greetingText = (
      firstNode?.nodeType === Node.TEXT_NODE ? firstNode.textContent : greetingEl.textContent
    )?.trim() ?? '';

    const match = greetingText.match(/^Hi\s+(.+)$/i);
    const name = match?.[1]?.trim() ?? '';
    if (name) this.cachedName = name;
  }

  private tryFill() {
    if (!this.cachedName) return;

    const input = document.querySelector<HTMLInputElement>(NAME_INPUT_SELECTOR);
    if (!input || input.value.trim() !== '') return;

    setInputValue(input, this.cachedName);
  }
}
