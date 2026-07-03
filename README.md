# ⚡ QuickPlay

Chrome extension that speeds up all video content on any website.

## Features

- **Hover to control** — Hover your mouse over any video to reveal a floating control panel
- **Speed control** — Choose from 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x, 3x, 4x
- **Skip forward** — Skip ahead by a configurable number of seconds
- **Persistent settings** — Your preferred speed is saved and applied across all sites
- **Works everywhere** — YouTube, Vimeo, Netflix, courses, any `<video>` element

## Development

```bash
npm install      # Install dependencies
npm run dev      # Development mode with hot reload
npm run build    # Production build → dist/
```

## Install from dist/

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

## Tech Stack

- Chrome Extension Manifest V3
- TypeScript
- Vite + vite-plugin-chrome-extension
- chrome.storage.sync for persistent settings
