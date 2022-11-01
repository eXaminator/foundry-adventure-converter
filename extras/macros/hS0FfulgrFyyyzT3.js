// The Ruined Manor / Ochre Jelly Split

if ( !token || !token.document.name.includes("Jelly")) {
    ui.notifications.warn("You must select an Ochre Jelly token");
    return;
}
  
// Spawn new cloned Token
const existingToken = canvas.tokens.get(token.data._id);
const newToken = foundry.utils.duplicate(existingToken.document);
let created = await canvas.scene.createEmbeddedDocuments("Token", [newToken], {});

// Execute Canvas updates
await created[0]._actor.update({ "system.wounds.value": 0 });
await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": created[0]._id, "x": newToken.x + canvas.dimensions.size * 2}], {animation: {duration: 2000}});