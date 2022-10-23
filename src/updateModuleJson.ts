import { join, basename } from 'path';
import { readFile, writeFile } from 'fs/promises';

export async function updateModuleJson(modulePath: string, srcModuleId: string, targetModuleConfig: { id: string }) {
    const moduleJsonPath = join(modulePath, 'module.json');
    const targetModuleName = basename(modulePath);
    
    const json = await readFile(moduleJsonPath);
    const moduleJson = JSON.parse(json.toString());

    moduleJson.id = targetModuleName;
    moduleJson.title = `${moduleJson.title} (${targetModuleConfig.id})`
    moduleJson.relationships.systems = moduleJson.relationships.systems.map((system: any) => {
        if (system.id === srcModuleId) return targetModuleConfig;
        return system;
    });
    moduleJson.packs = moduleJson.packs.map((pack: any) => ({
        ...pack,
        label: `${pack.label} (${targetModuleConfig.id})`,
        system: targetModuleConfig.id,
    }));
    moduleJson.protected = false;
    moduleJson.mainfest = ''; // Ensure that this moule cannot be updated

    await writeFile(moduleJsonPath, JSON.stringify(moduleJson, null, 4));
}