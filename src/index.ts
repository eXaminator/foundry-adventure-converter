import { join } from 'path';
import { rm } from 'fs/promises';
import { copyModule } from './copyModule';
import { updateModuleJson } from './updateModuleJson';
import { replaceModuleName } from './replaceModuleName';
import { updateDatabases } from './updateDatabases';
import { copySync } from 'fs-extra';

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

    console.log('Copy module...');
    await copyModule(srcPath, targetPath);
    console.log('Update module.json...');
    await updateModuleJson(targetPath, SOURCE_SYSTEM_ID, TARGET_SYSTEM);
    console.log('Change module name...');
    await replaceModuleName(targetPath, MODULE, targetModuleName);
    console.log('Remove signature...');
    await rm(join(targetPath, 'signature.json'), { force: true });
    console.log('Update databases...');
    await updateDatabases(targetPath, MODULE, targetModuleName);
    console.log('Copy custom assets...');
    copySync(join(__dirname, '../extras/assets'), join(targetPath, 'assets'), { recursive: true, overwrite: true });

})().catch(console.error);
