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

  generate(type, difficulty) {
    if (type === 'countObjects') return this.generateCountObjects(difficulty);
    if (type === 'pickNumber') return this.generatePickNumber(difficulty);
    if (type === 'whichMore') return this.generateWhichMore(difficulty);
    throw new Error(`Unknown encounter type: ${type}`);
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
  }
};

export default ProceduralGenerator;
