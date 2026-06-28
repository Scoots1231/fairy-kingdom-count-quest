// src/systems/MusicManager.js
//
// Act music + stingers. PLACEHOLDER for Phase 4: no music files exist yet, so
// playback is silent and each requested track is flagged once with the file it
// needs. The full API is here (per-act themes, 2s crossfade between acts, 20%
// duck during encounters, prize fanfare stinger) so wiring real audio later is
// a one-line change: set USE_AUDIO = true and drop files under assets/audio/music/.

const USE_AUDIO = false;

const THEMES = {
  act1: { file: 'audio/music/act1_forest.mp3', mood: 'mysterious, ancient, soft' },
  act2: { file: 'audio/music/act2_swamp.mp3', mood: 'ethereal, slightly eerie' },
  act3: { file: 'audio/music/act3_fields.mp3', mood: 'bright, warm, joyful' },
  act4: { file: 'audio/music/act4_castle.mp3', mood: 'sweeping, triumphant' }
};
const STINGERS = {
  prize: 'audio/music/stinger_prize.mp3',
  coronation: 'audio/music/stinger_coronation.mp3'
};

const _flagged = new Set();
function flag(key, file, extra) {
  if (_flagged.has(key)) return;
  _flagged.add(key);
  // eslint-disable-next-line no-console
  console.info(`[MUSIC NEEDED] ${key} -> assets/${file}${extra ? '  (' + extra + ')' : ''}`);
}

const MusicManager = {
  THEMES,
  currentAct: null,
  baseVolume: 0.7,
  _howl: null,

  // Crossfade to an act theme (2s). Silent placeholder for now.
  playAct(actKey) {
    if (this.currentAct === actKey) return;
    const theme = THEMES[actKey];
    if (theme) flag(`theme_${actKey}`, theme.file, theme.mood);
    this.currentAct = actKey;
    if (!USE_AUDIO || !window.Howl || !theme) return;
    const next = new window.Howl({ src: [`assets/${theme.file}`], loop: true, volume: 0 });
    next.play();
    next.fade(0, this.baseVolume, 2000);
    if (this._howl) { const old = this._howl; old.fade(old.volume(), 0, 2000); setTimeout(() => old.stop(), 2100); }
    this._howl = next;
  },

  // Duck 20% during encounters (music continues).
  duck(on) {
    if (!USE_AUDIO || !this._howl) return;
    this._howl.fade(this._howl.volume(), on ? this.baseVolume * 0.8 : this.baseVolume, 400);
  },

  // One-shot fanfare over the music (prize reveal / coronation).
  stinger(name) {
    const file = STINGERS[name];
    if (file) flag(`stinger_${name}`, file);
    if (!USE_AUDIO || !window.Howl || !file) return;
    new window.Howl({ src: [`assets/${file}`], volume: this.baseVolume }).play();
  },

  // Swell to full for the coronation finale.
  swell() {
    if (!USE_AUDIO || !this._howl) return;
    this._howl.fade(this._howl.volume(), 1.0, 1500);
  },

  stop() {
    this.currentAct = null;
    if (USE_AUDIO && this._howl) { this._howl.stop(); this._howl = null; }
  }
};

export default MusicManager;
