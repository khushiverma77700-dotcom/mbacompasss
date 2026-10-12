import { supabase } from "@/integrations/supabase/client";

/** Images above this size are compressed before upload. */
export const COMPRESS_THRESHOLD_BYTES = 500 * 1024;
/** Compression aims to land below this size. */
export const TARGET_BYTES = 100 * 1024;

const SKIP_TYPES = /^image\/(gif|svg\+xml|x-icon|vnd\.microsoft\.icon)$/;

export function shouldCompress(file: { type?: string; size: number }): boolean {
  return !!file.type && file.type.startsWith("image/") && !SKIP_TYPES.test(file.type) && file.size > COMPRESS_THRESHOLD_BYTES;
}

const encode = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));

/** Re-encodes as WebP, keeping original pixel dimensions; only shrinks dimensions if quality alone can't reach the target. */
export async function compressImage(file: Blob): Promise<Blob> {
  if (typeof document === "undefined" || !shouldCompress(file)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let w = bitmap.width, h = bitmap.height;
    let best: Blob | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, w, h);
      // Binary search the highest quality (>= 0.6) that fits the target.
      let lo = 0.6, hi = 0.92, fit: Blob | null = null;
      for (let i = 0; i < 6; i++) {
        const q = (lo + hi) / 2;
        const blob = await encode(canvas, q);
        if (!blob) break;
        if (blob.size <= TARGET_BYTES) { fit = blob; lo = q; } else hi = q;
        if (!best || blob.size < best.size) best = blob;
      }
      if (!fit) { const low = await encode(canvas, 0.6); if (low && low.size <= TARGET_BYTES) fit = low; }
      if (fit) { bitmap.close?.(); return fit; }
      w = Math.round(w * 0.85); h = Math.round(h * 0.85);
    }
    bitmap.close?.();
    return best && best.size < file.size ? best : file;
  } catch {
    return file;
  }
}

let installed = false;
/** Patches storage uploads app-wide so every image upload is compressed automatically. */
export function installUploadCompression() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const proto = Object.getPrototypeOf(supabase.storage.from("uploads")) as any;
  for (const method of ["upload", "update"] as const) {
    const original = proto[method];
    if (typeof original !== "function") continue;
    proto[method] = async function (path: string, body: any, options: any = {}) {
      if (body instanceof Blob && shouldCompress(body)) {
        const out = await compressImage(body);
        if (out !== body) {
          const file = new File([out], (body as File).name?.replace(/\.\w+$/, ".webp") || "image.webp", { type: "image/webp" });
          return original.call(this, path, file, { ...options, contentType: "image/webp" });
        }
      }
      return original.call(this, path, body, options);
    };
  }
}
