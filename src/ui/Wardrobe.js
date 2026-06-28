// src/ui/Wardrobe.js
//
// Closet / Wardrobe UI — a scene launched from the Princess Room's wardrobe door.
// Split screen: left 40% = closet with five sections (Crown locked until earned,
// Hats, Dress, Shirt & Pants, Shoes); right 60% = live princess mirror preview.
//
// Owned items only (from save.wardrobe). Equipping is instant + auto-saves to
// currentOutfit. Pip reacts to each change. Full mouse + keyboard support.

import SaveSystem from '../systems/SaveSystem.js';
import Cursor from '../ui/Cursor.js';
import Pip from '../characters/Pip.js';
import PrincessPreview from '../characters/Princess.js';

const W = 1280;
const H = 720;
const BIOMES = ['forest', 'swamp', 'fields', 'castle'];

const SECTIONS = [
  { key: 'crown', label: '👑 Crown', slots: ['crown'], crown: true },
  { key: 'hat', label: '🎩 Hats', slots: ['hat'] },
  { key: 'dress', label: '👗 Dress', slots: ['dress'] },
  { key: 'shirtpants', label: '👕 Shirt & Pants', slots: ['shirt', 'pants'] },
  { key: 'shoes', label: '👟 Shoes', slots: ['shoes'] }
];

export default class Wardrobe extends Phaser.Scene {
  constructor() { super('Closet'); }

  create() {
    this.cameras.main.setBackgroundColor('#1a120c');
    this.wardrobe = SaveSystem.get('wardrobe') || [];
    this.outfit = SaveSystem.get('currentOutfit') || {};
    this.crownUnlocked = !!SaveSystem.get('progress.crownUnlocked');

    this.activeRow = 1;   // start on Hats
    this.itemIndex = 0;

    this.buildLeftPanel();
    this.buildMirror();
    this.buildDone();
    this.buildTracker();

    this.wandCursor = new Cursor(this);

    this.setupKeyboard();
    this.refresh();
    this.cameras.main.fadeIn(400, 14, 9, 6);
  }

