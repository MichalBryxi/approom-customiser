const STYLE_ID = 'approom-unterschrift-flash-style';
const MANAGED_ATTRIBUTE = 'data-app-room-unterschrift-highlight';
const ORIGINAL_STYLE_ATTRIBUTE = 'data-app-room-unterschrift-original-style';

const KEYFRAMES = `
@keyframes approom-unterschrift-flash {
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

export class UnterschriftHighlightController {
  sync(enabled: boolean, button: HTMLButtonElement | null) {
    if (enabled) {
      this.apply(button);
    } else {
      this.restore();
    }
  }

  private apply(btn: HTMLButtonElement | null) {
    if (!btn || btn.hasAttribute(MANAGED_ATTRIBUTE)) {
      return;
    }

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = KEYFRAMES;
      document.head.append(style);
    }

    btn.setAttribute(ORIGINAL_STYLE_ATTRIBUTE, btn.getAttribute('style') ?? '');
    btn.setAttribute(MANAGED_ATTRIBUTE, 'true');
    btn.style.animation = 'approom-unterschrift-flash 1.5s ease-in-out infinite';
  }

  private restore() {
    const btn = this.findButton();
    if (btn?.hasAttribute(MANAGED_ATTRIBUTE)) {
      const original = btn.getAttribute(ORIGINAL_STYLE_ATTRIBUTE) ?? '';
      btn.setAttribute('style', original);
      btn.removeAttribute(MANAGED_ATTRIBUTE);
      btn.removeAttribute(ORIGINAL_STYLE_ATTRIBUTE);
    }
    document.getElementById(STYLE_ID)?.remove();
  }

}
