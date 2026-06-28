// src/systems/PipCollection.js
//
// Awards Pip's 10 milestone collection items at the right story moments.
// Idempotent: awarding the same milestone twice does nothing. Each awarded
// item is tracked in save.pipCollection AND added to the wardrobe (clothing)
// or room decorations (room) so it can actually be worn/placed.

import SaveSystem from './SaveSystem.js';
import ItemDB from './ItemDB.js';

const PipCollection = {
  // Returns the awarded item (or null if already owned / unknown milestone).
  award(milestone) {
    const item = ItemDB.pipByMilestone(milestone);
    if (!item) return null;

    const collection = SaveSystem.get('pipCollection') || [];
    if (collection.some((p) => p.id === item.id)) return null; // already owned

    const entry = { id: item.id, name: item.name, biome: 'pip', slot: item.slot, type: item.type, color: item.color };
    collection.push(entry);
    SaveSystem.set('pipCollection', collection);

    if (item.type === 'clothing') {
      const wardrobe = SaveSystem.get('wardrobe') || [];
      if (!wardrobe.some((w) => w.id === item.id)) { wardrobe.push({ ...entry, gold: false }); SaveSystem.set('wardrobe', wardrobe); }
    } else {
      const decor = SaveSystem.get('roomDecorations') || [];
      if (!decor.some((d) => d.id === item.id)) { decor.push({ id: item.id, label: item.name, type: 'wall', color: item.color, x: 980, y: 180 }); SaveSystem.set('roomDecorations', decor); }
    }
    return entry;
  },

  owns(id) {
    return (SaveSystem.get('pipCollection') || []).some((p) => p.id === id);
  },

  count() { return (SaveSystem.get('pipCollection') || []).length; }
};

export default PipCollection;
