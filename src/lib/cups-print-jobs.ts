import { buildIppPrintJobHeader, isSuccessfulIppStatus, parseIppStatusCode } from './ipp-client';
import { getSettings } from './settings';
import type { ExtensionSettingId } from './settings';

const REQUESTING_USER_NAME = 'approom-customiser';

type CupsPrintJobDefinition = {
  printerNameSettingId: Extract<ExtensionSettingId, 'cupsPrintEtikettePrinterName' | 'cupsPrintAuftragPrinterName'>;
  jobName: string;
  hostEquals: string;
  pathEquals: string;
  queryContains: string;
  // Klebetiketten PDFs are generated at a page size that doesn't match the
  // Zebra label stock, so each page needs scaling down to fit the label.
  scaleToFit?: boolean;
  // PWG5101.1 custom-media keyword, e.g. "custom_50x30mm". Overrides the CUPS
  // queue's own default media, which may be unset ("unknown").
  media?: string;
  extraKeywordAttributes?: Record<string, string>;
  // Klebetiketten (Zebra label) output was blank/oversized in testing and the
  // root cause is still under investigation — disable just this job without
  // deleting its config. Kassenbon/Auftrag printing works and stays enabled.
  disabled?: boolean;
};

export const CUPS_PRINT_JOBS: CupsPrintJobDefinition[] = [
  {
    printerNameSettingId: 'cupsPrintEtikettePrinterName',
    jobName: 'Klebetiketten',
    hostEquals: 'erp.app-room.ch',
    pathEquals: '/office/content/data/lager/export/pdf_klebetiketten.php',
    queryContains: 'special_price=1',
    scaleToFit: true,
    media: 'custom_50x30mm',
    // The PPD's own PageSize option uses CUPS' legacy "Custom.WxHmm" naming
    // (confirmed via the printer's .ppd) — pass it verbatim in case the
    // modern `media` keyword above isn't being translated by this driver.
    extraKeywordAttributes: { PageSize: 'Custom.50x30mm' },
    disabled: true,
  },
  {
    printerNameSettingId: 'cupsPrintAuftragPrinterName',
    jobName: 'Auftrag',
    hostEquals: 'erp.app-room.ch',
    pathEquals: '/office/content/data/agenda/view_pdf.php',
    queryContains: 'print_document=1',
  },
];

const PDF_MAGIC_BYTES = '%PDF-';

function isPdf(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < PDF_MAGIC_BYTES.length) {
    return false;
  }
  const header = new Uint8Array(bytes, 0, PDF_MAGIC_BYTES.length);
  return String.fromCharCode(...header) === PDF_MAGIC_BYTES;
}

// Some ERP print URLs (e.g. the "Auftrag" view) return an HTML wrapper page
// with the actual PDF loaded in an <iframe id="pdf-iframe">, rather than the
// PDF itself. Extract that iframe's src so it can be fetched directly.
function extractIframeSrc(html: string, iframeId: string): string | null {
  const iframeTags = html.match(/<iframe\b[^>]*>/gi) ?? [];
  const idPattern = new RegExp(`\\bid=["']${iframeId}["']`, 'i');
  const iframeTag = iframeTags.find((tag) => idPattern.test(tag));
  if (!iframeTag) {
    return null;
  }
  const srcMatch = iframeTag.match(/\bsrc=["']([^"']+)["']/i);
  return srcMatch ? srcMatch[1].replace(/&amp;/g, '&') : null;
}

async function fetchPdfDocument(url: string): Promise<ArrayBuffer | null> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    console.error(`[approom-customiser] CUPS print: HTTP ${response.status} fetching ${url}`);
    return null;
  }

  const bytes = await response.arrayBuffer();
  if (isPdf(bytes)) {
    return bytes;
  }

  const iframeSrc = extractIframeSrc(new TextDecoder().decode(bytes), 'pdf-iframe');
  if (!iframeSrc) {
    console.error(`[approom-customiser] CUPS print: ${url} did not return a PDF and no #pdf-iframe was found`);
    return null;
  }

  const iframeUrl = new URL(iframeSrc, response.url).toString();
  const iframeResponse = await fetch(iframeUrl, { credentials: 'include' });
  if (!iframeResponse.ok) {
    console.error(`[approom-customiser] CUPS print: HTTP ${iframeResponse.status} fetching iframe ${iframeUrl}`);
    return null;
  }

  const iframeBytes = await iframeResponse.arrayBuffer();
  if (!isPdf(iframeBytes)) {
    console.error(`[approom-customiser] CUPS print: iframe document at ${iframeUrl} was not a PDF`);
    return null;
  }

  return iframeBytes;
}

function findMatchingCupsPrintJob(url: string): CupsPrintJobDefinition | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  return (
    CUPS_PRINT_JOBS.find(
      (job) =>
        parsed.hostname === job.hostEquals &&
        parsed.pathname === job.pathEquals &&
        parsed.search.includes(job.queryContains),
    ) ?? null
  );
}

export async function handleCupsPrintNavigation(url: string) {
  const job = findMatchingCupsPrintJob(url);
  if (!job || job.disabled) {
    return;
  }

  const settings = await getSettings();
  if (!settings.extensionEnabled || !settings.cupsPrint) {
    return;
  }

  const printerName = settings[job.printerNameSettingId].trim();
  if (!printerName) {
    return;
  }

  let cupsBaseUrl: URL;
  try {
    cupsBaseUrl = new URL(settings.cupsServerUrl);
  } catch {
    console.error(
      `[approom-customiser] CUPS print: invalid or missing CUPS server URL ("${settings.cupsServerUrl}") — configure it in the extension settings.`,
    );
    return;
  }

  try {
    const documentBytes = await fetchPdfDocument(url);
    if (!documentBytes) {
      console.error(`[approom-customiser] CUPS print: ${job.jobName}: PDF konnte nicht geladen werden (${url})`);
      return;
    }
    console.log(`[approom-customiser] CUPS print: fetched ${documentBytes.byteLength} bytes for ${job.jobName} (${url})`);

    const printerUri = `ipp://${cupsBaseUrl.host}/printers/${printerName}`;
    const printerResourceUrl = new URL(`/printers/${printerName}`, cupsBaseUrl).toString();
    const header = buildIppPrintJobHeader(printerUri, REQUESTING_USER_NAME, job.jobName, {
      scaleToFit: job.scaleToFit,
      media: job.media,
      extraKeywordAttributes: job.extraKeywordAttributes,
    });
    const body = new Blob([header, documentBytes]);

    const ippResponse = await fetch(printerResourceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/ipp' },
      body,
    });

    if (!ippResponse.ok) {
      console.error(`[approom-customiser] CUPS print: ${job.jobName}: HTTP ${ippResponse.status} von CUPS (${printerName})`);
      return;
    }

    const statusCode = parseIppStatusCode(await ippResponse.arrayBuffer());
    if (!isSuccessfulIppStatus(statusCode)) {
      console.error(
        `[approom-customiser] CUPS print: ${job.jobName}: IPP-Fehler 0x${(statusCode ?? 0).toString(16)} von ${printerName}`,
      );
      return;
    }
  } catch (error) {
    console.error(`[approom-customiser] CUPS print: ${job.jobName}: Druck an ${printerName} fehlgeschlagen`, error);
  }
}
