import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import { copySync } from 'fs-extra';

export async function copyModule(src: string, target: string) {
    if (existsSync(target)) {
        await rm(target, { recursive: true, force: true });
    }

    copySync(src, target);
}