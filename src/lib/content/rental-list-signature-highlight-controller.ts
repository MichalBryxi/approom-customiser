import { injectStyle } from './inject-style';

const STYLE_ID = 'approom-signature-flash-style';
const MANAGED_ATTRIBUTE = 'data-app-room-signature-highlight';

const KEYFRAMES = `
@keyframes approom-signature-flash {
  0%, 100% {
    background-color: #dc3545;
    border-color: #dc3545;
    color: #fff;
    box-shadow: 0 0 6px 3px rgba(220, 53, 69, 0.7);
  }
  50% {
    background-color: #a71d2a;
    border-color: #a71d2a;
    color: #fff;
    box-shadow: 0 0 2px 0 rgba(220, 53, 69, 0.1);
  }
}
`;

export class RentalListSignatureHighlightController {
  private clickHandler: ((event: MouseEvent) => void) | null = null;

  mount() {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
    }
    injectStyle(STYLE_ID, KEYFRAMES);
    this.clickHandler = (event: MouseEvent) => this.onActionAreaClick(event);
    document.addEventListener('click', this.clickHandler);
  }

  private onActionAreaClick(event: MouseEvent) {
    const actionContainer = (event.target as Element).closest?.('.action-btn-container');
    if (!actionContainer) return;

    const tryHighlight = () => {
      const btn = Array.from(actionContainer.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim().includes('Unterschreiben') && !b.hasAttribute(MANAGED_ATTRIBUTE),
      );
      if (!btn) return false;
      btn.setAttribute(MANAGED_ATTRIBUTE, 'true');
      btn.style.animation = 'approom-signature-flash 1.5s ease-in-out infinite';
      return true;
    };

    if (tryHighlight()) return;

    let attempts = 0;
    const retry = () => {
      if (tryHighlight() || ++attempts >= 10) return;
      requestAnimationFrame(retry);
    };
    requestAnimationFrame(retry);
  }
}
