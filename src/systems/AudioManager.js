// src/systems/AudioManager.js
//
// Central audio hub. Three independent channels (music / voice / sfx), each with
// its own volume, controlled by the pause-menu sliders and persisted to the save.
//
// Voice and music are real-file channels (Howler) — those files are recorded
// later (see VOICE_LINES.md / MusicManager); until then they stay silent and
// flagged. SFX, however, are SYNTHESIZED here with the Web Audio API, so the
// game actually makes satisfying sounds today with no asset files at all.
//
// Browsers block audio until a user gesture (esp. mobile/tablet): installUnlock()
// resumes the context on the first pointer/key press.

const DEFAULT_VOLUMES = { music: 0.7, voice: 0.9, sfx: 0.8 };

// Synthesized SFX recipes: each is a short envelope over one or more tones.
// { tones: [{freq, type, t0, dur, gain, slideTo}], noise?: {...} }
const SFX = {
  click: { tones: [{ freq: 880, type: 'triangle', dur: 0.07, gain: 0.5, slideTo: 1320 }] },
  hover: { tones: [{ freq: 1760, type: 'sine', dur: 0.06, gain: 0.25 }] },
  correct: { tones: [
    { freq: 660, type: 'sine', t0: 0, dur: 0.12, gain: 0.4 },
    { freq: 880, type: 'sine', t0: 0.1, dur: 0.12, gain: 0.4 },
    { freq: 1320, type: 'sine', t0: 0.2, dur: 0.18, gain: 0.45 }
  ] },
  wrong: { tones: [{ freq: 320, type: 'sine', dur: 0.18, gain: 0.3, slideTo: 240 }] },
  sparkle: { tones: [{ freq: 2200, type: 'triangle', dur: 0.18, gain: 0.2, slideTo: 3200 }] },
  chest: { tones: [{ freq: 200, type: 'sawtooth', dur: 0.5, gain: 0.25, slideTo: 600 }] },
  prize_bronze: { tones: [{ freq: 523, type: 'triangle', t0: 0, dur: 0.2, gain: 0.4 }, { freq: 659, type: 'triangle', t0: 0.18, dur: 0.25, gain: 0.4 }] },
  prize_silver: { tones: [{ freq: 659, type: 'triangle', t0: 0, dur: 0.18, gain: 0.4 }, { freq: 784, type: 'triangle', t0: 0.16, dur: 0.18, gain: 0.4 }, { freq: 988, type: 'triangle', t0: 0.32, dur: 0.28, gain: 0.45 }] },
  prize_gold: { tones: [{ freq: 784, type: 'triangle', t0: 0, dur: 0.16, gain: 0.4 }, { freq: 988, type: 'triangle', t0: 0.14, dur: 0.16, gain: 0.45 }, { freq: 1175, type: 'triangle', t0: 0.28, dur: 0.16, gain: 0.45 }, { freq: 1568, type: 'triangle', t0: 0.42, dur: 0.4, gain: 0.5 }] },
  dust: { tones: [{ freq: 1568, type: 'sine', dur: 0.08, gain: 0.18, slideTo: 2093 }] },
  save: { tones: [{ freq: 880, type: 'sine', t0: 0, dur: 0.14, gain: 0.35 }, { freq: 1320, type: 'sine', t0: 0.12, dur: 0.22, gain: 0.35 }] },
  page: { tones: [{ freq: 600, type: 'sine', dur: 0.16, gain: 0.18, slideTo: 300 }] },
  whinny: { tones: [{ freq: 440, type: 'sawtooth', dur: 0.3, gain: 0.25, slideTo: 660 }] },
  transform: { tones: [{ freq: 300, type: 'sine', dur: 0.7, gain: 0.35, slideTo: 1500 }] },
  crown: { tones: [{ freq: 523, type: 'sine', t0: 0, dur: 0.4, gain: 0.3 }, { freq: 784, type: 'sine', t0: 0.2, dur: 0.5, gain: 0.35 }] }
};

const AudioManager = {
  volumes: { ...DEFAULT_VOLUMES },
  _ctx: null,
  _unlocked: false,
  _voiceHowls: {},
  _flaggedSfx: new Set(),

  ctx() {
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this._ctx = new AC();
    }
    return this._ctx;
  },

  // Resume the audio context on the first user gesture (browser requirement).
  installUnlock() {
    const unlock = () => {
      this._unlocked = true;
      const c = this.ctx();
      if (c && c.state === 'suspended') c.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  },

  // Load persisted volumes from the save (called when a save is available).
  loadVolumes(saveSystem) {
    const v = saveSystem && saveSystem.get && saveSystem.get('settings.volumes');
    if (v) this.volumes = { ...DEFAULT_VOLUMES, ...v };
    if (window.Howler) window.Howler.volume(this.volumes.music);
  },

  setChannelVolume(channel, value, saveSystem) {
    this.volumes[channel] = Math.max(0, Math.min(1, value));
    if (channel === 'music' && window.Howler) window.Howler.volume(this.volumes.music);
    if (saveSystem && saveSystem.hasSaveData && saveSystem.hasSaveData()) {
      if (!saveSystem.saveData.settings) saveSystem.saveData.settings = {};
      saveSystem.saveData.settings.volumes = { ...this.volumes };
    }
  },

  channelVolume(channel) { return this.volumes[channel]; },

  // ---- Synthesized SFX ----------------------------------------------------
  sfx(name) {
    const c = this.ctx();
    const recipe = SFX[name];
    if (!c || !recipe || this.volumes.sfx <= 0) return;
    if (c.state === 'suspended') c.resume();
    const now = c.currentTime;
    (recipe.tones || []).forEach((tone) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = tone.type || 'sine';
      const start = now + (tone.t0 || 0);
      const dur = tone.dur || 0.12;
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.slideTo) osc.frequency.exponentialRampToValueAtTime(tone.slideTo, start + dur);
      const peak = (tone.gain || 0.3) * this.volumes.sfx;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  },

  // ---- Voice channel (real files; silent placeholder until recorded) ------
  // VoiceManager owns line text + timing; this just plays a file if present.
  playVoiceFile(file, onEnd) {
    if (!window.Howl || !file) { if (onEnd) onEnd(); return null; }
    let howl = this._voiceHowls[file];
    if (!howl) { howl = new window.Howl({ src: [`assets/${file}`], volume: this.volumes.voice }); this._voiceHowls[file] = howl; }
    howl.volume(this.volumes.voice);
    howl.once('end', () => onEnd && onEnd());
    howl.once('loaderror', () => onEnd && onEnd());
    howl.play();
    return howl;
  }
};

export default AudioManager;
