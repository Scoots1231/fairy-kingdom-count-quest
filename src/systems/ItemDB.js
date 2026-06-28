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

  byId(id) {
    return this.allBiomeItems().find((it) => it.id === id)
      || this.pipItems().find((it) => it.id === id) || null;
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
