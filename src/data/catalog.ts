import {
  CharacterDef,
  CharacterId,
  CosmeticItem,
  CustomMatchRules,
  EmoteId,
  FlameColorId,
  GunWrapId,
  MapId,
  MatchGameMode,
  MeleeWeaponDef,
  MeleeWeaponId,
  OutfitId,
  PrimaryWeaponId,
  RankDef,
  SecondaryWeaponId,
  SprayId,
  WeaponDef,
  WeaponId,
  WeaponMasteryTier,
} from '../types/game';

export const RANKS: RankDef[] = [
  { id: 'intern', title: 'Intern', minXp: 0, badgeColor: '#94A3B8', stars: 1 },
  { id: 'councilor', title: 'Councilor', minXp: 250, badgeColor: '#38BDF8', stars: 2 },
  { id: 'senator', title: 'Senator', minXp: 750, badgeColor: '#10B981', stars: 3 },
  { id: 'minister', title: 'Minister', minXp: 1600, badgeColor: '#F59E0B', stars: 4 },
  {
    id: 'prime_commander',
    title: 'Prime Commander',
    minXp: 3000,
    badgeColor: '#EF4444',
    stars: 5,
  },
];

export function getRankForXp(xp: number): RankDef {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (xp >= rank.minXp) {
      current = rank;
    }
  }
  return current;
}

export function getNextRank(xp: number): RankDef | null {
  for (const rank of RANKS) {
    if (xp < rank.minXp) {
      return rank;
    }
  }
  return null;
}

export interface GameModeDef {
  id: MatchGameMode;
  name: string;
  shortName: string;
  teamBased: boolean;
  scoreLimit: number;
  scoreLabel: string;
  accentColor: string;
  description: string;
}

export const GAME_MODE_CATALOG: GameModeDef[] = [
  {
    id: 'tdm',
    name: 'Team Deathmatch',
    shortName: 'TDM',
    teamBased: true,
    scoreLimit: 40,
    scoreLabel: 'Kills',
    accentColor: '#EF4444',
    description: 'Team Alpha vs Team Bravo battle to reach 40 eliminations first. Friendly fire disabled.',
  },
  {
    id: 'hardpoint',
    name: 'Hardpoint',
    shortName: 'Hardpoint',
    teamBased: true,
    scoreLimit: 200,
    scoreLabel: 'Pts',
    accentColor: '#F59E0B',
    description: 'Capture the glowing tactical zone rotating every 45s. Earn +1 pt/sec up to 200 pts.',
  },
  {
    id: 'domination',
    name: 'Domination',
    shortName: 'Domination',
    teamBased: true,
    scoreLimit: 200,
    scoreLabel: 'Pts',
    accentColor: '#38BDF8',
    description: 'Control Flags A, B, and C across the map. Each held flag scores +1 pt every 2s to 200.',
  },
  {
    id: 'ffa',
    name: 'Free-For-All',
    shortName: 'FFA',
    teamBased: false,
    scoreLimit: 20,
    scoreLabel: 'Kills',
    accentColor: '#A855F7',
    description: 'Every operative for themselves. First fighter to 20 eliminations claims victory.',
  },
  {
    id: 'ctf',
    name: 'Capture the Flag',
    shortName: 'CTF',
    teamBased: true,
    scoreLimit: 3,
    scoreLabel: 'Captures',
    accentColor: '#10B981',
    description: 'Steal the enemy flag and return it to your base while your flag is home. First to 3 wins.',
  },
  {
    id: 'gun_game',
    name: 'Gun Game',
    shortName: 'Gun Game',
    teamBased: false,
    scoreLimit: 11,
    scoreLabel: 'Tier',
    accentColor: '#F43F5E',
    description: 'Free-For-All! Advance through 10 weapons on every kill and land the final Melee kill to win.',
  },
  {
    id: 'vip',
    name: 'VIP: Protect the Chai',
    shortName: 'VIP Chai',
    teamBased: true,
    scoreLimit: 25,
    scoreLabel: 'Pts',
    accentColor: '#FACC15',
    description: 'One glowing 300 HP VIP per team. Eliminating the enemy VIP scores 2x points!',
  },
  {
    id: 'boss_raid',
    name: 'Boss Raid: Mega Baron',
    shortName: 'Boss Raid',
    teamBased: true,
    scoreLimit: 1,
    scoreLabel: 'Boss',
    accentColor: '#22D3EE',
    description: 'Squad up 4v1 against a 1,500 HP Mega Baron Voltage wielding dual miniguns & Arcane EMP Storms.',
  },
  {
    id: 'one_in_chamber',
    name: 'One-in-the-Chamber',
    shortName: '1-Chamber',
    teamBased: false,
    scoreLimit: 15,
    scoreLabel: 'Kills',
    accentColor: '#EC4899',
    description: '1 HP max! Spawn with Melee + Pistol (1 bullet). Every kill grants +1 golden round.',
  },
];

export function getGameModeDef(mode: MatchGameMode | string): GameModeDef {
  const norm = normalizeGameMode(mode);
  return GAME_MODE_CATALOG.find((m) => m.id === norm) || GAME_MODE_CATALOG[0];
}

export function normalizeGameMode(raw: unknown): MatchGameMode {
  if (
    raw === 'tdm' ||
    raw === 'hardpoint' ||
    raw === 'domination' ||
    raw === 'ffa' ||
    raw === 'ctf' ||
    raw === 'gun_game' ||
    raw === 'vip' ||
    raw === 'boss_raid' ||
    raw === 'one_in_chamber'
  ) {
    return raw;
  }
  if (raw === 'koth') return 'hardpoint';
  if (raw === 'deathmatch') return 'ffa';
  return 'tdm';
}

export const DEFAULT_CUSTOM_RULES: CustomMatchRules = {
  gravityScale: 1,
  infiniteFuel: false,
  oneHitSnipers: false,
  durationSec: 240,
  gameMode: 'tdm',
  enableKillstreaks: true,
  showFpsPing: true,
};

export interface MapCatalogItem {
  id: MapId;
  name: string;
  shortName: string;
  weatherLabel: string;
  hazardLabel: string;
  accentColor: string;
  bgGradient: string;
  description: string;
}

