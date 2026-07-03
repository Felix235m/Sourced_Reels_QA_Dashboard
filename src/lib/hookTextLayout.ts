/**
 * Matches local-composer `ffmpeg.ts` hook overlay math (1080×1920 compose frame).
 * Used by QA player to mirror the same position, font-size ladder, and shear.
 */

export const COMPOSE_W = 1080
export const COMPOSE_H = 1920

/** Height of the top reaction strip (px). */
export const TOP_H = 620

/**
 * Bottom edge of hook text (px from top of frame). Must match local-composer `HOOK_TEXT_BOTTOM_FROM_FRAME_TOP_PX`.
 */
export const HOOK_TEXT_BOTTOM_FROM_FRAME_TOP_PX = 650

/** Alias for preview positioning (same as composer / QA overlay). */
export const HOOK_BOTTOM_PX = HOOK_TEXT_BOTTOM_FROM_FRAME_TOP_PX

export const HOOK_TEXT_MAX_FONT_SIZE = 64
export const HOOK_TEXT_MIN_FONT_SIZE = 8
export const HOOK_TEXT_MAX_LINE_WIDTH_PX = 1000
export const HOOK_TEXT_HORIZONTAL_MARGIN_PX = 40
export const HOOK_TEXT_BORDER_W_PX = 12
export const HOOK_TEXT_SHEAR_SHX = 0.22

/** CSS skewX angle (deg) equivalent to FFmpeg shear shx (tan θ = shx for small transforms). */
export const HOOK_SHEAR_DEG = (Math.atan(HOOK_TEXT_SHEAR_SHX) * 180) / Math.PI

function estimateTextWidthPx(text: string, fontSize: number): number {
  let w = 0
  for (const ch of text) {
    if (ch === '\n' || ch === '\r') continue
    const ratio =
      /[iIl1|!]/.test(ch)
        ? 0.38
        : /[WwMm]/.test(ch)
          ? 0.9
          : /[@%]/.test(ch)
            ? 0.82
            : /[ \t]/.test(ch)
              ? 0.32
              : /[A-Za-z0-9]/.test(ch)
                ? 0.72
                : 0.7
    w += fontSize * ratio
  }
  return w
}

function estimateHookLineWidthPx(text: string, fontSize: number): number {
  const base = estimateTextWidthPx(text, fontSize)
  const borderPad = 2 * HOOK_TEXT_BORDER_W_PX
  const textH = fontSize + 2 * HOOK_TEXT_BORDER_W_PX
  const shearPad = Math.ceil(textH * HOOK_TEXT_SHEAR_SHX)
  return Math.ceil((base + borderPad + shearPad) * 1.25)
}

/** Max width for font ladder (matches FFmpeg margin budget). */
export function hookMaxWidthPx(): number {
  return Math.min(
    HOOK_TEXT_MAX_LINE_WIDTH_PX,
    COMPOSE_W - 2 * HOOK_TEXT_HORIZONTAL_MARGIN_PX,
  )
}

/**
 * Dynamic font size (px in 1080-wide space): 64 down to 8 to fit 1000px width budget.
 */
export function computeHookFontSize(rawText: string): number {
  const text = rawText.replace(/\r\n|\r|\n/g, ' ').trim()
  if (!text.length) {
    return HOOK_TEXT_MAX_FONT_SIZE
  }
  const maxW = Math.max(100, hookMaxWidthPx())
  for (let size = HOOK_TEXT_MAX_FONT_SIZE; size >= HOOK_TEXT_MIN_FONT_SIZE; size--) {
    if (estimateHookLineWidthPx(text, size) <= maxW) {
      return size
    }
  }
  return HOOK_TEXT_MIN_FONT_SIZE
}
