import Datastore from '@seald-io/nedb';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { generateId } from './generateId';

const ITEM_TYPE: Record<string, string> = {
    background: 'ability',
    backpack: 'gear',
    class: 'edge',
    consumable: 'gear',
    equipment: 'armor',
    feat: 'edge',
    loot: 'gear',
    spell: 'power',
    subclass: 'edge',
    tool: 'gear',
    weapon: 'weapon',
};

const SKILL_MAP: Record<string, string[]> = {
    Athletics: ['acr', 'ath'],
    Survival: ['ani', 'sur'],
    Occult: ['arc'],
    Persuasion: ['dec', 'per'],
    Academics: ['his', 'rel'],
    Notice: ['ins', 'prc', 'inv'],
    Intimidation: ['itm'],
    Healing: ['med'],
    Science: ['nat'],
    Performance: ['prf'],
    Thievery: ['slt'],
    Stealth: ['ste'],
    'Common Knowledge': ['arc', 'rel', 'nat'],
    Taunt: ['itm', 'per'],
};

const SKILL_ATTR_MAP: Record<string, string> = {
    Academics: 'smarts',
    Athletics: 'agility',
    'Common Knwoledge': 'smarts',
    Faith: 'spirit',
    Fighting: 'agility',
    Healing: 'smarts',
    Intimidation: 'spirit',
    Notice: 'smarts',
    Occult: 'smarts',
    Performance: 'spirit',
    Persuasion: 'spirit',
    Science: 'smarts',
    Shooting: 'agility',
    Spellcasting: 'smarts',
    Stealth: 'agility',
    Survival: 'smarts',
    Taunt: 'smarts',
    Thievery: 'agility',
};

const SIZE_MAP: Record<string, { size: number, scale: number }> = {
    tiny: { size: -4, scale: -6 },
    sm: { size: -2, scale: -2 },
    med: { size: 0, scale: 0 },
    lg: { size: 4, scale: 2 },
    huge: { size: 8, scale: 4 },
    grg: { size: 12, scale: 6 },
};

interface Texture {
    src: string | null,
}

interface Item {
    _id: string,
    name: string,
    img: string|null,
    type: string,
    system: any,
    flags?: Record<string, unknown>,
}

interface Token {
    bar1: {
        attribute: string|null,
    },
    bar2: {
        attribute: string|null,
    },
    texture: Texture,
    flags?: Record<string, unknown>,
}

interface Actor {
    _id: string,
    name: string,
    img: string|null,
    type: string,
    system: any,
    prototypeToken: Token,
    items: Item[],
    flags?: Record<string, unknown>,
}

interface Journal {
    _id: string,
    name: string,
    pages: Array<{
        _id: string,
        name: string,
        type: string,
        text: {
            content: string | null,
        } | null,
        flags?: Record<string, unknown>,
    }>,
    flags?: Record<string, unknown>,
}

interface Scene {
    _id: string,
    name: string,
    background: {
        src: string,
    },
    foreground: string | null,
    thumb: string | null,
    tokens: Token[],
    notes: Array<{
        texture: Texture,
        flags?: Record<string, unknown>,
    }>,
    tiles: Array<{
        texture: Texture,
        flags?: Record<string, unknown>,
    }>,
    grid: {
        type: number,
        distance: number,
        units: string,
    },
    lights: Array<{
        config: {
            bright: number,
            dim: number,
        },
    }>,
    sounds: Array<{
        radius: number,
    }>,
    flags?: Record<string, unknown>,
}

interface Table {
    _id: string,
    name: string,
    img: string | null,
    results: Array<{
        img: string,
        text: string,
        flags?: Record<string, unknown>,
    }>,
    flags?: Record<string, unknown>,
}

interface Macro {
    _id: string,
    name: string,
    img: string | null,
    type: string,
    command: string | null,
    flags?: Record<string, unknown>,
}

interface Playlist {
    _id: string,
    name: string,
    sounds: Array<{
        path: string,
        flags?: Record<string, unknown>,
    }>,
    flags?: Record<string, unknown>,
}

interface Adventure {
    _id: string,
    name: string,
    img: string,
    actors: Actor[],
    items: Item[],
    journal: Journal[],
    scenes: Scene[],
    tables: Table[],
    macros: Macro[],
    playlists: Playlist[],
    flags?: Record<string, unknown>,
}

interface Die {
    sides: number,
    modifier: number,
}

function dcToModifier(dc: number) {
    if (dc <= 7) return `<span title="DC ${dc}">+4</span>`;
    if (dc <= 12) return `<span title="DC ${dc}">+2</span>`;
    if (dc <= 17) return `<span title="DC ${dc}">💭</span>`;
    if (dc <= 22) return `<span title="DC ${dc}">-2</span>`;
    if (dc <= 27) return `<span title="DC ${dc}">-4</span>`;

    return `<span title="DC ${dc}">-8</span>`;
}

