// src/ui/interactive.js
//
// Shared input utilities used by every interactive element in the game.
//
// CORE RULE (from the build doc): every button and menu MUST support BOTH
// mouse click AND arrow keys + Enter, from day one. createButton() wires both
// paths, and KeyboardNav drives focus with the arrow keys + Enter/Space.
//
// All interactive elements also drive the wand cursor states (hover / click)
// via scene.wandCursor, so cursor feedback is automatic.

export class KeyboardNav {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.index = -1;
    this.active = true;

    const kb = scene.input.keyboard;
    this._onKey = (event) => {
      if (!this.active || this.items.length === 0) return;
      switch (event.code) {
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          this._move(-1);
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          this._move(1);
          break;
        case 'Enter':
        case 'Space':
          event.preventDefault();
          if (this.index >= 0) this.items[this.index].activate();
          break;
        default:
          break;
      }
    };
    kb.on('keydown', this._onKey);
    scene.events.once('shutdown', () => kb.off('keydown', this._onKey));
    scene.events.once('destroy', () => kb.off('keydown', this._onKey));
  }

  register(api) {
    this.items.push(api);
    return api;
  }

  clear() {
    this.items = [];
    this.index = -1;
  }

  setActive(on) {
    this.active = on;
    if (!on && this.index >= 0) {
      this.items[this.index].blur();
      this.index = -1;
    }
  }

  focusItem(api) {
    const i = this.items.indexOf(api);
    if (i === -1) return;
    this._setIndex(i);
  }

  _move(dir) {
    if (this.index === -1) {
      this._setIndex(0);
      return;
    }
    const next = (this.index + dir + this.items.length) % this.items.length;
    this._setIndex(next);
  }

  _setIndex(i) {
    if (this.index === i) return;
    if (this.index >= 0) this.items[this.index].blur();
    this.index = i;
    this.items[this.index].focus();
  }
}

// Create a fully wired button (mouse + keyboard, cursor feedback, focus glow).
// Returns { container, api, destroy }.
export function createButton(scene, opts) {
  const {
    x, y,
    label,
    onActivate,
    nav,
    width = 360,
    height = 84,
    fontSize = 30,
    primary = true
  } = opts;

  const container = scene.add.container(x, y);
  const radius = height / 2;

  const baseFill = primary ? 0x7b3fb5 : 0x4a2d6b;
  const focusFill = primary ? 0x9d57e0 : 0x6a44a0;

  const bg = scene.add.graphics();
  const drawBg = (fill, glow) => {
    bg.clear();
    if (glow) {
      bg.fillStyle(0xffd86b, 0.25);
      bg.fillRoundedRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16, radius + 8);
    }
    bg.fillStyle(0x000000, 0.25);
    bg.fillRoundedRect(-width / 2 + 3, -height / 2 + 4, width, height, radius);
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    bg.lineStyle(3, 0xffe9a8, glow ? 1 : 0.5);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  };
  drawBg(baseFill, false);

  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: `${fontSize}px`,
    color: '#fff6e0',
    align: 'center'
  }).setOrigin(0.5);

  const hit = scene.add.rectangle(0, 0, width, height, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: false });

  container.add([bg, text, hit]);

  let focused = false;
  const setFocusVisual = (on) => {
    focused = on;
    drawBg(on ? focusFill : baseFill, on);
    scene.tweens.add({ targets: container, scale: on ? 1.06 : 1, duration: 120, ease: 'Back.easeOut' });
  };

  const api = {
    focus() {
      setFocusVisual(true);
      if (scene.wandCursor) {
        scene.wandCursor.moveTo(container.x, container.y);
        scene.wandCursor.setState('hover');
      }
    },
    blur() {
      setFocusVisual(false);
      if (scene.wandCursor) scene.wandCursor.setState('idle');
    },
    activate() {
      if (scene.wandCursor) scene.wandCursor.setState('click');
      onActivate();
    },
    getCenter() {
      return { x: container.x, y: container.y };
    },
    isFocused() {
      return focused;
    }
  };

  hit.on('pointerover', () => {
    if (nav) nav.focusItem(api);
    else api.focus();
  });
  hit.on('pointerout', () => {
    if (!nav) api.blur();
  });
  hit.on('pointerdown', () => {
    if (scene.wandCursor) scene.wandCursor.setState('click');
    scene.tweens.add({ targets: container, scale: 0.97, duration: 80, yoyo: true });
  });
  hit.on('pointerup', () => onActivate());

  if (nav) nav.register(api);

  return {
    container,
    api,
    destroy() { container.destroy(); }
  };
}
