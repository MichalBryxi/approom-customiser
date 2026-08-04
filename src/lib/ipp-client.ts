// Minimal IPP/1.1 client for the Print-Job operation (RFC 8010/8011).
// Just enough to submit a document to CUPS — no response parsing beyond the status code.

const IPP_TAG = {
  operationAttributes: 0x01,
  endOfAttributes: 0x03,
  charset: 0x47,
  naturalLanguage: 0x48,
  uri: 0x45,
  nameWithoutLanguage: 0x42,
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

/**
 * Builds the IPP header for a Print-Job request (operation attributes only,
 * without the document data). Concatenate with the document bytes to form
 * the full request body sent to the CUPS printer resource.
 */
export function buildIppPrintJobHeader(
  printerUri: string,
  userName: string,
  jobName: string,
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

  const attributes = concatBytes([
    encodeAttribute(IPP_TAG.charset, 'attributes-charset', 'utf-8'),
    encodeAttribute(IPP_TAG.naturalLanguage, 'attributes-natural-language', 'en'),
    encodeAttribute(IPP_TAG.uri, 'printer-uri', printerUri),
    encodeAttribute(IPP_TAG.nameWithoutLanguage, 'requesting-user-name', userName),
    encodeAttribute(IPP_TAG.nameWithoutLanguage, 'job-name', jobName),
    encodeAttribute(IPP_TAG.mimeMediaType, 'document-format', 'application/pdf'),
  ]);

  return concatBytes([header, attributes, new Uint8Array([IPP_TAG.endOfAttributes])]);
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
