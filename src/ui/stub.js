// src/ui/stub.js
//
// Shared helper for Phase 1 placeholder scenes. Renders a centred title plus
// optional buttons, and brings the wand cursor + keyboard nav into the scene
// so the cursor truly works "across all screens". Real scenes replace these.

import Cursor from './Cursor.js';
import { KeyboardNav, createButton } from './interactive.js';

const W = 1280;
const H = 720;

// opts: { title, subtitle?, actions?: [{label, onActivate}], fadeIn? }
// If no actions are given, the whole scene returns to MainMenu on click/Enter.
export function buildStub(scene, opts) {
  const { title, subtitle, actions } = opts;

  scene.cameras.main.setBackgroundColor('#1a0a2e');
  scene.wandCursor = new Cursor(scene);
  const nav = new KeyboardNav(scene);
  scene.nav = nav;

  scene.add.text(W / 2, H * 0.30, title, {
    fontFamily: 'Georgia, serif', fontSize: '52px', color: '#ffe9a8', align: 'center'
  }).setOrigin(0.5);

  if (subtitle) {
    scene.add.text(W / 2, H * 0.42, subtitle, {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#cdb6e8', align: 'center',
      wordWrap: { width: 900 }
    }).setOrigin(0.5);
  }

  if (actions && actions.length) {
    const startY = H * 0.58;
    const gap = 100;
    actions.forEach((a, i) => {
      createButton(scene, {
        x: W / 2, y: startY + i * gap, label: a.label,
        width: 420, height: 78, fontSize: 26, primary: i === 0, nav,
        onActivate: a.onActivate
      });
    });
  } else {
    const hint = scene.add.text(W / 2, H * 0.6, 'Click or press Enter to return to the menu', {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#9d86c0'
    }).setOrigin(0.5);
    scene.tweens.add({ targets: hint, alpha: 0.4, duration: 1000, yoyo: true, repeat: -1 });

    scene.input.on('pointerdown', () => {
      scene.wandCursor.setState('click');
      scene.scene.start('MainMenu');
    });
    scene.input.keyboard.on('keydown-ENTER', () => scene.scene.start('MainMenu'));
    scene.input.keyboard.on('keydown-SPACE', () => scene.scene.start('MainMenu'));
  }

  scene.cameras.main.fadeIn(400, 26, 10, 46);
}

export function fadeTo(scene, key) {
  if (scene.wandCursor) scene.wandCursor.setState('loading');
  if (scene.nav) scene.nav.setActive(false);
  scene.cameras.main.fadeOut(500, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key));
}
