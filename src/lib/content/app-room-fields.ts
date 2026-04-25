import { normalizeText } from '../text';

type FieldsetCandidate = {
  fieldset: HTMLFieldSetElement;
  label: string;
};

function getLegendLabel(legend: HTMLLegendElement | null) {
  return normalizeText(legend?.textContent).replace(/\*/g, '').trim();
}

function getFieldsetCandidates(scope: ParentNode) {
  const candidates: FieldsetCandidate[] = [];

  for (const fieldset of scope.querySelectorAll<HTMLFieldSetElement>('fieldset')) {
    candidates.push({
      fieldset,
      label: getLegendLabel(fieldset.querySelector('legend')),
    });
  }

  for (const legend of scope.querySelectorAll<HTMLLegendElement>('legend')) {
    const nextElement = legend.nextElementSibling;
    if (nextElement instanceof HTMLFieldSetElement) {
      candidates.push({
        fieldset: nextElement,
        label: getLegendLabel(legend),
      });
    }
  }

  return candidates;
}

export function getAppRoomFieldsetByLabel(scope: ParentNode, label: string) {
  const candidates = getFieldsetCandidates(scope);
  const exact = candidates.find((candidate) => candidate.label === label);

  return exact?.fieldset ?? candidates.find((candidate) => candidate.label.includes(label))?.fieldset;
}

export function getAppRoomMultiselectValue(fieldset: HTMLFieldSetElement | undefined) {
  return normalizeText(fieldset?.querySelector<HTMLElement>('.multiselect__single')?.textContent);
}

export function getAppRoomInputValue(fieldset: HTMLFieldSetElement | undefined) {
  const input = fieldset?.querySelector<HTMLInputElement>('input');
  return normalizeText(input?.value) || normalizeText(input?.getAttribute('aria-valuenow'));
}

export function getAppRoomFieldValue(scope: ParentNode, label: string) {
  return getAppRoomInputValue(getAppRoomFieldsetByLabel(scope, label));
}
