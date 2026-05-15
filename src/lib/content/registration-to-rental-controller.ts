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

  await saveRegistrationToRentalState(firstname, lastname, duration);
  submitButton.click();
}
