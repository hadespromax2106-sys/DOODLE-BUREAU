import {
  CharacterId,
  DestructibleWallStyle,
  DualWieldType,
  FlameColorId,
  GrenadeType,
  KillFeedWeaponId,
  MeleeWeaponId,
  OutfitId,
  PlayerSlotIndex,
  PowerUpType,
  RankDef,
  SecondaryWeaponId,
  TeamId,
  WeaponId,
  WeaponMasteryTier,
  WeaponSlot,
} from '../types/game';
import { PickupType } from './map';

export interface FighterEntity {
  id: string;
  name: string;
  characterId: CharacterId;
  outfitId: OutfitId;
  flameId: FlameColorId;
  rank: RankDef;
  isHuman: boolean;
  playerIndex?: PlayerSlotIndex;
  team?: TeamId;
  profileId?: string;
  carryingFlagTeam?: TeamId | null;

  // Physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  aimAngle: number;
  grounded: boolean;
  coyoteTimer: number;
  wallSlideDir: -1 | 0 | 1;
  onLadder: boolean;
  dropThroughTimer: number;
  jetpacking: boolean;
  inWater: boolean;

  // Combat, Passive Perks & Ultimate
  hp: number;
  maxHp: number;
  fuel: number;
  maxFuel: number;
  weaponId: WeaponId;
  activeSlot: WeaponSlot;
  primaryWeaponId: WeaponId;
  primaryAmmo: number;
  secondaryWeaponId: SecondaryWeaponId;
  secondaryAmmo: number;
  meleeWeaponId: MeleeWeaponId;
  weaponMastery: WeaponMasteryTier;
  masteryMap?: Partial<Record<WeaponId, WeaponMasteryTier>>;
  ammo: number;
  isReloading: boolean;
  reloadTimerMs: number;
  fireCooldownMs: number;
  burstRemaining: number;
  burstTimerMs: number;
  recoilKick: number;
  muzzleFlashTimer: number;
  hitFlashTimer: number;
  walkCycle: number;
  alive: boolean;
  respawnTimer: number;
  spawnInvulnTimer: number;
  lastHitById: string | null;
  lastHitWeapon: KillFeedWeaponId | null;
  lastHitAt: number;

  // Melee & Grenades & Dual-Wield
  meleeCooldownTimer: number;
  meleeSwingTimer: number;
  grenades: number;
  grenadeType: GrenadeType;
  grenadeRegenTimer: number;
  dualWield: DualWieldType | null;
  dualWieldAmmo: number;

  // Ultimate Ability (0-100 charged by dealing damage, E / Shift to activate)
  ultCharge: number;
  ultActiveTimer: number;

  // Killstreak Rewards (3 = UAV, 5 = Rapid Jetpack, 7 = Airstrike)
  killstreak: number;
  uavTimer: number;
  rapidJetTimer: number;

  // Temporary Power-Up Buffs (dropped from destroyed environment objects)
  speedBuffTimer: number;
  fuelBuffTimer: number;
  shieldHp: number;
  shieldBuffTimer: number;

  // KOTH & Speech Bubble
  kothPoints: number;
  inPodium: boolean;
  speechText: string;
  speechTimer: number;

  // Stats & Telemetry
  kills: number;
  deaths: number;
  damageDealt: number;
  weaponKills: Record<WeaponId, number>;
  rapidKillCount: number;
  lastKillAt: number;
  headshotsCount: number;
  midairKillsCount: number;
  meleeKillsCount: number;
  grenadeKillsCount: number;
  coverDestroyedCount: number;
  killstreaksEarnedCount: number;
  usedNonSniper: boolean;

  // AI State
  aiState: 'patrol' | 'hunt' | 'seek_weapon' | 'seek_heal' | 'cover' | 'podium';
  aiDecisionTimer: number;
  aiTargetId: string | null;
  aiGoalX: number;
  aiGoalY: number;
  aiStrafeDir: 1 | -1;
  aiFireHoldTimer: number;
}

export interface ProjectileEntity {
  id: number;
  ownerId: string;
  weaponId: WeaponId;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  damage: number;
  explosionRadius: number;
  color: string;
  life: number;
  isRocket: boolean;
  isHoming?: boolean;
  targetId?: string | null;
  fromUltimate?: boolean;
  killFeedWeaponOverride?: 'dual_pistols' | 'dual_smgs';
}

export interface GrenadeEntity {
  id: number;
  ownerId: string;
  type: GrenadeType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  fuseTimer: number;
  stuck: boolean;
  stuckFighterId?: string;
  stuckOffsetX?: number;
  stuckOffsetY?: number;
}

export interface SmokeCloudEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface AirstrikeBeaconEntity {
  id: number;
  ownerId: string;
  targetX: number;
  targetY: number;
  timer: number;
  shellsDropped: number;
}

export interface ScorchDecal {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export interface DualWieldDropEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: DualWieldType;
  life: number;
  maxLife: number;
  bobPhase: number;
}

export interface TempWallEntity {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  life: number;
}

export interface DestructibleWallEntity {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  style: DestructibleWallStyle;
  alive: boolean;
  respawnSec: number;
  respawnTimer: number;
  hitFlashTimer: number;
}

export interface BarrelEntity {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  hitFlashTimer: number;
}

export interface PickupEntity {
  id: string;
  x: number;
  y: number;
  type: PickupType;
  respawnSec: number;
  active: boolean;
  respawnTimer: number;
  bobPhase: number;
}

export interface PowerUpDropEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: PowerUpType;
  life: number;
  maxLife: number;
  bobPhase: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  kind: 'spark' | 'smoke' | 'flame' | 'casing' | 'debris' | 'ring' | 'glass' | 'splash';
  rot: number;
  vRot: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  shake: number;
}
