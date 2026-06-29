// src/scenes/Act1.js — The Dark Forest.
//
// First playable act. Extends ActScene (scroll engine + encounter loop) and
// supplies forest scenery, the encounter sequence, Pip commentary, bee tips,
// first-playthrough teaching, and the chapter-end (Waldo appears + prize).

import ActScene from './ActScene.js';
import SaveSystem from '../systems/SaveSystem.js';
import ProceduralGenerator from '../systems/ProceduralGenerator.js';
import ItemDB from '../systems/ItemDB.js';
import runPrizeReveal from '../ui/PrizeReveal.js';

const W = 1280;
const H = 720;

export default class Act1 extends ActScene {
  constructor() { super('Act1', 'act1'); }

  onCreated() { this.awardPip('act1_start'); } // Pip's Lantern
  getReplayLine() { return 'Back to the forest! I wonder what puzzles the trees have for us this time.'; }

  // ---- Scenery (parallax tile layers, placeholder art) -------------------
  buildScenery() {
    if (this.useBackdrop('forest_bg')) return; // real art present
    // Static sky gradient.
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x162447, 0x1c2e1a, 1);
    sky.fillRect(0, 0, W, H);
    // Moon.
    this.add.circle(1050, 120, 46, 0xf3eecf, 0.9).setDepth(1);

    this.makeTile('a1_stars', 256, 320, (g) => {
      for (let i = 0; i < 40; i++) g.fillStyle(0xffffff, Math.random() * 0.7 + 0.3), g.fillCircle(Math.random() * 256, Math.random() * 320, Math.random() * 1.6 + 0.4);
    });
    this.makeTile('a1_far', 256, 180, (g) => {
      g.fillStyle(0x0d1f12, 1);
      for (let x = 0; x < 256; x += 40) g.fillTriangle(x, 180, x + 40, 180, x + 20, 40 + Math.random() * 40);
    });
    this.makeTile('a1_mid', 256, 320, (g) => {
      g.fillStyle(0x102a17, 1);
      g.fillRect(40, 60, 26, 260); g.fillRect(160, 30, 30, 290); // twisted trunks
      g.fillStyle(0xd14b4b, 1); g.fillEllipse(60, 300, 24, 16); g.fillEllipse(180, 310, 20, 14); // glowing mushrooms
      g.fillStyle(0xffa0a0, 0.6); g.fillCircle(60, 296, 3);
    });
    this.makeTile('a1_path', 256, 240, (g) => {
      g.fillStyle(0x223018, 1); g.fillRect(0, 0, 256, 240);
      g.fillStyle(0x2e3f20, 1); for (let x = 0; x < 256; x += 36) g.fillEllipse(x, 30, 30, 12);
      g.fillStyle(0x6fae5a, 0.5); for (let i = 0; i < 6; i++) g.fillCircle(Math.random() * 256, Math.random() * 240, 3);
    });
    this.makeTile('a1_fg', 256, 200, (g) => {
      g.fillStyle(0x06120a, 1);
      for (let x = -20; x < 276; x += 120) g.fillTriangle(x, 200, x + 80, 200, x + 40, 40 + Math.random() * 30);
    });

