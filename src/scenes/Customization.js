// src/scenes/Customization.js
//
// Character creator. Left 40% = five option slots; centre/right 60% = the magic
// mirror with a live PrincessPreview that updates on every change. Pip perches
// on the mirror frame and introduces each slot.
//
// Controls (mouse AND keyboard, per the doc):
//   Up/Down or Tab .... move between slots (and the confirm button)
//   Left/Right ........ cycle options within the active slot
//   Enter/Space ....... activate confirm; on a slot, advance to next slot
//   Mouse ............. click any option chip or the confirm button
//
// Entered from the cinematic (data.fromCinematic) -> hands back to Cinematic
// for name entry. Entered from the room mirror -> returns to PrincessRoom.

import SaveSystem from '../systems/SaveSystem.js';
import Cursor from '../ui/Cursor.js';
import Pip from '../characters/Pip.js';
import PrincessPreview from '../characters/Princess.js';

const W = 1280;
const H = 720;

const SLOTS = [
  { key: 'headShape', prompt: 'cust_head', label: 'Face Shape',
    options: [['round', 'Round'], ['oval', 'Oval'], ['heart', 'Heart'], ['square', 'Square']] },
  { key: 'hairStyle', prompt: 'cust_hair', label: 'Hair Style',
    options: [['long', 'Long'], ['short', 'Short Curly'], ['braids', 'Twin Braids'], ['ponytail', 'Ponytail']] },
  { key: 'hairColor', prompt: 'cust_haircolor', label: 'Hair Color',
    options: [['golden', 'Golden'], ['brown', 'Chestnut'], ['black', 'Jet Black'], ['auburn', 'Auburn']] },
  { key: 'eyeColor', prompt: 'cust_eyes', label: 'Eye Color',
    options: [['blue', 'Blue'], ['green', 'Green'], ['brown', 'Brown'], ['violet', 'Violet']] },
  { key: 'bodyShape', prompt: 'cust_body', label: 'Body',
    options: [['petite', 'Petite'], ['average', 'Average'], ['tall', 'Tall'], ['sturdy', 'Sturdy']] }
];

export default class Customization extends Phaser.Scene {
  constructor() { super('Customization'); }

  init(data) {
    this.fromCinematic = !!(data && data.fromCinematic);
  }

  create() {
    this.cameras.main.setBackgroundColor('#152318'); // blurred forest clearing
    this.buildBackdrop();

    if (!SaveSystem.hasSaveData()) SaveSystem.saveData = SaveSystem.createNewSave();
    this.character = Object.assign(
      { headShape: 'round', hairStyle: 'long', hairColor: 'brown', eyeColor: 'brown', bodyShape: 'average' },
      SaveSystem.get('character') || {}
    );

    this.buildMirror();
    this.buildSlots();
    this.buildConfirm();

    this.wandCursor = new Cursor(this);

    this.activeRow = 0; // 0..4 slots, 5 = confirm
    this.visited = new Set([0]);
    this.refresh();
    this.announceSlot(0);

    this.setupKeyboard();
    this.cameras.main.fadeIn(500, 10, 18, 12);
  }

