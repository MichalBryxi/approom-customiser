// Vivid on purpose — these mark a single cell, so they have to carry from
// across the table. Still light enough for the ERP's dark cell text.
const RED = '#fa5252';

// Both ends of the "still on time" ramp: full green while the Mietende is far
// away, fading out to almost white as it approaches.
const ON_TIME_VIVID = '#51cf66';
const ON_TIME_FAINT = '#ebfbee';

export const RENTAL_LIST_COLORS = {
  overdue: '#ffd43b',
  overdue30: '#ff922b',
  overdue60: RED,
  // Background of the "Offener Betrag" cell — deliberately the same red as the
  // 60-minute overdue colour, so both markings read as one set.
  openAmount: RED,
  // Background of the "Status" cell of a "Reserviert" row with nothing left to pay.
  reservedPaid: RED,
  onTimeVivid: ON_TIME_VIVID,
  onTimeFaint: ON_TIME_FAINT,
} as const;

function parseHex(color: string) {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ] as const;
}

const ON_TIME_FROM = parseHex(ON_TIME_FAINT);
const ON_TIME_TO = parseHex(ON_TIME_VIVID);

/**
 * Colour of a "Mietende" that has not been reached yet.
 *
 * @param ratio 0 = Mietende is due right now (almost white), 1 = far enough
 *   away for the full green.
 */
export function getOnTimeColor(ratio: number) {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const channels = ON_TIME_FROM.map((from, index) =>
    Math.round(from + (ON_TIME_TO[index] - from) * clamped),
  );

  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
