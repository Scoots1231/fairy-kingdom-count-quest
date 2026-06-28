// src/ui/HintSystem.js
//
// Pip's three-tier hint escalation. Used by every encounter type in every act.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ NON-NEGOTIABLE LANGUAGE RULE:                                             │
// │ Pip must NEVER say "wrong", "no", "incorrect", "bad", or "try again".     │
// │ Hints are warm and encouraging. assertClean() guards every line — if a    │
// │ forbidden word ever slips in, it is logged loudly in development.         │
// └─────────────────────────────────────────────────────────────────────────┘

import VoiceManager from '../systems/VoiceManager.js';

const FORBIDDEN = ['wrong', 'no ', 'incorrect', 'bad', 'try again'];

function assertClean(line) {
  const lower = ` ${line.toLowerCase()} `;
  for (const word of FORBIDDEN) {
    if (lower.includes(word)) {
      // eslint-disable-next-line no-console
      console.error(`[HINT LANGUAGE VIOLATION] forbidden phrase "${word.trim()}" in: "${line}"`);
    }
  }
  return line;
}

// Topic-specific hint copy for Act 1 (warm, never clinical).
function hintLine(type, tier, q) {
  if (type === 'countObjects') {
    if (tier === 1) return "Ooh, almost! Let's count each one together, nice and slow...";
    if (tier === 2) return 'Watch my wand — I will touch each one as we count.';
    return `Look — there are exactly ${q.count}. This one here says ${q.count}. Tap it with me!`;
  }
  if (type === 'pickNumber') {
    if (tier === 1) return "Hmm. Let's look at the shape carved on the gate again.";
    if (tier === 2) return "See the gate's number? Find the stone that looks just the same.";
    return `The gate shows ${q.target}. This stone is ${q.target} too — they match! Tap it.`;
  }
  // whichMore
  const more = Math.max(q.groupA, q.groupB);
  const less = Math.min(q.groupA, q.groupB);
  const side = q.answer === 'left' ? 'left' : 'right';
  if (tier === 1) return "Let's count both sides again, nice and slow.";
  if (tier === 2) return `This side has ${q.groupA}, that side has ${q.groupB}. Which is the bigger pile?`;
  return `${more} is more than ${less}, so the ${side} side wins. Touch that side!`;
}

export default class HintSystem {
  constructor(scene, pip) {
    this.scene = scene;
    this.pip = pip;
    this.bubble = null;
  }

  // tier: 1|2|3. ctx: { type, question, getCorrectObject() }
  showHint(tier, ctx) {
    const line = assertClean(hintLine(ctx.type, tier, ctx.question));

    // Wand cursor "wrong" feedback (tip dims, blue sparkle) — never the word.
    if (this.scene.wandCursor) this.scene.wandCursor.setState('wrong');

    if (tier === 1) {
      this.pip.express('concerned');
    } else if (tier === 2) {
      this.pip.express('thinking');
      const obj = ctx.getCorrectObject && ctx.getCorrectObject();
      if (obj) this.pip.pointAt(obj.x, obj.y);
    } else {
      // Tier 3 — guide clearly to the correct answer; she still clicks it herself.
      this.pip.express('idle');
      const obj = ctx.getCorrectObject && ctx.getCorrectObject();
      if (obj) {
        this.pip.pointAt(obj.x, obj.y);
        this.highlightCorrect(obj);
      }
    }

    this.showBubble(line);
    // Speak the hint aloud (TTS) so a non-reading child hears it.
    if (this._hintVoice) this._hintVoice.stop();
    this._hintVoice = VoiceManager.speakText(this.scene, line);
    return line;
  }

  // Warm celebration after a tier-3 guided answer — as if she figured it out.
  celebrateGuided() {
    this.clearBubble();
    this.clearGlow();
    this.pip.react('correct');
  }

  highlightCorrect(obj) {
    if (!obj) return;
    this.clearGlow();
    this._glow = this.scene.add.graphics().setDepth(2500);
    const draw = (a) => {
      this._glow.clear();
      this._glow.lineStyle(6, 0x9be8a8, a);
      this._glow.strokeRoundedRect(obj.x - 72, obj.y - 72, 144, 144, 16);
    };
    draw(1);
    this._glowTween = this.scene.tweens.addCounter({
      from: 1, to: 0.3, duration: 700, yoyo: true, repeat: -1,
      onUpdate: (t) => draw(t.getValue())
    });
  }

  showBubble(text) {
    this.clearBubble();
    const px = Phaser.Math.Clamp(this.pip.x, 200, 1080);
    const py = Phaser.Math.Clamp(this.pip.y - 80, 70, 650);
    this.bubble = this.scene.add.container(px, py).setDepth(3000);
    const t = this.scene.add.text(0, 0, text, {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#3a1f55',
      align: 'center', wordWrap: { width: 360 }
    }).setOrigin(0.5);
    const b = t.getBounds();
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xfff6e0, 0.97);
    bg.fillRoundedRect(-b.width / 2 - 18, -b.height / 2 - 14, b.width + 36, b.height + 28, 16);
    bg.lineStyle(3, 0xffd86b, 1);
    bg.strokeRoundedRect(-b.width / 2 - 18, -b.height / 2 - 14, b.width + 36, b.height + 28, 16);
    this.bubble.add([bg, t]);
  }

  clearBubble() {
    if (this.bubble) { this.bubble.destroy(); this.bubble = null; }
  }

  clearGlow() {
    if (this._glowTween) { this._glowTween.remove(); this._glowTween = null; }
    if (this._glow) { this._glow.destroy(); this._glow = null; }
  }

  destroy() {
    this.clearBubble();
    this.clearGlow();
  }
}
