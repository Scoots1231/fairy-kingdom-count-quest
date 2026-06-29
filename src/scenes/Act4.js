// src/scenes/Act4.js — The Starlight Castle.
//
// Three phases (gardens / halls / staircase = 12 encounters) drawing from ALL
// previously mastered encounter types. Ends with the coronation: crown unlocks,
// the kingdom is hers.

import ActScene from './ActScene.js';
import SaveSystem from '../systems/SaveSystem.js';
import ProceduralGenerator from '../systems/ProceduralGenerator.js';
import ItemDB from '../systems/ItemDB.js';
import MusicManager from '../systems/MusicManager.js';
import runPrizeReveal from '../ui/PrizeReveal.js';

const W = 1280;
const H = 720;

export default class Act4 extends ActScene {
  constructor() { super('Act4', 'act4'); }

  getMountForm() { return 'unicorn'; }
  getReplayLine() { return `Back to the castle! Your kingdom awaits, Princess ${SaveSystem.get('playerName') || ''}.`; }

  onCreated() { this.showBanner('Castle Approach'); }

  buildScenery() {
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x241a4a, 0x241a4a, 0x4a2f6b, 0x6b4a8a, 1);
    sky.fillRect(0, 0, W, H);

    this.makeTile('a4_stars', 256, 320, (g) => { for (let i = 0; i < 40; i++) { g.fillStyle(0xffffff, Math.random() * 0.7 + 0.3); g.fillCircle(Math.random() * 256, Math.random() * 320, Math.random() * 1.6 + 0.4); } });
    this.makeTile('a4_castle', 256, 260, (g) => { g.fillStyle(0x3a2c5a, 1); g.fillRect(20, 60, 80, 200); g.fillRect(150, 40, 80, 220); g.fillStyle(0xffd98a, 0.8); for (let y = 90; y < 240; y += 50) { g.fillRect(50, y, 12, 18); g.fillRect(180, y, 12, 18); } });
    this.makeTile('a4_hedge', 256, 160, (g) => { g.fillStyle(0x2f5a36, 1); for (let x = 0; x < 256; x += 60) g.fillEllipse(x, 100, 70, 90); g.fillStyle(0xe88ec0, 0.7); for (let i = 0; i < 6; i++) g.fillCircle(Math.random() * 256, 60 + Math.random() * 60, 4); });
    this.makeTile('a4_path', 256, 240, (g) => { g.fillStyle(0x6a5a7a, 1); g.fillRect(0, 0, 256, 240); g.fillStyle(0x8a7a9a, 1); for (let x = 0; x < 256; x += 40) g.fillRect(x, 0, 3, 240); });
    this.makeTile('a4_fg', 256, 200, (g) => { g.fillStyle(0x1a1030, 1); for (let x = 0; x < 276; x += 90) g.fillRect(x, 0, 16, 200); });

    this.addLayer('a4_stars', 0, 320, 0.10, 2);
    this.addLayer('a4_castle', 120, 260, 0.25, 3);
    this.addLayer('a4_hedge', 380, 160, 0.55, 4);
    this.addLayer('a4_path', 500, 240, 1.00, 10);
    this.addLayer('a4_fg', 560, 200, 1.60, 50);
  }

  getSequence() { return ProceduralGenerator.generateAct4Sequence(); }

  getCommentary() {
    return [
      "We're almost there... I can feel it!",
      'Everything here feels like it belongs to you...',
      'The armor bows as you pass — did you see?',
      'Just a little further now, my friend.',
      'Listen to how quiet it is. The castle is holding its breath.'
    ];
  }
  getBeeTips() { return []; }

  showBanner(text) {
    const c = this.add.container(W / 2, 130).setDepth(1400);
    const g = this.add.graphics();
    g.fillStyle(0x1a0a2e, 0.7); g.fillRoundedRect(-220, -34, 440, 68, 16);
    g.lineStyle(2, 0xffe9a8, 1); g.strokeRoundedRect(-220, -34, 440, 68, 16);
    const t = this.add.text(0, 0, text, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffe9a8' }).setOrigin(0.5);
    c.add([g, t]); c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 500, yoyo: true, hold: 1800, onComplete: () => c.destroy() });
  }

  afterEncounter(record) {
    super.afterEncounter(record);
    if (this.seqIndex === 4) { this.showBanner('Inside the Castle'); this.awardPip('castle_gates'); } // Kingdom Crest
    if (this.seqIndex === 8) {
      this.showBanner('The Royal Staircase');
      // Waldo waits below — she climbs alone with Pip.
      if (this.waldo) this.tweens.add({ targets: this.waldo, alpha: 0, duration: 600, onComplete: () => this.waldo.setVisible(false) });
    }
  }

  chapterEnd() {
    this.walking = false;
    MusicManager.swell();
    this.runCoronation();
  }

  runCoronation() {
    const name = SaveSystem.get('playerName') || 'Princess';
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x0a0614, 0).setDepth(5000);
    this.tweens.add({ targets: shade, fillAlpha: 0.6, duration: 1000 });
    this.pip.express('tearful');

    const beats = [
      'I have been keeping a secret...',
      'I found you sleeping in that forest because I was looking for you. Everyone was.',
      'You are the lost Princess of the Starlight Kingdom. You always were.',
      'The meadow knew. The swamp knew. The flowers knew. Waldo knew.',
      'I knew the moment I saw you.'
    ];
    let t = 600;
    beats.forEach((line) => { this.time.delayedCall(t, () => this.speak(line, W / 2, 220, 2600)); t += 2900; });

    this.time.delayedCall(t, () => {
      // Crown floats down.
      const crown = this.add.container(W / 2, -60).setDepth(5100);
      const cg = this.add.graphics();
      cg.fillStyle(0xffd86b, 1); cg.fillRect(-40, 0, 80, 16);
      cg.fillTriangle(-40, 0, -16, 0, -28, -26); cg.fillTriangle(-12, 0, 12, 0, 0, -32); cg.fillTriangle(16, 0, 40, 0, 28, -26);
      crown.add(cg);
      this.tweens.add({ targets: crown, y: 300, duration: 1600, ease: 'Sine.easeInOut' });
      const burst = this.add.particles(W / 2, 300, 'wandSpark', { speed: { min: 80, max: 280 }, scale: { start: 1, end: 0 }, lifespan: 1200, quantity: 60, tint: 0xffd86b, blendMode: 'ADD', emitting: false });
      this.time.delayedCall(1600, () => burst.explode());

      SaveSystem.set('progress.act4Complete', true);
      SaveSystem.set('progress.crownUnlocked', true);
      SaveSystem.set('progress.storyComplete', true); // enables Revisit My Kingdom

      this.time.delayedCall(2000, () => {
        this.pip.express('bow'); // Pip bows to the new Princess
        this.speak(`Welcome home, Princess ${name}.`, W / 2, 220, 3000);
        this.time.delayedCall(3200, () => this.runGrandPrize());
      });
    });
  }

  runGrandPrize() {
    MusicManager.stinger('coronation');
    const score = this.computeScore('act4');
    runPrizeReveal(this, { actKey: 'act4', pip: this.pip, performanceScore: score, prizePool: ItemDB.prizePool('castle') })
      .then(() => {
        this.awardPip('coronation');     // Pip's Bow Tie
        this.awardPip('game_complete');  // The Portrait of Two
        if (window.showSaveFilePicker) SaveSystem.saveToDrive().catch(() => {});
        this.speak('Your adventure has been saved!', W / 2, 220, 2200);
        this.time.delayedCall(2400, () => this.fadeToScene('PrincessRoom'));
      });
  }
}
