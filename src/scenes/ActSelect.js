// src/scenes/ActSelect.js — "Revisit My Kingdom".
//
// Reached from the main menu after the coronation. Four illustrated act cards
// showing the best prize tier achieved, each with a Replay button. Replays use
// fresh procedural generation; teaching never re-triggers (intros stay true).

import SaveSystem from '../systems/SaveSystem.js';
import Cursor from '../ui/Cursor.js';
import Pip from '../characters/Pip.js';
import Waldo from '../characters/Waldo.js';

const W = 1280;
const H = 720;

const ACTS = [
  { key: 'act1', scene: 'Act1', name: 'The Dark Forest', color: 0x2f5a36 },
  { key: 'act2', scene: 'Act2', name: 'The Misty Swamp', color: 0x3f7d7a },
  { key: 'act3', scene: 'Act3', name: 'The Flower Fields', color: 0xe88ec0 },
  { key: 'act4', scene: 'Act4', name: 'The Starlight Castle', color: 0x6a4a9a }
];
const TIER_COLOR = { bronze: 0xc08457, silver: 0xd6dde6, gold: 0xffd24a };

export default class ActSelect extends Phaser.Scene {
  constructor() { super('ActSelect'); }

  create() {
    this.cameras.main.setBackgroundColor('#1a0f33');
    this.buildBackdrop();
    this.focus = 0;

    this.add.text(W / 2, 70, 'Revisit My Kingdom', {
      fontFamily: 'Georgia, serif', fontSize: '46px', color: '#ffe9a8', stroke: '#3a1f55', strokeThickness: 6
    }).setOrigin(0.5);

    this.buildCards();
    this.buildBack();

    this.wandCursor = new Cursor(this);
    this.pip = new Pip(this, 120, 620, { scale: 0.9 });

    this.setupKeyboard();
    this.refresh();
    this.cameras.main.fadeIn(400, 10, 6, 20);
  }

  buildBackdrop() {
    for (let i = 0; i < 80; i++) {
      this.add.circle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), Phaser.Math.FloatBetween(0.6, 1.8), 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
    }
    // Unicorn Waldo in the background.
    this.waldo = new Waldo(this, W - 180, 560, 'unicorn', { scale: 1.2 });
    this.waldo.setAlpha(0.85);
  }

  buildCards() {
    this.cardViews = [];
    const cardW = 260; const gap = 30; const total = ACTS.length * cardW + (ACTS.length - 1) * gap;
    const x0 = W / 2 - total / 2 + cardW / 2;
    const best = SaveSystem.get('bestTiers') || {};

    ACTS.forEach((act, i) => {
      const x = x0 + i * (cardW + gap);
      const c = this.add.container(x, 340);
      const bg = this.add.graphics();
      const art = this.add.graphics();
      art.fillStyle(act.color, 1); art.fillRoundedRect(-110, -110, 220, 150, 12);
      const name = this.add.text(0, 70, act.name, { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#fff6e0', align: 'center', wordWrap: { width: 220 } }).setOrigin(0.5);

      // Best-tier medal.
      const tier = best[act.key];
      const medal = this.add.graphics();
      if (tier) { medal.fillStyle(TIER_COLOR[tier], 1); medal.fillCircle(0, -40, 26); medal.lineStyle(3, 0xffffff, 0.7); medal.strokeCircle(0, -40, 26); }
      const medalTxt = this.add.text(0, -40, tier ? tier[0].toUpperCase() : '—', { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#2a1a10' }).setOrigin(0.5);

      const replay = this.add.text(0, 120, '▶ Replay', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#ffe9a8' }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 20, cardW, 280, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
      c.add([bg, art, name, medal, medalTxt, replay, hit]);
      hit.on('pointerover', () => { this.focus = i; this.refresh(); });
      hit.on('pointerdown', () => { this.focus = i; this.replayAct(); });
      this.cardViews.push({ bg, container: c });
    });
  }

  buildBack() {
    this.backBtn = this.add.container(120, 70);
    const g = this.add.graphics(); g.fillStyle(0x7b3fb5, 1); g.fillRoundedRect(-80, -24, 160, 48, 24); g.lineStyle(2, 0xffe9a8, 1); g.strokeRoundedRect(-80, -24, 160, 48, 24);
    const t = this.add.text(0, 0, '← Menu', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#fff6e0' }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 160, 48, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    this.backBtn.add([g, t, hit]);
    hit.on('pointerover', () => { this.focus = 4; this.refresh(); });
    hit.on('pointerdown', () => this.back());
  }

  refresh() {
    this.cardViews.forEach((v, i) => {
      const f = this.focus === i;
      v.bg.clear();
      v.bg.fillStyle(0x2a1646, 0.95); v.bg.fillRoundedRect(-130, -150, 260, 300, 16);
      v.bg.lineStyle(f ? 5 : 2, f ? 0xffe9a8 : 0x6a5a8a, 1); v.bg.strokeRoundedRect(-130, -150, 260, 300, 16);
      this.tweens.add({ targets: v.container, scale: f ? 1.05 : 1, duration: 120 });
    });
  }

  replayAct() {
    const act = ACTS[this.focus];
    this.wandCursor.setState('loading');
    this.input.keyboard.removeAllListeners();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(act.scene, { replay: true }));
  }

  back() {
    this.wandCursor.setState('loading');
    this.input.keyboard.removeAllListeners();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenu'));
  }

  setupKeyboard() {
    const kb = this.input.keyboard;
    kb.on('keydown-RIGHT', () => { this.focus = (this.focus + 1) % 5; this.refresh(); });
    kb.on('keydown-LEFT', () => { this.focus = (this.focus + 4) % 5; this.refresh(); });
    kb.on('keydown-ENTER', () => { if (this.focus === 4) this.back(); else this.replayAct(); });
    kb.on('keydown-SPACE', () => { if (this.focus === 4) this.back(); else this.replayAct(); });
    kb.on('keydown-ESC', () => this.back());
  }
}
