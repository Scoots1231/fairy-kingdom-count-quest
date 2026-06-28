// src/scenes/Act2.js — The Misty Swamp.
//
// Princess rides Waldo (horse). New encounter types: match color, find shape,
// colour pattern, sort, odd-one-out. Chapter end clears the mist and leads to
// Act 3 with a hint of Waldo's hooves glowing.

import ActScene from './ActScene.js';
import SaveSystem from '../systems/SaveSystem.js';
import ProceduralGenerator from '../systems/ProceduralGenerator.js';
import ItemDB from '../systems/ItemDB.js';
import runPrizeReveal from '../ui/PrizeReveal.js';

const W = 1280;
const H = 720;

export default class Act2 extends ActScene {
  constructor() { super('Act2', 'act2'); }

  getMountForm() { return 'horse'; }
  getReplayLine() { return 'The swamp again! The dragonflies will be pleased to see you.'; }

  buildScenery() {
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x2a2150, 0x2a2150, 0x2f4a52, 0x24403c, 1);
    sky.fillRect(0, 0, W, H);
    this.add.circle(1040, 130, 40, 0xe8e0f0, 0.5).setDepth(1);

    this.makeTile('a2_mist', 256, 200, (g) => { for (let i = 0; i < 6; i++) { g.fillStyle(0xbfe6e2, 0.10); g.fillEllipse(Math.random() * 256, Math.random() * 200, 160, 50); } });
    this.makeTile('a2_far', 256, 180, (g) => { g.fillStyle(0x1c3a36, 1); for (let x = 0; x < 256; x += 50) g.fillTriangle(x, 180, x + 50, 180, x + 25, 60 + Math.random() * 40); });
    this.makeTile('a2_water', 256, 200, (g) => { g.fillStyle(0x2f5a62, 1); g.fillRect(0, 0, 256, 200); g.fillStyle(0x4f9f8f, 0.8); for (let i = 0; i < 4; i++) g.fillEllipse(Math.random() * 256, Math.random() * 200, 40, 18); });
    this.makeTile('a2_path', 256, 240, (g) => { g.fillStyle(0x3a4a32, 1); g.fillRect(0, 0, 256, 240); g.fillStyle(0x6f8f4f, 0.7); for (let x = 0; x < 256; x += 30) g.fillRect(x, 20, 4, 40); });
    this.makeTile('a2_fg', 256, 200, (g) => { g.fillStyle(0x10261f, 1); for (let x = -10; x < 276; x += 60) { g.fillRect(x, 0, 4, 90); } });

    this.addLayer('a2_mist', 40, 200, 0.12, 2);
    this.addLayer('a2_far', 220, 180, 0.30, 3);
    this.addLayer('a2_water', 420, 200, 0.55, 4);
    this.addLayer('a2_path', 500, 240, 1.00, 10);
    this.addLayer('a2_fg', 540, 200, 1.60, 50);
  }

  getSequence() { return ProceduralGenerator.generateAct2Sequence(); }

  getCommentary() {
    return [
      'The mist plays tricks on the eyes... stay close.',
      'Dragonflies stitch the fog together, I always say.',
      'Waldo knows these wetlands better than he lets on.',
      'Listen — the frogs are singing us through.',
      'Careful of the still water... it remembers faces.'
    ];
  }

  getBeeTips() {
    return [
      { text: 'We bees see flowers by color to find the right nectar — colors are our map!' },
      { text: 'Honeycombs are all hexagons — same shape, every single one. Shapes have rules!' },
      { text: 'A red triangle is different from a blue triangle — two clues at once! Color AND shape!' }
    ];
  }

  teach(type) {
    const lines = {
      matchColor: ['See that dragonfly? What color is it?', 'Find the choice that is exactly the same color — they have to match!'],
      findShape: ['This one has three sides and three corners — a triangle!', 'Can you find another shape that looks just the same?'],
      colorPattern: ['See how these colors go? Red... blue... red... blue...', "There's a pattern! Work out the rule and you'll know what comes next."],
      sortItems: ['Each one belongs in its own basket.', 'Pop each into the basket that matches it!'],
      oddOneOut: ['Three of these belong together...', 'But one is different. Can you find the one that does not fit?']
    }[type] || [];
    return this.teachSequence(lines);
  }

  teachSequence(lines) {
    return new Promise((resolve) => {
      let i = 0;
      const next = () => { if (i >= lines.length) { resolve(); return; } this.speak(lines[i++], undefined, undefined, 2500); this.time.delayedCall(2700, next); };
      next();
    });
  }

  chapterEnd() {
    this.walking = false;
    const beam = this.add.rectangle(W * 0.7, 0, 120, H, 0xfff2c4, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(36).setAngle(8);
    this.tweens.add({ targets: beam, alpha: 0.4, duration: 1400 });
    this.pip.express('excited');
    this.speak('Do you see that? The swamp is letting us through...', this.pip.x, this.pip.y - 80, 3000);

    this.time.delayedCall(3000, () => {
      const score = this.computeScore('act2');
      runPrizeReveal(this, { actKey: 'act2', pip: this.pip, performanceScore: score, prizePool: ItemDB.prizePool('swamp') })
        .then(() => {
          this.awardPip('act2_end'); // The Searching Map
          SaveSystem.set('progress.act2Complete', true);
          if (window.showSaveFilePicker) SaveSystem.saveToDrive().catch(() => {});
          // Hint of the coming transformation: Waldo's hooves glow faintly.
          if (this.waldo) this.tweens.add({ targets: this.waldo, alpha: 0.85, duration: 400, yoyo: true, repeat: 2 });
          this.speak('Your adventure has been saved!', this.pip.x, this.pip.y - 80, 2000);
          this.time.delayedCall(2200, () => this.fadeToScene('Act3'));
        });
    });
  }

  computeScore(actKey) {
    const hist = SaveSystem.get(`performance.${actKey}History`) || [];
    let s = 100;
    hist.forEach((e) => { if (e.attempts > 1) s -= 8; if (e.hintsUsed === 1) s -= 5; else if (e.hintsUsed === 2) s -= 10; else if (e.hintsUsed === 3) s -= 15; });
    return Math.max(0, s);
  }

  fadeToScene(key) {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }
}
