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

async function showCupsPrintToast(tabId: number, message: string, variant: 'success' | 'error') {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (toastMessage: string, toastVariant: string) => {
        const toast = document.createElement('div');
        toast.textContent = toastMessage;
        toast.style.cssText = [
          'position: fixed',
          'bottom: 20px',
          'right: 20px',
          'z-index: 2147483647',
          'padding: 12px 16px',
          'border-radius: 8px',
          'font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          'color: #ffffff',
          `background: ${toastVariant === 'success' ? '#1a7f37' : '#b91c1c'}`,
          'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25)',
        ].join(';');
        document.body.append(toast);
        setTimeout(() => toast.remove(), 5000);
      },
      args: [message, variant],
    });
  } catch (error) {
    console.error('[approom-customiser] CUPS print: failed to show status toast', error);
  }
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

export async function handleCupsPrintNavigation(url: string, tabId: number) {
  const job = findMatchingCupsPrintJob(url);
  if (!job) {
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
    const message = `CUPS-Server-Adresse ist ungültig oder fehlt ("${settings.cupsServerUrl}")`;
    console.error(`[approom-customiser] CUPS print: ${message} — configure it in the extension settings.`);
    void showCupsPrintToast(tabId, `${job.jobName}: ${message}`, 'error');
    return;
  }

  try {
    const documentBytes = await fetchPdfDocument(url);
    if (!documentBytes) {
      const message = `${job.jobName}: PDF konnte nicht geladen werden`;
      console.error(`[approom-customiser] CUPS print: ${message} (${url})`);
      void showCupsPrintToast(tabId, message, 'error');
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
      const message = `${job.jobName}: HTTP ${ippResponse.status} von CUPS (${printerName})`;
      console.error(`[approom-customiser] CUPS print: ${message}`);
      void showCupsPrintToast(tabId, message, 'error');
      return;
    }

    const statusCode = parseIppStatusCode(await ippResponse.arrayBuffer());
    if (!isSuccessfulIppStatus(statusCode)) {
      const message = `${job.jobName}: IPP-Fehler 0x${(statusCode ?? 0).toString(16)} von ${printerName}`;
      console.error(`[approom-customiser] CUPS print: ${message}`);
      void showCupsPrintToast(tabId, message, 'error');
      return;
    }

    void showCupsPrintToast(tabId, `${job.jobName}: an ${printerName} gesendet`, 'success');
  } catch (error) {
    const message = `${job.jobName}: Druck an ${printerName} fehlgeschlagen`;
    console.error(`[approom-customiser] CUPS print: ${message}`, error);
    void showCupsPrintToast(tabId, message, 'error');
  }
}
