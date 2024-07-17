import { Level } from 'level';
import Datastore from '@seald-io/nedb';
import { existsSync, readFileSync } from 'fs-extra';
import { readFile } from 'fs/promises';
import { join, parse } from 'path';
import { generateId } from './generateId';

const ITEM_TYPE: Record<string, string> = {
    background: 'ability',
    backpack: 'gear',
    class: 'edge',
    consumable: 'gear',
    container: 'gear',
    equipment: 'armor',
    feat: 'edge',
    loot: 'gear',
    spell: 'power',
    subclass: 'edge',
    tool: 'gear',
    weapon: 'weapon',
};

const SPECIAL_ABILITIES: Record<string, string> = {
    Etherealness: 'Ethereal',
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

const SIZE_MAP: Record<string, { size: number, scale: number, label: string }> = {
    tiny: { size: -4, scale: -6, label: 'Tiny' },
    sm: { size: -2, scale: -2, label: 'Small' },
    med: { size: 0, scale: 0, label: 'Medium' },
    lg: { size: 4, scale: 2, label: 'Large' },
    huge: { size: 8, scale: 4, label: 'Huge' },
    grg: { size: 12, scale: 6, label: 'Gargantuan' },
};

interface Texture {
    src: string | null,
}

interface Effect {
    disabled: boolean,
    _stats?: unknown,
}

interface Item {
    _id: string,
    name: string,
    img: string | null,
    type: string,
    system: any,
    flags?: Record<string, unknown>,
    effects: Effect[],
    _stats?: unknown;
}

interface ActorDelta {
    name: string | null,
    img: string | null,
    type: string | null,
    items: Item[],
    flags?: Record<string, unknown>,
    effects: Effect[],
    syntheticActor: Actor;
}

interface Token {
    _id: string,
    bar1: {
        attribute: string | null,
    },
    bar2: {
        attribute: string | null,
    },
    texture: Texture,
    flags?: Record<string, unknown>,
    sight: {
        range: number,
    },
    light: {
        bright: number,
        dim: number;
    },
    actorData: any;
    delta: ActorDelta;
    _stats?: unknown;
}

interface Actor {
    _id: string,
    name: string,
    img: string | null,
    type: string,
    system: any,
    prototypeToken: Token,
    items: Item[],
    flags?: Record<string, unknown>,
    effects: Effect[],
    _stats?: unknown;
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
        _stats?: unknown;
    }>,
    flags?: Record<string, unknown>,
    _stats?: unknown;
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
    _stats?: unknown;
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
    _stats?: unknown;
}

interface Macro {
    _id: string,
    name: string,
    img: string | null,
    type: string,
    command: string | null,
    flags?: Record<string, unknown>,
    _stats?: unknown;
}

