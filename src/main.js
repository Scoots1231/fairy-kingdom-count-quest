// src/main.js
//
// Game entry point. Builds the Phaser config (locked 16:9, 1280x720) and
// boots the game with the full scene list. Scenes not yet built are stubs.

import Boot from './scenes/Boot.js';
import MainMenu from './scenes/MainMenu.js';
import Cinematic from './scenes/Cinematic.js';
import Customization from './scenes/Customization.js';
import Act1 from './scenes/Act1.js';
import Act2 from './scenes/Act2.js';
import Act3 from './scenes/Act3.js';
import Act4 from './scenes/Act4.js';
import PrincessRoom from './scenes/PrincessRoom.js';
import Shop from './scenes/Shop.js';
import Closet from './ui/Wardrobe.js';
import ActSelect from './scenes/ActSelect.js';
import ItemDB from './systems/ItemDB.js';
import AudioManager from './systems/AudioManager.js';

// Load the item database once at boot so act prize pools and the shop are ready.
ItemDB.load();

// Resume the Web Audio context on the first user gesture (browser requirement).
AudioManager.installUnlock();

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#1a0a2e',
  scene: [Boot, MainMenu, Cinematic, Customization, Act1, Act2, Act3, Act4, PrincessRoom, Shop, Closet, ActSelect],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: false,
    antialias: true
  }
};

// eslint-disable-next-line no-new
const game = new Phaser.Game(config);

// Expose for debugging in the browser console.
window.__game = game;
