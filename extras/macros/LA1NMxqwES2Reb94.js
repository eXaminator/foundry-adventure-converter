// The Ruined Manor / Arcane Facsimile - Revert Form

if ( !token || !token.document.actorData.name.includes("Reflection")) {
    ui.notifications.warn("You must select a Shard Reflection");
    return;
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Spawn new token
  const existingToken = canvas.tokens.get(token.data._id);
  const newToken = foundry.utils.duplicate(existingToken.document);
  newToken.hidden = true;
  newToken.actorId = "sAlVajLX9CxaRp5R";
  newToken.texture = {
    "src": "modules/house-divided-swade/assets/creatures/tokens-topdown/shard-stalker.webp"
  };
  newToken.name = "Shard Stalker Reflection";
  newToken.actorData = {
    "name": "Shard Stalker Reflection",
  };
  let created = await canvas.scene.createEmbeddedDocuments("Token", [newToken], {});
  
  // Execute Canvas updates
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": created[0]._id,  "hidden": false}], {animation: {duration: 2000}});
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": existingToken.document._id,  "hidden": true}], {animation: {duration: 2000}});
  
  await sleep(2000);
  
  // Delete old token
  await canvas.scene.deleteEmbeddedDocuments("Token", [existingToken.document._id], {});