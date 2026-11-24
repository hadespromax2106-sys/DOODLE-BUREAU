import { DestructibleWallStyle, MapId } from '../types/game';

export interface PlatformRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'solid' | 'oneway' | 'cover';
  style:
    | 'concrete'
    | 'grate'
    | 'brick'
    | 'sandbag'
    | 'timber'
    | 'moss'
    | 'sandstone'
    | 'crate_cover'
    | 'ice'
    | 'snow';
}

export interface RampSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LadderZone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BarrelSpawn {
  id: string;
  x: number;
  y: number;
}

export type PickupType = 'medkit' | 'fuel';

export interface PickupSpawn {
  id: string;
  x: number;
  y: number;
  type: PickupType;
  respawnSec: number;
}

export interface SpawnPoint {
  x: number;
  y: number;
}

export interface ArenaLandmark {
  id: string;
  label: string;
  shortLabel: string;
  zone: 'city' | 'forest' | 'desert' | 'arctic';
  x: number;
  y: number;
}

export interface DestructibleWallSpawn {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  maxHp: number;
  style: DestructibleWallStyle;
  respawnSec: number;
}

export function createDestructibleWall(
  id: string,
  x: number,
  groundY: number,
  w: number,
  h: number,
  style: DestructibleWallStyle,
  maxHp = 130,
  respawnSec = 24
): DestructibleWallSpawn {
  return {
    id,
    x,
    y: groundY - h,
    w,
    h,
    maxHp,
    style,
    respawnSec,
  };
}