function replacePaths(text: string|null, srcName: string, targetName: string) {
    if (!text) return text;
    
    return text.replace(new RegExp(`modules/${srcName}/`, 'g'), `modules/${targetName}/`);
}

function replaceSkillName(text: string) {
    return text
        .replace(/\b(acrobatics)\b(?![^<]*>)/gi, '<span title="$1">Athletics</span>')
        .replace(/\b(animal handling)\b(?![^<]*>)/gi, '<span title="$1">Survival</span>')
        .replace(/\b(arcana)\b(?![^<]*>)/gi, '<span title="$1">Occult</span>')
        .replace(/\b(deception)\b(?![^<]*>)/gi, '<span title="$1">Persuasion</span>')
        .replace(/\b(history)\b(?![^<]*>)/gi, '<span title="$1">Academics</span>')
        .replace(/\b(insight)\b(?![^<]*>)/gi, '<span title="$1">Notice</span>')
        .replace(/\b(investigation)\b(?![^<]*>)/gi, '<span title="$1">Notice</span>')
        .replace(/\b(medicine)\b(?![^<]*>)/gi, '<span title="$1">Healing</span>')
        .replace(/\b(nature)\b(?![^<]*>)/gi, '<span title="$1">Science</span>')
        .replace(/\b(perception)\b(?![^<]*>)/gi, '<span title="$1">Notice</span>')
        .replace(/\b(religion)\b(?![^<]*>)/gi, '<span title="$1">Academics</span>')
        .replace(/\b(sleight of hand)\b(?![^<]*>)/gi, '<span title="$1">Thievery</span>')
}

function fixupDcs(text: string|null) {
    if (!text) return text;

    return text.replace(/saving throw/gi, 'roll')
        .replace(/(intelligence|strength|constitution|wisdom|charisma|dexterity) \(([^)]+)\)/gi, (all, ability, skillText) => {
            return `<span title="${all}">${replaceSkillName(skillText)}</span>`;
        })
        .replace(/.*/, all => replaceSkillName(all)) // Replace all remianing skill names outside of tags
        .replace(/dexterity(?![^<]*>)/gi, 'Agility')
        .replace(/constitution(?![^<]*>)/gi, 'Vigor')
        .replace(/wisdom(?![^<]*>)/gi, 'Spirit')
        .replace(/charisma(?![^<]*>)/gi, 'Spirit (Charisma)')
        .replace(/intelligence(?![^<]*>)/gi, 'Smarts')
    
        .replace(/<span title="(\w+)">(\w+)<\/span> or <span title="(\w+)">\2<\/span>/gi, '<span title="$1 or $3">$2</span>') // remove duplicates, like "Notice or Notice"
        .replace(/DC ([0-9]+)/gi, (all, dc) => dcToModifier(Number(dc)))
        .replace('(\w)[ ]+', '$1'); // Remove extra whitespaces after all these replacements
}

function fixFlags(flags: Record<string, any> | undefined, srcName: string, targetName: string): Record<string, any> | undefined {
    if (!flags?.[srcName]) return flags;

    flags[targetName] = flags[srcName];
    delete flags[srcName];

    return flags;
}

function convertItem(item: Item, srcName: string, targetName: string): Item {
    item.img = replacePaths(item.img, srcName, targetName);

    item.type = ITEM_TYPE[item.type];
    item.flags = fixFlags(item.flags, srcName, targetName);

    // TODO: do intelligent stuff
    item.system = {
        description: fixupDcs(item.system.description?.value ?? ''),
        isArcaneBackground: item.type === 'edge' && item.name.toLowerCase() === 'spellcasting',
    };

    return item;
}

function convertToken(token: Token, srcName: string, targetName: string): Token {
    token.texture.src = replacePaths(token.texture.src, srcName, targetName);
    token.bar1.attribute = null;
    token.bar2.attribute = null;
    token.flags = fixFlags(token.flags, srcName, targetName);

    return token;
}

/*
0 Untrained (d4)
1 d4
2 d4
3 d6
4 d6
5 d8
6 d8
7 d10
8 d10
9 d12
10 d12
11 d12+1
*/

function convertValue(value: number, modifier = 0): Die {
    if (value <= 2) return { sides: 4, modifier };
    if (value <= 4) return { sides: 6, modifier };
    if (value <= 6) return { sides: 8, modifier };
    if (value <= 8) return { sides: 10, modifier };
    
    return { sides: 12, modifier: Math.ceil((value - 10) / 2) + modifier };
}

function createSkill(name: string, value: number, modifier = 0) {
    return {
        _id: generateId(),
        name,
        type: 'skill',
        img: '',
        system: {
            attribute: SKILL_ATTR_MAP[name],
            die: convertValue(value, modifier),
            isCoreSkill: ['Athletics', 'Notice', 'Persuasion', 'Stealth', 'Common Knowledge'].includes(name),
        },
    };
}

