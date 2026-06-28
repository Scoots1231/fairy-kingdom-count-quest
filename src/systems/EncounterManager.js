// src/systems/EncounterManager.js
//
// The reusable encounter lifecycle for every act. run(spec) returns a Promise
// that resolves with the performance record once the encounter is resolved
// (always eventually correct — tier-3 guides her there). Performance is recorded
// to SaveSystem after EVERY encounter and the difficulty scaler is updated
// before the Promise resolves.
//
// Two interaction models, both fully mouse + keyboard:
//   - single-choice  (count, pickNumber, whichMore, matchColor, findShape,
//                      colorPattern, oddOneOut) -> AnswerChoices
//   - custom          (sortItems; colorMatch/shapeMatch/combinedMatch) -> bespoke
//                      interactors that report correct()/wrong() to the same loop.

import SaveSystem from './SaveSystem.js';
import ProceduralGenerator, { COLOR_HEX } from './ProceduralGenerator.js';
import DifficultyScaler from './DifficultyScaler.js';
import AnswerChoices from '../ui/AnswerChoices.js';

const W = 1280;
const H = 720;
const CUSTOM_TYPES = ['sortItems', 'colorMatch', 'shapeMatch', 'combinedMatch'];

// ---- Placeholder art helpers ----------------------------------------------
export function drawForestObject(scene, parent, type, x, y, scale = 1) {
  const g = scene.add.graphics();
  const s = scale;
  switch (type) {
    case 'firefly':
      g.fillStyle(0xfff2a8, 1); g.fillCircle(x, y, 10 * s);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(x, y, 4 * s); break;
    case 'mushroom':
      g.fillStyle(0xf0e6d0, 1); g.fillRect(x - 4 * s, y, 8 * s, 16 * s);
      g.fillStyle(0xd14b4b, 1); g.fillEllipse(x, y, 30 * s, 20 * s);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 6 * s, y - 2 * s, 2.5 * s); break;
    case 'stone':
      g.fillStyle(0x8fa6c0, 1); g.fillEllipse(x, y, 30 * s, 22 * s); break;
    case 'flower':
      g.fillStyle(0xff8fc8, 1);
      for (let a = 0; a < 5; a++) { const ang = (a / 5) * Math.PI * 2; g.fillCircle(x + Math.cos(ang) * 10 * s, y + Math.sin(ang) * 10 * s, 7 * s); }
      g.fillStyle(0xffe066, 1); g.fillCircle(x, y, 6 * s); break;
    default:
      g.fillStyle(0x6fae5a, 1); g.fillEllipse(x, y, 26 * s, 16 * s);
      g.lineStyle(2 * s, 0x3f7e3a, 1); g.lineBetween(x - 12 * s, y, x + 12 * s, y); break;
  }
  parent.add(g);
  return g;
}

