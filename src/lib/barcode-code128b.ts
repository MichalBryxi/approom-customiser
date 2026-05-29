/**
 * Minimal self-contained Code128B SVG barcode generator.
 * Supports printable ASCII 32–126 (space through tilde).
 * Returns an inline SVG string sized in physical mm units.
 */

// Each entry is the 6-element (bar/space alternating) module-width pattern for that symbol value.
// Indices 0–102 = data chars (value = ASCII code − 32).
// Index 103 = START A, 104 = START B, 105 = START C, 106 = STOP (7 elements).
const PATTERNS: readonly string[] = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213', //  0– 9
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132', // 10–19
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211', // 20–29
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313', // 30–39
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331', // 40–49
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111', // 50–59
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214', // 60–69
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111', // 70–79
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141', // 80–89
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141', // 90–99
  '114131','311141','411131',                                                               // 100–102
  '211412', // 103: START A
  '211214', // 104: START B
  '211232', // 105: START C
  '2331112', // 106: STOP (7 elements, terminates with a bar)
];

const START_B = 104;
const STOP    = 106;

// Physical module width in mm. GS1 minimum for labels is 0.25mm; 0.33mm is safer.
const MODULE_WIDTH_MM = 0.33;
// Quiet zone: 10 modules each side (GS1 minimum).
const QUIET_MODULES   = 10;

/**
 * Encodes `text` as a Code128B barcode and returns an SVG element string.
 * The SVG's width is set in mm; height defaults to 10mm.
 * Throws if any character is outside printable ASCII 32–126.
 */
export function code128bSvg(text: string, heightMm = 10): string {
  if (!text) throw new Error('Barcode text must not be empty.');

  // Build symbol value list: START B, data chars, check, STOP.
  const values: number[] = [START_B];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error(`Code128B cannot encode character: ${JSON.stringify(ch)}`);
    values.push(code - 32);
  }

  // Check character: (startValue + Σ position*charValue) mod 103
  let check = START_B;
  for (let i = 0; i < text.length; i++) {
    check += (i + 1) * (text.charCodeAt(i) - 32);
  }
  values.push(check % 103);
  values.push(STOP);

  // Build bar/space widths as a flat array of module counts.
  // Each symbol contributes its pattern digits; symbols always start with a bar.
  const modules: number[] = [];
  for (const value of values) {
    const pattern = PATTERNS[value];
    if (!pattern) throw new Error(`Unknown Code128 value: ${value}`);
    for (const ch of pattern) {
      modules.push(parseInt(ch, 10));
    }
  }

  // Convert to SVG rects for bars only (odd indices = bars).
  const quietPx   = QUIET_MODULES; // 1 px per module in our viewBox
  let x           = quietPx;
  const svgRects: string[] = [];

  for (let i = 0; i < modules.length; i++) {
    const w = modules[i];
    if (i % 2 === 0) {
      // bar
      svgRects.push(`<rect x="${x}" y="0" width="${w}" height="1"/>`);
    }
    x += w;
  }

  const viewBoxWidth  = x + quietPx; // symbol modules + 2 quiet zones (1 px/module)
  const widthMm       = (viewBoxWidth) * MODULE_WIDTH_MM;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg"` +
    ` viewBox="0 0 ${viewBoxWidth} 1"` +
    ` preserveAspectRatio="none"` +
    ` style="display:block;width:${widthMm.toFixed(2)}mm;height:${heightMm}mm">` +
    `<g fill="black">${svgRects.join('')}</g>` +
    `</svg>`
  );
}
