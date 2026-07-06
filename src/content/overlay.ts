import { SPEED_OPTIONS } from "@/types";
import type { ExtensionSettings } from "@/types";
import { getHoverTarget, applySpeed, applySpeedToAll, skipFirstPlayingVideo } from "./video-manager";
import { createSpeedFeedbackElement } from "./speed-feedback";

let currentVideo: HTMLVideoElement | null = null;
let overlayEl: HTMLDivElement | null = null;
let activeSpeed: number = 1.5;
let dropdownOpen = false;
let onSpeedChangedGlobal: ((speed: number) => void) | null = null;
const videoHoverHandlers = new Map<HTMLVideoElement, () => void>();
let scrollRAFId: number | null = null;
let feedbackTimeoutId: number | null = null;
let feedbackEnabled = false;
let feedbackEl: HTMLDivElement | null = null;

export function getActiveSpeed(): number {
  return activeSpeed;
}

function showSpeedFeedback(speed: number): void {
  if (feedbackTimeoutId !== null) {
    window.clearTimeout(feedbackTimeoutId);
  }

  let container = document.getElementById("video-speeder-feedback-root");
  if (!container) {
    container = document.createElement("div");
    container.id = "video-speeder-feedback-root";
    document.documentElement.appendChild(container);
  }

  if (!feedbackEl) {
    feedbackEl = createSpeedFeedbackElement(speed);
    container.appendChild(feedbackEl);
  }

  feedbackEl.textContent = `${speed}x`;
  feedbackEl.classList.remove("vs-speed-feedback--visible");
  feedbackEl.style.opacity = "0";
  feedbackEl.style.transform = "translate(0, 0) scale(0.8)";
  feedbackEl.style.removeProperty("display");
  container.appendChild(feedbackEl);

  requestAnimationFrame(() => {
    feedbackEl?.classList.add("vs-speed-feedback--visible");
  });

  feedbackTimeoutId = window.setTimeout(() => {
    feedbackEl?.classList.remove("vs-speed-feedback--visible");
    feedbackTimeoutId = window.setTimeout(() => {
      if (feedbackEl) {
        feedbackEl.style.opacity = "0";
      }
      feedbackTimeoutId = null;
    }, 220);
  }, 700);
}

export function setActiveSpeed(speed: number, showFeedback = true): void {
  if (activeSpeed === speed) return;

  activeSpeed = speed;
  if (overlayEl && overlayEl.classList.contains("vs-flex") && currentVideo) {
    renderOverlay();
    positionOverlay();
  }

  if (showFeedback && feedbackEnabled) {
    showSpeedFeedback(speed);
  }
}

/**
 * Persist the user's speed choice to chrome.storage so it survives page reloads.
 * We only store the speed value itself, not the full settings object.
 */
async function persistSpeed(speed: number): Promise<void> {
  try {
    const result = await chrome.storage.sync.get("settings");
    const current = result.settings as ExtensionSettings | undefined;
    const updated = {
      defaultSpeed: speed,
      skipSeconds: current?.skipSeconds ?? 10,
      enabled: current?.enabled ?? true,
    };
    await chrome.storage.sync.set({ settings: updated });
  } catch {
    // Storage unavailable — silently fail, speed still works this session
  }
}

function createOverlay(): HTMLDivElement {
  const el = document.createElement("div");
  el.id = "video-speeder-overlay";
  el.setAttribute("role", "toolbar");
  el.setAttribute("aria-label", "Video Speeder Controls");
  return el;
}

function renderOverlay(): void {
  if (!overlayEl || !currentVideo) return;

  overlayEl.innerHTML = "";
  overlayEl.classList.add("vs-flex");

  // Speed dropdown container
  const dropdownWrap = document.createElement("div");
  dropdownWrap.className = "vs-dropdown-wrap";

  // Trigger button — shows current speed
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "vs-dropdown-trigger";
  trigger.style.width = "72px";
  trigger.style.justifyContent = "center";
  trigger.innerHTML = `${activeSpeed}x &#9662;`;

  // Dropdown list
  const dropdown = document.createElement("div");
  dropdown.className = "vs-dropdown";
  if (!dropdownOpen) dropdown.classList.add("vs-dropdown-hidden");

  for (const s of SPEED_OPTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vs-dropdown-item";
    btn.textContent = `${s}x`;
    if (s === activeSpeed) btn.classList.add("vs-active");

    btn.addEventListener("click", () => {
      activeSpeed = s;
      applySpeedToAll(s);
      onSpeedChangedGlobal?.(s);
      // Persist speed to storage so it survives page reloads
      persistSpeed(s);
      renderOverlay();
      dropdownOpen = false;
      positionOverlay();
      showSpeedFeedback(s);
    });

    dropdown.appendChild(btn);
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownOpen = !dropdownOpen;
    dropdown.classList.toggle("vs-dropdown-hidden", !dropdownOpen);
  });

  overlayEl.classList.add("vs-flex");

  dropdownWrap.appendChild(trigger);
  dropdownWrap.appendChild(dropdown);
  overlayEl.appendChild(dropdownWrap);

  // Divider
  const divider = document.createElement("div");
  divider.className = "vs-divider";
  overlayEl.appendChild(divider);

  // Skip to end button
  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.className = "vs-skip-btn";
  skipBtn.innerHTML = "&#9197; Skip";
  skipBtn.addEventListener("click", () => {
    skipFirstPlayingVideo();
  });
  overlayEl.appendChild(skipBtn);
}