export const MAP_CATALOG: MapCatalogItem[] = [
  {
    id: 'city_dusk',
    name: 'Abandoned City (Dusk)',
    shortName: 'Dusk City',
    weatherLabel: 'Dusk Ash & Lightning',
    hazardLabel: 'Glass Windows & Barrels',
    accentColor: '#38BDF8',
    bgGradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #7C2D12 100%)',
    description:
      'Ruined skyscrapers, flickering neon signs, streetlamps, shatterable glass panes, and explosive barrels.',
  },
  {
    id: 'jungle_fortress',
    name: 'Overgrown Jungle Fortress',
    shortName: 'Jungle Fortress',
    weatherLabel: 'Monsoon Rain & Leaves',
    hazardLabel: 'Flooded Water Pools',
    accentColor: '#10B981',
    bgGradient: 'linear-gradient(135deg, #052E16 0%, #065F46 55%, #14532D 100%)',
    description:
      'Multi-tiered temple ruins, swaying vines, mossy stone bridges, crate cover, and shallow jungle water pools.',
  },
  {
    id: 'scorched_desert',
    name: 'Scorched Desert Outpost',
    shortName: 'Desert Outpost',
    weatherLabel: 'Periodic Sandstorms',
    hazardLabel: 'Visibility Gusts & Drums',
    accentColor: '#F59E0B',
    bgGradient: 'linear-gradient(135deg, #451A03 0%, #92400E 55%, #D97706 100%)',
    description:
      'Sun-baked sand dunes, crumbling sandstone bunkers, fuel drums, oasis ledges, and sweeping sandstorms.',
  },
  {
    id: 'arctic_bunker',
    name: 'Arctic Border Bunker',
    shortName: 'Arctic Bunker',
    weatherLabel: 'Blizzard Snowfall',
    hazardLabel: 'Low-Friction Ice Floors',
    accentColor: '#7DD3FC',
    bgGradient: 'linear-gradient(135deg, #0C4A6E 0%, #1E3A8A 55%, #334155 100%)',
    description:
      'Snowy mountain ridges, slippery frosted ice platforms, radar towers, glass skylights, and blizzard gusts.',
  },
  {
    id: 'hybrid_arena',
    name: 'Tri-Zone Frontier (Hybrid)',
    shortName: 'Hybrid Frontier',
    weatherLabel: 'Triple Biome Front',
    hazardLabel: 'Full 4400m Endurance',
    accentColor: '#A855F7',
    bgGradient: 'linear-gradient(135deg, #0F172A 0%, #065F46 50%, #92400E 100%)',
    description:
      'Classic mega-arena spanning Abandoned City, Forest Maze, and Desert Outpost with all landmarks.',
  },
];

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'chai_storm',
    name: 'Chai Storm',
    archetype: 'The Hyper-Caffeinated Uncle',
    tagline: 'Giant round spectacles, wild mustache, sweater-vest & belt chai tumbler.',
    skinTone: '#DFAC84',
    hairColor: '#CBD5E1',
    hairStyle: 'chai_specs',
    defaultSuitColor: '#B45309',
    tieColor: '#FEF3C7',
    passivePerkTitle: 'Cutting Chai Speed',
    passivePerkDesc: '+20% faster weapon reload speed.',
    ultimateTitle: 'Kadak Shockwave',
    ultimateDesc: 'Slams a giant kettle down, blasting nearby enemies backward with hot tea steam.',
    killQuips: ['Ek cup aur!', 'Biscuit dipped!', 'Too hot to handle!'],
    spawnQuips: ['Ek cup aur!', 'Adrak wali chai ready!'],
    ultQuips: ['KADAK SHOCKWAVE!', 'Too hot to handle!'],
  },
  {
    id: 'baron_voltage',
    name: 'Baron Voltage',
    archetype: 'The Armored Tech-Sorcerer',
    tagline: 'Riveted brass-and-cobalt iron mask, crimson-charcoal hooded cloak & crackling gauntlet coils.',
    skinTone: '#CBD5E1',
    hairColor: '#22D3EE',
    hairStyle: 'voltage_mask',
    defaultSuitColor: '#7F1D1D',
    tieColor: '#22D3EE',
    passivePerkTitle: 'Arcane Capacitor',
    passivePerkDesc: '+15% faster Ultimate charge & immune to EMP jetpack disable.',
    ultimateTitle: 'Arcane EMP Storm',
    ultimateDesc: 'Unleashes an expanding ring of blue lightning bolts shocking enemies, disabling jetpacks & dealing DoT.',
    killQuips: ['Kneel before science!', '1.21 Gigawatts of doom!', 'My armor is scratch-proof!'],
    spawnQuips: ['1.21 Gigawatts of doom!', 'My armor is scratch-proof!'],
    ultQuips: ['ARCANE EMP STORM!', 'Kneel before science!'],
  },
  {
    id: 'captain_jalebi',
    name: 'Captain Jalebi',
    archetype: 'The Sugar-Rush Sprinter',
    tagline: 'Bright orange headband, white track jacket, neon sneakers & pretzel cape.',
    skinTone: '#E8B690',
    hairColor: '#1E293B',
    hairStyle: 'jalebi_band',
    defaultSuitColor: '#F8FAFC',
    tieColor: '#F97316',
    passivePerkTitle: 'Syrup Stride',
    passivePerkDesc: '+12% base run speed & +15% max jetpack fuel.',
    ultimateTitle: 'Sugar Rush Overdrive',
    ultimateDesc: 'Doubles movement speed & gives infinite jetpack boost for 6s with rainbow trails.',
    killQuips: ["Can't catch me!", '100% sweet victory!', 'Zoom zoom!'],
    spawnQuips: ['Zoom zoom!', 'Extra crispy speed!'],
    ultQuips: ['SUGAR RUSH!', "Can't catch me!"],
  },
  {
    id: 'baba_wifi',
    name: 'Baba Wi-Fi',
    archetype: 'The High-Tech Mystic',
    tagline: 'Neon orange robes, glowing VR visor, floating antenna & levitating sandals.',
    skinTone: '#E5B28A',
    hairColor: '#FB923C',
    hairStyle: 'wifi_visor',
    defaultSuitColor: '#EA580C',
    tieColor: '#22D3EE',
    passivePerkTitle: 'Fiber Aura',
    passivePerkDesc: '+25 bonus Max HP (125 HP total).',
    ultimateTitle: 'Firewall Shield',
    ultimateDesc: 'Surrounds himself in a glowing hexagonal cyber-dome blocking all incoming bullets for 5s.',
    killQuips: ['No signal for you!', 'Buffering... eliminated!', '5G blessings!'],
    spawnQuips: ['5G blessings!', 'Full bars connected!'],
    ultQuips: ['FIREWALL SHIELD!', 'No signal for you!'],
  },
  {
    id: 'general_noodle',
    name: 'General Noodle',
    archetype: 'The Drama Drone Master',
    tagline: 'Bowl-cut helmet, puffy winter parka & twin hovering paper-lantern drones.',
    skinTone: '#F2C9A5',
    hairColor: '#111827',
    hairStyle: 'bowl_drones',
    defaultSuitColor: '#1F2937',
    tieColor: '#EF4444',
    passivePerkTitle: 'Express Broth',
    passivePerkDesc: '+25% faster Ultimate charge from dealing damage.',
    ultimateTitle: 'Spicy Noodle Swarm',
    ultimateDesc: 'Launches 3 homing firework rockets chasing the nearest opponents.',
    killQuips: ['Extra spicy!', 'Delivery incoming!', 'Out of stock!'],
    spawnQuips: ['Delivery incoming!', 'Extra chili oil!'],
    ultQuips: ['SPICY NOODLE SWARM!', 'Extra spicy!'],
  },
  {
    id: 'agent_404',
    name: 'Agent 404',
    archetype: 'The Clumsy Secret Spy',
    tagline: 'Trench coat, low fedora, fake stick-on mustache & glowing green NVGs.',
    skinTone: '#ECC8AE',
    hairColor: '#27272A',
    hairStyle: 'spy_fedora',
    defaultSuitColor: '#44403C',
    tieColor: '#22C55E',
    passivePerkTitle: 'Classified Optics',
    passivePerkDesc: 'Tighter bullet spread & 35% reduced weapon recoil.',
    ultimateTitle: 'Glitch Teleport',
    ultimateDesc: 'Vanishes in digital pixels & reappears behind the nearest enemy with a 5s damage boost.',
    killQuips: ['Error: Target not found!', 'Totally stealthy!', 'Calculated!'],
    spawnQuips: ['Totally stealthy!', 'Incognito mode on!'],
    ultQuips: ['GLITCH TELEPORT!', 'Error: Target not found!'],
  },
  {
    id: 'prof_jugaad',
    name: 'Professor Jugaad',
    archetype: 'The Duct-Tape DIY Genius',
    tagline: 'Wild Einstein hair, crooked goggles, taped lab coat & soda-cooker jetpack.',
    skinTone: '#E8B892',
    hairColor: '#F8FAFC',
    hairStyle: 'einstein_goggles',
    defaultSuitColor: '#E2E8F0',
    tieColor: '#94A3B8',
    passivePerkTitle: 'Duct-Tape Blast',
    passivePerkDesc: '+20% larger grenade & rocket explosion radius.',
    ultimateTitle: 'Pressure Cooker Seeti Blast',
    ultimateDesc: 'Drops an overheating cooker that whistles for 1.5s then erupts in a confetti blast.',
    killQuips: ['100% Jugaad guaranteed!', 'Duct tape fixes everything!', 'Seeti baj gayi!'],
    spawnQuips: ['100% Jugaad guaranteed!', 'Hold my wrench!'],
    ultQuips: ['SEETI BLAST!', 'Duct tape fixes everything!'],
  },
  {
    id: 'chappal_ninja',
    name: 'Chappal Ninja',
    archetype: 'The Undefeated Desi Mom',
    tagline: 'Floral kurti with utility belt, glowing hairpin bun & golden winged slipper.',
    skinTone: '#DDA982',
    hairColor: '#1E1B4B',
    hairStyle: 'bun_hairpin',
    defaultSuitColor: '#BE185D',
    tieColor: '#FBBF24',
    passivePerkTitle: 'Maternal Reflex',
    passivePerkDesc: '+20% faster melee cooldown & +10% move speed.',
    ultimateTitle: 'Heat-Seeking Flying Chappal',
    ultimateDesc: 'Throws a giant glowing slipper that bounces 3 times & locks on for heavy stun.',
    killQuips: ['Wait till you get home!', '99.9% accuracy!', 'Who broke my vase?!'],
    spawnQuips: ['Who broke my vase?!', 'Clean your room first!'],
    ultQuips: ['FLYING CHAPPAL!', '99.9% accuracy!'],
  },
  {
    id: 'dj_dholak',
    name: 'DJ Dholak',
    archetype: 'The Wedding Bass Bomber',
    tagline: 'Neon sherwani, LED shutter shades, giant headphones & chest dhol drum.',
    skinTone: '#D9A074',
    hairColor: '#0F172A',
    hairStyle: 'dj_shades',
    defaultSuitColor: '#7C3AED',
    tieColor: '#F472B6',
    passivePerkTitle: 'Subwoofer Build',
    passivePerkDesc: '+15 bonus Max HP (115 HP) & louder bass drop recoil.',
    ultimateTitle: 'Baraat Bass Drop',
    ultimateDesc: 'Unleashes a sonic shockwave ring forcing nearby foes to dance uncontrollably.',
    killQuips: ['Volume 200%!', 'Balle balle boom!', 'Feel the bass!'],
    spawnQuips: ['Volume 200%!', 'DJ Dholak in the house!'],
    ultQuips: ['BARAAT BASS DROP!', 'Balle balle boom!'],
  },
  {
    id: 'aunty_cctv',
    name: 'Aunty CCTV',
    archetype: 'The Neighborhood Intel Chief',
    tagline: 'Bright pink cardigan, neck binoculars, teacup & mini satellite dish bun.',
    skinTone: '#E0AF88',
    hairColor: '#334155',
    hairStyle: 'aunty_dish',
    defaultSuitColor: '#EC4899',
    tieColor: '#FDF2F8',
    passivePerkTitle: 'Society Watch',
    passivePerkDesc: '+15% faster Ultimate charge & crisp high-velocity rounds.',
    ultimateTitle: 'Mohalla Broadcast',
    ultimateDesc: 'Reveals all enemies through walls for 8s & fires rapid binocular gossip lasers.',
    killQuips: ['I saw everything!', 'Beta, what is this behavior?', 'Breaking news!'],
    spawnQuips: ['I saw everything!', 'Balcony scan active!'],
    ultQuips: ['MOHALLA BROADCAST!', 'Breaking news!'],
  },
  {
    id: 'bhaijaan_gymbro',
    name: 'Bhaijaan Gymbro',
    archetype: 'The Protein-Shake Tank',
    tagline: 'Tiny legs, massive muscular torso, neon tank top & giant protein shaker pack.',
    skinTone: '#D49A6E',
    hairColor: '#09090B',
    hairStyle: 'gym_sweatband',
    defaultSuitColor: '#84CC16',
    tieColor: '#F43F5E',
    passivePerkTitle: 'Whey Fortress',
    passivePerkDesc: '+25 bonus Max HP (125 HP) & heavy melee knockback.',
    ultimateTitle: 'Skip Leg Day Smash',
    ultimateDesc: 'Leaps high & slams onto the arena, sending a seismic stun wave across the floor.',
    killQuips: ['Light weight baby!', 'Zero carbs, pure damage!', 'Do you even lift?!'],
    spawnQuips: ['Light weight baby!', 'Chest day forever!'],
    ultQuips: ['SKIP LEG DAY SMASH!', 'Zero carbs, pure damage!'],
  },
  {
    id: 'exam_topper',
    name: 'Exam Topper',
    archetype: 'The Caffeine-Powered Nerd',
    tagline: 'Swirl-lens glasses, medal-covered blazer, textbook backpack & ruler sword.',
    skinTone: '#ECC3A1',
    hairColor: '#1E293B',
    hairStyle: 'topper_swirl',
    defaultSuitColor: '#1D4ED8',
    tieColor: '#FACC15',
    passivePerkTitle: 'All-Nighter Espresso',
    passivePerkDesc: '+30% faster Jetpack fuel regeneration.',
    ultimateTitle: '100/100 Geometry Laser',
    ultimateDesc: 'Projects glowing protractor angles & fires a piercing laser straight through cover.',
    killQuips: [
      'Out of syllabus!',
      'Extra marks for good handwriting!',
      'Calculated to 4 decimal places!',
    ],
    spawnQuips: ['Extra marks for good handwriting!', 'Formula sheet memorized!'],
    ultQuips: ['100/100 GEOMETRY LASER!', 'Out of syllabus!'],
  },
  {
    id: 'thongi_baba',
    name: 'Thongi Baba',
    archetype: 'The Sigma Block',
    tagline: 'you come here/ aap yahan aaye',
    skinTone: '#C68B59',
    hairColor: '#3B2618',
    hairStyle: 'steve_sigma',
    defaultSuitColor: '#00AFAF',
    tieColor: '#3B3B8F',
    cost: 500,
    isPremium: true,
    passivePerkTitle: 'Sigma Jawline',
    passivePerkDesc: '+15 bonus Max HP (115 HP) & blocky sigma poise.',
    ultimateTitle: 'Yahan Wala Blast',
    ultimateDesc: 'Chiseled sigma shockwave pulse knocking nearby rivals flying.',
    killQuips: ['Aap yahan aaye!', 'You come here!', 'Sigma Jawline!'],
    spawnQuips: ['You come here...', 'Aap yahan aaye!'],
    ultQuips: ['YAHAN WALA BLAST!', 'Aap Yahan Aaye!'],
  },
];

