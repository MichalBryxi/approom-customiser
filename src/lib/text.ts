export function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}