  buildBackdrop() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x10210f, 0x10210f, 0x24351f, 0x1a2b16, 1);
    g.fillRect(0, 0, W, H);
    // Soft blurred "trees".
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(0, W);
      g.fillStyle(0x0c1a0b, 0.4);
      g.fillEllipse(x, Phaser.Math.Between(120, H), Phaser.Math.Between(80, 180), Phaser.Math.Between(200, 380));
    }
  }

  buildMirror() {
    const cx = 890; const cy = 400;
    // Ornate golden frame.
    const frame = this.add.graphics();
    frame.fillStyle(0xb8860b, 1);
    frame.fillRoundedRect(cx - 210, cy - 290, 420, 560, 40);
    frame.fillStyle(0xffe9a8, 1);
    frame.fillRoundedRect(cx - 195, cy - 275, 390, 530, 32);
    // Mirror glass.
    frame.fillStyle(0x2a2440, 1);
    frame.fillRoundedRect(cx - 180, cy - 260, 360, 500, 26);
    // Spotlight from above.
    const spot = this.add.ellipse(cx, cy - 180, 300, 200, 0xffffff, 0.10).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: spot, alpha: 0.18, duration: 2400, yoyo: true, repeat: -1 });

    this.preview = new PrincessPreview(this, cx, cy + 30, { height: 380 });
    this.preview.setCharacter(this.character).setOutfit(SaveSystem.get('currentOutfit')).redraw();

    // Pip perched on top of the mirror frame.
    this.pip = new Pip(this, cx, cy - 300, { scale: 1 });
  }

  buildSlots() {
    this.slotViews = [];
    const startY = 90;
    const rowH = 104;
    SLOTS.forEach((slot, i) => {
      const y = startY + i * rowH;
      const label = this.add.text(40, y, slot.label, {
        fontFamily: 'Georgia, serif', fontSize: '22px', color: '#ffe9a8'
      });
      const chips = [];
      slot.options.forEach((opt, j) => {
        const chipX = 44 + j * 116;
        const chipY = y + 34;
        const c = this.add.container(chipX, chipY);
        const bg = this.add.graphics();
        const txt = this.add.text(54, 26, opt[1], {
          fontFamily: 'Georgia, serif', fontSize: '15px', color: '#fff6e0', align: 'center',
          wordWrap: { width: 100 }
        }).setOrigin(0.5);
        const hit = this.add.rectangle(54, 26, 108, 52, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
        c.add([bg, txt, hit]);
        hit.on('pointerover', () => { this.activeRow = i; this.refresh(); });
        hit.on('pointerdown', () => { this.selectOption(i, j); });
        chips.push({ container: c, bg, optValue: opt[0] });
      });
      this.slotViews.push({ label, chips, slot });
    });
  }

  buildConfirm() {
    const y = 640;
    this.confirm = this.add.container(270, y);
    this.confirmBg = this.add.graphics();
    const txt = this.add.text(0, 0, "That's me! ✨", {
      fontFamily: 'Georgia, serif', fontSize: '28px', color: '#fff6e0'
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 380, 76, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    this.confirm.add([this.confirmBg, txt, hit]);
    hit.on('pointerover', () => { this.activeRow = 5; this.refresh(); });
    hit.on('pointerdown', () => this.doConfirm());
  }

  selectOption(slotIndex, optIndex) {
    const slot = SLOTS[slotIndex];
    const value = slot.options[optIndex][0];
    this.character[slot.key] = value;
    this.activeRow = slotIndex;
    this.preview.setCharacter(this.character).redraw();
    this.pip.express('excited');
    this.pip.say('pip_delight');
    this.time.delayedCall(900, () => { if (this.pip.active) this.pip.express('idle'); });
    this.refresh();
  }

  // Move active slot's selection by +/-1 (arrow left/right).
  cycleActive(dir) {
    if (this.activeRow > 4) return;
    const slot = SLOTS[this.activeRow];
    const cur = slot.options.findIndex((o) => o[0] === this.character[slot.key]);
    const next = (cur + dir + slot.options.length) % slot.options.length;
    this.selectOption(this.activeRow, next);
  }

  moveRow(dir) {
    this.activeRow = Phaser.Math.Clamp(this.activeRow + dir, 0, 5);
    if (this.activeRow <= 4 && !this.visited.has(this.activeRow)) {
      this.visited.add(this.activeRow);
      this.announceSlot(this.activeRow);
    }
    this.refresh();
  }

  announceSlot(i) {
    this.pip.express('idle');
    this.pip.say(SLOTS[i].prompt);
  }

  refresh() {
    // Draw chip + confirm highlight states.
    this.slotViews.forEach((view, i) => {
      const rowActive = this.activeRow === i;
      view.label.setColor(rowActive ? '#ffffff' : '#ffe9a8');
      view.chips.forEach((chip) => {
        const selected = this.character[view.slot.key] === chip.optValue;
        chip.bg.clear();
        chip.bg.fillStyle(rowActive ? 0x3a2b58 : 0x2a2040, rowActive ? 1 : 0.85);
        chip.bg.fillRoundedRect(0, 0, 108, 52, 10);
        chip.bg.lineStyle(selected ? 4 : 2, selected ? 0xffd86b : 0x6a5a8a, 1);
        chip.bg.strokeRoundedRect(0, 0, 108, 52, 10);
      });
    });
    const cActive = this.activeRow === 5;
    this.confirmBg.clear();
    this.confirmBg.fillStyle(cActive ? 0x9d57e0 : 0x7b3fb5, 1);
    this.confirmBg.fillRoundedRect(-190, -38, 380, 76, 38);
    this.confirmBg.lineStyle(cActive ? 4 : 3, 0xffe9a8, cActive ? 1 : 0.6);
    this.confirmBg.strokeRoundedRect(-190, -38, 380, 76, 38);
  }

  setupKeyboard() {
    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.moveRow(-1));
    kb.on('keydown-DOWN', () => this.moveRow(1));
    kb.on('keydown-TAB', (e) => { e.preventDefault(); this.moveRow(1); });
    kb.on('keydown-LEFT', () => this.cycleActive(-1));
    kb.on('keydown-RIGHT', () => this.cycleActive(1));
    kb.on('keydown-ENTER', () => { if (this.activeRow === 5) this.doConfirm(); else this.moveRow(1); });
    kb.on('keydown-SPACE', () => { if (this.activeRow === 5) this.doConfirm(); });
  }

  doConfirm() {
    if (this._confirmed) return;
    this._confirmed = true;
    SaveSystem.set('character', this.character);
    this.wandCursor.setState('correct');
    this.pip.express('excited');
    this.input.keyboard.removeAllListeners();

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.fromCinematic) this.scene.start('Cinematic', { resume: 'post' });
      else this.scene.start('PrincessRoom');
    });
  }
}
