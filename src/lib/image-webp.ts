/**
 * Central image-conversion policy.
 *
 * Every image that enters the system (CMS media library, gallery uploads,
 * registration attachments) is re-encoded to WebP in the browser before it is
 * sent anywhere. This keeps storage small and the delivered format consistent.
 *
 * Tune the policy here — it is the single place that decides quality and the
 * maximum stored resolution.
 */
export const WEBP_POLICY = {
  /** 0-1. 0.85 is visually lossless for photographs at web sizes. */
  quality: 0.85,
  /** Longest edge in pixels. Larger images are downscaled proportionally. */
  maxEdge: 2400,
  /** Formats we re-encode. Anything else (PDF, SVG, DOCX…) passes through untouched. */
  convertibleTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/gif",
    "image/avif",
    "image/tiff",
  ],
};

export function isConvertibleImage(file: File): boolean {
  return WEBP_POLICY.convertibleTypes.includes(file.type.toLowerCase());
}

function swapExtension(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "image"}.webp`;
}

/**
 * Returns a WebP version of the given file. If the file is not a raster image,
 * or the browser cannot encode WebP, the original file is returned unchanged.
 */
export async function toWebP(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!isConvertibleImage(file)) return file;

  try {
    const bitmap = await loadBitmap(file);
    if (!bitmap) return file;

    const scale = Math.min(1, WEBP_POLICY.maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_POLICY.quality),
    );
    if (!blob || blob.type !== "image/webp") return file;

    // Never make a file bigger than it already was (small PNG icons, tiny WebPs).
    if (file.type === "image/webp" && blob.size >= file.size && scale === 1) return file;

    return new File([blob], swapExtension(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
