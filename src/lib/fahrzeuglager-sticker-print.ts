import qrcode from 'qrcode-generator';

export type FahrzeuglagerStickerRow = {
  marke: string;
  modell: string;
  rahmenhoehe: string;
  rahmennummer: string;
};

// Physical sticker stock: 150 × 52 mm landscape.
// @page margin of 1.5 mm covers the non-printable zone.
// After rotation (90°), the visual reading area is ~49 mm wide × ~147 mm tall.
const LABEL_W = '150mm';
const LABEL_H = '52mm';
const PAGE_MARGIN = '1.5mm';
const CONTENT_W = '147mm'; // 150 − 2×1.5
const CONTENT_H = '49mm';  // 52 − 2×1.5

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

  /* Rotate 90° CW so the sticker reads portrait-style on a vertical tube. */
  .label-content {
    width: ${CONTENT_H};
    height: ${CONTENT_W};
    transform: rotate(90deg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 1.5mm 0;
    gap: 1.5mm;
  }

  .label-marke {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 10.5mm;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
  }

  .label-modell {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 9mm;
    line-height: 1.2;
    text-align: center;
  }

  .label-size {
    font-family: "Arial Black", Arial, sans-serif;
    font-size: 39mm;
    font-weight: 900;
    line-height: 1;
    text-align: center;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .label-qr {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .label-qr svg {
    width: 100%;
    height: auto;
    shape-rendering: crispEdges;
  }

  .label-rahmennr {
    font-family: "Courier New", Courier, monospace;
    font-size: 8mm;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
  }
`;

function generateQrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag(1, 0);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStickerHtml(row: FahrzeuglagerStickerRow): string {
  const qrSvg = row.rahmennummer ? generateQrSvg(row.rahmennummer) : '';

  return (
    `<div class="label">` +
      `<div class="label-content">` +
        `<div class="label-marke">${escapeHtml(row.marke)}</div>` +
        `<div class="label-modell">${escapeHtml(row.modell)}</div>` +
        `<div class="label-size">${escapeHtml(row.rahmenhoehe || '–')}</div>` +
        `<div class="label-qr">${qrSvg}</div>` +
        `<div class="label-rahmennr">${escapeHtml(row.rahmennummer)}</div>` +
      `</div>` +
    `</div>`
  );
}

export function printFahrzeuglagerStickers(rows: FahrzeuglagerStickerRow[]): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('Druckfenster konnte nicht geöffnet werden.');
    return;
  }

  const stickersHtml = rows.map(buildStickerHtml).join('');

  printWindow.document.open();
  printWindow.document.write(
    `<!doctype html><html><head>` +
    `<meta charset="utf-8">` +
    `<title>Fahrzeuglager Etiketten</title>` +
    `<style>${PRINT_CSS}</style>` +
    `</head><body>${stickersHtml}</body></html>`,
  );
  printWindow.document.close();

  printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });

  printWindow.requestAnimationFrame(() => {
    printWindow.requestAnimationFrame(() => {
      printWindow.focus();
      printWindow.print();
    });
  });
}
