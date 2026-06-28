// src/characters/Pip.js
//
// Pip — the fairy guide. Reusable across every scene. The build doc sketches
// Pip as a Sprite with animation frames, but Phase 2 has no art, so Pip is
// drawn procedurally as a Container with the SAME public API the real Pip will
// expose: say(), express(), pointAt(), react(), plus an always-moving idle.
//
// Swap-in note: when a pip spritesheet exists, replace the _build() drawing
// with sprite frames and map express()/react() to animation keys — callers
// won't change.

import VoiceManager from '../systems/VoiceManager.js';

const EXPRESSIONS = ['idle', 'fly', 'excited', 'concerned', 'laugh', 'tearful', 'thinking', 'bow', 'spin'];

export default class Pip extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    this.scale_ = opts.scale ?? 1;
    this.setScale(this.scale_);
    this.emotion = 'idle';
    this._voiceQueue = [];
    this._speaking = false;
    this._currentVoice = null;
    this.tear = null;

    this._build();
    this._startIdle();

    scene.events.once('shutdown', () => this.destroy());
  }

  _build() {
    const s = this.scene;

    // Soft glow halo.
    this.halo = s.add.ellipse(0, 0, 70, 70, 0xfff2b0, 0.18).setBlendMode(Phaser.BlendModes.ADD);

    // Wings.
    this.wingL = s.add.ellipse(-14, -4, 28, 44, 0xbfeaff, 0.75).setBlendMode(Phaser.BlendModes.ADD);
    this.wingR = s.add.ellipse(14, -4, 28, 44, 0xbfeaff, 0.75).setBlendMode(Phaser.BlendModes.ADD);

    // Body + head.
    this.body_ = s.add.ellipse(0, 6, 28, 34, 0xffd36b, 1);
    this.head = s.add.circle(0, -16, 15, 0xffe39a, 1);

    // Antennae.
    this.antL = s.add.circle(-8, -32, 2.6, 0xff9ed6, 1);
    this.antR = s.add.circle(8, -32, 2.6, 0xff9ed6, 1);

    // Eyes + mouth (re-drawn per expression).
    this.eyeL = s.add.graphics();
    this.eyeR = s.add.graphics();
    this.mouth = s.add.graphics();

    // Optional borrowed glasses (Pip sometimes adjusts Benny's).
    this.glasses = s.add.graphics();
    this.glasses.setVisible(false);

    // A little arm used for pointing/gestures.
    this.arm = s.add.graphics();

    this.add([
      this.halo, this.wingL, this.wingR, this.body_, this.head,
      this.antL, this.antR, this.eyeL, this.eyeR, this.mouth, this.glasses, this.arm
    ]);

    this._drawFace('idle');
  }

  _drawFace(emotion) {
    const eL = this.eyeL; const eR = this.eyeR; const m = this.mouth;
    eL.clear(); eR.clear(); m.clear();
    const ink = 0x3a2140;

    const eyeDot = (g, cx) => { g.fillStyle(ink, 1); g.fillCircle(cx, -17, 2.6); };
    const eyeWide = (g, cx) => { g.fillStyle(0xffffff, 1); g.fillCircle(cx, -17, 4.2); g.fillStyle(ink, 1); g.fillCircle(cx, -17, 2.4); };
    const eyeHappy = (g, cx) => { g.lineStyle(2.4, ink, 1); g.beginPath(); g.arc(cx, -16, 4, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath(); };
    const eyeDroop = (g, cx) => { g.lineStyle(2.4, ink, 1); g.beginPath(); g.arc(cx, -15, 4, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath(); };

    switch (emotion) {
      case 'excited':
        eyeWide(eL, -6); eyeWide(eR, 6);
        m.fillStyle(ink, 1); m.fillEllipse(0, -7, 10, 8); // open smile
        break;
      case 'laugh':
        eyeHappy(eL, -6); eyeHappy(eR, 6);
        m.fillStyle(ink, 1); m.slice(0, -8, 8, 0, Math.PI, false); m.fillPath();
        break;
      case 'concerned':
        eyeDot(eL, -6); eyeDot(eR, 6);
        m.lineStyle(2.4, ink, 1); m.beginPath(); m.arc(0, -4, 5, Math.PI * 1.15, Math.PI * 1.85, false); m.strokePath(); // small frown
        break;
      case 'tearful':
        eyeDroop(eL, -6); eyeDroop(eR, 6);
        m.lineStyle(2.4, ink, 1); m.beginPath(); m.arc(0, -4, 5, Math.PI * 1.2, Math.PI * 1.8, false); m.strokePath();
        break;
      case 'thinking':
        eyeDot(eL, -6); eyeWide(eR, 6);
        m.lineStyle(2.4, ink, 1); m.lineBetween(-4, -8, 4, -8);
        break;
      case 'fly':
      case 'idle':
      default:
        eyeDot(eL, -6); eyeDot(eR, 6);
        m.lineStyle(2.4, ink, 1); m.beginPath(); m.arc(0, -10, 5, Math.PI * 0.15, Math.PI * 0.85, false); m.strokePath(); // gentle smile
        break;
    }
  }

  // ---- Public API ---------------------------------------------------------

  express(emotion) {
    if (!EXPRESSIONS.includes(emotion)) emotion = 'idle';

    // One-shot animations that settle back to idle.
    if (emotion === 'bow') {
      this._drawFace('idle');
      this.scene.tweens.add({ targets: this, angle: 18, y: this.y + 6, duration: 400, yoyo: true, hold: 500, ease: 'Sine.easeInOut' });
      this.emotion = 'idle';
      return this;
    }
    if (emotion === 'spin') {
      this.express('excited');
      this.scene.tweens.add({ targets: this, angle: this.angle + 360, duration: 600, ease: 'Cubic.easeInOut', onComplete: () => { this.angle = 0; } });
      return this;
    }

    this.emotion = emotion;
    this._drawFace(emotion);

    // Wing speed by mood.
    const speed = (emotion === 'fly' || emotion === 'excited') ? 90
      : (emotion === 'tearful') ? 320 : 150;
    this._setWingSpeed(speed);

    // Body lean for fly.
    this.scene.tweens.add({
      targets: this.body_, angle: emotion === 'fly' ? 8 : 0, duration: 250
    });

    // Tear for tearful.
    if (emotion === 'tearful' && !this.tear) {
      this.tear = this.scene.add.circle(6, -12, 2.4, 0x9fdcff, 0.95);
      this.add(this.tear);
      this.scene.tweens.add({ targets: this.tear, y: 4, alpha: 0, duration: 1200, repeat: -1 });
    } else if (emotion !== 'tearful' && this.tear) {
      this.tear.destroy(); this.tear = null;
    }

    if (emotion === 'excited') {
      this.scene.tweens.add({ targets: this, y: this.y - 8, duration: 160, yoyo: true, ease: 'Sine.easeInOut' });
    }
    return this;
  }

  // Queue a voiced line. onComplete fires when (placeholder) playback ends.
  say(audioKey, onComplete) {
    this._voiceQueue.push({ audioKey, onComplete });
    this._drainVoice();
    return this;
  }

  _drainVoice() {
    if (this._speaking || this._voiceQueue.length === 0) return;
    const { audioKey, onComplete } = this._voiceQueue.shift();
    this._speaking = true;

    // Talking mouth flutter.
    const talk = this.scene.tweens.add({
      targets: this.mouth, scaleY: 0.6, duration: 130, yoyo: true, repeat: -1
    });

    this._currentVoice = VoiceManager.play(this.scene, audioKey, () => {
      talk.remove();
      this.mouth.setScale(1);
      this._speaking = false;
      this._currentVoice = null;
      if (onComplete) onComplete();
      this._drainVoice();
    });
  }

  // Stop any current/queued speech immediately (e.g. when skipping).
  silence() {
    this._voiceQueue = [];
    if (this._currentVoice) { this._currentVoice.stop(); this._currentVoice = null; }
    this._speaking = false;
    this.mouth.setScale(1);
    return this;
  }

  isSpeaking() { return this._speaking; }

  // Gesture toward a world point.
  pointAt(x, y) {
    const dir = x < this.x ? -1 : 1;
    this.arm.clear();
    this.arm.lineStyle(4, 0xffe39a, 1);
    this.arm.lineBetween(dir * 8, 4, dir * 22, -2);
    this.scene.tweens.add({ targets: this, angle: dir * 4, duration: 200, yoyo: true });
    return this;
  }

  // Encounter reactions.
  react(type) {
    switch (type) {
      case 'correct': this.express('excited'); this.say('pip_correct'); break;
      case 'wrong': this.express('concerned'); this.say('pip_wrong'); break;
      case 'hint1': this.express('thinking'); this.say('pip_thinking'); break;
      case 'hint2': this.express('thinking'); this.say('pip_thinking'); break;
      case 'hint3': this.express('concerned'); this.say('pip_thinking'); break;
      default: break;
    }
    this.scene.time.delayedCall(1400, () => { if (this.active) this.express('idle'); });
    return this;
  }

  // ---- Idle behaviour -----------------------------------------------------

  _setWingSpeed(duration) {
    if (this._wingTween) this._wingTween.remove();
    this._wingTween = this.scene.tweens.add({
      targets: [this.wingL, this.wingR], scaleX: 0.35, duration, yoyo: true, repeat: -1
    });
  }

  _startIdle() {
    this._setWingSpeed(150);
    // Gentle bob.
    this._bob = this.scene.tweens.add({
      targets: this, y: this.y + 6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    // Occasional head tilt.
    this._tiltTimer = this.scene.time.addEvent({
      delay: 3800, loop: true, callback: () => {
        if (this._speaking) return;
        this.scene.tweens.add({ targets: this.head, angle: Phaser.Math.Between(-8, 8), duration: 350, yoyo: true });
      }
    });
    // Occasionally adjusts (borrowed) glasses.
    this._glassesTimer = this.scene.time.addEvent({
      delay: 9000, loop: true, callback: () => {
        if (this._speaking) return;
        this._flashGlasses();
      }
    });
    this.halo && this.scene.tweens.add({ targets: this.halo, alpha: 0.28, duration: 2000, yoyo: true, repeat: -1 });
  }

  _flashGlasses() {
    const g = this.glasses;
    g.clear();
    g.lineStyle(2, 0xeeeeee, 0.9);
    g.strokeCircle(-6, -17, 5);
    g.strokeCircle(6, -17, 5);
    g.lineBetween(-1, -17, 1, -17);
    g.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: g, alpha: 1, duration: 200, yoyo: true, hold: 600, onComplete: () => g.setVisible(false) });
  }

  destroy(fromScene) {
    if (this._wingTween) this._wingTween.remove();
    if (this._bob) this._bob.remove();
    if (this._tiltTimer) this._tiltTimer.remove();
    if (this._glassesTimer) this._glassesTimer.remove();
    if (this._currentVoice) this._currentVoice.stop();
    super.destroy(fromScene);
  }
}
