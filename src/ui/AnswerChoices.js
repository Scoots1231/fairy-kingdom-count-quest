// src/ui/AnswerChoices.js
//
// Reusable answer-choice row for every encounter type in every act.
//
// Rules (from the build doc):
//  - 3 choices (4 at higher difficulty); all large ILLUSTRATED buttons (no
//    text-only answers) — each item supplies a render() that draws its picture.
//  - Minimum 120x120 buttons — generous targets.
//  - Mouse click selects + confirms immediately.
//  - Arrow keys cycle the highlight (glow + slight scale up); Enter confirms.
//  - The correct answer never appears in the same position twice in a row
//    (pass the previous correct index as `avoidIndex`).

const SIZE = 140; // >= 120 per spec

export default class AnswerChoices {
  // opts: { x, y, items:[{ value, render(scene, container) }], correctValue,
  //         avoidIndex, onSelect(value, index) }
  constructor(scene, opts) {
    this.scene = scene;
    this.items = opts.items.slice();
    this.correctValue = opts.correctValue;
    this.onSelect = opts.onSelect;
    this.enabled = true;
    this.focusIndex = 0;
    this.buttons = [];

    this._avoidSamePosition(opts.avoidIndex);

    const n = this.items.length;
    const gap = 36;
    const totalW = n * SIZE + (n - 1) * gap;
    const startX = opts.x - totalW / 2 + SIZE / 2;

    this.items.forEach((item, i) => {
      const bx = startX + i * (SIZE + gap);
      const c = scene.add.container(bx, opts.y).setDepth(2200);
      const bg = scene.add.graphics();
      c.add(bg);
      const art = scene.add.container(0, 0);
      item.render(scene, art);
      c.add(art);
      const hit = scene.add.rectangle(0, 0, SIZE, SIZE, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
      c.add(hit);

      const view = { container: c, bg, value: item.value, index: i };
      hit.on('pointerover', () => { if (this.enabled) { this.focusIndex = i; this.refresh(); } });
      hit.on('pointerdown', () => this.choose(i));
      this.buttons.push(view);
    });

    // Find the correct button index for hint targeting.
    this.correctIndex = this.buttons.findIndex((b) => b.value === this.correctValue);

    this._keyHandler = (e) => this.onKey(e);
    scene.input.keyboard.on('keydown', this._keyHandler);
    this.refresh();
  }

  // Reorder so the correct answer is not at `avoidIndex`.
  _avoidSamePosition(avoidIndex) {
    if (avoidIndex == null) return;
    const ci = this.items.findIndex((it) => it.value === this.correctValue);
    if (ci !== avoidIndex) return;
    const swapWith = (ci + 1) % this.items.length;
    [this.items[ci], this.items[swapWith]] = [this.items[swapWith], this.items[ci]];
  }

  onKey(e) {
    if (!this.enabled) return;
    switch (e.code) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault(); this.focusIndex = (this.focusIndex + 1) % this.buttons.length; this.refresh(); break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault(); this.focusIndex = (this.focusIndex - 1 + this.buttons.length) % this.buttons.length; this.refresh(); break;
      case 'Enter':
      case 'Space':
        e.preventDefault(); this.choose(this.focusIndex); break;
      default: break;
    }
  }

  choose(i) {
    if (!this.enabled) return;
    const view = this.buttons[i];
    this.focusIndex = i;
    this.refresh();
    if (this.onSelect) this.onSelect(view.value, i);
  }

  getButtonForValue(value) {
    const v = this.buttons.find((b) => b.value === value);
    return v ? v.container : null;
  }

  setEnabled(on) { this.enabled = on; this.refresh(); }

  refresh() {
    this.buttons.forEach((b, i) => {
      const focused = this.enabled && i === this.focusIndex;
      b.bg.clear();
      if (focused) {
        b.bg.fillStyle(0xffd86b, 0.30);
        b.bg.fillRoundedRect(-SIZE / 2 - 8, -SIZE / 2 - 8, SIZE + 16, SIZE + 16, 22);
      }
      b.bg.fillStyle(0x2a2440, 0.92);
      b.bg.fillRoundedRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 18);
      b.bg.lineStyle(focused ? 5 : 3, focused ? 0xffe9a8 : 0x6a5a8a, 1);
      b.bg.strokeRoundedRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 18);
      this.scene.tweens.add({ targets: b.container, scale: focused ? 1.08 : 1, duration: 110, ease: 'Back.easeOut' });
    });
  }

  flashCorrect() {
    const b = this.buttons[this.correctIndex];
    if (b) this.scene.tweens.add({ targets: b.container, scale: 1.2, duration: 180, yoyo: true });
  }

  // Brief left-right shake on a wrong choice (3x, ~300ms) — never harsh.
  shake(value) {
    const b = this.buttons.find((x) => x.value === value);
    if (!b) return;
    const x0 = b.container.x;
    this.scene.tweens.add({ targets: b.container, x: x0 - 8, duration: 50, yoyo: true, repeat: 3, onComplete: () => { b.container.x = x0; } });
  }

  destroy() {
    this.scene.input.keyboard.off('keydown', this._keyHandler);
    this.buttons.forEach((b) => b.container.destroy());
    this.buttons = [];
  }
}