export const DEFAULT_FREE_CHARACTERS: CharacterId[] = CHARACTERS.filter((c) => !c.isPremium).map(
  (c) => c.id
);

export const VALID_CHARACTER_IDS = new Set<CharacterId>(CHARACTERS.map((c) => c.id));

export function normalizeCharacterId(raw: unknown): CharacterId {
  if (typeof raw === 'string' && VALID_CHARACTER_IDS.has(raw as CharacterId)) {
    return raw as CharacterId;
  }
  return 'chai_storm';
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  ak: {
    id: 'ak',
    slot: 'primary',
    name: 'AK',
    shortName: 'AK',
    category: 'Assault Rifle',
    damage: 14,
    fireRateMs: 120,
    clipSize: 30,
    reloadMs: 1450,
    projectileSpeed: 1080,
    pellets: 1,
    spreadRad: 0.065,
    recoil: 58,
    explosionRadius: 0,
    bulletColor: '#F59E0B',
    length: 34,
    isAuto: true,
  },
  m4a1: {
    id: 'm4a1',
    slot: 'primary',
    name: 'M4A1 Burst AR',
    shortName: 'M4A1 Burst',
    category: 'Assault Rifle',
    damage: 13,
    fireRateMs: 360,
    clipSize: 30,
    reloadMs: 1350,
    projectileSpeed: 1220,
    pellets: 1,
    spreadRad: 0.028,
    recoil: 42,
    explosionRadius: 0,
    bulletColor: '#FDE047',
    length: 35,
    isAuto: false,
    burstCount: 3,
    burstIntervalMs: 65,
  },
  mp7: {
    id: 'mp7',
    slot: 'primary',
    name: 'MP7 Tactical SMG',
    shortName: 'MP7 SMG',
    category: 'SMG',
    damage: 10,
    fireRateMs: 78,
    clipSize: 40,
    reloadMs: 1250,
    projectileSpeed: 1120,
    pellets: 1,
    spreadRad: 0.085,
    recoil: 34,
    explosionRadius: 0,
    bulletColor: '#38BDF8',
    length: 28,
    isAuto: true,
  },
  sawshot: {
    id: 'sawshot',
    slot: 'primary',
    name: 'Sawshot',
    shortName: 'Sawshot',
    category: 'Shotgun',
    damage: 11,
    fireRateMs: 560,
    clipSize: 6,
    reloadMs: 1500,
    projectileSpeed: 880,
    pellets: 7,
    spreadRad: 0.28,
    recoil: 200,
    explosionRadius: 0,
    bulletColor: '#FB923C',
    length: 26,
    isAuto: false,
  },
  double_pump: {
    id: 'double_pump',
    slot: 'primary',
    name: 'Double Pump',
    shortName: 'Double Pump',
    category: 'Shotgun',
    damage: 12,
    fireRateMs: 760,
    clipSize: 4,
    reloadMs: 1750,
    projectileSpeed: 930,
    pellets: 10,
    spreadRad: 0.22,
    recoil: 270,
    explosionRadius: 0,
    bulletColor: '#F97316',
    length: 33,
    isAuto: false,
  },
  spas12: {
    id: 'spas12',
    slot: 'primary',
    name: 'SPAS-12 Combat',
    shortName: 'SPAS-12',
    category: 'Shotgun',
    damage: 10,
    fireRateMs: 390,
    clipSize: 8,
    reloadMs: 1650,
    projectileSpeed: 960,
    pellets: 8,
    spreadRad: 0.21,
    recoil: 185,
    explosionRadius: 0,
    bulletColor: '#FB7185',
    length: 36,
    isAuto: true,
  },
  anu34: {
    id: 'anu34',
    slot: 'primary',
    name: 'ANU-34',
    shortName: 'ANU-34',
    category: 'Sniper',
    damage: 48,
    fireRateMs: 540,
    clipSize: 8,
    reloadMs: 1700,
    projectileSpeed: 1650,
    pellets: 1,
    spreadRad: 0.008,
    recoil: 170,
    explosionRadius: 0,
    bulletColor: '#38BDF8',
    length: 42,
    isAuto: false,
  },
  dlp44: {
    id: 'dlp44',
    slot: 'primary',
    name: 'DLP 44',
    shortName: 'DLP 44',
    category: 'Sniper',
    damage: 68,
    fireRateMs: 850,
    clipSize: 5,
    reloadMs: 1900,
    projectileSpeed: 1850,
    pellets: 1,
    spreadRad: 0.004,
    recoil: 240,
    explosionRadius: 0,
    bulletColor: '#0EA5E9',
    length: 45,
    isAuto: false,
  },
  awq: {
    id: 'awq',
    slot: 'primary',
    name: 'AWQ',
    shortName: 'AWQ',
    category: 'Sniper',
    damage: 92,
    fireRateMs: 1120,
    clipSize: 4,
    reloadMs: 2150,
    projectileSpeed: 2100,
    pellets: 1,
    spreadRad: 0.002,
    recoil: 310,
    explosionRadius: 0,
    bulletColor: '#A855F7',
    length: 48,
    isAuto: false,
  },
  bomberier: {
    id: 'bomberier',
    slot: 'primary',
    name: 'Bomberier',
    shortName: 'Bomberier',
    category: 'Rocket Launcher',
    damage: 88,
    fireRateMs: 1220,
    clipSize: 3,
    reloadMs: 2200,
    projectileSpeed: 620,
    pellets: 1,
    spreadRad: 0.012,
    recoil: 330,
    explosionRadius: 132,
    bulletColor: '#EF4444',
    length: 42,
    isAuto: false,
  },
  plasma_repeater: {
    id: 'plasma_repeater',
    slot: 'primary',
    name: 'Plasma Repeater',
    shortName: 'Plasma',
    category: 'Energy',
    damage: 15,
    fireRateMs: 115,
    clipSize: 32,
    reloadMs: 1400,
    projectileSpeed: 1380,
    pellets: 1,
    spreadRad: 0.025,
    recoil: 24,
    explosionRadius: 0,
    bulletColor: '#22D3EE',
    length: 36,
    isAuto: true,
    noDrop: true,
  },
  boomstick: {
    id: 'boomstick',
    slot: 'primary',
    name: 'Double-Barrel Boomstick',
    shortName: 'Boomstick',
    category: 'Shotgun',
    damage: 13,
    fireRateMs: 420,
    clipSize: 2,
    reloadMs: 1550,
    projectileSpeed: 920,
    pellets: 12,
    spreadRad: 0.31,
    recoil: 320,
    explosionRadius: 0,
    bulletColor: '#FDBA74',
    length: 34,
    isAuto: false,
    knockback: 460,
  },
  minigun: {
    id: 'minigun',
    slot: 'primary',
    name: 'Vulcan Minigun',
    shortName: 'Minigun',
    category: 'Minigun',
    damage: 9,
    fireRateMs: 55,
    clipSize: 90,
    reloadMs: 2400,
    projectileSpeed: 1180,
    pellets: 1,
    spreadRad: 0.095,
    recoil: 38,
    explosionRadius: 0,
    bulletColor: '#FBBF24',
    length: 44,
    isAuto: true,
    spinUpMs: 380,
  },
  crossbow_launcher: {
    id: 'crossbow_launcher',
    slot: 'primary',
    name: 'Crossbow Launcher',
    shortName: 'Crossbow',
    category: 'Crossbow',
    damage: 76,
    fireRateMs: 680,
    clipSize: 4,
    reloadMs: 1650,
    projectileSpeed: 1320,
    pellets: 1,
    spreadRad: 0.008,
    recoil: 95,
    explosionRadius: 105,
    bulletColor: '#FB7185',
    length: 38,
    isAuto: false,
    suppressed: true,
    stickyExplosive: true,
  },
  freeze_ray: {
    id: 'freeze_ray',
    slot: 'primary',
    name: 'Cryo Freeze Ray',
    shortName: 'Freeze Ray',
    category: 'Cryo',
    damage: 8,
    fireRateMs: 105,
    clipSize: 40,
    reloadMs: 1500,
    projectileSpeed: 1050,
    pellets: 1,
    spreadRad: 0.03,
    recoil: 18,
    explosionRadius: 0,
    bulletColor: '#7DD3FC',
    length: 37,
    isAuto: true,
    noDrop: true,
    freezeDurationSec: 3.0,
  },
  orbital_laser: {
    id: 'orbital_laser',
    slot: 'primary',
    name: 'Mythic Orbital Laser',
    shortName: 'Orbital Laser',
    category: 'Energy',
    damage: 42,
    fireRateMs: 135,
    clipSize: 45,
    reloadMs: 1100,
    projectileSpeed: 2250,
    pellets: 1,
    spreadRad: 0.004,
    recoil: 20,
    explosionRadius: 52,
    bulletColor: '#FACC15',
    length: 46,
    isAuto: true,
    noDrop: true,
    knockback: 260,
  },
  // Secondary Weapons (Slot 2)
  pistol: {
    id: 'pistol',
    slot: 'secondary',
    name: 'Bureau Pistol',
    shortName: 'Pistol',
    category: 'Pistol',
    damage: 18,
    fireRateMs: 215,
    clipSize: 15,
    reloadMs: 1050,
    projectileSpeed: 1180,
    pellets: 1,
    spreadRad: 0.032,
    recoil: 44,
    explosionRadius: 0,
    bulletColor: '#94A3B8',
    length: 19,
    isAuto: false,
  },
  ghost_pistol: {
    id: 'ghost_pistol',
    slot: 'secondary',
    name: 'Ghost Pistol',
    shortName: 'Ghost',
    category: 'Pistol',
    damage: 21,
    fireRateMs: 240,
    clipSize: 13,
    reloadMs: 1000,
    projectileSpeed: 1290,
    pellets: 1,
    spreadRad: 0.014,
    recoil: 26,
    explosionRadius: 0,
    bulletColor: '#67E8F9',
    length: 25,
    isAuto: false,
    suppressed: true,
  },
  uzi: {
    id: 'uzi',
    slot: 'secondary',
    name: 'Micro Uzi',
    shortName: 'Uzi',
    category: 'SMG',
    damage: 9,
    fireRateMs: 75,
    clipSize: 28,
    reloadMs: 1200,
    projectileSpeed: 1020,
    pellets: 1,
    spreadRad: 0.13,
    recoil: 38,
    explosionRadius: 0,
    bulletColor: '#F472B6',
    length: 21,
    isAuto: true,
  },
  shorty: {
    id: 'shorty',
    slot: 'secondary',
    name: 'Shorty',
    shortName: 'Shorty',
    category: 'Shotgun',
    damage: 11,
    fireRateMs: 520,
    clipSize: 2,
    reloadMs: 1250,
    projectileSpeed: 860,
    pellets: 6,
    spreadRad: 0.29,
    recoil: 175,
    explosionRadius: 0,
    bulletColor: '#FB923C',
    length: 20,
    isAuto: false,
  },
  revolver: {
    id: 'revolver',
    slot: 'secondary',
    name: 'Magnum Revolver',
    shortName: 'Revolver',
    category: 'Revolver',
    damage: 42,
    fireRateMs: 470,
    clipSize: 6,
    reloadMs: 1450,
    projectileSpeed: 1520,
    pellets: 1,
    spreadRad: 0.018,
    recoil: 145,
    explosionRadius: 0,
    bulletColor: '#FACC15',
    length: 22,
    isAuto: false,
  },
};

