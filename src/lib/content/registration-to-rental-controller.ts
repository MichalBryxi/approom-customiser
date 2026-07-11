import {
  saveRegistrationToRentalState,
  type RentalDuration,
} from './registration-to-rental-automation';

export async function triggerRegistrationToRental(
  submitButton: HTMLButtonElement,
  duration: RentalDuration,
) {
  const form = document.querySelector<HTMLFormElement>('app-registration form');
  const firstname =
    form?.querySelector<HTMLInputElement>('input[formcontrolname="firstname"]')?.value ?? '';
  const lastname =
    form?.querySelector<HTMLInputElement>('input[formcontrolname="lastname"]')?.value ?? '';
  const zip = form?.querySelector<HTMLInputElement>('input[formcontrolname="zip"]')?.value ?? '';
  const city = form?.querySelector<HTMLInputElement>('input[formcontrolname="city"]')?.value ?? '';

  try {
    await saveRegistrationToRentalState(firstname, lastname, zip, city, duration);
  } catch {
    // Extension context can be invalidated (e.g. the extension was reloaded
    // while this tab stayed open). The automated follow-up to /rental/rent/new
    // just won't fire in that case, but the registration itself must still submit.
  }

  submitButton.click();
}