function positionOverlay(): void {
  if (!overlayEl || !currentVideo) return;
  const rect = currentVideo.getBoundingClientRect();
  overlayEl.style.top = `${rect.top + 8}px`;
  overlayEl.style.left = `${Math.max(rect.right - 180, rect.left + 8)}px`;
}

function isInControlHotspot(event: MouseEvent, video: HTMLVideoElement): boolean {
  const rect = video.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  const hotspotWidth = Math.max(180, rect.width * 0.4);
  const hotspotHeight = Math.max(84, rect.height * 0.35);
  const topRightX = rect.right;
  const topRightY = rect.top;

  return x >= topRightX - hotspotWidth && x <= topRightX + 24 && y >= topRightY - 8 && y <= topRightY + hotspotHeight;
}

/**
 * Schedule a reposition via requestAnimationFrame on scroll.
 * Uses RAF so overlay follows the video smoothly without jank.
 */
function scheduleReposition(): void {
  if (scrollRAFId !== null) return;
  scrollRAFId = requestAnimationFrame(() => {
    scrollRAFId = null;
    if (overlayEl?.classList.contains("vs-flex") && currentVideo) {
      positionOverlay();
    }
  });
}

function hideOverlay(): void {
  if (overlayEl) overlayEl.classList.remove("vs-flex");
  dropdownOpen = false;
  currentVideo = null;
}

function showOverlay(video: HTMLVideoElement): void {
  if (!overlayEl) return;
  currentVideo = video;
  applySpeed(video, activeSpeed);
  dropdownOpen = false;
  renderOverlay();
  positionOverlay();
  overlayEl.classList.add("vs-flex");
}

export function initOverlay(
  settings: ExtensionSettings,
  onSpeed: (speed: number) => void,
): (video: HTMLVideoElement) => void {
  activeSpeed = settings.defaultSpeed;
  onSpeedChangedGlobal = onSpeed;

  overlayEl = createOverlay();
  document.documentElement.appendChild(overlayEl);
  feedbackEnabled = true;

  // ── Scroll / resize tracking ──
  window.addEventListener("scroll", scheduleReposition, true);
  window.addEventListener("resize", scheduleReposition, true);

  const videoScrollAncestors = new WeakSet<EventTarget>();

  function setupScrollTracking(video: HTMLVideoElement) {
    let el: HTMLElement | null = video.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      if (!videoScrollAncestors.has(el)) {
        videoScrollAncestors.add(el);
        el.addEventListener("scroll", scheduleReposition, true);
      }
      el = el.parentElement;
    }
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (overlayEl && !overlayEl.contains(e.target as Node) && dropdownOpen) {
      dropdownOpen = false;
      if (overlayEl.classList.contains("vs-flex")) renderOverlay();
    }
  });

  return (video: HTMLVideoElement) => {
    if (videoHoverHandlers.has(video)) return;

    const targets = [video, getHoverTarget(video)].filter(Boolean) as HTMLElement[];
    const uniqueTargets = Array.from(new Set(targets));

    const handleMouseEnter = (e: MouseEvent) => {
      if (!isInControlHotspot(e, video)) return;
      showOverlay(video);
      setupScrollTracking(video);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isInControlHotspot(e, video)) {
        hideOverlay();
        return;
      }

      if (!overlayEl?.classList.contains("vs-flex")) {
        showOverlay(video);
      }
      positionOverlay();
    };
    const handleMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as Node;
      if (overlayEl && related !== overlayEl && !overlayEl.contains(related)) {
        hideOverlay();
      }
    };

    uniqueTargets.forEach((target) => {
      target.addEventListener("mouseenter", handleMouseEnter);
      target.addEventListener("mousemove", handleMouseMove);
      target.addEventListener("mouseleave", handleMouseLeave);
    });

    videoHoverHandlers.set(video, () => {
      uniqueTargets.forEach((target) => {
        target.removeEventListener("mouseenter", handleMouseEnter);
        target.removeEventListener("mousemove", handleMouseMove);
        target.removeEventListener("mouseleave", handleMouseLeave);
      });
    });
  };
}