import {
  AnyPowerUpType,
  CharacterId,
  DestructibleWallStyle,
  DualWieldType,
  EmoteId,
  FlameColorId,
  GrenadeType,
  GunWrapId,
  KillFeedWeaponId,
  MeleeWeaponId,
  OutfitId,
  PlayerSlotIndex,
  PrimaryWeaponId,
  RankDef,
  SecondaryWeaponId,
  SprayId,
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
  gunWrap: GunWrapId;
  masteryMap?: Partial<Record<WeaponId, WeaponMasteryTier>>;
  ammo: number;
  isReloading: boolean;
  reloadTimerMs: number;
  fireCooldownMs: number;
  minigunSpinTimer: number;
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

  // KOTH & Speech Bubble & Status Effects
  kothPoints: number;
  inPodium: boolean;
  speechText: string;
  speechTimer: number;
  stunTimer: number;
  danceTimer: number;
  freezeTimer: number;
  empDisableTimer: number;
  empDotTimer: number;
  empTickAccum: number;
  empOwnerId: string | null;
  slamPending: boolean;
  gossipCooldown: number;

  // V3.0 Movement, Power-Ups, Last Stand, Modes & Nemesis
  grappleActive: boolean;
  grappleX: number;
  grappleY: number;
  grappleLen: number;
  dashTimer: number;
  dashCooldown: number;
  dashDir: -1 | 0 | 1;
  lastTapLeftAt: number;
  lastTapRightAt: number;
  shrinkTimer: number;
  megaSizeTimer: number;
  bubbleShieldHp: number;
  bubbleShieldTimer: number;
  isLastStand: boolean;
  lastStandTimer: number;
  isVip: boolean;
  isBoss: boolean;
  bossEmpTimer: number;
  gunGameTier: number;
  portalCooldown: number;
  emoteIndex: number;
  sprayIndex: number;
  consecutiveDeathsFrom: Record<string, number>;
  nemesisKillerIds: string[];
  afterlifeKillsCount: number;
  nemesisKillsCount: number;
  nemesisRevengeCoinsEarned: number;

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
  isChappal?: boolean;
  bouncesLeft?: number;
  targetId?: string | null;
  fromUltimate?: boolean;
  killFeedWeaponOverride?: 'dual_pistols' | 'dual_smgs';
  noDrop?: boolean;
  knockback?: number;
  stickyExplosive?: boolean;
  stuck?: boolean;
  stuckTimer?: number;
  stuckFighterId?: string;
  stuckOffsetX?: number;
  stuckOffsetY?: number;
  freezeDurationSec?: number;
}

export interface CookerBombEntity {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuseTimer: number;
  maxFuse: number;
  whistleTimer: number;
}

export interface GeometryBeamEntity {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  angle: number;
  length: number;
  life: number;
  maxLife: number;
  color?: string;
  isGossip?: boolean;
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

export interface WeaponDropEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weaponId: PrimaryWeaponId;
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
  origX: number;
  origY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  launched: boolean;
  launcherId: string | null;
  fuseTimer: number;
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
  type: AnyPowerUpType;
  life: number;
  maxLife: number;
  bobPhase: number;
}

export interface PortalPairEntity {
  id: string;
  aX: number;
  aY: number;
  bX: number;
  bY: number;
  radius: number;
  pulse: number;
}

export interface JumpPadEntity {
  id: string;
  x: number;
  y: number;
  w: number;
  compress: number;
}

export interface WindVentEntity {
  id: string;
  x: number;
  y: number;
  w: number;
  height: number;
}

export interface SecurityTurretEntity {
  x: number;
  y: number;
  terminalX: number;
  terminalY: number;
  ownerTeam: TeamId | null;
  ownerId: string | null;
  ownerName: string | null;
  hackProgress: number;
  hackingFighterId: string | null;
  hackingPlayerName: string | null;
  aimAngle: number;
  fireCooldown: number;
  muzzleFlashTimer: number;
}

export interface GlassFloorEntity {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cracks: number;
  alive: boolean;
  respawnTimer: number;
}

export interface GoldenAirdropEntity {
  active: boolean;
  landed: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
}

export interface SubwayTrainEntity {
  active: boolean;
  warningTimerSec: number;
  nextCycleTimerSec: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  dir: 1 | -1;
  carCount: number;
  hitIds: Set<string>;
}

export interface HologramCloneEntity {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  characterId: CharacterId;
  outfitId: OutfitId;
  life: number;
  fireTimer: number;
}

export interface WallSprayEntity {
  id: number;
  x: number;
  y: number;
  sprayId: SprayId;
  ownerName: string;
  life: number;
  maxLife: number;
  surface?: 'wall' | 'backdrop';
  wallId?: string;
  rotation?: number;
  persistent?: boolean;
  ageSec?: number;
}

export interface EmotePopupEntity {
  id: number;
  fighterId: string;
  x: number;
  y: number;
  emoteId: EmoteId;
  life: number;
  maxLife: number;
}

export interface AfterimageGhost {
  x: number;
  y: number;
  facing: 1 | -1;
  color: string;
  alpha: number;
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
