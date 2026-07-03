# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Video Speeder** — a Chrome Extension (Manifest V3) that speeds up all video content. When hovering over any video element, a floating control panel appears with speed buttons (0.5x–4x) and a skip-forward button.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Development mode (Vite dev server with hot reload)
npm run build    # TypeScript check + production build → dist/
```

## Loading the Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` directory

## Architecture

```
src/
  manifest.json            — Manifest V3, permissions: [storage]
  types/
    index.ts               — ExtensionSettings, SpeedValue, DEFAULT_SETTINGS
  background/
    storage.ts             — chrome.storage.sync get/set wrapper
    background.ts          — Service worker: onInstalled defaults, message router
  content/
    content.ts             — Entry: loads settings, wires observer + overlay
    video-manager.ts       — MutationObserver for <video> detection, applySpeed, skipForward
    overlay.ts             — Floating UI: speed buttons row + skip button, shown on video hover
    styles.css             — Overlay CSS (dark glass, z-index: MAX_INT)
  popup/
    popup.html             — Settings popup (speed select, skip select, enable toggle)
    popup.ts               — Reads/writes settings via chrome.runtime.sendMessage
    popup.css              — Dark themed popup styles
  icons/
    icon-{16,48,128}.svg   — Play button on blue background
```

## Key Patterns

- **Video detection**: `MutationObserver` on `document.documentElement` with `subtree: true` — catches dynamically added videos (YouTube, SPAs)
- **Overlay positioning**: `position: fixed` using `video.getBoundingClientRect()` — follows video even when scrolled
- **Settings flow**: Content script and popup communicate with background via `chrome.runtime.sendMessage` → background reads/writes `chrome.storage.sync`
- **WeakSet tracking**: `video-manager.ts` uses `WeakSet<HTMLVideoElement>` to avoid applying speed twice to the same video