# Fairy Kingdom Count Quest

A browser-based, side-scrolling princess adventure that teaches counting, colors,
shapes, and matching for a kindergarten-aged player. Runs entirely in the browser,
hosted on GitHub Pages, with save data stored on a thumb drive via the browser's
file picker.

## Tech stack

- **Game engine:** Phaser 3 (loaded via CDN — no build step)
- **Audio:** Howler.js (CDN)
- **Language:** Vanilla JavaScript, ES6 modules
- **Hosting:** GitHub Pages
- **Saves:** JSON file via the File System Access API (Chromium browsers)

There is **no npm/node build** — everything loads from CDN. You only need a static
file server to run it locally (because ES6 modules and the File System Access API
require `http://localhost` or `https`, not `file://`).

## Run locally

From the project folder:

```bash
python -m http.server 8000
```

Then open **http://localhost:8000** in **Chrome or Edge** (the save/load file
picker needs a Chromium browser).

## Project layout

```
fairy-kingdom-count-quest/
├── index.html          # loads Phaser + Howler, hosts the canvas
├── .nojekyll           # let GitHub Pages serve files/folders as-is
├── assets/
│   ├── images/         # characters, backgrounds, ui, items, cursor (art: later phases)
│   ├── audio/          # music, sfx (audio: later phases)
│   └── data/items.json # item-ID scaffold (filled in Phase 4)
└── src/
    ├── main.js         # Phaser config (1280x720, 16:9 FIT) + scene list
    ├── scenes/         # MainMenu (built) + stubs for the rest
    ├── systems/        # SaveSystem (built) + stubs
    ├── characters/     # stubs (Pip is drawn inline in MainMenu for now)
    └── ui/             # Cursor + interactive utils (built) + stubs
```

## Phase 1 status (Foundation & Setup)

Built and working:

- Phaser 3 running at 1280×720, scales to fit the window
- **SaveSystem** — full save schema, load-from-drive and save-to-drive via file picker
- **Main menu** — both states (no save loaded / save loaded), Load Save button,
  New Adventure confirmation dialog, fade transitions
- **Custom wand cursor** — procedural wand with idle / hover / click / wrong /
  correct / loading states and sparkle particles, applied across every scene
- All other scenes stubbed and navigable; `items.json` scaffold in place
- **Every button supports both mouse click and arrow keys + Enter/Space**

### Procedural-art note

The build doc references art and voice assets (twilight forest, Pip sprite, wand
PNG, voiced lines) slated for later phases. To make Phase 1 render and run today,
the background, castle, Pip, and wand cursor are drawn **procedurally with Phaser
graphics**, and Pip's lines are shown as on-screen speech with an audio hook
(`playVoice`) ready to wire up real audio later. Drop real assets into `assets/`
and swap the procedural draw calls when they arrive.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Save.
4. Open the published URL in Chrome/Edge.

`.nojekyll` is included so Pages serves the `src/` modules without Jekyll
processing.
