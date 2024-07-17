import { join } from 'path';
import { rm } from 'fs/promises';
import { copyModule } from './copyModule';
import { updateModuleJson } from './updateModuleJson';
import { replaceModuleName } from './replaceModuleName';
import { updateDatabases } from './updateDatabases';
import { copySync } from 'fs-extra';

if (process.argv.length <= 2) {
    console.error('Missing argument: path to modules folder');
    process.exit(1);
}

const MODULES_PATH = process.argv[2];
const MODULE = 'house-divided';
const SOURCE_SYSTEM_ID = 'dnd5e';
const TARGET_SYSTEM = {
    id: 'swade',
    compatibility: {
        minimum: '4.0.0',
        verified: '4.0.0'
    }
};

(async function run() {
    const targetModuleName = `${MODULE}-${TARGET_SYSTEM.id}`;
    const srcPath = join(MODULES_PATH, MODULE);
    const targetPath = join(MODULES_PATH, targetModuleName);

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
    copySync(join(__dirname, '../extras/assets'), join(targetPath, 'assets'), { overwrite: true });

})().catch(console.error);
