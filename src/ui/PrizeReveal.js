// src/ui/PrizeReveal.js
//
// The end-of-act prize reveal. Runs in the act scene and returns a Promise that
// resolves once the reward (and any fairy-dust award) has been presented and
// written to SaveSystem.
//
// Uses RewardSystem (tier RNG + pity + duplicate->dust) and FairyDustManager.

import SaveSystem from '../systems/SaveSystem.js';
import RewardSystem from '../systems/RewardSystem.js';
import FairyDustManager from '../systems/FairyDustManager.js';

const W = 1280;
const H = 720;
const TIER_COLOR = { bronze: 0xc08457, silver: 0xd6dde6, gold: 0xffd24a };

// opts: { actKey, pip, performanceScore, prizePool:{bronze:[],silver:[],gold:[]} }
export default function runPrizeReveal(scene, opts) {
  return new Promise((resolve) => {
    const name = SaveSystem.get('playerName') || 'Princess';
    const score = opts.performanceScore;

    // Roll the tier (RNG by score, then hidden pity), then pick the item.
    const tier = RewardSystem.rollPrizeTier(opts.actKey, score);
    const pool = (opts.prizePool && opts.prizePool[tier]) || [];
    const item = pool.length ? pool[Phaser.Math.Between(0, pool.length - 1)] : null;

    const wardrobe = SaveSystem.get('wardrobe') || [];
    // Gold prizes are 5-piece sets; everything else is a single item.
    const isSet = !!(item && item.pieces);
    const isDuplicate = item
      ? (isSet ? item.pieces.every((p) => wardrobe.some((w) => w.id === p.id))
        : wardrobe.some((w) => w.id === item.id))
      : false;

    // Overlay.
    const layer = scene.add.container(0, 0).setDepth(6000);
    const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x0a0614, 0.85).setInteractive();
    layer.add(shade);

    const caption = scene.add.text(W / 2, 120, 'A prize from the forest!', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#ffe9a8'
    }).setOrigin(0.5);
    layer.add(caption);

    // Drumroll + chest.
    if (opts.pip) { opts.pip.express('excited'); opts.pip.say('pip_revelation'); }

    const chest = scene.add.container(W / 2, 380);
    const cg = scene.add.graphics();
    cg.fillStyle(0x6a4a28, 1); cg.fillRoundedRect(-80, -50, 160, 100, 12);
    cg.fillStyle(0x4a3018, 1); cg.fillRoundedRect(-80, -50, 160, 30, 12);
    cg.fillStyle(0xffd86b, 1); cg.fillRect(-10, -20, 20, 30);
    chest.add(cg);
    layer.add(chest);
    scene.tweens.add({ targets: chest, scaleX: 1.05, scaleY: 0.95, duration: 150, yoyo: true, repeat: 4 });

    const glow = scene.add.ellipse(W / 2, 380, 60, 60, TIER_COLOR[tier], 0.0).setBlendMode(Phaser.BlendModes.ADD);
    layer.add(glow);

    scene.time.delayedCall(1100, () => {
      // Chest opens — glow swells, item floats out.
      scene.tweens.add({ targets: glow, scaleX: 12, scaleY: 12, alpha: 0.6, duration: 700 });
      const itemArt = scene.add.container(W / 2, 360);
      const ig = scene.add.graphics();
      ig.fillStyle(TIER_COLOR[tier], 1); ig.fillRoundedRect(-34, -34, 68, 68, 12);
      ig.lineStyle(3, 0xffffff, 0.8); ig.strokeRoundedRect(-34, -34, 68, 68, 12);
      itemArt.add(ig);
      const itemLabel = scene.add.text(0, 54, item ? (item.name || item.label) : 'Treasure', {
        fontFamily: 'Georgia, serif', fontSize: '20px', color: '#fff6e0'
      }).setOrigin(0.5);
      itemArt.add(itemLabel);
      layer.add(itemArt);
      scene.tweens.add({ targets: itemArt, y: 300, duration: 700, ease: 'Sine.easeOut' });

      // Tier sparkle burst.
      const burst = scene.add.particles(W / 2, 320, 'wandSpark', {
        speed: { min: 80, max: 260 }, scale: { start: 1, end: 0 }, lifespan: 900,
        quantity: tier === 'gold' ? 40 : tier === 'silver' ? 24 : 12, tint: TIER_COLOR[tier], blendMode: 'ADD', emitting: false
      });
      burst.explode();

      // Pip reaction escalates by tier.
      if (opts.pip) {
        if (tier === 'gold') { opts.pip.express('excited'); scene.time.delayedCall(200, () => opts.pip.say('closet_dress_gold')); caption.setText(`${name}. GOLD!`); }
        else if (tier === 'silver') { opts.pip.express('excited'); caption.setText('Oh how lovely!'); }
        else { opts.pip.express('idle'); caption.setText('A lovely find!'); }
      }

      scene.time.delayedCall(1400, () => {
        if (isDuplicate && item) {
          // Dissolve into fairy dust.
          const dup = RewardSystem.handleDuplicate(item.id, tier);
          itemLabel.setText(`Already owned — +${dup.dustAwarded} dust!`);
          scene.tweens.add({ targets: itemArt, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 700 });
        } else if (item) {
          // Add to wardrobe (normalised to the closet's item shape).
          if (isSet) {
            item.pieces.forEach((p) => {
              if (!wardrobe.some((w) => w.id === p.id)) {
                wardrobe.push({ id: p.id, slot: p.slot, label: p.name, biome: item.biome, gold: true, tier: 'gold', color: p.color });
              }
            });
          } else {
            wardrobe.push({ id: item.id, slot: item.slot, label: item.name || item.label, biome: item.biome, gold: item.tier === 'gold', tier: item.tier, color: item.color });
          }
          SaveSystem.set('wardrobe', wardrobe);
        }
        this_presentDust(scene, layer, opts, score, () => {
          scene.tweens.add({ targets: layer, alpha: 0, duration: 500, onComplete: () => { layer.destroy(); resolve({ tier, item, isDuplicate }); } });
        });
      });
    });
  });
}

// Dust earned presentation with a counting-up total.
function this_presentDust(scene, layer, opts, score, done) {
  const earned = FairyDustManager.calculateDustEarned(score);
  const result = FairyDustManager.award(earned);
  const name = SaveSystem.get('playerName') || 'Princess';

  const line = scene.add.text(W / 2, 470, `You earned ${earned} fairy dust on your adventure!`, {
    fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffe9a8', align: 'center'
  }).setOrigin(0.5);
  const counter = scene.add.text(W / 2, 520, `✨ ${result.from}`, {
    fontFamily: 'Georgia, serif', fontSize: '40px', color: '#fff6e0'
  }).setOrigin(0.5);
  layer.add([line, counter]);

  if (opts.pip) opts.pip.say('pip_delight');

  // Golden dust shower.
  const shower = scene.add.particles(W / 2, 120, 'wandSpark', {
    x: { min: 0, max: W }, y: 0, speedY: { min: 60, max: 160 }, lifespan: 2200,
    scale: { start: 0.7, end: 0 }, quantity: 2, frequency: 40, tint: 0xffd86b, blendMode: 'ADD'
  });
  layer.add(shower);

  // Count up.
  scene.tweens.addCounter({
    from: result.from, to: result.to, duration: 1400, ease: 'Cubic.easeOut',
    onUpdate: (t) => counter.setText(`✨ ${Math.round(t.getValue())}`),
    onComplete: () => { scene.time.delayedCall(1200, () => { shower.stop(); done(); }); }
  });
}
