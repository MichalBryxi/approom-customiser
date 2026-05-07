const STYLE_ID = 'approom-unterschrift-flash-style';
const MANAGED_ATTRIBUTE = 'data-app-room-unterschrift-highlight';

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
  apply(btn: HTMLButtonElement | null) {
    if (!btn || btn.hasAttribute(MANAGED_ATTRIBUTE)) {
      return;
    }

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = KEYFRAMES;
      document.head.append(style);
    }

    btn.setAttribute(MANAGED_ATTRIBUTE, 'true');
    btn.style.animation = 'approom-unterschrift-flash 1.5s ease-in-out infinite';
  }
}
