// src/scenes/Act3.js — The Flower Fields.
//
// Visible click-to-match encounters (colour / shape / combined). Around the
// midpoint, a cinematic transforms Waldo from horse to unicorn. Bright, joyful.

import ActScene from './ActScene.js';
import SaveSystem from '../systems/SaveSystem.js';
import ProceduralGenerator from '../systems/ProceduralGenerator.js';
import ItemDB from '../systems/ItemDB.js';
import runPrizeReveal from '../ui/PrizeReveal.js';

const W = 1280;
const H = 720;

export default class Act3 extends ActScene {
  constructor() { super('Act3', 'act3'); this.transformed = false; }

  getMountForm() { return SaveSystem.get('progress.waldoForm') === 'unicorn' ? 'unicorn' : 'horse'; }
  getReplayLine() { return 'The flower fields! Waldo always loves this one.'; }

  buildScenery() {
    if (this.useBackdrop('fields_bg')) return; // real art present
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x6fc0f0, 0x6fc0f0, 0xbfe6f5, 0xd8f0c8, 1);
    sky.fillRect(0, 0, W, H);
    this.add.circle(1060, 110, 50, 0xfff3c4, 0.9).setDepth(1);

    this.makeTile('a3_clouds', 256, 160, (g) => { g.fillStyle(0xffffff, 0.6); for (let i = 0; i < 3; i++) g.fillEllipse(Math.random() * 256, Math.random() * 120, 80, 30); });
    this.makeTile('a3_hills', 256, 180, (g) => { g.fillStyle(0x8fce6f, 1); g.fillEllipse(128, 180, 320, 200); g.fillStyle(0xe88ec0, 0.8); for (let i = 0; i < 8; i++) g.fillCircle(Math.random() * 256, 80 + Math.random() * 80, 4); });
    this.makeTile('a3_field', 256, 200, (g) => { g.fillStyle(0x7fc25a, 1); g.fillRect(0, 0, 256, 200); ['e88ec0', 'f2c63f', '9b59b6'].forEach((hex) => { g.fillStyle(parseInt(hex, 16), 1); for (let i = 0; i < 8; i++) g.fillCircle(Math.random() * 256, Math.random() * 200, 5); }); });
    this.makeTile('a3_path', 256, 240, (g) => { g.fillStyle(0xcdb98a, 1); g.fillRect(0, 0, 256, 240); g.fillStyle(0xe88ec0, 0.6); for (let i = 0; i < 6; i++) g.fillCircle(Math.random() * 256, Math.random() * 240, 4); });
    this.makeTile('a3_fg', 256, 200, (g) => { ['4fae54', '7fc25a'].forEach((hex, k) => { g.fillStyle(parseInt(hex, 16), 1); for (let x = k * 30; x < 276; x += 60) g.fillRect(x, 40, 5, 120); }); });

