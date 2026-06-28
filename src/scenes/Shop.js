// src/scenes/Shop.js — Benny's Curiosity Cottage.
//
// Four biome tabs (each unlocks after that act) plus a Workshop tab for tier
// upgrades. Items come from ItemDB (bronze/silver only — gold is never sold).
// Purchase deducts fairy dust and adds the item to the wardrobe/room. Owned
// items show a check; unaffordable prices glow red. Mouse + keyboard.

import SaveSystem from '../systems/SaveSystem.js';
import FairyDustManager from '../systems/FairyDustManager.js';
import ItemDB from '../systems/ItemDB.js';
import Cursor from '../ui/Cursor.js';

const W = 1280;
const H = 720;
const BIOMES = ['forest', 'swamp', 'fields', 'castle'];
const TABS = ['forest', 'swamp', 'fields', 'castle', 'workshop'];
const UPGRADE_COST = { bronze: 100, silver: 300 };

export default class Shop extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    this.cameras.main.setBackgroundColor('#2a1c12');
    this.activeTab = 0;
    this.itemFocus = 0;

    this.buildFrame();
    this.buildBenny();
    this.buildTabs();
    this.grid = this.add.container(0, 0);
    this.dustText = this.add.text(W - 40, 30, '', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffd86b' }).setOrigin(1, 0);
    this.benText = this.add.text(360, 150, '', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#fff6e0', wordWrap: { width: 520 } });
    this.buildBack();

    this.wandCursor = new Cursor(this);
    this.firstVisit = !SaveSystem.get('shopVisited');
    SaveSystem.set('shopVisited', true);
    this.benny('greet');

    this.setupKeyboard();
    this.renderTab();
    this.cameras.main.fadeIn(400, 14, 9, 6);
  }

  buildFrame() {
    const g = this.add.graphics();
    g.fillStyle(0x3a2616, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(0x4a3220, 1); g.fillRoundedRect(16, 70, W - 32, H - 86, 16);
    this.add.text(40, 24, "Benny's Curiosity Cottage", { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffe9a8' });
  }

  buildBenny() {
    const c = this.add.container(180, 200);
    const g = this.add.graphics();
    g.fillStyle(0x8a5a35, 1); g.fillEllipse(0, 40, 90, 110); g.fillCircle(0, -30, 40); // body+head
    g.fillStyle(0x6a4424, 1); g.fillEllipse(0, 110, 70, 30); // tail/feet
    g.fillStyle(0xffffff, 1); g.fillCircle(-12, -34, 7); g.fillCircle(12, -34, 7);
    g.fillStyle(0x2a2020, 1); g.fillCircle(-12, -34, 3); g.fillCircle(12, -34, 3);
    g.fillStyle(0xf0e0c0, 1); g.fillRect(-10, -18, 20, 12); // teeth
    g.lineStyle(2, 0xeeeeee, 0.9); g.strokeCircle(-12, -34, 9); g.strokeCircle(12, -34, 9); // glasses
    c.add(g);
  }

  buildTabs() {
    this.tabViews = [];
    TABS.forEach((tab, i) => {
      const x = 360 + i * 168;
      const c = this.add.container(x, 110);
      const bg = this.add.graphics();
      const label = tab === 'workshop' ? '🔧 Workshop' : tab.charAt(0).toUpperCase() + tab.slice(1);
      const txt = this.add.text(0, 0, label, { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#fff6e0' }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, 156, 44, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
      c.add([bg, txt, hit]);
      hit.on('pointerover', () => { this.wandCursor.setState('hover'); });
      hit.on('pointerout', () => { this.wandCursor.setState('idle'); });
      hit.on('pointerdown', () => { this.activeTab = i; this.itemFocus = 0; this.benny('tab'); this.renderTab(); });
      this.tabViews.push({ bg, txt });
    });
  }

  buildBack() {
    const c = this.add.container(W - 110, H - 44);
    const g = this.add.graphics();
    g.fillStyle(0x7b3fb5, 1); g.fillRoundedRect(-90, -26, 180, 52, 26);
    g.lineStyle(2, 0xffe9a8, 1); g.strokeRoundedRect(-90, -26, 180, 52, 26);
    const t = this.add.text(0, 0, '← Back', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#fff6e0' }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 180, 52, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
    c.add([g, t, hit]);
    hit.on('pointerdown', () => this.back());
  }

  // ---- Data ---------------------------------------------------------------
  tabKey() { return TABS[this.activeTab]; }
  isLocked(tab) {
    const idx = BIOMES.indexOf(tab);
    if (idx === -1) return false; // workshop always open (post Act 1)
    return !SaveSystem.get(`progress.act${idx + 1}Complete`);
  }
  owns(id) { return (SaveSystem.get('wardrobe') || []).some((w) => w.id === id) || (SaveSystem.get('roomDecorations') || []).some((d) => d.id === id); }

  currentItems() {
    const tab = this.tabKey();
    if (tab === 'workshop') {
      // Owned, non-gold clothing eligible for an upgrade.
      return (SaveSystem.get('wardrobe') || []).filter((w) => w.tier === 'bronze' || w.tier === 'silver');
    }
    return ItemDB.shopItems(tab);
  }

  // ---- Render -------------------------------------------------------------
  renderTab() {
    this.dustText.setText(`✨ ${FairyDustManager.getBalance()}`);
    this.tabViews.forEach((v, i) => {
      const active = this.activeTab === i;
      const locked = this.isLocked(TABS[i]);
      v.bg.clear();
      v.bg.fillStyle(active ? 0x6a4424 : 0x3a2616, active ? 1 : 0.7);
      v.bg.fillRoundedRect(-78, -22, 156, 44, 8);
      v.bg.lineStyle(active ? 3 : 1, 0xd8b25a, active ? 1 : 0.4);
      v.bg.strokeRoundedRect(-78, -22, 156, 44, 8);
      v.txt.setColor(locked ? '#8a7a6a' : '#fff6e0');
      v.txt.setText((TABS[i] === 'workshop' ? '🔧 Workshop' : TABS[i].charAt(0).toUpperCase() + TABS[i].slice(1)) + (locked ? ' 🔒' : ''));
    });

    this.grid.removeAll(true);
    const tab = this.tabKey();
    if (this.isLocked(tab)) {
      this.grid.add(this.add.text(W / 2, 360, "I'd love to show you, but I don't think\nyou've been there yet, dear!", { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#cdb6a0', align: 'center' }).setOrigin(0.5));
      return;
    }
    const items = this.currentItems();
    if (items.length === 0) {
      this.grid.add(this.add.text(W / 2, 360, tab === 'workshop' ? 'Nothing to upgrade yet — earn some items first!' : 'All sold out, dear!', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#cdb6a0' }).setOrigin(0.5));
      return;
    }

    const cols = 4; const cw = 250; const ch = 150; const x0 = 360; const y0 = 210;
    items.forEach((item, i) => {
      const col = i % cols; const row = Math.floor(i / cols);
      const x = x0 + col * cw; const y = y0 + row * ch;
      const c = this.add.container(x, y);
      const focused = this.itemFocus === i;
      const isWorkshop = tab === 'workshop';
      const price = isWorkshop ? UPGRADE_COST[item.tier] : item.shopPrice;
      const owned = !isWorkshop && this.owns(item.id);
      const afford = FairyDustManager.getBalance() >= price;

      const bg = this.add.graphics();
      bg.fillStyle(0x2a2440, 0.92); bg.fillRoundedRect(0, 0, 228, 132, 12);
      bg.lineStyle(focused ? 4 : 2, focused ? 0xffe9a8 : 0x6a5a8a, 1); bg.strokeRoundedRect(0, 0, 228, 132, 12);
      const sw = this.add.graphics(); sw.fillStyle(item.color || 0x888888, 1); sw.fillRoundedRect(14, 14, 50, 50, 8);
      const name = this.add.text(78, 18, item.name || item.label, { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#fff6e0', wordWrap: { width: 140 } });
      const priceTxt = this.add.text(78, 84, owned ? '✓ Owned' : (isWorkshop ? `Upgrade → ${item.tier === 'bronze' ? 'silver' : 'gold'}  ✨${price}` : `✨ ${price}`), {
        fontFamily: 'Georgia, serif', fontSize: '15px', color: owned ? '#9be8a8' : (afford ? '#ffd86b' : '#ff8e8e')
      });
      const hit = this.add.rectangle(114, 66, 228, 132, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
      c.add([bg, sw, name, priceTxt, hit]);
      hit.on('pointerover', () => { this.itemFocus = i; this.renderTab(); });
      hit.on('pointerdown', () => { this.itemFocus = i; this.activate(); });
      this.grid.add(c);
    });
  }

  // ---- Actions ------------------------------------------------------------
  activate() {
    const tab = this.tabKey();
    if (this.isLocked(tab)) { this.benny('locked'); return; }
    const items = this.currentItems();
    const item = items[this.itemFocus];
    if (!item) return;
    if (tab === 'workshop') return this.upgrade(item);
    return this.purchase(item);
  }

  purchase(item) {
    if (this.owns(item.id)) { this.benny('owned'); return; }
    if (!FairyDustManager.spend(item.shopPrice)) { this.benny('poor'); return; }
    if (item.type === 'clothing') {
      const wardrobe = SaveSystem.get('wardrobe') || [];
      wardrobe.push({ id: item.id, slot: item.slot, label: item.name, biome: item.biome, gold: false, tier: item.tier, color: item.color });
      SaveSystem.set('wardrobe', wardrobe);
    } else {
      const decor = SaveSystem.get('roomDecorations') || [];
      decor.push({ id: item.id, label: item.name, type: 'floor', color: item.color, x: 700, y: 600 });
      SaveSystem.set('roomDecorations', decor);
    }
    this.wandCursor.setState('correct');
    this.benny('buy');
    this.renderTab();
  }

  upgrade(item) {
    const cost = UPGRADE_COST[item.tier];
    if (!FairyDustManager.spend(cost)) { this.benny('poor'); return; }
    const wardrobe = SaveSystem.get('wardrobe') || [];
    const w = wardrobe.find((x) => x.id === item.id);
    if (w) {
      if (w.tier === 'bronze') { w.tier = 'silver'; }
      else if (w.tier === 'silver') { w.tier = 'gold'; w.gold = true; w.color = 0xffd86b; }
      SaveSystem.set('wardrobe', wardrobe);
    }
    this.wandCursor.setState('correct');
    this.benny('upgrade');
    this.renderTab();
  }

  benny(kind) {
    const lines = {
      greet: this.firstVisit ? 'Welcome, welcome! Come in, come in — let me show you everything!' : 'Back again! Wonderful! Let me see what catches your eye...',
      tab: 'Ah, lovely choices over here!',
      buy: 'Wonderful choice! Come back soon!',
      poor: "Come back when you've collected a little more fairy dust, dear!",
      owned: 'Already in your wardrobe — good choice!',
      locked: "I'd love to show you but I don't think you've been there yet, dear!",
      upgrade: 'There! Good as gold... literally!'
    };
    if (this.benText) this.benText.setText(lines[kind] || '');
  }

  setupKeyboard() {
    const kb = this.input.keyboard;
    kb.on('keydown-TAB', (e) => { e.preventDefault(); this.activeTab = (this.activeTab + 1) % TABS.length; this.itemFocus = 0; this.benny('tab'); this.renderTab(); });
    kb.on('keydown-RIGHT', () => { this.itemFocus = Math.min(this.itemFocus + 1, Math.max(0, this.currentItems().length - 1)); this.renderTab(); });
    kb.on('keydown-LEFT', () => { this.itemFocus = Math.max(this.itemFocus - 1, 0); this.renderTab(); });
    kb.on('keydown-DOWN', () => { this.itemFocus = Math.min(this.itemFocus + 4, Math.max(0, this.currentItems().length - 1)); this.renderTab(); });
    kb.on('keydown-UP', () => { this.itemFocus = Math.max(this.itemFocus - 4, 0); this.renderTab(); });
    kb.on('keydown-ENTER', () => this.activate());
    kb.on('keydown-SPACE', () => this.activate());
    kb.on('keydown-ESC', () => this.back());
  }

  back() {
    this.wandCursor.setState('loading');
    this.input.keyboard.removeAllListeners();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('PrincessRoom'));
  }
}
