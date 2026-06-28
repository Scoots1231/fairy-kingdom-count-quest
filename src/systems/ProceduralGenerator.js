// src/systems/ProceduralGenerator.js
//
// Generates question data for encounters. Pure logic (no Phaser) so it can be
// unit-tested in isolation. All four acts will add their own generators here;
// Phase 3 implements Act 1's three types plus the act sequence builder.

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Difficulty tiers for Act 1 (see build doc table).
const TIERS = {
  1: { range: [1, 5], dist: [1, 2], choices: 3 },
  2: { range: [1, 8], dist: [1, 2], choices: 3 },
  3: { range: [1, 10], dist: [1], choices: 3 },
  4: { range: [1, 10], dist: [1], choices: 4 } // full range + decoys
};

const OBJECT_TYPES = ['firefly', 'mushroom', 'stone', 'flower', 'leaf'];

// ---- Colors & shapes (Acts 2–4) -------------------------------------------
export const COLOR_HEX = {
  red: 0xe2483a, blue: 0x3f7fd6, yellow: 0xf2c63f, green: 0x4fae54,
  orange: 0xe88a3a, purple: 0x9b59b6, pink: 0xe88ec0,
  white: 0xf3f0ea, black: 0x2a2630, brown: 0x8a5a35, teal: 0x3fae9f
};
export const ALL_SHAPES = ['circle', 'square', 'triangle', 'rectangle', 'star', 'diamond', 'oval', 'heart'];

function colorPoolForLevel(level) {
  let pool = ['red', 'blue', 'yellow', 'green'];
  if (level >= 3) pool = pool.concat(['orange', 'purple', 'pink']);
  if (level >= 4) pool = pool.concat(['white', 'black', 'brown', 'teal']);
  return pool;
}
function shapePoolForLevel(level) {
  let pool = ['circle', 'square', 'triangle'];
  if (level >= 3) pool = pool.concat(['rectangle', 'star']);
  if (level >= 4) pool = pool.concat(['diamond', 'oval', 'heart']);
  return pool;
}
function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}
// n distinct wrong values drawn from pool, excluding `target`.
function wrongFromPool(target, pool, n) {
  return sample(pool.filter((v) => v !== target), n);
}

function tierFor(difficulty) {
  const lvl = Math.max(1, Math.min(4, difficulty));
  return TIERS[lvl] || TIERS[2];
}

