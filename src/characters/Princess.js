// src/characters/Princess.js
//
// PrincessPreview — the live, procedurally-drawn princess shown in every mirror
// (customization screen, closet, room avatar). Driven entirely by data:
//   setCharacter({ headShape, hairStyle, hairColor, eyeColor, bodyShape })
//   setOutfit({ crown, hat, dress, shirt, pants, shoes })   // item descriptors or null
//   setBiome('forest'|'swamp'|'fields'|'castle'|null)
// then redraw(). This is the Phase-2 placeholder render (flat shapes); when real
// art exists, replace _draw() — the data contract stays the same.

import ItemDB from '../systems/ItemDB.js';

const HAIR_COLORS = { golden: 0xe9c869, brown: 0x7a4a25, black: 0x2b2430, auburn: 0xa6391f };
const EYE_COLORS = { blue: 0x4a90d9, green: 0x3f8f4f, brown: 0x8a5a2b, violet: 0x9b59b6 };
const BODY = {
  petite: { w: 0.85, h: 0.92 },
  average: { w: 1.0, h: 1.0 },
  tall: { w: 0.95, h: 1.14 },
  sturdy: { w: 1.14, h: 0.98 }
};
const BIOME_TINT = { forest: 0x3f8f4f, swamp: 0x5f7d6a, fields: 0xe8a0c8, castle: 0xe8c66a };

