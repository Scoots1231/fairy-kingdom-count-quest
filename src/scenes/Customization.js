// src/scenes/Customization.js — Phase 1 stub (character creator).
// New Adventure flow: Cinematic -> Customization -> Act 1.
//
// Also exposes a "Save Progress" button so the save-to-drive picker can be
// tested in Phase 1. A placeholder name is set so the save isn't empty; real
// name entry + character options arrive in a later phase.

import SaveSystem from '../systems/SaveSystem.js';
import Cursor from '../ui/Cursor.js';
import { KeyboardNav, createButton } from '../ui/interactive.js';

const W = 1280;
const H = 720;

export default class Customization extends Phaser.Scene {
  constructor() { super('Customization'); }

  create() {
    this.cameras.main.setBackgroundColor('#1a0a2e');
    this.wandCursor = new Cursor(this);
    this.nav = new KeyboardNav(this);

    // Ensure there is save data with a (placeholder) name to persist.
    if (!SaveSystem.hasSaveData()) SaveSystem.saveData = SaveSystem.createNewSave();
    if (!SaveSystem.get('playerName')) SaveSystem.set('playerName', 'Princess');

    this.add.text(W / 2, H * 0.26, 'Create Your Princess', {
      fontFamily: 'Georgia, serif', fontSize: '52px', color: '#ffe9a8'
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.38, 'Character customization coming soon.', {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#cdb6e8'
    }).setOrigin(0.5);

    this.status = this.add.text(W / 2, H * 0.47, '', {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#9be8a8'
    }).setOrigin(0.5);

    createButton(this, {
      x: W / 2, y: H * 0.60, label: 'Save Progress to Drive 💾',
      width: 440, height: 78, fontSize: 26, primary: false, nav: this.nav,
      onActivate: () => this.saveProgress()
    });

    createButton(this, {
      x: W / 2, y: H * 0.74, label: '✨ Continue to Act 1',
      width: 440, height: 84, fontSize: 28, primary: true, nav: this.nav,
      onActivate: () => this.goNext()
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

  goNext() {
    if (this.wandCursor) this.wandCursor.setState('loading');
    this.nav.setActive(false);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Act1'));
  }
}