export const PRIMARY_PICKUP_WEAPONS: PrimaryWeaponId[] = [
  'plasma_repeater',
  'boomstick',
  'minigun',
  'crossbow_launcher',
  'freeze_ray',
];

export const VALID_WEAPON_IDS = new Set<WeaponId>(Object.keys(WEAPONS) as WeaponId[]);
export const VALID_SECONDARY_IDS = new Set<SecondaryWeaponId>([
  'pistol',
  'ghost_pistol',
  'uzi',
  'shorty',
  'revolver',
]);
export const VALID_MELEE_IDS = new Set<MeleeWeaponId>([
  'knife',
  'karambit',
  'katana',
  'boxing_glove',
]);

export function normalizeWeaponId(raw: unknown): WeaponId {
  if (typeof raw === 'string' && VALID_WEAPON_IDS.has(raw as WeaponId)) {
    const w = WEAPONS[raw as WeaponId];
    if (w && w.slot === 'primary') return w.id;
  }
  return 'ak';
}

export function normalizeSecondaryId(raw: unknown): SecondaryWeaponId {
  if (typeof raw === 'string' && VALID_SECONDARY_IDS.has(raw as SecondaryWeaponId)) {
    return raw as SecondaryWeaponId;
  }
  return 'pistol';
}

export function normalizeMeleeId(raw: unknown): MeleeWeaponId {
  if (typeof raw === 'string' && VALID_MELEE_IDS.has(raw as MeleeWeaponId)) {
    return raw as MeleeWeaponId;
  }
  return 'knife';
}