interface Playlist {
    _id: string,
    name: string,
    sounds: Array<{
        path: string,
        flags?: Record<string, unknown>,
    }>,
    flags?: Record<string, unknown>,
    _stats?: unknown;
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

function capitalize(string: string | null | undefined): string | null | undefined {
    if (!string) return string;

    return String(string).charAt(0).toUpperCase() + string.slice(1);
}

function getModifierByDc(dc: number): number {
    if (dc <= 7) return 4;
    if (dc <= 12) return 2;
    if (dc <= 17) return 0;
    if (dc <= 22) return -2;
    if (dc <= 27) return -4;

    return -8;
}

function modifierToString(modifier: number): string {
    if (modifier > 0) return `+${modifier}`;
    else if (modifier < 0) return `${modifier}`;

    return '';
}

function modify(trait: string, dc: string | number): string {
    let mod = modifierToString(getModifierByDc(Number(dc)));
    if (!mod) return trait;

    return `${trait} ${mod}`;
}

function toTitleText(title: string) {
    return title
        .replace(/<\/[^>]+(>|$)/g, '') // remove html
        .replace(/"/g, '&quot;'); // replace quotes
}

function replacePaths(text: string | null, srcName: string, targetName: string) {
    if (!text) return text;

    return text.replace(new RegExp(`modules/${srcName}/`, 'g'), `modules/${targetName}/`);
}

function replaceSkillName(text: string) {
    return text
        .replace(/\b(acrobatics)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Athletics</span>`)
        .replace(/\b(animal handling)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Survival</span>`)
        .replace(/\b(arcana)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Occult</span>`)
        .replace(/\b(deception)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Persuasion</span>`)
        .replace(/\b(history)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Academics</span>`)
        .replace(/\b(insight)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Notice</span>`)
        .replace(/\b(investigation)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Notice</span>`)
        .replace(/\b(medicine)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Healing</span>`)
        .replace(/\b(nature)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Science</span>`)
        .replace(/\b(perception)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Notice</span>`)
        .replace(/\b(religion)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Academics</span>`)
        .replace(/\b(sleight of hand)\b(?![^<]*>)/gi, (all, skill) => `<span title="${toTitleText(skill)}">Thievery</span>`)
}

function getSkillName(shortSkill: string) {
    return Object.entries(SKILL_MAP).filter(([_, srcSkills]) => srcSkills.includes(shortSkill)).map(([targetSkill]) => targetSkill)[0] ?? shortSkill;
}

function replaceChecks(text: string) {
    const x = text.replace(/\[\[\/check\s+([^\]]*)]](\{[^\}]+})?(?![^<]*>)/gi, (all, attrString: string) => {
        const { skill, dc } = attrString.split(' ').reduce((map, attr) => {
            const [name, value] = attr.split('=');
            map[name] = value;
            return map;
        }, {} as Record<string, string>);
        const skillName = getSkillName(skill);
        return `<span title="${all}"><i class="fa-solid fa-dice-d20"></i> ${modify(skillName, dc)}</span>`;
    });

    return x;
}

function fixupDcs(text: string | null) {
    if (!text) return text;

    const x = text.replace(/saving throw/gi, 'roll')
        .replace(/(?:dc [0-9]+ )?(?:intelligence|strength|constitution|wisdom|charisma|dexterity) \(([^)]+)\)/gi, '$1')
        .replace(/.*/, replaceChecks)
        .replace(/.*/, replaceSkillName)
        .replace(/dexterity(?![^<]*>)/gi, 'Agility')
        .replace(/constitution(?![^<]*>)/gi, 'Vigor')
        .replace(/wisdom(?![^<]*>)/gi, 'Spirit')
        .replace(/charisma(?![^<]*>)/gi, 'Spirit (Charisma)')
        .replace(/intelligence(?![^<]*>)/gi, 'Smarts')

        .replace(/<span title="([^"]+)">((?:<i class="fa-solid fa-dice-d20"><\/i> )?\w+)<\/span>([, or]+)<span title="([^"]+)">\2<\/span>/gi, '<span title="$1$3$4">$2</span>') // remove duplicates, like "Notice or Notice"
        .replace(/DC ([0-9]+)(?![^<]*>)/gi, (all, dc) => `<span title="${all}"><i class="fa-solid fa-dice-d20"></i> ${modifierToString(getModifierByDc(Number(dc)))}</span>`)
        .replace('(\w)[ ]+', '$1'); // Remove extra whitespaces after all these replacements

    if (/The Scullion and the Greenhouse Sprites hate/.test(x)) {
        console.log('----------------');
        console.log(x);
    }

    return x;
}

function fixFlags(flags: Record<string, any> | undefined, srcName: string, targetName: string): Record<string, any> | undefined {
    if (!flags?.[srcName]) return flags;

    flags[targetName] = flags[srcName];
    delete flags[srcName];

    return flags;
}

function secret(text: string | null): string | null {
    if (!text) return '';

    return `<section class="secret">${fixupDcs(text)}</section>`;
}

function createNotes(data: any): string {
    const notes: string[] = [];

    if (data.properties.mgc) notes.push('magic');
    if (data.properties.ada) notes.push('adamantine');
    if (data.properties.sil) notes.push('alchemical silver');
    if (data.properties.rch) notes.push('reach');
    if (data.properties.two) notes.push('two hands');

    return notes.join(', ');
}

function getRange(rangeInFt: number): string {
    const base = Math.floor(rangeInFt / 5);

    if (base === 1) return '';

    return `${base}/${base * 2}/${base * 4}`;
}

function getItemType(item: any): string {
    if (item.type === 'equipment' && item.system.armor?.type === 'trinket') return 'gear';

    if (!ITEM_TYPE[item.type]) {
        console.error(item);
        throw new Error(`Unknown type ${item.type}`);
    }

    return ITEM_TYPE[item.type];
}

function convertEffect(effect: Effect): Effect {
    return {
        ...effect,
        disabled: true,
        _stats: undefined,
    };
}

function convertItem(item: Item, srcName: string, targetName: string): Item {
    item.img = replacePaths(item.img, srcName, targetName);

    item.type = getItemType(item);
    item.flags = fixFlags(item.flags, srcName, targetName);
    item.effects = item.effects.map(effect => convertEffect(effect));

    let systemStats = {};

    if (SPECIAL_ABILITIES[item.name]) {
        item.name = SPECIAL_ABILITIES[item.name];
        item.type = 'ability';
        systemStats = {
            subtype: 'special',
        };
    }

    if (item.type === 'weapon') {
        let actions: Record<string, any> = {};
        if (item.system.actionType === 'mwak' && item.system.properties.thr) {
            actions[generateId()] = {
                name: 'Throw',
                rof: null,
                shotsUsed: null,
                skillMod: '',
                skillOverride: 'Athletics',
                type: 'skill',
            };
        }

        systemStats = {
            ...systemStats,
            actions: {
                skill:
                    item.system.actionType === 'mwak' ? 'Fighting' :
                        item.system.actionType === 'rwak' ? 'Shooting' :
                            'Athletics',
                additional: actions
            },
            ap: item.system.properties?.mgc ? '1' : '0',
            currentShots: '0',
            shots: '0',
            damage: item.system.damage?.parts?.[0]?.[0]?.replace('@mod', '@str') ?? '',
            equipStatus: 4,
            minStr: item.system.damage?.parts?.[0]?.[0]?.match(/^d[0-9]+/)?.[0] ?? 'd4',
            notes: createNotes(item.system),
            parry: 0,
            range: item.system.range?.value ? getRange(item.system.range.value) : '',
            rof: '0',
            isHeavyWeapon: item.system.properties?.hvy ?? false,
            autoReload: (!item.system.properties?.lod && !item.system.properties?.rel) ?? false,
        };
    }

    if (item.type === 'armor') {
        systemStats = {
            ...systemStats,
            armor:
                item.system.armor.type === 'light' ? 2 :
                    item.system.armor.type === 'medium' ? 3 :
                        item.system.armor.type === 'heavy' ? 4 :
                            0,
            isHeavyArmor: false,
            isNaturalArmor: false,
            locations: {
                head: false,
                torso: true,
                arms: true,
                legs: false,
            },
            minStr:
                item.system.armor.type === 'light' ? 'd6' :
                    item.system.armor.type === 'medium' ? 'd8' :
                        item.system.armor.type === 'heavy' ? 'd10' :
                            'd4',
            notes: '',
            toughness: '',
            equipStatus: 3,
        };
    }

    item.system = {
        description: secret(item.system.description?.unidentified) + fixupDcs(item.system.description?.value ?? '')!,
        isArcaneBackground: item.type === 'edge' && item.name.toLowerCase() === 'spellcasting',
        weight: item.system.weight?.value,
        price: item.system.price?.value,
        quantity: item.system.quantity,
        source: item.system.source,
        category: [item.system.rarity, item.system.baseItem].filter(Boolean).join(' '),
        isAmmo: item.system.properties?.amm ?? false,
        equippable: item.system.armor?.type ? true : false,

        ...systemStats,
    };

    delete item._stats;

    return item;
}

function convertToken(token: Token, srcName: string, targetName: string): Token {
    token.actorData = {};
    token.texture.src = replacePaths(token.texture.src, srcName, targetName);
    token.bar1.attribute = null;
    token.bar2.attribute = null;
    token.flags = fixFlags(token.flags, srcName, targetName);

    token.light.bright /= 5;
    token.light.dim /= 5;
    token.sight.range /= 5;

    if (!token.delta) {
        return token;
    }

    if (token.delta.flags) {
        token.delta.flags = fixFlags(token.delta.flags, srcName, targetName);
    }

    if (token.delta.effects) {
        token.delta.effects = token.delta.effects.map(effect => convertEffect(effect));
    }

    if (token.delta.items) {
        token.delta.items = token.delta.items.map(item => convertItem(item, srcName, targetName))
    }

    delete token._stats;

    return token;
}

function convertValue(value: number, modifier = 0): Die {
    if (value <= 2) return { sides: 4, modifier };
    if (value <= 4) return { sides: 6, modifier };
    if (value <= 6) return { sides: 8, modifier };
    if (value <= 8) return { sides: 10, modifier };

    return { sides: 12, modifier: Math.ceil((value - 11) / 3) + modifier };
}

function createSkill(name: string, value: number, modifier = 0): Item {
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
        effects: [],
    };
}

function getAbilityValue(ability: { value: number }) {
    return (ability.value ?? 10) - 9;
}

function getAbilityModifier(actor: Actor, abilityName: string): number {
    const ability = actor.system.abilities?.[abilityName];

    if (!ability) return 0;

    return Math.floor((ability.value - 10) / 2);
}

function getProfBonus(actor: Actor, skillName: string): number {
    const skill = actor.system.skills[skillName];
    if (skill?.prof) return skill?.prof;

    const multiplier = skill.value ?? 0;

    if (actor.system.attributes?.prof) return actor.system.attributes?.prof * multiplier;
    if (actor.system.details?.cr) return (Math.ceil(Math.max(actor.system.details.cr, 1) / 4) + 1) * multiplier;

    return 0;
}

function getSkillValue(actor: Actor, skillName: string) {
    const skill = actor.system.skills[skillName];
    if (!skill) return 0;

    return getAbilityModifier(actor, skill.ability) + getProfBonus(actor, skillName);
}

function createAdditionalStatWithKey(key: string, label: string, value: any): Record<string, { dtype: string, hasMaxValue: boolean, isCheckbox: boolean, label: string, value: any }> {
    if (!value) return {};

    return {
        [key]: {
            label,
            value,
            dtype: 'String',
            hasMaxValue: false,
            isCheckbox: false,
        },
    };
}

function convertActor(actor: Actor, srcName: string, targetName: string): Actor {
    const system = actor.system;
    const isSpellcaster = system.details.spellLevel > 0;

    const skills = Object
        .entries(SKILL_MAP)
        .map(([targetSkill, srcSkills]) => ([targetSkill, Math.max(...srcSkills.map(skill => getSkillValue(actor, skill)))] as [string, number]))
        .filter(([, skillValue]) => skillValue > 0)
        .map(([targetSkill, skillValue]) => createSkill(targetSkill, skillValue));

    const meleeWeapon = actor.items.find(item => item.type === 'weapon' && item.system.actionType === 'mwak' && item.system.proficient);
    const rangedWeapon = actor.items.find(item => item.type === 'weapon' && item.system.actionType === 'rwak' && item.system.proficient);

    const meleeAttr = meleeWeapon?.system.ability || (meleeWeapon?.system.properties?.fin ? 'dex' : 'str');
    const rangedAttr = rangedWeapon?.system.ability || 'dex';

    if (meleeAttr) skills.push(createSkill('Fighting', getAbilityValue(system.abilities[meleeAttr])));
    if (rangedAttr) skills.push(createSkill('Shooting', getAbilityValue(system.abilities[rangedAttr])));

    if (isSpellcaster && (system.attributes?.spellcasting === 'int' || system.attributes?.spellcasting === 'cha')) {
        skills.push(createSkill('Spellcasting', getAbilityValue(system.abilities?.[system.attributes?.spellcasting])));
    }

    if (isSpellcaster && system.attributes?.spellcasting === 'wis') {
        skills.push(createSkill('Faith', getAbilityValue(system.abilities?.[system.attributes?.spellcasting])));
    }

    skills.push(createSkill('Unskilled Attempt', 0, -2));

    const languages = system.traits.languages?.value ?? [];
    if (system.traits.languages?.custom)
        languages.push(...system.traits.languages?.custom?.split(';').map((l: string) => l.trim()).filter((x: string) => !!x));

    const swarm = SIZE_MAP[system.details?.type.swarm]?.label;
    const creatureType = `${swarm ? `Swarm of ${swarm} ` : ''}${capitalize(system.details?.type.custom || system.details?.type.value)}${system.details?.type.subtype ? ` (${system.details?.type.subtype})` : ''}`;
    const speedInch = Math.round((system.attributes?.movement?.walk || 30) / 5);

    actor.system = {
        additionalStats: {
            ...createAdditionalStatWithKey('languages', 'Languages', languages.join(', ')),
            ...createAdditionalStatWithKey('align', 'Alignment', system.details?.alignment),
            ...createAdditionalStatWithKey('type', 'Creature Type', creatureType),
            ...createAdditionalStatWithKey('cr', 'CR', system.details?.cr),
        },
        details: {
            notes: fixupDcs(system.description?.value ?? ''),
            appearance: fixupDcs(system.details.appearance ?? ''),
            biography: {
                value: fixupDcs(`
                ${system.details.biography?.value ? system.details.biography?.value : ''}
                ${system.details.background ? system.details.background : ''}
                ${system.details.trait ? system.details.trait : ''}
                ${system.details.ideal ? system.details.ideal : ''}
                ${system.details.bond ? system.details.bond : ''}
                ${system.details.flaw ? system.details.flaw : ''}
                `)
            },
            archetype: '',
            species: {
                name: system.details.race ?? '',
            },
        },
        attributes: {
            agility: { die: convertValue(getAbilityValue(system.abilities.dex)) },
            smarts: { die: convertValue(getAbilityValue(system.abilities.int)) },
            spirit: { die: convertValue(Math.max(getAbilityValue(system.abilities.wis), getAbilityValue(system.abilities.cha))) },
            strength: { die: convertValue(getAbilityValue(system.abilities.str)) },
            vigor: { die: convertValue(getAbilityValue(system.abilities.con)) },
        },
        stats: {
            ...(SIZE_MAP[system.traits.size] ?? { size: 0, scale: 0 }),
            speed: {
                runningDie: 6 + Math.floor((speedInch - 6) / 2),
                runningMod: 0,
                value: Math.round(speedInch),
                adjusted: Math.round(speedInch)
            }
        },
        wildcard: false,
    };

    actor.img = replacePaths(actor.img, srcName, targetName);
    actor.prototypeToken = convertToken(actor.prototypeToken, srcName, targetName);
    actor.flags = fixFlags(actor.flags, srcName, targetName);
    actor.effects = actor.effects.map(effect => convertEffect(effect));
    actor.items = actor.items.map(item => convertItem(item, srcName, targetName))
    actor.items.push(...skills);

    if (system.attributes?.movement?.fly) {
        actor.items.push({
            _id: generateId(),
            name: `Flight (${system.attributes?.movement?.fly / 5})`,
            type: 'ability',
            img: '',
            system: {
                subtype: 'special',
            },
            effects: [],
        });
    }

    if (system.attributes?.movement?.burrow) {
        actor.items.push({
            _id: generateId(),
            name: `Burrow (${system.attributes?.movement?.fly / 5})`,
            type: 'ability',
            img: '',
            system: {
                subtype: 'special',
            },
            effects: [],
        });
    }

    if (system.attributes.senses.darkvision) {
        actor.items.push({
            _id: generateId(),
            name: 'Darkvision',
            type: 'ability',
            img: '',
            system: {
                subtype: 'special',
            },
            effects: [],
        });
    }

    if (system.attributes.senses.blindsight) {
        actor.items.push({
            _id: generateId(),
            name: 'Blindsense',
            type: 'ability',
            img: '',
            system: {
                subtype: 'special',
            },
            effects: [],
        });
    }

    delete actor._stats;

    return actor;
}

function convertMacro(macro: Macro, srcName: string, targetName: string): Macro {
    macro.img = replacePaths(macro.img, srcName, targetName);
    macro.command = replacePaths(macro.command, srcName, targetName);

    const macroReplacementPath = join(__dirname, '../extras/macros', `${macro._id}.js`);

    if (existsSync(macroReplacementPath)) {
        macro.command = readFileSync(macroReplacementPath).toString();
    }

    if (macro.command) {
        macro.command = macro.command.replace(new RegExp(`(get|set|getFlag|register)\\((['"])${srcName}(['"])`, 'g'), `$1($2${targetName}$3`);
    }

    macro.flags = fixFlags(macro.flags, srcName, targetName);

    delete macro._stats;

    return macro;
}

function convertJournal(journal: Journal, srcName: string, targetName: string): Journal {
    journal.flags = fixFlags(journal.flags, srcName, targetName);

    journal.pages = journal.pages.map(page => {
        if (page.text?.content) page.text.content = fixupDcs(replacePaths(page.text.content, srcName, targetName));
        page.flags = fixFlags(page.flags, srcName, targetName);

        delete page._stats;

        // TODO: Support for image pages?
        return page;
    });

    delete journal._stats;

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

    delete table._stats;

    return table;
}

function convertScene(scene: Scene, srcName: string, targetName: string): Scene {
    scene.background.src = replacePaths(scene.background.src, srcName, targetName)!;
    scene.foreground = replacePaths(scene.foreground, srcName, targetName);
    scene.thumb = replacePaths(scene.thumb, srcName, targetName);
    scene.flags = fixFlags(scene.flags, srcName, targetName);
    scene.grid.type = 0;
    scene.grid.distance = 1;
    scene.grid.units = 'in';

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
    delete scene._stats;

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

    const parsedPath = parse(path);
    const levelDbPath = join(parsedPath.dir, parsedPath.name);

    const db = new Level(levelDbPath);

    for await (const key of db.keys()) {
        const entry = await db.get(key);
        const converted = convertAdventure(JSON.parse(entry) as Adventure, srcName, targetName);
        await db.del(key);
        await db.put(key, JSON.stringify(converted));
    }

    await db.close();
    console.log('    ...done');
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