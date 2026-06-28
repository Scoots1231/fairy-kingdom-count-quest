// src/ui/PauseMenu.js
//
// In-act pause overlay. Triggered by Escape or the moon button. Darkens the
// game, shows Resume / Quit-to-Menu (with confirm + save) and music & SFX/voice
// volume sliders. Full keyboard (arrows + Enter, Esc resumes) and mouse support.

import SaveSystem from '../systems/SaveSystem.js';
import AudioManager from '../systems/AudioManager.js';

const W = 1280;
const H = 720;

export default class PauseMenu {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.container = null;
    this.focusIndex = 0;
    // Volumes come from the AudioManager (which loaded them from the save).
    this.musicVol = AudioManager.channelVolume('music');
    this.sfxVol = AudioManager.channelVolume('sfx');
  }

  toggle() { this.open ? this.close() : this.show(); }

  show() {
    if (this.open) return;
    this.open = true;
    this.scene.paused = true;

    const c = this.scene.add.container(0, 0).setDepth(5000);
    const shade = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x0a0614, 0.7).setInteractive();
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x2a1646, 0.98); panel.fillRoundedRect(W / 2 - 280, H / 2 - 220, 560, 440, 24);
    panel.lineStyle(4, 0xffd86b, 1); panel.strokeRoundedRect(W / 2 - 280, H / 2 - 220, 560, 440, 24);
    const title = this.scene.add.text(W / 2, H / 2 - 170, 'Paused', { fontFamily: 'Georgia, serif', fontSize: '40px', color: '#ffe9a8' }).setOrigin(0.5);
    c.add([shade, panel, title]);

    // Rows: 0 Resume, 1 Music, 2 SFX, 3 Quit.
    this.rows = [];
    this.resumeBtn = this._button(c, W / 2, H / 2 - 90, 'Resume', () => this.close());
    this.musicRow = this._slider(c, H / 2 - 10, 'Music', () => this.musicVol, (v) => this.setMusic(v));
    this.sfxRow = this._slider(c, H / 2 + 60, 'SFX & Voice', () => this.sfxVol, (v) => this.setSfx(v));
    this.quitBtn = this._button(c, W / 2, H / 2 + 150, 'Quit to Main Menu', () => this.quitConfirm());
    this.rows = [this.resumeBtn, this.musicRow, this.sfxRow, this.quitBtn];

    // Patient Pip in the corner.
    const pg = this.scene.add.graphics();
    pg.fillStyle(0xffd36b, 1); pg.fillEllipse(W / 2 + 230, H / 2 - 150, 24, 28);
    pg.fillStyle(0xffe39a, 1); pg.fillCircle(W / 2 + 230, H / 2 - 168, 12);
    c.add(pg);

    this.container = c;
    this.focusIndex = 0;

    this._keyHandler = (e) => this.onKey(e);
    this.scene.input.keyboard.on('keydown', this._keyHandler);
    this.refresh();
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.scene.paused = false;
    if (this._keyHandler) this.scene.input.keyboard.off('keydown', this._keyHandler);
    if (this.container) { this.container.destroy(); this.container = null; }
    if (this.confirmBox) { this.confirmBox.destroy(); this.confirmBox = null; }
  }

  _button(parent, x, y, label, onActivate) {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    const txt = this.scene.add.text(0, 0, label, { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#fff6e0' }).setOrigin(0.5);
    const hit = this.scene.add.rectangle(0, 0, 420, 60, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    c.add([bg, txt, hit]);
    parent.add(c);
    hit.on('pointerover', () => { this.focusIndex = this.rows.indexOf(row); this.refresh(); });
    hit.on('pointerdown', onActivate);
    const row = { type: 'button', container: c, bg, onActivate, w: 420, h: 60 };
    return row;
  }

  _slider(parent, y, label, getVal, setVal) {
    const c = this.scene.add.container(W / 2, y);
    const lbl = this.scene.add.text(-200, 0, label, { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#fff6e0' }).setOrigin(0, 0.5);
    const bar = this.scene.add.graphics();
    const knob = this.scene.add.graphics();
    const hit = this.scene.add.rectangle(70, 0, 260, 50, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    c.add([lbl, bar, knob, hit]);
    parent.add(c);
    const row = { type: 'slider', container: c, bar, knob, getVal, setVal, w: 420, h: 50 };
    hit.on('pointerover', () => { this.focusIndex = this.rows.indexOf(row); this.refresh(); });
    hit.on('pointerdown', (p) => {
      const local = p.x - (c.x - 60); // bar spans x -60..200 in container space (~260)
      const v = Phaser.Math.Clamp(local / 260, 0, 1);
      setVal(v); this.focusIndex = this.rows.indexOf(row); this.refresh();
    });
    return row;
  }

  setMusic(v) {
    this.musicVol = Phaser.Math.Clamp(v, 0, 1);
    AudioManager.setChannelVolume('music', this.musicVol, SaveSystem);
  }
  setSfx(v) {
    this.sfxVol = Phaser.Math.Clamp(v, 0, 1);
    // SFX & Voice slider drives both the sfx and voice channels.
    AudioManager.setChannelVolume('sfx', this.sfxVol, SaveSystem);
    AudioManager.setChannelVolume('voice', this.sfxVol, SaveSystem);
    AudioManager.sfx('hover'); // audible preview
  }

  onKey(e) {
    if (!this.open) return;
    if (this.confirmBox) { this.onConfirmKey(e); return; }
    switch (e.code) {
      case 'Escape': e.preventDefault(); this.close(); break;
      case 'ArrowUp': e.preventDefault(); this.focusIndex = (this.focusIndex + this.rows.length - 1) % this.rows.length; this.refresh(); break;
      case 'ArrowDown': e.preventDefault(); this.focusIndex = (this.focusIndex + 1) % this.rows.length; this.refresh(); break;
      case 'ArrowLeft': e.preventDefault(); this.adjust(-0.1); break;
      case 'ArrowRight': e.preventDefault(); this.adjust(0.1); break;
      case 'Enter':
      case 'Space': e.preventDefault(); this.activate(); break;
      default: break;
    }
  }

  adjust(delta) {
    const row = this.rows[this.focusIndex];
    if (row.type !== 'slider') return;
    row.setVal(Phaser.Math.Clamp(row.getVal() + delta, 0, 1));
    this.refresh();
  }

  activate() {
    const row = this.rows[this.focusIndex];
    if (row.type === 'button') row.onActivate();
  }

  refresh() {
    this.rows.forEach((row, i) => {
      const focused = i === this.focusIndex;
      if (row.type === 'button') {
        row.bg.clear();
        row.bg.fillStyle(focused ? 0x9d57e0 : 0x6a44a0, 1); row.bg.fillRoundedRect(-210, -30, 420, 60, 30);
        row.bg.lineStyle(focused ? 4 : 2, 0xffe9a8, focused ? 1 : 0.5); row.bg.strokeRoundedRect(-210, -30, 420, 60, 30);
      } else {
        const v = row.getVal();
        row.bar.clear();
        row.bar.fillStyle(0x3a2b58, 1); row.bar.fillRoundedRect(-60, -6, 260, 12, 6);
        row.bar.fillStyle(0xffd86b, 1); row.bar.fillRoundedRect(-60, -6, 260 * v, 12, 6);
        if (focused) { row.bar.lineStyle(3, 0xffe9a8, 1); row.bar.strokeRoundedRect(-64, -12, 268, 24, 8); }
        row.knob.clear();
        row.knob.fillStyle(0xfff6e0, 1); row.knob.fillCircle(-60 + 260 * v, 0, focused ? 12 : 9);
      }
    });
  }

  // ---- Quit confirmation --------------------------------------------------
  quitConfirm() {
    if (this.confirmBox) return;
    const c = this.scene.add.container(0, 0).setDepth(5100);
    const sh = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5).setInteractive();
    const p = this.scene.add.graphics();
    p.fillStyle(0x2a1646, 1); p.fillRoundedRect(W / 2 - 300, H / 2 - 120, 600, 240, 20);
    p.lineStyle(3, 0xffd86b, 1); p.strokeRoundedRect(W / 2 - 300, H / 2 - 120, 600, 240, 20);
    const msg = this.scene.add.text(W / 2, H / 2 - 50, 'Your progress will save before you go.', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#fff6e0', align: 'center' }).setOrigin(0.5);
    c.add([sh, p, msg]);
    this.confirmBox = c;
    this.confirmFocus = 0; // 0 = yes, 1 = no
    this.yesBtn = this._confirmBtn(c, W / 2 - 150, H / 2 + 40, 'Save & Quit', () => this.doQuit());
    this.noBtn = this._confirmBtn(c, W / 2 + 150, H / 2 + 40, 'Stay', () => { c.destroy(); this.confirmBox = null; });
    this.confirmBtns = [this.yesBtn, this.noBtn];
    this.refreshConfirm();
  }

  _confirmBtn(parent, x, y, label, onActivate) {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    const txt = this.scene.add.text(0, 0, label, { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#fff6e0' }).setOrigin(0.5);
    const hit = this.scene.add.rectangle(0, 0, 240, 60, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    c.add([bg, txt, hit]);
    parent.add(c);
    hit.on('pointerdown', onActivate);
    return { container: c, bg, onActivate };
  }

  onConfirmKey(e) {
    switch (e.code) {
      case 'ArrowLeft': case 'ArrowRight': e.preventDefault(); this.confirmFocus = 1 - this.confirmFocus; this.refreshConfirm(); break;
      case 'Enter': case 'Space': e.preventDefault(); this.confirmBtns[this.confirmFocus].onActivate(); break;
      case 'Escape': e.preventDefault(); this.confirmBox.destroy(); this.confirmBox = null; break;
      default: break;
    }
  }

  refreshConfirm() {
    this.confirmBtns.forEach((b, i) => {
      const f = i === this.confirmFocus;
      b.bg.clear();
      b.bg.fillStyle(f ? 0x9d57e0 : 0x6a44a0, 1); b.bg.fillRoundedRect(-120, -30, 240, 60, 30);
      b.bg.lineStyle(f ? 4 : 2, 0xffe9a8, f ? 1 : 0.5); b.bg.strokeRoundedRect(-120, -30, 240, 60, 30);
    });
  }

  doQuit() {
    // Kick off the save (fire-and-forget) so leaving never blocks on the file
    // picker, then return to the main menu.
    if (window.showSaveFilePicker) { SaveSystem.saveToDrive().catch(() => {}); }
    this.close();
    this.scene.scene.start('MainMenu');
  }
}