// Draw a shape into `parent` centred at (x,y).
export function drawShape(scene, parent, shape, color, x, y, size = 40) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  const s = size;
  switch (shape) {
    case 'square': g.fillRoundedRect(x - s, y - s, s * 2, s * 2, 4); break;
    case 'rectangle': g.fillRoundedRect(x - s * 1.3, y - s * 0.7, s * 2.6, s * 1.4, 4); break;
    case 'triangle': g.fillTriangle(x - s, y + s, x + s, y + s, x, y - s); break;
    case 'star': {
      const pts = []; let rot = -Math.PI / 2;
      for (let i = 0; i < 5; i++) { pts.push({ x: x + Math.cos(rot) * s, y: y + Math.sin(rot) * s }); rot += Math.PI / 5; pts.push({ x: x + Math.cos(rot) * s * 0.45, y: y + Math.sin(rot) * s * 0.45 }); rot += Math.PI / 5; }
      g.fillPoints(pts, true); break;
    }
    case 'diamond': g.fillPoints([{ x, y: y - s }, { x: x + s, y }, { x, y: y + s }, { x: x - s, y }], true); break;
    case 'oval': g.fillEllipse(x, y, s * 2.2, s * 1.4); break;
    case 'heart':
      g.fillCircle(x - s * 0.5, y - s * 0.3, s * 0.6); g.fillCircle(x + s * 0.5, y - s * 0.3, s * 0.6);
      g.fillTriangle(x - s, y - s * 0.1, x + s, y - s * 0.1, x, y + s); break;
    case 'circle':
    default: g.fillCircle(x, y, s); break;
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
    this.onFirstPlay = opts.onFirstPlay;
    this.lastCorrectIndex = null;
  }

  run(spec) {
    const q = ProceduralGenerator.generate(spec.type, spec.difficulty);
    this.q = q;

    this.overlay = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x0a0614, 0.55).setDepth(2000).setInteractive();
    this.title = this.scene.add.text(W / 2, 96, this.promptFor(q), {
      fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffe9a8', align: 'center', stroke: '#1a0a2e', strokeThickness: 4
    }).setOrigin(0.5).setDepth(2200);

    const presentation = this.buildPresentation(q);
    this.presentation = presentation;

    return new Promise((resolve) => {
      const state = { wrongCount: 0, guided: false, resolved: false, q, resolve };
      const start = () => {
        SaveSystem.set(`encounterIntroductions.${spec.type}`, true);
        this.startInteractor(q, presentation, state);
      };
      if (!SaveSystem.get(`encounterIntroductions.${spec.type}`) && this.onFirstPlay) {
        Promise.resolve(this.onFirstPlay(spec.type, q, presentation)).then(start);
      } else {
        start();
      }
    });
  }

  // ---- Shared correct/wrong handling -------------------------------------
  onWrong(state, getCorrectObject) {
    if (state.resolved) return;
    state.wrongCount += 1;
    const tier = Math.min(state.wrongCount, 3);
    if (this.hintSystem) this.hintSystem.showHint(tier, { type: state.q.type, question: state.q, getCorrectObject });
    if (tier >= 3) state.guided = true;
  }

  onCorrect(state) {
    if (state.resolved) return;
    state.resolved = true;
    if (this.interactor && this.interactor.setEnabled) this.interactor.setEnabled(false);
    if (this.scene.wandCursor) this.scene.wandCursor.setState('correct');
    if (state.guided && this.hintSystem) this.hintSystem.celebrateGuided();
    else if (this.pip) this.pip.react('correct');

    const attempts = state.wrongCount + 1;
    const hintsUsed = Math.min(state.wrongCount, 3);
    const record = { type: state.q.type, correct: true, attempts, hintsUsed, timestamp: Date.now() };
    this.recordPerformance(record);
    this.scene.time.delayedCall(900, () => { this.cleanup(); state.resolve(record); });
  }

  recordPerformance(record) {
    const key = `performance.${this.actKey}History`;
    const hist = SaveSystem.get(key) || [];
    hist.push(record);
    SaveSystem.set(key, hist);
    DifficultyScaler.recordEncounter(this.actKey, { attempts: record.attempts, hintsUsed: record.hintsUsed });
    if (this.choices) this.lastCorrectIndex = this.choices.correctIndex;
  }

  // ---- Interactor dispatch ------------------------------------------------
  startInteractor(q, presentation, state) {
    if (q.type === 'sortItems') return this.startSort(q, presentation, state);
    if (CUSTOM_TYPES.includes(q.type)) return this.startMatch(q, presentation, state);
    return this.startChoices(q, presentation, state);
  }

  startChoices(q, presentation, state) {
    const choices = new AnswerChoices(this.scene, {
      x: W / 2, y: presentation.choicesY, items: presentation.choiceItems,
      correctValue: presentation.correctValue, avoidIndex: this.lastCorrectIndex,
      onSelect: (value) => {
        if (value === presentation.correctValue) this.onCorrect(state);
        else this.onWrong(state, () => choices.getButtonForValue(presentation.correctValue));
      }
    });
    this.choices = choices;
    this.interactor = { setEnabled: (b) => choices.setEnabled(b), destroy: () => choices.destroy() };
  }

  // ---- Prompts ------------------------------------------------------------
  promptFor(q) {
    switch (q.type) {
      case 'countObjects': return `How many ${q.objectType}s do you see?`;
      case 'pickNumber': return 'The gate needs its number. Which stone matches?';
      case 'whichMore': return 'Which side has more?';
      case 'matchColor': return 'Find the matching color!';
      case 'findShape': return `Find the ${q.target}!`;
      case 'colorPattern': return 'What color comes next?';
      case 'oddOneOut': return 'Which one does not belong?';
      case 'sortItems': return `Sort each one by its ${q.by}!`;
      case 'colorMatch': return 'Match each one to its color!';
      case 'shapeMatch': return 'Match each key to its shape!';
      case 'combinedMatch': return 'Match the color AND the shape!';
      default: return '';
    }
  }

  // ---- Presentations (single-choice) -------------------------------------
  buildPresentation(q) {
    switch (q.type) {
      case 'countObjects': return this.presentCount(q);
      case 'pickNumber': return this.presentPickNumber(q);
      case 'whichMore': return this.presentWhichMore(q);
      case 'matchColor': return this.presentMatchColor(q);
      case 'findShape': return this.presentFindShape(q);
      case 'colorPattern': return this.presentColorPattern(q);
      case 'oddOneOut': return this.presentOddOneOut(q);
      case 'sortItems': return this.presentSort(q);
      default: return this.presentMatch(q); // colorMatch / shapeMatch / combinedMatch
    }
  }

  presentCount(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    const card = this.scene.add.graphics();
    card.fillStyle(0x16301c, 0.9); card.fillRoundedRect(W / 2 - 320, 180, 640, 200, 24);
    card.lineStyle(3, 0x4f8f3f, 1); card.strokeRoundedRect(W / 2 - 320, 180, 640, 200, 24);
    container.add(card);
    const cols = Math.min(q.count, 5); const rows = Math.ceil(q.count / 5);
    const x0 = W / 2 - ((cols - 1) * 90) / 2; const y0 = 280 - ((rows - 1) * 70) / 2;
    for (let i = 0; i < q.count; i++) {
      const col = i % 5; const row = Math.floor(i / 5);
      const ox = x0 + col * 90; const oy = y0 + row * 70;
      const oc = this.scene.add.container(0, 0);
      const art = drawForestObject(this.scene, oc, q.objectType, ox, oy, 1.2); art.setAlpha(0.75);
      container.add(oc);
      const hit = this.scene.add.circle(ox, oy, 26, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
      container.add(hit);
      hit.on('pointerdown', () => { art.setAlpha(1); this.scene.tweens.add({ targets: art, scaleX: 1.2, scaleY: 1.2, duration: 120, yoyo: true }); });
    }
    const choiceItems = q.choices.map((n) => ({ value: n, render: (s, a) => this.renderNumberStone(s, a, n) }));
    return { container, choiceItems, choicesY: 540, correctValue: q.answer };
  }

  presentPickNumber(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    const gate = this.scene.add.graphics();
    gate.fillStyle(0x3a4a3a, 1); gate.fillRoundedRect(W / 2 - 110, 180, 220, 220, 18);
    gate.fillStyle(0x223022, 1); gate.fillRoundedRect(W / 2 - 80, 210, 160, 160, 12);
    container.add(gate);
    container.add(this.scene.add.text(W / 2, 290, `${q.target}`, { fontFamily: 'Georgia, serif', fontSize: '120px', color: '#bfe6bf', fontStyle: 'bold' }).setOrigin(0.5));
    const choiceItems = q.choices.map((n) => ({ value: n, render: (s, a) => this.renderNumberStone(s, a, n) }));
    return { container, choiceItems, choicesY: 560, correctValue: q.answer };
  }

  presentWhichMore(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    const groupRender = (count) => (s, a) => {
      const panel = s.add.graphics(); panel.fillStyle(0x16301c, 0.9); panel.fillRoundedRect(-66, -66, 132, 132, 14); a.add(panel);
      for (let i = 0; i < count; i++) { const col = i % 3; const row = Math.floor(i / 3); drawForestObject(s, a, q.objectType, -34 + col * 34, -34 + row * 30, 0.7); }
    };
    const choiceItems = [{ value: 'left', render: groupRender(q.groupA) }, { value: 'right', render: groupRender(q.groupB) }];
    return { container, choiceItems, choicesY: 380, correctValue: q.answer };
  }

  presentMatchColor(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    // Target dragonfly swatch.
    const g = this.scene.add.graphics(); g.fillStyle(COLOR_HEX[q.target], 1); g.fillEllipse(W / 2, 280, 90, 60);
    g.fillStyle(0xeaf4ff, 0.6); g.fillEllipse(W / 2 - 30, 268, 30, 18); g.fillEllipse(W / 2 + 30, 268, 30, 18);
    container.add(g);
    const choiceItems = q.choices.map((c) => ({ value: c, render: (s, a) => this.renderColorSwatch(s, a, c) }));
    return { container, choiceItems, choicesY: 540, correctValue: q.answer };
  }

  presentFindShape(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    drawShape(this.scene, container, q.target, 0x9fb4d6, W / 2, 280, 56);
    const choiceItems = q.choices.map((sh) => ({ value: sh, render: (s, a) => drawShape(s, a, sh, 0xcdb6e8, 0, 0, 40) }));
    return { container, choiceItems, choicesY: 540, correctValue: q.answer };
  }

  presentColorPattern(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    const n = q.visiblePattern.length; const x0 = W / 2 - ((n) * 90) / 2;
    q.visiblePattern.forEach((c, i) => { this.renderColorSwatchAt(container, c, x0 + i * 90 + 45, 280, 30); });
    // The "?" slot.
    const qm = this.scene.add.graphics(); qm.lineStyle(3, 0xffe9a8, 1); qm.strokeRoundedRect(x0 + n * 90 + 15, 250, 60, 60, 10); container.add(qm);
    container.add(this.scene.add.text(x0 + n * 90 + 45, 280, '?', { fontFamily: 'Georgia, serif', fontSize: '40px', color: '#ffe9a8' }).setOrigin(0.5));
    const choiceItems = q.choices.map((c) => ({ value: c, render: (s, a) => this.renderColorSwatch(s, a, c) }));
    return { container, choiceItems, choicesY: 540, correctValue: q.answer };
  }

  presentOddOneOut(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    const choiceItems = q.items.map((it, idx) => ({ value: idx, render: (s, a) => drawShape(s, a, it.shape, COLOR_HEX[it.color], 0, 0, 38) }));
    return { container, choiceItems, choicesY: 360, correctValue: q.answer };
  }

  renderNumberStone(scene, art, n) {
    const g = scene.add.graphics(); g.fillStyle(0x6a7f99, 1); g.fillEllipse(0, 0, 110, 96); g.fillStyle(0x8fa6c0, 0.7); g.fillEllipse(-12, -14, 40, 26); art.add(g);
    art.add(scene.add.text(0, 0, `${n}`, { fontFamily: 'Georgia, serif', fontSize: '64px', color: '#1a2438', fontStyle: 'bold' }).setOrigin(0.5));
  }
  renderColorSwatch(scene, art, color) {
    const g = scene.add.graphics(); g.fillStyle(COLOR_HEX[color], 1); g.fillRoundedRect(-42, -42, 84, 84, 14); g.lineStyle(2, 0xffffff, 0.4); g.strokeRoundedRect(-42, -42, 84, 84, 14); art.add(g);
  }
  renderColorSwatchAt(container, color, x, y, r) {
    const g = container.scene.add.graphics(); g.fillStyle(COLOR_HEX[color], 1); g.fillRoundedRect(x - r, y - r, r * 2, r * 2, 8); container.add(g);
  }

  // ---- Sort interactor ----------------------------------------------------
  presentSort(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    return { container, custom: 'sort' };
  }

  startSort(q, presentation, state) {
    const scene = this.scene;
    const container = presentation.container;
    const bins = q.bins;
    const binViews = [];
    const binW = 200; const gap = 40; const totalW = bins.length * binW + (bins.length - 1) * gap;
    const bx0 = W / 2 - totalW / 2 + binW / 2;
    bins.forEach((value, i) => {
      const bxc = bx0 + i * (binW + gap);
      const c = scene.add.container(bxc, 540);
      const bg = scene.add.graphics(); c.add(bg);
      // Label the bin by its colour/shape.
      if (q.by === 'color') { const sw = scene.add.graphics(); sw.fillStyle(COLOR_HEX[value], 1); sw.fillCircle(0, -30, 22); c.add(sw); }
      else drawShape(scene, c, value, 0xcdb6e8, 0, -30, 22);
      const hit = scene.add.rectangle(0, 0, binW, 150, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
      c.add(hit); container.add(c);
      const view = { value, container: c, bg, index: i, placed: 0 };
      hit.on('pointerover', () => { this.sortFocus = i; drawBins(); });
      hit.on('pointerdown', () => place(i));
      binViews.push(view);
    });

    // Items queue along the top.
    const itemViews = q.items.map((it, i) => {
      const ix = W / 2 - ((q.items.length - 1) * 70) / 2 + i * 70;
      const c = scene.add.container(ix, 240);
      if (q.by === 'color') { const sw = scene.add.graphics(); sw.fillStyle(COLOR_HEX[it.value], 1); sw.fillCircle(0, 0, 24); c.add(sw); }
      else drawShape(scene, c, it.value, 0xcdb6e8, 0, 0, 24);
      container.add(c);
      return { value: it.value, container: c, placed: false };
    });

    this.sortFocus = 0;
    this.sortCurrent = 0; // index of next unplaced item
    const drawBins = () => {
      binViews.forEach((b, i) => {
        b.bg.clear();
        b.bg.fillStyle(0x2a2440, 0.85); b.bg.fillRoundedRect(-binW / 2, -75, binW, 150, 14);
        b.bg.lineStyle(this.sortFocus === i ? 5 : 2, this.sortFocus === i ? 0xffe9a8 : 0x6a5a8a, 1);
        b.bg.strokeRoundedRect(-binW / 2, -75, binW, 150, 14);
      });
    };
    const highlightCurrent = () => {
      itemViews.forEach((it, i) => { it.container.setScale(i === this.sortCurrent && !it.placed ? 1.3 : 1); });
    };
    const place = (binIndex) => {
      if (state.resolved) return;
      const item = itemViews[this.sortCurrent];
      if (!item || item.placed) return;
      if (item.value === binViews[binIndex].value) {
        item.placed = true;
        const b = binViews[binIndex]; b.placed += 1;
        scene.tweens.add({ targets: item.container, x: b.container.x + (b.placed - 1) * 24 - 30, y: b.container.y + 30, scale: 0.8, duration: 250 });
        this.sortCurrent = itemViews.findIndex((it) => !it.placed);
        if (this.sortCurrent === -1) this.onCorrect(state);
        else highlightCurrent();
      } else {
        this.onWrong(state, () => binViews.find((b) => b.value === itemViews[this.sortCurrent].value).container);
      }
    };

    drawBins(); highlightCurrent();

    this._sortKeys = (e) => {
      if (state.resolved) return;
      if (e.code === 'ArrowLeft') { this.sortFocus = (this.sortFocus + bins.length - 1) % bins.length; drawBins(); }
      else if (e.code === 'ArrowRight') { this.sortFocus = (this.sortFocus + 1) % bins.length; drawBins(); }
      else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); place(this.sortFocus); }
    };
    scene.input.keyboard.on('keydown', this._sortKeys);
    this.interactor = {
      setEnabled: () => {},
      destroy: () => { scene.input.keyboard.off('keydown', this._sortKeys); }
    };
  }

  // ---- Match interactor (Act 3: click source -> destination) -------------
  presentMatch(q) {
    const container = this.scene.add.container(0, 0).setDepth(2150);
    return { container, custom: 'match' };
  }

  startMatch(q, presentation, state) {
    const scene = this.scene; const container = presentation.container;
    const n = q.pairs.length;
    const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);
    const sources = shuffle(q.pairs.map((p, i) => ({ key: i, pair: p })));
    const dests = shuffle(q.pairs.map((p, i) => ({ key: i, pair: p })));

    const colFor = (pair) => (pair.attr === 'shape' ? 0xcdb6e8 : COLOR_HEX[pair.color || pair.value]);
    const shapeFor = (pair) => (pair.attr === 'shape' ? pair.value : (pair.attr === 'combined' ? pair.shape : 'circle'));

    const y0 = 230; const dy = Math.min(90, 380 / n);
    const makeNode = (entry, x, isSource) => {
      const c = scene.add.container(x, 0);
      const bg = scene.add.graphics(); c.add(bg);
      drawShape(scene, c, shapeFor(entry.pair), colFor(entry.pair), 0, 0, 26);
      const hit = scene.add.rectangle(0, 0, 90, 70, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
      c.add(hit); container.add(c);
      const node = { entry, container: c, bg, matched: false, isSource };
      hit.on('pointerover', () => { this.matchHover(node); });
      hit.on('pointerdown', () => this.matchClick(node, state));
      return node;
    };
    this.srcNodes = sources.map((e, i) => { const node = makeNode(e, W / 2 - 220, true); node.container.y = y0 + i * dy; return node; });
    this.dstNodes = dests.map((e, i) => { const node = makeNode(e, W / 2 + 220, false); node.container.y = y0 + i * dy; return node; });

    container.add(scene.add.text(W / 2 - 220, 180, 'These...', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#cdb6e8' }).setOrigin(0.5));
    container.add(scene.add.text(W / 2 + 220, 180, '...go here', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#cdb6e8' }).setOrigin(0.5));

    this.matchPhase = 'source'; this.matchFocus = 0; this.matchSelected = null; this.matchRemaining = n; this.matchState = state; this.matchQ = q;
    this.drawMatch();

    this._matchKeys = (e) => this.matchKey(e, state);
    scene.input.keyboard.on('keydown', this._matchKeys);
    this.interactor = { setEnabled: () => {}, destroy: () => { scene.input.keyboard.off('keydown', this._matchKeys); } };
  }

  matchPairsEqual(a, b) {
    if (a.attr === 'combined') return a.color === b.color && a.shape === b.shape;
    return a.value === b.value;
  }

  activeNodes() { return this.matchPhase === 'source' ? this.srcNodes.filter((n) => !n.matched) : this.dstNodes.filter((n) => !n.matched); }

  drawMatch() {
    const draw = (nodes, isSrc) => nodes.forEach((node) => {
      node.bg.clear();
      if (node.matched) return;
      const active = (isSrc ? this.matchPhase === 'source' : this.matchPhase === 'dest');
      const focused = active && this.activeNodes()[this.matchFocus] === node;
      const selected = this.matchSelected === node;
      node.bg.fillStyle(selected ? 0x9be8a8 : 0x2a2440, selected ? 0.5 : 0.85);
      node.bg.fillRoundedRect(-45, -35, 90, 70, 12);
      node.bg.lineStyle(focused ? 5 : 2, focused ? 0xffe9a8 : (selected ? 0x9be8a8 : 0x6a5a8a), 1);
      node.bg.strokeRoundedRect(-45, -35, 90, 70, 12);
    });
    draw(this.srcNodes, true); draw(this.dstNodes, false);
  }

  matchHover(node) {
    if (node.matched) return;
    const list = node.isSource ? this.srcNodes : this.dstNodes;
    if ((node.isSource && this.matchPhase === 'source') || (!node.isSource && this.matchPhase === 'dest')) {
      this.matchFocus = this.activeNodes().indexOf(node); this.drawMatch();
    }
  }

  matchClick(node, state) {
    if (state.resolved || node.matched) return;
    if (node.isSource) {
      if (this.matchPhase !== 'source') { this.matchSelected = null; this.matchPhase = 'source'; }
      this.matchSelected = node; this.matchPhase = 'dest'; this.matchFocus = 0; this.drawMatch();
    } else {
      if (!this.matchSelected) return;
      this.attemptMatch(this.matchSelected, node, state);
    }
  }

  attemptMatch(src, dst, state) {
    if (this.matchPairsEqual(src.entry.pair, dst.entry.pair)) {
      src.matched = true; dst.matched = true;
      this.scene.tweens.add({ targets: [src.container, dst.container], alpha: 0.5, duration: 200 });
      this.matchRemaining -= 1; this.matchSelected = null; this.matchPhase = 'source'; this.matchFocus = 0;
      this.drawMatch();
      if (this.matchRemaining === 0) this.onCorrect(state);
    } else {
      this.onWrong(state, () => {
        const want = this.dstNodes.find((d) => !d.matched && this.matchPairsEqual(d.entry.pair, this.matchSelected.entry.pair));
        return want ? want.container : null;
      });
      this.matchSelected = null; this.matchPhase = 'source'; this.drawMatch();
    }
  }

  matchKey(e, state) {
    if (state.resolved) return;
    const active = this.activeNodes();
    if (active.length === 0) return;
    if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') { e.preventDefault(); this.matchFocus = (this.matchFocus + active.length - 1) % active.length; this.drawMatch(); }
    else if (e.code === 'ArrowDown' || e.code === 'ArrowRight') { e.preventDefault(); this.matchFocus = (this.matchFocus + 1) % active.length; this.drawMatch(); }
    else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      const node = active[this.matchFocus];
      if (this.matchPhase === 'source') { this.matchSelected = node; this.matchPhase = 'dest'; this.matchFocus = 0; this.drawMatch(); }
      else { this.attemptMatch(this.matchSelected, node, state); }
    }
  }

  cleanup() {
    if (this.choices) this.choices.destroy();
    if (this.interactor && this.interactor.destroy) this.interactor.destroy();
    if (this.hintSystem) { this.hintSystem.clearBubble(); this.hintSystem.clearGlow(); }
    if (this.presentation && this.presentation.container) this.presentation.container.destroy();
    if (this.title) this.title.destroy();
    if (this.overlay) this.overlay.destroy();
    this.choices = null; this.interactor = null; this.presentation = null;
    this.srcNodes = null; this.dstNodes = null;
  }
}
