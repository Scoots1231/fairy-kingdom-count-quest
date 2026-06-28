// src/systems/EncounterManager.js
//
// The reusable encounter lifecycle. Every act uses this same framework.
//
// run(spec) returns a Promise that resolves with the performance record once the
// encounter is resolved (always eventually correct — tier-3 guides her there).
// Performance is recorded to SaveSystem after EVERY encounter, and the difficulty
// scaler is updated, before the Promise resolves.

import SaveSystem from './SaveSystem.js';
import ProceduralGenerator from './ProceduralGenerator.js';
import DifficultyScaler from './DifficultyScaler.js';
import AnswerChoices from '../ui/AnswerChoices.js';

const W = 1280;
const H = 720;

// ---- Forest object drawing (placeholder art) -------------------------------
export function drawForestObject(scene, parent, type, x, y, scale = 1) {
  const g = scene.add.graphics();
  const s = scale;
  switch (type) {
    case 'firefly':
      g.fillStyle(0xfff2a8, 1); g.fillCircle(x, y, 10 * s);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(x, y, 4 * s);
      break;
    case 'mushroom':
      g.fillStyle(0xf0e6d0, 1); g.fillRect(x - 4 * s, y, 8 * s, 16 * s);
      g.fillStyle(0xd14b4b, 1); g.fillEllipse(x, y, 30 * s, 20 * s);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 6 * s, y - 2 * s, 2.5 * s); g.fillCircle(x + 5 * s, y, 2 * s);
      break;
    case 'stone':
      g.fillStyle(0x8fa6c0, 1); g.fillEllipse(x, y, 30 * s, 22 * s);
      g.fillStyle(0xbcd0e6, 0.6); g.fillEllipse(x - 4 * s, y - 4 * s, 12 * s, 8 * s);
      break;
    case 'flower':
      g.fillStyle(0xff8fc8, 1);
      for (let a = 0; a < 5; a++) { const ang = (a / 5) * Math.PI * 2; g.fillCircle(x + Math.cos(ang) * 10 * s, y + Math.sin(ang) * 10 * s, 7 * s); }
      g.fillStyle(0xffe066, 1); g.fillCircle(x, y, 6 * s);
      break;
    case 'leaf':
    default:
      g.fillStyle(0x6fae5a, 1); g.fillEllipse(x, y, 26 * s, 16 * s);
      g.lineStyle(2 * s, 0x3f7e3a, 1); g.lineBetween(x - 12 * s, y, x + 12 * s, y);
      break;
  }
  parent.add(g);
  return g;
}

