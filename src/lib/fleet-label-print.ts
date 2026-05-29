import type { RentalFleetRow } from './types';

// Physical label stock: 60 × 35 mm (2.36″ × 1.38″).
// @page margin of 4 mm covers the ~1.5 mm non-printable zone + visual breathing room.
// Content area after margin: 52 × 27 mm.
const LABEL_W     = '60mm';
const LABEL_H     = '35mm';
const PAGE_MARGIN = '4mm';
const CONTENT_W   = '52mm'; // 60 − 2×4
const CONTENT_H   = '27mm'; // 35 − 2×4

const PRINT_CSS = `
  @page {
    size: ${LABEL_W} ${LABEL_H};
    margin: ${PAGE_MARGIN};
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: white;
  }

  /* One page per label — fills the content area left by @page margin */
  .label {
    width: ${CONTENT_W};
    height: ${CONTENT_H};
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    page-break-after: always;
    break-after: page;
  }

  .label:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }

  /* Rotate 90° clockwise so content reads portrait-style. */
  .label-content {
    width: ${CONTENT_H};   /* becomes the visual height after rotation */
    height: ${CONTENT_W};  /* becomes the visual width after rotation */
    transform: rotate(90deg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
  }

  /* Last 4 digits of Rent-EAN */
  .ean-text {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 10.8mm;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
  }

  /* Circle fills the full pre-rotation width (= full visual label height after margin).
     aspect-ratio keeps it square without hardcoding a size.
     Font is scaled down by JS if the text is wider than the circle's inner area. */
  .size-circle {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 2mm solid black;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .size-text {
    font-family: "Arial Black", Arial, sans-serif;
    font-size: 18mm;
    font-weight: 900;
    line-height: 1;
    text-align: center;
    color: black;
    white-space: nowrap;
  }
`;

function buildLabelHtml(row: RentalFleetRow): string {
  const ean4 = escapeHtml(row.rentEan.slice(-4));
  const size = escapeHtml(row.groesse) || '–';

  return (
    `<div class="label">` +
      `<div class="label-content">` +
        `<div class="ean-text">${ean4}</div>` +
        `<div class="size-circle"><div class="size-text">${size}</div></div>` +
      `</div>` +
    `</div>`
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Scales .size-text down so it fits inside its circle.
 * Uses 78% of the circle width as the usable area (leaves room from the border).
 * Only ever shrinks — never enlarges.
 */
function scaleFontsToFitCircles(doc: Document) {
  for (const circle of Array.from(doc.querySelectorAll<HTMLElement>('.size-circle'))) {
    const text = circle.querySelector<HTMLElement>('.size-text');
    if (!text) continue;

    const available = circle.offsetWidth * 0.78;
    const naturalMax = Math.max(text.offsetWidth, text.offsetHeight);

    if (naturalMax > available) {
      const currentPx = parseFloat(getComputedStyle(text).fontSize);
      text.style.fontSize = `${currentPx * (available / naturalMax)}px`;
    }
  }
}

export function printFleetLabels(rows: RentalFleetRow[]): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('Druckfenster konnte nicht geöffnet werden.');
    return;
  }

  const labelsHtml = rows.map(buildLabelHtml).join('');

  printWindow.document.open();
  printWindow.document.write(
    `<!doctype html><html><head>` +
    `<meta charset="utf-8">` +
    `<title>Etiketten</title>` +
    `<style>${PRINT_CSS}</style>` +
    `</head><body>${labelsHtml}</body></html>`,
  );
  printWindow.document.close();

  scaleFontsToFitCircles(printWindow.document);

  printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });

  printWindow.requestAnimationFrame(() => {
    printWindow.requestAnimationFrame(() => {
      printWindow.focus();
      printWindow.print();
    });
  });
}
