// src/scenes/ActScene.js
//
// Reusable side-scrolling act base. Acts 1–4 extend this; each provides its own
// scenery, encounter sequence, commentary, bee tips, teaching and chapter-end.
//
// Core loop: walk (auto-scroll) -> reach encounter zone (scroll pauses) ->
// EncounterManager resolves -> scroll resumes -> ... -> chapter end.
// Scroll speed is constant and NEVER changes with performance.

import SaveSystem from '../systems/SaveSystem.js';
import Cursor from '../ui/Cursor.js';
import Pip from '../characters/Pip.js';
import PrincessPreview from '../characters/Princess.js';
import HintSystem from '../ui/HintSystem.js';
import EncounterManager from '../systems/EncounterManager.js';
import DifficultyScaler from '../systems/DifficultyScaler.js';
import PauseMenu from '../ui/PauseMenu.js';
import Waldo from '../characters/Waldo.js';
import PipCollection from '../systems/PipCollection.js';
import MusicManager from '../systems/MusicManager.js';
import AudioManager from '../systems/AudioManager.js';

const W = 1280;
const H = 720;
const WALK_MS = 2600;     // scroll time between encounters
const SCROLL_SPEED = 0.16; // px per ms (constant — never changes)

export default class ActScene extends Phaser.Scene {
  // Subclasses set this.actKey in their constructor via super-call args.
  constructor(key, actKey) {
    super(key);
    this.actKey = actKey || 'act1';
  }

  init(data) { this.replay = !!(data && data.replay); }

  // Subclasses override with their warm replay-variant line.
  getReplayLine() { return 'Back again! Shall we see how today treats us?'; }

  create() {
    if (!SaveSystem.hasSaveData()) SaveSystem.saveData = SaveSystem.createNewSave();
    AudioManager.loadVolumes(SaveSystem);

    this.paused = false;
    this.walking = false;
    this.parallaxLayers = [];

    this.buildScenery();      // subclass — fills this.parallaxLayers
    this.buildAmbient();
    this.buildActors();

    this.wandCursor = new Cursor(this);
    this.hintSystem = new HintSystem(this, this.pip);
    this.encounter = new EncounterManager(this, {
      actKey: this.actKey,
      pip: this.pip,
      hintSystem: this.hintSystem,
      onFirstPlay: (type, q, pres) => this.teach(type, q, pres)
    });

    // Fresh per-playthrough history (the end-of-act score reflects this run only).
    SaveSystem.set(`performance.${this.actKey}History`, []);

    this.sequence = this.getSequence();
    this.seqIndex = 0;
    this.beeTipsShown = 0;
    this.commentary = this.getCommentary().slice();
    this.applyAbsenceWarmup();

    MusicManager.playAct(this.actKey);

    this.pauseMenu = new PauseMenu(this);
    this.buildPauseButton();
    this.input.keyboard.on('keydown-ESC', () => this.pauseMenu.toggle());

    this.onCreated();
    if (this.replay) this.time.delayedCall(900, () => this.speak(this.getReplayLine(), this.pip.x, this.pip.y - 80, 3000));
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.time.delayedCall(700, () => this.walkSegment());
  }

  // ---- Hooks (subclass overrides) ----------------------------------------
  onCreated() {}
  buildScenery() {}
  getSequence() { return []; }
  getCommentary() { return []; }
  getBeeTips() { return []; }
  teach() { return Promise.resolve(); }
  chapterEnd() { this.gotoRoom(); }

  // Subclass overrides to ride Waldo: 'none' | 'horse' | 'unicorn'.
  getMountForm() { return 'none'; }

