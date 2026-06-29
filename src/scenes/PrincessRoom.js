// src/scenes/PrincessRoom.js
//
// The central hub. Player returns here between acts and sessions.
// Contains: wardrobe door (-> Closet), shop door (locked until Act 1 complete),
// Waldo's window (form from save), a mirror (-> Customization), the princess
// avatar in her current outfit, and draggable floor/wall decorations.
//
// Decorations support BOTH mouse drag AND keyboard select-then-place (focus a
// decoration, Enter to pick up, arrows to move, Enter to drop — snaps to floor
// or wall). Room layout persists to SaveSystem on scene exit; an explicit
// "Save & Rest" performs the thumb-drive autosave with Pip's flag wave.

import SaveSystem from '../systems/SaveSystem.js';
import ItemDB from '../systems/ItemDB.js';
import Cursor from '../ui/Cursor.js';
import Pip from '../characters/Pip.js';
import PrincessPreview from '../characters/Princess.js';
import { seedStarterWardrobe } from '../systems/StarterItems.js';
import AudioManager from '../systems/AudioManager.js';

const W = 1280;
const H = 720;
const FLOOR_Y = 470;        // top of the floor
const FLOOR_SNAP = 600;     // y where floor items rest
const WALL_SNAP = 180;      // y where wall items hang

const DEFAULT_DECOR = [
  { id: 'lamp', label: 'Lamp', type: 'floor', color: 0xffd98a, x: 760, y: FLOOR_SNAP },
  { id: 'rug', label: 'Rug', type: 'floor', color: 0x8a4a6a, x: 540, y: 650 },
  { id: 'painting', label: 'Painting', type: 'wall', color: 0x5a7db8, x: 980, y: WALL_SNAP }
];

export default class PrincessRoom extends Phaser.Scene {
  constructor() { super('PrincessRoom'); }

  create() {
    this.cameras.main.setBackgroundColor('#2a1535');

    if (!SaveSystem.hasSaveData()) SaveSystem.saveData = SaveSystem.createNewSave();
    AudioManager.loadVolumes(SaveSystem);
    seedStarterWardrobe(SaveSystem); // Phase-2 demo wardrobe (Acts will replace)

    this.sessionStart();

    this.buildRoom();
    this.buildAvatar();
    this.buildDecorations();
    this.buildDoorsAndFixtures();
    this.buildNav();
    this.buildSaveIndicator();

    this.wandCursor = new Cursor(this);
    this.pip = new Pip(this, 1080, 360, { scale: 0.95 });

    this.focusIndex = 0;
    this.moveMode = false;
    this.highlight = this.add.graphics().setDepth(500);
    this.setupKeyboard();
    this.refreshFocus();

    // Welcome.
    if (this.absenceDays > 14) this.time.delayedCall(500, () => this.showWarmUpOffer());
    else this.welcomeBubble('room_welcome_back');

    this.events.once('shutdown', () => this.persistLayout());
    this.cameras.main.fadeIn(400, 26, 10, 46);
  }

  // ---- Session ------------------------------------------------------------

  sessionStart() {
    const perf = SaveSystem.get('performance') || {};
    const last = perf.lastSession ? new Date(perf.lastSession) : null;
    this.absenceDays = last ? (Date.now() - last.getTime()) / 86400000 : 0;
    SaveSystem.set('performance.sessionCount', (perf.sessionCount || 0) + 1);
    SaveSystem.set('performance.lastSession', new Date().toISOString());
  }

  // ---- Room shell ---------------------------------------------------------

  buildRoom() {
    const g = this.add.graphics();
    // Back wall.
    g.fillStyle(0x3b2350, 1); g.fillRect(0, 0, W, FLOOR_Y);
    // Floor.
    g.fillStyle(0x4a2f1a, 1); g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    g.fillStyle(0x5a3a22, 1);
    for (let x = 0; x < W; x += 80) g.fillRect(x, FLOOR_Y, 4, H - FLOOR_Y);
    // Plain bed frame (room starts bare).
    g.fillStyle(0x6a4a8a, 1); g.fillRoundedRect(120, 380, 300, 110, 12);
    g.fillStyle(0x8a6aa8, 1); g.fillRect(120, 360, 30, 130);
    g.fillStyle(0xe8d8f0, 1); g.fillRoundedRect(140, 392, 110, 50, 8); // pillow
    // Bare shelves.
    g.fillStyle(0x3a2414, 1); g.fillRect(560, 120, 160, 10); g.fillRect(560, 180, 160, 10);
  }

