// src/systems/RewardSystem.js
//
// Performance scoring, RNG prize-tier selection, the hidden pity system, and
// duplicate-to-dust conversion. Pure-ish: only touches SaveSystem for pity.

import SaveSystem from './SaveSystem.js';

const DUPLICATE_DUST = { bronze: 20, silver: 62, gold: 175 };

const RewardSystem = {
  DUPLICATE_DUST,

  // Performance score 0–100 from an act's encounter history.
  calculatePerformance(encounterHistory) {
    let score = 100;
    for (const e of (encounterHistory || [])) {
      if (e.attempts > 1) score -= 8;
      if (e.hintsUsed === 1) score -= 5;
      else if (e.hintsUsed === 2) score -= 10;
      else if (e.hintsUsed === 3) score -= 15;
    }
    return Math.max(0, score);
  },

  // Base RNG tier from the performance score.
  selectPrizeTier(performanceScore) {
    const rand = Math.random() * 100;
    if (performanceScore >= 90) {
      if (rand < 15) return 'bronze';
      if (rand < 70) return 'silver';
      return 'gold';
    } else if (performanceScore >= 70) {
      if (rand < 35) return 'bronze';
      if (rand < 85) return 'silver';
      return 'gold';
    } else if (performanceScore >= 40) {
      if (rand < 50) return 'bronze';
      if (rand < 92) return 'silver';
      return 'gold';
    }
    if (rand < 75) return 'bronze';
    if (rand < 98) return 'silver';
    return 'gold';
  },

  // Hidden pity: after 8 non-gold results, quietly bump gold probability.
  applyPitySystem(actKey, baseTier) {
    const key = `pitySystems.${actKey}GoldAttempts`;
    const attempts = SaveSystem.get(key) || 0;

    if (baseTier !== 'gold') {
      SaveSystem.set(key, attempts + 1);
      if (attempts >= 8) {
        const pityBoost = Math.min((attempts - 7) * 0.03, 0.15); // max +15%
        if (Math.random() < pityBoost) {
          SaveSystem.set(key, 0);
          return 'gold';
        }
      }
      return baseTier;
    }
    // Reset pity on a real gold drop.
    SaveSystem.set(key, 0);
    return baseTier;
  },

  // Full roll: score -> base tier -> pity-adjusted tier.
  rollPrizeTier(actKey, performanceScore) {
    const base = this.selectPrizeTier(performanceScore);
    return this.applyPitySystem(actKey, base);
  },

  // Convert a duplicate item into fairy dust.
  handleDuplicate(itemId, tier) {
    const dust = DUPLICATE_DUST[tier] || 0;
    SaveSystem.set('fairyDust', (SaveSystem.get('fairyDust') || 0) + dust);
    SaveSystem.set('fairyDustLifetime', (SaveSystem.get('fairyDustLifetime') || 0) + dust);
    return { isDuplicate: true, dustAwarded: dust };
  }
};

export default RewardSystem;
