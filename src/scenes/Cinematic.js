// src/scenes/Cinematic.js
//
// Opening cinematic — 11 storybook panels (placeholder art this phase).
// Each panel = 3 parallax layers (bg/mid/fg) on a slow auto-drift, a Pip-voiced
// caption, and an 800ms cross-fade between panels. The player can click / press
// Enter to advance early; a "Skip" button appears after Panel 3.
//
// Flow: Panels 1–9 play, then hand to Customization. Customization returns here
// with { resume:'post' } to play Panel 10 (name entry) and Panel 11, then Act 1.

import SaveSystem from '../systems/SaveSystem.js';
import Cursor from '../ui/Cursor.js';
import Pip from '../characters/Pip.js';
import VoiceManager from '../systems/VoiceManager.js';

const W = 1280;
const H = 720;

const PANELS = [
  { key: 'cin_p1', dur: 8000, theme: 'kingdom' },
  { key: 'cin_p2', dur: 7000, theme: 'throne' },
  { key: 'cin_p3', dur: 8000, theme: 'forest' },
  { key: 'cin_p4', dur: 6000, theme: 'pipfly' },
  { key: 'cin_p5', dur: 10000, theme: 'asleep' },
  { key: 'cin_p6', dur: 8000, theme: 'asleep' },
  { key: 'cin_p7', dur: 10000, theme: 'wake' },
  { key: 'cin_p8', dur: 6000, theme: 'wake' },
  { key: 'cin_p9', dur: 8000, theme: 'mirror' },
  { key: 'cin_p10', dur: 9000, theme: 'mirror', nameEntry: true },
  { key: 'cin_p11', dur: 6000, theme: 'path' }
];

export default class Cinematic extends Phaser.Scene {
  constructor() { super('Cinematic'); }

