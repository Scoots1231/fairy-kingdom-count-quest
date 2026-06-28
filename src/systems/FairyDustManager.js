// src/systems/FairyDustManager.js
//
// Fairy dust: earned per act by performance, tracked as current balance and a
// lifetime total. Always awards something — never zero.

import SaveSystem from './SaveSystem.js';

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const FairyDustManager = {
  calculateDustEarned(performanceScore) {
    if (performanceScore >= 90) return randInt(150, 200);
    if (performanceScore >= 70) return randInt(75, 150);
    if (performanceScore >= 40) return randInt(25, 75);
    return randInt(10, 25); // always something
  },

  getBalance() { return SaveSystem.get('fairyDust') || 0; },
  getLifetime() { return SaveSystem.get('fairyDustLifetime') || 0; },

  // Award dust and persist. Returns { from, to, amount }.
  award(amount) {
    const from = this.getBalance();
    const to = from + amount;
    SaveSystem.set('fairyDust', to);
    SaveSystem.set('fairyDustLifetime', this.getLifetime() + amount);
    return { from, to, amount };
  },

  spend(amount) {
    const bal = this.getBalance();
    if (amount > bal) return false;
    SaveSystem.set('fairyDust', bal - amount);
    return true;
  }
};

export default FairyDustManager;
