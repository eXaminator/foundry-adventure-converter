// The Ruined Manor / Arcane Facsimile

if ( game.user.targets.size != 1) {
    ui.notifications.warn("You must target a single Token");
    return;
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  
  // Verify valid target
  const existingToken = canvas.scene.tokens.get(game.user.targets.ids[0]);
  if ( existingToken._actor.system.stats.size < -2 || existingToken._actor.system.stats.size > 1 ) {
    ui.notifications.warn("Target is not the right size (Between -2 and 1)");
    return;
  }
  
  
  // Spawn 3 new cloned Tokens
  const newToken = foundry.utils.duplicate(existingToken);
  newToken.hidden = true;
  newToken.bar1.attribute = null;
  newToken.actorLink = false;
  const itemTypesToExclude = ["power", "edge"];
  newToken.actorData = {
   "name": "Reflection of " + newToken.name,
   "effects": [],
   "items": existingToken._actor.items.filter(i => !itemTypesToExclude.includes(i.type))
  };
  
  // Append 3 Reflection actions
  let exampleItem = foundry.utils.duplicate(newToken.actorData.items[0]);
  delete exampleItem._id;
  newToken.actorData.items.push(foundry.utils.mergeObject(exampleItem, {
    "img": "icons/magic/unholy/orb-stone-pink.webp",
    "type": "edge",
    "name": "One and Many",
    "system": {
      "description": "<p>Whenever the Shard Stalker creates a copy of itself via Shatter Form it is breaking itself into multiple pieces. Each one a reflection of its whole. As long as one reflection or facsimile lives it is considered to be alive.</p><p>There is no distinction between the original, a copy, or a facsimile, they are all the same being, able to act independently while sharing the same thoughts and knowledge.</p>"
    }
  }, { "inplace": false }));
  newToken.actorData.items.push(foundry.utils.mergeObject(exampleItem, {
    "img": "icons/creatures/magical/humanoid-silhouette-glowing-pink.webp",
    "name": "Arcane Facsimile",
    "type": "edge",
    "system": {
      "description": "<p>When the Shard Stalker uses Shatter Form to make a reflection of itself it can reflect the form of another Small or Medium humanoid it can see with the following traits:</p><ul><li><p>It has all of the ability scores, proficiencies, and other statistics of its target. It also has all of the target creature's equipment and can use it with the same proficiency as the target, though it does not have access to class features, spells, or magical properties of any carried items.</p></li><li><p>Consumable items like food, potions, and scrolls for spells up to 5th level function as expected but can only be used by the Shard Stalker.  Anything taken off of the facsimile instantly shatters into dust as though made of glass or plaster.</p></li></ul><p>The Shard Stalker sounds indistinguishable from the creature they are mirroring, though they can only effectively mimic creatures they've spent at least a full day observing.</p><p>An arcane facsimile can revert itself it its natural form at any time as a bonus action. When an arcane facsimile dies it returns to its true form.</p>"
    }
  }, { "inplace": false }));
  newToken.actorData.items.push(foundry.utils.mergeObject(exampleItem, {
    "img": "icons/creatures/magical/humanoid-silhouette-dashing-blue.webp",
    "name": "Arcane Facsimile - Revert Form",
    "type": "edge",
    "system": {
      "description": "<p>An arcane facsimile can revert itself it its natural form at any time as a bonus action. When an arcane facsimile dies it returns to its true form.</p><p>@UUID[Macro.LA1NMxqwES2Reb94]{Arcane Facsimile - Revert Form}</p>",
    }
  }, { "inplace": false }));
  
  const toCreate = [foundry.utils.duplicate(newToken), foundry.utils.duplicate(newToken), newToken];
  toCreate[1]["texture.tint"] = "#ff0000";
  toCreate[0]["texture.tint"] = "#0000ff";
  let created = await canvas.scene.createEmbeddedDocuments("Token", toCreate, {});
  
  // Execute Canvas updates
  newToken.x += canvas.dimensions.size;
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": created[0]._id,  "x": newToken.x, "hidden": false}], {animation: {duration: 2000}});
  await sleep(300);
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": created[1]._id,  "x": newToken.x, "hidden": false}], {animation: {duration: 2000}});
  await sleep(300);
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": created[2]._id,  "x": newToken.x, "hidden": false}], {animation: {duration: 2000}});
  await sleep(2000);
  await canvas.scene.deleteEmbeddedDocuments("Token", [created[0]._id, created[1]._id], {});