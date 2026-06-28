// src/scenes/MainMenu.js
//
// The main menu. Two states driven by whether a save file has been loaded:
//   State 1 — no save loaded: only "New Adventure".
//   State 2 — save loaded: "Continue Adventure" + "New Adventure", welcome name.
//
// Background, castle, Pip and the wand cursor are all drawn procedurally for
// Phase 1 (no art assets yet). Pip's voiced lines are shown as on-screen
// speech with an audio hook (playVoice) ready for real audio in a later phase.

import SaveSystem from '../systems/SaveSystem.js';
import Cursor from '../ui/Cursor.js';
import { KeyboardNav, createButton } from '../ui/interactive.js';

const W = 1280;
const H = 720;

export default class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a0a2e');

    this.buildBackground();
    this.buildTitle();
    this.buildPip();

    this.wandCursor = new Cursor(this);

    this.buttons = [];
    this.dialog = null;
    this.nav = new KeyboardNav(this);

    this.buildLoadButton();
    this.renderState();

    // Friendly notice on browsers without the File System Access API.
    if (!window.showOpenFilePicker) {
      this.add.text(W / 2, H - 24, 'For saving to a thumb drive, please play in Chrome or Edge ✨', {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#cdb6e8'
      }).setOrigin(0.5).setDepth(70);
    }

    this.cameras.main.fadeIn(600, 26, 10, 46);
  }

  // -------------------------------------------------------------------------
  // Background — twilight forest, stars, castle silhouette, fireflies
  // -------------------------------------------------------------------------
  buildBackground() {
    const g = this.add.graphics();
    // Vertical twilight gradient: deep purple sky to warmer horizon.
    g.fillGradientStyle(0x140826, 0x140826, 0x3a1c54, 0x4a2a36, 1);
    g.fillRect(0, 0, W, H);

    // Drifting stars.
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.62);
      const r = Phaser.Math.FloatBetween(0.6, 2.0);
      const star = this.add.circle(x, y, r, 0xffffff, Phaser.Math.FloatBetween(0.4, 1));
      this.tweens.add({
        targets: star,
        alpha: 0.2,
        duration: Phaser.Math.Between(1200, 3200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
      this.stars.push(star);
    }

    // Castle silhouette with a warm glow on the horizon.
    const glow = this.add.ellipse(W / 2, H * 0.66, 520, 200, 0xffb86b, 0.18);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.30, duration: 2600, yoyo: true, repeat: -1 });

    const c = this.add.graphics();
    c.fillStyle(0x0d0418, 1);
    const baseY = H * 0.70;
    c.fillRect(W / 2 - 150, baseY, 300, 90);            // keep
    c.fillRect(W / 2 - 190, baseY + 20, 60, 70);        // left tower
    c.fillRect(W / 2 + 130, baseY + 20, 60, 70);        // right tower
    c.fillRect(W / 2 - 30, baseY - 50, 60, 90);         // central spire base
    // Tower tops (triangles).
    c.fillTriangle(W / 2 - 190, baseY + 20, W / 2 - 130, baseY + 20, W / 2 - 160, baseY - 30);
    c.fillTriangle(W / 2 + 130, baseY + 20, W / 2 + 190, baseY + 20, W / 2 + 160, baseY - 30);
    c.fillTriangle(W / 2 - 30, baseY - 50, W / 2 + 30, baseY - 50, W / 2, baseY - 110);
    // Warm lit windows.
    c.fillStyle(0xffd98a, 0.9);
    [[-160, 55], [160, 55], [0, -20], [-90, 60], [90, 60]].forEach(([dx, dy]) => {
      c.fillRect(W / 2 + dx - 5, baseY + dy, 10, 16);
    });

    // Foreground tree-line silhouette.
    const fg = this.add.graphics();
    fg.fillStyle(0x080310, 1);
    fg.fillRect(0, H - 70, W, 70);
    for (let x = -20; x < W + 40; x += 90) {
      fg.fillTriangle(x, H - 70, x + 90, H - 70, x + 45, H - 70 - Phaser.Math.Between(60, 120));
    }

    // Bobbing fireflies in the foreground.
    for (let i = 0; i < 14; i++) {
      const fx = Phaser.Math.Between(40, W - 40);
      const fy = Phaser.Math.Between(H * 0.55, H - 60);
      const fly = this.add.circle(fx, fy, Phaser.Math.FloatBetween(1.5, 3), 0xfff2a8, 0.9);
      fly.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: fly,
        x: fx + Phaser.Math.Between(-50, 50),
        y: fy + Phaser.Math.Between(-40, 40),
        alpha: 0.2,
        duration: Phaser.Math.Between(1800, 3600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1500)
      });
    }
  }

  buildTitle() {
    const title = this.add.text(W / 2, H * 0.17, 'Fairy Kingdom\nCount Quest', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '64px',
      color: '#ffe9a8',
      align: 'center',
      fontStyle: 'bold',
      stroke: '#5a2b8c',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 4, color: '#1a0a2e', blur: 12, fill: true }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scale: 1.03,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // -------------------------------------------------------------------------
  // Pip — perched to the right of the title with an idle wing flutter
  // -------------------------------------------------------------------------
  buildPip() {
    const px = W * 0.78;
    const py = H * 0.20;
    const pip = this.add.container(px, py);

    // Branch.
    const branch = this.add.graphics();
    branch.lineStyle(8, 0x4a2f1a, 1);
    branch.beginPath();
    branch.moveTo(40, 70);
    branch.lineTo(180, 90);
    branch.strokePath();

    // Wings (animated).
    const wingL = this.add.ellipse(-12, -6, 26, 40, 0xbfeaff, 0.75);
    const wingR = this.add.ellipse(12, -6, 26, 40, 0xbfeaff, 0.75);
    wingL.setBlendMode(Phaser.BlendModes.ADD);
    wingR.setBlendMode(Phaser.BlendModes.ADD);

    // Body + head.
    const body = this.add.ellipse(0, 4, 26, 32, 0xffd36b, 1);
    const head = this.add.circle(0, -16, 14, 0xffe39a, 1);
    const eyeL = this.add.circle(-5, -17, 2.4, 0x33203a, 1);
    const eyeR = this.add.circle(5, -17, 2.4, 0x33203a, 1);
    const antL = this.add.circle(-7, -30, 2.5, 0xff9ed6, 1);
    const antR = this.add.circle(7, -30, 2.5, 0xff9ed6, 1);

    pip.add([branch, wingL, wingR, body, head, eyeL, eyeR, antL, antR]);
    pip.setDepth(50);

    // Flutter + gentle bob.
    this.tweens.add({ targets: [wingL, wingR], scaleX: 0.4, duration: 140, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: pip, y: py - 8, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.pip = pip;
    this.buildSpeechBubble();
  }

  buildSpeechBubble() {
    this.speech = this.add.container(W * 0.78 - 30, H * 0.34).setDepth(60);
    this.speechBg = this.add.graphics();
    this.speechText = this.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#3a1f55',
      align: 'center',
      wordWrap: { width: 300 }
    }).setOrigin(0.5);
    this.speech.add([this.speechBg, this.speechText]);
    this.speech.setVisible(false);
  }

  showPipSpeech(text) {
    this.speechText.setText(text);
    const b = this.speechText.getBounds();
    const pad = 18;
    const w = b.width + pad * 2;
    const h = b.height + pad * 2;
    this.speechBg.clear();
    this.speechBg.fillStyle(0xfff6e0, 0.96);
    this.speechBg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    this.speechBg.lineStyle(3, 0xffd86b, 1);
    this.speechBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    // Little pointer up toward Pip.
    this.speechBg.fillStyle(0xfff6e0, 0.96);
    this.speechBg.fillTriangle(20, -h / 2, 60, -h / 2, 30, -h / 2 - 18);
    this.speech.setVisible(true);
  }

  // Audio hook — wired for Howler-based voice lines in a later phase.
  playVoice(/* key */) {
    // No voice assets in Phase 1. Intentionally a no-op for now.
  }

  // -------------------------------------------------------------------------
  // State rendering
  // -------------------------------------------------------------------------
  renderState() {
    // Clear any existing menu buttons (not the persistent Load button).
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];
    this.nav.clear();
    if (this.welcomeText) { this.welcomeText.destroy(); this.welcomeText = null; }
    // Re-register the load button into the (cleared) nav.
    if (this.loadApi) this.nav.register(this.loadApi);

    const hasSave = SaveSystem.hasSaveData();

    if (hasSave) {
      const name = SaveSystem.get('playerName') || 'Princess';
      this.welcomeText = this.add.text(W / 2, H * 0.40, `Welcome back, ${name}`, {
        fontFamily: 'Georgia, serif', fontSize: '28px', color: '#ffe9a8'
      }).setOrigin(0.5).setDepth(40);

      // After the coronation the menu gains a third option: Revisit My Kingdom.
      const kingdomWon = SaveSystem.get('progress.act4Complete');
      const cont = createButton(this, {
        x: W / 2, y: kingdomWon ? H * 0.50 : H * 0.55, label: '✨ Continue Adventure',
        width: 420, height: 84, fontSize: 30, primary: true, nav: this.nav,
        onActivate: () => this.continueAdventure()
      });
      this.buttons.push(cont);
      if (kingdomWon) {
        const revisit = createButton(this, {
          x: W / 2, y: H * 0.63, label: '👑 Revisit My Kingdom',
          width: 420, height: 76, fontSize: 26, primary: false, nav: this.nav,
          onActivate: () => this.gotoRevisit()
        });
        this.buttons.push(revisit);
      }
      const fresh = createButton(this, {
        x: W / 2, y: kingdomWon ? H * 0.76 : H * 0.68, label: '🌟 New Adventure',
        width: 360, height: 70, fontSize: 24, primary: false, nav: this.nav,
        onActivate: () => this.onNewAdventure()
      });
      this.buttons.push(fresh);
      this.showPipSpeech('Welcome back! Ready to\ncontinue your journey?');
      this.playVoice('pip_welcome_back');
    } else {
      const fresh = createButton(this, {
        x: W / 2, y: H * 0.58, label: '✨ New Adventure',
        width: 420, height: 96, fontSize: 34, primary: true, nav: this.nav,
        onActivate: () => this.onNewAdventure()
      });
      this.buttons.push(fresh);
      this.showPipSpeech('Hello there! Shall we\nbegin a new adventure?');
      this.playVoice('pip_new_game');
    }
  }

  buildLoadButton() {
    const btn = createButton(this, {
      x: 170, y: H - 56, label: 'Load Save from Drive 💾',
      width: 300, height: 64, fontSize: 20, primary: false, nav: null,
      onActivate: () => this.onLoadSave()
    });
    this.loadButton = btn;
    this.loadApi = btn.api;
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  async onLoadSave() {
    if (!window.showOpenFilePicker) {
      this.showPipSpeech('Oh! This browser can\'t open\nsave files. Try Chrome or Edge.');
      return;
    }
    const result = await SaveSystem.loadFromDrive();
    if (result.success) {
      this.renderState();
    } else if (result.reason === 'corrupt') {
      this.showPipSpeech('Something seems wrong with your\nsave file... we may need to start fresh.');
    } else if (result.reason === 'io') {
      this.showPipSpeech('Hmm... I couldn\'t read that save.\nIs the thumb drive plugged in properly?');
    } else {
      // Cancelled or no file chosen.
      this.showPipSpeech('Oh! I couldn\'t find your save\nfile. Shall we start fresh?');
      this.playVoice('pip_no_save');
    }
  }

  onNewAdventure() {
    // Confirmation only when a save is currently loaded.
    if (SaveSystem.hasSaveData()) {
      this.showConfirmDialog();
    } else {
      this.beginNewAdventure();
    }
  }

  beginNewAdventure() {
    SaveSystem.saveData = SaveSystem.createNewSave();
    this.fadeToScene('Cinematic');
  }

  continueAdventure() {
    this.fadeToScene('PrincessRoom');
  }

  gotoRevisit() {
    this.fadeToScene('ActSelect');
  }

  fadeToScene(key) {
    if (this.wandCursor) this.wandCursor.setState('loading');
    this.nav.setActive(false);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  // -------------------------------------------------------------------------
  // New Adventure confirmation dialog
  // -------------------------------------------------------------------------
  showConfirmDialog() {
    if (this.dialog) return;
    this.nav.setActive(false);

    const name = SaveSystem.get('playerName') || 'the Princess';
    const dialog = this.add.container(0, 0).setDepth(2000);

    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x0a0418, 0.65);
    const panel = this.add.graphics();
    panel.fillStyle(0x2a1646, 0.98);
    panel.fillRoundedRect(W / 2 - 380, H / 2 - 190, 760, 380, 24);
    panel.lineStyle(4, 0xffd86b, 1);
    panel.strokeRoundedRect(W / 2 - 380, H / 2 - 190, 760, 380, 24);

    const msg = this.add.text(
      W / 2, H / 2 - 70,
      `Are you sure? Princess ${name}'s whole journey —\nher room, her wardrobe, her fairy dust —\neverything will be forgotten forever...`,
      {
        fontFamily: 'Georgia, serif', fontSize: '24px', color: '#fff6e0',
        align: 'center', lineSpacing: 8
      }
    ).setOrigin(0.5);

    dialog.add([shade, panel, msg]);

    const dialogNav = new KeyboardNav(this);

    const yes = createButton(this, {
      x: W / 2 - 180, y: H / 2 + 90, label: 'Yes, start fresh',
      width: 280, height: 80, fontSize: 24, primary: false, nav: dialogNav,
      onActivate: () => { this.closeDialog(dialogNav); this.beginNewAdventure(); }
    });
    const no = createButton(this, {
      x: W / 2 + 180, y: H / 2 + 90, label: 'No, take me back',
      width: 280, height: 80, fontSize: 24, primary: true, nav: dialogNav,
      onActivate: () => { this.closeDialog(dialogNav); }
    });
    dialog.add([yes.container, no.container]);

    this.showPipSpeech('Are you sure?');
    this.dialog = dialog;
    this.dialogNav = dialogNav;
  }

  closeDialog(dialogNav) {
    if (dialogNav) dialogNav.setActive(false);
    if (this.dialog) { this.dialog.destroy(); this.dialog = null; }
    this.nav.setActive(true);
    this.renderState();
  }
}
