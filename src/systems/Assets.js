// src/systems/Assets.js
//
// The single manifest of real art assets, paths taken verbatim from the Art
// Style Bible. The Boot scene probes for each (HTTP HEAD), loads the ones that
// actually exist, and components then prefer the real texture when present and
// fall back to procedural drawing when absent.
//
// Today none of these files exist, so EVERYTHING falls back to procedural —
// drop a PNG at the documented path and it appears automatically, no code
// changes (the art equivalent of the audio system's USE_HOWLER path).

// textureKey -> path (relative to project root, case-sensitive for GitHub Pages).
// NOTE: paths match the files actually uploaded to assets/images/characters/
// (flat, not in per-name subfolders). `swamp_bng.png` is a typo in the upload —
// kept here so it still loads; rename the file to swamp_bg.png and update this
// line when convenient. No castle_bg.png was uploaded yet (stays procedural).
export const MANIFEST = {
  // Backgrounds (full 1280x720) — uploaded into the characters/ folder.
  forest_bg: 'assets/images/characters/forest_bg.png',
  swamp_bg: 'assets/images/characters/swamp_bng.png',
  fields_bg: 'assets/images/characters/fields_bg.png',
  castle_bg: 'assets/images/backgrounds/castle/castle_bg.png', // not uploaded yet

  // Characters (sprites — background removed)
  princess_idle: 'assets/images/characters/princess_idle.png',
  waldo_horse: 'assets/images/characters/waldo_horse.png',
  waldo_unicorn: 'assets/images/characters/waldo_unicorn.png',
  pip_idle: 'assets/images/characters/pip_idle.png',
  benny_idle: 'assets/images/characters/benny_idle.png',
  bee_idle: 'assets/images/characters/bee/bee_idle.png',
  bunny_idle: 'assets/images/characters/bunny/bunny_idle.png',

  // UI
  wand_idle: 'assets/images/ui/cursor/wand_idle.png',
  chest_closed: 'assets/images/ui/chest/chest_closed.png',
  chest_open_bronze: 'assets/images/ui/chest/chest_open_bronze.png',
  chest_open_silver: 'assets/images/ui/chest/chest_open_silver.png',
  chest_open_gold: 'assets/images/ui/chest/chest_open_gold.png',
  shop_door: 'assets/images/ui/shop/shop_door.png',
  fairy_dust: 'assets/images/ui/particles/fairy_dust.png'
};

const Assets = {
  MANIFEST,
  _present: new Set(),
  probed: false,

  // Probe every manifest entry, load the ones that exist into `scene`'s texture
  // manager. Resolves with a { present, missing } report. Safe on servers that
  // don't support HEAD (everything just reports missing -> procedural fallback).
  async probeAndLoad(scene) {
    const entries = Object.entries(MANIFEST);
    // Guarantee each probe resolves quickly so Boot never stalls on a server
    // that is slow to answer HEAD for a missing file.
    // GET (not HEAD): some static servers — including the local dev server —
    // don't answer HEAD, which would falsely mark every asset missing. The
    // bytes are cached, so Phaser's subsequent load is a cache hit.
    const probe = (key, path) => {
      const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const timer = setTimeout(() => ctrl && ctrl.abort(), 4000);
      return fetch(path, { method: 'GET', cache: 'force-cache', signal: ctrl && ctrl.signal })
        .then((r) => ({ key, path, ok: r.ok }))
        .catch(() => ({ key, path, ok: false }))
        .finally(() => clearTimeout(timer));
    };
    const checks = await Promise.all(entries.map(([key, path]) => probe(key, path)));

    const present = checks.filter((c) => c.ok);
    present.forEach((c) => { if (!scene.textures.exists(c.key)) scene.load.image(c.key, c.path); });

    if (present.length > 0) {
      await new Promise((resolve) => {
        // 'complete' fires even if some individual loads error.
        scene.load.once('complete', resolve);
        scene.load.start();
      });
    }
    present.forEach((c) => this._present.add(c.key));

    return { present: present.map((c) => c.key), missing: checks.filter((c) => !c.ok).map((c) => c.key) };
  },

  // True once the real texture has loaded. Components also accept a scene to
  // double-check the live texture manager.
  has(key, scene) {
    if (scene && scene.textures && scene.textures.exists(key)) return true;
    return this._present.has(key);
  }
};

export default Assets;