export interface MasteryTierDef {
  tier: WeaponMasteryTier;
  label: string;
  requiredKills: number;
  swatchPrimary: string;
  swatchSecondary: string;
}

export const WEAPON_MASTERY_TIERS: MasteryTierDef[] = [
  {
    tier: 'none',
    label: 'Factory Issue',
    requiredKills: 0,
    swatchPrimary: '#64748B',
    swatchSecondary: '#334155',
  },
  {
    tier: 'camo',
    label: 'Tactical Camo',
    requiredKills: 25,
    swatchPrimary: '#4D7C0F',
    swatchSecondary: '#365314',
  },
  {
    tier: 'gold',
    label: 'Sovereign Gold',
    requiredKills: 50,
    swatchPrimary: '#FACC15',
    swatchSecondary: '#CA8A04',
  },
  {
    tier: 'diamond',
    label: 'Parliament Diamond',
    requiredKills: 100,
    swatchPrimary: '#67E8F9',
    swatchSecondary: '#E0F2FE',
  },
];

export function getUnlockedMasteryTiers(kills: number): WeaponMasteryTier[] {
  return WEAPON_MASTERY_TIERS.filter((m) => kills >= m.requiredKills).map((m) => m.tier);
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  coinReward: number;
  badgeColor: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach_first_win',
    title: 'Parliament Winner',
    description: 'Win your first Arena match.',
    coinReward: 80,
    badgeColor: '#F59E0B',
  },
  {
    id: 'ach_sniper_master',
    title: 'One-Shot Diplomat',
    description: 'Win a match using only a Sniper rifle.',
    coinReward: 180,
    badgeColor: '#38BDF8',
  },
  {
    id: 'ach_sky_pirate',
    title: 'Jetpack Ace',
    description: 'Score 10 mid-air Jetpack eliminations.',
    coinReward: 150,
    badgeColor: '#2DD4BF',
  },
  {
    id: 'ach_headhunter',
    title: 'Deadeye Brief',
    description: 'Land 25 career headshots.',
    coinReward: 160,
    badgeColor: '#FB7185',
  },
  {
    id: 'ach_demolition',
    title: 'Cover Breaker',
    description: 'Destroy 15 destructible walls, crates, or glass panes.',
    coinReward: 120,
    badgeColor: '#FB923C',
  },
  {
    id: 'ach_brawler',
    title: 'Briefcase Enforcer',
    description: 'Score 5 Melee Panic Strike eliminations.',
    coinReward: 130,
    badgeColor: '#FACC15',
  },
  {
    id: 'ach_grenadier',
    title: 'Pocket Artillery',
    description: 'Score 8 Grenade eliminations.',
    coinReward: 140,
    badgeColor: '#EF4444',
  },
  {
    id: 'ach_koth_champ',
    title: 'Speaker of the House',
    description: 'Win 3 King of the Hill (Parliament Podium) matches.',
    coinReward: 220,
    badgeColor: '#A855F7',
  },
];

