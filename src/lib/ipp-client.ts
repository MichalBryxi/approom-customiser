// Minimal IPP/1.1 client for the Print-Job operation (RFC 8010/8011).
// Just enough to submit a document to CUPS — no response parsing beyond the status code.

const IPP_TAG = {
  operationAttributes: 0x01,
  jobAttributes: 0x02,
  endOfAttributes: 0x03,
  boolean: 0x22,
  charset: 0x47,
  naturalLanguage: 0x48,
  uri: 0x45,
  nameWithoutLanguage: 0x42,
  keyword: 0x44,
  mimeMediaType: 0x49,
} as const;

function encodeAttribute(tag: number, name: string, value: string): Uint8Array<ArrayBuffer> {
  const nameBytes = new TextEncoder().encode(name);
  const valueBytes = new TextEncoder().encode(value);
  const buffer = new Uint8Array(1 + 2 + nameBytes.length + 2 + valueBytes.length);
  let offset = 0;

  buffer[offset++] = tag;
  buffer[offset++] = (nameBytes.length >> 8) & 0xff;
  buffer[offset++] = nameBytes.length & 0xff;
  buffer.set(nameBytes, offset);
  offset += nameBytes.length;
  buffer[offset++] = (valueBytes.length >> 8) & 0xff;
  buffer[offset++] = valueBytes.length & 0xff;
  buffer.set(valueBytes, offset);

  return buffer;
}

function encodeBooleanAttribute(name: string, value: boolean): Uint8Array<ArrayBuffer> {
  const nameBytes = new TextEncoder().encode(name);
  const buffer = new Uint8Array(1 + 2 + nameBytes.length + 2 + 1);
  let offset = 0;

  buffer[offset++] = IPP_TAG.boolean;
  buffer[offset++] = (nameBytes.length >> 8) & 0xff;
  buffer[offset++] = nameBytes.length & 0xff;
  buffer.set(nameBytes, offset);
  offset += nameBytes.length;
  buffer[offset++] = 0x00;
  buffer[offset++] = 0x01;
  buffer[offset++] = value ? 0x01 : 0x00;

  return buffer;
}

function concatBytes(chunks: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export type IppPrintJobOptions = {
  /**
   * Scales each page down (preserving aspect ratio, no cropping) to fit the
   * printer's configured page/label size, instead of printing at 100%.
   * Sets both the modern `print-scaling` keyword and the legacy CUPS
   * `fit-to-page` boolean, since which one a given filter chain honors varies.
   */
  scaleToFit?: boolean;
  /**
   * Target page/label size as a PWG5101.1 self-describing custom-media
   * keyword, e.g. "custom_50x30mm". Overrides the printer queue's own
   * default media (which may be unset/"unknown"), so the raster filter
   * always knows the actual label dimensions.
   */
  media?: string;
};

/**
 * Builds the IPP header for a Print-Job request (operation + job attributes
 * only, without the document data). Concatenate with the document bytes to
 * form the full request body sent to the CUPS printer resource.
 */
export function buildIppPrintJobHeader(
  printerUri: string,
  userName: string,
  jobName: string,
  options: IppPrintJobOptions = {},
): Uint8Array<ArrayBuffer> {
  const requestId = 1;
  const header = new Uint8Array([
    0x01,
    0x01, // version 1.1
    0x00,
    0x02, // operation-id: Print-Job
    (requestId >> 24) & 0xff,
    (requestId >> 16) & 0xff,
    (requestId >> 8) & 0xff,
    requestId & 0xff,
    IPP_TAG.operationAttributes,
  ]);

  const operationAttributes = concatBytes([
    encodeAttribute(IPP_TAG.charset, 'attributes-charset', 'utf-8'),
    encodeAttribute(IPP_TAG.naturalLanguage, 'attributes-natural-language', 'en'),
    encodeAttribute(IPP_TAG.uri, 'printer-uri', printerUri),
    encodeAttribute(IPP_TAG.nameWithoutLanguage, 'requesting-user-name', userName),
    encodeAttribute(IPP_TAG.nameWithoutLanguage, 'job-name', jobName),
    encodeAttribute(IPP_TAG.mimeMediaType, 'document-format', 'application/pdf'),
  ]);

  const jobAttributeChunks: Uint8Array<ArrayBuffer>[] = [];
  if (options.scaleToFit) {
    jobAttributeChunks.push(
      encodeAttribute(IPP_TAG.keyword, 'print-scaling', 'fit'),
      encodeBooleanAttribute('fit-to-page', true),
    );
  }
  if (options.media) {
    jobAttributeChunks.push(encodeAttribute(IPP_TAG.keyword, 'media', options.media));
  }

  const parts = [header, operationAttributes];

  if (jobAttributeChunks.length > 0) {
    parts.push(new Uint8Array([IPP_TAG.jobAttributes]), concatBytes(jobAttributeChunks));
  }

  parts.push(new Uint8Array([IPP_TAG.endOfAttributes]));

  return concatBytes(parts);
}

/**
 * Reads the 2-byte status-code from an IPP response. Values below 0x0100
 * are "successful" per RFC 8011 §13.1.4.
 */
export function parseIppStatusCode(response: ArrayBuffer): number | null {
  if (response.byteLength < 4) {
    return null;
  }
  return new DataView(response).getUint16(2);
}

export function isSuccessfulIppStatus(statusCode: number | null): statusCode is number {
  return statusCode !== null && statusCode < 0x0100;
}
