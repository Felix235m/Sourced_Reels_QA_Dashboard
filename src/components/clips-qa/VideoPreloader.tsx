import { useEffect, useRef } from 'react'
import { releaseVideo } from '@/lib/releaseVideo'

type Props = {
  /** Adjacent clip URLs to warm into the HTTP cache. Falsy entries are ignored. */
  urls: (string | null | undefined)[]
}

function WarmVideo({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    return () => releaseVideo(v)
  }, [])

  return <video ref={ref} src={url} preload="auto" muted playsInline tabIndex={-1} />
}

/**
 * Renders hidden `<video preload="auto">` elements so the browser fetches the upcoming
 * clip ahead of time. When the keyed main player later mounts with the same `src`, the
 * first frame is served from cache and paints near-instantly instead of showing a black
 * loading gap.
 *
 * Desktop only — see the caller. On the mobile swipe stack the peek panels already hold
 * the adjacent clips, so rendering this too would load the same URLs twice and burn two
 * extra decoders on a device that has very few to spare.
 *
 * Keyed by URL so a warmed element survives as the window slides (no re-fetch); an
 * offscreen-but-rendered wrapper is used instead of `display:none`, which some browsers
 * treat as a signal to suspend preloading.
 */
export default function VideoPreloader({ urls }: Props) {
  const unique = Array.from(new Set(urls.filter((u): u is string => Boolean(u))))
  if (unique.length === 0) return null

  return (
    <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden>
      {unique.map((url) => (
        <WarmVideo key={url} url={url} />
      ))}
    </div>
  )
}
