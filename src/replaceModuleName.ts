import { readFile, readdir, stat, writeFile } from 'fs/promises';
import { join } from 'path';

export async function replaceModuleName(path: string, srcName: string, targetName: string) {
    const files = await readdir(path);
    
    const promises = files.map(async file => {
        const fullPath = join(path, file);
        const fileStats = await stat(fullPath);
        
        if (fileStats.isDirectory()) {
            return replaceModuleName(fullPath, srcName, targetName);
        }

        if (/\.m?js$/.test(fullPath)) {
            const data = await readFile(fullPath);
            let content = data.toString();

            content = content.replace(new RegExp(`(get|getFlag)\\((['"])${srcName}(['"])`, 'g'), `$1($2${targetName}$3`);
            content = content.replace(new RegExp(`modules/${srcName}/`, 'g'), `modules/${targetName}/`);

            await writeFile(fullPath, content);
        }
    });

    await Promise.all(promises);
    // Suche nach Pfaden
    // Suche nach dem Namen als 
}