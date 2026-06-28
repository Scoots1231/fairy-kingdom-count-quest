// src/scenes/PrincessRoom.js — Phase 1 stub (the princess's room / hub).
// Continue Adventure flow lands here. Shows current save values and offers a
// Save-to-drive button so the full load -> view -> save loop is testable now.

import SaveSystem from '../systems/SaveSystem.js';
import Cursor from '../ui/Cursor.js';
import { KeyboardNav, createButton } from '../ui/interactive.js';

const W = 1280;
const H = 720;

export default class PrincessRoom extends Phaser.Scene {
  constructor() { super('PrincessRoom'); }

  create() {
    this.cameras.main.setBackgroundColor('#2a1535');
    this.wandCursor = new Cursor(this);
    this.nav = new KeyboardNav(this);

    const name = SaveSystem.get('playerName') || 'Princess';
    const dust = SaveSystem.get('fairyDust') ?? 0;

    this.add.text(W / 2, H * 0.22, `${name}'s Room`, {
      fontFamily: 'Georgia, serif', fontSize: '52px', color: '#ffe9a8'
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.34, `Fairy Dust: ${dust}  ✨   (room coming soon)`, {
      fontFamily: 'Georgia, serif', fontSize: '26px', color: '#cdb6e8'
    }).setOrigin(0.5);

    this.status = this.add.text(W / 2, H * 0.43, '', {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#9be8a8'
    }).setOrigin(0.5);

    createButton(this, {
      x: W / 2, y: H * 0.58, label: 'Save Progress to Drive 💾',
      width: 440, height: 78, fontSize: 26, primary: true, nav: this.nav,
      onActivate: () => this.saveProgress()
    });

    createButton(this, {
      x: W / 2, y: H * 0.72, label: '← Back to Menu',
      width: 360, height: 70, fontSize: 24, primary: false, nav: this.nav,
      onActivate: () => this.backToMenu()
    });

    this.cameras.main.fadeIn(400, 26, 10, 46);
  }

  async saveProgress() {
    if (!window.showSaveFilePicker) {
      this.status.setText('This browser cannot save files. Try Chrome or Edge.').setColor('#ff9e9e');
      return;
    }
    const result = await SaveSystem.saveToDrive();
    if (result.success) {
      this.status.setText('Saved to your drive! 💾').setColor('#9be8a8');
      if (this.wandCursor) this.wandCursor.setState('correct');
    } else {
      this.status.setText('Save cancelled or failed.').setColor('#ff9e9e');
      if (this.wandCursor) this.wandCursor.setState('wrong');
    }
  }

  backToMenu() {
    if (this.wandCursor) this.wandCursor.setState('loading');
    this.nav.setActive(false);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenu'));
  }
}
