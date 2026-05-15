import { normalizeText } from '../text';

export function setInputValue(input: HTMLInputElement, value: string) {
  if (input.value === value) {
    return;
  }

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function getColumnIndex(table: HTMLTableElement, headerLabel: string) {
  const headers = Array.from(table.tHead?.querySelectorAll('th') ?? []);
  const normalizedHeaderLabel = normalizeText(headerLabel).toLowerCase();

  return headers.findIndex(
    (header) => normalizeText(header.textContent).toLowerCase() === normalizedHeaderLabel,
  );
}