  buildLeftPanel() {
    const g = this.add.graphics();
    g.fillStyle(0x2e1d10, 1); g.fillRect(0, 0, 500, H);
    g.fillStyle(0x3c2614, 1); g.fillRect(16, 16, 468, H - 32);
    this.add.text(40, 28, 'Wardrobe', { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffe9a8' });

    // Section tabs.
    this.tabViews = [];
    SECTIONS.forEach((sec, i) => {
      const y = 80 + i * 52;
      const c = this.add.container(40, y);
      const bg = this.add.graphics();
      const owned = this.itemsFor(sec).length;
      const locked = sec.crown && !this.crownUnlocked;
      const labelTxt = locked ? `${sec.label}  🔒` : `${sec.label}   (${owned})`;
      const txt = this.add.text(16, 14, labelTxt, { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#fff6e0' });
      const hit = this.add.rectangle(210, 22, 420, 44, 0xffffff, 0.001).setOrigin(0.5).setInteractive({ useHandCursor: false });
      c.add([bg, txt, hit]);
      hit.on('pointerover', () => { this.activeRow = i; this.itemIndex = 0; this.refresh(); });
      hit.on('pointerdown', () => { this.activeRow = i; this.itemIndex = 0; this.onTab(i); });
      this.tabViews.push({ bg, txt });
    });

    // Items shelf area. shelfTitle lives outside the shelf so refresh()'s
    // shelf.removeAll(true) never destroys it.
    this.shelf = this.add.container(40, 360);
    this.shelfTitle = this.add.text(40, 336, '', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#cdb6e8' });
  }

  buildMirror() {
    const cx = 880; const cy = 360;
    const frame = this.add.graphics();
    frame.fillStyle(0xb8860b, 1); frame.fillRoundedRect(cx - 200, cy - 300, 400, 600, 36);
    frame.fillStyle(0x2a2440, 1); frame.fillRoundedRect(cx - 175, cy - 280, 350, 560, 26);
    const spot = this.add.ellipse(cx, cy - 200, 280, 200, 0xffffff, 0.10).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: spot, alpha: 0.18, duration: 2400, yoyo: true, repeat: -1 });

    this.preview = new PrincessPreview(this, cx, cy + 40, { height: 400, showSilhouettes: true });
    this.preview.setCharacter(SaveSystem.get('character')).setOutfit(this.outfit);
    this.preview.setBiome(this.dominantBiome()).redraw();

    this.pip = new Pip(this, cx + 150, cy - 290, { scale: 0.9 });
  }

  buildDone() {
    this.done = this.add.container(W - 120, H - 48);
    this.doneBg = this.add.graphics();
    const txt = this.add.text(0, 0, 'Done ✓', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#fff6e0' }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 180, 64, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    this.done.add([this.doneBg, txt, hit]);
    hit.on('pointerover', () => { this.activeRow = 5; this.refresh(); });
    hit.on('pointerdown', () => this.finish());
  }

  buildTracker() {
    this.trackerText = this.add.text(40, H - 56, '', { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#e8c66a' });
  }

  // ---- Data helpers -------------------------------------------------------

  itemsFor(section) {
    return this.wardrobe.filter((it) => section.slots.includes(it.slot));
  }

  dominantBiome() {
    const counts = {};
    Object.values(this.outfit).forEach((it) => {
      if (it && it.biome) counts[it.biome] = (counts[it.biome] || 0) + 1;
    });
    let best = null; let n = 0;
    Object.entries(counts).forEach(([b, c]) => { if (c > n) { n = c; best = b; } });
    return best;
  }

  equippedBiomes() {
    return new Set(Object.values(this.outfit).filter((it) => it && it.biome).map((it) => it.biome));
  }

  isFullGoldSet() {
    const slots = ['hat', 'dress', 'shirt', 'pants', 'shoes'];
    const items = slots.map((s) => this.outfit[s]);
    if (items.some((it) => !it || !it.gold)) return false;
    const biomes = new Set(items.map((it) => it.biome));
    return biomes.size === 1;
  }

  // ---- Interaction --------------------------------------------------------

  onTab(i) {
    const sec = SECTIONS[i];
    if (sec.crown && !this.crownUnlocked) {
      this.pip.express('idle');
      this.pip.say('closet_crown_locked');
    }
    this.refresh();
  }

  equipSelected() {
    const sec = SECTIONS[this.activeRow];
    if (!sec) return;
    if (sec.crown && !this.crownUnlocked) { this.onTab(this.activeRow); return; }
    const items = this.itemsFor(sec);
    if (items.length === 0) return;
    const item = items[Phaser.Math.Clamp(this.itemIndex, 0, items.length - 1)];

    this.outfit[item.slot] = { ...item };
    SaveSystem.set('currentOutfit', this.outfit);
    this.preview.setOutfit(this.outfit).setBiome(this.dominantBiome()).redraw();
    this.wandCursor.setState('correct');
    this.reactToEquip(item);
    this.refresh();
  }

  reactToEquip(item) {
    const name = SaveSystem.get('playerName') || 'Princess';
    let key = null;
    if (this.isFullGoldSet()) key = 'closet_full_set';
    else if (item.slot === 'crown') key = 'closet_crown_first';
    else if (item.slot === 'hat') key = item.gold ? 'closet_hat_gold' : 'closet_hat';
    else if (item.slot === 'dress') key = item.gold ? 'closet_dress_gold' : 'closet_dress';
    else if (item.slot === 'shoes') key = 'closet_shoes';
    else if (this.equippedBiomes().size > 1) key = 'closet_mismatch';

    this.pip.express(key === 'closet_crown_first' ? 'tearful' : 'excited');
    if (key) {
      // Caption uses the player's name where relevant.
      this.pip.say(key);
    }
    this.time.delayedCall(1500, () => { if (this.pip.active) this.pip.express('idle'); });
  }

  finish() {
    if (this._done) return;
    this._done = true;
    SaveSystem.set('currentOutfit', this.outfit);
    this.input.keyboard.removeAllListeners();
    this.wandCursor.setState('loading');
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('PrincessRoom'));
  }

  setupKeyboard() {
    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => { this.activeRow = Phaser.Math.Clamp(this.activeRow - 1, 0, 5); this.itemIndex = 0; this.refresh(); });
    kb.on('keydown-DOWN', () => { this.activeRow = Phaser.Math.Clamp(this.activeRow + 1, 0, 5); this.itemIndex = 0; this.refresh(); });
    kb.on('keydown-TAB', (e) => { e.preventDefault(); this.activeRow = (this.activeRow + 1) % 6; this.itemIndex = 0; this.refresh(); });
    kb.on('keydown-LEFT', () => { this.moveItem(-1); });
    kb.on('keydown-RIGHT', () => { this.moveItem(1); });
    kb.on('keydown-ENTER', () => { if (this.activeRow === 5) this.finish(); else this.equipSelected(); });
    kb.on('keydown-SPACE', () => { if (this.activeRow === 5) this.finish(); else this.equipSelected(); });
    kb.on('keydown-ESC', () => this.finish());
  }

  moveItem(dir) {
    if (this.activeRow > 4) return;
    const items = this.itemsFor(SECTIONS[this.activeRow]);
    if (items.length === 0) return;
    this.itemIndex = (this.itemIndex + dir + items.length) % items.length;
    this.refresh();
  }

  // ---- Render -------------------------------------------------------------

  refresh() {
    // Tabs.
    this.tabViews.forEach((view, i) => {
      const active = this.activeRow === i;
      view.bg.clear();
      view.bg.fillStyle(active ? 0x5a3a1e : 0x2a1a0e, active ? 1 : 0.7);
      view.bg.fillRoundedRect(0, 0, 420, 44, 8);
      view.bg.lineStyle(active ? 3 : 1, 0xd8b25a, active ? 1 : 0.4);
      view.bg.strokeRoundedRect(0, 0, 420, 44, 8);
    });

    // Done highlight.
    const dActive = this.activeRow === 5;
    this.doneBg.clear();
    this.doneBg.fillStyle(dActive ? 0x9d57e0 : 0x7b3fb5, 1);
    this.doneBg.fillRoundedRect(-90, -32, 180, 64, 32);
    this.doneBg.lineStyle(dActive ? 4 : 2, 0xffe9a8, dActive ? 1 : 0.5);
    this.doneBg.strokeRoundedRect(-90, -32, 180, 64, 32);

    // Shelf (active section's items).
    this.shelf.removeAll(true);
    const sec = SECTIONS[this.activeRow <= 4 ? this.activeRow : 1];
    const locked = sec.crown && !this.crownUnlocked;
    this.shelfTitle.setText(locked ? 'Crown — locked' : `${sec.label}`);

    if (locked) {
      const t = this.add.text(0, 20, 'A velvet cushion waits...\nKeep adventuring to earn the crown.', {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#9d86c0'
      });
      this.shelf.add(t);
    } else {
      const items = this.itemsFor(sec);
      if (items.length === 0) {
        this.shelf.add(this.add.text(0, 20, 'No items yet —\nadventure to collect some!', {
          fontFamily: 'Georgia, serif', fontSize: '16px', color: '#9d86c0'
        }));
      } else {
        items.forEach((item, j) => {
          const col = j % 3; const row = Math.floor(j / 3);
          const x = col * 150; const y = row * 110 + 10;
          const chip = this.add.container(x, y);
          const equipped = this.outfit[item.slot] && this.outfit[item.slot].id === item.id;
          const focused = this.itemIndex === j;
          const bg = this.add.graphics();
          bg.fillStyle(item.color, 1); bg.fillRoundedRect(0, 0, 132, 86, 10);
          bg.lineStyle(focused ? 4 : (equipped ? 4 : 2), equipped ? 0x9be8a8 : (focused ? 0xffd86b : 0x6a5a8a), 1);
          bg.strokeRoundedRect(0, 0, 132, 86, 10);
          const label = this.add.text(66, 30, item.label, {
            fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1a1024', align: 'center', wordWrap: { width: 120 }
          }).setOrigin(0.5);
          const meta = this.add.text(66, 66, `${this.biomeIcon(item.biome)}${item.gold ? '  ✨' : ''}`, {
            fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1a1024'
          }).setOrigin(0.5);
          const hit = this.add.rectangle(66, 43, 132, 86, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
          chip.add([bg, label, meta, hit]);
          hit.on('pointerover', () => { this.itemIndex = j; this.refresh(); });
          hit.on('pointerdown', () => { this.itemIndex = j; this.equipSelected(); });
          if (item.gold) this.tweens.add({ targets: label, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
          this.shelf.add(chip);
        });
      }
    }

    // Completion tracker.
    const parts = BIOMES.map((b) => {
      const owned = this.wardrobe.filter((it) => it.biome === b).length;
      const goldComplete = ['hat', 'dress', 'shirt', 'pants', 'shoes'].every((s) =>
        this.wardrobe.some((it) => it.slot === s && it.biome === b && it.gold));
      return `${this.biomeIcon(b)} ${owned}/10${goldComplete ? ' ⭐' : ''}`;
    });
    const pipCount = (SaveSystem.get('pipCollection') || []).length;
    this.trackerText.setText(parts.join('    ') + `    🧚 ${pipCount}`);
  }

  biomeIcon(b) {
    return ({ forest: '🌲', swamp: '🐸', fields: '🌼', castle: '🏰', pip: '🧚' })[b] || '•';
  }
}
