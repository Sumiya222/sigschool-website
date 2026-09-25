/**
 * Shared magic-byte sniffing for uploaded files — the extension and the
 * client-supplied MIME type are never trusted. Used by every server-side
 * upload path (registration attachments, site-media) so there is exactly
 * one place that decides what a file's real container format is.
 */
export function sniffUpload(bytes: Uint8Array): { ext: string; mime: string } | null {
  const at = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (at([0x25, 0x50, 0x44, 0x46, 0x2d])) return { ext: "pdf", mime: "application/pdf" };
  if (at([0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  if (at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { ext: "png", mime: "image/png" };
  if (at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8))
    return { ext: "webp", mime: "image/webp" };
  return null;
}
