/**
 * Single source of truth for the MBA Compass brand logo.
 *
 * Why this exists:
 * - The historical asset on disk is `bschoolbuzz-logo.png`.
 * - During the rebrand, code was rewritten to import `mbacompass-logo.png`
 *   which broke the Vite build because the file did not exist.
 * - This helper guarantees ANY page importing `@/assets/brandLogo` always
 *   gets a real, build-time-resolved asset URL — even if we later rename
 *   the underlying file. To swap the logo, change ONLY this file.
 */
import logoUrl from "@/assets/bschoolbuzz-logo.png";

export const BRAND_LOGO_URL: string = logoUrl;
export default BRAND_LOGO_URL;
