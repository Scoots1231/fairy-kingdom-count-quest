// src/characters/Waldo.js
//
// Waldo — the princess's companion mount. Three forms: 'none' (not yet met),
// 'horse' (after Act 1), 'unicorn' (after the Act 3 transformation). Drawn
// procedurally (placeholder) as a Container so acts can position/animate him.

export default class Waldo extends Phaser.GameObjects.Container {
  constructor(scene, x, y, form = 'horse', opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    this.form = form;
    this.setScale(opts.scale || 1);
    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.draw();
    // Gentle idle bob.
    scene.tweens.add({ targets: this, y: y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.events.once('shutdown', () => this.destroy());
  }

  setForm(form) { this.form = form; this.draw(); return this; }

  draw() {
    const g = this.gfx;
    g.clear();

    // Real Waldo art for horse / unicorn forms, when loaded.
    const key = this.form === 'unicorn' ? 'waldo_unicorn' : (this.form === 'horse' ? 'waldo_horse' : null);
    if (key && this.scene.textures.exists(key)) {
      if (!this.img) { this.img = this.scene.add.image(0, 0, key).setOrigin(0.5, 0.6); this.add(this.img); }
      this.img.setTexture(key).setVisible(true);
      this.img.setScale(170 / this.img.height);
      return;
    }
    if (this.img) this.img.setVisible(false);

    const bodyCol = this.form === 'unicorn' ? 0xf5f0ff : 0x8a5a2a;
    if (this.form === 'none') { // just a tail/treeline hint
      g.fillStyle(0x3f6f3f, 1); g.fillEllipse(0, 40, 120, 30); return;
    }
    // Body + head + legs.
    g.fillStyle(bodyCol, 1);
    g.fillEllipse(0, 0, 130, 66);
    g.fillCircle(56, -26, 24);          // head
    g.fillRect(40, -50, 8, 26);         // neck/ear region
    g.fillStyle(this.form === 'unicorn' ? 0xe8def8 : 0x6a4420, 1);
    g.fillRect(-44, 30, 12, 40); g.fillRect(-16, 30, 12, 40); g.fillRect(20, 30, 12, 40); g.fillRect(44, 30, 12, 40);
    // Mane + tail.
    g.fillStyle(this.form === 'unicorn' ? 0xc9a8ff : 0x5a3a1a, 1);
    g.fillTriangle(36, -48, 52, -48, 30, -10);
    g.fillTriangle(-64, -10, -64, 30, -84, 16); // tail
    if (this.form === 'unicorn') {
      g.fillStyle(0xffd86b, 1); g.fillTriangle(60, -44, 68, -44, 64, -76); // horn
      this.scene.tweens.killTweensOf(this.glow);
    }
  }

  // Brief horn/forehead glow (used on correct answers post-transformation).
  glowPulse() {
    if (this.form !== 'unicorn') return;
    const glow = this.scene.add.ellipse(64, -70, 30, 30, 0xfff2b0, 0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.add(glow);
    this.scene.tweens.add({ targets: glow, scaleX: 2.4, scaleY: 2.4, alpha: 0, duration: 600, onComplete: () => glow.destroy() });
  }
}