export interface DailyChallengeDef {
  id: string;
  title: string;
  description: string;
  target: number;
  coinReward: number;
  metric:
    | 'kills'
    | 'headshots'
    | 'midairKills'
    | 'coverDestroyed'
    | 'wins'
    | 'grenadeKills';
}

export const DAILY_CHALLENGE_POOL: DailyChallengeDef[] = [
  {
    id: 'dc_kills_12',
    title: 'Floor Debate',
    description: 'Eliminate 12 rivals in arena matches.',
    target: 12,
    coinReward: 110,
    metric: 'kills',
  },
  {
    id: 'dc_midair_4',
    title: 'Airspace Control',
    description: 'Get 4 mid-air Jetpack kills.',
    target: 4,
    coinReward: 130,
    metric: 'midairKills',
  },
  {
    id: 'dc_headshots_5',
    title: 'Executive Precision',
    description: 'Land 5 headshots on opponents.',
    target: 5,
    coinReward: 120,
    metric: 'headshots',
  },
  {
    id: 'dc_cover_6',
    title: 'Wrecking Crew',
    description: 'Shatter 6 walls, crates, or glass windows.',
    target: 6,
    coinReward: 95,
    metric: 'coverDestroyed',
  },
  {
    id: 'dc_win_1',
    title: 'Vote of Confidence',
    description: 'Win 1 match in any mode or map.',
    target: 1,
    coinReward: 140,
    metric: 'wins',
  },
  {
    id: 'dc_grenade_3',
    title: 'Explosive Motion',
    description: 'Eliminate 3 rivals using Frag or Plasma grenades.',
    target: 3,
    coinReward: 125,
    metric: 'grenadeKills',
  },
];

