/**
 * Evidence-photo storage.
 *
 * Today: the downscaled JPEG data URL is stored inline in the Firestore
 * evidence doc (kept well under the 1 MB doc limit by downscaleImage).
 *
 * Later (Cloudinary): set BOTH env vars below and captures upload to
 * Cloudinary instead, with only the hosted URL stored in Firestore.
 * No other code changes needed.
 *
 *   VITE_CLOUDINARY_CLOUD_NAME=<your cloud name>
 *   VITE_CLOUDINARY_UPLOAD_PRESET=<an UNSIGNED upload preset>
 *
 * These two values are public by design (unsigned browser uploads), which is
 * why the VITE_ prefix is fine here — unlike the Gemini key, which must stay
 * server-only.
 */

export interface UploadedImage {
  /** What to store in the evidence doc — hosted URL, or the data URL fallback. */
  url: string;
  /** True when the image landed on Cloudinary rather than inline in Firestore. */
  hosted: boolean;
}

export async function uploadEvidenceImage(dataUrl: string): Promise<UploadedImage> {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

  if (cloud && preset) {
    try {
      const body = new FormData();
      body.append("file", dataUrl);
      body.append("upload_preset", preset);
      body.append("folder", "alchemix-evidence");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
        method: "POST",
        body,
      });
      if (res.ok) {
        const json = (await res.json()) as { secure_url?: string };
        if (json.secure_url) {
          console.log("[Upload] ✓ evidence photo hosted on Cloudinary");
          return { url: json.secure_url, hosted: true };
        }
      }
      console.warn(`[Upload] ✗ Cloudinary rejected the upload (HTTP ${res.status}) — storing inline instead`);
    } catch (err) {
      console.warn("[Upload] ✗ Cloudinary unreachable — storing inline instead:", err);
    }
  }
  // Fallback (and the current default): inline data URL in the Firestore doc.
  return { url: dataUrl, hosted: false };
}