    this.addLayer('a3_clouds', 30, 160, 0.10, 2);
    this.addLayer('a3_hills', 250, 180, 0.30, 3);
    this.addLayer('a3_field', 360, 200, 0.55, 4);
    this.addLayer('a3_path', 500, 240, 1.00, 10);
    this.addLayer('a3_fg', 540, 200, 1.60, 50);
  }

  getSequence() { return ProceduralGenerator.generateAct3Sequence(); }

  getCommentary() {
    return [
      'Smell that? Sunshine and a thousand flowers.',
      'The bunnies have been waiting for you, I think.',
      'Everything here leans toward you... have you noticed?',
      'Waldo walks taller in the light, does he not?',
      'I always feel braver among the flowers.'
    ];
  }

  getBeeTips() {
    return [
      { text: 'We bees match flowers by color to find the right honey — yellow flowers, yellow honey!' },
      { text: 'The shape of a flower tells us what kind it is — a star flower is always a star flower!' },
      { text: 'Two things can match at once — same color AND same shape. That is how we find our favorites!' }
    ];
  }

  teach(type) {
    const lines = {
      colorMatch: ['These butterflies lost their flowers!', 'Click a butterfly, then click the flower that is the same color.'],
      shapeMatch: ['Each gate needs its own key.', 'Click a key, then the keyhole of the very same shape.'],
      combinedMatch: ['Now we match TWO things at once...', 'The color AND the shape both have to be the same!']
    }[type] || [];
    return this.teachSequence(lines);
  }

  afterEncounter(record) {
    super.afterEncounter(record);
    // Don't replay the transformation if Waldo is already a unicorn (replays).
    if (SaveSystem.get('progress.waldoForm') === 'unicorn') this.transformed = true;
    if (!this.transformed && this.seqIndex >= 4) {
      this.transformed = true;
      this._interlude = this.transformWaldo();
    }
  }

  // The emotional peak — Waldo becomes a unicorn.
  transformWaldo() {
    return new Promise((resolve) => {
      this.awardPip('pre_waldo_transform'); // Glowing Feather Quill
      // Flowers burst.
      for (let i = 0; i < 30; i++) {
        const f = this.add.circle(Phaser.Math.Between(200, W - 200), Phaser.Math.Between(300, H - 120), Phaser.Math.Between(3, 7), Phaser.Utils.Array.GetRandom([0xe88ec0, 0xf2c63f, 0x9b59b6]), 0).setDepth(35);
        this.tweens.add({ targets: f, alpha: 1, y: f.y - 30, duration: 700, delay: i * 15, yoyo: true });
      }
      this.pip.express('excited');
      this.speak("Only a true princess's horse becomes a unicorn...", this.pip.x, this.pip.y - 80, 3000);

      this.time.delayedCall(1500, () => {
        const light = this.add.ellipse(this.waldo ? this.waldo.x + 64 : 440, 410, 20, 20, 0xfff2b0, 0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(60);
        this.tweens.add({ targets: light, scaleX: 14, scaleY: 14, alpha: 0, duration: 1100 });
        if (this.waldo) this.waldo.setForm('unicorn');
        SaveSystem.set('progress.waldoForm', 'unicorn');
        const burst = this.add.particles(this.waldo ? this.waldo.x : 440, 410, 'wandSpark', { speed: { min: 100, max: 320 }, scale: { start: 1.2, end: 0 }, lifespan: 1000, quantity: 50, tint: 0xffd86b, blendMode: 'ADD', emitting: false });
        burst.explode();
      });

      this.time.delayedCall(3200, () => {
        this.awardPip('waldo_transforms'); // Pip's Wing Cloak
        this.speak('I had a feeling.', this.pip.x, this.pip.y - 80, 2400);
        this.time.delayedCall(2600, resolve);
      });
    });
  }

  chapterEnd() {
    this.walking = false;
    // Castle appears on the horizon for the first time.
    const castle = this.add.graphics().setDepth(6);
    castle.fillStyle(0xb9a3d6, 0.9); castle.fillRect(W * 0.62, 250, 160, 90);
    castle.fillTriangle(W * 0.62, 250, W * 0.62 + 60, 250, W * 0.62 + 30, 200);
    castle.setAlpha(0);
    this.tweens.add({ targets: castle, alpha: 1, duration: 1500 });
    this.pip.express('excited');
    this.speak('There... do you see it? That is where we are going.', this.pip.x, this.pip.y - 80, 3200);

    this.time.delayedCall(3200, () => {
      const score = this.computeScore('act3');
      runPrizeReveal(this, { actKey: 'act3', pip: this.pip, performanceScore: score, prizePool: ItemDB.prizePool('fields') })
        .then(() => {
          SaveSystem.set('progress.act3Complete', true);
          if (window.showSaveFilePicker) SaveSystem.saveToDrive().catch(() => {});
          this.speak('Your adventure has been saved!', this.pip.x, this.pip.y - 80, 2000);
          this.time.delayedCall(2200, () => this.fadeToScene('Act4'));
        });
    });
  }
}
