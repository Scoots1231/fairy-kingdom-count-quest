// src/ui/Cursor.js
//
// The custom wand cursor. Replaces the OS cursor on the game canvas and is
// applied globally across every scene. Built procedurally for Phase 1 so it
// runs with no art assets — when a real wand PNG (~48x48, star at tip) lands
// in assets/images/cursor/, swap WAND_TEXTURE generation for a loaded image
// and keep the same hotspot/origin math.
//
// The STAR TIP is the precise click point (hotspot). The texture places the
// star centre at TIP_X/TIP_Y, and the sprite origin is set there so the tip
// always sits exactly under the pointer regardless of rotation.

import AudioManager from '../systems/AudioManager.js';

const WAND_TEXTURE = 'wandCursor';
const SPARK_TEXTURE = 'wandSpark';

const TEX_W = 56;
const TEX_H = 76;
const TIP_X = 28; // star centre x within the texture
const TIP_Y = 16; // star centre y within the texture

const GOLD = 0xffd86b;
const GOLD_BRIGHT = 0xfff3c4;
const BLUE = 0x6bb8ff;

function starPoints(cx, cy, spikes, outer, inner) {
  const pts = [];
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes; i++) {
    pts.push({ x: cx + Math.cos(rot) * outer, y: cy + Math.sin(rot) * outer });
    rot += step;
    pts.push({ x: cx + Math.cos(rot) * inner, y: cy + Math.sin(rot) * inner });
    rot += step;
  }
  return pts;
}

function ensureTextures(scene) {
  if (!scene.textures.exists(WAND_TEXTURE)) {
    const g = scene.add.graphics();

    // --- soft drop shadow (so the wand stays visible on any background) ---
    g.fillStyle(0x000000, 0.30);
    g.fillRoundedRect(TIP_X - 2 + 2, TIP_Y + 4 + 2, 7, 52, 3.5); // handle shadow
    g.fillPoints(starPoints(TIP_X + 2, TIP_Y + 2, 5, 13, 6), true); // star shadow

    // --- handle ---
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(TIP_X - 2, TIP_Y + 4, 6, 52, 3); // white core
    g.fillStyle(GOLD, 1);
    g.fillRoundedRect(TIP_X - 2, TIP_Y + 4, 4, 52, 2); // gold edge

    // --- star at the tip ---
    g.fillStyle(GOLD, 1);
    g.fillPoints(starPoints(TIP_X, TIP_Y, 5, 13, 6), true);
    g.fillStyle(GOLD_BRIGHT, 1);
    g.fillPoints(starPoints(TIP_X, TIP_Y, 5, 7, 3.2), true); // inner highlight

    g.generateTexture(WAND_TEXTURE, TEX_W, TEX_H);
    g.destroy();
  }

  if (!scene.textures.exists(SPARK_TEXTURE)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillPoints(starPoints(8, 8, 4, 8, 3), true);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 2.5);
    g.generateTexture(SPARK_TEXTURE, 16, 16);
    g.destroy();
  }
}

export default class Cursor {
  constructor(scene) {
    this.scene = scene;
    this.state = 'idle';
    this._recoverTimer = null;

    ensureTextures(scene);
    scene.input.setDefaultCursor('none');

    const start = scene.input.activePointer;

    // Sparkle trail emitted from the star tip.
    this.emitter = scene.add.particles(0, 0, SPARK_TEXTURE, {
      speed: { min: 6, max: 26 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 650,
      frequency: 90,
      quantity: 1,
      tint: GOLD,
      blendMode: 'ADD'
    });
    this.emitter.setDepth(9998);

    // The wand sprite. Origin at the star tip = exact click hotspot.
    this.wand = scene.add.image(start.x, start.y, WAND_TEXTURE);
    this.wand.setOrigin(TIP_X / TEX_W, TIP_Y / TEX_H);
    this.wand.setDepth(9999);
    this.wand.setRotation(-0.32); // gentle idle angle
    this.emitter.startFollow(this.wand);

    // Gentle idle sway.
    this._idleTween = scene.tweens.add({
      targets: this.wand,
      rotation: -0.20,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this._onMove = (pointer) => {
      this.wand.setPosition(pointer.x, pointer.y);
    };
    scene.input.on('pointermove', this._onMove);

    // Keep the cursor on top and clean up with the scene.
    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  // Move the cursor programmatically (used by keyboard focus).
  moveTo(x, y) {
    if (this.wand) this.wand.setPosition(x, y);
  }

  setState(state) {
    if (!this.wand) return;
    const prev = this.state;
    this.state = state;
    // Sound feedback (only on transitions into the state).
    if (state !== prev) {
      if (state === 'hover') AudioManager.sfx('hover');
      else if (state === 'click') AudioManager.sfx('click');
      else if (state === 'correct') AudioManager.sfx('correct');
      else if (state === 'wrong') AudioManager.sfx('wrong');
    }
    switch (state) {
      case 'hover':
        this.emitter.setParticleTint(GOLD_BRIGHT);
        this.emitter.frequency = 45;
        this.emitter.setParticleScale(0.85);
        this.scene.tweens.add({ targets: this.wand, scale: 1.12, duration: 120, ease: 'Back.easeOut' });
        break;

      case 'click':
        this.emitter.setParticleTint(GOLD_BRIGHT);
        this.emitter.explode(12);
        this.scene.tweens.add({
          targets: this.wand,
          rotation: this.wand.rotation + Math.PI * 2,
          duration: 320,
          ease: 'Cubic.easeOut'
        });
        break;

      case 'correct':
        this.emitter.setParticleTint(GOLD);
        this.emitter.setParticleScale(1.2);
        this.emitter.explode(26);
        this.scene.time.delayedCall(120, () => this.emitter.setParticleScale(0.6));
        break;

      case 'wrong':
        this.emitter.setParticleTint(BLUE);
        this.scene.tweens.add({ targets: this.wand, alpha: 0.45, duration: 150, yoyo: true });
        this._scheduleRecover(1000);
        break;

      case 'loading':
        this.emitter.setParticleTint(GOLD_BRIGHT);
        this.emitter.frequency = 35;
        break;

      case 'idle':
      default:
        this.emitter.setParticleTint(GOLD);
        this.emitter.frequency = 90;
        this.emitter.setParticleScale(0.6);
        this.scene.tweens.add({ targets: this.wand, scale: 1, alpha: 1, duration: 150 });
        break;
    }
  }

  _scheduleRecover(ms) {
    if (this._recoverTimer) this._recoverTimer.remove();
    this._recoverTimer = this.scene.time.delayedCall(ms, () => this.setState('idle'));
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this.scene && this.scene.input) this.scene.input.off('pointermove', this._onMove);
    if (this._idleTween) this._idleTween.remove();
    if (this.emitter) this.emitter.destroy();
    if (this.wand) this.wand.destroy();
    this.wand = null;
  }
}
