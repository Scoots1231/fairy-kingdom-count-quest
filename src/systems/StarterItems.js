// src/systems/StarterItems.js
//
// PHASE 2 PLACEHOLDER WARDROBE.
//
// The real game grants wardrobe items as rewards during the Acts (Phase 3+).
// Until those exist, this small demo set is seeded into save.wardrobe the first
// time the closet is opened, so the closet UI (expand/collapse, equip, live
// mirror update, Pip reactions, completion tracker) is fully testable now.
// Replace/remove this seeding once Act rewards are implemented.
//
// Item shape: { id, slot, label, biome, gold, color }
//   slot:  'hat' | 'dress' | 'shirt' | 'pants' | 'shoes'  (crown comes from Act 4)
//   biome: 'forest' | 'swamp' | 'fields' | 'castle' | 'pip'

export const STARTER_ITEMS = [
  { id: 'hat_forest_leaf', slot: 'hat', label: 'Leaf Cap', biome: 'forest', gold: false, color: 0x4f8f3f },
  { id: 'hat_castle_gold', slot: 'hat', label: 'Gold Tiara-Hat', biome: 'castle', gold: true, color: 0xffd86b },
  { id: 'dress_forest_green', slot: 'dress', label: 'Forest Gown', biome: 'forest', gold: false, color: 0x3f8f5f },
  { id: 'dress_fields_rose', slot: 'dress', label: 'Rose Gown', biome: 'fields', gold: false, color: 0xe48fb8 },
  { id: 'shirt_swamp_teal', slot: 'shirt', label: 'Teal Tunic', biome: 'swamp', gold: false, color: 0x4f9f9f },
  { id: 'pants_forest_brown', slot: 'pants', label: 'Forest Leggings', biome: 'forest', gold: false, color: 0x7a5a35 },
  { id: 'shoes_fields_pink', slot: 'shoes', label: 'Petal Slippers', biome: 'fields', gold: false, color: 0xe48fb8 },
  { id: 'shoes_castle_gold', slot: 'shoes', label: 'Gold Slippers', biome: 'castle', gold: true, color: 0xffd86b }
];

// Seed the demo wardrobe once. Returns true if anything was added.
export function seedStarterWardrobe(SaveSystem) {
  if (!SaveSystem.hasSaveData()) return false;
  const wardrobe = SaveSystem.get('wardrobe') || [];
  if (wardrobe.length > 0) return false; // already has items
  SaveSystem.set('wardrobe', STARTER_ITEMS.map((it) => ({ ...it })));
  return true;
}
