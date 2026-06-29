// src/systems/PipCollection.js
//
// Awards Pip's 10 milestone collection items at the right story moments.
// Idempotent. Each award is recorded in save.pipCollection (schema shape) AND
// added to the wardrobe (clothing) or room decorations (room) via the schema
// API so it can actually be worn / placed.

import SaveSystem from './SaveSystem.js';
import ItemDB from './ItemDB.js';

const PipCollection = {
  // Returns { id, name } of the awarded item, or null if already owned/unknown.
  award(milestone) {
    const item = ItemDB.pipByMilestone(milestone);
    if (!item) return null;

    // addPipItem returns false if this item is already in the collection.
    if (!SaveSystem.addPipItem(item.id, milestone)) return null;

    if (item.type === 'clothing') SaveSystem.addToWardrobe(item.id, 'pip', 'milestone', 'pip');
    else SaveSystem.addRoomDecoration(item.id, 'pip', 'milestone', 'pip');

    return { id: item.id, name: item.name };
  },

  owns(id) {
    return (SaveSystem.get('pipCollection') || []).some((p) => p.itemId === id);
  },

  count() { return (SaveSystem.get('pipCollection') || []).length; }
};

export default PipCollection;