export default class PrincessPreview extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    this.unit = (opts.height || 360) / 360; // scale factor; base figure ≈360px tall
    this.character = { headShape: 'round', hairStyle: 'long', hairColor: 'brown', eyeColor: 'brown', bodyShape: 'average' };
    this.outfit = { crown: null, hat: null, dress: null, shirt: null, pants: null, shoes: null };
    this.biome = null;
    this.showSilhouettes = !!opts.showSilhouettes;

    this.isStatic = !!opts.static; // act scenes: no mirror platform / turning

    // Backdrop (biome tint) behind the figure.
    this.backdrop = scene.add.graphics();

    // The figure lives in its own container so it can "turn" on the platform.
    this.figure = scene.add.container(0, 0);
    this.gfx = scene.add.graphics();
    this.figure.add(this.gfx);

    // Empty-slot silhouettes (closet only).
    this.slotGfx = scene.add.graphics();

    if (this.isStatic) {
      this.add([this.backdrop, this.figure, this.slotGfx]);
    } else {
      // Mirror platform + slow turning illusion (~15°).
      this.platform = scene.add.ellipse(0, 150 * this.unit, 150 * this.unit, 34 * this.unit, 0xcdbce8, 0.4);
      this.add([this.backdrop, this.platform, this.figure, this.slotGfx]);
      scene.tweens.add({ targets: this.figure, rotation: 0.06, scaleX: 0.9, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this._draw();
    scene.events.once('shutdown', () => this.destroy());
  }

  setCharacter(c) { Object.assign(this.character, c || {}); return this; }
  setOutfit(o) { Object.assign(this.outfit, o || {}); return this; }
  setBiome(b) { this.biome = b; return this; }

  redraw() { this._draw(); return this; }

  _outfitColor(piece, fallback) {
    const v = this.outfit[piece];
    if (!v) return fallback;
    // currentOutfit stores an itemId string — resolve its colour via ItemDB.
    if (typeof v === 'string') { const d = ItemDB.display(v); return d && d.color != null ? d.color : fallback; }
    if (typeof v === 'object' && v.color != null) return v.color; // legacy descriptor
    return fallback;
  }
  _hasOutfit(piece) {
    const v = this.outfit[piece];
    return v !== null && v !== undefined;
  }

  _draw() {
    const u = this.unit;
    const g = this.gfx;
    g.clear();

    const body = BODY[this.character.bodyShape] || BODY.average;
    const hair = HAIR_COLORS[this.character.hairColor] || HAIR_COLORS.brown;
    const eye = EYE_COLORS[this.character.eyeColor] || EYE_COLORS.brown;
    const skin = 0xf6d7c0;
    const W = body.w; const HH = body.h;

    // ----- Backdrop biome tint -----
    this.backdrop.clear();
    if (this.biome && BIOME_TINT[this.biome]) {
      this.backdrop.fillStyle(BIOME_TINT[this.biome], 0.12);
      this.backdrop.fillEllipse(0, 0, 320 * u, 460 * u);
    }

    // Coordinates: 0 at hips. Head above (negative y), legs below.
    const hipY = 0;
    const legLen = 130 * u * HH;
    const torsoTop = hipY - 120 * u * HH;
    const headY = torsoTop - 38 * u;
    const headR = 30 * u;

    // ----- Legs / pants / shoes -----
    const pantsCol = this._outfitColor('pants', 0xf0d9c4);
    g.lineStyle(0);
    g.fillStyle(pantsCol, 1);
    g.fillRoundedRect(-18 * u * W, hipY, 16 * u * W, legLen, 8 * u);
    g.fillRoundedRect(2 * u * W, hipY, 16 * u * W, legLen, 8 * u);
    // Shoes.
    const shoeCol = this._outfitColor('shoes', 0x8a5a2b);
    g.fillStyle(shoeCol, 1);
    g.fillRoundedRect(-22 * u * W, hipY + legLen - 8 * u, 22 * u * W, 16 * u, 6 * u);
    g.fillRoundedRect(0, hipY + legLen - 8 * u, 22 * u * W, 16 * u, 6 * u);

    // ----- Dress (default) OR shirt -----
    const dressCol = this._hasOutfit('dress')
      ? this._outfitColor('dress', 0xd98fb8)
      : (this._hasOutfit('shirt') ? this._outfitColor('shirt', 0xa6d3f0) : 0xd98fb8);
    g.fillStyle(dressCol, 1);
    // Skirt as a trapezoid.
    g.beginPath();
    g.moveTo(-26 * u * W, torsoTop + 60 * u);
    g.lineTo(26 * u * W, torsoTop + 60 * u);
    g.lineTo(54 * u * W, hipY + 40 * u);
    g.lineTo(-54 * u * W, hipY + 40 * u);
    g.closePath();
    g.fillPath();
    // Bodice.
    g.fillRoundedRect(-22 * u * W, torsoTop, 44 * u * W, 70 * u, 10 * u);

    // ----- Arms -----
    g.fillStyle(skin, 1);
    g.fillRoundedRect(-30 * u * W, torsoTop + 6 * u, 10 * u, 56 * u, 5 * u);
    g.fillRoundedRect(20 * u * W, torsoTop + 6 * u, 10 * u, 56 * u, 5 * u);

    // ----- Neck + head -----
    g.fillStyle(skin, 1);
    g.fillRect(-7 * u, torsoTop - 14 * u, 14 * u, 16 * u);
    this._drawHead(g, 0, headY, headR, skin, this.character.headShape);

    // ----- Hair -----
    this._drawHair(g, 0, headY, headR, hair, this.character.hairStyle);

    // ----- Eyes -----
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-10 * u, headY, 5 * u);
    g.fillCircle(10 * u, headY, 5 * u);
    g.fillStyle(eye, 1);
    g.fillCircle(-10 * u, headY, 2.8 * u);
    g.fillCircle(10 * u, headY, 2.8 * u);
    // Smile.
    g.lineStyle(2 * u, 0xb56b6b, 1);
    g.beginPath(); g.arc(0, headY + 12 * u, 7 * u, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();

    // ----- Hat / crown overlays -----
    if (this._hasOutfit('hat')) {
      g.fillStyle(this._outfitColor('hat', 0x6a44a0), 1);
      g.fillTriangle(-22 * u, headY - headR, 22 * u, headY - headR, 0, headY - headR - 34 * u);
    }
    if (this._hasOutfit('crown')) {
      g.fillStyle(this._outfitColor('crown', 0xffd86b), 1);
      const cy = headY - headR - 4 * u;
      g.fillRect(-20 * u, cy, 40 * u, 8 * u);
      g.fillTriangle(-20 * u, cy, -8 * u, cy, -14 * u, cy - 14 * u);
      g.fillTriangle(-6 * u, cy, 6 * u, cy, 0, cy - 18 * u);
      g.fillTriangle(8 * u, cy, 20 * u, cy, 14 * u, cy - 14 * u);
    }

    // ----- Empty-slot silhouettes (closet) -----
    this.slotGfx.clear();
    if (this.showSilhouettes) {
      const slots = ['crown', 'hat', 'dress', 'shirt', 'pants', 'shoes'];
      const empty = slots.filter((s) => !this._hasOutfit(s));
      const startX = -((empty.length - 1) * 30 * u) / 2;
      empty.forEach((s, i) => {
        this.slotGfx.fillStyle(0xffffff, 0.10);
        this.slotGfx.fillRoundedRect(startX + i * 30 * u - 11 * u, 178 * u, 22 * u, 22 * u, 5 * u);
      });
    }
  }

  _drawHead(g, x, y, r, skin, shape) {
    g.fillStyle(skin, 1);
    switch (shape) {
      case 'oval': g.fillEllipse(x, y, r * 1.7, r * 2.2); break;
      case 'square': g.fillRoundedRect(x - r, y - r, r * 2, r * 2.1, r * 0.4); break;
      case 'heart':
        g.fillCircle(x, y - r * 0.1, r);
        g.fillTriangle(x - r, y + r * 0.1, x + r, y + r * 0.1, x, y + r * 1.1);
        break;
      case 'round':
      default: g.fillCircle(x, y, r); break;
    }
  }

  _drawHair(g, x, y, r, color, style) {
    const u = this.unit;
    g.fillStyle(color, 1);
    switch (style) {
      case 'short':
        g.fillCircle(x, y - r * 0.5, r * 1.05);
        g.fillRect(x - r, y - r * 0.6, r * 2, r * 0.8);
        break;
      case 'braids':
        g.fillCircle(x, y - r * 0.5, r * 1.05);
        g.fillRoundedRect(x - r - 6 * u, y - r * 0.4, 12 * u, r * 2.4, 6 * u);
        g.fillRoundedRect(x + r - 6 * u, y - r * 0.4, 12 * u, r * 2.4, 6 * u);
        break;
      case 'ponytail':
        g.fillCircle(x, y - r * 0.5, r * 1.05);
        g.fillRoundedRect(x + r - 4 * u, y - r * 0.6, 14 * u, r * 2.6, 7 * u);
        break;
      case 'long':
      default:
        g.fillCircle(x, y - r * 0.5, r * 1.1);
        g.fillRoundedRect(x - r - 4 * u, y - r * 0.5, 10 * u, r * 3.0, 5 * u);
        g.fillRoundedRect(x + r - 6 * u, y - r * 0.5, 10 * u, r * 3.0, 5 * u);
        break;
    }
  }
}
