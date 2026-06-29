// src/systems/ItemDB.js
//
// Loads assets/data/items.json once and provides queries used by the acts
// (prize pools), the shop (purchasable items by biome), and the Pip-collection
// milestone awards. Call ItemDB.load() early (main.js does); getters are then
// synchronous.

const ItemDB = {
  data: null,
  _promise: null,

  load() {
    if (this.data) return Promise.resolve(this.data);
    if (this._promise) return this._promise;
    this._promise = fetch('assets/data/items.json')
      .then((r) => r.json())
      .then((json) => { this.data = json; return json; })
      .catch((e) => { /* eslint-disable-next-line no-console */ console.warn('[ItemDB] load failed', e); this.data = { biomes: {}, pip: { items: [] } }; return this.data; });
    return this._promise;
  },

  ready() { return !!this.data; },

  allBiomeItems() {
    if (!this.data) return [];
    return Object.values(this.data.biomes).flatMap((b) => b.items);
  },

  // Lazy id -> item index. Gold "set" items also index each of their 5 pieces
  // (so an equipped gold piece's itemId resolves to its slot/colour).
  _buildIndex() {
    const idx = {};
    this.allBiomeItems().forEach((it) => {
      idx[it.id] = it;
      if (it.pieces) it.pieces.forEach((p) => {
        idx[p.id] = { id: p.id, slot: p.slot, name: p.name, tier: 'gold', biome: it.biome, color: p.color, gold: true };
      });
    });
    this.pipItems().forEach((it) => { idx[it.id] = it; });
    this._index = idx;
  },

  byId(id) {
    if (!this.data) return null;
    if (!this._index) this._buildIndex();
    return this._index[id] || null;
  },

  // Normalised display object for an itemId, used by the closet / mirror / shop
  // to render an item that the save now stores only as an id.
  display(itemId) {
    if (!itemId) return null;
    const it = this.byId(itemId);
    if (!it) return { id: itemId, slot: null, label: itemId, color: 0x888888, gold: false, tier: 'bronze', biome: null };
    return {
      id: it.id,
      slot: it.slot,
      label: it.name || it.label || it.id,
      color: it.color != null ? it.color : 0x888888,
      gold: it.gold === true || it.tier === 'gold',
      tier: it.tier,
      biome: it.biome
    };
  },

  biomeItems(biome) {
    if (!this.data || !this.data.biomes[biome]) return [];
    return this.data.biomes[biome].items;
  },

  // Prize pool for an act biome, grouped by tier (for PrizeReveal RNG).
  prizePool(biome) {
    const items = this.biomeItems(biome).filter((it) => it.source === 'prize');
    return {
      bronze: items.filter((it) => it.tier === 'bronze'),
      silver: items.filter((it) => it.tier === 'silver'),
      gold: items.filter((it) => it.tier === 'gold')
    };
  },

  shopItems(biome) {
    return this.biomeItems(biome).filter((it) => it.source === 'shop');
  },

  pipItems() {
    return (this.data && this.data.pip && this.data.pip.items) || [];
  },

  pipByMilestone(milestone) {
    return this.pipItems().find((it) => it.milestone === milestone) || null;
  }
};

export default ItemDB;
