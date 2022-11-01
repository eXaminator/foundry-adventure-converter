// The Feyward Manor / Elscieth Transformation

if ( !token || !token.document.name.includes("Elscieth")) {
    ui.notifications.warn("You must select Elscieth");
    return;
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  const isHuman = token.document._actor.name === "Elscieth Corvinarus";
  
  // Spawn 3 new cloned Tokens
  const existingToken = canvas.tokens.get(token.id);
  const newToken = foundry.utils.duplicate(existingToken.document);
  newToken.hidden = true;
  newToken.bar1.attribute = null;
  newToken.actorId = isHuman ? game.actors.getName('Sylvaria').id : game.actors.getName('Elscieth Corvinarus').id;
  newToken.texture = {
    "src": "modules/house-divided-swade/assets/creatures/tokens-topdown/sylvaria.webp",
    "scaleX": 1.6,
    "scaleY": 1.6
  };
  const targetSize = isHuman ? 3 : 1;
  const targetScale = isHuman ? 1.6 : 1;
  
  const toCreate = [foundry.utils.duplicate(newToken), foundry.utils.duplicate(newToken), newToken];
  toCreate[1]["texture.tint"] = "#ff8040";
  toCreate[0]["texture.tint"] = "#ff80ff";
  let created = await canvas.scene.createEmbeddedDocuments("Token", toCreate, {});
  created[2].object.control();
  
  // Execute Canvas updates
  newToken.x += canvas.dimensions.size * (isHuman ? -1 : 1);
  newToken.y += canvas.dimensions.size* (isHuman ? -1 : 1);
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": token.id, "hidden": true}]);
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": created[0]._id,  "width": targetSize, "height": targetSize, "x": newToken.x, "y": newToken.y, "hidden": false}], {animation: {duration: 2000}});
  await sleep(300);
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": created[1]._id,  "width": targetSize, "height": targetSize, "x": newToken.x, "y": newToken.y, "hidden": false}], {animation: {duration: 2000}});
  await sleep(300);
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": created[2]._id,  "width": targetSize, "height": targetSize, "x": newToken.x, "y": newToken.y, "hidden": false}], {animation: {duration: 2000}});
  await sleep(500);
  await canvas.scene.deleteEmbeddedDocuments("Token", [token.data._id], {});
  await sleep(1600);
  const finalImage = isHuman ? "modules/house-divided-swade/assets/creatures/tokens-topdown/sylvaria.webp" : "modules/house-divided-swade/assets/creatures/tokens-topdown/elscieth-corvinarus.webp"
  await canvas.scene.updateEmbeddedDocuments("Token", [{"_id": created[2]._id, "texture.src": finalImage, "texture.scaleX": targetScale, "texture.scaleY": targetScale}], {animation: {duration: 2000}});
  await canvas.scene.deleteEmbeddedDocuments("Token", [created[0]._id, created[1]._id], {});