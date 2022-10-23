import { join } from 'path';
import { rm } from 'fs/promises';
import { copyModule } from './copyModule';
import { updateModuleJson } from './updateModuleJson';
import { replaceModuleName } from './replaceModuleName';
import { updateDatabases } from './updateDatabases';

const PATH = '/Users/steven/Sites/stacks/data/foundry/data/Data/modules';
const MODULE = 'house-divided';
const SOURCE_SYSTEM_ID = 'dnd5e';
const TARGET_SYSTEM = {
    id: 'swade',
    compatibility: {
        minimum: '2.0.0',
        verified: '2.0.0'
    }
};

(async function run() {
    const targetModuleName = `${MODULE}-${TARGET_SYSTEM.id}`;
    const srcPath = join(PATH, MODULE);
    const targetPath = join(PATH, targetModuleName);

    await copyModule(srcPath, targetPath);
    await updateModuleJson(targetPath, SOURCE_SYSTEM_ID, TARGET_SYSTEM);
    await replaceModuleName(targetPath, MODULE, targetModuleName);
    await rm(join(targetPath, 'signature.json'), { force: true });
    await updateDatabases(targetPath, MODULE, targetModuleName);

})().catch(console.error);
