# ⚡ QuickPlay

**Set once, watch everywhere.**

Chrome extension that speeds up any HTML5 video on any website.

## Features

- **Hover to control** — Hover over any video to reveal a floating control panel
- **Speed control** — Choose from 0.5x to 10x
- **Skip forward** — Skip ahead in the current video with one click
- **Keyboard shortcuts** — Adjust speed without touching the mouse
  - `Shift + ]` — increase speed
  - `Shift + [` — decrease speed
  - `Shift + 0` — reset to 1x
  - `Shift + K` — skip forward
  - `Ctrl/Cmd + Shift + E` — toggle extension on/off
- **Persistent settings** — Your preferred speed is saved and applied across all sites
- **Works everywhere** — YouTube, online courses, streaming sites, any `<video>` element

## Install

### From source (developer mode)

```bash
npm install
npm run build
```

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

## Development

```bash
npm install      # Install dependencies
npm run dev      # Development mode with hot reload
npm run build    # Production build → dist/
npm test         # Run tests
```

## Package for Chrome Web Store

```bash
npm run build && cd dist && zip -r ../quickplay.zip . && cd ..
```

Creates `quickplay.zip` in the project root from the `dist/` build output.

## Privacy Policy

[https://ogzhnsbs.github.io/quickplay/privacy-policy.html](https://ogzhnsbs.github.io/quickplay/privacy-policy.html)

Hosted via GitHub Pages from the `docs/` folder.

## License

[MIT](LICENSE)

## Tech Stack

- Chrome Extension Manifest V3
- TypeScript
- Vite + vite-plugin-chrome-extension
- chrome.storage.sync for persistent settings