    // Tile sprites + parallax factors (registered for the base scroll loop).
    const add = (key, y, h, factor, depth) => {
      const ts = this.add.tileSprite(0, y, W, h, key).setOrigin(0, 0).setDepth(depth);
      this.parallaxLayers.push({ ts, factor });
      return ts;
    };
    add('a1_stars', 0, 320, 0.10, 2);
    add('a1_far', 230, 180, 0.30, 3);
    add('a1_mid', 200, 320, 0.60, 5);
    add('a1_path', 500, 240, 1.00, 10);
    add('a1_fg', 540, 200, 1.60, 50);
  }

  makeTile(key, w, h, drawFn) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    drawFn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ---- Content ------------------------------------------------------------
  getSequence() { return ProceduralGenerator.generateAct1Sequence(); }

  getCommentary() {
    return [
      'These mushrooms are rather extraordinary, are they not?',
      "I've always found fireflies remarkable navigators.",
      'The forest is very old... it remembers things.',
      "We're making good progress. I think.",
      'Curious... the fireflies seem to know you.'
    ];
  }

  getBeeTips() {
    return [
      { text: 'Oh hello! Bees count our honey jars every morning. I use my legs — you can use your fingers! One finger for each thing you count!' },
      { text: 'Bees always know which flower patch has MORE nectar — the bigger group means more! Four flowers and seven... seven is more!' },
      { text: "Numbers are like little drawings! A three always looks like a three — once you know its shape, you'll always recognize it!" }
    ];
  }

  // ---- First-playthrough teaching ----------------------------------------
  teach(type, q) {
    const name = SaveSystem.get('playerName') || 'Princess';
    const sessions = SaveSystem.get('performance.sessionCount') || 1;

    // After 3+ sessions Pip trusts her completely — no teaching at all.
    if (sessions > 3) return Promise.resolve();

    let lines;
    if (type === 'countObjects') {
      lines = [
        `Now ${name}, the trees have set little puzzles for us. Let me show you how they work!`,
        'Watch me! One... two... three! We count each one and make sure we do not miss any!',
        'Now you try! Click each one and count along with me!'
      ];
    } else if (type === 'pickNumber') {
      lines = [
        'See that number on the gate? We need to find the same number down here.',
        'Look for the one that looks just like it — they have to match exactly!'
      ];
    } else {
      lines = [
        'This side has some... and that side has some. Let us count both!',
        'So which side had more? Point to it and click!'
      ];
    }
    return this.teachSequence(lines);
  }

  teachSequence(lines) {
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (i >= lines.length) { resolve(); return; }
        this.speak(lines[i++], undefined, undefined, 2500);
        this.time.delayedCall(2700, next);
      };
      next();
    });
  }

  // ---- Chapter end: Waldo appears, then the prize ------------------------
  chapterEnd() {
    this.walking = false;
    const name = SaveSystem.get('playerName') || 'Princess';

    // Warm glow ahead.
    const glow = this.add.ellipse(W + 100, 430, 300, 300, 0xffd98a, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(35);
    this.tweens.add({ targets: glow, x: 980, alpha: 0.5, duration: 1200 });
    this.pip.express('excited');

    this.time.delayedCall(1200, () => {
      // Waldo (horse) emerges from the treeline.
      const waldo = this.add.container(W + 120, 470).setDepth(38);
      const wg = this.add.graphics();
      wg.fillStyle(0x8a5a2a, 1); wg.fillEllipse(0, 0, 110, 56); wg.fillCircle(50, -20, 22);
      wg.fillRect(-36, 24, 10, 34); wg.fillRect(28, 24, 10, 34);
      wg.fillStyle(0x5a3a1a, 1); wg.fillRect(50, -44, 6, 20); // ear
      waldo.add(wg);
      this.tweens.add({ targets: waldo, x: 760, duration: 1600, ease: 'Sine.easeOut', onComplete: () => {
        this.speak('Oh my... I had wondered if he would come. He has been waiting, you know. Horses are remarkably patient creatures.', this.pip.x, this.pip.y - 80, 3600);
        this.tweens.add({ targets: waldo, x: 720, duration: 500, yoyo: true, delay: 800 }); // nuzzle
        SaveSystem.set('progress.waldoForm', 'horse');
        this.awardPip('waldo_appears'); // Pip's Satchel Bag
        this.time.delayedCall(3800, () => this.runReward());
      } });
    });
  }

  runReward() {
    const score = (function () {
      // Compute from this run's history.
      const hist = SaveSystem.get('performance.act1History') || [];
      let s = 100;
      hist.forEach((e) => {
        if (e.attempts > 1) s -= 8;
        if (e.hintsUsed === 1) s -= 5; else if (e.hintsUsed === 2) s -= 10; else if (e.hintsUsed === 3) s -= 15;
      });
      return Math.max(0, s);
    })();

    runPrizeReveal(this, { actKey: 'act1', pip: this.pip, performanceScore: score, prizePool: ItemDB.prizePool('forest') })
      .then(() => this.finishAct());
  }

  finishAct() {
    SaveSystem.set('progress.act1Complete', true);
    SaveSystem.set('progress.waldoForm', 'horse');
    this.awardPip('act1_end'); // Fairy Wing Hairclip

    this.pip.express('excited');
    this.speak('Your adventure has been saved!', this.pip.x, this.pip.y - 80, 2200);

    // Auto-save to the thumb drive — fire-and-forget so navigation NEVER blocks
    // on the file picker (a cancel or an unresponsive dialog can't strand her).
    if (window.showSaveFilePicker) { SaveSystem.saveToDrive().catch(() => {}); }

    this.time.delayedCall(2200, () => this.gotoRoom());
  }
}