export interface PodiumZone {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface NeonSignProp {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
}

export interface StreetLampProp {
  x: number;
  y: number;
  h: number;
  flickerPhase: number;
}

export interface VineProp {
  x: number;
  y: number;
  len: number;
  phase: number;
}

export interface WaterPoolZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RadarTowerProp {
  x: number;
  y: number;
  h: number;
}

export interface DominationFlagSpawn {
  id: 'A' | 'B' | 'C';
  label: string;
  x: number;
  y: number;
}

export interface CtfBasesConfig {
  alpha: SpawnPoint;
  bravo: SpawnPoint;
}

export interface ArenaMap {
  id: MapId;
  name: string;
  biome: 'city' | 'jungle' | 'desert' | 'arctic' | 'hybrid';
  width: number;
  height: number;
  platforms: PlatformRect[];
  destructibleWalls: DestructibleWallSpawn[];
  ramps: RampSegment[];
  ladders: LadderZone[];
  barrelSpawns: BarrelSpawn[];
  pickupSpawns: PickupSpawn[];
  playerSpawns: SpawnPoint[];
  landmarks: ArenaLandmark[];
  podiumZone: PodiumZone;
  hardpoints: PodiumZone[];
  domFlags: DominationFlagSpawn[];
  ctfBases: CtfBasesConfig;
  neonSigns?: NeonSignProp[];
  streetLamps?: StreetLampProp[];
  vines?: VineProp[];
  waterPools?: WaterPoolZone[];
  radarTowers?: RadarTowerProp[];
}

export type CityMap = ArenaMap;

// 1. ABANDONED CITY (DUSK) — 2600 x 1150
const CITY_DUSK_MAP: ArenaMap = {
  id: 'city_dusk',
  name: 'Abandoned City (Dusk)',
  biome: 'city',
  width: 2600,
  height: 1150,
  podiumZone: { x: 1150, y: 540, w: 300, h: 150, label: 'PARLIAMENT PODIUM' },
  hardpoints: [
    { x: 1150, y: 540, w: 300, h: 150, label: 'PODIUM DECK' },
    { x: 1080, y: 770, w: 440, h: 130, label: 'PLAZA OVERPASS' },
    { x: 1060, y: 960, w: 480, h: 130, label: 'CENTRAL PIT' },
  ],
  domFlags: [
    { id: 'A', label: 'West Roof', x: 280, y: 485 },
    { id: 'B', label: 'Podium Deck', x: 1300, y: 690 },
    { id: 'C', label: 'East Roof', x: 2280, y: 485 },
  ],
  ctfBases: {
    alpha: { x: 180, y: 1050 },
    bravo: { x: 2420, y: 1050 },
  },
  neonSigns: [
    { x: 260, y: 420, w: 120, h: 38, text: 'VETO CLUB', color: '#F43F5E' },
    { x: 1190, y: 310, w: 220, h: 42, text: 'DUSK EXCHANGE', color: '#38BDF8' },
    { x: 2120, y: 430, w: 140, h: 38, text: 'TAX HOTEL', color: '#F59E0B' },
  ],
  streetLamps: [
    { x: 580, y: 1050, h: 145, flickerPhase: 0.4 },
    { x: 960, y: 1050, h: 145, flickerPhase: 2.1 },
    { x: 1640, y: 1050, h: 145, flickerPhase: 4.5 },
    { x: 2020, y: 1050, h: 145, flickerPhase: 1.7 },
  ],
  platforms: [
    { id: 'c_floor_l', x: 0, y: 1050, w: 920, h: 100, kind: 'solid', style: 'concrete' },
    { id: 'c_floor_pit', x: 920, y: 1090, w: 760, h: 60, kind: 'solid', style: 'concrete' },
    { id: 'c_floor_r', x: 1680, y: 1050, w: 920, h: 100, kind: 'solid', style: 'concrete' },
    { id: 'wall_left', x: 0, y: 0, w: 36, h: 1150, kind: 'solid', style: 'concrete' },
    { id: 'wall_right', x: 2564, y: 0, w: 36, h: 1150, kind: 'solid', style: 'concrete' },
    { id: 'ceiling', x: 0, y: 0, w: 2600, h: 32, kind: 'solid', style: 'concrete' },

    // West Skyscraper Ruin
    { id: 'c_w_f1', x: 110, y: 865, w: 420, h: 24, kind: 'oneway', style: 'concrete' },
    { id: 'c_w_f2', x: 130, y: 675, w: 390, h: 24, kind: 'oneway', style: 'concrete' },
    { id: 'c_w_roof', x: 95, y: 485, w: 450, h: 28, kind: 'solid', style: 'concrete' },
    { id: 'c_w_parapet', x: 420, y: 415, w: 32, h: 70, kind: 'cover', style: 'brick' },
    { id: 'c_w_pillar', x: 640, y: 950, w: 40, h: 100, kind: 'cover', style: 'brick' },

    // Mid-West Overpass
    { id: 'c_bridge_l', x: 630, y: 785, w: 290, h: 22, kind: 'oneway', style: 'grate' },

    // Central Parliament Plaza & Podium
    { id: 'c_plaza_low', x: 1020, y: 900, w: 560, h: 24, kind: 'oneway', style: 'concrete' },
    { id: 'c_podium_deck', x: 1060, y: 690, w: 480, h: 28, kind: 'solid', style: 'concrete' },
    { id: 'c_podium_top', x: 1130, y: 455, w: 340, h: 24, kind: 'oneway', style: 'grate' },
    { id: 'c_pod_blk_l', x: 1070, y: 615, w: 32, h: 75, kind: 'cover', style: 'sandbag' },
    { id: 'c_pod_blk_r', x: 1498, y: 615, w: 32, h: 75, kind: 'cover', style: 'sandbag' },

    // Mid-East Overpass
    { id: 'c_bridge_r', x: 1680, y: 785, w: 290, h: 22, kind: 'oneway', style: 'grate' },

    // East Skyscraper Ruin
    { id: 'c_e_f1', x: 2070, y: 865, w: 420, h: 24, kind: 'oneway', style: 'concrete' },
    { id: 'c_e_f2', x: 2080, y: 675, w: 390, h: 24, kind: 'oneway', style: 'concrete' },
    { id: 'c_e_roof', x: 2055, y: 485, w: 450, h: 28, kind: 'solid', style: 'concrete' },
    { id: 'c_e_parapet', x: 2140, y: 415, w: 32, h: 70, kind: 'cover', style: 'brick' },
    { id: 'c_e_pillar', x: 1920, y: 950, w: 40, h: 100, kind: 'cover', style: 'brick' },
  ],
  destructibleWalls: [
    createDestructibleWall('cd_glass_w', 310, 675, 22, 110, 'glass', 55, 18),
    createDestructibleWall('cd_crate_w', 460, 1050, 48, 52, 'crate_wood', 65, 20),
    createDestructibleWall('cd_brick_mid', 1285, 1090, 36, 105, 'brick', 135, 22),
    createDestructibleWall('cd_glass_pod_l', 1170, 690, 22, 95, 'glass', 55, 18),
    createDestructibleWall('cd_glass_pod_r', 1410, 690, 22, 95, 'glass', 55, 18),
    createDestructibleWall('cd_crate_e', 2090, 1050, 48, 52, 'crate_wood', 65, 20),
    createDestructibleWall('cd_glass_e', 2260, 675, 22, 110, 'glass', 55, 18),
  ],
  ramps: [
    { id: 'cr_pit_l', x1: 860, y1: 1050, x2: 940, y2: 1090 },
    { id: 'cr_pit_r', x1: 1660, y1: 1090, x2: 1740, y2: 1050 },
  ],
  ladders: [
    { id: 'cl_w1', x: 460, y: 675, w: 36, h: 375 },
    { id: 'cl_w2', x: 165, y: 485, w: 36, h: 190 },
    { id: 'cl_mid', x: 1282, y: 455, w: 36, h: 445 },
    { id: 'cl_e1', x: 2104, y: 675, w: 36, h: 375 },
    { id: 'cl_e2', x: 2395, y: 485, w: 36, h: 190 },
  ],
  barrelSpawns: [
    { id: 'cb_1', x: 320, y: 1050 },
    { id: 'cb_2', x: 780, y: 785 },
    { id: 'cb_3', x: 1120, y: 900 },
    { id: 'cb_4', x: 1480, y: 900 },
    { id: 'cb_5', x: 1820, y: 785 },
    { id: 'cb_6', x: 2280, y: 1050 },
  ],
  pickupSpawns: [
    { id: 'cp_med_w', x: 240, y: 450, type: 'medkit', respawnSec: 13 },
    { id: 'cp_fuel_w', x: 770, y: 750, type: 'fuel', respawnSec: 10 },
    { id: 'cp_med_mid', x: 1300, y: 1055, type: 'medkit', respawnSec: 14 },
    { id: 'cp_fuel_pod', x: 1300, y: 420, type: 'fuel', respawnSec: 10 },
    { id: 'cp_fuel_e', x: 1825, y: 750, type: 'fuel', respawnSec: 10 },
    { id: 'cp_med_e', x: 2350, y: 450, type: 'medkit', respawnSec: 13 },
  ],
  playerSpawns: [
    { x: 180, y: 990 },
    { x: 2420, y: 990 },
    { x: 300, y: 615 },
    { x: 2300, y: 615 },
    { x: 1140, y: 630 },
    { x: 1460, y: 630 },
    { x: 780, y: 730 },
    { x: 1820, y: 730 },
  ],
  landmarks: [
    { id: 'clm_w', label: 'West Ruin', shortLabel: 'WEST', zone: 'city', x: 310, y: 485 },
    { id: 'clm_p', label: 'Dusk Plaza', shortLabel: 'PLAZA', zone: 'city', x: 1300, y: 690 },
    { id: 'clm_e', label: 'East Ruin', shortLabel: 'EAST', zone: 'city', x: 2280, y: 485 },
  ],
};

// 2. OVERGROWN JUNGLE FORTRESS — 2600 x 1150
const JUNGLE_FORTRESS_MAP: ArenaMap = {
  id: 'jungle_fortress',
  name: 'Overgrown Jungle Fortress',
  biome: 'jungle',
  width: 2600,
  height: 1150,
  podiumZone: { x: 1140, y: 495, w: 320, h: 155, label: 'TEMPLE PODIUM' },
  hardpoints: [
    { x: 1140, y: 495, w: 320, h: 155, label: 'TEMPLE PODIUM' },
    { x: 1060, y: 725, w: 480, h: 130, label: 'TEMPLE TIER' },
    { x: 1080, y: 920, w: 440, h: 130, label: 'COURTYARD' },
  ],
  domFlags: [
    { id: 'A', label: 'West Terrace', x: 280, y: 850 },
    { id: 'B', label: 'Temple Podium', x: 1300, y: 650 },
    { id: 'C', label: 'East Terrace', x: 2320, y: 850 },
  ],
  ctfBases: {
    alpha: { x: 160, y: 1050 },
    bravo: { x: 2440, y: 1050 },
  },
  vines: [
    { x: 380, y: 32, len: 290, phase: 0.2 },
    { x: 740, y: 32, len: 340, phase: 1.5 },
    { x: 1080, y: 32, len: 260, phase: 2.9 },
    { x: 1520, y: 32, len: 270, phase: 0.8 },
    { x: 1860, y: 32, len: 330, phase: 2.2 },
    { x: 2210, y: 32, len: 280, phase: 3.7 },
  ],
  waterPools: [
    { x: 460, y: 1030, w: 500, h: 65 },
    { x: 1640, y: 1030, w: 500, h: 65 },
  ],
  platforms: [
    { id: 'j_floor_l', x: 0, y: 1050, w: 460, h: 100, kind: 'solid', style: 'moss' },
    { id: 'j_pool_l', x: 460, y: 1082, w: 500, h: 68, kind: 'solid', style: 'moss' },
    { id: 'j_floor_c', x: 960, y: 1050, w: 680, h: 100, kind: 'solid', style: 'moss' },
    { id: 'j_pool_r', x: 1640, y: 1082, w: 500, h: 68, kind: 'solid', style: 'moss' },
    { id: 'j_floor_r', x: 2140, y: 1050, w: 460, h: 100, kind: 'solid', style: 'moss' },
    { id: 'wall_left', x: 0, y: 0, w: 36, h: 1150, kind: 'solid', style: 'moss' },
    { id: 'wall_right', x: 2564, y: 0, w: 36, h: 1150, kind: 'solid', style: 'moss' },
    { id: 'ceiling', x: 0, y: 0, w: 2600, h: 32, kind: 'solid', style: 'moss' },

    // West Temple Terraces
    { id: 'j_w_f1', x: 100, y: 850, w: 360, h: 24, kind: 'solid', style: 'moss' },
    { id: 'j_w_f2', x: 150, y: 635, w: 340, h: 24, kind: 'oneway', style: 'timber' },
    { id: 'j_w_pillar', x: 310, y: 745, w: 38, h: 105, kind: 'cover', style: 'timber' },

    // Mossy Rope Bridges over Water Pools
    { id: 'j_bridge_l', x: 540, y: 830, w: 350, h: 22, kind: 'oneway', style: 'timber' },
    { id: 'j_step_l', x: 650, y: 1015, w: 130, h: 20, kind: 'solid', style: 'moss' },

    // Central Temple Ruins
    { id: 'j_c_tier1', x: 980, y: 855, w: 640, h: 26, kind: 'solid', style: 'moss' },
    { id: 'j_c_col_l', x: 1030, y: 650, w: 38, h: 205, kind: 'solid', style: 'moss' },
    { id: 'j_c_col_r', x: 1532, y: 650, w: 38, h: 205, kind: 'solid', style: 'moss' },
    { id: 'j_c_podium', x: 1068, y: 650, w: 464, h: 26, kind: 'solid', style: 'moss' },
    { id: 'j_c_canopy', x: 1140, y: 425, w: 320, h: 24, kind: 'oneway', style: 'timber' },
    { id: 'j_c_blk', x: 1280, y: 970, w: 40, h: 80, kind: 'cover', style: 'timber' },

    // East Rope Bridge
    { id: 'j_bridge_r', x: 1710, y: 830, w: 350, h: 22, kind: 'oneway', style: 'timber' },
    { id: 'j_step_r', x: 1820, y: 1015, w: 130, h: 20, kind: 'solid', style: 'moss' },

    // East Temple Terraces
    { id: 'j_e_f1', x: 2140, y: 850, w: 360, h: 24, kind: 'solid', style: 'moss' },
    { id: 'j_e_f2', x: 2110, y: 635, w: 340, h: 24, kind: 'oneway', style: 'timber' },
    { id: 'j_e_pillar', x: 2250, y: 745, w: 38, h: 105, kind: 'cover', style: 'timber' },
  ],
  destructibleWalls: [
    createDestructibleWall('jd_crate_w', 220, 850, 50, 54, 'crate_wood', 65, 20),
    createDestructibleWall('jd_timber_l', 700, 830, 34, 95, 'timber', 120, 22),
    createDestructibleWall('jd_crate_c1', 1120, 855, 50, 54, 'crate_wood', 65, 20),
    createDestructibleWall('jd_crate_c2', 1430, 855, 50, 54, 'crate_wood', 65, 20),
    createDestructibleWall('jd_timber_r', 1870, 830, 34, 95, 'timber', 120, 22),
    createDestructibleWall('jd_crate_e', 2320, 850, 50, 54, 'crate_wood', 65, 20),
  ],
  ramps: [
    { id: 'jr_pool_ll', x1: 420, y1: 1050, x2: 490, y2: 1082 },
    { id: 'jr_pool_lr', x1: 930, y1: 1082, x2: 990, y2: 1050 },
    { id: 'jr_pool_rl', x1: 1610, y1: 1050, x2: 1670, y2: 1082 },
    { id: 'jr_pool_rr', x1: 2110, y1: 1082, x2: 2180, y2: 1050 },
  ],
  ladders: [
    { id: 'jl_w', x: 400, y: 635, w: 36, h: 215 },
    { id: 'jl_c_l', x: 985, y: 650, w: 36, h: 400 },
    { id: 'jl_c_top', x: 1282, y: 425, w: 36, h: 225 },
    { id: 'jl_c_r', x: 1579, y: 650, w: 36, h: 400 },
    { id: 'jl_e', x: 2164, y: 635, w: 36, h: 215 },
  ],
  barrelSpawns: [
    { id: 'jb_1', x: 190, y: 1050 },
    { id: 'jb_2', x: 715, y: 1015 },
    { id: 'jb_3', x: 1200, y: 1050 },
    { id: 'jb_4', x: 1400, y: 1050 },
    { id: 'jb_5', x: 1885, y: 1015 },
    { id: 'jb_6', x: 2410, y: 1050 },
  ],
  pickupSpawns: [
    { id: 'jp_med_w', x: 250, y: 600, type: 'medkit', respawnSec: 13 },
    { id: 'jp_fuel_l', x: 715, y: 795, type: 'fuel', respawnSec: 10 },
    { id: 'jp_med_c', x: 1300, y: 390, type: 'medkit', respawnSec: 13 },
    { id: 'jp_fuel_bot', x: 1300, y: 1015, type: 'fuel', respawnSec: 10 },
    { id: 'jp_fuel_r', x: 1885, y: 795, type: 'fuel', respawnSec: 10 },
    { id: 'jp_med_e', x: 2350, y: 600, type: 'medkit', respawnSec: 13 },
  ],
  playerSpawns: [
    { x: 160, y: 990 },
    { x: 2440, y: 990 },
    { x: 260, y: 790 },
    { x: 2340, y: 790 },
    { x: 1120, y: 790 },
    { x: 1480, y: 790 },
    { x: 715, y: 770 },
    { x: 1885, y: 770 },
  ],
  landmarks: [
    { id: 'jlm_w', label: 'West Shrine', shortLabel: 'SHRINE', zone: 'forest', x: 270, y: 635 },
    { id: 'jlm_c', label: 'Temple Core', shortLabel: 'TEMPLE', zone: 'forest', x: 1300, y: 650 },
    { id: 'jlm_e', label: 'East Canopy', shortLabel: 'CANOPY', zone: 'forest', x: 2310, y: 635 },
  ],
};

// 3. SCORCHED DESERT OUTPOST — 2600 x 1150
const SCORCHED_DESERT_MAP: ArenaMap = {
  id: 'scorched_desert',
  name: 'Scorched Desert Outpost',
  biome: 'desert',
  width: 2600,
  height: 1150,
  podiumZone: { x: 1140, y: 550, w: 320, h: 150, label: 'OASIS PODIUM' },
  hardpoints: [
    { x: 1140, y: 550, w: 320, h: 150, label: 'CITADEL DECK' },
    { x: 1080, y: 750, w: 440, h: 130, label: 'LOW CITADEL' },
    { x: 1080, y: 935, w: 440, h: 130, label: 'CENTER DUNES' },
  ],
  domFlags: [
    { id: 'A', label: 'West Bunker', x: 300, y: 840 },
    { id: 'B', label: 'Citadel Deck', x: 1300, y: 700 },
    { id: 'C', label: 'East Bunker', x: 2300, y: 840 },
  ],
  ctfBases: {
    alpha: { x: 160, y: 1050 },
    bravo: { x: 2440, y: 1050 },
  },
  platforms: [
    { id: 'd_floor_l', x: 0, y: 1050, w: 720, h: 100, kind: 'solid', style: 'sandstone' },
    { id: 'd_dune_l', x: 720, y: 1010, w: 320, h: 140, kind: 'solid', style: 'sandstone' },
    { id: 'd_floor_c', x: 1040, y: 1065, w: 520, h: 85, kind: 'solid', style: 'sandstone' },
    { id: 'd_dune_r', x: 1560, y: 1010, w: 320, h: 140, kind: 'solid', style: 'sandstone' },
    { id: 'd_floor_r', x: 1880, y: 1050, w: 720, h: 100, kind: 'solid', style: 'sandstone' },
    { id: 'wall_left', x: 0, y: 0, w: 36, h: 1150, kind: 'solid', style: 'sandstone' },
    { id: 'wall_right', x: 2564, y: 0, w: 36, h: 1150, kind: 'solid', style: 'sandstone' },
    { id: 'ceiling', x: 0, y: 0, w: 2600, h: 32, kind: 'solid', style: 'sandstone' },

    // West Bunker & Oasis Ledge
    { id: 'd_w_bunker', x: 130, y: 840, w: 380, h: 28, kind: 'solid', style: 'sandstone' },
    { id: 'd_w_pillar', x: 420, y: 745, w: 36, h: 95, kind: 'cover', style: 'sandstone' },
    { id: 'd_w_oasis', x: 150, y: 605, w: 310, h: 24, kind: 'oneway', style: 'timber' },
    { id: 'd_step_l', x: 640, y: 740, w: 280, h: 22, kind: 'oneway', style: 'sandstone' },

    // Central Sandstone Citadel
    { id: 'd_c_low', x: 1030, y: 880, w: 540, h: 26, kind: 'oneway', style: 'sandstone' },
    { id: 'd_c_deck', x: 1070, y: 700, w: 460, h: 28, kind: 'solid', style: 'sandstone' },
    { id: 'd_c_blk_l', x: 1085, y: 620, w: 34, h: 80, kind: 'cover', style: 'sandbag' },
    { id: 'd_c_blk_r', x: 1481, y: 620, w: 34, h: 80, kind: 'cover', style: 'sandbag' },
    { id: 'd_c_top', x: 1155, y: 470, w: 290, h: 22, kind: 'oneway', style: 'grate' },

    // East Bunker & Oasis Ledge
    { id: 'd_step_r', x: 1680, y: 740, w: 280, h: 22, kind: 'oneway', style: 'sandstone' },
    { id: 'd_e_bunker', x: 2090, y: 840, w: 380, h: 28, kind: 'solid', style: 'sandstone' },
    { id: 'd_e_pillar', x: 2144, y: 745, w: 36, h: 95, kind: 'cover', style: 'sandstone' },
    { id: 'd_e_oasis', x: 2140, y: 605, w: 310, h: 24, kind: 'oneway', style: 'timber' },
  ],
  destructibleWalls: [
    createDestructibleWall('dd_sand_w', 575, 1050, 38, 110, 'sandstone', 145, 24),
    createDestructibleWall('dd_crate_w', 240, 840, 50, 54, 'crate_wood', 65, 20),
    createDestructibleWall('dd_crate_c', 1275, 880, 52, 54, 'crate_wood', 70, 20),
    createDestructibleWall('dd_sand_c', 1280, 1065, 40, 105, 'sandstone', 150, 24),
    createDestructibleWall('dd_crate_e', 2310, 840, 50, 54, 'crate_wood', 65, 20),
    createDestructibleWall('dd_sand_e', 1985, 1050, 38, 110, 'sandstone', 145, 24),
  ],
  ramps: [
    { id: 'dr_dune_ll', x1: 660, y1: 1050, x2: 740, y2: 1010 },
    { id: 'dr_dune_lr', x1: 1020, y1: 1010, x2: 1090, y2: 1065 },
    { id: 'dr_dune_rl', x1: 1510, y1: 1065, x2: 1580, y2: 1010 },
    { id: 'dr_dune_rr', x1: 1860, y1: 1010, x2: 1940, y2: 1050 },
  ],
  ladders: [
    { id: 'dl_w1', x: 175, y: 605, w: 36, h: 445 },
    { id: 'dl_c', x: 1282, y: 470, w: 36, h: 410 },
    { id: 'dl_e1', x: 2389, y: 605, w: 36, h: 445 },
  ],
  barrelSpawns: [
    { id: 'db_1', x: 350, y: 1050 },
    { id: 'db_2', x: 880, y: 1010 },
    { id: 'db_3', x: 1160, y: 880 },
    { id: 'db_4', x: 1440, y: 880 },
    { id: 'db_5', x: 1720, y: 1010 },
    { id: 'db_6', x: 2250, y: 1050 },
  ],
  pickupSpawns: [
    { id: 'dp_med_w', x: 300, y: 570, type: 'medkit', respawnSec: 13 },
    { id: 'dp_fuel_l', x: 780, y: 705, type: 'fuel', respawnSec: 10 },
    { id: 'dp_med_c', x: 1300, y: 435, type: 'medkit', respawnSec: 13 },
    { id: 'dp_fuel_c', x: 1300, y: 1030, type: 'fuel', respawnSec: 10 },
    { id: 'dp_fuel_r', x: 1820, y: 705, type: 'fuel', respawnSec: 10 },
    { id: 'dp_med_e', x: 2300, y: 570, type: 'medkit', respawnSec: 13 },
  ],
  playerSpawns: [
    { x: 160, y: 990 },
    { x: 2440, y: 990 },
    { x: 280, y: 780 },
    { x: 2320, y: 780 },
    { x: 1130, y: 640 },
    { x: 1470, y: 640 },
    { x: 780, y: 685 },
    { x: 1820, y: 685 },
  ],
  landmarks: [
    { id: 'dlm_w', label: 'West Bunker', shortLabel: 'BUNKER', zone: 'desert', x: 310, y: 840 },
    { id: 'dlm_c', label: 'Citadel Fort', shortLabel: 'CITADEL', zone: 'desert', x: 1300, y: 700 },
    { id: 'dlm_e', label: 'East Oasis', shortLabel: 'OASIS', zone: 'desert', x: 2280, y: 605 },
  ],
};

// 4. ARCTIC BORDER BUNKER — 2600 x 1150
const ARCTIC_BUNKER_MAP: ArenaMap = {
  id: 'arctic_bunker',
  name: 'Arctic Border Bunker',
  biome: 'arctic',
  width: 2600,
  height: 1150,
  podiumZone: { x: 1140, y: 525, w: 320, h: 155, label: 'ARCTIC PODIUM' },
  hardpoints: [
    { x: 1140, y: 525, w: 320, h: 155, label: 'BORDER DECK' },
    { x: 1080, y: 745, w: 440, h: 130, label: 'LOW BUNKER' },
    { x: 1080, y: 920, w: 440, h: 130, label: 'FROST FLOOR' },
  ],
  domFlags: [
    { id: 'A', label: 'West Ridge', x: 300, y: 840 },
    { id: 'B', label: 'Border Bunker', x: 1300, y: 680 },
    { id: 'C', label: 'East Ridge', x: 2300, y: 840 },
  ],
  ctfBases: {
    alpha: { x: 160, y: 1050 },
    bravo: { x: 2440, y: 1050 },
  },
  radarTowers: [
    { x: 280, y: 465, h: 150 },
    { x: 2320, y: 465, h: 150 },
  ],
  platforms: [
    { id: 'a_floor_l', x: 0, y: 1050, w: 680, h: 100, kind: 'solid', style: 'snow' },
    { id: 'a_ice_bridge_l', x: 680, y: 1065, w: 360, h: 85, kind: 'solid', style: 'ice' },
    { id: 'a_floor_c', x: 1040, y: 1050, w: 520, h: 100, kind: 'solid', style: 'snow' },
    { id: 'a_ice_bridge_r', x: 1560, y: 1065, w: 360, h: 85, kind: 'solid', style: 'ice' },
    { id: 'a_floor_r', x: 1920, y: 1050, w: 680, h: 100, kind: 'solid', style: 'snow' },
    { id: 'wall_left', x: 0, y: 0, w: 36, h: 1150, kind: 'solid', style: 'snow' },
    { id: 'wall_right', x: 2564, y: 0, w: 36, h: 1150, kind: 'solid', style: 'snow' },
    { id: 'ceiling', x: 0, y: 0, w: 2600, h: 32, kind: 'solid', style: 'snow' },

    // West Radar Ridge
    { id: 'a_w_ridge', x: 120, y: 840, w: 410, h: 26, kind: 'solid', style: 'snow' },
    { id: 'a_w_ice', x: 170, y: 650, w: 340, h: 22, kind: 'oneway', style: 'ice' },
    { id: 'a_w_radar_base', x: 130, y: 465, w: 310, h: 26, kind: 'solid', style: 'concrete' },
    { id: 'a_w_blk', x: 400, y: 760, w: 36, h: 80, kind: 'cover', style: 'sandbag' },

    // Ice Shelf Flanks
    { id: 'a_shelf_l', x: 660, y: 790, w: 300, h: 22, kind: 'oneway', style: 'ice' },

    // Central Border Command Bunker
    { id: 'a_c_low', x: 1030, y: 875, w: 540, h: 24, kind: 'oneway', style: 'grate' },
    { id: 'a_c_deck', x: 1080, y: 680, w: 440, h: 26, kind: 'solid', style: 'ice' },
    { id: 'a_c_top', x: 1160, y: 465, w: 280, h: 22, kind: 'oneway', style: 'snow' },
    { id: 'a_c_blk_l', x: 1090, y: 605, w: 32, h: 75, kind: 'cover', style: 'concrete' },
    { id: 'a_c_blk_r', x: 1478, y: 605, w: 32, h: 75, kind: 'cover', style: 'concrete' },

    { id: 'a_shelf_r', x: 1640, y: 790, w: 300, h: 22, kind: 'oneway', style: 'ice' },

    // East Radar Ridge
    { id: 'a_e_ridge', x: 2070, y: 840, w: 410, h: 26, kind: 'solid', style: 'snow' },
    { id: 'a_e_ice', x: 2090, y: 650, w: 340, h: 22, kind: 'oneway', style: 'ice' },
    { id: 'a_e_radar_base', x: 2160, y: 465, w: 310, h: 26, kind: 'solid', style: 'concrete' },
    { id: 'a_e_blk', x: 2164, y: 760, w: 36, h: 80, kind: 'cover', style: 'sandbag' },
  ],
  destructibleWalls: [
    createDestructibleWall('ad_glass_w', 300, 650, 22, 105, 'glass', 55, 18),
    createDestructibleWall('ad_crate_w', 540, 1050, 50, 54, 'crate_wood', 65, 20),
    createDestructibleWall('ad_glass_c1', 1175, 680, 22, 95, 'glass', 55, 18),
    createDestructibleWall('ad_glass_c2', 1403, 680, 22, 95, 'glass', 55, 18),
    createDestructibleWall('ad_crate_c', 1275, 1050, 50, 54, 'crate_wood', 65, 20),
    createDestructibleWall('ad_crate_e', 2010, 1050, 50, 54, 'crate_wood', 65, 20),
    createDestructibleWall('ad_glass_e', 2280, 650, 22, 105, 'glass', 55, 18),
  ],
  ramps: [
    { id: 'ar_ice_ll', x1: 640, y1: 1050, x2: 710, y2: 1065 },
    { id: 'ar_ice_lr', x1: 1010, y1: 1065, x2: 1070, y2: 1050 },
    { id: 'ar_ice_rl', x1: 1530, y1: 1050, x2: 1590, y2: 1065 },
    { id: 'ar_ice_rr', x1: 1890, y1: 1065, x2: 1960, y2: 1050 },
  ],
  ladders: [
    { id: 'al_w', x: 185, y: 465, w: 36, h: 375 },
    { id: 'al_c', x: 1282, y: 465, w: 36, h: 410 },
    { id: 'al_e', x: 2379, y: 465, w: 36, h: 375 },
  ],
  barrelSpawns: [
    { id: 'ab_1', x: 350, y: 1050 },
    { id: 'ab_2', x: 860, y: 1065 },
    { id: 'ab_3', x: 1140, y: 875 },
    { id: 'ab_4', x: 1460, y: 875 },
    { id: 'ab_5', x: 1740, y: 1065 },
    { id: 'ab_6', x: 2250, y: 1050 },
  ],
  pickupSpawns: [
    { id: 'ap_med_w', x: 285, y: 430, type: 'medkit', respawnSec: 13 },
    { id: 'ap_fuel_l', x: 810, y: 755, type: 'fuel', respawnSec: 10 },
    { id: 'ap_med_c', x: 1300, y: 430, type: 'medkit', respawnSec: 13 },
    { id: 'ap_fuel_bot', x: 1300, y: 1015, type: 'fuel', respawnSec: 10 },
    { id: 'ap_fuel_r', x: 1790, y: 755, type: 'fuel', respawnSec: 10 },
    { id: 'ap_med_e', x: 2315, y: 430, type: 'medkit', respawnSec: 13 },
  ],
  playerSpawns: [
    { x: 160, y: 990 },
    { x: 2440, y: 990 },
    { x: 300, y: 780 },
    { x: 2300, y: 780 },
    { x: 1140, y: 620 },
    { x: 1460, y: 620 },
    { x: 810, y: 730 },
    { x: 1790, y: 730 },
  ],
  landmarks: [
    { id: 'alm_w', label: 'West Radar', shortLabel: 'RADAR W', zone: 'arctic', x: 280, y: 465 },
    { id: 'alm_c', label: 'Border Ice', shortLabel: 'BUNKER', zone: 'arctic', x: 1300, y: 680 },
    { id: 'alm_e', label: 'East Radar', shortLabel: 'RADAR E', zone: 'arctic', x: 2320, y: 465 },
  ],
};

// 5. TRI-ZONE FRONTIER (HYBRID) — Original 4400 x 1300 mega arena preserved
export const ARENA_LANDMARKS: ArenaLandmark[] = [
  { id: 'lm_city_tower', label: 'City Tower', shortLabel: 'TOWER', zone: 'city', x: 1020, y: 690 },
  { id: 'lm_forest_bunker', label: 'West Bunker', shortLabel: 'BUNKER', zone: 'forest', x: 1790, y: 985 },
  { id: 'lm_forest_core', label: 'Maze Core', shortLabel: 'CORE', zone: 'forest', x: 2245, y: 800 },
  { id: 'lm_forest_spire', label: 'Canopy Spire', shortLabel: 'SPIRE', zone: 'forest', x: 2270, y: 390 },
  { id: 'lm_forest_east', label: 'East Canopy', shortLabel: 'CANOPY', zone: 'forest', x: 2740, y: 710 },
  { id: 'lm_desert_mesa', label: 'Mesa Crates', shortLabel: 'MESA', zone: 'desert', x: 3340, y: 935 },
  { id: 'lm_desert_fort', label: 'Sand Fortress', shortLabel: 'FORT', zone: 'desert', x: 3815, y: 865 },
  { id: 'lm_desert_east', label: 'East Compound', shortLabel: 'OUTPOST', zone: 'desert', x: 4160, y: 750 },
];

const HYBRID_ARENA_MAP: ArenaMap = {
  id: 'hybrid_arena',
  name: 'Tri-Zone Frontier (Hybrid)',
  biome: 'hybrid',
  width: 4400,
  height: 1300,
  podiumZone: { x: 2110, y: 680, w: 300, h: 150, label: 'FOREST PODIUM' },
  hardpoints: [
    { x: 2110, y: 680, w: 300, h: 150, label: 'FOREST PODIUM' },
    { x: 860, y: 890, w: 320, h: 130, label: 'CITY PLAZA' },
    { x: 3650, y: 770, w: 330, h: 130, label: 'DESERT FORT' },
  ],
  domFlags: [
    { id: 'A', label: 'City Tower', x: 1020, y: 720 },
    { id: 'B', label: 'Forest Mid', x: 2250, y: 830 },
    { id: 'C', label: 'Desert Fort', x: 3815, y: 900 },
  ],
  ctfBases: {
    alpha: { x: 220, y: 1200 },
    bravo: { x: 4180, y: 1200 },
  },
  neonSigns: [{ x: 220, y: 495, w: 140, h: 38, text: 'METRO SECTOR', color: '#38BDF8' }],
  vines: [
    { x: 1760, y: 32, len: 290, phase: 0.4 },
    { x: 2150, y: 32, len: 260, phase: 1.8 },
    { x: 2620, y: 32, len: 310, phase: 2.7 },
  ],
  landmarks: ARENA_LANDMARKS,
  platforms: [
    { id: 'floor_city_l', x: 0, y: 1200, w: 620, h: 100, kind: 'solid', style: 'concrete' },
    { id: 'floor_city_pit', x: 620, y: 1245, w: 360, h: 55, kind: 'solid', style: 'concrete' },
    { id: 'floor_city_r', x: 980, y: 1200, w: 540, h: 100, kind: 'solid', style: 'concrete' },
    { id: 'floor_forest', x: 1520, y: 1200, w: 1480, h: 100, kind: 'solid', style: 'moss' },
    { id: 'floor_desert_l', x: 3000, y: 1200, w: 680, h: 100, kind: 'solid', style: 'sandstone' },
    { id: 'floor_desert_dip', x: 3680, y: 1235, w: 280, h: 65, kind: 'solid', style: 'sandstone' },
    { id: 'floor_desert_r', x: 3960, y: 1200, w: 440, h: 100, kind: 'solid', style: 'sandstone' },
    { id: 'wall_left', x: 0, y: 0, w: 36, h: 1300, kind: 'solid', style: 'concrete' },
    { id: 'wall_right', x: 4364, y: 0, w: 36, h: 1300, kind: 'solid', style: 'sandstone' },
    { id: 'ceiling', x: 0, y: 0, w: 4400, h: 32, kind: 'solid', style: 'concrete' },

    // ZONE 1: ABANDONED CITY
    { id: 'city_f1', x: 90, y: 1000, w: 430, h: 24, kind: 'oneway', style: 'concrete' },
    { id: 'city_f2', x: 110, y: 795, w: 400, h: 24, kind: 'oneway', style: 'concrete' },
    { id: 'city_roof', x: 75, y: 585, w: 455, h: 28, kind: 'solid', style: 'concrete' },
    { id: 'city_ruin_wall', x: 75, y: 613, w: 28, h: 210, kind: 'solid', style: 'brick' },
    { id: 'city_parapet', x: 410, y: 515, w: 34, h: 70, kind: 'cover', style: 'concrete' },
    { id: 'city_pillar_1', x: 340, y: 1090, w: 38, h: 110, kind: 'cover', style: 'concrete' },
    { id: 'city_cover_f2', x: 295, y: 735, w: 36, h: 60, kind: 'cover', style: 'brick' },
    { id: 'city_bridge_l', x: 580, y: 925, w: 230, h: 24, kind: 'oneway', style: 'grate' },
    { id: 'city_plaza', x: 840, y: 1020, w: 360, h: 26, kind: 'oneway', style: 'concrete' },
    { id: 'city_tower_mid', x: 860, y: 720, w: 320, h: 28, kind: 'solid', style: 'concrete' },
    { id: 'city_tower_top', x: 905, y: 470, w: 230, h: 24, kind: 'oneway', style: 'grate' },
    { id: 'city_tower_blk_l', x: 870, y: 645, w: 30, h: 75, kind: 'cover', style: 'sandbag' },
    { id: 'city_tower_blk_r', x: 1140, y: 645, w: 30, h: 75, kind: 'cover', style: 'sandbag' },
    { id: 'city_gate_wall', x: 1330, y: 1030, w: 40, h: 170, kind: 'cover', style: 'brick' },
    { id: 'city_overpass_r', x: 1230, y: 845, w: 270, h: 24, kind: 'oneway', style: 'grate' },

    // ZONE 2: FOREST MAZE
    { id: 'maze_trunk_1', x: 1620, y: 870, w: 46, h: 330, kind: 'solid', style: 'timber' },
    { id: 'maze_bunker_1', x: 1666, y: 1025, w: 260, h: 26, kind: 'solid', style: 'moss' },
    { id: 'maze_baffle_1', x: 1890, y: 760, w: 42, h: 265, kind: 'solid', style: 'timber' },
    { id: 'maze_floor_1', x: 1630, y: 740, w: 320, h: 24, kind: 'oneway', style: 'moss' },
    { id: 'maze_cover_1', x: 1765, y: 1110, w: 44, h: 90, kind: 'cover', style: 'timber' },

    { id: 'maze_core_bot', x: 1980, y: 1030, w: 480, h: 26, kind: 'solid', style: 'moss' },
    { id: 'maze_core_wall_l', x: 2050, y: 780, w: 40, h: 250, kind: 'solid', style: 'timber' },
    { id: 'maze_core_wall_c', x: 2220, y: 870, w: 44, h: 330, kind: 'solid', style: 'timber' },
    { id: 'maze_core_wall_r', x: 2410, y: 780, w: 40, h: 250, kind: 'solid', style: 'timber' },
    { id: 'maze_mid_shelf', x: 2090, y: 830, w: 320, h: 24, kind: 'oneway', style: 'moss' },
    { id: 'maze_canopy_l', x: 1740, y: 520, w: 360, h: 24, kind: 'oneway', style: 'moss' },
    { id: 'maze_canopy_c', x: 2140, y: 420, w: 260, h: 26, kind: 'solid', style: 'moss' },
    { id: 'maze_canopy_blk', x: 2252, y: 345, w: 36, h: 75, kind: 'cover', style: 'timber' },
    { id: 'maze_canopy_r', x: 2450, y: 520, w: 360, h: 24, kind: 'oneway', style: 'moss' },

    { id: 'maze_trunk_2', x: 2620, y: 760, w: 44, h: 280, kind: 'solid', style: 'timber' },
    { id: 'maze_floor_2', x: 2580, y: 736, w: 340, h: 24, kind: 'oneway', style: 'moss' },
    { id: 'maze_bunker_2', x: 2664, y: 1015, w: 270, h: 26, kind: 'solid', style: 'moss' },
    { id: 'maze_cover_2', x: 2780, y: 1110, w: 44, h: 90, kind: 'cover', style: 'timber' },
    { id: 'maze_trunk_3', x: 2910, y: 860, w: 46, h: 340, kind: 'solid', style: 'timber' },

    // ZONE 3: DESERT OUTPOST
    { id: 'des_fort_wall_l', x: 3110, y: 1045, w: 42, h: 155, kind: 'cover', style: 'sandstone' },
    { id: 'des_mesa_1', x: 3180, y: 970, w: 360, h: 28, kind: 'solid', style: 'sandstone' },
    { id: 'des_crate_1', x: 3320, y: 890, w: 58, h: 80, kind: 'cover', style: 'crate_cover' },
    { id: 'des_mesa_high_1', x: 3150, y: 710, w: 330, h: 24, kind: 'oneway', style: 'sandstone' },

    { id: 'des_fort_base', x: 3620, y: 900, w: 390, h: 28, kind: 'solid', style: 'sandstone' },
    { id: 'des_fort_pillar_l', x: 3630, y: 770, w: 36, h: 130, kind: 'cover', style: 'sandstone' },
    { id: 'des_fort_pillar_r', x: 3964, y: 770, w: 36, h: 130, kind: 'cover', style: 'sandstone' },
    { id: 'des_fort_top', x: 3680, y: 615, w: 270, h: 24, kind: 'oneway', style: 'grate' },
    { id: 'des_pit_crate', x: 3785, y: 1155, w: 70, h: 80, kind: 'cover', style: 'crate_cover' },

    { id: 'des_east_f1', x: 4040, y: 1000, w: 300, h: 24, kind: 'oneway', style: 'sandstone' },
    { id: 'des_east_f2', x: 4050, y: 785, w: 290, h: 26, kind: 'solid', style: 'sandstone' },
    { id: 'des_east_blk', x: 4160, y: 700, w: 48, h: 85, kind: 'cover', style: 'crate_cover' },
    { id: 'des_east_top', x: 4070, y: 560, w: 260, h: 24, kind: 'oneway', style: 'sandstone' },
  ],
  destructibleWalls: [
    createDestructibleWall('dwall_city_alley', 690, 1245, 36, 120, 'brick', 140, 24),
    createDestructibleWall('dwall_city_plaza', 1110, 1020, 22, 100, 'glass', 60, 20),
    createDestructibleWall('dwall_maze_west', 1945, 1200, 50, 56, 'crate_wood', 65, 22),
    createDestructibleWall('dwall_maze_core_gate', 2315, 1030, 34, 110, 'timber', 140, 24),
    createDestructibleWall('dwall_maze_canopy', 2560, 520, 34, 95, 'timber', 110, 22),
    createDestructibleWall('dwall_desert_crates', 3465, 1200, 48, 56, 'crate_wood', 70, 22),
    createDestructibleWall('dwall_desert_fort', 3730, 900, 36, 105, 'sandstone', 150, 24),
    createDestructibleWall('dwall_desert_east', 4065, 1200, 40, 105, 'sandstone', 140, 24),
  ],
  ramps: [
    { id: 'ramp_city_pit_l', x1: 540, y1: 1200, x2: 640, y2: 1245 },
    { id: 'ramp_city_pit_r', x1: 960, y1: 1245, x2: 1060, y2: 1200 },
    { id: 'ramp_forest_l', x1: 1520, y1: 1200, x2: 1620, y2: 1140 },
    { id: 'ramp_forest_r', x1: 2956, y1: 1140, x2: 3040, y2: 1200 },
    { id: 'ramp_des_pit_l', x1: 3600, y1: 1200, x2: 3695, y2: 1235 },
    { id: 'ramp_des_pit_r', x1: 3945, y1: 1235, x2: 4040, y2: 1200 },
  ],
  ladders: [
    { id: 'lad_city_1', x: 465, y: 795, w: 36, h: 405 },
    { id: 'lad_city_2', x: 145, y: 585, w: 36, h: 210 },
    { id: 'lad_city_tower', x: 1002, y: 470, w: 36, h: 550 },
    { id: 'lad_maze_w', x: 1690, y: 740, w: 36, h: 285 },
    { id: 'lad_maze_c', x: 2252, y: 420, w: 36, h: 410 },
    { id: 'lad_maze_e', x: 2840, y: 736, w: 36, h: 279 },
    { id: 'lad_des_1', x: 3420, y: 710, w: 36, h: 260 },
    { id: 'lad_des_fort', x: 3800, y: 615, w: 36, h: 285 },
    { id: 'lad_des_east', x: 4260, y: 560, w: 36, h: 440 },
  ],
  barrelSpawns: [
    { id: 'bar_city_1', x: 240, y: 1200 },
    { id: 'bar_city_2', x: 1020, y: 1020 },
    { id: 'bar_maze_1', x: 1840, y: 1200 },
    { id: 'bar_maze_2', x: 2240, y: 830 },
    { id: 'bar_maze_3', x: 2720, y: 1015 },
    { id: 'bar_des_1', x: 3350, y: 1200 },
    { id: 'bar_des_2', x: 3820, y: 900 },
    { id: 'bar_des_3', x: 4140, y: 1200 },
  ],
  pickupSpawns: [
    { id: 'pk_med_city_roof', x: 260, y: 550, type: 'medkit', respawnSec: 13 },
    { id: 'pk_fuel_city_tower', x: 1020, y: 690, type: 'fuel', respawnSec: 10 },
    { id: 'pk_med_city_pit', x: 800, y: 1210, type: 'medkit', respawnSec: 14 },
    { id: 'pk_fuel_maze_w', x: 1790, y: 990, type: 'fuel', respawnSec: 10 },
    { id: 'pk_med_maze_core', x: 2270, y: 388, type: 'medkit', respawnSec: 13 },
    { id: 'pk_fuel_maze_c', x: 2330, y: 1165, type: 'fuel', respawnSec: 11 },
    { id: 'pk_med_maze_e', x: 2740, y: 702, type: 'medkit', respawnSec: 13 },
    { id: 'pk_fuel_des_1', x: 3340, y: 935, type: 'fuel', respawnSec: 10 },
    { id: 'pk_med_des_fort', x: 3815, y: 580, type: 'medkit', respawnSec: 13 },
    { id: 'pk_fuel_des_east', x: 4190, y: 750, type: 'fuel', respawnSec: 10 },
  ],
  playerSpawns: [
    { x: 190, y: 1120 },
    { x: 4220, y: 1120 },
    { x: 1020, y: 660 },
    { x: 1800, y: 680 },
    { x: 2270, y: 960 },
    { x: 2750, y: 680 },
    { x: 3300, y: 900 },
    { x: 3815, y: 840 },
    { x: 260, y: 740 },
    { x: 4160, y: 720 },
  ],
};

export const MAPS: Record<MapId, ArenaMap> = {
  city_dusk: CITY_DUSK_MAP,
  jungle_fortress: JUNGLE_FORTRESS_MAP,
  scorched_desert: SCORCHED_DESERT_MAP,
  arctic_bunker: ARCTIC_BUNKER_MAP,
  hybrid_arena: HYBRID_ARENA_MAP,
};

export function getArenaMap(mapId?: MapId): ArenaMap {
  return (mapId && MAPS[mapId]) || MAPS.city_dusk;
}

export const ARENA_MAP: ArenaMap = HYBRID_ARENA_MAP;
