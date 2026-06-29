// src/systems/StarterItems.js
//
// DEMO SEED (development convenience).
//
// The real game grants items as Act rewards / shop purchases. To keep the
// closet and room immediately demonstrable on a fresh save, this seeds a small
// set of REAL items.json ids (resolved through ItemDB) using the schema save
// API. Remove this call once you want a strictly bare new-game closet/room.

import ItemDB from './ItemDB.js';

const STARTER_WARDROBE = [
  'forest_mushroom_cap_hat',
  'forest_moonlight_silver_dress',
  'forest_silver_moonbeam_shirt',
  'forest_deep_green_forest_leggings_shop',
  'forest_vine_wrapped_ankle_boots'
];
const STARTER_DECOR = ['forest_firefly_lantern', 'forest_glowing_mushroom_cluster'];

// Seed the demo items once (only on a brand-new, empty wardrobe). Needs the
// item database loaded so tiers/biomes resolve; otherwise it no-ops.
export function seedStarterWardrobe(SaveSystem) {
  if (!SaveSystem.hasSaveData() || !ItemDB.ready()) return false;
  if ((SaveSystem.get('wardrobe') || []).length > 0) return false;

  STARTER_WARDROBE.forEach((id) => {
    const d = ItemDB.display(id);
    SaveSystem.addToWardrobe(id, d.tier || 'bronze', 'prize', d.biome || 'forest');
  });
  STARTER_DECOR.forEach((id) => {
    const d = ItemDB.display(id);
    SaveSystem.addRoomDecoration(id, d.tier || 'bronze', 'prize', d.biome || 'forest');
  });
  return true;
}
