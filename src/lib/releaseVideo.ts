/**
 * Tear down a `<video>`'s media resources immediately instead of waiting for GC.
 *
 * Detaching the element from the DOM is not enough: the decoder stays alive until the
 * element is collected. On Android those decoders come from a small pool that is shared
 * across the whole device, so holding them past their usefulness starves the main player
 * and can wedge the browser. Call this from the unmount cleanup of every `<video>` we
 * mount and unmount dynamically.
 */
export function releaseVideo(v: HTMLVideoElement | null) {
  if (!v) return
  try {
    v.pause()
  } catch {
    // Already torn down — nothing to pause.
  }
  v.removeAttribute('src')
  // Required after clearing src: without it the browser keeps the previous resource
  // (and its decoder) attached to the element.
  v.load()
}