export function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export function getDailyChallengesForDate(dateKey: string): DailyChallengeDef[] {
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) {
    seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const picked: DailyChallengeDef[] = [];
  const pool = [...DAILY_CHALLENGE_POOL];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = (seed + i * 7) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export const FLAME_COSMETICS: CosmeticItem<FlameColorId>[] = [
  {
    id: 'amber',
    name: 'Amber Standard',
    description: 'Classic kerosene dusk exhaust.',
    cost: 0,
    primaryColor: '#F59E0B',
    secondaryColor: '#FEF08A',
  },
  {
    id: 'cobalt',
    name: 'Cobalt Plasma',
    description: 'High-altitude blue ion plume.',
    cost: 120,
    primaryColor: '#2563EB',
    secondaryColor: '#7DD3FC',
  },
  {
    id: 'crimson',
    name: 'Crimson Blaze',
    description: 'Crimson-red afterburner thrust.',
    cost: 160,
    primaryColor: '#DC2626',
    secondaryColor: '#FCA5A5',
  },
  {
    id: 'emerald',
    name: 'Emerald Ion',
    description: 'Green energy subsidy thruster.',
    cost: 220,
    primaryColor: '#059669',
    secondaryColor: '#6EE7B7',
  },
  {
    id: 'violet',
    name: 'Violet Void',
    description: 'Classified defense-budget plasma.',
    cost: 300,
    primaryColor: '#7C3AED',
    secondaryColor: '#DDD6FE',
  },
  {
    id: 'gold',
    name: 'Gold Sovereign',
    description: 'Executive bullion exhaust trail.',
    cost: 450,
    primaryColor: '#EAB308',
    secondaryColor: '#FFFBEB',
  },
];

export const OUTFIT_COSMETICS: CosmeticItem<OutfitId>[] = [
  {
    id: 'charcoal',
    name: 'Signature Attire',
    description: 'Authentic character outfit & signature look.',
    cost: 0,
    primaryColor: '#1E293B',
    secondaryColor: '#94A3B8',
  },
  {
    id: 'navy',
    name: 'Diplomatic Navy',
    description: 'Crisp midnight navy pinstripe.',
    cost: 100,
    primaryColor: '#1E3A8A',
    secondaryColor: '#60A5FA',
  },
  {
    id: 'olive',
    name: 'Tactical Olive',
    description: 'Field-ready armored wool blazer.',
    cost: 150,
    primaryColor: '#365314',
    secondaryColor: '#A3E635',
  },
  {
    id: 'burgundy',
    name: 'Velvet Burgundy',
    description: 'Summit gala crimson tailoring.',
    cost: 220,
    primaryColor: '#7F1D1D',
    secondaryColor: '#FCA5A5',
  },
  {
    id: 'stealth',
    name: 'Midnight Stealth',
    description: 'Matte tactical obsidian stealth suit.',
    cost: 320,
    primaryColor: '#09090B',
    secondaryColor: '#52525B',
  },
  {
    id: 'neon_cyber',
    name: 'Neon Cyber',
    description: 'Dark slate tactical armor with glowing electric cyan trim.',
    cost: 360,
    primaryColor: '#0F172A',
    secondaryColor: '#22D3EE',
  },
  {
    id: 'sovereign',
    name: 'Golden Champion',
    description: 'Ivory ceremonial champion coat with gold trim.',
    cost: 500,
    primaryColor: '#F8FAFC',
    secondaryColor: '#F59E0B',
  },
];

export const VALID_OUTFIT_IDS = new Set<OutfitId>(OUTFIT_COSMETICS.map((o) => o.id));

export function normalizeOutfitId(raw: unknown): OutfitId {
  if (typeof raw === 'string' && VALID_OUTFIT_IDS.has(raw as OutfitId)) {
    return raw as OutfitId;
  }
  return 'charcoal';
}

export const GUN_WRAPS: CosmeticItem<GunWrapId>[] = [
  {
    id: 'none',
    name: 'Factory Issue',
    description: 'Standard tactical gunmetal finish (uses Mastery skin if equipped).',
    cost: 0,
    primaryColor: '#475569',
    secondaryColor: '#94A3B8',
  },
  {
    id: 'carbon_fiber',
    name: 'Carbon Fiber',
    description: 'Woven aerospace matte carbon weave with gunmetal accents.',
    cost: 150,
    primaryColor: '#18181B',
    secondaryColor: '#52525B',
  },
  {
    id: 'lava_magma',
    name: 'Lava Magma',
    description: 'Molten volcanic fissures glowing through charred obsidian.',
    cost: 240,
    primaryColor: '#450A0A',
    secondaryColor: '#F97316',
  },
  {
    id: 'electric_ice',
    name: 'Electric Ice',
    description: 'Crystalline cryo frost laced with high-voltage cyan arcs.',
    cost: 260,
    primaryColor: '#0C4A6E',
    secondaryColor: '#38BDF8',
  },
  {
    id: 'comic_halftone',
    name: 'Comic Halftone',
    description: 'Pop-art yellow & magenta halftone print straight off the sketchbook.',
    cost: 280,
    primaryColor: '#FACC15',
    secondaryColor: '#EC4899',
  },
  {
    id: 'royal_gold',
    name: 'Royal Gold',
    description: 'Brushed 24K champion gold plating with deep emerald trim.',
    cost: 350,
    primaryColor: '#D97706',
    secondaryColor: '#FDE047',
  },
  {
    id: 'galaxy_void',
    name: 'Galaxy Void',
    description: 'Deep cosmic nebula swirl speckled with starlight.',
    cost: 420,
    primaryColor: '#3B0764',
    secondaryColor: '#C084FC',
  },
  {
    id: 'golden_kettle',
    name: 'Golden Kettle',
    description: 'Exclusive promo finish: brushed 24K kadak chai kettle luster (Code: CHAI2026).',
    cost: 0,
    primaryColor: '#F59E0B',
    secondaryColor: '#FEF9C3',
  },
];

export const VALID_GUN_WRAP_IDS = new Set<GunWrapId>(GUN_WRAPS.map((w) => w.id));

export function normalizeGunWrapId(raw: unknown): GunWrapId {
  if (typeof raw === 'string' && VALID_GUN_WRAP_IDS.has(raw as GunWrapId)) {
    return raw as GunWrapId;
  }
  return 'none';
}

export const GUN_GAME_LADDER: WeaponId[] = [
  'pistol',
  'revolver',
  'mp7',
  'ak',
  'm4a1',
  'spas12',
  'plasma_repeater',
  'anu34',
  'minigun',
  'bomberier',
];

export const EMOTE_DEFS: Array<{
  id: EmoteId;
  label: string;
  badge: string;
  color: string;
  subtitle: string;
}> = [
  { id: 'chai', label: 'Sipping Chai', badge: 'CHAI', color: '#F59E0B', subtitle: 'Hot & Steaming' },
  { id: 'trophy', label: 'GG Trophy', badge: 'GG!', color: '#FACC15', subtitle: 'Pure Dominance' },
  { id: 'laugh_skull', label: 'Skull Laugh', badge: 'HAHA', color: '#22D3EE', subtitle: 'Gotcha!' },
  { id: 'dab_flex', label: 'Victory Flex', badge: 'FLEX', color: '#F43F5E', subtitle: 'Max Gains' },
  { id: 'salute', label: 'Bureau Salute', badge: 'o7', color: '#38BDF8', subtitle: 'Respect Paid' },
  { id: 'crown_king', label: 'Crown Drop', badge: 'KING', color: '#A855F7', subtitle: 'MVP Energy' },
];

export const SPRAY_DEFS: Array<{
  id: SprayId;
  title: string;
  subtitle: string;
  bg: string;
  fg: string;
  accent: string;
}> = [
  { id: 'chai_break', title: 'CHAI BREAK', subtitle: 'Doodle Bureau', bg: '#78350F', fg: '#FDE68A', accent: '#F59E0B' },
  { id: 'aim_404', title: '404 AIM', subtitle: 'NOT FOUND', bg: '#0F172A', fg: '#22D3EE', accent: '#38BDF8' },
  { id: 'doodle_crown', title: 'BUREAU KING', subtitle: 'CROWNED', bg: '#3B0764', fg: '#FACC15', accent: '#C084FC' },
  { id: 'no_camping', title: 'NO CAMPING', subtitle: 'KEEP MOVING', bg: '#7F1D1D', fg: '#FCA5A5', accent: '#EF4444' },
  { id: 'sniper_bait', title: 'EZ TARGET', subtitle: 'BULLSEYE', bg: '#064E3B', fg: '#6EE7B7', accent: '#10B981' },
  { id: 'kadak_bolt', title: 'VOLTAGE', subtitle: 'HIGH SHOCK', bg: '#1E1B4B', fg: '#93C5FD', accent: '#60A5FA' },
];

export const PROMO_CODES = {
  DOODLE100: {
    code: 'DOODLE100',
    title: '+1,000 Coins',
    coins: 1000,
    wrapId: null as GunWrapId | null,
  },
  CHAI2026: {
    code: 'CHAI2026',
    title: 'Golden Kettle Gun Wrap',
    coins: 0,
    wrapId: 'golden_kettle' as GunWrapId | null,
  },
} as const;

export const STARTING_WEAPON_COSMETICS: CosmeticItem<WeaponId>[] = [
  {
    id: 'ak',
    name: 'AK',
    description: 'Default 30-round automatic assault rifle.',
    cost: 0,
    primaryColor: '#F59E0B',
    secondaryColor: '#FDE68A',
  },
  {
    id: 'm4a1',
    name: 'M4A1 Burst AR',
    description: 'High-accuracy 3-round burst assault rifle.',
    cost: 150,
    primaryColor: '#EAB308',
    secondaryColor: '#FEF08A',
  },
  {
    id: 'mp7',
    name: 'MP7 Tactical SMG',
    description: 'Blistering 40-round CQB submachine gun.',
    cost: 210,
    primaryColor: '#0284C7',
    secondaryColor: '#7DD3FC',
  },
  {
    id: 'sawshot',
    name: 'Sawshot',
    description: 'Sawed-off 7-pellet close-quarters shotgun.',
    cost: 260,
    primaryColor: '#EA580C',
    secondaryColor: '#FDBA74',
  },
  {
    id: 'double_pump',
    name: 'Double Pump',
    description: 'Devastating 10-pellet dual-barrel shotgun.',
    cost: 380,
    primaryColor: '#C2410C',
    secondaryColor: '#FED7AA',
  },
  {
    id: 'plasma_repeater',
    name: 'Plasma Repeater',
    description: 'Zero-drop rapid cyan plasma energy rifle.',
    cost: 420,
    primaryColor: '#0891B2',
    secondaryColor: '#67E8F9',
  },
  {
    id: 'spas12',
    name: 'SPAS-12 Combat',
    description: 'Rapid-cycling 8-round tactical combat shotgun.',
    cost: 460,
    primaryColor: '#BE123C',
    secondaryColor: '#FDA4AF',
  },
  {
    id: 'boomstick',
    name: 'Double-Barrel Boomstick',
    description: '12-pellet heavy close-range blast with massive knockback.',
    cost: 490,
    primaryColor: '#B45309',
    secondaryColor: '#FDE68A',
  },
  {
    id: 'anu34',
    name: 'ANU-34',
    description: 'Fast semi-auto marksman sniper (8-round mag).',
    cost: 520,
    primaryColor: '#0284C7',
    secondaryColor: '#7DD3FC',
  },
  {
    id: 'freeze_ray',
    name: 'Cryo Freeze Ray',
    description: 'Chilling beam bolts that slow enemy movement & jetpacks.',
    cost: 560,
    primaryColor: '#0284C7',
    secondaryColor: '#BAE6FD',
  },
  {
    id: 'crossbow_launcher',
    name: 'Crossbow Launcher',
    description: 'Silent explosive bolts that stick to walls/targets before detonating.',
    cost: 640,
    primaryColor: '#BE123C',
    secondaryColor: '#FDA4AF',
  },
  {
    id: 'dlp44',
    name: 'DLP 44',
    description: 'Heavy high-velocity precision sniper.',
    cost: 680,
    primaryColor: '#2563EB',
    secondaryColor: '#93C5FD',
  },
  {
    id: 'minigun',
    name: 'Vulcan Minigun',
    description: '90-round rotary cannon with brief barrel spin-up & relentless fire rate.',
    cost: 740,
    primaryColor: '#CA8A04',
    secondaryColor: '#FEF08A',
  },
  {
    id: 'awq',
    name: 'AWQ',
    description: 'Magnum sniper capable of lethal longshots.',
    cost: 860,
    primaryColor: '#7C3AED',
    secondaryColor: '#DDD6FE',
  },
  {
    id: 'bomberier',
    name: 'Bomberier',
    description: 'Heavy explosive rocket launcher (Most Expensive).',
    cost: 1200,
    primaryColor: '#DC2626',
    secondaryColor: '#FCA5A5',
  },
];

export const SECONDARY_WEAPON_COSMETICS: CosmeticItem<SecondaryWeaponId>[] = [
  {
    id: 'pistol',
    name: 'Bureau Pistol',
    description: 'Reliable 15-round semi-auto sidearm (Default Slot 2).',
    cost: 0,
    primaryColor: '#94A3B8',
    secondaryColor: '#E2E8F0',
  },
  {
    id: 'ghost_pistol',
    name: 'Ghost Pistol',
    description: 'Whisper-quiet suppressed tactical sidearm with laser pinpoint accuracy.',
    cost: 180,
    primaryColor: '#0891B2',
    secondaryColor: '#67E8F9',
  },
  {
    id: 'uzi',
    name: 'Micro Uzi',
    description: 'Pocket automatic SMG spraying 28 rounds in seconds.',
    cost: 240,
    primaryColor: '#DB2777',
    secondaryColor: '#F9A8D4',
  },
  {
    id: 'shorty',
    name: 'Shorty',
    description: 'Compact double-shot pocket shotgun for breach rushes.',
    cost: 280,
    primaryColor: '#EA580C',
    secondaryColor: '#FED7AA',
  },
  {
    id: 'revolver',
    name: 'Magnum Revolver',
    description: 'Heavy 6-cylinder hand cannon hitting 42 DMG per shot.',
    cost: 340,
    primaryColor: '#CA8A04',
    secondaryColor: '#FEF08A',
  },
];

export const MELEE_WEAPONS: Record<MeleeWeaponId, MeleeWeaponDef> = {
  knife: {
    id: 'knife',
    name: 'Tactical Knife',
    shortName: 'Knife',
    description: 'Standard-issue combat blade with crisp slashing speed.',
    cost: 0,
    damage: 44,
    range: 48,
    cooldownSec: 0.58,
    swingDurationSec: 0.2,
    knockback: 310,
    primaryColor: '#CBD5E1',
    accentColor: '#38BDF8',
  },
  karambit: {
    id: 'karambit',
    name: 'Shadow Karambit',
    shortName: 'Karambit',
    description: 'Curved claw blade with ultra-fast cooldown and lethal bleed strike.',
    cost: 220,
    damage: 50,
    range: 46,
    cooldownSec: 0.44,
    swingDurationSec: 0.17,
    knockback: 280,
    primaryColor: '#A855F7',
    accentColor: '#F472B6',
  },
  katana: {
    id: 'katana',
    name: 'Ronin Katana',
    shortName: 'Katana',
    description: 'Extended-reach razor blade cleaving foes from afar for 64 DMG.',
    cost: 380,
    damage: 64,
    range: 68,
    cooldownSec: 0.72,
    swingDurationSec: 0.24,
    knockback: 380,
    primaryColor: '#F8FAFC',
    accentColor: '#F59E0B',
  },
  boxing_glove: {
    id: 'boxing_glove',
    name: 'Heavy Boxing Glove',
    shortName: 'Boxing Glove',
    description: 'Crimson knockout haymaker launching rivals flying across the arena.',
    cost: 320,
    damage: 58,
    range: 52,
    cooldownSec: 0.68,
    swingDurationSec: 0.22,
    knockback: 690,
    primaryColor: '#EF4444',
    accentColor: '#FACC15',
  },
};

export const MELEE_WEAPON_LIST: MeleeWeaponDef[] = [
  MELEE_WEAPONS.knife,
  MELEE_WEAPONS.karambit,
  MELEE_WEAPONS.katana,
  MELEE_WEAPONS.boxing_glove,
];

export const BOT_NAMES = [
  'Bot_ChaiWala',
  'Bot_Voltage',
  'Bot_Jalebi',
  'Bot_WiFi',
  'Bot_Noodle',
  'Bot_404',
  'Bot_Jugaad',
  'Bot_Chappal',
  'Bot_Dholak',
  'Bot_Mohalla',
  'Bot_Gymbro',
  'Bot_Topper',
  'Bot_Seeti',
  'Bot_Baraat',
  'Bot_DuctTape',
];
