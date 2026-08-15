// Vivid on purpose — these mark a single cell, so they have to carry from
// across the table. Still light enough for the ERP's dark cell text.
const RED = '#fa5252';

export const RENTAL_LIST_COLORS = {
  overdue: '#ffd43b',
  overdue30: '#ff922b',
  overdue60: RED,
  // Background of the "Offener Betrag" cell — deliberately the same red as the
  // 60-minute overdue colour, so both markings read as one set.
  openAmount: RED,
} as const;