function getAbilityValue(ability: { value: number }) {
    return ability.value - 10;
}

function convertActor(actor: Actor, srcName: string, targetName: string): Actor {
    actor.img = replacePaths(actor.img, srcName, targetName);
    actor.items = actor.items.map(item => convertItem(item, srcName, targetName))
    actor.prototypeToken = convertToken(actor.prototypeToken, srcName, targetName);
    actor.flags = fixFlags(actor.flags, srcName, targetName);

    const system = actor.system;

    const skills = Object
        .entries(SKILL_MAP)
        .map(([targetSkill, srcSkills]) => ([targetSkill, Math.max(...srcSkills.map(skill => system.skills[skill].total))] as [string, number]))
        .filter(([, skillValue]) => skillValue > 0)
        .map(([targetSkill, skillValue]) => createSkill(targetSkill, skillValue));

    const meleeWeapon = actor.items.find(item => item.type === 'weapon' && item.system.actionType === 'mwak' && item.system.proficient);
    const rangedWeapon = actor.items.find(item => item.type === 'weapon' && item.system.actionType === 'rwak' && item.system.proficient);

    const meleeAttr = meleeWeapon?.system.ability ?? 'str';
    const rangedAttr = rangedWeapon?.system.ability ?? 'dex';

    skills.push(createSkill('Fighting', getAbilityValue(system.abilities[meleeAttr])));
    skills.push(createSkill('Shooting', getAbilityValue(system.abilities[rangedAttr])));
    
    if (system.attributes?.spellcasting === 'int' || system.attributes?.spellcasting === 'cha') {
        skills.push(createSkill('Spellcasting', getAbilityValue(system.abilities?.[system.attributes?.spellcasting])));
    }
    
    if (system.attributes?.spellcasting === 'wis') {
        skills.push(createSkill('Faith', getAbilityValue(system.abilities?.[system.attributes?.spellcasting])));
    }

    skills.push(createSkill('Unskilled Attempt', 0, -2));

    actor.items.push(...skills);

    const languages = system.traits.languages?.value ?? [];
    if (system.traits.languages?.custom)
    languages.push(...system.traits.languages?.custom?.split(';').map((l: string) => l.trim()).filter((x: string) => !!x));

    actor.system = {
        details: {
            notes: fixupDcs(system.description?.value ?? ''),
            appearance: fixupDcs(system.details.appearance ?? ''),
            biography: {
                value: fixupDcs(`
                ${system.details.alignment ? `<p><strong>Alignment:</strong> ${system.details.alignment}</p>` : ''}
                ${languages.length > 0 ? `<p><strong>Languages:</strong> ${languages.join(', ')}</p>` : ''}
                ${system.details.biography?.value ? `<h2>Biography</h2><p>${system.details.biography?.value}</p>` : ''}
                ${system.details.background ? `<h2>Background</h2><p>${system.details.background}</p>` : ''}
                ${system.details.trait ? `<h2>Personality traits</h2><p>${system.details.trait}</p>` : ''}
                ${system.details.ideal ? `<h2>Ideals</h2><p>${system.details.ideal}</p>` : ''}
                ${system.details.bond ? `<h2>Bonds</h2><p>${system.details.bond}</p>` : ''}
                ${system.details.flaw ? `<h2>Flaws</h2><p>${system.details.flaw}</p>` : ''}
                `)
            },
            archetype: '',
            species: {
                name: system.details.race ?? '',
            },
        },
        attributes: {
            agility: { die: convertValue(getAbilityValue(system.abilities.dex)) },
            smarts: { die: convertValue(getAbilityValue(system.abilities.dex)) },
            spirit: { die: convertValue(Math.max(getAbilityValue(system.abilities.wis), getAbilityValue(system.abilities.cha))) },
            strength: { die: convertValue(getAbilityValue(system.abilities.dex)) },
            vigor: { die: convertValue(getAbilityValue(system.abilities.dex)) },
        },
        stats: {
            ...(SIZE_MAP[system.traits.size] ?? { size: 0, scale: 0 }),
            speed: {
                runningDie: 6 + Math.floor((Math.round(system.attributes.movement.walk / 5) - 6) / 2),
                runningMod: 0,
                value: Math.round(system.attributes.movement.walk / 5),
                adjusted: Math.round(system.attributes.movement.walk / 5)
            }
        },
        wildcard: false,
    };

    return actor;
}

