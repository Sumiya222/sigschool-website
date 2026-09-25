/**
 * Reads a raster image's pixel dimensions directly from its header bytes —
 * no decode. This is what lets an upload be rejected for an oversized
 * dimension BEFORE the browser decodes it: createImageBitmap()/<img>.decode()
 * allocate the full pixel buffer up front, so checking dimensions AFTER
 * decoding (as width/height metadata) is already too late — a small file
 * with huge declared dimensions (a decompression bomb) has already forced
 * the allocation by then.
 *
 * Supports the three formats this app accepts (JPEG, PNG, WEBP) — nothing
 * else, since nothing else is ever passed through here.
 */

// Comfortably above any real site photograph (even a 61MP full-frame photo
// tops out around 9504x6336) while still bounding worst-case decoded memory
// for a legitimate upload (10000x10000 RGBA ~= 400MB, vs. an unbounded bomb
// which can claim tens of thousands of pixels per edge for a few KB on disk).
export const MAX_IMAGE_DIMENSION = 10_000;

export function parseImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  // PNG: 8-byte signature, then a 4-byte chunk length, "IHDR", width (4 bytes
  // BE), height (4 bytes BE) — all at fixed offsets.
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
    const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
    return { width, height };
  }

  // JPEG: walk the marker segments until a Start-Of-Frame marker (any of
  // C0-CF except the DHT/JPG/DAC markers C4/C8/CC), which carries height
  // then width as 2-byte big-endian fields.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) {
        i += 2;
        continue;
      }
      const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        const height = (bytes[i + 5] << 8) | bytes[i + 6];
        const width = (bytes[i + 7] << 8) | bytes[i + 8];
        return { width, height };
      }
      i += 2 + segLen;
    }
    return null;
  }

  // WEBP: RIFF/WEBP container, dimensions live in one of the VP8X/VP8 /VP8L
  // sub-chunks depending on which codec the file uses.
  if (
    bytes.length >= 30 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    const fourcc = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (fourcc === "VP8X") {
      const width = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
      const height = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
      return { width, height };
    }
    if (fourcc === "VP8 ") {
      const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
      const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
      return { width, height };
    }
    if (fourcc === "VP8L") {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width, height };
    }
  }

  return null;
}

/** Reads just enough of the file to find its header (well under 1KB in
 * every real case) and checks it against MAX_IMAGE_DIMENSION. Returns an
 * error message if the file should be rejected, or null if it's fine to
 * proceed to decode. Never throws — an unrecognised/unparseable header is
 * left to the normal decode-and-fail path rather than blocked here. */
export async function checkImageDimensions(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  const dims = parseImageDimensions(head);
  if (!dims) return null;
  if (dims.width > MAX_IMAGE_DIMENSION || dims.height > MAX_IMAGE_DIMENSION) {
    return `That image is ${dims.width}×${dims.height}px — the maximum is ${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}px.`;
  }
  return null;
}
