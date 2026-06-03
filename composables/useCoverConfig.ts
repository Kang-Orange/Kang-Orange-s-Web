/**
 * Shared cover image configuration.
 * Change values here to update cropping + display everywhere at once.
 */
export const COVER_CONFIG = {
  /** Default aspect ratio for games (landscape) */
  aspectRatio: 4 / 3,
  /** Aspect ratio for game covers */
  gameAspectRatio: 4 / 3,
  /** Aspect ratio for novel/series covers (portrait) */
  novelAspectRatio: 3 / 4,
  /** Max output width in pixels — cropped image is scaled down if wider */
  maxWidth: 1200,
  /** JPEG compression quality (0–1) */
  quality: 0.85,
}

/** Composable wrapper — auto-imported by Nuxt, usable in templates */
export function useCoverConfig() {
  return COVER_CONFIG
}