function convertMacro(macro: Macro, srcName: string, targetName: string): Macro {
    macro.img = replacePaths(macro.img, srcName, targetName);
    macro.command = replacePaths(macro.command, srcName, targetName);
    
    if (macro.command) {
        macro.command = macro.command.replace(new RegExp(`(get|getFlag)\\((['"])${srcName}(['"])`, 'g'), `$1($2${targetName}$3`);
    }
    
    macro.flags = fixFlags(macro.flags, srcName, targetName);

    return macro;
}

function convertJournal(journal: Journal, srcName: string, targetName: string): Journal {
    journal.flags = fixFlags(journal.flags, srcName, targetName);
    
    journal.pages = journal.pages.map(page => {
        if (page.text?.content) page.text.content = fixupDcs(replacePaths(page.text.content, srcName, targetName));
        page.flags = fixFlags(page.flags, srcName, targetName);
        
        // TODO: Support for image pages?
        return page;
    });

    return journal;
}

function convertPlaylist(playlist: Playlist, srcName: string, targetName: string): Playlist {
    playlist.flags = fixFlags(playlist.flags, srcName, targetName);
    
    playlist.sounds = playlist.sounds.map(sound => {
        sound.path = replacePaths(sound.path, srcName, targetName)!;
        sound.flags = fixFlags(sound.flags, srcName, targetName);
        return sound;
    });

    return playlist;
}

function convertTable(table: Table, srcName: string, targetName: string): Table {
    table.img = replacePaths(table.img, srcName, targetName);
    table.flags = fixFlags(table.flags, srcName, targetName);
    
    table.results = table.results.map(result => {
        result.img = replacePaths(result.img, srcName, targetName)!;
        result.text = fixupDcs(replacePaths(result.text, srcName, targetName))!;
        result.flags = fixFlags(result.flags, srcName, targetName);
        return result;
    });

    return table;
}

function convertScene(scene: Scene, srcName: string, targetName: string): Scene {
    scene.background.src = replacePaths(scene.background.src, srcName, targetName)!;
    scene.foreground = replacePaths(scene.foreground, srcName, targetName);
    scene.thumb = replacePaths(scene.thumb, srcName, targetName);
    scene.flags = fixFlags(scene.flags, srcName, targetName);
    scene.grid.type = 0;
    scene.grid.distance = 1;
    scene.grid.units = '"';

    scene.lights = scene.lights.map(light => {
        light.config.bright /= 5;
        light.config.dim /= 5;
        return light;
    });

    scene.sounds = scene.sounds.map(sound => {
        sound.radius /= 5;
        return sound;
    });
    
    scene.tiles = scene.tiles.map(tile => {
        tile.texture.src = replacePaths(tile.texture.src, srcName, targetName);
        tile.flags = fixFlags(tile.flags, srcName, targetName);
        return tile;
    });
    
    scene.notes = scene.notes.map(note => {
        note.texture.src = replacePaths(note.texture.src, srcName, targetName);
        note.flags = fixFlags(note.flags, srcName, targetName);
        return note;
    });
    
    scene.tokens = scene.tokens.map(token => convertToken(token, srcName, targetName));

    return scene;
}

function convertAdventure(adventure: Adventure, srcName: string, targetName: string): Adventure {
    adventure.img = replacePaths(adventure.img, srcName, targetName)!;
    adventure.flags = fixFlags(adventure.flags, srcName, targetName);
    adventure.actors = adventure.actors.map(actor => convertActor(actor, srcName, targetName));
    adventure.items = adventure.items.map(item => convertItem(item, srcName, targetName));
    adventure.journal = adventure.journal.map(journal => convertJournal(journal, srcName, targetName));
    adventure.macros = adventure.macros.map(macro => convertMacro(macro, srcName, targetName));
    adventure.playlists = adventure.playlists.map(playlist => convertPlaylist(playlist, srcName, targetName));
    adventure.scenes = adventure.scenes.map(scene => convertScene(scene, srcName, targetName));
    adventure.tables = adventure.tables.map(table => convertTable(table, srcName, targetName));
    
    return adventure;
}

async function convertAdventureDb(path: string, srcName: string, targetName: string) {
    console.log(`Start converting ${path}...`);
    const db = new Datastore({ filename: path, autoload: true });
    const entries = await db.findAsync<Adventure>({});
    
    const promises = entries.map(async entry => {
        const converted = convertAdventure(entry, srcName, targetName);
        await db.updateAsync({ _id: entry._id }, converted);
    });

    await Promise.all(promises);
}

export async function updateDatabases(modulePath: string, srcName: string, targetName: string) {
    const moduleJsonPath = join(modulePath, 'module.json');
    
    const json = await readFile(moduleJsonPath);
    const moduleJson = JSON.parse(json.toString());

    const promises = moduleJson.packs.map(async (pack: { path: string, type: string }) => {
        if (pack.type === 'Adventure') {
            await convertAdventureDb(join(modulePath, pack.path), srcName, targetName);
        }
    });

    return Promise.all(promises);
}