export default class EncounterManager {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.actKey = opts.actKey || 'act1';
    this.pip = opts.pip;
    this.hintSystem = opts.hintSystem;
    this.onFirstPlay = opts.onFirstPlay; // (type, question, presentation) => Promise
    this.lastCorrectIndex = null;        // for "never same position twice"
  }

  run(spec) {
    const q = ProceduralGenerator.generate(spec.type, spec.difficulty);
    this.q = q;

    // Dim the world behind the encounter.
    this.overlay = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x0a0614, 0.55).setDepth(2000).setInteractive();

    const prompt = this.promptFor(q);
    this.title = this.scene.add.text(W / 2, 110, prompt, {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: '#ffe9a8', align: 'center',
      stroke: '#1a0a2e', strokeThickness: 4
    }).setOrigin(0.5).setDepth(2200);

    const presentation = this.buildPresentation(q);
    this.presentation = presentation;

    return new Promise((resolve) => {
      const startAnswering = () => {
        // Mark this type introduced (teaching has now happened if it was needed).
        SaveSystem.set(`encounterIntroductions.${spec.type}`, true);
        this.beginAnswerLoop(q, presentation, resolve);
      };

      const needsTeaching = !SaveSystem.get(`encounterIntroductions.${spec.type}`);
      if (needsTeaching && this.onFirstPlay) {
        Promise.resolve(this.onFirstPlay(spec.type, q, presentation)).then(startAnswering);
      } else {
        startAnswering();
      }
    });
  }

  beginAnswerLoop(q, presentation, resolve) {
    let wrongCount = 0;
    let guided = false;
    let resolved = false;

    const choices = new AnswerChoices(this.scene, {
      x: W / 2,
      y: presentation.choicesY,
      items: presentation.choiceItems,
      correctValue: q.answer,
      avoidIndex: this.lastCorrectIndex,
      onSelect: (value) => handle(value)
    });
    this.choices = choices;

    const getCorrectObject = () => choices.getButtonForValue(q.answer);

    const handle = (value) => {
      if (resolved) return;
      if (value === q.answer) {
        resolved = true;
        choices.setEnabled(false);
        choices.flashCorrect();
        if (this.scene.wandCursor) this.scene.wandCursor.setState('correct');
        if (guided && this.hintSystem) this.hintSystem.celebrateGuided();
        else if (this.pip) this.pip.react('correct');

        const attempts = wrongCount + 1;
        const hintsUsed = Math.min(wrongCount, 3);
        const record = { type: q.type, correct: true, attempts, hintsUsed, timestamp: Date.now() };
        this.recordPerformance(record);

        this.scene.time.delayedCall(900, () => { this.cleanup(); resolve(record); });
      } else {
        wrongCount += 1;
        const tier = Math.min(wrongCount, 3);
        if (this.hintSystem) {
          this.hintSystem.showHint(tier, { type: q.type, question: q, getCorrectObject });
        }
        if (tier >= 3) guided = true; // correct now highlighted; she still clicks it
      }
    };
  }

  recordPerformance(record) {
    const key = `performance.${this.actKey}History`;
    const hist = SaveSystem.get(key) || [];
    hist.push(record);
    SaveSystem.set(key, hist);
    // Silent difficulty adjustment.
    DifficultyScaler.recordEncounter(this.actKey, { attempts: record.attempts, hintsUsed: record.hintsUsed });
    // Remember correct position so the next encounter avoids it.
    if (this.choices) this.lastCorrectIndex = this.choices.correctIndex;
  }

  // ---- Prompts ------------------------------------------------------------
  promptFor(q) {
    if (q.type === 'countObjects') return `How many ${q.objectType}s do you see?`;
    if (q.type === 'pickNumber') return 'The gate needs its number. Which stone matches?';
    return 'Which side has more?';
  }

  // ---- Presentations ------------------------------------------------------
  buildPresentation(q) {
    if (q.type === 'countObjects') return this.presentCount(q);
    if (q.type === 'pickNumber') return this.presentPickNumber(q);
    return this.presentWhichMore(q);
  }

  presentCount(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    // A clearing card with the objects laid out.
    const card = this.scene.add.graphics();
    card.fillStyle(0x16301c, 0.9); card.fillRoundedRect(W / 2 - 320, 200, 640, 200, 24);
    card.lineStyle(3, 0x4f8f3f, 1); card.strokeRoundedRect(W / 2 - 320, 200, 640, 200, 24);
    container.add(card);

    const objects = [];
    const cols = Math.min(q.count, 5);
    const rows = Math.ceil(q.count / 5);
    const x0 = W / 2 - ((cols - 1) * 90) / 2;
    const y0 = 300 - ((rows - 1) * 70) / 2;
    let lit = 0;
    for (let i = 0; i < q.count; i++) {
      const col = i % 5; const row = Math.floor(i / 5);
      const ox = x0 + col * 90; const oy = y0 + row * 70;
      const objContainer = this.scene.add.container(0, 0);
      const art = drawForestObject(this.scene, objContainer, q.objectType, ox, oy, 1.2);
      container.add(objContainer);
      const hit = this.scene.add.circle(ox, oy, 26, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
      container.add(hit);
      art.setAlpha(0.7);
      hit.on('pointerdown', () => {
        art.setAlpha(1);
        this.scene.tweens.add({ targets: art, scaleX: 1.2, scaleY: 1.2, duration: 120, yoyo: true });
        if (this.scene.wandCursor) this.scene.wandCursor.setState('click');
        lit += 1;
      });
      objects.push({ art, x: ox, y: oy });
    }

    // Number-stone choices.
    const choiceItems = q.choices.map((n) => ({ value: n, render: (s, a) => this.renderNumberStone(s, a, n) }));
    return { container, objects, choiceItems, choicesY: 540, lightUp: (i) => { if (objects[i]) objects[i].art.setAlpha(1); } };
  }

  presentPickNumber(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    // Mossy gate with the target number carved on it.
    const gate = this.scene.add.graphics();
    gate.fillStyle(0x3a4a3a, 1); gate.fillRoundedRect(W / 2 - 110, 200, 220, 220, 18);
    gate.fillStyle(0x223022, 1); gate.fillRoundedRect(W / 2 - 80, 230, 160, 160, 12);
    container.add(gate);
    const carved = this.scene.add.text(W / 2, 310, `${q.target}`, {
      fontFamily: 'Georgia, serif', fontSize: '120px', color: '#bfe6bf', fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(carved);
    this.gateCarved = carved;

    const choiceItems = q.choices.map((n) => ({ value: n, render: (s, a) => this.renderNumberStone(s, a, n) }));
    return { container, choiceItems, choicesY: 560 };
  }

  presentWhichMore(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    // The two groups ARE the choices — large side panels.
    const makeGroupRender = (count) => (s, a) => {
      const panel = s.add.graphics();
      panel.fillStyle(0x16301c, 0.9); panel.fillRoundedRect(-66, -66, 132, 132, 14);
      a.add(panel);
      for (let i = 0; i < count; i++) {
        const col = i % 3; const row = Math.floor(i / 3);
        const ox = -34 + col * 34; const oy = -34 + row * 30;
        drawForestObject(s, a, q.objectType, ox, oy, 0.7);
      }
    };
    const choiceItems = [
      { value: 'left', render: makeGroupRender(q.groupA) },
      { value: 'right', render: makeGroupRender(q.groupB) }
    ];
    return { container, choiceItems, choicesY: 380 };
  }

  renderNumberStone(scene, art, n) {
    const g = scene.add.graphics();
    g.fillStyle(0x6a7f99, 1); g.fillEllipse(0, 0, 110, 96);
    g.fillStyle(0x8fa6c0, 0.7); g.fillEllipse(-12, -14, 40, 26);
    art.add(g);
    art.add(scene.add.text(0, 0, `${n}`, {
      fontFamily: 'Georgia, serif', fontSize: '64px', color: '#1a2438', fontStyle: 'bold'
    }).setOrigin(0.5));
  }

  cleanup() {
    if (this.choices) this.choices.destroy();
    if (this.hintSystem) { this.hintSystem.clearBubble(); this.hintSystem.clearGlow(); }
    if (this.presentation && this.presentation.container) this.presentation.container.destroy();
    if (this.title) this.title.destroy();
    if (this.overlay) this.overlay.destroy();
    this.choices = null; this.presentation = null;
  }
}
