# Fairy Kingdom Count Quest ✨

A browser-based educational adventure for kindergarteners — a side-scrolling
princess story that teaches counting, colors, shapes, and matching. Runs entirely
in the browser, hosted on GitHub Pages, with save data stored on a thumb drive.

## How to Play
1. Open in **Chrome or Edge** (the thumb-drive save needs the File System Access API).
2. Plug in your princess thumb drive.
3. Click **"Load Save from Drive"** and find your save file.
4. Begin your adventure!

## First Time Playing
Click **"New Adventure"** to start your journey as a lost princess finding her way home.

## Saving Your Adventure
Your adventure saves automatically at the end of each chapter to your thumb drive.
Keep it safe!

## What You'll Learn
- Counting and numbers
- Colors and shapes
- Matching
- And more!

## Browser support
The thumb-drive save/load uses the **File System Access API**: works in
**Chrome 86+ / Edge 86+**. Firefox and Safari don't support it — the game shows a
friendly note suggesting Chrome. Everything else (the whole adventure) runs anywhere.

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

## Status — all five phases built

The full game loop is implemented and playable end to end:

- **Foundation** — Phaser 3 at 1280×720 (16:9 FIT), SaveSystem with full schema +
  validation/migration, main menu, wand cursor (6 states), keyboard + mouse everywhere
- **Story & hub** — 11-panel cinematic, character customization with live mirror,
  name entry, Princess Room hub, closet/wardrobe, Pip character system
- **Core loop** — auto-scroll engine, reusable EncounterManager, 3-tier hint system
  (Pip never says "wrong/no/incorrect"), procedural generator, difficulty scaling,
  RNG prize tiers + hidden pity, fairy-dust economy, Act 1
- **Full content** — Acts 2–4 (swamp / fields / castle), 11 encounter types, Waldo's
  three forms + transformation, coronation, 100 biome items + 10 Pip items, Benny's shop
- **Polish & launch** — 3-channel AudioManager, Revisit My Kingdom / Act Select,
  long-absence warm-up, save error handling, animation polish

### Procedural-art & audio note

All **art is drawn procedurally with Phaser graphics** (backgrounds, characters,
Pip, Waldo, items) — designed to be swapped for real sprites later.

Audio works today with **no asset files**:
- **Sound effects** are synthesized live with the Web Audio API (clicks,
  correct/wrong, prize fanfares, fairy dust).
- **Pip's voice** is spoken aloud via the browser's built-in **Text-to-Speech**
  (Web Speech API) — every line, synced with on-screen captions. Great for a
  pre-reader. Works in Chrome/Edge; volume follows the SFX & Voice slider.
- **Music** is still a silent placeholder, flagged in the console
  (`[MUSIC NEEDED]`).

To upgrade to recorded human voice/music later: drop files into `assets/audio/`
(see [VOICE_LINES.md](VOICE_LINES.md)) and flip `USE_HOWLER` / `USE_AUDIO` —
recordings take priority over TTS automatically, no other code changes.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Save.
4. Open the published URL in Chrome/Edge.

`.nojekyll` is included so Pages serves the `src/` modules without Jekyll
processing.