  // ---- Actors -------------------------------------------------------------
  buildActors() {
    const mount = this.getMountForm();
    const riding = mount !== 'none';
    const py = riding ? 392 : 430;

    if (riding) {
      this.waldo = new Waldo(this, 380, 470, mount, { scale: 1 });
      this.waldo.setDepth(38);
    }

    this.princess = new PrincessPreview(this, 380, py, { height: riding ? 240 : 280, static: true });
    this.princess.setCharacter(SaveSystem.get('character')).setOutfit(SaveSystem.get('currentOutfit')).redraw();
    this.princess.setDepth(40);
    this.walkBob = this.tweens.add({ targets: this.princess, y: py - 8, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.pip = new Pip(this, 560, 330, { scale: 0.9 });
    this.pip.setDepth(45);
  }

  // Award a Pip-collection milestone item with a brief toast.
  awardPip(milestone) {
    const item = PipCollection.award(milestone);
    if (item) this.speak(`Pip gives you: ${item.name}!`, this.pip.x, this.pip.y - 80, 2600);
    return item;
  }

  buildAmbient() {
    // Drifting fireflies (decorative).
    for (let i = 0; i < 12; i++) {
      const f = this.add.circle(Phaser.Math.Between(0, W), Phaser.Math.Between(120, H - 120), Phaser.Math.FloatBetween(1.5, 3), 0xfff2a8, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(30);
      this.tweens.add({ targets: f, x: f.x + Phaser.Math.Between(-60, 60), y: f.y + Phaser.Math.Between(-40, 40), alpha: 0.2, duration: Phaser.Math.Between(2000, 4000), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }
  }

  buildPauseButton() {
    const c = this.add.container(W - 50, 44).setDepth(1500);
    const g = this.add.graphics();
    g.fillStyle(0x1a0a2e, 0.6); g.fillCircle(0, 0, 26);
    g.lineStyle(2, 0xffe9a8, 0.8); g.strokeCircle(0, 0, 26);
    g.fillStyle(0xffe9a8, 1); g.fillCircle(4, 0, 14); g.fillStyle(0x1a0a2e, 0.6); g.fillCircle(9, -3, 12); // moon
    const hit = this.add.circle(0, 0, 26, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    c.add([g, hit]);
    hit.on('pointerover', () => this.wandCursor.setState('hover'));
    hit.on('pointerout', () => this.wandCursor.setState('idle'));
    hit.on('pointerdown', () => this.pauseMenu.toggle());
  }

  // ---- Scroll loop --------------------------------------------------------
  walkSegment() {
    if (this.seqIndex >= this.sequence.length) { this.beginChapterEnd(); return; }
    this.walking = true;
    this.pip.express('idle');

    // Mid-walk flavour: commentary or an occasional bee tip.
    this.time.delayedCall(1000, () => {
      if (this.paused) return;
      if (this.beeTipsShown < 2 && Math.random() < 0.4) this.showBeeTip();
      else this.sayCommentary();
    });

    this.time.delayedCall(WALK_MS, () => {
      if (this.paused) { this.time.delayedCall(400, () => this.resumeAfterPauseToEncounter()); return; }
      this.startEncounter();
    });
  }

  resumeAfterPauseToEncounter() { this.startEncounter(); }

  startEncounter() {
    this.walking = false; // scroll stops completely for the encounter
    if (MusicManager) MusicManager.duck(true);
    const spec = this.sequence[this.seqIndex];
    this.seqIndex += 1;
    this.encounter.run(spec).then((record) => {
      this.afterEncounter(record);
      if (MusicManager) MusicManager.duck(false);
      const cont = () => this.time.delayedCall(300, () => this.walkSegment());
      // A subclass may set this._interlude (a Promise) to play a mid-act
      // cinematic before the scroll resumes (e.g. Waldo's transformation).
      if (this._interlude) { const p = this._interlude; this._interlude = null; Promise.resolve(p).then(cont); }
      else cont();
    });
  }

  // Generate a tiling texture once (used for parallax layers).
  makeTile(key, w, h, drawFn) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    drawFn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Register a tilesprite parallax layer.
  addLayer(key, y, h, factor, depth) {
    const ts = this.add.tileSprite(0, y, W, h, key).setOrigin(0, 0).setDepth(depth);
    this.parallaxLayers.push({ ts, factor });
    return ts;
  }

  // Hook after each encounter resolves (record = performance record).
  afterEncounter(record) {
    // First-ever perfect answer -> Pip's Spectacles.
    if (record && record.attempts === 1 && record.hintsUsed === 0) this.awardPip('first_perfect');
    // Post-transformation Waldo celebrates correct answers with a horn glow.
    if (this.waldo && this.waldo.form === 'unicorn') this.waldo.glowPulse();
  }

  sayCommentary() {
    if (this.commentary.length === 0) return;
    const idx = Phaser.Math.Between(0, this.commentary.length - 1);
    const line = this.commentary.splice(idx, 1)[0]; // no repeats per session
    this.speak(line);
  }

  // ---- Bee tips -----------------------------------------------------------
  showBeeTip() {
    const tips = this.getBeeTips();
    if (this.beeTipsShown >= 2 || tips.length === 0) return;
    const tip = tips[this.beeTipsShown % tips.length];
    this.beeTipsShown += 1;

    const bee = this.add.container(-40, 200).setDepth(60);
    const g = this.add.graphics();
    g.fillStyle(0xffcf3f, 1); g.fillEllipse(0, 0, 26, 18);
    g.fillStyle(0x2a2018, 1); g.fillRect(-6, -9, 4, 18); g.fillRect(2, -9, 4, 18);
    g.fillStyle(0xeaf4ff, 0.7); g.fillEllipse(-8, -10, 14, 10); g.fillEllipse(8, -10, 14, 10);
    g.lineStyle(2, 0xffffff, 0.9); g.strokeCircle(-5, -2, 4); g.strokeCircle(5, -2, 4); // spectacles
    bee.add(g);

    this.tweens.add({
      targets: bee, x: 360, y: 240, duration: 1400, ease: 'Sine.easeOut',
      onComplete: () => {
        this.speak(tip.text, bee.x, bee.y - 70, 5200);
        this.time.delayedCall(5200, () => {
          this.tweens.add({ targets: bee, x: W + 60, y: 160, duration: 1600, onComplete: () => bee.destroy() });
        });
      }
    });
  }

  // ---- Speech bubble ------------------------------------------------------
  speak(text, x, y, holdMs = 3200) {
    if (this._bubble) this._bubble.destroy();
    const bx = x != null ? x : this.pip.x;
    const by = y != null ? y : this.pip.y - 80;
    const c = this.add.container(Phaser.Math.Clamp(bx, 220, 1060), Phaser.Math.Clamp(by, 60, 640)).setDepth(1200);
    const t = this.add.text(0, 0, text, { fontFamily: 'Georgia, serif', fontSize: '19px', color: '#3a1f55', align: 'center', wordWrap: { width: 340 } }).setOrigin(0.5);
    const b = t.getBounds();
    const bg = this.add.graphics();
    bg.fillStyle(0xfff6e0, 0.96); bg.fillRoundedRect(-b.width / 2 - 16, -b.height / 2 - 12, b.width + 32, b.height + 24, 14);
    bg.lineStyle(3, 0xffd86b, 1); bg.strokeRoundedRect(-b.width / 2 - 16, -b.height / 2 - 12, b.width + 32, b.height + 24, 14);
    c.add([bg, t]);
    this._bubble = c;
    this.pip.express('idle');
    this.pip.say('pip_thinking');
    this.time.delayedCall(holdMs, () => { if (this._bubble === c) { c.destroy(); this._bubble = null; } });
  }

  // ---- Difficulty warm-up -------------------------------------------------
  applyAbsenceWarmup() {
    const perf = SaveSystem.get('performance') || {};
    if (!perf.lastSession) return;
    const days = (Date.now() - new Date(perf.lastSession).getTime()) / 86400000;
    if (days > 14) DifficultyScaler.applyAbsenceWarmup(this.actKey);
  }

  // ---- Shared helpers for subclasses -------------------------------------
  teachSequence(lines) {
    return new Promise((resolve) => {
      let i = 0;
      const next = () => { if (i >= lines.length) { resolve(); return; } this.speak(lines[i++], undefined, undefined, 2500); this.time.delayedCall(2700, next); };
      next();
    });
  }

  computeScore(actKey) {
    const hist = SaveSystem.get(`performance.${actKey || this.actKey}History`) || [];
    let s = 100;
    hist.forEach((e) => { if (e.attempts > 1) s -= 8; if (e.hintsUsed === 1) s -= 5; else if (e.hintsUsed === 2) s -= 10; else if (e.hintsUsed === 3) s -= 15; });
    return Math.max(0, s);
  }

  fadeToScene(key) {
    if (this.wandCursor) this.wandCursor.setState('loading');
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  // ---- Chapter end --------------------------------------------------------
  beginChapterEnd() {
    this.walking = false;
    this.chapterEnd();
  }

  gotoRoom() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('PrincessRoom'));
  }

  // ---- Scroll update ------------------------------------------------------
  update(time, delta) {
    if (this.paused || !this.walking) return;
    const dx = SCROLL_SPEED * delta;
    this.parallaxLayers.forEach((layer) => { layer.ts.tilePositionX += layer.factor * dx; });

    // Post-transformation: Waldo's glowing hooves leave fading flower blooms.
    if (this.waldo && this.waldo.form === 'unicorn') {
      this._bloomAcc = (this._bloomAcc || 0) + delta;
      if (this._bloomAcc > 550) {
        this._bloomAcc = 0;
        const bx = this.waldo.x + Phaser.Math.Between(-40, 30);
        const bloom = this.add.circle(bx, 600, 5, Phaser.Utils.Array.GetRandom([0xe88ec0, 0xf2c63f, 0x9b59b6]), 0.9).setDepth(36);
        this.tweens.add({ targets: bloom, scale: 1.8, alpha: 0, duration: 2000, onComplete: () => bloom.destroy() });
      }
    }
  }
}
