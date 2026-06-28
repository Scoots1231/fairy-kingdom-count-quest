// src/systems/DifficultyScaler.js
//
// Silent difficulty scaling (level 1–4 per act). The player never sees a level;
// the world just gets a little richer or simpler. Persists across sessions.

import SaveSystem from './SaveSystem.js';

const MIN = 1;
const MAX = 4;

// Ensure the difficulty fields exist (older saves predate Phase 3).
function ensure() {
  const sd = SaveSystem.saveData;
  if (!sd) return;
  if (!sd.difficulty) sd.difficulty = { act1: 1, act2: 1, act3: 1, act4: 1 };
  if (!sd.perfectStreak) sd.perfectStreak = { act1: 0, act2: 0, act3: 0, act4: 0 };
}

const DifficultyScaler = {
  getLevel(act) {
    ensure();
    const sd = SaveSystem.saveData;
    return (sd && sd.difficulty && sd.difficulty[act]) || 1;
  },

  setLevel(act, level) {
    ensure();
    SaveSystem.saveData.difficulty[act] = Math.max(MIN, Math.min(MAX, level));
  },

  // Apply scaling after one encounter result.
  recordEncounter(act, { attempts, hintsUsed }) {
    ensure();
    const sd = SaveSystem.saveData;
    let level = sd.difficulty[act];

    if (attempts === 1 && hintsUsed === 0) {
      // Perfect — consider stepping up after a streak of 3.
      sd.perfectStreak[act] += 1;
      if (sd.perfectStreak[act] >= 3) {
        level = Math.min(MAX, level + 1);
        sd.perfectStreak[act] = 0;
      }
    }

    if (hintsUsed >= 2) {
      // Struggling — step back, reset streak.
      level = Math.max(MIN, level - 1);
      sd.perfectStreak[act] = 0;
    }

    sd.difficulty[act] = level;
    return level;
  },

  // Long absence (14+ days): warm up by stepping back one level.
  applyAbsenceWarmup(act) {
    ensure();
    const sd = SaveSystem.saveData;
    sd.difficulty[act] = Math.max(MIN, sd.difficulty[act] - 1);
    sd.perfectStreak[act] = 0;
    return sd.difficulty[act];
  }
};

export default DifficultyScaler;
