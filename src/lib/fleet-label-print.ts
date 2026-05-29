import type { RentalFleetRow } from './types';
import { code128bSvg } from './barcode-code128b';

// Label stock: 55 × 30 mm
const LABEL_W = '55mm';
const LABEL_H = '30mm';

const PRINT_CSS = `
  @page {
    size: ${LABEL_W} ${LABEL_H};
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: white;
  }

  .label {
    width: ${LABEL_W};
    height: ${LABEL_H};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
    padding: 1.5mm 2mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }

  .label:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }

  .ean-text {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 4.5mm;
    font-weight: 700;
    letter-spacing: 0.5px;
    line-height: 1;
    text-align: center;
  }

  .barcode-wrap {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .size-text {
    font-family: "Arial Black", Arial, sans-serif;
    font-size: 9mm;
    font-weight: 900;
    line-height: 1;
    text-align: center;
  }
`;

function buildLabelHtml(row: RentalFleetRow): string {
  let barcodeSvg: string;
  try {
    barcodeSvg = code128bSvg(row.rentEan, 9);
  } catch {
    barcodeSvg = `<span style="font-size:2.5mm;color:red">Barcode-Fehler</span>`;
  }

  const ean   = escapeHtml(row.rentEan);
  const size  = escapeHtml(row.groesse) || '–';

  return `
    <div class="label">
      <div class="ean-text">${ean}</div>
      <div class="barcode-wrap">${barcodeSvg}</div>
      <div class="size-text">${size}</div>
    </div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });

  // Two rAF ticks give the browser time to lay out the SVGs before the dialog opens.
  printWindow.requestAnimationFrame(() => {
    printWindow.requestAnimationFrame(() => {
      printWindow.focus();
      printWindow.print();
    });
  });
}