  init(data) {
    this.resumePost = !!(data && data.resume === 'post');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0614');
    this.transitioning = false;
    this.awaitingName = false;

    this.layerHost = this.add.container(0, 0);

    // Storybook caption box.
    this.captionBox = this.add.container(W / 2, H - 70).setDepth(100);
    this.captionBg = this.add.graphics();
    this.captionText = this.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#3a1f55', align: 'center',
      wordWrap: { width: 900 }
    }).setOrigin(0.5);
    this.captionBox.add([this.captionBg, this.captionText]);

    // Narrator Pip near the caption.
    this.pip = new Pip(this, 120, H - 90, { scale: 0.9 });
    this.pip.setDepth(101);

    this.wandCursor = new Cursor(this);

    // Skip button (hidden until after Panel 3).
    this.buildSkipButton();

    // Advance on click / Enter.
    this.input.on('pointerdown', () => this.tryAdvance());
    this.input.keyboard.on('keydown-ENTER', () => { if (!this.awaitingName) this.tryAdvance(); });

    this.index = this.resumePost ? 9 : 0;
    this.showPanel(this.index, true);
  }

  buildSkipButton() {
    this.skipBtn = this.add.container(W - 110, H - 40).setDepth(120).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.4); bg.fillRoundedRect(-80, -22, 160, 44, 22);
    bg.lineStyle(2, 0xffe9a8, 0.7); bg.strokeRoundedRect(-80, -22, 160, 44, 22);
    const txt = this.add.text(0, 0, 'Skip ▶', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#ffe9a8' }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 160, 44, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    this.skipBtn.add([bg, txt, hit]);
    hit.on('pointerover', () => this.wandCursor.setState('hover'));
    hit.on('pointerout', () => this.wandCursor.setState('idle'));
    hit.on('pointerdown', (p, lx, ly, e) => { if (e) e.stopPropagation(); this.skip(); });
    this.input.keyboard.on('keydown-ESC', () => { if (this.skipBtn.visible) this.skip(); });
  }

  // ---- Panel lifecycle ----------------------------------------------------

  showPanel(i, immediate = false) {
    const panel = PANELS[i];
    const newLayers = this.buildSceneLayers(panel.theme);
    newLayers.setAlpha(immediate ? 1 : 0);
    this.layerHost.add(newLayers);

    const finish = () => {
      if (this.activeLayers && this.activeLayers !== newLayers) this.activeLayers.destroy();
      this.activeLayers = newLayers;
      this.transitioning = false;
      this.onPanelShown(i);
    };

    if (immediate) {
      finish();
    } else {
      this.transitioning = true;
      if (this.activeLayers) this.tweens.add({ targets: this.activeLayers, alpha: 0, duration: 800 });
      this.tweens.add({ targets: newLayers, alpha: 1, duration: 800, onComplete: finish });
    }

    // Caption.
    const name = SaveSystem.get('playerName') || '';
    this.setCaption(VoiceManager.caption(panel.key, name));
    this.skipBtn.setVisible(i >= 3 && !this.resumePost ? true : (this.resumePost ? true : i >= 3));
  }

  onPanelShown(i) {
    const panel = PANELS[i];
    this.pip.silence(); // stop any prior line before this panel speaks

    this.pip.express(i === 3 ? 'fly' : 'idle');

    // Voiced narration; when it ends, auto-advance (unless this panel waits for input).
    // caption:false — the cinematic shows its own storybook caption box.
    this.pip.say(panel.key, () => {
      if (panel.nameEntry) this.openNameEntry();
      else this.scheduleAutoAdvance(i);
    }, { caption: false });

    // Safety max-timeout fallback.
    if (this._autoTimer) this._autoTimer.remove();
    if (!panel.nameEntry) {
      this._autoTimer = this.time.delayedCall(panel.dur + 1500, () => this.advanceFrom(i));
    }
  }

  scheduleAutoAdvance(i) {
    if (this._postVoiceTimer) this._postVoiceTimer.remove();
    this._postVoiceTimer = this.time.delayedCall(900, () => this.advanceFrom(i));
  }

  setCaption(text) {
    this.captionText.setText(text);
    const b = this.captionText.getBounds();
    const w = b.width + 48; const h = b.height + 32;
    this.captionBg.clear();
    this.captionBg.fillStyle(0xfff6e0, 0.94);
    this.captionBg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    this.captionBg.lineStyle(3, 0xd8b25a, 1);
    this.captionBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  }

  tryAdvance() {
    if (this.transitioning || this.awaitingName) return;
    this.pip.silence();
    this.advanceFrom(this.index);
  }

  advanceFrom(i) {
    if (i !== this.index || this.transitioning || this.awaitingName) return;
    if (this._autoTimer) this._autoTimer.remove();
    if (this._postVoiceTimer) this._postVoiceTimer.remove();

    // Panel 9 (index 8) -> Customization.
    if (i === 8 && !this.resumePost) { this.gotoCustomization(); return; }
    // Panel 11 (index 10) -> Act 1.
    if (i === 10) { this.gotoAct1(); return; }

    this.index = i + 1;
    this.showPanel(this.index);
  }

  skip() {
    if (this.transitioning) return;
    this.pip.silence();
    if (this.resumePost) this.gotoAct1();
    else this.gotoCustomization();
  }

  gotoCustomization() {
    this.transitioning = true;
    this.wandCursor.setState('loading');
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Customization', { fromCinematic: true }));
  }

  gotoAct1() {
    this.transitioning = true;
    this.wandCursor.setState('loading');
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Act1'));
  }

  // ---- Panel 10: name entry ----------------------------------------------

  openNameEntry() {
    if (this.awaitingName || this._nameDone) return;
    this.awaitingName = true;
    this.nameValue = (SaveSystem.get('playerName') || '');

    const cx = W / 2; const cy = 300;
    this.nameUI = this.add.container(0, 0).setDepth(150);
    const scroll = this.add.graphics();
    scroll.fillStyle(0xf3e2bb, 0.98); scroll.fillRoundedRect(cx - 260, cy - 50, 520, 100, 18);
    scroll.lineStyle(4, 0xb8860b, 1); scroll.strokeRoundedRect(cx - 260, cy - 50, 520, 100, 18);
    const prompt = this.add.text(cx, cy - 78, 'Type your royal name (letters only):', {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#ffe9a8'
    }).setOrigin(0.5);
    this.nameText = this.add.text(cx - 230, cy - 18, '', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#3a1f55'
    });
    this.nameCursor = this.add.text(cx - 230, cy - 18, '', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#3a1f55'
    });
    this.tweens.add({ targets: this.nameCursor, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

    const hintTxt = this.add.text(cx, cy + 40, 'Press Enter to confirm', {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#7a5a2a'
    }).setOrigin(0.5);

    this.nameUI.add([scroll, prompt, this.nameText, this.nameCursor, hintTxt]);
    this.renderName();

    this._nameKeyHandler = (event) => this.onNameKey(event);
    this.input.keyboard.on('keydown', this._nameKeyHandler);
  }

  onNameKey(event) {
    if (!this.awaitingName) return;
    const k = event.key;
    if (k === 'Enter') { this.confirmName(); return; }
    if (k === 'Backspace') { this.nameValue = this.nameValue.slice(0, -1); this.renderName(); return; }
    if (/^[a-zA-Z]$/.test(k) && this.nameValue.length < 20) { // letters only, max 20
      this.nameValue += k;
      this.renderName();
    }
  }

  renderName() {
    const display = this.nameValue.length ? this.nameValue : '';
    this.nameText.setText(display);
    this.nameCursor.x = (W / 2 - 230) + this.nameText.width + 2;
    this.nameCursor.setText('|');
  }

  confirmName() {
    const name = (this.nameValue || 'Princess').trim() || 'Princess';
    SaveSystem.set('playerName', name);
    this._nameDone = true;
    this.awaitingName = false;
    if (this._nameKeyHandler) this.input.keyboard.off('keydown', this._nameKeyHandler);
    this.nameUI.destroy();

    // Pip repeats the name warmly, then advance to Panel 11.
    this.setCaption(VoiceManager.caption('cin_p10_name', name));
    this.pip.express('excited');
    this.pip.say('cin_p10_name', () => this.scheduleAutoAdvance(9), { caption: false });
  }

  // ---- Placeholder layered art -------------------------------------------

  buildSceneLayers(theme) {
    const host = this.add.container(0, 0);
    const skyMap = {
      kingdom: [0x0a0a2a, 0x241a44], throne: [0x1c1330, 0x2a1d20], forest: [0x07140c, 0x123018],
      pipfly: [0x0c1438, 0x1a2a55], asleep: [0x101a3a, 0x223a5a], wake: [0x142244, 0x2a3a66],
      mirror: [0x101a14, 0x24351f], path: [0x0c1430, 0x2a2150]
    };
    const [top, bot] = skyMap[theme] || [0x0a0614, 0x1a0a2e];

    const bg = this.add.graphics();
    bg.fillGradientStyle(top, top, bot, bot, 1);
    bg.fillRect(0, 0, W, H);
    host.add(bg);

    // Night sky elements for several themes.
    if (['kingdom', 'forest', 'pipfly', 'asleep', 'path'].includes(theme)) {
      const stars = this.add.container(0, 0);
      for (let i = 0; i < 60; i++) {
        stars.add(this.add.circle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.55),
          Phaser.Math.FloatBetween(0.6, 1.8), 0xffffff, Phaser.Math.FloatBetween(0.3, 1)));
      }
      host.add(stars);
      this.tweens.add({ targets: stars, x: -30, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Midground (parallax).
    const mid = this.add.container(0, 0);
    const mg = this.add.graphics();
    if (theme === 'kingdom') {
      mg.fillStyle(0x0d0420, 1); mg.fillRect(W / 2 - 120, H * 0.55, 240, 160);
      mg.fillTriangle(W / 2 - 30, H * 0.45, W / 2 + 30, H * 0.45, W / 2, H * 0.35);
      mg.fillStyle(0xffd98a, 0.8); mg.fillRect(W / 2 - 8, H * 0.6, 16, 24);
    } else if (theme === 'throne') {
      mg.fillStyle(0x3a2a44, 1); mg.fillRect(W / 2 - 160, H * 0.3, 80, 320);
      mg.fillRect(W / 2 + 80, H * 0.3, 80, 320);
      mg.fillStyle(0xff9e5a, 0.8); mg.fillCircle(W / 2 - 200, H * 0.4, 6); mg.fillCircle(W / 2 + 200, H * 0.4, 6);
    } else if (theme === 'mirror') {
      mg.fillStyle(0xb8860b, 1); mg.fillRoundedRect(W / 2 - 130, H * 0.2, 260, 360, 30);
      mg.fillStyle(0x2a2440, 1); mg.fillRoundedRect(W / 2 - 110, H * 0.24, 220, 320, 22);
    } else {
      // Trees / forest depth.
      mg.fillStyle(0x09180d, 1);
      for (let x = -40; x < W + 60; x += 130) {
        mg.fillTriangle(x, H * 0.8, x + 130, H * 0.8, x + 65, H * 0.3 + Phaser.Math.Between(-30, 30));
      }
    }
    mid.add(mg);
    host.add(mid);
    this.tweens.add({ targets: mid, x: 20, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Foreground (faster parallax) + mood-specific accents.
    const fg = this.add.container(0, 0);
    const fgg = this.add.graphics();
    fgg.fillStyle(0x05010a, 1); fgg.fillRect(0, H - 70, W, 70);
    fg.add(fgg);
    if (['asleep', 'wake'].includes(theme)) {
      // Sleeping girl + ring of flowers (placeholder).
      fgg.fillStyle(0xf6d7c0, 1); fgg.fillEllipse(W / 2, H * 0.7, 120, 40);
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        fg.add(this.add.circle(W / 2 + Math.cos(ang) * 120, H * 0.7 + Math.sin(ang) * 45, 6, 0xffd1e8, 0.9));
      }
    }
    if (theme === 'path') {
      fgg.fillStyle(0xffe9a8, 0.5); fgg.fillTriangle(W / 2 - 60, H, W / 2 + 60, H, W / 2, H * 0.55);
    }
    host.add(fg);
    this.tweens.add({ targets: fg, x: -30, duration: 7000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Fireflies.
    if (['kingdom', 'forest', 'pipfly', 'asleep', 'path'].includes(theme)) {
      for (let i = 0; i < 10; i++) {
        const f = this.add.circle(Phaser.Math.Between(40, W - 40), Phaser.Math.Between(H * 0.4, H - 80), 2, 0xfff2a8, 0.9).setBlendMode(Phaser.BlendModes.ADD);
        host.add(f);
        this.tweens.add({ targets: f, x: f.x + Phaser.Math.Between(-40, 40), y: f.y + Phaser.Math.Between(-30, 30), alpha: 0.2, duration: Phaser.Math.Between(1800, 3400), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
      }
    }

    return host;
  }
}
