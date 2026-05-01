import { getLanguage, t } from '../i18n';
import {
  clearRegistrationToRentalState,
  saveRegistrationToRentalState,
  type RentalDuration,
} from './registration-to-rental-automation';

const BUTTON_ATTRIBUTE = 'data-app-room-reg-to-rental';
const RESULT_PATH = '/customer_registration/result';
const REDIRECT_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 200;

const DURATIONS: RentalDuration[] = ['halbtag', '1_tag', '2_tage'];

export class RegistrationToRentalController {
  mount(wrapper: HTMLElement) {
    if (wrapper.querySelector(`[${BUTTON_ATTRIBUTE}]`)) {
      return;
    }

    const submitButton = document.querySelector<HTMLButtonElement>(
      'app-registration form button[type="submit"]',
    );
    if (!submitButton) {
      return;
    }

    const lang = getLanguage();
    const msgs = t(lang);

    wrapper.style.marginLeft = '1rem';
    wrapper.style.display = 'inline-flex';
    wrapper.style.gap = '0.5rem';
    wrapper.style.float = 'right';

    for (const duration of DURATIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute(BUTTON_ATTRIBUTE, duration);
      btn.className = submitButton.className.replace('btn-primary', 'btn-success');
      btn.textContent = msgs.duration[duration];

      btn.addEventListener('click', () => {
        void this.triggerWithRentalFlow(submitButton, duration);
      });

      wrapper.append(btn);
    }
  }

  private async triggerWithRentalFlow(submitButton: HTMLButtonElement, duration: RentalDuration) {
    const form = document.querySelector<HTMLFormElement>('app-registration form');
    const firstname =
      form?.querySelector<HTMLInputElement>('input[formcontrolname="firstname"]')?.value ?? '';
    const lastname =
      form?.querySelector<HTMLInputElement>('input[formcontrolname="lastname"]')?.value ?? '';

    saveRegistrationToRentalState(firstname, lastname, duration);
    submitButton.click();

    // Poll until the Angular SPA navigates to the result page, then redirect the
    // top-level window to the rental page. This avoids relying on wxt:locationchange
    // which may not fire reliably for all SPA navigations inside iframes.
    const deadline = Date.now() + REDIRECT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      if (location.pathname === RESULT_PATH) {
        (window.top ?? window).location.assign('/rental/rent');
        return;
      }
    }

    // Registration didn't complete within the timeout — clear the stale state.
    clearRegistrationToRentalState();
  }
}
