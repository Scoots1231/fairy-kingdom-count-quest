// src/systems/DifficultyScaler.js
//
// Silent difficulty scaling (level 1–4 per act). The player never sees a level;
// the world just gets a little richer or simpler. Persists across sessions.

import SaveSystem from './SaveSystem.js';

const MIN = 1;
const MAX = 4;

// Save key for an act's difficulty level matches the save schema:
// difficulty.act1Level .. act4Level.  (act is 'act1'..'act4'.)
const levelKey = (act) => `${act}Level`;

// "Perfect in a row" streak is tracked in memory (not persisted — the schema
// doesn't store it, and a streak naturally only matters within a session).
const _streak = { act1: 0, act2: 0, act3: 0, act4: 0 };

// Ensure the difficulty block exists (older saves are backfilled by migrate(),
// but guard anyway).
function ensure() {
  const sd = SaveSystem.saveData;
  if (!sd) return;
  if (!sd.difficulty) sd.difficulty = { act1Level: 1, act2Level: 1, act3Level: 1, act4Level: 1 };
}

const DifficultyScaler = {
  getLevel(act) {
    ensure();
    const sd = SaveSystem.saveData;
    return (sd && sd.difficulty && sd.difficulty[levelKey(act)]) || 1;
  },

  setLevel(act, level) {
    ensure();
    SaveSystem.saveData.difficulty[levelKey(act)] = Math.max(MIN, Math.min(MAX, level));
  },

  // Apply scaling after one encounter result.
  recordEncounter(act, { attempts, hintsUsed }) {
    ensure();
    const sd = SaveSystem.saveData;
    const key = levelKey(act);
    let level = sd.difficulty[key];

    if (attempts === 1 && hintsUsed === 0) {
      // Perfect — consider stepping up after a streak of 3.
      _streak[act] = (_streak[act] || 0) + 1;
      if (_streak[act] >= 3) { level = Math.min(MAX, level + 1); _streak[act] = 0; }
    }

    if (hintsUsed >= 2) {
      // Struggling — step back, reset streak.
      level = Math.max(MIN, level - 1);
      _streak[act] = 0;
    }

    sd.difficulty[key] = level;
    return level;
  },

  // Long absence (14+ days): warm up by stepping back one level.
  applyAbsenceWarmup(act) {
    ensure();
    const sd = SaveSystem.saveData;
    const key = levelKey(act);
    sd.difficulty[key] = Math.max(MIN, sd.difficulty[key] - 1);
    _streak[act] = 0;
    return sd.difficulty[key];
  }
};

export default DifficultyScaler;