// Build `n` distinct WRONG choices adjacent to `correct`.
// Choices are always close numbers (educational), never < 1, never duplicate,
// never equal to `correct`.
function adjacentWrongChoices(correct, n, distArray, max) {
  const offsets = [];
  distArray.forEach((d) => { offsets.push(d, -d); });
  // Widen if we can't fill from the base distances.
  for (let extra = (Math.max(...distArray) + 1); offsets.length < 12; extra++) {
    offsets.push(extra, -extra);
  }
  const seen = new Set([correct]);
  const out = [];
  for (const off of offsets) {
    if (out.length >= n) break;
    const v = correct + off;
    if (v < 1 || v > max + 2) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  // Last-resort fill (tiny ranges).
  let probe = 1;
  while (out.length < n) {
    const v = correct + probe;
    if (v >= 1 && !seen.has(v)) { seen.add(v); out.push(v); }
    probe = probe > 0 ? -probe : -probe + 1;
    if (Math.abs(probe) > 20) break;
  }
  return out.slice(0, n);
}

const ProceduralGenerator = {
  OBJECT_TYPES,

  // Type 1 — Count the Objects.
  generateCountObjects(difficulty) {
    const tier = tierFor(difficulty);
    const count = randInt(tier.range[0], tier.range[1]);
    const objectType = randFrom(OBJECT_TYPES);
    const wrong = adjacentWrongChoices(count, tier.choices - 1, tier.dist, tier.range[1]);
    return { type: 'countObjects', difficulty, count, objectType, answer: count, choices: shuffle([count, ...wrong]) };
  },

  // Type 2 — Pick the Correct Number.
  generatePickNumber(difficulty) {
    const tier = tierFor(difficulty);
    const target = randInt(tier.range[0], tier.range[1]);
    const wrong = adjacentWrongChoices(target, tier.choices - 1, tier.dist, tier.range[1]);
    return { type: 'pickNumber', difficulty, target, answer: target, choices: shuffle([target, ...wrong]) };
  },

  // Type 3 — Which Group Has More.
  generateWhichMore(difficulty) {
    const early = difficulty <= 2;
    const minDiff = early ? 3 : 2;
    // Use one shared max so a valid pair always exists for either side.
    const max = early ? 5 : 9;
    // Pick low and high with high - low >= minDiff, both within [1, max].
    const low = randInt(1, max - minDiff);
    const high = randInt(low + minDiff, max);
    // Randomly decide which side is the bigger group (so the answer varies).
    const bigOnLeft = Math.random() < 0.5;
    const groupA = bigOnLeft ? high : low;
    const groupB = bigOnLeft ? low : high;
    return {
      type: 'whichMore', difficulty,
      groupA, groupB,
      answer: groupA > groupB ? 'left' : 'right',
      objectType: randFrom(OBJECT_TYPES)
    };
  },

  // ===== Act 2 — colors, shapes, patterns, sorting =====

  generateMatchColor(difficulty) {
    const pool = colorPoolForLevel(difficulty);
    const target = randFrom(pool);
    const nChoices = difficulty >= 4 ? 4 : 3;
    const wrong = wrongFromPool(target, pool, nChoices - 1);
    return { type: 'matchColor', difficulty, target, answer: target, choices: shuffle([target, ...wrong]) };
  },

  generateFindShape(difficulty) {
    const pool = shapePoolForLevel(difficulty);
    const target = randFrom(pool);
    const nChoices = difficulty >= 4 ? 4 : 3;
    const wrong = wrongFromPool(target, pool, nChoices - 1);
    return { type: 'findShape', difficulty, target, answer: target, choices: shuffle([target, ...wrong]) };
  },

  generateColorPattern(difficulty) {
    const patternLen = difficulty <= 2 ? 4 : 6;
    const numColors = difficulty <= 2 ? 2 : 3;
    const colors = sample(colorPoolForLevel(difficulty), numColors);
    // Build a repeating sequence (AB.. or ABC..) and ask for the NEXT element.
    const full = [];
    for (let i = 0; i < patternLen + 1; i++) full.push(colors[i % numColors]);
    const visible = full.slice(0, patternLen);
    const answer = full[patternLen];
    const wrong = wrongFromPool(answer, colors.concat(colorPoolForLevel(difficulty)), 2)
      .filter((c) => c !== answer);
    return { type: 'colorPattern', difficulty, visiblePattern: visible, answer, choices: shuffle([answer, ...wrong].slice(0, 3)) };
  },

  // Sort items into colour- or shape-coded bins.
  generateSort(difficulty) {
    const categories = difficulty >= 4 ? 3 : 2;
    const perCat = difficulty <= 2 ? 2 : 3;
    const by = Math.random() < 0.5 ? 'color' : 'shape';
    const pool = by === 'color' ? colorPoolForLevel(difficulty) : shapePoolForLevel(difficulty);
    const bins = sample(pool, categories);
    const items = [];
    bins.forEach((value) => { for (let i = 0; i < perCat; i++) items.push({ value }); });
    return { type: 'sortItems', difficulty, by, bins, items: shuffle(items) };
  },

  // 4 items, 3 share an attribute, 1 is the odd one out.
  generateOddOneOut(difficulty) {
    const colorPool = colorPoolForLevel(difficulty);
    const shapePool = shapePoolForLevel(difficulty);
    let items;
    if (difficulty <= 2) {
      // Differ by colour only.
      const shape = randFrom(shapePool.slice(0, 3));
      const [common, odd] = sample(colorPool, 2);
      items = [0, 1, 2].map(() => ({ color: common, shape }));
      items.push({ color: odd, shape });
    } else if (difficulty === 3) {
      // Differ by shape only.
      const color = randFrom(colorPool);
      const [common, odd] = sample(shapePool, 2);
      items = [0, 1, 2].map(() => ({ color, shape: common }));
      items.push({ color, shape: odd });
    } else {
      // Combined: 3 red circles, 1 red square (shape differs, colour same).
      const color = randFrom(colorPool);
      const [common, odd] = sample(shapePool, 2);
      items = [0, 1, 2].map(() => ({ color, shape: common }));
      items.push({ color, shape: odd });
    }
    const order = shuffle(items.map((it, i) => ({ it, i })));
    const oddOriginal = 3;
    const answer = order.findIndex((o) => o.i === oddOriginal);
    return { type: 'oddOneOut', difficulty, items: order.map((o) => o.it), answer };
  },

  // ===== Act 3 — visible matching (click source -> destination) =====

  generateColorMatch(difficulty) {
    const n = [3, 4, 5, 6][Math.max(0, Math.min(3, difficulty - 1))];
    const colors = sample(colorPoolForLevel(difficulty), Math.min(n, colorPoolForLevel(difficulty).length));
    // pairs: each source (butterfly) of a color matches a destination (flower) of same color.
    const pairs = colors.slice(0, n).map((c) => ({ attr: 'color', value: c }));
    return { type: 'colorMatch', difficulty, by: 'color', pairs };
  },

  generateShapeMatch(difficulty) {
    const n = [1, 2, 3, 3][Math.max(0, Math.min(3, difficulty - 1))] + (difficulty >= 2 ? 1 : 2);
    const shapes = sample(shapePoolForLevel(difficulty), Math.min(n, shapePoolForLevel(difficulty).length));
    const pairs = shapes.map((s) => ({ attr: 'shape', value: s }));
    return { type: 'shapeMatch', difficulty, by: 'shape', pairs };
  },

  // Match BOTH colour and shape. Falls back to colorMatch below level 3.
  generateCombinedMatch(difficulty) {
    if (difficulty < 3) return this.generateColorMatch(difficulty);
    const n = difficulty >= 4 ? 4 : 3;
    const colors = colorPoolForLevel(difficulty);
    const shapes = shapePoolForLevel(difficulty);
    const used = new Set();
    const pairs = [];
    while (pairs.length < n) {
      const c = randFrom(colors); const s = randFrom(shapes);
      const key = `${c}_${s}`;
      if (used.has(key)) continue;
      used.add(key);
      pairs.push({ attr: 'combined', color: c, shape: s, value: key });
    }
    return { type: 'combinedMatch', difficulty, by: 'combined', pairs };
  },

  generate(type, difficulty) {
    const map = {
      countObjects: 'generateCountObjects', pickNumber: 'generatePickNumber', whichMore: 'generateWhichMore',
      matchColor: 'generateMatchColor', findShape: 'generateFindShape', colorPattern: 'generateColorPattern',
      sortItems: 'generateSort', oddOneOut: 'generateOddOneOut',
      colorMatch: 'generateColorMatch', shapeMatch: 'generateShapeMatch', combinedMatch: 'generateCombinedMatch'
    };
    const fn = map[type];
    if (!fn) throw new Error(`Unknown encounter type: ${type}`);
    return this[fn](difficulty);
  },

  // Build a full Act 1 encounter sequence (6–8, no two consecutive same type).
  // First 3 use difficulty 2 (range 1–5..8), the rest difficulty 4 (range 1–10).
  generateAct1Sequence() {
    const pool = ['countObjects', 'pickNumber', 'whichMore'];
    const count = randInt(6, 8);
    const seq = [];
    for (let i = 0; i < count; i++) {
      const available = pool.filter((t) => t !== seq[seq.length - 1]);
      seq.push(randFrom(available));
    }
    return seq.map((type, i) => ({ type, difficulty: i < 3 ? 2 : 4 }));
  },

  _buildSequence(pool, count, diffFor) {
    const seq = [];
    for (let i = 0; i < count; i++) {
      const available = pool.filter((t) => t !== seq[seq.length - 1]);
      seq.push(randFrom(available));
    }
    return seq.map((type, i) => ({ type, difficulty: diffFor(i, count) }));
  },

  generateAct2Sequence() {
    const pool = ['matchColor', 'findShape', 'colorPattern', 'sortItems', 'oddOneOut'];
    return this._buildSequence(pool, randInt(6, 8), (i) => (i < 3 ? 2 : 4));
  },

  generateAct3Sequence() {
    // Combined match only appears from level 3; the scene triggers Waldo's
    // transformation around the midpoint.
    const count = randInt(6, 8);
    const seq = [];
    for (let i = 0; i < count; i++) {
      const pool = i < 3 ? ['colorMatch', 'shapeMatch'] : ['colorMatch', 'shapeMatch', 'combinedMatch'];
      const available = pool.filter((t) => t !== seq[seq.length - 1]);
      seq.push(randFrom(available));
    }
    return seq.map((type, i) => ({ type, difficulty: i < 3 ? 2 : (i < 5 ? 3 : 4) }));
  },

  // Act 4 — 12 encounters across three phases, drawing from ALL skill areas,
  // guaranteeing at least one from each area (number / color / shape / matching).
  generateAct4Sequence() {
    const areas = {
      number: ['countObjects', 'pickNumber', 'whichMore'],
      color: ['matchColor', 'colorPattern'],
      shape: ['findShape', 'oddOneOut', 'sortItems'],
      matching: ['colorMatch', 'shapeMatch', 'combinedMatch']
    };
    const order = ['number', 'color', 'shape', 'matching'];
    const seq = [];
    // Seed one guaranteed from each area first.
    order.forEach((a) => seq.push(randFrom(areas[a])));
    const allTypes = Object.values(areas).flat();
    while (seq.length < 12) {
      const available = allTypes.filter((t) => t !== seq[seq.length - 1]);
      seq.push(randFrom(available));
    }
    const shuffled = shuffle(seq).map((type, i) => {
      // Three phases of four: gardens (2), halls (3), staircase (4).
      const difficulty = i < 4 ? 2 : (i < 8 ? 3 : 4);
      return { type, difficulty };
    });
    return shuffled;
  }
};

export default ProceduralGenerator;
