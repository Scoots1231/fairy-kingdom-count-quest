// src/scenes/Boot.js
//
// First scene. Probes for real art assets (Assets manifest), loads any that
// exist, then starts the main menu. With no art files present this is a brief
// no-op that simply forwards to MainMenu — the game then renders procedurally.

import Assets from '../systems/Assets.js';

const W = 1280;
const H = 720;

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.cameras.main.setBackgroundColor('#1a0a2e');
    this.add.text(W / 2, H / 2, 'Fairy Kingdom Count Quest', {
      fontFamily: 'Georgia, serif', fontSize: '40px', color: '#ffe9a8'
    }).setOrigin(0.5);
    const loading = this.add.text(W / 2, H / 2 + 50, 'Loading...', {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#9d86c0'
    }).setOrigin(0.5);
    this.tweens.add({ targets: loading, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    // Hand off exactly once — whichever happens first: the probe finishes, or a
    // safety timeout fires (so Boot can never stall on a slow/unreachable probe).
    let handed = false;
    const go = () => { if (handed) return; handed = true; this.scene.start('MainMenu'); };

    Assets.probeAndLoad(this).then((report) => {
      // eslint-disable-next-line no-console
      console.info(`[ASSETS] ${report.present.length} real assets loaded${report.present.length ? ': ' + report.present.join(', ') : ' (all procedural placeholders)'}`);
      go();
    }).catch(go);

    this.time.delayedCall(3000, go); // fallback: never wait longer than 3s
  }
}
