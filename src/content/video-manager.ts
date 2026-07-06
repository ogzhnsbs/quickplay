export function applySpeed(video: HTMLVideoElement, speed: number): void {
  if (!video || Number.isNaN(speed)) return;

  video.defaultPlaybackRate = speed;
  video.playbackRate = speed;
}

export function skipFirstPlayingVideo(): void {
  recursiveFindVideos((video) => {
    const duration = Number(video.duration);
    const hasPlayableProgress = Number.isFinite(duration) && duration > 0 && video.currentTime < duration;
    const shouldSkip = hasPlayableProgress && (!video.paused || video.readyState > 0 || video.currentTime > 0);

    if (shouldSkip) {
      video.currentTime = duration;
    }
  });
}

/**
 * Recursively find all <video> elements including those inside iframes.
 * This mirrors the pattern from the original video-custom-playback-rate project
 * and is the key to supporting Twitter/X where videos live in same-origin iframes.
 */
export function hasVideos(doc: Document = document): boolean {
  try {
    if (doc.getElementsByTagName('video').length > 0) {
      return true;
    }

    const iframes = doc.getElementsByTagName('iframe');
    for (let i = 0; i < iframes.length; i++) {
      try {
        const innerDoc = iframes[i].contentDocument || iframes[i].contentWindow?.document;
        if (innerDoc && hasVideos(innerDoc)) {
          return true;
        }
      } catch {
        // cross-origin iframe — silently skip
      }
    }
  } catch {
    // document access failed — skip
  }

  return false;
}

function recursiveFindVideos(handler: (video: HTMLVideoElement) => void, doc: Document = document): void {
  try {
    const videos = doc.getElementsByTagName('video');
    for (let i = 0; i < videos.length; i++) {
      handler(videos[i] as HTMLVideoElement);
    }

    const iframes = doc.getElementsByTagName('iframe');
    for (let i = 0; i < iframes.length; i++) {
      try {
        const innerDoc = iframes[i].contentDocument || iframes[i].contentWindow?.document;
        if (innerDoc) {
          recursiveFindVideos(handler, innerDoc);
        }
      } catch {
        // cross-origin iframe — silently skip
      }
    }
  } catch {
    // document access failed — skip
  }
}

/**
 * Apply the given speed to every video in the current document and all iframes.
 */
export function applySpeedToAll(speed: number): void {
  recursiveFindVideos((v) => applySpeed(v, speed));
}

/**
 * Find the best hover target for a video element.
 *
 * On Twitter/X, the <video> element is buried deep in the DOM and covered
 * by multiple overlay divs that intercept mouse events. We walk up the
 * parent tree to find the largest parent that fully covers the video.
 *
 * CRITICAL: X uses sub-pixel rendering, so parent rects may be off by 1px.
 * We use a 2px tolerance to handle this. Also, X class names are hashed
 * (css-175oi2r, r-1p0dtai, etc.) so we cannot rely on class names at all.
 */
function getHoverTarget(video: HTMLVideoElement): HTMLElement {
  const TOLERANCE = 2; // pixels — sub-pixel rendering on X
  const videoRect = video.getBoundingClientRect();
  const candidates: HTMLElement[] = [video];
  let parent: HTMLElement | null = video.parentElement;

  while (parent && parent !== parent.ownerDocument.body && parent !== parent.ownerDocument.documentElement) {
    const parentRect = parent.getBoundingClientRect();

    if (
      parentRect.width > 0 &&
      parentRect.height > 0 &&
      parentRect.top <= videoRect.top + TOLERANCE &&
      parentRect.bottom >= videoRect.bottom - TOLERANCE &&
      parentRect.left <= videoRect.left + TOLERANCE &&
      parentRect.right >= videoRect.right - TOLERANCE
    ) {
      candidates.push(parent);
      parent = parent.parentElement;
      continue;
    }
    break;
  }

  return candidates[candidates.length - 1] ?? video;
}

export function getHoverTargets(video: HTMLVideoElement): HTMLElement[] {
  const TOLERANCE = 2;
  const videoRect = video.getBoundingClientRect();
  const candidates: HTMLElement[] = [video];
  let parent: HTMLElement | null = video.parentElement;

  while (parent && parent !== parent.ownerDocument.body && parent !== parent.ownerDocument.documentElement) {
    const parentRect = parent.getBoundingClientRect();

    if (
      parentRect.width > 0 &&
      parentRect.height > 0 &&
      parentRect.top <= videoRect.top + TOLERANCE &&
      parentRect.bottom >= videoRect.bottom - TOLERANCE &&
      parentRect.left <= videoRect.left + TOLERANCE &&
      parentRect.right >= videoRect.right - TOLERANCE
    ) {
      candidates.push(parent);
      parent = parent.parentElement;
      continue;
    }
    break;
  }

  return candidates;
}

export function initVideoObserver(onVideosFound: (videos: HTMLVideoElement[]) => void, activeSpeed: () => number): void {
  const seenVideos = new Set<HTMLVideoElement>();

  function scanVideos(): HTMLVideoElement[] {
    const newVideos: HTMLVideoElement[] = [];
    const currentSpeed = activeSpeed();

    recursiveFindVideos((v) => {
      if (!seenVideos.has(v)) {
        seenVideos.add(v);
        newVideos.push(v);
        applySpeed(v, currentSpeed);
        v.addEventListener('loadedmetadata', () => applySpeed(v, currentSpeed), { once: true });
      }
    });

    return newVideos;
  }

  // Initial scan
  const initialNew = scanVideos();
  if (initialNew.length > 0) onVideosFound(initialNew);

  // Some sites insert videos shortly after the content script starts.
  // A short follow-up scan makes the behavior more reliable and mirrors the
  // example project's "apply to all current and future videos" approach.
  window.setTimeout(() => {
    const followUpVideos = scanVideos();
    if (followUpVideos.length > 0) onVideosFound(followUpVideos);
  }, 0);

  // Debounce timer — sites like X fire mutations constantly
  let debounceTimer: number | null = null;

  const observer = new MutationObserver(() => {
    if (debounceTimer !== null) return;

    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      const newVids = scanVideos();
      if (newVids.length > 0) onVideosFound(newVids);
    }, 300);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export { getHoverTarget, recursiveFindVideos };