  buildAvatar() {
    this.avatar = new PrincessPreview(this, 470, 430, { height: 300 });
    this.avatar.setCharacter(SaveSystem.get('character')).setOutfit(SaveSystem.get('currentOutfit')).redraw();
  }

  // ---- Decorations (drag + keyboard place) --------------------------------

  buildDecorations() {
    // Ownership (roomDecorations: {itemId,tier,...}) is separate from positions
    // (roomLayout: [{itemId,x,y,layer}]) per the save schema.
    const owned = SaveSystem.get('roomDecorations') || [];
    this.layout = SaveSystem.get('roomLayout') || [];
    this.decorObjs = [];

    owned.forEach((entry, i) => {
      const disp = ItemDB.display(entry.itemId);
      let pos = this.layout.find((l) => l.itemId === entry.itemId);
      if (!pos) { pos = { itemId: entry.itemId, x: 680 + (i % 3) * 130, y: FLOOR_SNAP, layer: 'floor' }; this.layout.push(pos); }
      const data = { itemId: entry.itemId, label: disp.label, color: disp.color, pos };

      const c = this.add.container(pos.x, pos.y);
      const g = this.add.graphics();
      this.drawDecor(g, data, pos.layer);
      const label = this.add.text(0, 28, disp.label, { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#fff6e0', align: 'center', wordWrap: { width: 90 } }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, 80, 64, 0xffffff, 0.001).setInteractive({ useHandCursor: false, draggable: true });
      c.add([g, label, hit]);
      c.setDepth(pos.layer === 'wall' ? 5 : 20);

      hit.on('pointerover', () => { this.focusIndex = this.focusables.indexOf(this._decorFocus(data)); this.refreshFocus(); });
      hit.on('pointerdown', () => this.clickDecor(data, c));
      hit.on('drag', (p, dragX, dragY) => { c.x = dragX; c.y = dragY; });
      hit.on('dragend', () => this.snapDecor(data, c));

      this.decorObjs.push({ data, container: c });
    });
    SaveSystem.set('roomLayout', this.layout);
  }

  drawDecor(g, d, layer) {
    g.clear();
    g.fillStyle(d.color, 1);
    if (layer === 'wall') g.fillRoundedRect(-30, -22, 60, 44, 6);
    else g.fillRoundedRect(-16, -28, 32, 56, 8);
    g.lineStyle(2, 0x000000, 0.25);
    g.strokeRoundedRect(-30, -28, 60, 56, 8);
  }

  clickDecor(d, c) {
    // Unique reaction (placeholder): a little bounce + sparkle.
    this.tweens.add({ targets: c, scaleX: 1.12, scaleY: 0.9, duration: 120, yoyo: true });
    this.wandCursor.setState('click');
    AudioManager.sfx('hover');
  }

  snapDecor(d, c) {
    if (d.pos.layer === 'wall') { c.y = WALL_SNAP; }
    else { c.y = Math.max(FLOOR_Y + 40, Math.min(H - 40, c.y)); }
    c.x = Phaser.Math.Clamp(c.x, 40, W - 40);
    d.pos.x = c.x; d.pos.y = c.y;
  }

  _decorFocus(d) {
    return this.focusables.find((f) => f.decor === d);
  }

  // ---- Doors, window, mirror ---------------------------------------------

  buildDoorsAndFixtures() {
    // Wardrobe door (left wall).
    this.wardrobeDoor = this.makeFixture(110, 250, 150, 250, 0x6a4a28, 'Wardrobe');
    // Shop door (right wall) — locked until Act 1 complete.
    this.act1Done = !!SaveSystem.get('progress.act1Complete');
    this.shopDoor = this.makeFixture(1170, 250, 150, 250, this.act1Done ? 0x8a5a2a : 0x4a3a2a, this.act1Done ? "Benny's Shop" : "Benny's 🔒");
    // Back-wall window with Waldo.
    this.window = this.makeFixture(840, 150, 200, 160, 0x2a3a6a, 'Window');
    this.buildWaldo();
    // Mirror (right wall) -> customization.
    this.mirror = this.makeFixture(1120, 470, 110, 170, 0xb8860b, 'Mirror');

    // Single flower on the windowsill (always present).
    const fg = this.add.graphics().setDepth(6);
    fg.fillStyle(0x3f8f4f, 1); fg.fillRect(838, 226, 4, 22);
    fg.fillStyle(0xff8fc8, 1); fg.fillCircle(840, 222, 8);
  }

  makeFixture(x, y, w, h, color, label) {
    const c = this.add.container(x, y).setDepth(8);
    const g = this.add.graphics();
    g.fillStyle(color, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.lineStyle(3, 0x2a1a0e, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    const txt = this.add.text(0, h / 2 - 22, label, { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#fff6e0' }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    c.add([g, txt, hit]);
    c._w = w; c._h = h;
    return { container: c, hit, x, y, w, h };
  }

  buildWaldo() {
    const form = SaveSystem.get('progress.waldoForm') || 'none';
    const wx = 840; const wy = 160;
    this.waldo = this.add.container(wx, wy).setDepth(7);
    const g = this.add.graphics();
    if (form === 'none') {
      g.fillStyle(0x3f6f3f, 1); g.fillEllipse(0, 40, 160, 40); // garden
      g.fillStyle(0x5f9f5f, 1); g.fillCircle(-40, 30, 12); g.fillCircle(30, 26, 14);
    } else {
      const bodyCol = form === 'unicorn' ? 0xf5f0ff : 0x8a5a2a;
      g.fillStyle(bodyCol, 1); g.fillEllipse(0, 20, 90, 44); g.fillCircle(36, 0, 18); // body+head
      g.fillRect(-30, 30, 8, 28); g.fillRect(20, 30, 8, 28); // legs
      if (form === 'unicorn') { g.fillStyle(0xffd86b, 1); g.fillTriangle(44, -14, 50, -14, 47, -34); } // horn
    }
    this.waldo.add(g);

    // Unicorn horn pulses softly on a ~3 second cycle.
    if (form === 'unicorn') {
      const hornGlow = this.add.ellipse(47, -34, 16, 16, 0xfff2b0, 0.5).setBlendMode(Phaser.BlendModes.ADD);
      this.waldo.add(hornGlow);
      this.tweens.add({ targets: hornGlow, scaleX: 1.8, scaleY: 1.8, alpha: 0.15, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  nuzzleWaldo() {
    const form = SaveSystem.get('progress.waldoForm') || 'none';
    if (form === 'none') { this.wandCursor.setState('correct'); return; }
    this.tweens.add({ targets: this.waldo, x: 840 + 20, duration: 300, yoyo: true, ease: 'Sine.easeInOut' });
  }

  // ---- Navigation ---------------------------------------------------------

  buildNav() {
    this.continueBtn = this.makeButton(W - 150, H - 48, 240, 64, '🚪 Continue Journey', () => this.continueJourney());
    this.saveBtn = this.makeButton(170, H - 48, 240, 64, 'Save & Rest 💾', () => this.saveAndRest());
  }

  makeButton(x, y, w, h, label, onActivate) {
    const c = this.add.container(x, y).setDepth(30);
    const g = this.add.graphics();
    const txt = this.add.text(0, 0, label, { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#fff6e0' }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    c.add([g, txt, hit]);
    const draw = (active) => {
      g.clear();
      g.fillStyle(active ? 0x9d57e0 : 0x7b3fb5, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      g.lineStyle(active ? 4 : 2, 0xffe9a8, active ? 1 : 0.5); g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    };
    draw(false);
    hit.on('pointerdown', onActivate);
    return { container: c, hit, x, y, w, h, draw, onActivate };
  }

  continueJourney() {
    this.persistLayout();
    this.wandCursor.setState('loading');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.act1Done ? 'Act2' : 'Act1'));
  }

  // ---- Save & autosave indicator -----------------------------------------

  buildSaveIndicator() {
    this.saveFlag = this.add.container(W / 2, 60).setDepth(400).setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(0x1a0a2e, 0.85); g.fillRoundedRect(-150, -26, 300, 52, 16);
    g.lineStyle(2, 0xffe9a8, 1); g.strokeRoundedRect(-150, -26, 300, 52, 16);
    // Tiny flag.
    g.fillStyle(0x8a6a4a, 1); g.fillRect(-120, -16, 3, 32);
    g.fillStyle(0xff6b9d, 1); g.fillTriangle(-117, -16, -117, -2, -100, -9);
    const txt = this.add.text(10, 0, 'Adventure saved!', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#ffe9a8' }).setOrigin(0.5);
    this.saveFlag.add([g, txt]);
  }

  async saveAndRest() {
    this.persistLayout();
    if (!window.showSaveFilePicker) {
      this.welcomeBubble('room_saved');
      this.flashSaveFlag();
      return;
    }
    const res = await SaveSystem.saveToDrive();
    if (res.success) {
      this.flashSaveFlag();
      this.pip.express('excited');
      this.pip.say('room_saved');
    } else {
      this.welcomeBubble('room_saved');
    }
  }

  flashSaveFlag() {
    this.saveFlag.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.saveFlag, alpha: 1, y: 70, duration: 300, yoyo: true, hold: 1200,
      onComplete: () => this.saveFlag.setVisible(false) });
  }

  persistLayout() {
    if (this._persisted) return;
    this._persisted = true;
    // Decoration positions live in roomLayout (ownership stays in roomDecorations).
    if (this.layout) SaveSystem.set('roomLayout', this.layout);
  }

  // ---- Pip speech bubble ---------------------------------------------------

  welcomeBubble(voiceKey) {
    // Pip may not exist yet during very early create order; guard.
    this.time.delayedCall(300, () => {
      if (!this.pip || !this.pip.active) return;
      this.pip.express('idle');
      this.pip.say(voiceKey);
    });
  }

  // 14+ days away: warmly offer to show the puzzles again.
  showWarmUpOffer() {
    if (this.pip) { this.pip.express('idle'); this.pip.say('room_absence'); }
    const dlg = this.add.container(0, 0).setDepth(3000);
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x0a0418, 0.6).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x2a1646, 0.98); panel.fillRoundedRect(W / 2 - 340, H / 2 - 140, 680, 280, 22);
    panel.lineStyle(4, 0xffd86b, 1); panel.strokeRoundedRect(W / 2 - 340, H / 2 - 140, 680, 280, 22);
    const msg = this.add.text(W / 2, H / 2 - 60, "It's been a while — shall I show you\nhow the puzzles work again?", {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#fff6e0', align: 'center'
    }).setOrigin(0.5);
    dlg.add([shade, panel, msg]);

    const close = () => { dlg.destroy(); this.input.keyboard.off('keydown', kh); };
    const yes = this.makeButton(W / 2 - 170, H / 2 + 60, 280, 70, 'Yes please!', () => {
      // Re-teach: clear introductions so the next act re-explains each type.
      const intro = SaveSystem.get('encounterIntroductions') || {};
      Object.keys(intro).forEach((k) => SaveSystem.set(`encounterIntroductions.${k}`, false));
      close();
    });
    const no = this.makeButton(W / 2 + 170, H / 2 + 60, 280, 70, 'I remember!', () => close());
    dlg.add([yes.container, no.container]);

    let focus = 0;
    const draw = () => { yes.draw(focus === 0); no.draw(focus === 1); };
    draw();
    const kh = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { focus = 1 - focus; draw(); }
      else if (e.code === 'Enter' || e.code === 'Space') { (focus === 0 ? yes : no).onActivate(); }
    };
    this.input.keyboard.on('keydown', kh);
  }

  // ---- Focus / keyboard ---------------------------------------------------

  get focusables() {
    if (this._focusables) return this._focusables;
    const list = [
      { key: 'wardrobe', x: this.wardrobeDoor.x, y: this.wardrobeDoor.y, w: this.wardrobeDoor.w, h: this.wardrobeDoor.h, activate: () => this.openWardrobe() },
      { key: 'mirror', x: this.mirror.x, y: this.mirror.y, w: this.mirror.w, h: this.mirror.h, activate: () => this.openMirror() },
      { key: 'window', x: this.window.x, y: this.window.y, w: this.window.w, h: this.window.h, activate: () => this.nuzzleWaldo() },
      { key: 'shop', x: this.shopDoor.x, y: this.shopDoor.y, w: this.shopDoor.w, h: this.shopDoor.h, activate: () => this.openShop() },
      { key: 'continue', x: this.continueBtn.x, y: this.continueBtn.y, w: this.continueBtn.w, h: this.continueBtn.h, activate: () => this.continueJourney() },
      { key: 'save', x: this.saveBtn.x, y: this.saveBtn.y, w: this.saveBtn.w, h: this.saveBtn.h, activate: () => this.saveAndRest() }
    ];
    (this.decorObjs || []).forEach((o) => {
      list.push({ key: 'decor', decor: o.data, obj: o, x: o.container.x, y: o.container.y, w: 90, h: 70, activate: () => this.toggleMove(o) });
    });
    this._focusables = list;
    return list;
  }

  openWardrobe() { this.transitionTo('Closet'); }
  openMirror() { this.transitionTo('Customization'); }
  openShop() {
    if (this.act1Done) this.transitionTo('Shop');
    else { this.pip.express('concerned'); this.pip.say('room_shop_locked'); }
  }

  transitionTo(key) {
    this.persistLayout();
    this.wandCursor.setState('loading');
    this.input.keyboard.removeAllListeners();
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  setupKeyboard() {
    // Wire fixture/door/mirror/window mouse clicks to their activations.
    this.wardrobeDoor.hit.on('pointerdown', () => this.openWardrobe());
    this.mirror.hit.on('pointerdown', () => this.openMirror());
    this.window.hit.on('pointerdown', () => this.nuzzleWaldo());
    this.shopDoor.hit.on('pointerdown', () => this.openShop());

    const kb = this.input.keyboard;
    this.input.setDraggable; // (drag already enabled per-object)
    kb.on('keydown-RIGHT', () => this.moveMode ? this.nudge(8, 0) : this.cycleFocus(1));
    kb.on('keydown-LEFT', () => this.moveMode ? this.nudge(-8, 0) : this.cycleFocus(-1));
    kb.on('keydown-DOWN', () => this.moveMode ? this.nudge(0, 8) : this.cycleFocus(1));
    kb.on('keydown-UP', () => this.moveMode ? this.nudge(0, -8) : this.cycleFocus(-1));
    kb.on('keydown-TAB', (e) => { e.preventDefault(); if (!this.moveMode) this.cycleFocus(1); });
    kb.on('keydown-ENTER', () => this.activateFocus());
    kb.on('keydown-SPACE', () => this.activateFocus());
    kb.on('keydown-ESC', () => { if (this.moveMode) this.commitMove(); });
  }

  cycleFocus(dir) {
    const n = this.focusables.length;
    this.focusIndex = (this.focusIndex + dir + n) % n;
    this.refreshFocus();
  }

  activateFocus() {
    const f = this.focusables[this.focusIndex];
    if (f) f.activate();
  }

  toggleMove(o) {
    if (this.moveMode && this.moveTarget === o) { this.commitMove(); return; }
    this.moveMode = true;
    this.moveTarget = o;
    this.pip && this.pip.express('thinking');
    this.refreshFocus();
  }

  nudge(dx, dy) {
    if (!this.moveTarget) return;
    this.moveTarget.container.x += dx;
    this.moveTarget.container.y += dy;
    this.refreshFocus();
  }

  commitMove() {
    if (this.moveTarget) this.snapDecor(this.moveTarget.data, this.moveTarget.container);
    this.moveMode = false;
    this.moveTarget = null;
    this.pip && this.pip.express('idle');
    this._focusables = null; // positions changed
    this.refreshFocus();
  }

  refreshFocus() {
    // Keep button highlight states in sync.
    const f = this.focusables[this.focusIndex];
    [this.continueBtn, this.saveBtn].forEach((b) => b.draw(f && f.key && b === this.btnFor(f.key)));

    this.highlight.clear();
    if (!f) return;
    const x = (f.obj ? f.obj.container.x : f.x);
    const y = (f.obj ? f.obj.container.y : f.y);
    const color = this.moveMode ? 0x9be8a8 : 0xffd86b;
    this.highlight.lineStyle(4, color, 1);
    this.highlight.strokeRoundedRect(x - f.w / 2 - 6, y - f.h / 2 - 6, f.w + 12, f.h + 12, 10);
  }

  btnFor(key) {
    if (key === 'continue') return this.continueBtn;
    if (key === 'save') return this.saveBtn;
    return null;
  }
}
