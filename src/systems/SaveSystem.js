// src/systems/SaveSystem.js
//
// The foundation of the entire game. Every other system depends on this.
// Save data lives on the player's thumb drive as a JSON file, accessed via
// the File System Access API (Chromium browsers, secure context only).

class SaveSystem {
  constructor() {
    this.saveData = null;
    this.fileHandle = null;
  }

  // Default empty save — the complete schema every future phase relies on.
  createNewSave() {
    return {
      version: '1.0',
      playerName: '',
      character: {
        headShape: 'round',
        hairStyle: 'long',
        hairColor: 'brown',
        eyeColor: 'brown',
        bodyShape: 'average'
      },
      progress: {
        act1Complete: false,
        act2Complete: false,
        act3Complete: false,
        act4Complete: false,
        crownUnlocked: false,
        waldoForm: 'none',
        storyComplete: false
      },
      fairyDust: 0,
      fairyDustLifetime: 0,
      wardrobe: [],
      roomDecorations: [],
      roomLayout: [],
      currentOutfit: {
        crown: null, hat: null, dress: null,
        shirt: null, pants: null, shoes: null
      },
      pipCollection: [],
      shopPurchases: [],
      performance: {
        sessionCount: 0,
        lastSession: null,
        act1History: [], act2History: [],
        act3History: [], act4History: []
      },
      encounterIntroductions: {
        countObjects: false, pickNumber: false,
        whichMore: false, matchColor: false,
        matchShape: false, colorPattern: false,
        sortItems: false, oddOneOut: false,
        colorAndShape: false
      },
      pitySystems: {
        act1GoldAttempts: 0, act2GoldAttempts: 0,
        act3GoldAttempts: 0, act4GoldAttempts: 0
      },
      // Silent difficulty level per act (1–4), per the save schema.
      difficulty: {
        act1Level: 1, act2Level: 1, act3Level: 1, act4Level: 1
      },
      // Best prize tier achieved per act (for the Act Select screen).
      bestTiers: { act1: null, act2: null, act3: null, act4: null },
      // Audio channel volumes (set in the pause menu; persisted).
      settings: { volumes: { music: 0.7, voice: 0.9, sfx: 0.8 } },
      roomCustomization: {
        currentOutfitOnAvatar: {
          crown: null, hat: null, dress: null,
          shirt: null, pants: null, shoes: null
        }
      }
    };
  }

  // Load from thumb drive via file picker.
  async loadFromDrive() {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Princess Save File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      this.fileHandle = handle;
      const file = await handle.getFile();
      const text = await file.text();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        return { success: false, reason: 'corrupt', error: 'Could not parse save file' };
      }
      // Basic shape validation — a real save has these.
      if (!parsed || typeof parsed !== 'object' || !parsed.version || !parsed.progress || !parsed.character) {
        return { success: false, reason: 'corrupt', error: 'Save file is missing expected data' };
      }
      // Migrate: fill any fields newer than the file's version from defaults.
      this.saveData = this.migrate(parsed);
      return { success: true, data: this.saveData };
    } catch (err) {
      // User cancelled the picker, or the drive went away mid-read.
      const reason = err && err.name === 'AbortError' ? 'cancelled' : 'io';
      return { success: false, reason, error: err.message };
    }
  }

  // Merge a loaded save over the current default schema so older saves gain any
  // fields added in later phases (difficulty, bestTiers, settings, etc.).
  migrate(parsed) {
    const fill = (defaults, data) => {
      if (Array.isArray(defaults)) return Array.isArray(data) ? data : defaults;
      if (defaults && typeof defaults === 'object') {
        const out = Array.isArray(data) ? {} : { ...(data || {}) };
        Object.keys(defaults).forEach((k) => {
          out[k] = (k in (data || {})) ? fill(defaults[k], data[k]) : defaults[k];
        });
        return out;
      }
      return data === undefined ? defaults : data;
    };
    return fill(this.createNewSave(), parsed);
  }

  // Save to thumb drive — overwrites existing file.
  async saveToDrive() {
    try {
      if (!this.fileHandle) {
        this.fileHandle = await window.showSaveFilePicker({
          suggestedName: 'princess-save.json',
          types: [{
            description: 'Princess Save File',
            accept: { 'application/json': ['.json'] }
          }]
        });
      }
      const writable = await this.fileHandle.createWritable();
      await writable.write(JSON.stringify(this.saveData, null, 2));
      await writable.close();
      return { success: true };
    } catch (err) {
      const reason = err && err.name === 'AbortError' ? 'cancelled' : 'io';
      return { success: false, reason, error: err.message };
    }
  }

  get(key) {
    if (!this.saveData) return null;
    return key.split('.').reduce((obj, k) => obj?.[k], this.saveData);
  }

  set(keyPath, value) {
    if (!this.saveData) return;
    const keys = keyPath.split('.');
    const last = keys.pop();
    const obj = keys.reduce((o, k) => o[k], this.saveData);
    obj[last] = value;
  }

  hasSaveData() {
    return this.saveData !== null;
  }

  isNewGame() {
    return !this.saveData?.playerName;
  }

  // Long absence (14+ days since last session) — triggers the warm-up offer.
  isLongAbsence() {
    const last = this.saveData?.performance?.lastSession;
    if (!last) return false;
    const days = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 14;
  }

  // Wipe to a fresh save and forget the file handle so the next save prompts
  // for a new file (used by the New Adventure confirmation).
  clearSave() {
    this.saveData = this.createNewSave();
    this.fileHandle = null;
  }
}

export default new SaveSystem();
