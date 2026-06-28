// src/scenes/Cinematic.js — Phase 1 stub (opening storyboard).
// New Adventure flow: Cinematic -> Customization -> Act 1.

import { buildStub, fadeTo } from '../ui/stub.js';

export default class Cinematic extends Phaser.Scene {
  constructor() { super('Cinematic'); }

  create() {
    buildStub(this, {
      title: 'Opening Story',
      subtitle: 'The fairy kingdom awaits... (cinematic coming soon)',
      actions: [
        { label: '✨ Continue', onActivate: () => fadeTo(this, 'Customization') }
      ]
    });
  }
}
