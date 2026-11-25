import {
  BOT_NAMES,
  CHARACTERS,
  DEFAULT_CUSTOM_RULES,
  EMOTE_DEFS,
  FLAME_COSMETICS,
  GUN_GAME_LADDER,
  MELEE_WEAPONS,
  PRIMARY_PICKUP_WEAPONS,
  RANKS,
  SPRAY_DEFS,
  WEAPONS,
  getGameModeDef,
  getRankForXp,
  normalizeGameMode,
  normalizeMeleeId,
  normalizeSecondaryId,
} from '../data/catalog';
import { createEmptyWeaponKills, makeUniqueUsername } from '../db/playerDb';
import { PeerRoomSession } from '../net/peerRoom';
import {
  AfterimageRenderState,
  AimedWallSnapshot,
  AnyPowerUpType,
  BossRaidHudState,
  ChaosEventType,
  ChaosHudState,
  CharacterId,
  CtfHudState,
  CustomMatchRules,
  DominationHudState,
  DualWieldType,
  EmotePopupHudState,
  FighterMatchSummary,
  GameMode,
  GlassFloorRenderState,
  GoldenAirdropHudState,
  GrenadeType,
  GunGameHudState,
  GunWrapId,
  HardpointHudState,
  HologramRenderState,
  HudSnapshot,
  JumpPadRenderState,
  KillFeedItem,
  KillFeedWeaponId,
  KillIconPrompt,
  MapId,
  MatchReplayData,
  MatchSummary,
  MeleeWeaponId,
  MultikillAnnouncement,
  MysteryPowerUpType,
  OnlinePeerMeta,
  PartyMember,
  PlayerProfile,
  PlayerSlotIndex,
  PortalRenderState,
  PowerUpType,
  RemoteInputPacket,
  ReplayFrame,
  SecondaryWeaponId,
  SubwayTrainHudState,
  TeamId,
  TeamScoreHud,
  TurretHudState,
  WallSprayHudState,
  WeaponId,
  WeaponMasteryTier,
  WeaponSlot,
  WindVentRenderState,
  WorldSyncSnapshot,
  ZoomLevel,
} from '../types/game';
import { soundEngine } from './audio';
import { ArenaMap, PickupType, PlatformRect, getArenaMap } from './map';
import { ArenaRenderer, CrosshairRenderInfo } from './renderer';
import {
  AfterimageGhost,
  AirstrikeBeaconEntity,
  BarrelEntity,
  CameraState,
  CookerBombEntity,
  DestructibleWallEntity,
  DualWieldDropEntity,
  EmotePopupEntity,
  FighterEntity,
  FloatingText,
  GeometryBeamEntity,
  GlassFloorEntity,
  GoldenAirdropEntity,
  GrenadeEntity,
  HologramCloneEntity,
  JumpPadEntity,
  Particle,
  PickupEntity,
  PortalPairEntity,
  PowerUpDropEntity,
  ProjectileEntity,
  ScorchDecal,
  SecurityTurretEntity,
  SmokeCloudEntity,
  SubwayTrainEntity,
  TempWallEntity,
  WallSprayEntity,
  WeaponDropEntity,
  WindVentEntity,
} from './types';

export interface EngineStartConfig {
  mode: GameMode;
  botCount: number;
  matchDurationSec: number;
  mapId?: MapId;
  rules?: CustomMatchRules;
  zoom?: ZoomLevel;
  p1Profile: PlayerProfile;
  p1CharacterId: CharacterId;
  p2Profile?: PlayerProfile;
  p2CharacterId?: CharacterId;
  onlinePeerMeta?: OnlinePeerMeta;
  onlinePeers?: Array<{ slot: 2 | 3 | 4; meta: OnlinePeerMeta }>;
  partyMembers?: PartyMember[];
  localPlayerIndex?: PlayerSlotIndex;
  peerSession?: PeerRoomSession | null;
  onHudUpdate: (hud: HudSnapshot) => void;
  onMatchEnd: (summary: MatchSummary) => void;
}

const GRAVITY = 1180;
const MOVE_ACCEL_GROUND = 2400;
const MOVE_ACCEL_AIR = 1550;
const BASE_RUN_SPEED = 315;
const JUMP_VELOCITY = -520;
const JETPACK_ACCEL = -2180;
const MAX_JETPACK_RISE = -415;
const MAX_FALL_SPEED = 660;
const PARTICLE_POOL_SIZE = 340;
const HARDPOINT_ROTATE_SEC = 45;

export class ArenaGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer = new ArenaRenderer();
  private config: EngineStartConfig;
  private map: ArenaMap;
  private rules: CustomMatchRules;

  private rafId = 0;
  private lastTimeMs = 0;
  private paused = false;
  private ended = false;
  private elapsedSec = 0;
  private timeRemainingSec = 180;
  private hitstopTimer = 0;
  private hudSyncAccumulator = 0;
  private netSyncAccumulator = 0;
  private replayAccumulator = 0;
  private firstBloodClaimed = false;
  private lastKillerId = '';
  private lastVictimId = '';

  private nextProjectileId = 1;
  private nextGrenadeId = 1;
  private nextSmokeId = 1;
  private nextAirstrikeId = 1;
  private nextKillFeedId = 1;
  private nextWallId = 1;
  private nextAnnouncerId = 1;
  private nextPowerUpId = 1;
  private nextDualDropId = 1;
  private nextWeaponDropId = 1;
  private nextKillIconId = 1;
  private nextCookerId = 1;
  private nextBeamId = 1;
  private nextHologramId = 1;
  private nextSprayId = 1;
  private nextEmoteId = 1;

  private fighters: FighterEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private cookerBombs: CookerBombEntity[] = [];
  private geometryBeams: GeometryBeamEntity[] = [];
  private grenades: GrenadeEntity[] = [];
  private smokeClouds: SmokeCloudEntity[] = [];
  private airstrikes: AirstrikeBeaconEntity[] = [];
  private scorchDecals: ScorchDecal[] = [];
  private barrels: BarrelEntity[] = [];
  private pickups: PickupEntity[] = [];
  private powerUps: PowerUpDropEntity[] = [];
  private dualWieldDrops: DualWieldDropEntity[] = [];
  private weaponDrops: WeaponDropEntity[] = [];
  private weaponDropSpawnTimer = 11;
  private tempWalls: TempWallEntity[] = [];
  private destructibleWalls: DestructibleWallEntity[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private killFeed: KillFeedItem[] = [];
  private activeKillIcons: KillIconPrompt[] = [];
  private activeAnnouncer: MultikillAnnouncement | null = null;
  private cameras: CameraState[] = [];
  private pendingNetEvents: WorldSyncSnapshot['events'] = [];
  private replayFrames: ReplayFrame[] = [];
  private replayKillEvents: KillFeedItem[] = [];

  // V3.0 Dynamic Chaos, Hazards & Interactive Gadgets
  private chaosState: ChaosHudState = {
    phase: 'idle',
    eventType: null,
    title: '',
    subtitle: '',
    remainingSec: 0,
    warningTimerSec: 0,
  };
  private subwayTrain: SubwayTrainEntity | null = null;
  private turret: SecurityTurretEntity | null = null;
  private portals: PortalPairEntity[] = [];
  private jumpPads: JumpPadEntity[] = [];
  private windVents: WindVentEntity[] = [];
  private glassFloors: GlassFloorEntity[] = [];
  private goldenAirdrop: GoldenAirdropEntity = {
    active: false,
    landed: false,
    x: 0,
    y: 0,
    vy: 85,
    life: 0,
  };
  private collapsedPlatformIds = new Set<string>();
  private earthquakeTimer = 0;
  private earthquakeActive = false;
  private holograms: HologramCloneEntity[] = [];
  private wallSprays: WallSprayEntity[] = [];
  private emotePopups: EmotePopupEntity[] = [];
  private afterimages: AfterimageGhost[] = [];

  private teamScores: TeamScoreHud;
  private hardpointState: HardpointHudState;
  private hardpointAlphaAccum = 0;
  private hardpointBravoAccum = 0;
  private dominationState: DominationHudState;
  private dominationTickAccum = 0;
  private ctfState: CtfHudState;

  private fpsCounterFrames = 0;
  private fpsCounterTime = 0;
  private currentFps = 60;

  // Input state
  private heldKeys = new Set<string>();
  private justPressed = new Set<string>();
  private mouseScreen = { x: 0, y: 0, down: false, rightDown: false, movedRecently: false };
  private touchState = {
    active: false,
    moveX: 0,
    moveY: 0,
    aimAngle: 0,
    hasAim: false,
    firing: false,
    jetpack: false,
  };
  private touchButtonsJust = new Set<string>();

  private remoteInputs = new Map<
    PlayerSlotIndex,
    {
      packet: RemoteInputPacket;
      upJustLatch: boolean;
      meleeLatch: boolean;
      grenadeLatch: boolean;
      cycleGrenadeLatch: boolean;
      grappleLatch: boolean;
      dashDirLatch: -1 | 0 | 1;
      emoteLatch: boolean;
      sprayLatch: boolean;
      switchSlotLatch?: WeaponSlot;
    }
  >();

  constructor(canvas: HTMLCanvasElement, config: EngineStartConfig) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }
    this.ctx = context;
    this.config = config;
    this.map = getArenaMap(config.mapId || 'city_dusk');
    const baseRules = config.rules
      ? { ...config.rules }
      : { ...DEFAULT_CUSTOM_RULES, durationSec: config.matchDurationSec };
    baseRules.gameMode = normalizeGameMode(baseRules.gameMode);
    this.rules = baseRules;
    this.timeRemainingSec = this.rules.durationSec || config.matchDurationSec;

    const modeDef = getGameModeDef(this.rules.gameMode);
    this.teamScores = {
      alpha: 0,
      bravo: 0,
      targetScore: modeDef.scoreLimit,
      label: modeDef.scoreLabel.toUpperCase(),
    };

    const hp0 = this.map.hardpoints[0] || this.map.podiumZone;
    this.hardpointState = {
      zoneIndex: 0,
      zoneLabel: hp0.label,
      x: hp0.x,
      y: hp0.y,
      w: hp0.w,
      h: hp0.h,
      rotateTimerSec: HARDPOINT_ROTATE_SEC,
      ownerTeam: null,
      contested: false,
      alphaScore: 0,
      bravoScore: 0,
      targetScore: 200,
    };

    this.dominationState = {
      flags: this.map.domFlags.map((df) => ({
        id: df.id,
        label: df.label,
        x: df.x,
        y: df.y,
        ownerTeam: null,
        capturingTeam: null,
        progress: 0,
        contested: false,
      })),
      alphaScore: 0,
      bravoScore: 0,
      targetScore: 200,
    };

    this.ctfState = {
      flags: [
        {
          team: 'alpha',
          state: 'at_base',
          x: this.map.ctfBases.alpha.x,
          y: this.map.ctfBases.alpha.y,
          baseX: this.map.ctfBases.alpha.x,
          baseY: this.map.ctfBases.alpha.y,
          carrierId: null,
          carrierName: null,
          returnTimerSec: 0,
        },
        {
          team: 'bravo',
          state: 'at_base',
          x: this.map.ctfBases.bravo.x,
          y: this.map.ctfBases.bravo.y,
          baseX: this.map.ctfBases.bravo.x,
          baseY: this.map.ctfBases.bravo.y,
          carrierId: null,
          carrierName: null,
          returnTimerSec: 0,
        },
      ],
      alphaCaptures: 0,
      bravoCaptures: 0,
      targetCaptures: 3,
    };

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        color: '#F59E0B',
        alpha: 1,
        life: 0,
        maxLife: 1,
        gravity: 0,
        kind: 'spark',
        rot: 0,
        vRot: 0,
      });
    }

    this.initEntities();
    this.bindEvents();
    this.bindNetworkCallbacks();
  }

  public setTouchState(state: {
    active?: boolean;
    moveX?: number;
    moveY?: number;
    aimAngle?: number;
    hasAim?: boolean;
    firing?: boolean;
    jetpack?: boolean;
  }): void {
    if (state.active !== undefined) this.touchState.active = state.active;
    if (state.moveX !== undefined) this.touchState.moveX = state.moveX;
    if (state.moveY !== undefined) this.touchState.moveY = state.moveY;
    if (state.aimAngle !== undefined) this.touchState.aimAngle = state.aimAngle;
    if (state.hasAim !== undefined) this.touchState.hasAim = state.hasAim;
    if (state.firing !== undefined) this.touchState.firing = state.firing;
    if (state.jetpack !== undefined) this.touchState.jetpack = state.jetpack;
  }

  public triggerTouchButton(
    action:
      | 'jump'
      | 'reload'
      | 'ultimate'
      | 'melee'
      | 'grenade'
      | 'cycle_grenade'
      | 'cycle_slot'
      | 'grapple'
      | 'dash_left'
      | 'dash_right'
      | 'emote'
      | 'spray'
  ): void {
    this.touchButtonsJust.add(action);
  }

  private getEffectiveClipSize(_f: FighterEntity, weaponId: WeaponId): number {
    if (this.rules.gameMode === 'one_in_chamber' && weaponId === 'pistol') {
      return 99;
    }
    return WEAPONS[weaponId].clipSize;
  }

  private getEffectiveReloadMs(f: FighterEntity, weaponId: WeaponId): number {
    const base = WEAPONS[weaponId].reloadMs;
    const charScaled = f.characterId === 'chai_storm' ? base * 0.8 : base;
    const frenzyScaled =
      this.chaosState.phase === 'active' && this.chaosState.eventType === 'hyper_frenzy'
        ? charScaled / 1.5
        : charScaled;
    return Math.round(frenzyScaled);
  }

  private getMasteryForWeapon(
    masteryMap: Partial<Record<WeaponId, WeaponMasteryTier>> | undefined,
    weaponId: WeaponId
  ): WeaponMasteryTier {
    return (masteryMap && masteryMap[weaponId]) || 'none';
  }

  private getActivePlatforms(): PlatformRect[] {
    if (this.collapsedPlatformIds.size === 0) return this.map.platforms;
    return this.map.platforms.filter((p) => !this.collapsedPlatformIds.has(p.id));
  }

  private isTeamMode(): boolean {
    const gm = this.rules.gameMode;
    return gm !== 'ffa' && gm !== 'gun_game' && gm !== 'one_in_chamber';
  }

  private isFriendly(a: FighterEntity | undefined, b: FighterEntity | undefined): boolean {
    if (!a || !b || a.id === b.id) return false;
    if (!this.isTeamMode()) return false;
    return Boolean(a.team && b.team && a.team === b.team);
  }

  private initEntities(): void {
    const {
      mode,
      botCount,
      p1Profile,
      p1CharacterId,
      p2Profile,
      p2CharacterId,
      onlinePeerMeta,
      onlinePeers,
      partyMembers,
      localPlayerIndex = 1,
    } = this.config;

    this.collapsedPlatformIds.clear();
    this.earthquakeTimer = 0;
    this.earthquakeActive = false;

    this.pickups = this.map.pickupSpawns.map((sp, i) => ({
      id: sp.id,
      x: sp.x,
      y: sp.y,
      type: sp.type,
      respawnSec: sp.respawnSec,
      active: true,
      respawnTimer: 0,
      bobPhase: i * 0.9,
    }));

    this.barrels = this.map.barrelSpawns.map((b) => ({
      id: b.id,
      origX: b.x,
      origY: b.y,
      x: b.x,
      y: b.y,
      vx: 0,
      vy: 0,
      w: 26,
      h: 38,
      hp: 45,
      maxHp: 45,
      alive: true,
      launched: false,
      launcherId: null,
      fuseTimer: 0,
      respawnTimer: 0,
      hitFlashTimer: 0,
    }));

    this.destructibleWalls = this.map.destructibleWalls.map((dw) => ({
      id: dw.id,
      x: dw.x,
      y: dw.y,
      w: dw.w,
      h: dw.h,
      hp: dw.maxHp,
      maxHp: dw.maxHp,
      style: dw.style,
      alive: true,
      respawnSec: dw.respawnSec,
      respawnTimer: 0,
      hitFlashTimer: 0,
    }));

    // V3.0 Map Gadgets Initialization
    this.portals = this.map.portalPair
      ? [
          {
            ...this.map.portalPair,
            pulse: 0,
          },
        ]
      : [];

    this.jumpPads = (this.map.jumpPads || []).map((jp) => ({
      ...jp,
      compress: 0,
    }));

    this.windVents = (this.map.windVents || []).map((wv) => ({ ...wv }));

    this.glassFloors = (this.map.glassFloors || []).map((gf) => ({
      ...gf,
      cracks: 0,
      alive: true,
      respawnTimer: 0,
    }));

    this.turret = this.map.turretSpawn
      ? {
          x: this.map.turretSpawn.x,
          y: this.map.turretSpawn.y,
          terminalX: this.map.turretSpawn.terminalX,
          terminalY: this.map.turretSpawn.terminalY,
          ownerTeam: null,
          ownerId: null,
          ownerName: null,
          hackProgress: 0,
          hackingFighterId: null,
          hackingPlayerName: null,
          aimAngle: Math.PI / 2,
          fireCooldown: 0.8,
          muzzleFlashTimer: 0,
        }
      : null;

    this.subwayTrain = this.map.subwayTrack
      ? {
          active: false,
          warningTimerSec: 0,
          nextCycleTimerSec: 25,
          x: this.map.subwayTrack.minX - 800,
          y: this.map.subwayTrack.y,
          w: 760,
          h: 62,
          vx: 0,
          dir: 1,
          carCount: 4,
          hitIds: new Set<string>(),
        }
      : null;

    const usedNames = new Set<string>();
    const claimName = (raw: string): string => makeUniqueUsername(raw, usedNames);

    if (mode === 'online_client') {
      const hostMeta = onlinePeerMeta;
      const hostSpawn = this.map.playerSpawns[0];
      const localSpawn = this.map.playerSpawns[(localPlayerIndex - 1) % this.map.playerSpawns.length];
      if (hostMeta) {
        this.fighters.push(
          this.createFighter({
            id: 'p1',
            name: claimName(hostMeta.username),
            characterId: hostMeta.characterId,
            outfitId: hostMeta.outfitId,
            flameId: hostMeta.flameId,
            rank: getRankForXp(hostMeta.xp),
            isHuman: true,
            playerIndex: 1,
            team: 'alpha',
            profileId: hostMeta.profileId,
            weaponId: hostMeta.startingWeapon,
            secondaryWeaponId: hostMeta.secondaryWeapon,
            meleeWeaponId: hostMeta.meleeWeapon,
            masteryMap: hostMeta.masteryEquipped,
            gunWrap: hostMeta.gunWrap || 'none',
            x: hostSpawn.x,
            y: hostSpawn.y,
          })
        );
      }
      this.fighters.push(
        this.createFighter({
          id: `p${localPlayerIndex}`,
          name: claimName(p1Profile.username),
          characterId: p1CharacterId,
          outfitId: p1Profile.cosmetics.equippedOutfit,
          flameId: p1Profile.cosmetics.equippedFlame,
          rank: getRankForXp(p1Profile.xp),
          isHuman: true,
          playerIndex: localPlayerIndex,
          team: 'alpha',
          profileId: p1Profile.id,
          weaponId: p1Profile.cosmetics.equippedStartingWeapon,
          secondaryWeaponId: p1Profile.cosmetics.equippedSecondary,
          meleeWeaponId: p1Profile.cosmetics.equippedMelee,
          masteryMap: p1Profile.masteryEquipped,
          gunWrap: p1Profile.cosmetics.equippedWrap || 'none',
          x: localSpawn.x,
          y: localSpawn.y,
        })
      );
      const initialZoom = this.config.zoom ?? 1;
      this.cameras = [{ x: localSpawn.x, y: localSpawn.y, zoom: initialZoom, shake: 0 }];
      return;
    }

    const alphaSpawnList = [
      this.map.playerSpawns[0],
      this.map.playerSpawns[2] || this.map.playerSpawns[0],
      this.map.playerSpawns[4] || this.map.playerSpawns[0],
      this.map.playerSpawns[6] || this.map.playerSpawns[0],
    ];
    const bravoSpawnList = [
      this.map.playerSpawns[1] || this.map.playerSpawns[0],
      this.map.playerSpawns[3] || this.map.playerSpawns[1] || this.map.playerSpawns[0],
      this.map.playerSpawns[5] || this.map.playerSpawns[1] || this.map.playerSpawns[0],
      this.map.playerSpawns[7] || this.map.playerSpawns[1] || this.map.playerSpawns[0],
    ];

    const p1Spawn = alphaSpawnList[0];
    this.fighters.push(
      this.createFighter({
        id: 'p1',
        name: claimName(p1Profile.username),
        characterId: p1CharacterId,
        outfitId: p1Profile.cosmetics.equippedOutfit,
        flameId: p1Profile.cosmetics.equippedFlame,
        rank: getRankForXp(p1Profile.xp),
        isHuman: true,
        playerIndex: 1,
        team: 'alpha',
        profileId: p1Profile.id,
        weaponId: p1Profile.cosmetics.equippedStartingWeapon,
        secondaryWeaponId: p1Profile.cosmetics.equippedSecondary,
        meleeWeaponId: p1Profile.cosmetics.equippedMelee,
        masteryMap: p1Profile.masteryEquipped,
        gunWrap: p1Profile.cosmetics.equippedWrap || 'none',
        x: p1Spawn.x,
        y: p1Spawn.y,
      })
    );

    if (mode === 'versus_2p' && p2Profile) {
      const p2Team: TeamId = this.rules.gameMode === 'boss_raid' ? 'alpha' : 'bravo';
      const p2Spawn = p2Team === 'alpha' ? alphaSpawnList[1] : bravoSpawnList[0];
      this.fighters.push(
        this.createFighter({
          id: 'p2',
          name: claimName(p2Profile.username),
          characterId: p2CharacterId || p2Profile.avatarId,
          outfitId: p2Profile.cosmetics.equippedOutfit,
          flameId: p2Profile.cosmetics.equippedFlame,
          rank: getRankForXp(p2Profile.xp),
          isHuman: true,
          playerIndex: 2,
          team: p2Team,
          profileId: p2Profile.id,
          weaponId: p2Profile.cosmetics.equippedStartingWeapon,
          secondaryWeaponId: p2Profile.cosmetics.equippedSecondary,
          meleeWeaponId: p2Profile.cosmetics.equippedMelee,
          masteryMap: p2Profile.masteryEquipped,
          gunWrap: p2Profile.cosmetics.equippedWrap || 'none',
          x: p2Spawn.x,
          y: p2Spawn.y,
        })
      );
    } else if (mode === 'online_host') {
      const peersToSpawn =
        onlinePeers && onlinePeers.length > 0
          ? onlinePeers
          : onlinePeerMeta
          ? [{ slot: 2 as const, meta: onlinePeerMeta }]
          : [];
      peersToSpawn.forEach((peerItem, idx) => {
        const sp = alphaSpawnList[(idx + 1) % alphaSpawnList.length];
        this.fighters.push(
          this.createFighter({
            id: `p${peerItem.slot}`,
            name: claimName(peerItem.meta.username),
            characterId: peerItem.meta.characterId,
            outfitId: peerItem.meta.outfitId,
            flameId: peerItem.meta.flameId,
            rank: getRankForXp(peerItem.meta.xp),
            isHuman: true,
            playerIndex: peerItem.slot,
            team: 'alpha',
            profileId: peerItem.meta.profileId,
            weaponId: peerItem.meta.startingWeapon,
            secondaryWeaponId: peerItem.meta.secondaryWeapon,
            meleeWeaponId: peerItem.meta.meleeWeapon,
            masteryMap: peerItem.meta.masteryEquipped,
            gunWrap: peerItem.meta.gunWrap || 'none',
            x: sp.x,
            y: sp.y,
          })
        );
      });
    }

    // Spawn invited AI Party Squadmates on Team Alpha
    const aiPartyMembers = (partyMembers || []).filter((m) => m.isAi);
    aiPartyMembers.forEach((m, idx) => {
      const sp = alphaSpawnList[(idx + 1) % alphaSpawnList.length];
      this.fighters.push(
        this.createFighter({
          id: `party_ai_${m.slot}_${idx}`,
          name: claimName(m.username),
          characterId: m.characterId,
          outfitId: m.outfitId,
          flameId: m.flameId,
          rank: RANKS.find((r) => r.title === m.rankTitle) || RANKS[1],
          isHuman: false,
          team: 'alpha',
          weaponId: m.startingWeapon,
          secondaryWeaponId: m.secondaryWeapon,
          meleeWeaponId: m.meleeWeapon,
          gunWrap: m.gunWrap || 'none',
          x: sp.x,
          y: sp.y,
        })
      );
    });

    const isBossRaid = this.rules.gameMode === 'boss_raid';
    const usedChars = new Set(this.fighters.map((f) => f.characterId));
    const botChars = CHARACTERS.filter((c) => !c.isPremium && !usedChars.has(c.id));
    const availableBotNames = BOT_NAMES.filter((bn) => !usedNames.has(bn.toLowerCase()));
    const botWeapons: WeaponId[] = ['ak', 'm4a1', 'sawshot', 'mp7', 'spas12'];
    const botSecondaries: SecondaryWeaponId[] = ['pistol', 'uzi', 'shorty', 'revolver', 'ghost_pistol'];
    const botMelees: MeleeWeaponId[] = ['knife', 'karambit', 'katana', 'boxing_glove'];

    if (isBossRaid) {
      // Ensure Alpha has up to 4 fighters (add friendly bots if solo/duo)
      const neededAllies = Math.max(0, 4 - this.fighters.filter((f) => f.team === 'alpha').length);
      for (let i = 0; i < neededAllies; i++) {
        const sp = alphaSpawnList[(this.fighters.length + i) % alphaSpawnList.length];
        const charDef = botChars[i % botChars.length] || CHARACTERS[i % CHARACTERS.length];
        const botRank = RANKS[Math.min(RANKS.length - 1, Math.floor(Math.random() * 3) + 1)];
        this.fighters.push(
          this.createFighter({
            id: `ally_bot_${i + 1}`,
            name: claimName(availableBotNames[i] || `Ally_${i + 1}`),
            characterId: charDef.id,
            outfitId: 'navy',
            flameId: 'cobalt',
            rank: botRank,
            isHuman: false,
            team: 'alpha',
            weaponId: botWeapons[i % botWeapons.length],
            secondaryWeaponId: botSecondaries[i % botSecondaries.length],
            meleeWeaponId: botMelees[i % botMelees.length],
            gunWrap: 'none',
            x: sp.x,
            y: sp.y,
          })
        );
      }

      // Spawn the 1,500 HP Mega Baron Voltage Raid Boss on Team Bravo!
      const bossSpawn = this.map.podiumZone
        ? { x: this.map.podiumZone.x + this.map.podiumZone.w / 2, y: this.map.podiumZone.y + 40 }
        : bravoSpawnList[0];
      const bossFighter = this.createFighter({
        id: 'boss_mega_baron',
        name: 'MEGA BARON VOLTAGE',
        characterId: 'baron_voltage',
        outfitId: 'sovereign',
        flameId: 'violet',
        rank: RANKS[RANKS.length - 1],
        isHuman: false,
        team: 'bravo',
        weaponId: 'minigun',
        secondaryWeaponId: 'revolver',
        meleeWeaponId: 'katana',
        gunWrap: 'royal_gold',
        x: bossSpawn.x,
        y: bossSpawn.y,
      });
      bossFighter.isBoss = true;
      bossFighter.maxHp = 1500;
      bossFighter.hp = 1500;
      bossFighter.w = 46;
      bossFighter.h = 78;
      bossFighter.bossEmpTimer = 7.5;
      this.fighters.push(bossFighter);
    } else {
      // Balance arena bots: ensure Team Bravo always has rivals in team modes!
      const alphaCount = this.fighters.filter((f) => f.team === 'alpha').length;
      const bravoCount = this.fighters.filter((f) => f.team === 'bravo').length;
      const effectiveBotCount =
        this.isTeamMode() && bravoCount === 0 ? Math.max(botCount, alphaCount) : botCount;

      for (let i = 0; i < effectiveBotCount; i++) {
        const curAlpha = this.fighters.filter((f) => f.team === 'alpha').length;
        const curBravo = this.fighters.filter((f) => f.team === 'bravo').length;
        const team: TeamId =
          this.isTeamMode() && curBravo <= curAlpha ? 'bravo' : curAlpha < curBravo ? 'alpha' : 'bravo';
        const spawnPool = team === 'alpha' ? alphaSpawnList : bravoSpawnList;
        const sp = spawnPool[i % spawnPool.length];
        const charDef = botChars[i % botChars.length] || CHARACTERS[i % CHARACTERS.length];
        const botRank = RANKS[Math.min(RANKS.length - 1, Math.floor(Math.random() * 3) + 1)];
        const botWeapon = botWeapons[i % botWeapons.length];
        const candidateName = availableBotNames[i] || `Bot_Agent_${i + 1}`;
        this.fighters.push(
          this.createFighter({
            id: `bot_${i + 1}`,
            name: claimName(candidateName),
            characterId: charDef.id,
            outfitId: 'charcoal',
            flameId: team === 'alpha' ? 'cobalt' : 'crimson',
            rank: botRank,
            isHuman: false,
            team,
            weaponId: botWeapon,
            secondaryWeaponId: botSecondaries[i % botSecondaries.length],
            meleeWeaponId: botMelees[i % botMelees.length],
            gunWrap: 'none',
            x: sp.x,
            y: sp.y,
          })
        );
      }
    }

    // Apply Special Mode Starting Overrides (VIP / Gun Game / One-in-the-Chamber)
    if (this.rules.gameMode === 'vip') {
      const alphaVip = this.fighters.find((f) => (f.team || 'alpha') === 'alpha');
      const bravoVip = this.fighters.find((f) => f.team === 'bravo');
      for (const vip of [alphaVip, bravoVip]) {
        if (vip) {
          vip.isVip = true;
          vip.maxHp = 300;
          vip.hp = 300;
        }
      }
    } else if (this.rules.gameMode === 'gun_game') {
      const tier0 = GUN_GAME_LADDER[0];
      for (const f of this.fighters) {
        f.gunGameTier = 0;
        f.primaryWeaponId = tier0;
        f.weaponId = tier0;
        f.activeSlot = 'primary';
        f.primaryAmmo = this.getEffectiveClipSize(f, tier0);
        f.ammo = f.primaryAmmo;
      }
    } else if (this.rules.gameMode === 'one_in_chamber') {
      for (const f of this.fighters) {
        f.maxHp = 1;
        f.hp = 1;
        f.activeSlot = 'secondary';
        f.secondaryWeaponId = 'pistol';
        f.weaponId = 'pistol';
        f.secondaryAmmo = 1;
        f.ammo = 1;
        f.grenades = 0;
      }
    }

    const initialZoom = this.config.zoom ?? 1;
    this.cameras = [
      { x: this.fighters[0].x, y: this.fighters[0].y, zoom: initialZoom, shake: 0 },
    ];
    if (mode === 'versus_2p' && this.fighters[1]) {
      this.cameras.push({
        x: this.fighters[1].x,
        y: this.fighters[1].y,
        zoom: initialZoom,
        shake: 0,
      });
    }

    // Spawn quips
    for (const f of this.fighters) {
      this.triggerSpeechQuip(f, 'spawn');
    }
  }

  private createFighter(params: {
    id: string;
    name: string;
    characterId: CharacterId;
    outfitId: FighterEntity['outfitId'];
    flameId: FighterEntity['flameId'];
    rank: FighterEntity['rank'];
    isHuman: boolean;
    playerIndex?: PlayerSlotIndex;
    team?: TeamId;
    profileId?: string;
    weaponId: WeaponId;
    secondaryWeaponId?: SecondaryWeaponId;
    meleeWeaponId?: MeleeWeaponId;
    masteryMap?: Partial<Record<WeaponId, WeaponMasteryTier>>;
    gunWrap?: GunWrapId;
    x: number;
    y: number;
  }): FighterEntity {
    const maxHp =
      params.characterId === 'baba_wifi' || params.characterId === 'bhaijaan_gymbro'
        ? 125
        : params.characterId === 'dj_dholak' || params.characterId === 'thongi_baba'
        ? 115
        : 100;
    const maxFuel = params.characterId === 'captain_jalebi' ? 115 : 100;
    const primaryWeaponId = params.weaponId;
    const secondaryWeaponId = normalizeSecondaryId(params.secondaryWeaponId || 'pistol');
    const meleeWeaponId = normalizeMeleeId(params.meleeWeaponId || 'knife');
    const primaryAmmo = WEAPONS[primaryWeaponId].clipSize;
    const secondaryAmmo = WEAPONS[secondaryWeaponId].clipSize;
    const isSniper = WEAPONS[primaryWeaponId].category === 'Sniper';

    return {
      id: params.id,
      name: params.name,
      characterId: params.characterId,
      outfitId: params.outfitId,
      flameId: params.flameId,
      rank: params.rank,
      isHuman: params.isHuman,
      playerIndex: params.playerIndex,
      team: params.team || 'alpha',
      profileId: params.profileId,
      carryingFlagTeam: null,
      x: params.x,
      y: params.y,
      vx: 0,
      vy: 0,
      w: 28,
      h: 48,
      facing: params.x > this.map.width / 2 ? -1 : 1,
      aimAngle: params.x > this.map.width / 2 ? Math.PI : 0,
      grounded: false,
      coyoteTimer: 0,
      wallSlideDir: 0,
      onLadder: false,
      dropThroughTimer: 0,
      jetpacking: false,
      inWater: false,
      hp: maxHp,
      maxHp,
      fuel: maxFuel,
      maxFuel,
      weaponId: primaryWeaponId,
      activeSlot: 'primary',
      primaryWeaponId,
      primaryAmmo,
      secondaryWeaponId,
      secondaryAmmo,
      meleeWeaponId,
      weaponMastery: this.getMasteryForWeapon(params.masteryMap, primaryWeaponId),
      gunWrap: params.gunWrap || 'none',
      masteryMap: params.masteryMap,
      ammo: primaryAmmo,
      isReloading: false,
      reloadTimerMs: 0,
      fireCooldownMs: 0,
      minigunSpinTimer: 0,
      burstRemaining: 0,
      burstTimerMs: 0,
      recoilKick: 0,
      muzzleFlashTimer: 0,
      hitFlashTimer: 0,
      walkCycle: 0,
      alive: true,
      respawnTimer: 0,
      spawnInvulnTimer: 1.5,
      lastHitById: null,
      lastHitWeapon: null,
      lastHitAt: 0,
      meleeCooldownTimer: 0,
      meleeSwingTimer: 0,
      grenades: 2,
      grenadeType: 'frag',
      grenadeRegenTimer: 15,
      dualWield: null,
      dualWieldAmmo: 0,
      ultCharge: 0,
      ultActiveTimer: 0,
      killstreak: 0,
      uavTimer: 0,
      rapidJetTimer: 0,
      speedBuffTimer: 0,
      fuelBuffTimer: 0,
      shieldHp: 0,
      shieldBuffTimer: 0,
      kothPoints: 0,
      inPodium: false,
      speechText: '',
      speechTimer: 0,
      stunTimer: 0,
      danceTimer: 0,
      freezeTimer: 0,
      empDisableTimer: 0,
      empDotTimer: 0,
      empTickAccum: 0,
      empOwnerId: null,
      slamPending: false,
      gossipCooldown: 0,
      grappleActive: false,
      grappleX: 0,
      grappleY: 0,
      grappleLen: 0,
      dashTimer: 0,
      dashCooldown: 0,
      dashDir: 0,
      lastTapLeftAt: -10,
      lastTapRightAt: -10,
      shrinkTimer: 0,
      megaSizeTimer: 0,
      bubbleShieldHp: 0,
      bubbleShieldTimer: 0,
      isLastStand: false,
      lastStandTimer: 0,
      isVip: false,
      isBoss: false,
      bossEmpTimer: 7.5,
      gunGameTier: 0,
      portalCooldown: 0,
      emoteIndex: 0,
      sprayIndex: 0,
      consecutiveDeathsFrom: {},
      nemesisKillerIds: [],
      afterlifeKillsCount: 0,
      nemesisKillsCount: 0,
      nemesisRevengeCoinsEarned: 0,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      weaponKills: createEmptyWeaponKills(),
      rapidKillCount: 0,
      lastKillAt: -10,
      headshotsCount: 0,
      midairKillsCount: 0,
      meleeKillsCount: 0,
      grenadeKillsCount: 0,
      coverDestroyedCount: 0,
      killstreaksEarnedCount: 0,
      usedNonSniper: !isSniper,
      aiState: 'patrol',
      aiDecisionTimer: 0.2,
      aiTargetId: null,
      aiGoalX: params.x,
      aiGoalY: params.y,
      aiStrafeDir: 1,
      aiFireHoldTimer: 0,
    };
  }

  private triggerSpeechQuip(f: FighterEntity, kind: 'spawn' | 'ult' | 'kill'): void {
    const charDef = CHARACTERS.find((c) => c.id === f.characterId);
    if (!charDef) return;
    const pool =
      kind === 'spawn'
        ? charDef.spawnQuips
        : kind === 'ult'
        ? charDef.ultQuips
        : charDef.killQuips;
    if (!pool.length) return;
    f.speechText = pool[Math.floor(Math.random() * pool.length)];
    f.speechTimer = 2.1;
  }

  private bindNetworkCallbacks(): void {
    const peer = this.config.peerSession;
    if (!peer) return;

    if (this.config.mode === 'online_host') {
      peer.updateCallbacks({
        onRemoteInput: (input, senderSlot) => {
          const existing = this.remoteInputs.get(senderSlot) || {
            packet: input,
            upJustLatch: false,
            meleeLatch: false,
            grenadeLatch: false,
            cycleGrenadeLatch: false,
            grappleLatch: false,
            dashDirLatch: 0 as -1 | 0 | 1,
            emoteLatch: false,
            sprayLatch: false,
          };
          if (input.upJust) existing.upJustLatch = true;
          if (input.meleeJust) existing.meleeLatch = true;
          if (input.grenadeJust) existing.grenadeLatch = true;
          if (input.cycleGrenadeJust) existing.cycleGrenadeLatch = true;
          if (input.grappleJust) existing.grappleLatch = true;
          if (input.dashDir) existing.dashDirLatch = input.dashDir;
          if (input.emoteJust) existing.emoteLatch = true;
          if (input.sprayJust) existing.sprayLatch = true;
          if (input.switchSlot) existing.switchSlotLatch = input.switchSlot;
          existing.packet = input;
          this.remoteInputs.set(senderSlot, existing);
        },
        onStatusChange: (status) => {
          if (status === 'error' && !this.ended) {
            this.finishMatch();
          }
        },
      });
    } else if (this.config.mode === 'online_client') {
      peer.updateCallbacks({
        onWorldSync: (snap) => {
          this.applyWorldSnapshot(snap);
        },
        onMatchEnd: (summary) => {
          if (!this.ended) {
            this.ended = true;
            this.config.onMatchEnd(summary);
          }
        },
      });
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT')
    ) {
      return;
    }

    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)
    ) {
      e.preventDefault();
    }
    if (!this.heldKeys.has(e.code)) {
      this.justPressed.add(e.code);
    }
    this.heldKeys.add(e.code);
    soundEngine.unlock();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreen.x = e.clientX - rect.left;
    this.mouseScreen.y = e.clientY - rect.top;
    this.mouseScreen.movedRecently = true;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseScreen.down = true;
      soundEngine.unlock();
    } else if (e.button === 2) {
      e.preventDefault();
      this.mouseScreen.rightDown = true;
      this.justPressed.add('MouseRight');
      soundEngine.unlock();
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseScreen.down = false;
    } else if (e.button === 2) {
      this.mouseScreen.rightDown = false;
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleBlur = () => {
    this.heldKeys.clear();
    this.mouseScreen.down = false;
    this.mouseScreen.rightDown = false;
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  public start(): void {
    this.lastTimeMs = performance.now();
    this.pushHudSnapshot();
    this.loop(this.lastTimeMs);
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      this.lastTimeMs = performance.now();
    }
  }

  public setZoom(zoom: ZoomLevel): void {
    this.config.zoom = zoom;
    for (const cam of this.cameras) {
      cam.zoom = zoom;
    }
  }

  public getReplayData(): MatchReplayData {
    return {
      mode: this.config.mode,
      mapId: this.map.id,
      durationSec: this.elapsedSec,
      fightersMeta: this.fighters.map((f) => ({
        id: f.id,
        name: f.name,
        characterId: f.characterId,
        outfitId: f.outfitId,
        flameId: f.flameId,
        rankId: f.rank.id,
        isHuman: f.isHuman,
        playerIndex: f.playerIndex,
        team: f.team,
        weaponMastery: f.weaponMastery,
        gunWrap: f.gunWrap,
      })),
      frames: this.replayFrames,
      killEvents: this.replayKillEvents,
      winningKillerId: this.lastKillerId || undefined,
      winningVictimId: this.lastVictimId || undefined,
    };
  }

  private loop = (nowMs: number): void => {
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = Math.min(0.05, Math.max(0.001, (nowMs - this.lastTimeMs) / 1000));
    this.lastTimeMs = nowMs;

    this.fpsCounterFrames += 1;
    this.fpsCounterTime += rawDt;
    if (this.fpsCounterTime >= 0.45) {
      this.currentFps = Math.max(1, Math.round(this.fpsCounterFrames / this.fpsCounterTime));
      this.fpsCounterFrames = 0;
      this.fpsCounterTime = 0;
    }

    this.resizeCanvasToDisplay();

    if (!this.paused && !this.ended) {
      if (this.config.mode === 'online_client') {
        this.stepOnlineClient(rawDt);
      } else {
        if (this.hitstopTimer > 0) {
          this.hitstopTimer -= rawDt;
        } else {
          this.update(rawDt);
        }
      }
    }

    this.render();
    this.justPressed.clear();
    this.touchButtonsJust.clear();
  };

  private resizeCanvasToDisplay(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w > 0 && h > 0 && (this.canvas.width !== w || this.canvas.height !== h)) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private stepOnlineClient(dt: number): void {
    const localIdx = this.config.localPlayerIndex || 2;
    const clientFighter =
      this.fighters.find((f) => f.playerIndex === localIdx) ||
      this.fighters.find((f) => f.playerIndex === 2) ||
      this.fighters[1];
    const cam = this.cameras[0];
    if (clientFighter && cam) {
      const aimAngle = this.computeAimAngle(clientFighter, cam, 0, this.canvas.width);
      let switchSlot: WeaponSlot | undefined;
      if (this.justPressed.has('Digit1')) switchSlot = 'primary';
      else if (this.justPressed.has('Digit2')) switchSlot = 'secondary';
      else if (this.justPressed.has('Digit3')) switchSlot = 'melee';
      else if (this.touchButtonsJust.has('cycle_slot')) {
        const order: WeaponSlot[] = ['primary', 'secondary', 'melee'];
        switchSlot = order[(order.indexOf(clientFighter.activeSlot) + 1) % order.length];
      }
      let dashDir: -1 | 0 | 1 = 0;
      if (this.justPressed.has('KeyA')) {
        if (this.elapsedSec - clientFighter.lastTapLeftAt <= 0.26) dashDir = -1;
        clientFighter.lastTapLeftAt = this.elapsedSec;
      } else if (this.justPressed.has('KeyD')) {
        if (this.elapsedSec - clientFighter.lastTapRightAt <= 0.26) dashDir = 1;
        clientFighter.lastTapRightAt = this.elapsedSec;
      } else if (this.touchButtonsJust.has('dash_left')) dashDir = -1;
      else if (this.touchButtonsJust.has('dash_right')) dashDir = 1;

      const grapple =
        this.mouseScreen.rightDown || this.heldKeys.has('KeyC') || this.touchButtonsJust.has('grapple');
      const grappleJust =
        this.justPressed.has('MouseRight') ||
        this.justPressed.has('KeyC') ||
        this.touchButtonsJust.has('grapple');

      const packet: RemoteInputPacket = {
        left: this.heldKeys.has('KeyA') || this.touchState.moveX < -0.25,
        right: this.heldKeys.has('KeyD') || this.touchState.moveX > 0.25,
        up: this.heldKeys.has('KeyW') || this.heldKeys.has('Space') || this.touchState.jetpack,
        upJust:
          this.justPressed.has('KeyW') ||
          this.justPressed.has('Space') ||
          this.touchButtonsJust.has('jump'),
        down: this.heldKeys.has('KeyS') || this.touchState.moveY > 0.45,
        shoot: this.mouseScreen.down || this.heldKeys.has('KeyF') || this.touchState.firing,
        reload: this.justPressed.has('KeyR') || this.touchButtonsJust.has('reload'),
        ultimate:
          this.justPressed.has('KeyE') ||
          this.justPressed.has('ShiftLeft') ||
          this.touchButtonsJust.has('ultimate'),
        meleeJust:
          this.justPressed.has('KeyV') ||
          this.justPressed.has('KeyQ') ||
          this.touchButtonsJust.has('melee'),
        grenadeJust: this.justPressed.has('KeyG') || this.touchButtonsJust.has('grenade'),
        cycleGrenadeJust:
          this.justPressed.has('Tab') || this.touchButtonsJust.has('cycle_grenade'),
        switchSlot,
        aimAngle,
        grapple,
        grappleJust,
        dashDir,
        emoteJust: this.justPressed.has('KeyT') || this.touchButtonsJust.has('emote'),
        sprayJust: this.justPressed.has('KeyY') || this.touchButtonsJust.has('spray'),
      };
      this.config.peerSession?.send({ type: 'input', payload: packet });
      cam.x += (clientFighter.x - cam.x) * Math.min(1, dt * 8);
      cam.y += (clientFighter.y - cam.y) * Math.min(1, dt * 8);
      cam.shake = Math.max(0, cam.shake - dt * 28);
    }

    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateAfterimages(dt);
    this.updateEmotesAndSprays(dt);
    for (const s of this.smokeClouds) {
      s.life -= dt;
    }
    this.smokeClouds = this.smokeClouds.filter((s) => s.life > 0);
    for (const bm of this.geometryBeams) {
      bm.life -= dt;
    }
    this.geometryBeams = this.geometryBeams.filter((bm) => bm.life > 0);
    if (this.activeKillIcons.length > 0) {
      this.activeKillIcons = this.activeKillIcons
        .map((k) => ({ ...k, remainingSec: k.remainingSec - dt }))
        .filter((k) => k.remainingSec > 0);
    }
    this.hudSyncAccumulator += dt;
    if (this.hudSyncAccumulator >= 0.08) {
      this.hudSyncAccumulator = 0;
      this.pushHudSnapshot();
    }
  }

  private update(dt: number): void {
    this.elapsedSec += dt;
    this.timeRemainingSec = Math.max(0, this.timeRemainingSec - dt);

    if (this.timeRemainingSec <= 0) {
      this.finishMatch();
      return;
    }

    if (this.activeAnnouncer) {
      this.activeAnnouncer.remainingSec -= dt;
      if (this.activeAnnouncer.remainingSec <= 0) {
        this.activeAnnouncer = null;
      }
    }

    if (this.activeKillIcons.length > 0) {
      this.activeKillIcons = this.activeKillIcons
        .map((k) => ({ ...k, remainingSec: k.remainingSec - dt }))
        .filter((k) => k.remainingSec > 0);
    }

    // V3.0 Mid-Match Chaos Event (halfway through match)
    if (this.chaosState.phase === 'idle') {
      const triggerAt = Math.max(20, (this.rules.durationSec || 180) * 0.5);
      if (this.elapsedSec >= triggerAt) {
        this.chaosState = {
          phase: 'warning',
          eventType: null,
          title: 'WARNING: CHAOS EVENT!',
          subtitle: 'Reality anomaly incoming...',
          remainingSec: 0,
          warningTimerSec: 3.0,
        };
        soundEngine.playChaosWarning();
        this.pendingNetEvents.push({ kind: 'chaos_warning' });
      }
    } else if (this.chaosState.phase === 'warning') {
      this.chaosState.warningTimerSec = Math.max(0, this.chaosState.warningTimerSec - dt);
      if (this.chaosState.warningTimerSec <= 0) {
        const pool: ChaosEventType[] = [
          'zero_gravity',
          'golden_airdrop',
          'blackout',
          'hyper_frenzy',
        ];
        const picked = pool[Math.floor(Math.random() * pool.length)];
        const meta: Record<ChaosEventType, { title: string; sub: string }> = {
          zero_gravity: {
            title: 'ZERO-GRAVITY MOONWALK!',
            sub: '70% lower gravity for 25s',
          },
          golden_airdrop: {
            title: 'GOLDEN AIRDROP CRATE!',
            sub: 'Mythic Orbital Laser dropping center-map!',
          },
          blackout: {
            title: 'CITY BLACKOUT!',
            sub: 'Arena darkened — fight by tracer & visor light!',
          },
          hyper_frenzy: {
            title: 'HYPER-SPEED FRENZY!',
            sub: '1.5x move, fire rate & reload speed for 25s!',
          },
        };
        this.chaosState = {
          phase: 'active',
          eventType: picked,
          title: meta[picked].title,
          subtitle: meta[picked].sub,
          remainingSec: 25.0,
          warningTimerSec: 0,
        };
        if (picked === 'golden_airdrop') {
          this.goldenAirdrop = {
            active: true,
            landed: false,
            x: this.map.width / 2,
            y: 70,
            vy: 85,
            life: 25,
          };
        }
        soundEngine.playChaosWarning();
      }
    } else if (this.chaosState.phase === 'active') {
      this.chaosState.remainingSec = Math.max(0, this.chaosState.remainingSec - dt);
      if (this.chaosState.remainingSec <= 0) {
        this.chaosState = {
          phase: 'done',
          eventType: null,
          title: '',
          subtitle: '',
          remainingSec: 0,
          warningTimerSec: 0,
        };
      }
    }

    soundEngine.setMusicIntense(
      this.chaosState.phase === 'active' || this.timeRemainingSec <= 30
    );

    const { mode } = this.config;

    for (const f of this.fighters) {
      if (!f.alive) {
        f.respawnTimer -= dt;
        if (f.respawnTimer <= 0) {
          this.respawnFighter(f);
        }
        continue;
      }

      if (f.spawnInvulnTimer > 0) f.spawnInvulnTimer = Math.max(0, f.spawnInvulnTimer - dt);
      if (f.hitFlashTimer > 0) f.hitFlashTimer = Math.max(0, f.hitFlashTimer - dt);
      if (f.muzzleFlashTimer > 0) f.muzzleFlashTimer = Math.max(0, f.muzzleFlashTimer - dt);
      if (f.dropThroughTimer > 0) f.dropThroughTimer = Math.max(0, f.dropThroughTimer - dt);
      if (f.ultActiveTimer > 0) f.ultActiveTimer = Math.max(0, f.ultActiveTimer - dt);
      if (f.speedBuffTimer > 0) f.speedBuffTimer = Math.max(0, f.speedBuffTimer - dt);
      if (f.fuelBuffTimer > 0) f.fuelBuffTimer = Math.max(0, f.fuelBuffTimer - dt);
      if (f.uavTimer > 0) f.uavTimer = Math.max(0, f.uavTimer - dt);
      if (f.rapidJetTimer > 0) f.rapidJetTimer = Math.max(0, f.rapidJetTimer - dt);
      if (f.meleeCooldownTimer > 0) f.meleeCooldownTimer = Math.max(0, f.meleeCooldownTimer - dt);
      if (f.meleeSwingTimer > 0) f.meleeSwingTimer = Math.max(0, f.meleeSwingTimer - dt);
      if (f.speechTimer > 0) f.speechTimer = Math.max(0, f.speechTimer - dt);
      if (f.stunTimer > 0) f.stunTimer = Math.max(0, f.stunTimer - dt);
      if (f.danceTimer > 0) f.danceTimer = Math.max(0, f.danceTimer - dt);
      if (f.freezeTimer > 0) f.freezeTimer = Math.max(0, f.freezeTimer - dt);
      if (f.empDisableTimer > 0) f.empDisableTimer = Math.max(0, f.empDisableTimer - dt);
      if (f.portalCooldown > 0) f.portalCooldown = Math.max(0, f.portalCooldown - dt);
      if (f.dashCooldown > 0) f.dashCooldown = Math.max(0, f.dashCooldown - dt);
      if (f.shrinkTimer > 0) f.shrinkTimer = Math.max(0, f.shrinkTimer - dt);
      if (f.megaSizeTimer > 0) f.megaSizeTimer = Math.max(0, f.megaSizeTimer - dt);
      if (f.bubbleShieldTimer > 0) {
        f.bubbleShieldTimer = Math.max(0, f.bubbleShieldTimer - dt);
        if (f.bubbleShieldTimer <= 0) f.bubbleShieldHp = 0;
      }
      if (f.dashTimer > 0) {
        f.dashTimer = Math.max(0, f.dashTimer - dt);
        const charColor =
          CHARACTERS.find((c) => c.id === f.characterId)?.tieColor || '#38BDF8';
        this.afterimages.push({
          x: f.x,
          y: f.y,
          facing: f.facing,
          color: charColor,
          alpha: 0.72,
        });
      }
      if (f.isLastStand) {
        f.lastStandTimer -= dt;
        if (f.lastStandTimer <= 0) {
          this.handleFighterDeath(f, f.lastHitById || f.id, f.lastHitWeapon || 'pistol', false);
          continue;
        }
      }
      if (f.empDotTimer > 0) {
        f.empDotTimer = Math.max(0, f.empDotTimer - dt);
        f.empTickAccum += dt;
        if (f.empTickAccum >= 0.5) {
          f.empTickAccum -= 0.5;
          this.spawnBurst(f.x, f.y - 4, '#22D3EE', 5, 130);
          this.applyDamage(f, 8, f.empOwnerId || f.id, 'ultimate', false);
          if (!f.alive) continue;
        }
      }

      if (f.characterId === 'aunty_cctv' && f.ultActiveTimer > 0) {
        f.gossipCooldown -= dt;
        if (f.gossipCooldown <= 0) {
          f.gossipCooldown = 0.42;
          const enemy = this.findNearestEnemy(f);
          if (enemy && Math.hypot(enemy.x - f.x, enemy.y - f.y) <= 640) {
            const ang = Math.atan2(enemy.y - (f.y - 10), enemy.x - f.x);
            const dist = Math.hypot(enemy.x - f.x, enemy.y - (f.y - 10));
            this.geometryBeams.push({
              id: this.nextBeamId++,
              ownerId: f.id,
              x: f.x,
              y: f.y - 10,
              angle: ang,
              length: dist,
              life: 0.18,
              maxLife: 0.18,
              color: '#F472B6',
              isGossip: true,
            });
            soundEngine.playLaserZap();
            this.applyDamage(enemy, 18, f.id, 'ultimate', false);
          }
        }
      }

      if (f.grenades < 2 && this.rules.gameMode !== 'one_in_chamber') {
        f.grenadeRegenTimer -= dt;
        if (f.grenadeRegenTimer <= 0) {
          f.grenades += 1;
          f.grenadeRegenTimer = 15;
        }
      }

      if (f.shieldBuffTimer > 0) {
        f.shieldBuffTimer = Math.max(0, f.shieldBuffTimer - dt);
        if (f.shieldBuffTimer <= 0) {
          f.shieldHp = 0;
        }
      }
      f.recoilKick = Math.max(0, f.recoilKick - dt * 42);

      let input: {
        left: boolean;
        right: boolean;
        up: boolean;
        upJust: boolean;
        down: boolean;
        shoot: boolean;
        reload: boolean;
        ultimate: boolean;
        meleeJust: boolean;
        grenadeJust: boolean;
        cycleGrenadeJust: boolean;
        switchSlot?: WeaponSlot;
        aimAngle: number;
        grapple: boolean;
        grappleJust: boolean;
        dashDir: -1 | 0 | 1;
        emoteJust: boolean;
        sprayJust: boolean;
      };

      if (f.isHuman) {
        if (f.playerIndex === 1) {
          input = this.getP1Input(f, mode);
        } else if (mode === 'online_host' && f.playerIndex) {
          const remote = this.remoteInputs.get(f.playerIndex);
          if (remote) {
            input = {
              ...remote.packet,
              upJust: remote.packet.upJust || remote.upJustLatch,
              meleeJust: remote.packet.meleeJust || remote.meleeLatch,
              grenadeJust: remote.packet.grenadeJust || remote.grenadeLatch,
              cycleGrenadeJust: remote.packet.cycleGrenadeJust || remote.cycleGrenadeLatch,
              switchSlot: remote.packet.switchSlot || remote.switchSlotLatch,
              grapple: Boolean(remote.packet.grapple),
              grappleJust: Boolean(remote.packet.grappleJust || remote.grappleLatch),
              dashDir: (remote.packet.dashDir || remote.dashDirLatch || 0) as -1 | 0 | 1,
              emoteJust: Boolean(remote.packet.emoteJust || remote.emoteLatch),
              sprayJust: Boolean(remote.packet.sprayJust || remote.sprayLatch),
            };
            remote.upJustLatch = false;
            remote.meleeLatch = false;
            remote.grenadeLatch = false;
            remote.cycleGrenadeLatch = false;
            remote.grappleLatch = false;
            remote.dashDirLatch = 0;
            remote.emoteLatch = false;
            remote.sprayLatch = false;
            remote.switchSlotLatch = undefined;
          } else {
            input = {
              left: false,
              right: false,
              up: false,
              upJust: false,
              down: false,
              shoot: false,
              reload: false,
              ultimate: false,
              meleeJust: false,
              grenadeJust: false,
              cycleGrenadeJust: false,
              aimAngle: f.aimAngle,
              grapple: false,
              grappleJust: false,
              dashDir: 0,
              emoteJust: false,
              sprayJust: false,
            };
          }
        } else {
          input = this.getP2LocalInput(f);
        }
      } else {
        input = this.getBotInput(f, dt);
      }

      if (f.stunTimer > 0) {
        input.left = false;
        input.right = false;
        input.up = false;
        input.upJust = false;
        input.down = false;
        input.shoot = false;
        input.reload = false;
        input.ultimate = false;
        input.meleeJust = false;
        input.grenadeJust = false;
        input.switchSlot = undefined;
        input.grapple = false;
        input.grappleJust = false;
        input.dashDir = 0;
      } else if (f.danceTimer > 0) {
        const beat = Math.sin(this.elapsedSec * 18);
        input.left = beat < -0.15;
        input.right = beat > 0.15;
        input.up = false;
        input.upJust = f.grounded && Math.sin(this.elapsedSec * 9) > 0.88;
        input.down = false;
        input.shoot = false;
        input.reload = false;
        input.ultimate = false;
        input.meleeJust = false;
        input.grenadeJust = false;
        input.switchSlot = undefined;
        input.aimAngle = beat * 0.9;
        input.grapple = false;
        input.grappleJust = false;
        input.dashDir = 0;
      }

      f.aimAngle = input.aimAngle;
      f.facing = Math.cos(f.aimAngle) >= 0 ? 1 : -1;

      if (input.emoteJust) {
        const emoteDef = EMOTE_DEFS[f.emoteIndex % EMOTE_DEFS.length];
        f.emoteIndex = (f.emoteIndex + 1) % EMOTE_DEFS.length;
        this.emotePopups.push({
          id: this.nextEmoteId++,
          fighterId: f.id,
          x: f.x,
          y: f.y - 46,
          emoteId: emoteDef.id,
          life: 2.0,
          maxLife: 2.0,
        });
        soundEngine.playEmote();
        this.pendingNetEvents.push({ kind: 'emote', x: f.x, y: f.y });
      }

      if (input.sprayJust) {
        const sprayDef = SPRAY_DEFS[f.sprayIndex % SPRAY_DEFS.length];
        f.sprayIndex = (f.sprayIndex + 1) % SPRAY_DEFS.length;
        this.wallSprays.push({
          id: this.nextSprayId++,
          x: f.x,
          y: f.y,
          sprayId: sprayDef.id,
          ownerName: f.name,
          life: 25,
          maxLife: 25,
        });
        if (this.wallSprays.length > 16) this.wallSprays.shift();
        soundEngine.playSpray();
        this.pendingNetEvents.push({ kind: 'spray', x: f.x, y: f.y });
      }

      if (input.dashDir !== 0 && f.dashCooldown <= 0 && !f.isLastStand && f.empDisableTimer <= 0) {
        f.dashDir = input.dashDir;
        f.dashTimer = 0.24;
        f.dashCooldown = 1.4;
        f.vx = input.dashDir * 820;
        f.vy = Math.min(f.vy, -40);
        soundEngine.playDash();
        this.spawnBurst(f.x, f.y, '#38BDF8', 8, 170);
        this.pendingNetEvents.push({ kind: 'dash', x: f.x, y: f.y });
      }

      if (input.grappleJust && !f.isLastStand) {
        const anchor = this.raycastGrappleAnchor(f);
        if (anchor) {
          f.grappleActive = true;
          f.grappleX = anchor.x;
          f.grappleY = anchor.y;
          f.grappleLen = Math.hypot(anchor.x - f.x, anchor.y - f.y);
          soundEngine.playGrappleFire();
          this.pendingNetEvents.push({ kind: 'grapple', x: anchor.x, y: anchor.y });
        }
      } else if (!input.grapple) {
        f.grappleActive = false;
      }

      if (input.switchSlot) {
        this.switchFighterSlot(f, input.switchSlot);
      }

      if (input.cycleGrenadeJust && !f.isLastStand) {
        const order: GrenadeType[] = ['frag', 'smoke', 'plasma'];
        f.grenadeType = order[(order.indexOf(f.grenadeType) + 1) % order.length];
      }

      if (input.grenadeJust && f.grenades > 0 && !f.isLastStand) {
        this.throwGrenade(f);
      }

      if (input.meleeJust && f.meleeCooldownTimer <= 0 && !f.isLastStand) {
        this.performMeleeStrike(f);
      }

      if (input.ultimate && f.ultCharge >= 100 && !f.isLastStand) {
        this.activateUltimate(f);
      }

      this.updateFighterPhysics(f, input, dt);
      this.updateFighterWeapon(f, input, dt);
    }

    this.updateActiveModeRules(dt);
    if (this.ended) return;

    for (const p of this.portals) {
      p.pulse += dt * 4;
    }
    for (const jp of this.jumpPads) {
      jp.compress = Math.max(0, jp.compress - dt * 4.5);
    }

    this.updateSubwayTrain(dt);
    this.updateEarthquakeCollapse(dt);
    this.updateSecurityTurret(dt);
    this.updateGlassFloors(dt);
    this.updateGoldenAirdrop(dt);
    this.updateHolograms(dt);
    this.updateAfterimages(dt);
    this.updateEmotesAndSprays(dt);
    this.updateProjectiles(dt);
    this.updateCookerBombs(dt);
    this.updateGeometryBeams(dt);
    this.updateGrenades(dt);
    this.updateSmokeClouds(dt);
    this.updateAirstrikes(dt);
    this.updateTempWalls(dt);
    this.updateDestructibleWalls(dt);
    this.updateBarrels(dt);
    this.updatePickups(dt);
    this.updatePowerUpDrops(dt);
    this.updateDualWieldDrops(dt);
    this.updateWeaponDrops(dt);
    this.weaponDropSpawnTimer -= dt;
    if (this.weaponDropSpawnTimer <= 0) {
      this.weaponDropSpawnTimer = 14;
      if (this.weaponDrops.length < 3 && this.rules.gameMode !== 'gun_game' && this.rules.gameMode !== 'one_in_chamber') {
        this.spawnMidMapWeaponDrop();
      }
    }
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateCameras(dt);

    // Scorch decal fade slowly
    for (const sc of this.scorchDecals) {
      sc.alpha = Math.max(0.15, sc.alpha - dt * 0.008);
    }

    this.replayAccumulator += dt;
    if (this.replayAccumulator >= 0.05) {
      this.replayAccumulator = 0;
      this.recordReplayFrame();
    }

    if (mode === 'online_host') {
      this.netSyncAccumulator += dt;
      if (this.netSyncAccumulator >= 0.045) {
        this.netSyncAccumulator = 0;
        this.broadcastWorldSnapshot();
      }
    }

    this.hudSyncAccumulator += dt;
    if (this.hudSyncAccumulator >= 0.08) {
      this.hudSyncAccumulator = 0;
      this.pushHudSnapshot();
    }
  }

  private getP1Input(f: FighterEntity, mode: GameMode) {
    const cam = this.cameras[0];
    const vw = mode === 'versus_2p' ? this.canvas.width / 2 : this.canvas.width;
    const isSoloLike = mode === 'solo' || mode === 'online_host';

    const left =
      this.heldKeys.has('KeyA') ||
      (isSoloLike && this.heldKeys.has('ArrowLeft')) ||
      this.touchState.moveX < -0.25;
    const right =
      this.heldKeys.has('KeyD') ||
      (isSoloLike && this.heldKeys.has('ArrowRight')) ||
      this.touchState.moveX > 0.25;
    const up =
      this.heldKeys.has('KeyW') ||
      this.heldKeys.has('Space') ||
      (isSoloLike && this.heldKeys.has('ArrowUp')) ||
      this.touchState.jetpack;
    const upJust =
      this.justPressed.has('KeyW') ||
      this.justPressed.has('Space') ||
      (isSoloLike && this.justPressed.has('ArrowUp')) ||
      this.touchButtonsJust.has('jump');
    const down =
      this.heldKeys.has('KeyS') ||
      (isSoloLike && this.heldKeys.has('ArrowDown')) ||
      this.touchState.moveY > 0.45;
    const shoot =
      (mode === 'versus_2p' ? this.heldKeys.has('KeyF') : this.mouseScreen.down || this.heldKeys.has('KeyF')) ||
      this.touchState.firing;
    const reload = this.justPressed.has('KeyR') || this.touchButtonsJust.has('reload');
    const ultimate =
      this.justPressed.has('KeyE') ||
      this.justPressed.has('ShiftLeft') ||
      this.touchButtonsJust.has('ultimate');
    const meleeJust =
      this.justPressed.has('KeyV') ||
      this.justPressed.has('KeyQ') ||
      this.touchButtonsJust.has('melee');
    const grenadeJust =
      this.justPressed.has('KeyG') || this.touchButtonsJust.has('grenade');

    const cycleGrenadeJust =
      this.justPressed.has('Tab') || this.touchButtonsJust.has('cycle_grenade');
    let switchSlot: WeaponSlot | undefined;
    if (this.justPressed.has('Digit1')) {
      switchSlot = 'primary';
    } else if (this.justPressed.has('Digit2')) {
      switchSlot = 'secondary';
    } else if (this.justPressed.has('Digit3')) {
      switchSlot = 'melee';
    } else if (this.touchButtonsJust.has('cycle_slot')) {
      const order: WeaponSlot[] = ['primary', 'secondary', 'melee'];
      switchSlot = order[(order.indexOf(f.activeSlot) + 1) % order.length];
    }

    let aimAngle = f.aimAngle;
    if (this.touchState.active && this.touchState.hasAim) {
      aimAngle = this.touchState.aimAngle;
    } else if (mode !== 'versus_2p' && cam) {
      aimAngle = this.computeAimAngle(f, cam, 0, vw);
    } else {
      let ax = 0;
      let ay = 0;
      if (left) ax -= 1;
      if (right) ax += 1;
      if (up) ay -= 0.45;
      if (down) ay += 0.45;
      if (ax !== 0 || ay !== 0) {
        aimAngle = Math.atan2(ay, ax);
      }
    }

    let dashDir: -1 | 0 | 1 = 0;
    if (this.justPressed.has('KeyA') || (isSoloLike && this.justPressed.has('ArrowLeft'))) {
      if (this.elapsedSec - f.lastTapLeftAt <= 0.26) dashDir = -1;
      f.lastTapLeftAt = this.elapsedSec;
    } else if (this.justPressed.has('KeyD') || (isSoloLike && this.justPressed.has('ArrowRight'))) {
      if (this.elapsedSec - f.lastTapRightAt <= 0.26) dashDir = 1;
      f.lastTapRightAt = this.elapsedSec;
    } else if (this.touchButtonsJust.has('dash_left')) dashDir = -1;
    else if (this.touchButtonsJust.has('dash_right')) dashDir = 1;

    const grapple =
      this.mouseScreen.rightDown || this.heldKeys.has('KeyC') || this.touchButtonsJust.has('grapple');
    const grappleJust =
      this.justPressed.has('MouseRight') ||
      this.justPressed.has('KeyC') ||
      this.touchButtonsJust.has('grapple');
    const emoteJust = this.justPressed.has('KeyT') || this.touchButtonsJust.has('emote');
    const sprayJust = this.justPressed.has('KeyY') || this.touchButtonsJust.has('spray');

    return {
      left,
      right,
      up,
      upJust,
      down,
      shoot,
      reload,
      ultimate,
      meleeJust,
      grenadeJust,
      cycleGrenadeJust,
      switchSlot,
      aimAngle,
      grapple,
      grappleJust,
      dashDir,
      emoteJust,
      sprayJust,
    };
  }

  private getP2LocalInput(f: FighterEntity) {
    const left = this.heldKeys.has('ArrowLeft');
    const right = this.heldKeys.has('ArrowRight');
    const up = this.heldKeys.has('ArrowUp');
    const upJust = this.justPressed.has('ArrowUp');
    const down = this.heldKeys.has('ArrowDown');
    const shoot = this.heldKeys.has('Enter') || this.heldKeys.has('Numpad0');
    const reload = this.justPressed.has('KeyP') || this.justPressed.has('NumpadDecimal');
    const ultimate = this.justPressed.has('ShiftRight') || this.justPressed.has('KeyK');
    const meleeJust = this.justPressed.has('KeyM') || this.justPressed.has('Slash');
    const grenadeJust = this.justPressed.has('Backslash') || this.justPressed.has('KeyL');
    const cycleGrenadeJust = this.justPressed.has('BracketRight');

    let switchSlot: WeaponSlot | undefined;
    if (this.justPressed.has('Numpad1')) {
      switchSlot = 'primary';
    } else if (this.justPressed.has('Numpad2')) {
      switchSlot = 'secondary';
    } else if (this.justPressed.has('Numpad3')) {
      switchSlot = 'melee';
    } else if (this.justPressed.has('Period')) {
      const order: WeaponSlot[] = ['primary', 'secondary', 'melee'];
      switchSlot = order[(order.indexOf(f.activeSlot) + 1) % order.length];
    }

    let dashDir: -1 | 0 | 1 = 0;
    if (this.justPressed.has('ArrowLeft')) {
      if (this.elapsedSec - f.lastTapLeftAt <= 0.26) dashDir = -1;
      f.lastTapLeftAt = this.elapsedSec;
    } else if (this.justPressed.has('ArrowRight')) {
      if (this.elapsedSec - f.lastTapRightAt <= 0.26) dashDir = 1;
      f.lastTapRightAt = this.elapsedSec;
    }

    let ax = 0;
    let ay = 0;
    if (left) ax -= 1;
    if (right) ax += 1;
    if (up) ay -= 0.45;
    if (down) ay += 0.45;
    const aimAngle = ax !== 0 || ay !== 0 ? Math.atan2(ay, ax) : f.aimAngle;

    return {
      left,
      right,
      up,
      upJust,
      down,
      shoot,
      reload,
      ultimate,
      meleeJust,
      grenadeJust,
      cycleGrenadeJust,
      switchSlot,
      aimAngle,
      grapple: this.heldKeys.has('KeyN'),
      grappleJust: this.justPressed.has('KeyN'),
      dashDir,
      emoteJust: this.justPressed.has('Comma'),
      sprayJust: this.justPressed.has('Semicolon'),
    };
  }

  private computeAimAngle(
    f: FighterEntity,
    cam: CameraState,
    vpX: number,
    vpW: number
  ): number {
    const vpCenterX = vpX + vpW / 2;
    const vpCenterY = this.canvas.height / 2;
    const worldMouseX = (this.mouseScreen.x - vpCenterX) / cam.zoom + cam.x;
    const worldMouseY = (this.mouseScreen.y - vpCenterY) / cam.zoom + cam.y;
    return Math.atan2(worldMouseY - (f.y - 4), worldMouseX - f.x);
  }

  private getBotInput(bot: FighterEntity, dt: number) {
    bot.aiDecisionTimer -= dt;
    bot.aiFireHoldTimer = Math.max(0, bot.aiFireHoldTimer - dt);

    // Nearest enemy (ignoring teammates in team modes)
    let nearestEnemy: FighterEntity | null = null;
    let nearestDist = Infinity;
    for (const other of this.fighters) {
      if (other.id === bot.id || !other.alive || this.isFriendly(bot, other)) continue;
      const d = Math.hypot(other.x - bot.x, other.y - bot.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = other;
      }
    }

    // Occasional rocket dodge (not frame-perfect)
    let dodgeJetpack = false;
    if (bot.aiDecisionTimer < 0.12) {
      for (const proj of this.projectiles) {
        if (!proj.isRocket || proj.ownerId === bot.id) continue;
        const owner = this.fighters.find((f) => f.id === proj.ownerId);
        if (this.isFriendly(bot, owner)) continue;
        const dx = bot.x - proj.x;
        const dy = bot.y - proj.y;
        const d = Math.hypot(dx, dy);
        if (d < 175 && dx * proj.vx + dy * proj.vy > 0 && Math.random() < 0.35) {
          dodgeJetpack = true;
          break;
        }
      }
    }

    if (bot.aiDecisionTimer <= 0) {
      bot.aiDecisionTimer = 0.48 + Math.random() * 0.45;
      bot.aiStrafeDir = Math.random() > 0.5 ? 1 : -1;

      if (bot.hp < 42) {
        const med = this.pickups
          .filter((p) => p.active && p.type === 'medkit')
          .sort((a, b) => Math.hypot(a.x - bot.x, a.y - bot.y) - Math.hypot(b.x - bot.x, b.y - bot.y))[0];
        if (med) {
          bot.aiState = 'seek_heal';
          bot.aiGoalX = med.x;
          bot.aiGoalY = med.y;
        }
      } else if (this.rules.gameMode === 'ctf') {
        const botTeam = bot.team || 'alpha';
        const enemyTeam: TeamId = botTeam === 'alpha' ? 'bravo' : 'alpha';
        const ownFlag = this.ctfState.flags.find((fl) => fl.team === botTeam)!;
        const enemyFlag = this.ctfState.flags.find((fl) => fl.team === enemyTeam)!;
        if (bot.carryingFlagTeam) {
          bot.aiState = 'podium';
          bot.aiGoalX = ownFlag.baseX;
          bot.aiGoalY = ownFlag.baseY - 24;
        } else if (enemyFlag.state !== 'carried' && Math.random() < 0.6) {
          bot.aiState = 'podium';
          bot.aiGoalX = enemyFlag.x;
          bot.aiGoalY = enemyFlag.y - 24;
        } else if (ownFlag.state === 'dropped') {
          bot.aiState = 'podium';
          bot.aiGoalX = ownFlag.x;
          bot.aiGoalY = ownFlag.y - 24;
        } else if (nearestEnemy) {
          bot.aiState = 'hunt';
          bot.aiTargetId = nearestEnemy.id;
          bot.aiGoalX = nearestEnemy.x + bot.aiStrafeDir * 170;
          bot.aiGoalY = nearestEnemy.y;
        }
      } else if (
        this.rules.gameMode === 'hardpoint' &&
        (Math.random() < 0.62 || !nearestEnemy || nearestDist > 420)
      ) {
        bot.aiState = 'podium';
        bot.aiGoalX =
          this.hardpointState.x + this.hardpointState.w * (0.25 + Math.random() * 0.5);
        bot.aiGoalY = this.hardpointState.y + this.hardpointState.h - 30;
      } else if (
        this.rules.gameMode === 'domination' &&
        (Math.random() < 0.6 || !nearestEnemy || nearestDist > 440)
      ) {
        const botTeam = bot.team || 'alpha';
        const unowned = this.dominationState.flags
          .filter((fl) => fl.ownerTeam !== botTeam)
          .sort((a, b) => Math.hypot(a.x - bot.x, a.y - bot.y) - Math.hypot(b.x - bot.x, b.y - bot.y));
        const targetFlag = unowned[0] || this.dominationState.flags[1];
        if (targetFlag) {
          bot.aiState = 'podium';
          bot.aiGoalX = targetFlag.x + (Math.random() - 0.5) * 40;
          bot.aiGoalY = targetFlag.y - 26;
        }
      } else if (nearestEnemy) {
        bot.aiState = 'hunt';
        bot.aiTargetId = nearestEnemy.id;
        bot.aiGoalX = nearestEnemy.x + bot.aiStrafeDir * 170;
        bot.aiGoalY = nearestEnemy.y;
      } else {
        bot.aiState = 'patrol';
        bot.aiGoalX = this.map.width / 2 + (Math.random() - 0.5) * 900;
        bot.aiGoalY = 700;
      }

      // Pace shooting in natural bursts with pauses
      if (nearestEnemy && nearestDist < 520 && Math.random() < 0.62) {
        bot.aiFireHoldTimer = 0.24 + Math.random() * 0.28;
      }
    }

    const dxGoal = bot.aiGoalX - bot.x;
    const dyGoal = bot.aiGoalY - bot.y;

    let left = dxGoal < -44;
    let right = dxGoal > 44;
    const up = (dyGoal < -85 && bot.fuel > 25) || dodgeJetpack;
    let upJust = bot.grounded && dyGoal < -36;
    const down = dyGoal > 100 && bot.grounded;

    if ((left || right) && bot.grounded && Math.random() < 0.03) {
      upJust = true;
    }

    let shoot = false;
    let aimAngle = bot.aimAngle;
    let meleeJust = false;
    let grenadeJust = false;

    if (nearestEnemy) {
      const los = this.hasLineOfSight(bot.x, bot.y - 6, nearestEnemy.x, nearestEnemy.y - 6);
      const targetAngle = Math.atan2(nearestEnemy.y - 6 - (bot.y - 6), nearestEnemy.x - bot.x);
      const jitter = (Math.random() - 0.5) * 0.34;
      let diff = targetAngle + jitter - bot.aimAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      aimAngle = bot.aimAngle + diff * Math.min(1, dt * 4.2);

      if (nearestDist < 42 && bot.meleeCooldownTimer <= 0 && Math.random() < 0.06) {
        meleeJust = true;
      } else if (los && nearestDist < 520 && bot.aiFireHoldTimer > 0) {
        shoot = true;
        if (nearestDist > 210 && nearestDist < 400 && bot.grenades > 0 && Math.random() < 0.002) {
          grenadeJust = true;
        }
      }
      if (nearestDist < 120 && bot.aiState === 'hunt') {
        left = nearestEnemy.x > bot.x;
        right = nearestEnemy.x < bot.x;
      }
    }

    const useUlt =
      bot.ultCharge >= 100 &&
      Math.random() < 0.035 &&
      ((nearestEnemy && nearestDist < 360) ||
        ((bot.characterId === 'baba_wifi' ||
          bot.characterId === 'bhaijaan_gymbro' ||
          bot.characterId === 'captain_jalebi') &&
          bot.hp < 45));

    const reload = bot.ammo <= 0 && !bot.isReloading;

    return {
      left,
      right,
      up,
      upJust,
      down,
      shoot,
      reload,
      ultimate: Boolean(useUlt),
      meleeJust,
      grenadeJust,
      cycleGrenadeJust: false,
      aimAngle,
      grapple: false,
      grappleJust: false,
      dashDir: 0 as -1 | 0 | 1,
      emoteJust: false,
      sprayJust: false,
    };
  }

  private activateUltimate(f: FighterEntity): void {
    f.ultCharge = 0;
    soundEngine.playUltimate();
    this.triggerSpeechQuip(f, 'ult');
    this.pendingNetEvents.push({ kind: 'ult', x: f.x, y: f.y, text: f.characterId });

    if (f.characterId === 'chai_storm' || f.characterId === 'thongi_baba') {
      const isThongi = f.characterId === 'thongi_baba';
      const blastRadius = isThongi ? 275 : 260;
      const blastDmg = isThongi ? 46 : 44;
      if (isThongi) {
        this.spawnFloatingText(f.x, f.y - 45, 'YAHAN WALA BLAST!', '#22D3EE');
        this.spawnRing(f.x, f.y, blastRadius * 0.72, '#FACC15');
        this.spawnBurst(f.x, f.y, '#22D3EE', 18, 280);
      } else {
        this.spawnFloatingText(f.x, f.y - 45, 'KADAK SHOCKWAVE!', '#FDE68A');
        this.spawnRing(f.x, f.y, blastRadius * 0.72, '#D97706');
        this.spawnBurst(f.x, f.y, '#FEF3C7', 20, 260, 'smoke');
        this.spawnBurst(f.x, f.y, '#B45309', 14, 290);
      }
      this.spawnRing(f.x, f.y, blastRadius, isThongi ? '#22D3EE' : '#F59E0B');

      for (const other of this.fighters) {
        if (other.id === f.id || !other.alive || this.isFriendly(f, other)) continue;
        const dx = other.x - f.x;
        const dy = other.y - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= blastRadius) {
          const push = (1 - dist / blastRadius) * (isThongi ? 680 : 650) + 250;
          const ang = Math.atan2(dy - 40, dx);
          other.vx += Math.cos(ang) * push;
          other.vy += Math.sin(ang) * push - 160;
          this.applyDamage(other, blastDmg, f.id, 'ultimate', false);
        }
      }
    } else if (f.characterId === 'baron_voltage') {
      const empRadius = 310;
      f.ultActiveTimer = 0.75;
      soundEngine.playEmpShock();
      this.spawnRing(f.x, f.y, empRadius, '#22D3EE');
      this.spawnRing(f.x, f.y, empRadius * 0.58, '#67E8F9');
      this.spawnBurst(f.x, f.y, '#67E8F9', 24, 340);
      this.spawnFloatingText(f.x, f.y - 45, 'ARCANE EMP STORM!', '#22D3EE');
      for (const other of this.fighters) {
        if (other.id === f.id || !other.alive || this.isFriendly(f, other)) continue;
        const dist = Math.hypot(other.x - f.x, other.y - f.y);
        if (dist <= empRadius) {
          this.spawnBurst(other.x, other.y - 4, '#22D3EE', 10, 180);
          this.applyDamage(other, 40, f.id, 'ultimate', false);
          if (other.alive) {
            if (other.characterId !== 'baron_voltage') {
              other.empDisableTimer = Math.max(other.empDisableTimer, 3.2);
              this.spawnFloatingText(other.x, other.y - 42, 'EMP SHOCKED!', '#22D3EE');
            }
            other.empDotTimer = Math.max(other.empDotTimer, 3.0);
            other.empTickAccum = 0;
            other.empOwnerId = f.id;
          }
        }
      }
    } else if (f.characterId === 'captain_jalebi') {
      f.ultActiveTimer = 6.0;
      f.fuel = f.maxFuel;
      this.spawnFloatingText(f.x, f.y - 45, 'SUGAR RUSH OVERDRIVE!', '#FB923C');
    } else if (f.characterId === 'baba_wifi') {
      f.ultActiveTimer = 5.0;
      this.spawnFloatingText(f.x, f.y - 45, 'FIREWALL SHIELD!', '#22D3EE');
    } else if (f.characterId === 'general_noodle') {
      const target = this.findNearestEnemy(f);
      this.spawnFloatingText(f.x, f.y - 45, 'SPICY NOODLE SWARM!', '#EF4444');
      for (const offset of [-0.42, 0, 0.42]) {
        const ang = f.aimAngle + offset;
        this.projectiles.push({
          id: this.nextProjectileId++,
          ownerId: f.id,
          weaponId: f.weaponId,
          x: f.x + f.facing * 16,
          y: f.y - 12 + offset * 14,
          prevX: f.x,
          prevY: f.y - 12,
          vx: Math.cos(ang) * 450,
          vy: Math.sin(ang) * 450,
          damage: 34,
          explosionRadius: 70,
          color: '#EF4444',
          life: 3.6,
          isRocket: true,
          isHoming: true,
          targetId: target ? target.id : null,
          fromUltimate: true,
        });
      }
    } else if (f.characterId === 'agent_404') {
      soundEngine.playGlitchTeleport();
      this.spawnBurst(f.x, f.y, '#22C55E', 18, 220);
      const target = this.findNearestEnemy(f);
      if (target) {
        const spots = [
          { x: target.x - target.facing * 54, y: target.y },
          { x: target.x + target.facing * 54, y: target.y },
          { x: target.x, y: target.y - 42 },
        ];
        for (const sp of spots) {
          const cx = Math.max(58, Math.min(this.map.width - 58, sp.x));
          const cy = Math.max(70, Math.min(this.map.height - 90, sp.y));
          const blocked = this.getActivePlatforms().some(
            (p) =>
              p.kind !== 'oneway' &&
              this.rectOverlap(cx - f.w / 2, cy - f.h / 2, f.w, f.h, p.x, p.y, p.w, p.h)
          );
          if (!blocked) {
            f.x = cx;
            f.y = cy;
            break;
          }
        }
        f.facing = target.x >= f.x ? 1 : -1;
        f.aimAngle = Math.atan2(target.y - f.y, target.x - f.x);
      }
      f.ultActiveTimer = 5.0;
      this.spawnBurst(f.x, f.y, '#4ADE80', 18, 240);
      this.spawnFloatingText(f.x, f.y - 45, 'GLITCH TELEPORT (404)!', '#4ADE80');
    } else if (f.characterId === 'prof_jugaad') {
      soundEngine.playCookerWhistle();
      this.cookerBombs.push({
        id: this.nextCookerId++,
        ownerId: f.id,
        x: f.x + f.facing * 18,
        y: f.y,
        vx: f.facing * 185,
        vy: -130,
        fuseTimer: 1.5,
        maxFuse: 1.5,
        whistleTimer: 0.35,
      });
      this.spawnFloatingText(f.x, f.y - 45, 'SEETI BLAST INCOMING!', '#FACC15');
    } else if (f.characterId === 'chappal_ninja') {
      const target = this.findNearestEnemy(f);
      const ang = target ? Math.atan2(target.y - f.y, target.x - f.x) : f.aimAngle;
      this.projectiles.push({
        id: this.nextProjectileId++,
        ownerId: f.id,
        weaponId: f.weaponId,
        x: f.x + Math.cos(ang) * 20,
        y: f.y - 6 + Math.sin(ang) * 20,
        prevX: f.x,
        prevY: f.y - 6,
        vx: Math.cos(ang) * 620,
        vy: Math.sin(ang) * 620,
        damage: 64,
        explosionRadius: 0,
        color: '#FACC15',
        life: 4.0,
        isRocket: false,
        isHoming: true,
        isChappal: true,
        bouncesLeft: 3,
        targetId: target ? target.id : null,
        fromUltimate: true,
      });
      this.spawnFloatingText(f.x, f.y - 45, 'FLYING CHAPPAL!', '#FACC15');
    } else if (f.characterId === 'dj_dholak') {
      soundEngine.playBassDrop();
      const radius = 270;
      this.spawnRing(f.x, f.y, radius, '#EC4899');
      this.spawnRing(f.x, f.y, radius * 0.65, '#22D3EE');
      this.spawnFloatingText(f.x, f.y - 45, 'BARAAT BASS DROP!', '#EC4899');
      for (const other of this.fighters) {
        if (other.id === f.id || !other.alive || this.isFriendly(f, other)) continue;
        const dist = Math.hypot(other.x - f.x, other.y - f.y);
        if (dist <= radius) {
          other.danceTimer = Math.max(other.danceTimer, 2.0);
          other.vy = Math.min(other.vy, -210);
          this.spawnFloatingText(other.x, other.y - 42, 'DANCE!', '#EC4899');
          this.applyDamage(other, 38, f.id, 'ultimate', false);
        }
      }
    } else if (f.characterId === 'aunty_cctv') {
      f.uavTimer = Math.max(f.uavTimer, 8.0);
      f.ultActiveTimer = 8.0;
      f.gossipCooldown = 0.05;
      this.spawnFloatingText(f.x, f.y - 45, 'MOHALLA BROADCAST!', '#F472B6');
    } else if (f.characterId === 'bhaijaan_gymbro') {
      f.vy = -560;
      f.grounded = false;
      f.slamPending = true;
      f.ultActiveTimer = 2.2;
      this.spawnBurst(f.x, f.y + 18, '#F97316', 14, 190);
      this.spawnFloatingText(f.x, f.y - 45, 'SKIP LEG DAY SMASH!', '#F97316');
    } else if (f.characterId === 'exam_topper') {
      soundEngine.playLaserZap();
      const beamLen = 920;
      const sx = f.x;
      const sy = f.y - 4;
      const dx = Math.cos(f.aimAngle);
      const dy = Math.sin(f.aimAngle);
      this.geometryBeams.push({
        id: this.nextBeamId++,
        ownerId: f.id,
        x: sx,
        y: sy,
        angle: f.aimAngle,
        length: beamLen,
        life: 0.55,
        maxLife: 0.55,
        color: '#38BDF8',
        isGossip: false,
      });
      this.spawnFloatingText(f.x, f.y - 45, '100/100 GEOMETRY LASER!', '#38BDF8');

      for (const other of this.fighters) {
        if (other.id === f.id || !other.alive || this.isFriendly(f, other)) continue;
        const vx = other.x - sx;
        const vy = other.y - sy;
        const projDist = vx * dx + vy * dy;
        if (projDist >= 0 && projDist <= beamLen) {
          const perpDist = Math.abs(vx * dy - vy * dx);
          if (perpDist <= 28) {
            this.spawnBurst(other.x, other.y, '#38BDF8', 12, 200);
            this.applyDamage(other, 78, f.id, 'ultimate', false);
          }
        }
      }
    }
  }

  private switchFighterSlot(f: FighterEntity, targetSlot: WeaponSlot): void {
    if (f.isLastStand) return;
    if (this.rules.gameMode === 'gun_game') {
      const wantSlot = f.gunGameTier >= GUN_GAME_LADDER.length ? 'melee' : 'primary';
      if (targetSlot !== wantSlot) return;
    }
    if (f.activeSlot === targetSlot) return;
    if (f.activeSlot === 'primary') {
      f.primaryAmmo = f.ammo;
    } else if (f.activeSlot === 'secondary') {
      f.secondaryAmmo = f.ammo;
    }
    f.isReloading = false;
    f.reloadTimerMs = 0;
    f.burstRemaining = 0;
    f.activeSlot = targetSlot;

    if (targetSlot === 'primary') {
      f.weaponId = f.primaryWeaponId;
      f.ammo = f.primaryAmmo;
      f.weaponMastery = this.getMasteryForWeapon(f.masteryMap, f.weaponId);
      if (f.isHuman) {
        this.spawnFloatingText(f.x, f.y - 36, WEAPONS[f.weaponId].shortName, '#F59E0B');
      }
    } else if (targetSlot === 'secondary') {
      f.weaponId = f.secondaryWeaponId;
      f.ammo = f.secondaryAmmo;
      f.weaponMastery = this.getMasteryForWeapon(f.masteryMap, f.weaponId);
      if (f.isHuman) {
        this.spawnFloatingText(f.x, f.y - 36, WEAPONS[f.weaponId].shortName, '#38BDF8');
      }
    } else {
      const mDef = MELEE_WEAPONS[f.meleeWeaponId || 'knife'];
      if (f.isHuman) {
        this.spawnFloatingText(f.x, f.y - 36, mDef.shortName.toUpperCase(), '#FACC15');
      }
    }
  }

  private performMeleeStrike(f: FighterEntity): void {
    const meleeId = f.meleeWeaponId || 'knife';
    const mDef = MELEE_WEAPONS[meleeId] || MELEE_WEAPONS.knife;
    f.meleeCooldownTimer =
      f.characterId === 'chappal_ninja' ? mDef.cooldownSec * 0.8 : mDef.cooldownSec;
    f.meleeSwingTimer = mDef.swingDurationSec;
    soundEngine.playMeleeSwing(meleeId);
    this.pendingNetEvents.push({ kind: 'melee', meleeWeaponId: meleeId, x: f.x, y: f.y });

    const reachOffset = Math.round(mDef.range * 0.72);
    const reachX = f.x + Math.cos(f.aimAngle) * reachOffset;
    const reachY = f.y - 4 + Math.sin(f.aimAngle) * reachOffset;
    const hitRadius = Math.max(42, mDef.range * 0.92);
    const knockMult = f.characterId === 'bhaijaan_gymbro' ? 1.35 : 1.0;
    let landed = false;

    for (const other of this.fighters) {
      if (other.id === f.id || !other.alive || this.isFriendly(f, other)) continue;
      if (Math.hypot(other.x - reachX, other.y - reachY) < hitRadius) {
        other.vx += Math.cos(f.aimAngle) * mDef.knockback * knockMult;
        other.vy = Math.min(other.vy - 120, -160);
        this.applyDamage(other, mDef.damage, f.id, meleeId, false);
        landed = true;
      }
    }

    for (const dw of this.destructibleWalls) {
      if (!dw.alive) continue;
      const cx = Math.max(dw.x, Math.min(reachX, dw.x + dw.w));
      const cy = Math.max(dw.y, Math.min(reachY, dw.y + dw.h));
      if (Math.hypot(reachX - cx, reachY - cy) < hitRadius * 0.78) {
        this.damageDestructibleWall(dw, mDef.damage, f.id);
        landed = true;
      }
    }

    for (const b of this.barrels) {
      if (!b.alive) continue;
      if (Math.hypot(b.x - reachX, b.y - b.h / 2 - reachY) < hitRadius * 0.85) {
        this.damageBarrel(b, mDef.damage, f.id);
        landed = true;
      }
    }

    if (landed) {
      soundEngine.playMeleeHit();
      this.spawnBurst(reachX, reachY, mDef.accentColor, 8, 175);
    }
  }

  private throwGrenade(f: FighterEntity): void {
    f.grenades = Math.max(0, f.grenades - 1);
    const speed = 590;
    this.grenades.push({
      id: this.nextGrenadeId++,
      ownerId: f.id,
      type: f.grenadeType,
      x: f.x + Math.cos(f.aimAngle) * 20,
      y: f.y - 10 + Math.sin(f.aimAngle) * 20,
      vx: Math.cos(f.aimAngle) * speed + f.vx * 0.25,
      vy: Math.sin(f.aimAngle) * speed - 120,
      rot: 0,
      vRot: f.facing * 11,
      fuseTimer: f.grenadeType === 'frag' ? 1.65 : f.grenadeType === 'smoke' ? 0.85 : 1.25,
      stuck: false,
    });
    soundEngine.playMeleeSwing();
  }

  private updateGrenades(dt: number): void {
    const gAccel = GRAVITY * this.rules.gravityScale;
    const kept: GrenadeEntity[] = [];

    for (const g of this.grenades) {
      g.fuseTimer -= dt;

      if (g.stuck) {
        if (g.stuckFighterId) {
          const target = this.fighters.find((f) => f.id === g.stuckFighterId);
          if (target && target.alive) {
            g.x = target.x + (g.stuckOffsetX || 0);
            g.y = target.y + (g.stuckOffsetY || 0);
          } else {
            g.stuck = false;
            g.stuckFighterId = undefined;
          }
        }
      } else {
        g.vy += gAccel * dt;
        const nextX = g.x + g.vx * dt;
        const nextY = g.y + g.vy * dt;
        g.rot += g.vRot * dt;

        // Check enemy stick for plasma grenades
        if (g.type === 'plasma') {
          const owner = this.fighters.find((ft) => ft.id === g.ownerId);
          for (const f of this.fighters) {
            if (!f.alive || f.id === g.ownerId || this.isFriendly(owner, f)) continue;
            if (Math.hypot(nextX - f.x, nextY - f.y) < 24) {
              g.stuck = true;
              g.stuckFighterId = f.id;
              g.stuckOffsetX = nextX - f.x;
              g.stuckOffsetY = nextY - f.y;
              g.vx = 0;
              g.vy = 0;
              soundEngine.playPlasmaStick();
              break;
            }
          }
        }

        if (!g.stuck) {
          let collided = false;
          // Portal teleportation for grenades
          for (const prt of this.portals) {
            if (Math.hypot(nextX - prt.aX, nextY - prt.aY) < prt.radius) {
              g.x = prt.bX + Math.sign(g.vx || 1) * (prt.radius + 14);
              g.y = prt.bY;
              soundEngine.playPortalWarp();
              this.spawnBurst(g.x, g.y, '#FB923C', 8, 130);
              collided = true;
              break;
            } else if (Math.hypot(nextX - prt.bX, nextY - prt.bY) < prt.radius) {
              g.x = prt.aX + Math.sign(g.vx || 1) * (prt.radius + 14);
              g.y = prt.aY;
              soundEngine.playPortalWarp();
              this.spawnBurst(g.x, g.y, '#38BDF8', 8, 130);
              collided = true;
              break;
            }
          }

          // Bounce or stick against solid platforms
          if (!collided) {
            for (const p of this.getActivePlatforms()) {
              if (p.kind === 'oneway') {
                if (
                  g.vy > 0 &&
                  g.y <= p.y &&
                  nextY + 6 >= p.y &&
                  nextX >= p.x &&
                  nextX <= p.x + p.w
                ) {
                  if (g.type === 'plasma') {
                    g.stuck = true;
                    g.x = nextX;
                    g.y = p.y - 6;
                    g.vx = 0;
                    g.vy = 0;
                    soundEngine.playPlasmaStick();
                  } else {
                    g.y = p.y - 6;
                    g.vy = -g.vy * 0.48;
                    g.vx *= 0.72;
                    soundEngine.playGrenadeBounce();
                  }
                  collided = true;
                  break;
                }
                continue;
              }
              if (
                nextX + 6 > p.x &&
                nextX - 6 < p.x + p.w &&
                nextY + 6 > p.y &&
                nextY - 6 < p.y + p.h
              ) {
                if (g.type === 'plasma') {
                  g.stuck = true;
                  g.vx = 0;
                  g.vy = 0;
                  soundEngine.playPlasmaStick();
                } else {
                  const overlapL = nextX + 6 - p.x;
                  const overlapR = p.x + p.w - (nextX - 6);
                  const overlapT = nextY + 6 - p.y;
                  const overlapB = p.y + p.h - (nextY - 6);
                  const minO = Math.min(overlapL, overlapR, overlapT, overlapB);
                  if (minO === overlapT || minO === overlapB) {
                    g.vy = -g.vy * 0.5;
                    g.vx *= 0.75;
                  } else {
                    g.vx = -g.vx * 0.55;
                  }
                  soundEngine.playGrenadeBounce();
                }
                collided = true;
                break;
              }
            }
          }
          if (!collided) {
            g.x = nextX;
            g.y = nextY;
          }
        }
      }

      if (g.fuseTimer <= 0) {
        const owner = this.fighters.find((ft) => ft.id === g.ownerId);
        const blastMult = owner?.characterId === 'prof_jugaad' ? 1.2 : 1.0;
        if (g.type === 'smoke') {
          this.smokeClouds.push({
            id: this.nextSmokeId++,
            x: g.x,
            y: g.y,
            radius: 140,
            life: 8.5,
            maxLife: 8.5,
          });
          soundEngine.playSmokeHiss();
          this.spawnBurst(g.x, g.y, '#CBD5E1', 16, 150);
        } else if (g.type === 'plasma') {
          this.triggerExplosion(g.x, g.y, 118 * blastMult, 95, g.ownerId, 'plasma');
        } else {
          this.triggerExplosion(g.x, g.y, 124 * blastMult, 82, g.ownerId, 'frag');
        }
      } else {
        kept.push(g);
      }
    }

    this.grenades = kept;
  }

  private updateCookerBombs(dt: number): void {
    const gAccel = GRAVITY * this.rules.gravityScale;
    const kept: CookerBombEntity[] = [];

    for (const cb of this.cookerBombs) {
      cb.fuseTimer -= dt;
      cb.whistleTimer -= dt;
      if (cb.whistleTimer <= 0 && cb.fuseTimer > 0.15) {
        cb.whistleTimer = 0.35;
        soundEngine.playCookerWhistle();
        this.spawnBurst(cb.x, cb.y - 12, '#F8FAFC', 4, 85, 'smoke');
      }

      cb.vy += gAccel * dt;
      const nextX = cb.x + cb.vx * dt;
      const nextY = cb.y + cb.vy * dt;
      let landed = false;

      for (const p of this.getActivePlatforms()) {
        if (p.kind === 'oneway') {
          if (cb.vy > 0 && cb.y <= p.y && nextY + 12 >= p.y && nextX >= p.x && nextX <= p.x + p.w) {
            cb.y = p.y - 12;
            cb.vy = -cb.vy * 0.25;
            cb.vx *= 0.65;
            landed = true;
            break;
          }
          continue;
        }
        if (nextX + 12 > p.x && nextX - 12 < p.x + p.w && nextY + 12 > p.y && nextY - 12 < p.y + p.h) {
          cb.y = p.y - 12;
          cb.vy = -cb.vy * 0.25;
          cb.vx *= 0.65;
          landed = true;
          break;
        }
      }

      if (!landed) {
        cb.x = Math.max(52, Math.min(this.map.width - 52, nextX));
        cb.y = Math.min(this.map.height - 62, nextY);
      }

      if (cb.fuseTimer <= 0) {
        this.triggerExplosion(cb.x, cb.y, 225, 76, cb.ownerId, 'ultimate');
        this.spawnRing(cb.x, cb.y, 230, '#FACC15');
        const confettiColors = ['#F43F5E', '#FACC15', '#38BDF8', '#22C55E', '#A855F7'];
        for (const c of confettiColors) {
          this.spawnBurst(cb.x, cb.y - 8, c, 5, 320);
        }
        for (const f of this.fighters) {
          if (!f.alive) continue;
          const dist = Math.hypot(f.x - cb.x, f.y - cb.y);
          if (dist <= 225) {
            f.vy -= 260;
          }
        }
      } else {
        kept.push(cb);
      }
    }

    this.cookerBombs = kept;
  }

  private updateGeometryBeams(dt: number): void {
    for (const bm of this.geometryBeams) {
      bm.life -= dt;
    }
    this.geometryBeams = this.geometryBeams.filter((bm) => bm.life > 0);
  }

  private updateSmokeClouds(dt: number): void {
    for (const s of this.smokeClouds) {
      s.life -= dt;
    }
    this.smokeClouds = this.smokeClouds.filter((s) => s.life > 0);
  }

  private spawnAirstrike(killer: FighterEntity): void {
    const enemy = this.findNearestEnemy(killer);
    const targetX = enemy ? enemy.x : this.map.width / 2;
    const targetY = enemy ? enemy.y : 700;
    this.airstrikes.push({
      id: this.nextAirstrikeId++,
      ownerId: killer.id,
      targetX,
      targetY,
      timer: 1.5,
      shellsDropped: 0,
    });
    soundEngine.playAirstrikeWhistle();
    this.spawnFloatingText(killer.x, killer.y - 54, '7 KS · AIRSTRIKE CALLED!', '#EF4444');
    this.pendingNetEvents.push({ kind: 'airstrike', x: targetX, y: targetY });
  }

  private updateAirstrikes(dt: number): void {
    const kept: AirstrikeBeaconEntity[] = [];
    for (const strike of this.airstrikes) {
      strike.timer -= dt;
      if (strike.timer <= 0.85 && strike.shellsDropped === 0) {
        strike.shellsDropped = 1;
        this.triggerExplosion(strike.targetX - 75, strike.targetY - 20, 115, 76, strike.ownerId, 'airstrike');
      } else if (strike.timer <= 0.45 && strike.shellsDropped === 1) {
        strike.shellsDropped = 2;
        this.triggerExplosion(strike.targetX + 5, strike.targetY - 20, 125, 84, strike.ownerId, 'airstrike');
      } else if (strike.timer <= 0 && strike.shellsDropped === 2) {
        strike.shellsDropped = 3;
        this.triggerExplosion(strike.targetX + 85, strike.targetY - 20, 115, 76, strike.ownerId, 'airstrike');
      }
      if (strike.timer > 0) {
        kept.push(strike);
      }
    }
    this.airstrikes = kept;
  }

  private updateActiveModeRules(dt: number): void {
    const gm = this.rules.gameMode;
    if (gm === 'hardpoint') {
      this.updateHardpoint(dt);
    } else if (gm === 'domination') {
      this.updateDomination(dt);
    } else if (gm === 'ctf') {
      this.updateCtf(dt);
    } else if (gm === 'boss_raid') {
      const boss = this.fighters.find((f) => f.isBoss && f.alive);
      if (boss) {
        boss.bossEmpTimer -= dt;
        if (boss.bossEmpTimer <= 0) {
          boss.bossEmpTimer = 8.5;
          soundEngine.playEmpShock();
          this.spawnRing(boss.x, boss.y, 260, '#22D3EE');
          this.spawnBurst(boss.x, boss.y, '#67E8F9', 22, 300);
          this.spawnFloatingText(boss.x, boss.y - 54, 'MEGA EMP STORM!', '#22D3EE');
          for (const f of this.fighters) {
            if (!f.alive || f.id === boss.id || (f.team || 'alpha') === (boss.team || 'bravo')) continue;
            if (Math.hypot(f.x - boss.x, f.y - boss.y) <= 260) {
              f.empDisableTimer = Math.max(f.empDisableTimer, 1.8);
              this.applyDamage(f, 24, boss.id, 'emp', false);
            }
          }
        }
      }
    }
  }

  private updateHardpoint(dt: number): void {
    this.hardpointState.rotateTimerSec -= dt;
    if (this.hardpointState.rotateTimerSec <= 0 && this.map.hardpoints.length > 0) {
      const nextIdx = (this.hardpointState.zoneIndex + 1) % this.map.hardpoints.length;
      const zone = this.map.hardpoints[nextIdx];
      this.hardpointState.zoneIndex = nextIdx;
      this.hardpointState.zoneLabel = zone.label;
      this.hardpointState.x = zone.x;
      this.hardpointState.y = zone.y;
      this.hardpointState.w = zone.w;
      this.hardpointState.h = zone.h;
      this.hardpointState.rotateTimerSec = HARDPOINT_ROTATE_SEC;
      soundEngine.playKillstreak();
      this.spawnFloatingText(zone.x + zone.w / 2, zone.y - 14, `HARDPOINT: ${zone.label}`, '#F59E0B');
    }

    const hp = this.hardpointState;
    const alphaInside: FighterEntity[] = [];
    const bravoInside: FighterEntity[] = [];
    for (const f of this.fighters) {
      const inside =
        f.alive && f.x >= hp.x && f.x <= hp.x + hp.w && f.y >= hp.y && f.y <= hp.y + hp.h;
      f.inPodium = inside;
      if (inside) {
        if ((f.team || 'alpha') === 'alpha') alphaInside.push(f);
        else bravoInside.push(f);
      }
    }

    if (alphaInside.length > 0 && bravoInside.length === 0) {
      hp.ownerTeam = 'alpha';
      hp.contested = false;
      this.hardpointAlphaAccum += dt;
      if (this.hardpointAlphaAccum >= 1) {
        const pts = Math.floor(this.hardpointAlphaAccum);
        this.hardpointAlphaAccum -= pts;
        hp.alphaScore = Math.min(hp.targetScore, hp.alphaScore + pts);
        alphaInside.forEach((f) => {
          f.kothPoints += pts;
        });
      }
    } else if (bravoInside.length > 0 && alphaInside.length === 0) {
      hp.ownerTeam = 'bravo';
      hp.contested = false;
      this.hardpointBravoAccum += dt;
      if (this.hardpointBravoAccum >= 1) {
        const pts = Math.floor(this.hardpointBravoAccum);
        this.hardpointBravoAccum -= pts;
        hp.bravoScore = Math.min(hp.targetScore, hp.bravoScore + pts);
        bravoInside.forEach((f) => {
          f.kothPoints += pts;
        });
      }
    } else if (alphaInside.length > 0 && bravoInside.length > 0) {
      hp.ownerTeam = null;
      hp.contested = true;
    } else {
      hp.ownerTeam = null;
      hp.contested = false;
    }

    this.teamScores = {
      alpha: hp.alphaScore,
      bravo: hp.bravoScore,
      targetScore: hp.targetScore,
      label: 'HARDPOINT',
    };

    if (hp.alphaScore >= hp.targetScore || hp.bravoScore >= hp.targetScore) {
      this.finishMatch();
    }
  }

  private updateDomination(dt: number): void {
    const dom = this.dominationState;
    for (const flag of dom.flags) {
      let alphaCount = 0;
      let bravoCount = 0;
      for (const f of this.fighters) {
        if (!f.alive) continue;
        if (Math.abs(f.x - flag.x) <= 78 && Math.abs(f.y - (flag.y - 24)) <= 78) {
          if ((f.team || 'alpha') === 'alpha') alphaCount += 1;
          else bravoCount += 1;
        }
      }

      if (alphaCount > 0 && bravoCount === 0) {
        flag.contested = false;
        if (flag.ownerTeam !== 'alpha') {
          flag.capturingTeam = 'alpha';
          flag.progress = Math.min(100, flag.progress + dt * 42 * Math.min(2, alphaCount));
          if (flag.progress >= 100) {
            flag.ownerTeam = 'alpha';
            flag.capturingTeam = null;
            soundEngine.playPickup();
            this.spawnFloatingText(flag.x, flag.y - 72, `FLAG ${flag.id} ALPHA!`, '#EF4444');
          }
        } else {
          flag.capturingTeam = null;
        }
      } else if (bravoCount > 0 && alphaCount === 0) {
        flag.contested = false;
        if (flag.ownerTeam !== 'bravo') {
          flag.capturingTeam = 'bravo';
          flag.progress = Math.max(-100, flag.progress - dt * 42 * Math.min(2, bravoCount));
          if (flag.progress <= -100) {
            flag.ownerTeam = 'bravo';
            flag.capturingTeam = null;
            soundEngine.playPickup();
            this.spawnFloatingText(flag.x, flag.y - 72, `FLAG ${flag.id} BRAVO!`, '#38BDF8');
          }
        } else {
          flag.capturingTeam = null;
        }
      } else if (alphaCount > 0 && bravoCount > 0) {
        flag.contested = true;
      } else {
        flag.contested = false;
        flag.capturingTeam = null;
      }
    }

    this.dominationTickAccum += dt;
    if (this.dominationTickAccum >= 2.0) {
      this.dominationTickAccum -= 2.0;
      let alphaFlags = 0;
      let bravoFlags = 0;
      for (const flag of dom.flags) {
        if (flag.ownerTeam === 'alpha') alphaFlags += 1;
        else if (flag.ownerTeam === 'bravo') bravoFlags += 1;
      }
      if (alphaFlags > 0) {
        dom.alphaScore = Math.min(dom.targetScore, dom.alphaScore + alphaFlags);
        this.fighters.filter((f) => (f.team || 'alpha') === 'alpha').forEach((f) => {
          f.kothPoints += alphaFlags;
        });
      }
      if (bravoFlags > 0) {
        dom.bravoScore = Math.min(dom.targetScore, dom.bravoScore + bravoFlags);
        this.fighters.filter((f) => f.team === 'bravo').forEach((f) => {
          f.kothPoints += bravoFlags;
        });
      }
    }

    this.teamScores = {
      alpha: dom.alphaScore,
      bravo: dom.bravoScore,
      targetScore: dom.targetScore,
      label: 'DOMINATION',
    };

    if (dom.alphaScore >= dom.targetScore || dom.bravoScore >= dom.targetScore) {
      this.finishMatch();
    }
  }

  private updateCtf(dt: number): void {
    const ctf = this.ctfState;
    for (const flag of ctf.flags) {
      if (flag.state === 'carried' && flag.carrierId) {
        const carrier = this.fighters.find((f) => f.id === flag.carrierId);
        if (carrier && carrier.alive) {
          flag.x = carrier.x;
          flag.y = carrier.y - 26;
        } else {
          flag.state = 'dropped';
          flag.carrierId = null;
          flag.carrierName = null;
          flag.returnTimerSec = 15;
          if (carrier) carrier.carryingFlagTeam = null;
        }
      } else if (flag.state === 'dropped') {
        flag.returnTimerSec -= dt;
        if (flag.returnTimerSec <= 0) {
          flag.state = 'at_base';
          flag.x = flag.baseX;
          flag.y = flag.baseY;
          flag.returnTimerSec = 0;
          this.spawnFloatingText(flag.baseX, flag.baseY - 64, `${flag.team.toUpperCase()} FLAG RETURNED`, '#38BDF8');
        }
      }
    }

    for (const f of this.fighters) {
      if (!f.alive) continue;
      const myTeam: TeamId = f.team || 'alpha';
      const ownFlag = ctf.flags.find((fl) => fl.team === myTeam)!;
      const enemyFlag = ctf.flags.find((fl) => fl.team !== myTeam)!;

      // Return dropped own flag on touch
      if (ownFlag.state === 'dropped' && Math.hypot(f.x - ownFlag.x, f.y - ownFlag.y) < 46) {
        ownFlag.state = 'at_base';
        ownFlag.x = ownFlag.baseX;
        ownFlag.y = ownFlag.baseY;
        ownFlag.returnTimerSec = 0;
        soundEngine.playPickup();
        this.spawnFloatingText(f.x, f.y - 46, 'FLAG RETURNED!', '#38BDF8');
      }

      // Pick up enemy flag if not already carrying one
      if (
        !f.carryingFlagTeam &&
        enemyFlag.state !== 'carried' &&
        Math.hypot(f.x - enemyFlag.x, f.y - enemyFlag.y) < 46
      ) {
        enemyFlag.state = 'carried';
        enemyFlag.carrierId = f.id;
        enemyFlag.carrierName = f.name;
        enemyFlag.returnTimerSec = 0;
        f.carryingFlagTeam = enemyFlag.team;
        soundEngine.playKillstreak();
        this.spawnFloatingText(f.x, f.y - 48, 'ENEMY FLAG TAKEN!', '#FACC15');
      }

      // Score capture at own base when own flag is home
      if (
        f.carryingFlagTeam &&
        ownFlag.state === 'at_base' &&
        Math.hypot(f.x - ownFlag.baseX, f.y - ownFlag.baseY) < 52
      ) {
        enemyFlag.state = 'at_base';
        enemyFlag.x = enemyFlag.baseX;
        enemyFlag.y = enemyFlag.baseY;
        enemyFlag.carrierId = null;
        enemyFlag.carrierName = null;
        f.carryingFlagTeam = null;
        f.kothPoints += 1;
        if (myTeam === 'alpha') {
          ctf.alphaCaptures = Math.min(ctf.targetCaptures, ctf.alphaCaptures + 1);
        } else {
          ctf.bravoCaptures = Math.min(ctf.targetCaptures, ctf.bravoCaptures + 1);
        }
        soundEngine.playUltimate();
        this.spawnFloatingText(f.x, f.y - 54, 'FLAG CAPTURED!', '#10B981');
        this.activeAnnouncer = {
          id: this.nextAnnouncerId++,
          playerId: f.id,
          playerName: f.name,
          playerIndex: f.playerIndex,
          streakCount: 1,
          title: `${myTeam.toUpperCase()} CAPTURED!`,
          subtitle: `${f.name} scored the enemy flag`,
          remainingSec: 2.6,
          bannerTone: 'streak',
        };
      }
    }

    this.teamScores = {
      alpha: ctf.alphaCaptures,
      bravo: ctf.bravoCaptures,
      targetScore: ctf.targetCaptures,
      label: 'CAPTURES',
    };

    if (ctf.alphaCaptures >= ctf.targetCaptures || ctf.bravoCaptures >= ctf.targetCaptures) {
      this.finishMatch();
    }
  }

  private updateFighterPhysics(
    f: FighterEntity,
    input: {
      left: boolean;
      right: boolean;
      up: boolean;
      upJust: boolean;
      down: boolean;
    },
    dt: number
  ): void {
    const onLadderZone = this.map.ladders.find(
      (l) =>
        f.x >= l.x - 8 &&
        f.x <= l.x + l.w + 8 &&
        f.y + f.h / 2 >= l.y &&
        f.y - f.h / 2 <= l.y + l.h
    );

    if (onLadderZone && (input.up || input.down)) {
      f.onLadder = true;
    } else if (!onLadderZone) {
      f.onLadder = false;
    }

    const speedBonus =
      f.characterId === 'captain_jalebi'
        ? 1.12
        : f.characterId === 'chappal_ninja'
        ? 1.1
        : 1.0;
    const ultSpeedMult = f.characterId === 'captain_jalebi' && f.ultActiveTimer > 0 ? 2.0 : 1.0;
    const buffSpeedMult = f.speedBuffTimer > 0 ? 1.38 : 1.0;
    const chaosFrenzyMult =
      this.chaosState.phase === 'active' && this.chaosState.eventType === 'hyper_frenzy'
        ? 1.5
        : 1.0;
    const lastStandMoveMult = f.isLastStand ? 0.42 : 1.0;

    // Water Pool drag check
    let inWaterNow = false;
    if (this.map.waterPools) {
      for (const wp of this.map.waterPools) {
        if (
          f.x >= wp.x &&
          f.x <= wp.x + wp.w &&
          f.y + f.h / 2 >= wp.y &&
          f.y - f.h / 2 <= wp.y + wp.h
        ) {
          inWaterNow = true;
          break;
        }
      }
    }
    if (inWaterNow && !f.inWater) {
      soundEngine.playWaterSplash();
      this.spawnBurst(f.x, f.y + f.h / 2 - 4, '#7DD3FC', 10, 140, 'splash');
    }
    f.inWater = inWaterNow;
    const waterMult = f.inWater ? 0.78 : 1.0;

    // Check if standing on icy floor
    const standingOnIce = this.isStandingOnIce(f);
    const iceAccelMult = standingOnIce ? 0.56 : 1.0;
    const iceFriction = standingOnIce ? 2.4 : 14.5;

    const botPace = f.isHuman ? 1.0 : 0.84;
    const freezeMoveMult = f.freezeTimer > 0 ? 0.55 : 1.0;
    const minigunMoveMult =
      f.weaponId === 'minigun' && f.activeSlot === 'primary' && f.minigunSpinTimer > 0.05
        ? 0.78
        : 1.0;
    const maxRun =
      BASE_RUN_SPEED *
      speedBonus *
      ultSpeedMult *
      buffSpeedMult *
      chaosFrenzyMult *
      lastStandMoveMult *
      waterMult *
      botPace *
      freezeMoveMult *
      minigunMoveMult;

    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const accel =
      (f.grounded ? MOVE_ACCEL_GROUND * iceAccelMult : MOVE_ACCEL_AIR) *
      speedBonus *
      ultSpeedMult *
      buffSpeedMult *
      chaosFrenzyMult *
      lastStandMoveMult *
      freezeMoveMult *
      minigunMoveMult;

    if (f.dashTimer <= 0) {
      if (moveDir !== 0) {
        f.vx += moveDir * accel * dt;
        if (Math.abs(f.vx) > maxRun) {
          f.vx += (moveDir * maxRun - f.vx) * Math.min(1, dt * 10);
        }
        if (f.grounded) {
          f.walkCycle += dt * (Math.abs(f.vx) / 28);
        }
      } else if (f.grounded) {
        f.vx -= f.vx * Math.min(1, dt * iceFriction);
        if (Math.abs(f.vx) < 4) f.vx = 0;
      } else {
        f.vx -= f.vx * Math.min(1, dt * 1.6);
      }
    }

    if (f.grounded) {
      f.coyoteTimer = 0.12;
    } else {
      f.coyoteTimer = Math.max(0, f.coyoteTimer - dt);
    }

    if (input.down && f.grounded) {
      f.dropThroughTimer = 0.24;
      f.grounded = false;
    }

    f.jetpacking = false;
    const rapidUltFuel = f.characterId === 'captain_jalebi' && f.ultActiveTimer > 0;
    const topperFuel = f.characterId === 'exam_topper';
    const fuelEfficiency =
      this.rules.infiniteFuel || rapidUltFuel
        ? 0.0
        : f.fuelBuffTimer > 0 || f.rapidJetTimer > 0
        ? 0.35
        : 1.0;
    const zeroGravMult =
      this.chaosState.phase === 'active' && this.chaosState.eventType === 'zero_gravity'
        ? 0.3
        : 1.0;
    const gravityAccel = GRAVITY * this.rules.gravityScale * zeroGravMult;

    if (f.onLadder && !f.isLastStand) {
      f.vy = 0;
      if (input.up) f.vy = -210;
      if (input.down) f.vy = 210;
      f.wallSlideDir = 0;
    } else {
      const jetFreezeScale = f.freezeTimer > 0 ? 0.55 : 1.0;
      const maxJetRise = MAX_JETPACK_RISE * jetFreezeScale;
      if (!f.isLastStand) {
        // Jump or Wall-Jump!
        if (input.upJust && f.coyoteTimer > 0) {
          f.vy = JUMP_VELOCITY;
          f.grounded = false;
          f.coyoteTimer = 0;
          f.wallSlideDir = 0;
        } else if (input.upJust && !f.grounded && f.wallSlideDir !== 0) {
          f.vy = JUMP_VELOCITY * 0.96;
          f.vx = -f.wallSlideDir * 365;
          f.wallSlideDir = 0;
          this.spawnBurst(f.x, f.y, '#CBD5E1', 5, 110);
        } else if (input.up && f.fuel > 0 && f.vy > maxJetRise && f.empDisableTimer <= 0) {
          f.jetpacking = true;
          f.vy += JETPACK_ACCEL * jetFreezeScale * dt;
          if (f.vy < maxJetRise) f.vy = maxJetRise;
          f.fuel = Math.max(0, f.fuel - 36 * fuelEfficiency * dt);
          this.spawnJetpackFlame(f);
          if (f.isHuman) soundEngine.playJetpack();
        } else if (input.up && f.empDisableTimer > 0 && Math.random() < 0.14) {
          this.spawnBurst(f.x - f.facing * 8, f.y + 4, '#22D3EE', 1, 80);
        }
      }

      if (!f.jetpacking) {
        f.vy = Math.min(MAX_FALL_SPEED, f.vy + gravityAccel * dt);
      }
    }

    // Grappling Hook reel force
    if (f.grappleActive) {
      const gx = f.grappleX - f.x;
      const gy = f.grappleY - f.y;
      const gDist = Math.hypot(gx, gy);
      if (gDist < 34) {
        f.grappleActive = false;
      } else {
        const pull = 1650;
        f.vx += (gx / gDist) * pull * dt;
        f.vy += (gy / gDist) * pull * dt;
        f.vx = Math.max(-720, Math.min(720, f.vx));
        f.vy = Math.max(-680, Math.min(680, f.vy));
        f.grounded = false;
      }
    }

    // Updraft Wind Vents
    for (const wv of this.windVents) {
      if (
        f.x + f.w / 2 > wv.x &&
        f.x - f.w / 2 < wv.x + wv.w &&
        f.y <= wv.y + 10 &&
        f.y >= wv.y - wv.height
      ) {
        f.vy = Math.max(-420, f.vy - 1850 * dt);
        f.grounded = false;
      }
    }

    if (this.rules.infiniteFuel) {
      f.fuel = f.maxFuel;
    } else if (!f.jetpacking) {
      const regen =
        rapidUltFuel
          ? 75
          : f.rapidJetTimer > 0
          ? 64
          : f.fuelBuffTimer > 0
          ? 44
          : topperFuel
          ? (f.grounded ? 42 : 16)
          : f.grounded
          ? 32
          : 11;
      f.fuel = Math.min(f.maxFuel, f.fuel + regen * dt);
    }

    // Horizontal movement & solid collision (track wallSlideDir)
    f.x += f.vx * dt;
    const halfW = f.w / 2;
    const halfH = f.h / 2;
    let collideXDir: -1 | 0 | 1 = 0;
    const activePlatforms = this.getActivePlatforms();

    for (const p of activePlatforms) {
      if (p.kind === 'oneway') continue;
      if (this.rectOverlap(f.x - halfW, f.y - halfH, f.w, f.h, p.x, p.y, p.w, p.h)) {
        if (f.vx > 0) {
          f.x = p.x - halfW;
          collideXDir = 1;
        } else if (f.vx < 0) {
          f.x = p.x + p.w + halfW;
          collideXDir = -1;
        }
        f.vx = 0;
      }
    }

    for (const tw of this.tempWalls) {
      if (this.rectOverlap(f.x - halfW, f.y - halfH, f.w, f.h, tw.x, tw.y, tw.w, tw.h)) {
        if (f.vx > 0) {
          f.x = tw.x - halfW;
          collideXDir = 1;
        } else if (f.vx < 0) {
          f.x = tw.x + tw.w + halfW;
          collideXDir = -1;
        }
        f.vx = 0;
      }
    }

    for (const dw of this.destructibleWalls) {
      if (!dw.alive) continue;
      if (this.rectOverlap(f.x - halfW, f.y - halfH, f.w, f.h, dw.x, dw.y, dw.w, dw.h)) {
        if (f.vx > 0) {
          f.x = dw.x - halfW;
          collideXDir = 1;
        } else if (f.vx < 0) {
          f.x = dw.x + dw.w + halfW;
          collideXDir = -1;
        }
        f.vx = 0;
      }
    }

    f.x = Math.max(42 + halfW, Math.min(this.map.width - 42 - halfW, f.x));

    // Vertical movement & platform landing
    const prevBottom = f.y + halfH;
    f.y += f.vy * dt;
    f.grounded = false;

    for (const p of activePlatforms) {
      if (p.kind === 'oneway') {
        if (
          f.dropThroughTimer <= 0 &&
          f.vy >= 0 &&
          prevBottom <= p.y + 8 &&
          f.x + halfW > p.x + 2 &&
          f.x - halfW < p.x + p.w - 2 &&
          f.y + halfH >= p.y &&
          f.y + halfH <= p.y + p.h + 10
        ) {
          f.y = p.y - halfH;
          f.vy = 0;
          f.grounded = true;
        }
        continue;
      }

      if (this.rectOverlap(f.x - halfW, f.y - halfH, f.w, f.h, p.x, p.y, p.w, p.h)) {
        if (f.vy > 0) {
          f.y = p.y - halfH;
          f.vy = 0;
          f.grounded = true;
        } else if (f.vy < 0) {
          f.y = p.y + p.h + halfH;
          f.vy = 0;
        }
      }
    }

    // Breakable Glass Floors (oneway when alive)
    for (const gf of this.glassFloors) {
      if (!gf.alive) continue;
      if (
        f.dropThroughTimer <= 0 &&
        f.vy >= 0 &&
        prevBottom <= gf.y + 8 &&
        f.x + halfW > gf.x + 2 &&
        f.x - halfW < gf.x + gf.w - 2 &&
        f.y + halfH >= gf.y &&
        f.y + halfH <= gf.y + gf.h + 10
      ) {
        f.y = gf.y - halfH;
        f.vy = 0;
        f.grounded = true;
      }
    }

    // Moving Subway Train riding / side-impact KO
    if (this.subwayTrain && this.subwayTrain.active) {
      const tr = this.subwayTrain;
      const trTop = tr.y - tr.h;
      if (
        f.vy >= 0 &&
        prevBottom <= trTop + 14 &&
        f.x + halfW > tr.x &&
        f.x - halfW < tr.x + tr.w &&
        f.y + halfH >= trTop &&
        f.y + halfH <= trTop + 26
      ) {
        f.y = trTop - halfH;
        f.vy = 0;
        f.x += tr.vx * dt;
        f.grounded = true;
      } else if (
        !tr.hitIds.has(f.id) &&
        this.rectOverlap(f.x - halfW, f.y - halfH, f.w, f.h, tr.x, trTop + 6, tr.w, tr.h - 6)
      ) {
        tr.hitIds.add(f.id);
        f.vx = tr.dir * 620;
        f.vy = -340;
        this.spawnFloatingText(f.x, f.y - 38, 'TRAIN HIT!', '#EF4444');
        this.applyDamage(f, 140, f.lastHitById || 'arena', 'train', false);
      }
    }

    for (const dw of this.destructibleWalls) {
      if (!dw.alive) continue;
      if (this.rectOverlap(f.x - halfW, f.y - halfH, f.w, f.h, dw.x, dw.y, dw.w, dw.h)) {
        if (f.vy > 0) {
          f.y = dw.y - halfH;
          f.vy = 0;
          f.grounded = true;
        } else if (f.vy < 0) {
          f.y = dw.y + dw.h + halfH;
          f.vy = 0;
        }
      }
    }

    for (const r of this.map.ramps) {
      const minX = Math.min(r.x1, r.x2);
      const maxX = Math.max(r.x1, r.x2);
      if (f.x >= minX && f.x <= maxX) {
        const t = (f.x - r.x1) / Math.max(1, r.x2 - r.x1);
        const rampY = r.y1 + t * (r.y2 - r.y1);
        if (f.vy >= 0 && f.y + halfH >= rampY - 4 && f.y + halfH <= rampY + 24) {
          f.y = rampY - halfH;
          f.vy = 0;
          f.grounded = true;
        }
      }
    }

    // Pneumatic Jump Pads
    for (const jp of this.jumpPads) {
      if (
        f.x + halfW > jp.x &&
        f.x - halfW < jp.x + jp.w &&
        f.y + halfH >= jp.y - 12 &&
        f.y - halfH <= jp.y + 8 &&
        f.vy >= -80
      ) {
        f.vy = -760;
        f.grounded = false;
        jp.compress = 1;
        soundEngine.playJumpPad();
        this.spawnBurst(jp.x + jp.w / 2, jp.y - 4, '#22D3EE', 10, 180);
        this.pendingNetEvents.push({ kind: 'jump_pad', x: jp.x + jp.w / 2, y: jp.y });
      }
    }

    // Two-Way Teleportation Portals
    if (f.portalCooldown <= 0) {
      for (const prt of this.portals) {
        if (Math.hypot(f.x - prt.aX, f.y - prt.aY) <= prt.radius + 8) {
          f.x = prt.bX;
          f.y = prt.bY - 8;
          f.portalCooldown = 0.85;
          f.grappleActive = false;
          soundEngine.playPortalWarp();
          this.spawnBurst(prt.aX, prt.aY, '#38BDF8', 10, 170);
          this.spawnBurst(prt.bX, prt.bY, '#FB923C', 10, 170);
          this.pendingNetEvents.push({ kind: 'portal_warp', x: prt.bX, y: prt.bY });
          break;
        } else if (Math.hypot(f.x - prt.bX, f.y - prt.bY) <= prt.radius + 8) {
          f.x = prt.aX;
          f.y = prt.aY - 8;
          f.portalCooldown = 0.85;
          f.grappleActive = false;
          soundEngine.playPortalWarp();
          this.spawnBurst(prt.bX, prt.bY, '#FB923C', 10, 170);
          this.spawnBurst(prt.aX, prt.aY, '#38BDF8', 10, 170);
          this.pendingNetEvents.push({ kind: 'portal_warp', x: prt.aX, y: prt.aY });
          break;
        }
      }
    }

    // Wall-Sliding state check
    if (!f.grounded && !f.onLadder && f.vy > 45 && collideXDir !== 0 && moveDir === collideXDir) {
      f.wallSlideDir = collideXDir;
      f.vy = Math.min(f.vy, 118);
      if (Math.random() < 0.35) {
        this.spawnBurst(f.x + collideXDir * 14, f.y + 8, '#CBD5E1', 1, 45);
      }
    } else if (f.grounded || moveDir === 0) {
      f.wallSlideDir = 0;
    }

    if (f.y > this.map.height - 60) {
      f.y = this.map.height - 60 - halfH;
      f.vy = 0;
      f.grounded = true;
    }

    if (f.grounded && f.slamPending) {
      f.slamPending = false;
      soundEngine.playSlamImpact();
      for (const cam of this.cameras) {
        cam.shake = Math.max(cam.shake, 14);
      }
      this.spawnRing(f.x, f.y + halfH, 260, '#F97316');
      this.spawnDebris(f.x, f.y + halfH, '#78350F', 14, 'debris');
      this.spawnFloatingText(f.x, f.y - 36, 'SEISMIC SLAM!', '#F97316');
      for (const other of this.fighters) {
        if (other.id === f.id || !other.alive || this.isFriendly(f, other)) continue;
        const dist = Math.hypot(other.x - f.x, other.y - f.y);
        if (dist <= 280) {
          other.vy = -310;
          other.vx += (other.x >= f.x ? 1 : -1) * 340;
          other.stunTimer = Math.max(other.stunTimer, 0.9);
          this.spawnFloatingText(other.x, other.y - 40, 'SMASHED!', '#FACC15');
          this.applyDamage(other, 55, f.id, 'ultimate', false);
        }
      }
    }
  }

  private isStandingOnIce(f: FighterEntity): boolean {
    if (!f.grounded) return false;
    const feetY = f.y + f.h / 2;
    for (const p of this.getActivePlatforms()) {
      if (p.style !== 'ice') continue;
      if (f.x + f.w / 2 > p.x && f.x - f.w / 2 < p.x + p.w && Math.abs(feetY - p.y) <= 5) {
        return true;
      }
    }
    return false;
  }

  private updateFighterWeapon(
    f: FighterEntity,
    input: { shoot: boolean; reload: boolean },
    dt: number
  ): void {
    const frenzyRate =
      this.chaosState.phase === 'active' && this.chaosState.eventType === 'hyper_frenzy'
        ? 1.5
        : 1.0;
    f.fireCooldownMs = Math.max(0, f.fireCooldownMs - dt * 1000 * frenzyRate);

    // Dual-Wield Firing Branch
    if (f.dualWield && !f.isLastStand) {
      f.minigunSpinTimer = Math.max(0, f.minigunSpinTimer - dt * 2.2);
      if (input.shoot && f.fireCooldownMs <= 0) {
        const isSmgs = f.dualWield === 'dual_smgs';
        f.fireCooldownMs = isSmgs ? 88 : 205;
        this.fireDualWieldRound(f);
      }
      return;
    }

    // Active Melee Slot (Key 3): Fire input swings the equipped melee weapon
    if (f.activeSlot === 'melee' && !f.isLastStand) {
      f.minigunSpinTimer = Math.max(0, f.minigunSpinTimer - dt * 2.2);
      if (input.shoot && f.meleeCooldownTimer <= 0) {
        this.performMeleeStrike(f);
      }
      return;
    }

    const w = WEAPONS[f.weaponId];
    const maxClip = this.getEffectiveClipSize(f, f.weaponId);

    if (f.isReloading) {
      f.minigunSpinTimer = Math.max(0, f.minigunSpinTimer - dt * 1.8);
      f.reloadTimerMs -= dt * 1000 * frenzyRate;
      if (f.reloadTimerMs <= 0) {
        f.isReloading = false;
        f.ammo = maxClip;
      }
      return;
    }

    if (
      this.rules.gameMode !== 'one_in_chamber' &&
      ((input.reload && f.ammo < maxClip) || (input.shoot && f.ammo <= 0))
    ) {
      f.minigunSpinTimer = Math.max(0, f.minigunSpinTimer - dt * 1.8);
      f.isReloading = true;
      f.reloadTimerMs = this.getEffectiveReloadMs(f, f.weaponId);
      f.burstRemaining = 0;
      if (f.isHuman) soundEngine.playReload();
      return;
    }

    if (this.rules.gameMode === 'one_in_chamber' && f.ammo <= 0 && input.shoot && f.meleeCooldownTimer <= 0) {
      this.performMeleeStrike(f);
      return;
    }

    if (w.spinUpMs && input.shoot && f.ammo > 0) {
      f.minigunSpinTimer = Math.min(w.spinUpMs / 1000, f.minigunSpinTimer + dt * frenzyRate);
    } else {
      f.minigunSpinTimer = Math.max(0, f.minigunSpinTimer - dt * 1.8);
    }
    const canFireSpin = !w.spinUpMs || f.minigunSpinTimer >= w.spinUpMs / 1000;

    if (f.burstRemaining > 0) {
      f.burstTimerMs -= dt * 1000 * frenzyRate;
      if (f.burstTimerMs <= 0 && f.ammo > 0) {
        this.fireSingleWeaponRound(f);
        f.burstRemaining -= 1;
        f.burstTimerMs = w.burstIntervalMs || 65;
      }
      return;
    }

    if (input.shoot && f.fireCooldownMs <= 0 && f.ammo > 0 && canFireSpin) {
      this.fireSingleWeaponRound(f);
      f.fireCooldownMs = w.fireRateMs;
      if (w.burstCount && w.burstCount > 1 && f.ammo > 0) {
        f.burstRemaining = w.burstCount - 1;
        f.burstTimerMs = w.burstIntervalMs || 65;
      }
    }
  }

  private fireDualWieldRound(f: FighterEntity): void {
    const isSmgs = f.dualWield === 'dual_smgs';
    const spread = isSmgs ? 0.14 : 0.085;
    const dmg = isSmgs ? 11 : 17;
    const speed = isSmgs ? 1050 : 1140;
    const dmgMult = f.characterId === 'agent_404' && f.ultActiveTimer > 0 ? 1.6 : 1;

    f.dualWieldAmmo = Math.max(0, f.dualWieldAmmo - 2);
    f.muzzleFlashTimer = 0.055;
    f.recoilKick = 7;
    f.usedNonSniper = true;

    const perpX = -Math.sin(f.aimAngle);
    const perpY = Math.cos(f.aimAngle);
    for (const side of [-5, 5]) {
      const ang = f.aimAngle + (Math.random() - 0.5) * spread;
      const sx = f.x + Math.cos(f.aimAngle) * 24 + perpX * side;
      const sy = f.y - 4 + Math.sin(f.aimAngle) * 24 + perpY * side;
      this.projectiles.push({
        id: this.nextProjectileId++,
        ownerId: f.id,
        weaponId: f.weaponId,
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        damage: Math.round(dmg * dmgMult),
        explosionRadius: 0,
        color: isSmgs ? '#FB7185' : '#C084FC',
        life: 1.5,
        isRocket: false,
        killFeedWeaponOverride: f.dualWield!,
      });
      this.spawnCasing(f.x, f.y - 6, f.facing);
    }

    soundEngine.playShoot(isSmgs ? 'm4a1' : 'ak', 0.8);
    if (f.dualWieldAmmo <= 0) {
      f.dualWield = null;
      this.spawnFloatingText(f.x, f.y - 42, 'DUAL-WIELD EMPTY', '#94A3B8');
    }
  }

  private fireSingleWeaponRound(f: FighterEntity): void {
    const w = WEAPONS[f.weaponId];
    if (w.category !== 'Sniper') {
      f.usedNonSniper = true;
    }

    f.ammo = Math.max(0, f.ammo - 1);
    f.muzzleFlashTimer = 0.06;
    const recoilScale = f.characterId === 'agent_404' ? 0.65 : 1.0;
    f.recoilKick = Math.min(11, (w.recoil / 28) * recoilScale);

    const glitchDmgMult = f.characterId === 'agent_404' && f.ultActiveTimer > 0 ? 1.6 : 1;
    const spreadMult = f.characterId === 'agent_404' ? 0.65 : 1.0;
    const oneHitSniper = this.rules.oneHitSnipers && w.category === 'Sniper';
    const oneHitChamber = this.rules.gameMode === 'one_in_chamber';
    const roundDmg = oneHitChamber ? 240 : oneHitSniper ? 240 : Math.round(w.damage * glitchDmgMult);
    const rocketBlast =
      w.explosionRadius > 0 && f.characterId === 'prof_jugaad'
        ? Math.round(w.explosionRadius * 1.2)
        : w.explosionRadius;
    const velBonus = f.characterId === 'aunty_cctv' ? 1.12 : 1.0;

    const muzzleX = f.x + Math.cos(f.aimAngle) * (w.length + 4);
    const muzzleY = f.y - 4 + Math.sin(f.aimAngle) * (w.length + 4);

    if (
      f.weaponId !== 'bomberier' &&
      f.weaponId !== 'plasma_repeater' &&
      f.weaponId !== 'freeze_ray' &&
      f.weaponId !== 'crossbow_launcher' &&
      f.weaponId !== 'orbital_laser'
    ) {
      this.spawnCasing(f.x, f.y - 6, f.facing);
    }

    for (let i = 0; i < w.pellets; i++) {
      const ang = f.aimAngle + (Math.random() - 0.5) * w.spreadRad * spreadMult;
      const spd = w.projectileSpeed * (0.96 + Math.random() * 0.08) * velBonus;
      this.projectiles.push({
        id: this.nextProjectileId++,
        ownerId: f.id,
        weaponId: f.weaponId,
        x: muzzleX,
        y: muzzleY,
        prevX: f.x,
        prevY: f.y - 4,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        damage: roundDmg,
        explosionRadius: rocketBlast,
        color: w.bulletColor,
        life: w.id === 'bomberier' ? 3.2 : w.stickyExplosive ? 2.6 : w.noDrop ? 1.5 : 1.8,
        isRocket: w.id === 'bomberier',
        noDrop: w.noDrop,
        knockback: w.knockback,
        stickyExplosive: w.stickyExplosive,
        freezeDurationSec: w.freezeDurationSec,
      });
    }

    if (f.isBoss) {
      const bossAng = f.aimAngle + (Math.random() > 0.5 ? 0.14 : -0.14);
      this.projectiles.push({
        id: this.nextProjectileId++,
        ownerId: f.id,
        weaponId: f.weaponId,
        x: muzzleX,
        y: muzzleY,
        prevX: f.x,
        prevY: f.y - 4,
        vx: Math.cos(bossAng) * 1140,
        vy: Math.sin(bossAng) * 1140,
        damage: 9,
        explosionRadius: 0,
        color: '#22D3EE',
        life: 1.4,
        isRocket: false,
      });
    }

    const p1 = this.fighters[0];
    const distToCam = p1 ? Math.hypot(f.x - p1.x, f.y - p1.y) : 0;
    const vol = Math.max(0.18, 1 - distToCam / 1700);
    soundEngine.playShoot(f.weaponId, vol);
    this.pendingNetEvents.push({ kind: 'shoot', weaponId: f.weaponId, x: f.x, y: f.y });

    f.vx -= Math.cos(f.aimAngle) * w.recoil * 0.16 * recoilScale;
    this.addCameraShake(f.playerIndex, Math.min(6, w.recoil / 50));

    if (f.ammo <= 0 && !oneHitChamber) {
      f.isReloading = true;
      f.reloadTimerMs = this.getEffectiveReloadMs(f, f.weaponId);
      f.burstRemaining = 0;
      if (f.isHuman) soundEngine.playReload();
    }
  }

  private updateProjectiles(dt: number): void {
    const kept: ProjectileEntity[] = [];

    for (const proj of this.projectiles) {
      if (proj.stuck) {
        proj.prevX = proj.x;
        proj.prevY = proj.y;
        proj.stuckTimer = (proj.stuckTimer ?? 0.65) - dt;
        if (proj.stuckFighterId) {
          const tgt = this.fighters.find((ft) => ft.id === proj.stuckFighterId);
          if (tgt && tgt.alive) {
            proj.x = tgt.x + (proj.stuckOffsetX || 0);
            proj.y = tgt.y + (proj.stuckOffsetY || 0);
          } else {
            proj.stuckTimer = 0;
          }
        }
        if ((proj.stuckTimer ?? 0) <= 0) {
          const kWeapon: KillFeedWeaponId = proj.fromUltimate ? 'ultimate' : proj.weaponId;
          this.triggerExplosion(
            proj.x,
            proj.y,
            proj.explosionRadius || 105,
            proj.damage,
            proj.ownerId,
            kWeapon
          );
          this.hitstopTimer = 0.025;
        } else {
          kept.push(proj);
        }
        continue;
      }

      proj.prevX = proj.x;
      proj.prevY = proj.y;

      if (proj.isHoming && proj.targetId) {
        const tgt = this.fighters.find((ft) => ft.id === proj.targetId && ft.alive);
        if (tgt) {
          const desired = Math.atan2(tgt.y - proj.y, tgt.x - proj.x);
          const cur = Math.atan2(proj.vy, proj.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turned = cur + Math.max(-dt * 4.5, Math.min(dt * 4.5, diff));
          const spd = Math.hypot(proj.vx, proj.vy);
          proj.vx = Math.cos(turned) * spd;
          proj.vy = Math.sin(turned) * spd;
        }
      }

      if (!proj.noDrop && proj.stickyExplosive) {
        proj.vy += 260 * dt;
      }

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;

      if (proj.isRocket && Math.random() < 0.75) {
        this.spawnBurst(proj.x, proj.y, proj.isHoming ? '#FACC15' : '#94A3B8', 1, 35, 'smoke');
      }

      let hit = false;
      let firewallBlocked = false;
      let stuckTargetFighter: FighterEntity | null = null;
      const owner = this.fighters.find((ft) => ft.id === proj.ownerId);

      // Baba Wi-Fi Firewall Shield blocks incoming projectiles in 38px radius
      for (const f of this.fighters) {
        if (!f.alive || f.id === proj.ownerId || this.isFriendly(owner, f)) continue;
        if (f.characterId === 'baba_wifi' && f.ultActiveTimer > 0) {
          if (Math.hypot(proj.x - f.x, proj.y - (f.y - 4)) <= 38) {
            hit = true;
            firewallBlocked = true;
            this.spawnBurst(proj.x, proj.y, '#22D3EE', 6, 150);
            if (Math.random() < 0.25) {
              this.spawnFloatingText(f.x, f.y - 40, 'BLOCKED!', '#22D3EE');
            }
            break;
          }
        }
      }

      // Two-Way Portal bullet teleportation
      const pRef = proj as ProjectileEntity & { warped?: boolean };
      if (!pRef.warped) {
        for (const prt of this.portals) {
          if (Math.hypot(proj.x - prt.aX, proj.y - prt.aY) < prt.radius) {
            pRef.warped = true;
            proj.x = prt.bX;
            proj.y = prt.bY;
            proj.prevX = proj.x;
            proj.prevY = proj.y;
            soundEngine.playPortalWarp();
            this.spawnBurst(proj.x, proj.y, '#FB923C', 6, 120);
            break;
          } else if (Math.hypot(proj.x - prt.bX, proj.y - prt.bY) < prt.radius) {
            pRef.warped = true;
            proj.x = prt.aX;
            proj.y = prt.aY;
            proj.prevX = proj.x;
            proj.prevY = proj.y;
            soundEngine.playPortalWarp();
            this.spawnBurst(proj.x, proj.y, '#38BDF8', 6, 120);
            break;
          }
        }
      }

      if (!hit && (proj.x < 36 || proj.x > this.map.width - 36 || proj.y < 32 || proj.y > this.map.height)) {
        if (proj.isChappal && (proj.bouncesLeft || 0) > 0) {
          proj.bouncesLeft = (proj.bouncesLeft || 1) - 1;
          if (proj.x < 36 || proj.x > this.map.width - 36) proj.vx = -proj.vx;
          if (proj.y < 32 || proj.y > this.map.height) proj.vy = -proj.vy;
          proj.x = Math.max(38, Math.min(this.map.width - 38, proj.x));
          proj.y = Math.max(34, Math.min(this.map.height - 10, proj.y));
          this.spawnBurst(proj.x, proj.y, '#FACC15', 6, 140);
        } else {
          hit = true;
        }
      }

      if (!hit) {
        for (const p of this.getActivePlatforms()) {
          if (p.kind === 'oneway') continue;
          if (this.pointInRect(proj.x, proj.y, p.x, p.y, p.w, p.h)) {
            if (proj.isChappal && (proj.bouncesLeft || 0) > 0) {
              proj.bouncesLeft = (proj.bouncesLeft || 1) - 1;
              if (proj.prevX < p.x || proj.prevX > p.x + p.w) {
                proj.vx = -proj.vx;
              } else {
                proj.vy = -proj.vy;
              }
              proj.x = proj.prevX;
              proj.y = proj.prevY;
              this.spawnBurst(proj.x, proj.y, '#FACC15', 6, 140);
            } else {
              hit = true;
              this.spawnBurst(proj.x, proj.y, '#CBD5E1', 5, 130);
            }
            break;
          }
        }
      }

      if (!hit) {
        for (const gf of this.glassFloors) {
          if (!gf.alive) continue;
          if (this.pointInRect(proj.x, proj.y, gf.x, gf.y, gf.w, gf.h)) {
            hit = true;
            this.damageGlassFloor(gf);
            break;
          }
        }
      }

      if (!hit) {
        for (const tw of this.tempWalls) {
          if (this.pointInRect(proj.x, proj.y, tw.x, tw.y, tw.w, tw.h)) {
            if (proj.isChappal && (proj.bouncesLeft || 0) > 0) {
              proj.bouncesLeft = (proj.bouncesLeft || 1) - 1;
              proj.vx = -proj.vx;
              proj.x = proj.prevX;
              this.spawnBurst(proj.x, proj.y, '#FACC15', 6, 140);
            } else {
              hit = true;
              tw.hp -= proj.damage;
              this.spawnBurst(proj.x, proj.y, '#FACC15', 6, 150);
            }
            break;
          }
        }
      }

      if (!hit) {
        for (const dw of this.destructibleWalls) {
          if (!dw.alive) continue;
          if (this.pointInRect(proj.x, proj.y, dw.x, dw.y, dw.w, dw.h)) {
            hit = true;
            if (!proj.stickyExplosive) {
              this.damageDestructibleWall(dw, proj.damage, proj.ownerId);
            }
            this.spawnBurst(proj.x, proj.y, dw.style === 'glass' ? '#7DD3FC' : '#F59E0B', 6, 150);
            break;
          }
        }
      }

      if (!hit) {
        for (const b of this.barrels) {
          if (!b.alive) continue;
          if (this.pointInRect(proj.x, proj.y, b.x - b.w / 2, b.y - b.h, b.w, b.h)) {
            hit = true;
            if (!proj.stickyExplosive) {
              this.damageBarrel(b, proj.damage, proj.ownerId, proj.vx, proj.vy);
            }
            break;
          }
        }
      }

      if (!hit) {
        for (const f of this.fighters) {
          if (!f.alive || f.id === proj.ownerId || this.isFriendly(owner, f)) continue;
          if (
            this.pointInRect(
              proj.x,
              proj.y,
              f.x - f.w / 2 - 2,
              f.y - f.h / 2 - 8,
              f.w + 4,
              f.h + 8
            )
          ) {
            hit = true;
            if (proj.stickyExplosive) {
              stuckTargetFighter = f;
            } else if (!proj.isRocket) {
              const isHeadshot = !proj.isChappal && proj.y <= f.y - 6;
              const finalDmg = isHeadshot ? Math.round(proj.damage * 1.5) : proj.damage;
              const kWeapon: KillFeedWeaponId =
                proj.killFeedWeaponOverride || (proj.fromUltimate ? 'ultimate' : proj.weaponId);

              if (proj.isChappal) {
                f.stunTimer = Math.max(f.stunTimer, 1.4);
                this.spawnFloatingText(f.x, f.y - 42, 'CHAPPALED!', '#FACC15');
                this.spawnBurst(proj.x, proj.y, '#FACC15', 14, 210);
              } else {
                this.spawnBurst(proj.x, proj.y, isHeadshot ? '#FACC15' : '#EF4444', isHeadshot ? 10 : 6, 160);
              }

              if (proj.knockback) {
                const hitAng = Math.atan2(proj.vy, proj.vx);
                f.vx += Math.cos(hitAng) * proj.knockback;
                f.vy = Math.min(f.vy - 90, -140);
              }

              if (proj.freezeDurationSec) {
                f.freezeTimer = Math.max(f.freezeTimer, proj.freezeDurationSec);
                this.spawnBurst(proj.x, proj.y, '#7DD3FC', 7, 130);
              }

              this.applyDamage(f, finalDmg, proj.ownerId, kWeapon, isHeadshot);

              if (WEAPONS[proj.weaponId].category === 'Sniper' && !proj.isChappal) {
                this.hitstopTimer = 0.025;
              }
            }
            break;
          }
        }
      }

      if (hit && proj.stickyExplosive && !firewallBlocked) {
        proj.stuck = true;
        proj.stuckTimer = 0.65;
        proj.vx = 0;
        proj.vy = 0;
        if (stuckTargetFighter) {
          proj.stuckFighterId = stuckTargetFighter.id;
          proj.stuckOffsetX = proj.x - stuckTargetFighter.x;
          proj.stuckOffsetY = proj.y - stuckTargetFighter.y;
        }
        soundEngine.playPlasmaStick();
        this.spawnBurst(proj.x, proj.y, '#FB7185', 6, 120);
        kept.push(proj);
        continue;
      }

      if (hit && proj.isRocket && !firewallBlocked) {
        const kWeapon: KillFeedWeaponId = proj.fromUltimate ? 'ultimate' : proj.weaponId;
        this.triggerExplosion(
          proj.x,
          proj.y,
          proj.explosionRadius,
          proj.damage,
          proj.ownerId,
          kWeapon
        );
        this.hitstopTimer = 0.025;
      }

      if (!hit && proj.life > 0) {
        kept.push(proj);
      }
    }

    this.projectiles = kept;
  }

  private damageBarrel(
    b: BarrelEntity,
    dmg: number,
    attackerId: string,
    shotVx?: number,
    shotVy?: number
  ): void {
    b.hitFlashTimer = 0.1;
    if (!b.launched && shotVx !== undefined && shotVy !== undefined && b.hp > 0) {
      const spd = Math.max(1, Math.hypot(shotVx, shotVy));
      b.launched = true;
      b.launcherId = attackerId;
      b.fuseTimer = 1.4;
      b.vx = (shotVx / spd) * 460;
      b.vy = Math.min(-140, (shotVy / spd) * 420 - 120);
      this.spawnFloatingText(b.x, b.y - 42, 'ROCKET BARREL!', '#F97316');
      return;
    }

    b.hp -= dmg;
    if (b.hp <= 0) {
      b.alive = false;
      b.launched = false;
      b.respawnTimer = 15;
      this.spawnRandomSupplyDrop(b.x, b.y - 18);
      this.triggerExplosion(b.x, b.y - b.h / 2, 138, 86, attackerId, 'barrel');
    }
  }

  private damageDestructibleWall(
    dw: DestructibleWallEntity,
    dmg: number,
    attackerId: string
  ): void {
    if (!dw.alive) return;
    dw.hp -= dmg;
    dw.hitFlashTimer = 0.1;
    if (dw.hp <= 0) {
      dw.alive = false;
      dw.respawnTimer = dw.respawnSec;
      const attacker = this.fighters.find((f) => f.id === attackerId);
      if (attacker) {
        attacker.coverDestroyedCount += 1;
      }

      if (dw.style === 'glass') {
        soundEngine.playGlassShatter();
        this.spawnDebris(dw.x + dw.w / 2, dw.y + dw.h / 2, '#BAE6FD', 16, 'glass');
        this.pendingNetEvents.push({
          kind: 'glass_shatter',
          x: dw.x,
          y: dw.y,
          w: dw.w,
          h: dw.h,
        });
      } else {
        soundEngine.playExplosion(0.45);
        const debrisColor =
          dw.style === 'timber' || dw.style === 'crate_wood' || dw.style === 'crate_cover'
            ? '#92400E'
            : dw.style === 'sandstone'
            ? '#D97706'
            : '#8A4E44';
        this.spawnDebris(dw.x + dw.w / 2, dw.y + dw.h / 2, debrisColor, 14, 'debris');
        this.spawnBurst(dw.x + dw.w / 2, dw.y + dw.h / 2, '#CBD5E1', 10, 140, 'smoke');
        this.pendingNetEvents.push({
          kind: 'crumble',
          x: dw.x,
          y: dw.y,
          w: dw.w,
          h: dw.h,
        });
      }

      // Crates always drop a powerup or dual-wield; other walls 65%
      if (dw.style === 'crate_wood' || Math.random() < 0.65) {
        this.spawnRandomSupplyDrop(dw.x + dw.w / 2, dw.y + dw.h / 2);
      }
    }
  }

  private spawnRandomSupplyDrop(x: number, y: number): void {
    const roll = Math.random();
    if (roll < 0.32 && this.weaponDrops.length < 4) {
      const chosen =
        PRIMARY_PICKUP_WEAPONS[Math.floor(Math.random() * PRIMARY_PICKUP_WEAPONS.length)];
      this.weaponDrops.push({
        id: this.nextWeaponDropId++,
        x,
        y: y - 10,
        vx: (Math.random() - 0.5) * 140,
        vy: -230,
        weaponId: chosen,
        life: 24,
        maxLife: 24,
        bobPhase: Math.random() * Math.PI * 2,
      });
      return;
    }

    if (roll < 0.56) {
      const dwTypes: DualWieldType[] = ['dual_pistols', 'dual_smgs'];
      const chosen = dwTypes[Math.floor(Math.random() * dwTypes.length)];
      this.dualWieldDrops.push({
        id: this.nextDualDropId++,
        x,
        y: y - 10,
        vx: (Math.random() - 0.5) * 140,
        vy: -220,
        type: chosen,
        life: 20,
        maxLife: 20,
        bobPhase: Math.random() * Math.PI * 2,
      });
      return;
    }

    if (Math.random() < 0.4) {
      const mTypes: MysteryPowerUpType[] = ['shrink', 'mega_size', 'bubble_shield', 'holo_decoy'];
      const chosen = mTypes[Math.floor(Math.random() * mTypes.length)];
      this.powerUps.push({
        id: this.nextPowerUpId++,
        x,
        y: y - 10,
        vx: (Math.random() - 0.5) * 140,
        vy: -230,
        type: chosen,
        life: 20,
        maxLife: 20,
        bobPhase: Math.random() * Math.PI * 2,
      });
      return;
    }

    const types: PowerUpType[] = ['speed', 'fuel_efficiency', 'shield'];
    const chosen = types[Math.floor(Math.random() * types.length)];
    this.powerUps.push({
      id: this.nextPowerUpId++,
      x,
      y: y - 10,
      vx: (Math.random() - 0.5) * 140,
      vy: -230,
      type: chosen,
      life: 18,
      maxLife: 18,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  private spawnMidMapWeaponDrop(): void {
    const centerZone =
      this.map.hardpoints[Math.floor(Math.random() * this.map.hardpoints.length)] ||
      this.map.podiumZone;
    const x = centerZone
      ? centerZone.x + centerZone.w / 2 + (Math.random() - 0.5) * 120
      : this.map.width / 2;
    const y = centerZone ? centerZone.y + centerZone.h - 42 : 240;
    const chosen =
      PRIMARY_PICKUP_WEAPONS[Math.floor(Math.random() * PRIMARY_PICKUP_WEAPONS.length)];
    this.weaponDrops.push({
      id: this.nextWeaponDropId++,
      x,
      y,
      vx: 0,
      vy: -140,
      weaponId: chosen,
      life: 24,
      maxLife: 24,
      bobPhase: Math.random() * Math.PI * 2,
    });
    this.spawnFloatingText(x, y - 28, `${WEAPONS[chosen].shortName.toUpperCase()} DROP!`, '#22D3EE');
  }

  private triggerExplosion(
    x: number,
    y: number,
    radius: number,
    maxDamage: number,
    attackerId: string,
    weaponId: KillFeedWeaponId
  ): void {
    soundEngine.playExplosion(1);
    this.spawnExplosionVisual(x, y, radius);
    this.scorchDecals.push({ x, y: y + 6, radius: radius * 0.55, alpha: 0.72 });
    if (this.scorchDecals.length > 26) this.scorchDecals.shift();

    this.pendingNetEvents.push({ kind: 'explosion', x, y });

    for (const cam of this.cameras) {
      const dist = Math.hypot(cam.x - x, cam.y - y);
      if (dist < 750) {
        cam.shake = Math.max(cam.shake, (1 - dist / 750) * 14);
      }
    }

    for (const f of this.fighters) {
      if (!f.alive) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d <= radius) {
        const falloff = 1 - (d / radius) * 0.65;
        const isSelfRocketSurf = f.id === attackerId;
        const dmg = Math.round(maxDamage * falloff * (isSelfRocketSurf ? 0.35 : 1.0));
        const knockAng = Math.atan2(f.y - y, f.x - x);
        const surfScale = isSelfRocketSurf ? 1.55 : 1.0;
        f.vx += Math.cos(knockAng) * 340 * falloff * surfScale;
        f.vy += (Math.sin(knockAng) * 300 - 135) * falloff * surfScale;
        if (isSelfRocketSurf && d < 90) {
          this.spawnFloatingText(f.x, f.y - 36, 'ROCKET SURF!', '#FB923C');
        }
        this.applyDamage(f, dmg, attackerId, weaponId, false);
      }
    }

    for (const gf of this.glassFloors) {
      if (!gf.alive) continue;
      const cx = Math.max(gf.x, Math.min(x, gf.x + gf.w));
      const cy = Math.max(gf.y, Math.min(y, gf.y + gf.h));
      if (Math.hypot(x - cx, y - cy) <= radius) {
        this.damageGlassFloor(gf, true);
      }
    }

    for (const dw of this.destructibleWalls) {
      if (!dw.alive) continue;
      const cx = Math.max(dw.x, Math.min(x, dw.x + dw.w));
      const cy = Math.max(dw.y, Math.min(y, dw.y + dw.h));
      const d = Math.hypot(x - cx, y - cy);
      if (d <= radius) {
        this.damageDestructibleWall(dw, Math.round(maxDamage * (1 - (d / radius) * 0.5)), attackerId);
      }
    }

    for (const b of this.barrels) {
      if (!b.alive) continue;
      const d = Math.hypot(b.x - x, b.y - b.h / 2 - y);
      if (d <= radius && d > 4) {
        this.damageBarrel(b, 50, attackerId);
      }
    }
  }

  private applyDamage(
    victim: FighterEntity,
    rawDmg: number,
    attackerId: string,
    weaponId: KillFeedWeaponId,
    isHeadshot: boolean
  ): void {
    if (!victim.alive || victim.spawnInvulnTimer > 0 || victim.dashTimer > 0) return;

    const attacker = this.fighters.find((f) => f.id === attackerId);
    if (attacker && attacker.id !== victim.id && this.isFriendly(attacker, victim)) {
      return;
    }
    const botDmgMult = attacker && !attacker.isHuman && victim.isHuman ? 0.62 : 1.0;
    let dmg = Math.max(1, Math.round(rawDmg * botDmgMult));

    if (victim.bubbleShieldHp > 0 && victim.bubbleShieldTimer > 0) {
      const absorbed = Math.min(victim.bubbleShieldHp, dmg);
      victim.bubbleShieldHp -= absorbed;
      dmg -= absorbed;
      this.spawnBurst(victim.x, victim.y, '#A855F7', 4, 110);
      if (victim.bubbleShieldHp <= 0) {
        victim.bubbleShieldTimer = 0;
        this.spawnFloatingText(victim.x, victim.y - 40, 'BUBBLE POPPED!', '#C084FC');
      }
    }

    if (victim.shieldHp > 0 && victim.shieldBuffTimer > 0 && dmg > 0) {
      const absorbed = Math.min(victim.shieldHp, dmg);
      victim.shieldHp -= absorbed;
      dmg -= absorbed;
      if (victim.shieldHp <= 0) {
        victim.shieldBuffTimer = 0;
      }
    }

    victim.hp = Math.max(0, victim.hp - dmg);
    victim.hitFlashTimer = 0.09;
    victim.lastHitById = attackerId;
    victim.lastHitWeapon = weaponId;
    victim.lastHitAt = this.elapsedSec;

    if (isHeadshot) {
      soundEngine.playHeadshotDing();
      this.spawnFloatingText(victim.x, victim.y - 34, `HEADSHOT -${dmg}`, '#FACC15');
    } else if (dmg > 0) {
      this.spawnFloatingText(victim.x, victim.y - 28, `-${dmg}`, '#F87171');
    }

    if (attacker && attacker.id !== victim.id) {
      attacker.damageDealt += dmg;
      if (isHeadshot) attacker.headshotsCount += 1;
      const ultGainMult =
        attacker.characterId === 'general_noodle'
          ? 1.25
          : attacker.characterId === 'aunty_cctv' || attacker.characterId === 'baron_voltage'
          ? 1.15
          : 1.0;
      attacker.ultCharge = Math.min(100, attacker.ultCharge + dmg * 0.65 * ultGainMult);
      if (attacker.isHuman && !isHeadshot) {
        soundEngine.playHit();
        this.pendingNetEvents.push({ kind: 'hit' });
      } else if (isHeadshot) {
        this.pendingNetEvents.push({ kind: 'headshot' });
      }
    }

    if (victim.hp <= 0) {
      if (
        !victim.isLastStand &&
        !victim.isBoss &&
        this.rules.gameMode !== 'one_in_chamber'
      ) {
        victim.isLastStand = true;
        victim.lastStandTimer = 3.0;
        victim.hp = 25;
        victim.grappleActive = false;
        victim.activeSlot = 'secondary';
        victim.weaponId = 'pistol';
        victim.ammo = 6;
        victim.isReloading = false;
        soundEngine.playLastStand();
        this.spawnFloatingText(victim.x, victim.y - 44, 'LAST STAND! (3s)', '#EF4444');
      } else {
        this.handleFighterDeath(victim, attackerId, weaponId, isHeadshot);
      }
    }
  }

  private handleFighterDeath(
    victim: FighterEntity,
    killerId: string,
    weaponId: KillFeedWeaponId,
    isHeadshot: boolean
  ): void {
    victim.alive = false;
    victim.isLastStand = false;
    victim.lastStandTimer = 0;
    victim.grappleActive = false;
    victim.deaths += 1;
    victim.respawnTimer = 2.6;
    victim.dualWield = null;
    victim.dualWieldAmmo = 0;
    if (victim.carryingFlagTeam) {
      const carriedFlag = this.ctfState.flags.find((fl) => fl.team === victim.carryingFlagTeam);
      if (carriedFlag) {
        carriedFlag.state = 'dropped';
        carriedFlag.x = victim.x;
        carriedFlag.y = victim.y;
        carriedFlag.carrierId = null;
        carriedFlag.carrierName = null;
        carriedFlag.returnTimerSec = 15;
      }
      victim.carryingFlagTeam = null;
      this.spawnFloatingText(victim.x, victim.y - 44, 'FLAG DROPPED!', '#F59E0B');
    }
    const victimPrevStreak = victim.killstreak;
    victim.killstreak = 0;
    this.spawnBurst(victim.x, victim.y, '#EF4444', 18, 220);

    const killer = this.fighters.find((f) => f.id === killerId);
    let multiKillCount = 0;
    let feedWeapon = weaponId;

    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      killer.killstreak += 1;
      this.lastKillerId = killer.id;
      this.lastVictimId = victim.id;

      if (killer.isLastStand) {
        killer.afterlifeKillsCount += 1;
        feedWeapon = 'last_stand';
        this.spawnFloatingText(killer.x, killer.y - 52, 'AFTERLIFE KILL!', '#F43F5E');
      }

      // Nemesis Bounty System: 3 deaths in a row by same killer marks Nemesis; revenge awards +500 coins!
      victim.consecutiveDeathsFrom[killer.id] =
        (victim.consecutiveDeathsFrom[killer.id] || 0) + 1;
      if (
        victim.consecutiveDeathsFrom[killer.id] >= 3 &&
        !victim.nemesisKillerIds.includes(killer.id)
      ) {
        victim.nemesisKillerIds.push(killer.id);
        this.spawnFloatingText(victim.x, victim.y - 56, `NEMESIS: ${killer.name}`, '#F43F5E');
      }
      victim.consecutiveDeathsFrom[killer.id] = victim.consecutiveDeathsFrom[killer.id];
      if (killer.nemesisKillerIds.includes(victim.id)) {
        killer.nemesisKillerIds = killer.nemesisKillerIds.filter((id) => id !== victim.id);
        killer.consecutiveDeathsFrom[victim.id] = 0;
        killer.nemesisKillsCount += 1;
        killer.nemesisRevengeCoinsEarned += 500;
        soundEngine.playNemesisBounty();
        this.spawnFloatingText(killer.x, killer.y - 62, 'NEMESIS BOUNTY +500!', '#FACC15');
        this.pendingNetEvents.push({
          kind: 'nemesis_bounty',
          x: killer.x,
          y: killer.y,
          text: killer.name,
        });
      }

      if (this.rules.gameMode === 'tdm') {
        const kTeam = killer.team || 'alpha';
        if (kTeam === 'alpha') {
          this.teamScores.alpha = Math.min(40, this.teamScores.alpha + 1);
        } else {
          this.teamScores.bravo = Math.min(40, this.teamScores.bravo + 1);
        }
      } else if (this.rules.gameMode === 'vip') {
        const pts = victim.isVip ? 2 : 1;
        const kTeam = killer.team || 'alpha';
        if (kTeam === 'alpha') {
          this.teamScores.alpha = Math.min(25, this.teamScores.alpha + pts);
        } else {
          this.teamScores.bravo = Math.min(25, this.teamScores.bravo + pts);
        }
        if (victim.isVip) {
          victim.isVip = false;
          this.spawnFloatingText(victim.x, victim.y - 54, 'VIP ELIMINATED (+2)!', '#FACC15');
          const nextTeammate =
            this.fighters.find(
              (f) => f.id !== victim.id && (f.team || 'alpha') === (victim.team || 'alpha') && f.alive
            ) ||
            this.fighters.find(
              (f) => f.id !== victim.id && (f.team || 'alpha') === (victim.team || 'alpha')
            );
          if (nextTeammate) {
            nextTeammate.isVip = true;
            nextTeammate.maxHp = 300;
            nextTeammate.hp = Math.min(300, nextTeammate.hp + 150);
          } else {
            victim.isVip = true;
          }
        }
      } else if (this.rules.gameMode === 'one_in_chamber') {
        killer.ammo += 1;
        killer.secondaryAmmo = killer.ammo;
        this.spawnFloatingText(killer.x, killer.y - 46, '+1 BULLET', '#FACC15');
      } else if (this.rules.gameMode === 'gun_game') {
        killer.gunGameTier += 1;
        if (killer.gunGameTier < GUN_GAME_LADDER.length) {
          const nextW = GUN_GAME_LADDER[killer.gunGameTier];
          killer.primaryWeaponId = nextW;
          killer.weaponId = nextW;
          killer.activeSlot = 'primary';
          killer.primaryAmmo = this.getEffectiveClipSize(killer, nextW);
          killer.ammo = killer.primaryAmmo;
          killer.isReloading = false;
          this.spawnFloatingText(killer.x, killer.y - 50, `TIER ${killer.gunGameTier + 1}: ${WEAPONS[nextW].shortName}`, '#38BDF8');
        } else if (killer.gunGameTier === GUN_GAME_LADDER.length) {
          killer.activeSlot = 'melee';
          this.spawnFloatingText(killer.x, killer.y - 50, 'FINAL TIER: MELEE KILL!', '#FACC15');
        }
      }

      // Telemetry counters
      if (!killer.grounded) killer.midairKillsCount += 1;
      if (
        weaponId === 'melee' ||
        weaponId === 'knife' ||
        weaponId === 'karambit' ||
        weaponId === 'katana' ||
        weaponId === 'boxing_glove'
      ) {
        killer.meleeKillsCount += 1;
      }
      if (weaponId === 'frag' || weaponId === 'plasma') killer.grenadeKillsCount += 1;
      if (weaponId in killer.weaponKills) {
        const wid = weaponId as WeaponId;
        killer.weaponKills[wid] = (killer.weaponKills[wid] || 0) + 1;
      }

      if (killer.isHuman) {
        soundEngine.playKill();
        if (killer.playerIndex) {
          this.activeKillIcons.push({
            id: this.nextKillIconId++,
            playerIndex: killer.playerIndex,
            victimName: victim.name,
            isHeadshot,
            remainingSec: 1.65,
          });
          this.pendingNetEvents.push({
            kind: 'player_kill',
            playerIndex: killer.playerIndex,
            text: victim.name,
            isHeadshot,
          });
        }
      }

      // Speech Bubble Quip
      this.triggerSpeechQuip(killer, 'kill');

      // Killstreak Rewards (3 = UAV, 5 = Rapid Jetpack, 7 = Airstrike)
      if (this.rules.enableKillstreaks) {
        if (killer.killstreak === 3) {
          killer.uavTimer = 14;
          killer.killstreaksEarnedCount += 1;
          soundEngine.playKillstreak();
          this.spawnFloatingText(killer.x, killer.y - 54, '3 KS · RADAR UAV ACTIVE!', '#38BDF8');
        } else if (killer.killstreak === 5) {
          killer.rapidJetTimer = 12;
          killer.killstreaksEarnedCount += 1;
          soundEngine.playKillstreak();
          this.spawnFloatingText(killer.x, killer.y - 54, '5 KS · RAPID JETPACK!', '#2DD4BF');
        } else if (killer.killstreak >= 7 && (killer.killstreak === 7 || killer.killstreak % 5 === 0)) {
          killer.killstreaksEarnedCount += 1;
          this.spawnAirstrike(killer);
        }
      }

      // Dynamic Announcer Banners (First Blood, Shutdown, Multikills)
      if (this.elapsedSec - killer.lastKillAt <= 4.5) {
        killer.rapidKillCount += 1;
      } else {
        killer.rapidKillCount = 1;
      }
      killer.lastKillAt = this.elapsedSec;
      multiKillCount = killer.rapidKillCount;

      if (!this.firstBloodClaimed) {
        this.firstBloodClaimed = true;
        soundEngine.playAnnouncerBanner('first_blood');
        this.activeAnnouncer = {
          id: this.nextAnnouncerId++,
          playerId: killer.id,
          playerName: killer.name,
          playerIndex: killer.playerIndex,
          streakCount: 1,
          title: 'FIRST BLOOD!',
          subtitle: `${killer.name} draws opening elimination`,
          remainingSec: 2.6,
          bannerTone: 'blood',
        };
      } else if (victimPrevStreak >= 3 && killer.rapidKillCount < 2) {
        soundEngine.playAnnouncerBanner('shutdown');
        this.activeAnnouncer = {
          id: this.nextAnnouncerId++,
          playerId: killer.id,
          playerName: killer.name,
          playerIndex: killer.playerIndex,
          streakCount: victimPrevStreak,
          title: 'SHUTDOWN!',
          subtitle: `${killer.name} ended ${victim.name}'s ${victimPrevStreak}-streak`,
          remainingSec: 2.5,
          bannerTone: 'shutdown',
        };
      } else if (killer.rapidKillCount >= 2) {
        const titles: Record<number, { t: string; k: 'double' | 'rampage' | 'unstoppable' }> = {
          2: { t: 'DOUBLE KILL!', k: 'double' },
          3: { t: 'TRIPLE KILL!', k: 'rampage' },
          4: { t: 'RAMPAGE!', k: 'rampage' },
        };
        const info = titles[killer.rapidKillCount] || { t: 'UNSTOPPABLE!', k: 'unstoppable' };
        soundEngine.playAnnouncerBanner(info.k);
        this.activeAnnouncer = {
          id: this.nextAnnouncerId++,
          playerId: killer.id,
          playerName: killer.name,
          playerIndex: killer.playerIndex,
          streakCount: killer.rapidKillCount,
          title: info.t,
          subtitle: `${killer.name} · ${killer.rapidKillCount} rapid eliminations`,
          remainingSec: 2.8,
          bannerTone: 'streak',
        };
        this.pendingNetEvents.push({
          kind: 'multikill',
          text: info.t,
          streakCount: killer.rapidKillCount,
        });
      }
    }

    const item: KillFeedItem = {
      id: this.nextKillFeedId++,
      killerName: killer ? killer.name : 'Arena',
      killerPlayerIndex: killer?.playerIndex,
      victimName: victim.name,
      victimPlayerIndex: victim.playerIndex,
      weaponId: feedWeapon,
      isHeadshot,
      multiKillCount: multiKillCount >= 2 ? multiKillCount : undefined,
      timestamp: this.elapsedSec,
    };
    this.killFeed.unshift(item);
    if (this.killFeed.length > 5) this.killFeed.pop();
    this.replayKillEvents.push(item);

    if (
      this.rules.gameMode === 'tdm' &&
      (this.teamScores.alpha >= 40 || this.teamScores.bravo >= 40)
    ) {
      this.finishMatch();
    } else if (
      this.rules.gameMode === 'vip' &&
      (this.teamScores.alpha >= 25 || this.teamScores.bravo >= 25)
    ) {
      this.finishMatch();
    } else if (this.rules.gameMode === 'boss_raid' && victim.isBoss) {
      this.teamScores.alpha = 1;
      this.finishMatch();
    } else if (this.rules.gameMode === 'gun_game' && killer && killer.gunGameTier > GUN_GAME_LADDER.length) {
      this.finishMatch();
    } else if (this.rules.gameMode === 'one_in_chamber' && killer && killer.kills >= 15) {
      this.finishMatch();
    } else if (this.rules.gameMode === 'ffa' && killer && killer.kills >= 20) {
      this.finishMatch();
    }
  }

  private respawnFighter(f: FighterEntity): void {
    let sp = this.map.playerSpawns[Math.floor(Math.random() * this.map.playerSpawns.length)];
    if (this.isTeamMode()) {
      const alphaSpawns = this.map.playerSpawns.filter((_, idx) => idx % 2 === 0);
      const bravoSpawns = this.map.playerSpawns.filter((_, idx) => idx % 2 === 1);
      const pool =
        (f.team || 'alpha') === 'alpha'
          ? alphaSpawns.length > 0
            ? alphaSpawns
            : this.map.playerSpawns
          : bravoSpawns.length > 0
          ? bravoSpawns
          : this.map.playerSpawns;
      sp = pool[Math.floor(Math.random() * pool.length)];
    }
    f.x = sp.x;
    f.y = sp.y;
    f.vx = 0;
    f.vy = 0;
    f.hp = f.maxHp;
    f.fuel = f.maxFuel;
    if (this.rules.gameMode === 'one_in_chamber') {
      f.activeSlot = 'secondary';
      f.secondaryWeaponId = 'pistol';
      f.weaponId = 'pistol';
      f.secondaryAmmo = 1;
      f.ammo = 1;
      f.grenades = 0;
    } else if (this.rules.gameMode === 'gun_game') {
      if (f.gunGameTier >= GUN_GAME_LADDER.length) {
        f.activeSlot = 'melee';
      } else {
        const tierW = GUN_GAME_LADDER[f.gunGameTier];
        f.activeSlot = 'primary';
        f.primaryWeaponId = tierW;
        f.weaponId = tierW;
        f.primaryAmmo = this.getEffectiveClipSize(f, tierW);
        f.ammo = f.primaryAmmo;
      }
      f.grenades = Math.max(f.grenades, 2);
    } else {
      f.activeSlot = 'primary';
      f.weaponId = f.primaryWeaponId;
      f.primaryAmmo = this.getEffectiveClipSize(f, f.primaryWeaponId);
      f.secondaryAmmo = this.getEffectiveClipSize(f, f.secondaryWeaponId);
      f.ammo = f.primaryAmmo;
      f.grenades = Math.max(f.grenades, 2);
    }
    f.weaponMastery = this.getMasteryForWeapon(f.masteryMap, f.weaponId);
    f.isReloading = false;
    f.minigunSpinTimer = 0;
    f.alive = true;
    f.carryingFlagTeam = null;
    f.spawnInvulnTimer = 1.6;
    f.speedBuffTimer = 0;
    f.fuelBuffTimer = 0;
    f.shieldHp = 0;
    f.shieldBuffTimer = 0;
    f.stunTimer = 0;
    f.danceTimer = 0;
    f.freezeTimer = 0;
    f.empDisableTimer = 0;
    f.empDotTimer = 0;
    f.empTickAccum = 0;
    f.empOwnerId = null;
    f.slamPending = false;
    f.gossipCooldown = 0;
    f.grappleActive = false;
    f.dashTimer = 0;
    f.shrinkTimer = 0;
    f.megaSizeTimer = 0;
    f.bubbleShieldHp = 0;
    f.bubbleShieldTimer = 0;
    f.isLastStand = false;
    f.lastStandTimer = 0;
    this.triggerSpeechQuip(f, 'spawn');
    this.spawnBurst(f.x, f.y, '#38BDF8', 10, 120);
  }

  private updateTempWalls(dt: number): void {
    for (const tw of this.tempWalls) {
      tw.life -= dt;
    }
    this.tempWalls = this.tempWalls.filter((tw) => tw.life > 0 && tw.hp > 0);
  }

  private updateDestructibleWalls(dt: number): void {
    for (const dw of this.destructibleWalls) {
      if (dw.hitFlashTimer > 0) dw.hitFlashTimer = Math.max(0, dw.hitFlashTimer - dt);
      if (!dw.alive) {
        dw.respawnTimer -= dt;
        if (dw.respawnTimer <= 0) {
          dw.alive = true;
          dw.hp = dw.maxHp;
        }
      }
    }
  }

  private updateBarrels(dt: number): void {
    const activePlatforms = this.getActivePlatforms();
    for (const b of this.barrels) {
      if (b.hitFlashTimer > 0) b.hitFlashTimer = Math.max(0, b.hitFlashTimer - dt);
      if (!b.alive) {
        b.respawnTimer -= dt;
        if (b.respawnTimer <= 0) {
          b.alive = true;
          b.launched = false;
          b.launcherId = null;
          b.fuseTimer = 0;
          b.x = b.origX;
          b.y = b.origY;
          b.vx = 0;
          b.vy = 0;
          b.hp = b.maxHp;
        }
        continue;
      }

      if (b.launched) {
        b.fuseTimer -= dt;
        b.vy = Math.min(540, b.vy + GRAVITY * 0.55 * dt);
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Flame exhaust trail
        if (Math.random() < 0.85) {
          this.spawnBurst(b.x, b.y - b.h / 2, '#F97316', 2, 70, 'flame');
          this.spawnBurst(b.x, b.y - b.h / 2, '#94A3B8', 1, 50, 'smoke');
        }

        // Launch barrels upward on Jump Pads & Wind Vents
        for (const jp of this.jumpPads) {
          if (b.x > jp.x && b.x < jp.x + jp.w && Math.abs(b.y - jp.y) < 20) {
            b.vy = -720;
            jp.compress = 1;
            soundEngine.playJumpPad();
          }
        }
        for (const wv of this.windVents) {
          if (b.x > wv.x && b.x < wv.x + wv.w && b.y <= wv.y && b.y >= wv.y - wv.height) {
            b.vy = Math.max(-420, b.vy - 1600 * dt);
          }
        }

        let detonate = b.fuseTimer <= 0 || b.x < 45 || b.x > this.map.width - 45 || b.y > this.map.height - 45;
        if (!detonate) {
          for (const p of activePlatforms) {
            if (p.kind !== 'oneway' && this.rectOverlap(b.x - b.w / 2, b.y - b.h, b.w, b.h, p.x, p.y, p.w, p.h)) {
              detonate = true;
              break;
            }
          }
        }
        if (!detonate) {
          for (const f of this.fighters) {
            if (!f.alive) continue;
            if (Math.hypot(f.x - b.x, f.y - (b.y - b.h / 2)) < 36) {
              detonate = true;
              break;
            }
          }
        }

        if (detonate) {
          b.alive = false;
          b.launched = false;
          b.respawnTimer = 15;
          this.spawnRandomSupplyDrop(b.x, b.y - 18);
          this.triggerExplosion(b.x, b.y - b.h / 2, 148, 96, b.launcherId || 'arena', 'barrel');
        }
      }
    }
  }

  private updatePickups(dt: number): void {
    for (const pk of this.pickups) {
      pk.bobPhase += dt * 3;
      if (!pk.active) {
        pk.respawnTimer -= dt;
        if (pk.respawnTimer <= 0) pk.active = true;
        continue;
      }

      for (const f of this.fighters) {
        if (!f.alive) continue;
        if (Math.hypot(f.x - pk.x, f.y - pk.y) < 34) {
          if (pk.type === 'medkit' && f.hp < f.maxHp) {
            f.hp = Math.min(f.maxHp, f.hp + 45);
            pk.active = false;
            pk.respawnTimer = pk.respawnSec;
            this.spawnFloatingText(f.x, f.y - 36, '+45 HP', '#10B981');
            soundEngine.playPickup();
            break;
          } else if (pk.type === 'fuel' && f.fuel < f.maxFuel) {
            f.fuel = f.maxFuel;
            pk.active = false;
            pk.respawnTimer = pk.respawnSec;
            this.spawnFloatingText(f.x, f.y - 36, 'FUEL FULL', '#38BDF8');
            soundEngine.playPickup();
            break;
          }
        }
      }
    }
  }

  private updatePowerUpDrops(dt: number): void {
    const kept: PowerUpDropEntity[] = [];
    for (const pu of this.powerUps) {
      pu.life -= dt;
      pu.bobPhase += dt * 4;
      pu.vy = Math.min(480, pu.vy + GRAVITY * dt * 0.8);
      pu.x += pu.vx * dt;
      pu.y += pu.vy * dt;
      pu.vx *= Math.pow(0.25, dt);

      for (const p of this.getActivePlatforms()) {
        if (pu.vy >= 0 && pu.x >= p.x && pu.x <= p.x + p.w && pu.y + 12 >= p.y && pu.y + 12 <= p.y + 24) {
          pu.y = p.y - 12;
          pu.vy = 0;
        }
      }

      let picked = false;
      for (const f of this.fighters) {
        if (!f.alive) continue;
        if (Math.hypot(f.x - pu.x, f.y - pu.y) < 34) {
          picked = true;
          if (pu.type === 'speed') {
            soundEngine.playPickup();
            f.speedBuffTimer = 9;
            this.spawnFloatingText(f.x, f.y - 38, 'SPEED BOOST!', '#FACC15');
          } else if (pu.type === 'fuel_efficiency') {
            soundEngine.playPickup();
            f.fuelBuffTimer = 10;
            f.fuel = f.maxFuel;
            this.spawnFloatingText(f.x, f.y - 38, 'ECO JETPACK!', '#2DD4BF');
          } else if (pu.type === 'shield') {
            soundEngine.playPickup();
            f.shieldHp = 60;
            f.shieldBuffTimer = 11;
            this.spawnFloatingText(f.x, f.y - 38, '+60 SHIELD!', '#38BDF8');
          } else if (pu.type === 'shrink') {
            soundEngine.playPowerUpMystery();
            f.shrinkTimer = 12;
            f.megaSizeTimer = 0;
            this.spawnFloatingText(f.x, f.y - 38, 'TINY AGENT!', '#EC4899');
          } else if (pu.type === 'mega_size') {
            soundEngine.playPowerUpMystery();
            f.megaSizeTimer = 12;
            f.shrinkTimer = 0;
            f.shieldHp = 200;
            f.shieldBuffTimer = 12;
            this.spawnFloatingText(f.x, f.y - 42, 'MEGA GIANT +200 ARMOR!', '#F59E0B');
          } else if (pu.type === 'bubble_shield') {
            soundEngine.playPowerUpMystery();
            f.bubbleShieldHp = 120;
            f.bubbleShieldTimer = 10;
            this.spawnFloatingText(f.x, f.y - 40, 'BUBBLE SHIELD!', '#A855F7');
          } else if (pu.type === 'holo_decoy') {
            soundEngine.playPowerUpMystery();
            this.holograms.push({
              id: this.nextHologramId++,
              ownerId: f.id,
              x: f.x,
              y: f.y,
              vx: f.facing * 240,
              vy: -60,
              facing: f.facing,
              characterId: f.characterId,
              outfitId: f.outfitId,
              life: 8.5,
              fireTimer: 0.4,
            });
            this.spawnFloatingText(f.x, f.y - 40, 'HOLOGRAM DECOY!', '#22D3EE');
          }
          break;
        }
      }

      if (!picked && pu.life > 0) kept.push(pu);
    }
    this.powerUps = kept;
  }

  private updateDualWieldDrops(dt: number): void {
    const kept: DualWieldDropEntity[] = [];
    for (const dw of this.dualWieldDrops) {
      dw.life -= dt;
      dw.bobPhase += dt * 4;
      dw.vy = Math.min(480, dw.vy + GRAVITY * dt * 0.8);
      dw.x += dw.vx * dt;
      dw.y += dw.vy * dt;
      dw.vx *= Math.pow(0.25, dt);

      for (const p of this.getActivePlatforms()) {
        if (dw.vy >= 0 && dw.x >= p.x && dw.x <= p.x + p.w && dw.y + 12 >= p.y && dw.y + 12 <= p.y + 24) {
          dw.y = p.y - 12;
          dw.vy = 0;
        }
      }

      let picked = false;
      for (const f of this.fighters) {
        if (!f.alive) continue;
        if (Math.hypot(f.x - dw.x, f.y - dw.y) < 36) {
          picked = true;
          f.dualWield = dw.type;
          f.dualWieldAmmo = dw.type === 'dual_smgs' ? 52 : 28;
          soundEngine.playPickup();
          this.spawnFloatingText(
            f.x,
            f.y - 40,
            dw.type === 'dual_smgs' ? 'DUAL SMGs!' : 'DUAL PISTOLS!',
            '#A855F7'
          );
          break;
        }
      }

      if (!picked && dw.life > 0) kept.push(dw);
    }
    this.dualWieldDrops = kept;
  }

  private updateWeaponDrops(dt: number): void {
    const kept: WeaponDropEntity[] = [];
    for (const wd of this.weaponDrops) {
      wd.life -= dt;
      wd.bobPhase += dt * 4;
      wd.vy = Math.min(480, wd.vy + GRAVITY * dt * 0.8);
      wd.x += wd.vx * dt;
      wd.y += wd.vy * dt;
      wd.vx *= Math.pow(0.25, dt);

      for (const p of this.getActivePlatforms()) {
        if (wd.vy >= 0 && wd.x >= p.x && wd.x <= p.x + p.w && wd.y + 12 >= p.y && wd.y + 12 <= p.y + 24) {
          wd.y = p.y - 12;
          wd.vy = 0;
        }
      }

      let picked = false;
      const allowPickup =
        this.rules.gameMode !== 'gun_game' && this.rules.gameMode !== 'one_in_chamber';
      for (const f of this.fighters) {
        if (!f.alive || !allowPickup) continue;
        if (Math.hypot(f.x - wd.x, f.y - wd.y) < 36) {
          picked = true;
          f.primaryWeaponId = wd.weaponId;
          f.activeSlot = 'primary';
          f.weaponId = wd.weaponId;
          f.primaryAmmo = this.getEffectiveClipSize(f, wd.weaponId);
          f.ammo = f.primaryAmmo;
          f.isReloading = false;
          f.reloadTimerMs = 0;
          f.burstRemaining = 0;
          f.minigunSpinTimer = 0;
          f.dualWield = null;
          f.dualWieldAmmo = 0;
          f.weaponMastery = this.getMasteryForWeapon(f.masteryMap, wd.weaponId);
          soundEngine.playPickup();
          this.spawnFloatingText(f.x, f.y - 44, WEAPONS[wd.weaponId].name.toUpperCase(), '#22D3EE');
          break;
        }
      }

      if (!picked && wd.life > 0) kept.push(wd);
    }
    this.weaponDrops = kept;
  }

  private updateParticles(dt: number): void {
    for (const pt of this.particles) {
      if (!pt.active) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        continue;
      }
      pt.vy += pt.gravity * dt;
      const nextX = pt.x + pt.vx * dt;
      const nextY = pt.y + pt.vy * dt;

      // Bouncing brass shell casings!
      if (pt.kind === 'casing' && pt.vy > 0) {
        for (const p of this.getActivePlatforms()) {
          if (nextX >= p.x && nextX <= p.x + p.w && pt.y <= p.y + 4 && nextY >= p.y) {
            pt.y = p.y - 1;
            pt.vy = -pt.vy * 0.45;
            pt.vx *= 0.72;
            pt.vRot *= 0.65;
            break;
          }
        }
      }

      pt.x = nextX;
      pt.y = nextY;
      pt.rot += pt.vRot * dt;
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (const ft of this.floatingTexts) {
      ft.life -= dt;
      ft.y += ft.vy * dt;
    }
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.life > 0);
  }

  private updateCameras(dt: number): void {
    const baseZoom = this.config.zoom ?? 1;
    const cam0Target =
      this.config.mode === 'online_client'
        ? this.fighters.find((f) => f.playerIndex === (this.config.localPlayerIndex || 2)) ||
          this.fighters[0]
        : this.fighters[0];
    if (this.cameras[0] && cam0Target) {
      const targetX = cam0Target.x + Math.cos(cam0Target.aimAngle) * 55;
      const targetY = cam0Target.y - 20 + Math.sin(cam0Target.aimAngle) * 35;
      this.cameras[0].x += (targetX - this.cameras[0].x) * Math.min(1, dt * 7);
      this.cameras[0].y += (targetY - this.cameras[0].y) * Math.min(1, dt * 7);
      this.cameras[0].zoom += (baseZoom - this.cameras[0].zoom) * Math.min(1, dt * 6);
      this.cameras[0].shake = Math.max(0, this.cameras[0].shake - dt * 28);
    }
    const p2 = this.fighters[1];
    if (this.config.mode === 'versus_2p' && this.cameras[1] && p2) {
      const targetX = p2.x + Math.cos(p2.aimAngle) * 55;
      const targetY = p2.y - 20 + Math.sin(p2.aimAngle) * 35;
      this.cameras[1].x += (targetX - this.cameras[1].x) * Math.min(1, dt * 7);
      this.cameras[1].y += (targetY - this.cameras[1].y) * Math.min(1, dt * 7);
      this.cameras[1].zoom += (baseZoom - this.cameras[1].zoom) * Math.min(1, dt * 6);
      this.cameras[1].shake = Math.max(0, this.cameras[1].shake - dt * 28);
    }
  }

  private addCameraShake(playerIndex: PlayerSlotIndex | undefined, amount: number): void {
    const idx = this.config.mode === 'versus_2p' && playerIndex === 2 ? 1 : 0;
    if (this.config.mode === 'online_host' && playerIndex && playerIndex !== 1) return;
    const cam = this.cameras[idx];
    if (cam) cam.shake = Math.min(16, cam.shake + amount);
  }

  private findNearestEnemy(f: FighterEntity): FighterEntity | null {
    let best: FighterEntity | null = null;
    let minDist = Infinity;
    for (const o of this.fighters) {
      if (o.id === f.id || !o.alive || this.isFriendly(f, o)) continue;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d < minDist) {
        minDist = d;
        best = o;
      }
    }
    return best;
  }

  private raycastGrappleAnchor(f: FighterEntity): { x: number; y: number } | null {
    const maxRange = 480;
    const step = 14;
    const dx = Math.cos(f.aimAngle);
    const dy = Math.sin(f.aimAngle);
    const activePlatforms = this.getActivePlatforms();
    for (let dist = 28; dist <= maxRange; dist += step) {
      const rx = f.x + dx * dist;
      const ry = f.y - 6 + dy * dist;
      for (const p of activePlatforms) {
        if (this.pointInRect(rx, ry, p.x, p.y, p.w, p.h)) {
          return { x: rx, y: ry };
        }
      }
      for (const dw of this.destructibleWalls) {
        if (!dw.alive) continue;
        if (this.pointInRect(rx, ry, dw.x, dw.y, dw.w, dw.h)) {
          return { x: rx, y: ry };
        }
      }
    }
    return null;
  }

  private updateSubwayTrain(dt: number): void {
    const tr = this.subwayTrain;
    const track = this.map.subwayTrack;
    if (!tr || !track) return;

    if (!tr.active) {
      if (tr.warningTimerSec > 0) {
        tr.warningTimerSec = Math.max(0, tr.warningTimerSec - dt);
        if (tr.warningTimerSec <= 0) {
          tr.active = true;
          tr.dir = tr.dir === 1 ? -1 : 1;
          tr.x = tr.dir === 1 ? track.minX - tr.w - 40 : track.maxX + 40;
          tr.vx = tr.dir * 1350;
          tr.hitIds.clear();
          this.spawnFloatingText(this.map.width / 2, track.y - 76, 'SUBWAY EXPRESS!', '#F59E0B');
        }
      } else {
        tr.nextCycleTimerSec -= dt;
        if (tr.nextCycleTimerSec <= 0) {
          tr.nextCycleTimerSec = 45;
          tr.warningTimerSec = 3.2;
          soundEngine.playTrainSiren();
          this.pendingNetEvents.push({ kind: 'train_siren' });
        }
      }
      return;
    }

    tr.x += tr.vx * dt;
    if ((tr.dir === 1 && tr.x > track.maxX + 140) || (tr.dir === -1 && tr.x + tr.w < track.minX - 140)) {
      tr.active = false;
    }
  }

  private updateEarthquakeCollapse(dt: number): void {
    if (this.timeRemainingSec > 30) return;

    if (!this.earthquakeActive) {
      this.earthquakeActive = true;
      this.earthquakeTimer = 0.9;
      for (const cam of this.cameras) {
        cam.shake = Math.max(cam.shake, 13);
      }
      soundEngine.playEarthquake();
      this.spawnFloatingText(
        this.map.width / 2,
        150,
        'FINAL 30s EARTHQUAKE!',
        '#F59E0B'
      );
    }

    this.earthquakeTimer -= dt;
    if (this.earthquakeTimer <= 0) {
      this.earthquakeTimer = 3.8;
      const nextPlatform = this.map.platforms.find(
        (p) => p.outerCollapse && !this.collapsedPlatformIds.has(p.id)
      );
      if (nextPlatform) {
        this.collapsedPlatformIds.add(nextPlatform.id);
        for (const cam of this.cameras) {
          cam.shake = Math.max(cam.shake, 11);
        }
        soundEngine.playEarthquake();
        this.spawnDebris(
          nextPlatform.x + nextPlatform.w / 2,
          nextPlatform.y + nextPlatform.h / 2,
          '#64748B',
          18,
          'debris'
        );
        this.spawnFloatingText(
          nextPlatform.x + nextPlatform.w / 2,
          nextPlatform.y - 16,
          'LEDGE COLLAPSED!',
          '#EF4444'
        );
        this.pendingNetEvents.push({
          kind: 'crumble',
          x: nextPlatform.x,
          y: nextPlatform.y,
          w: nextPlatform.w,
          h: nextPlatform.h,
        });
      }
    }
  }

  private updateSecurityTurret(dt: number): void {
    const t = this.turret;
    if (!t) return;

    if (t.muzzleFlashTimer > 0) {
      t.muzzleFlashTimer = Math.max(0, t.muzzleFlashTimer - dt);
    }

    // Check if any living fighter is near the hacking terminal
    let hacker: FighterEntity | null = null;
    const teamMode = this.isTeamMode();
    for (const f of this.fighters) {
      if (!f.alive || f.isLastStand) continue;
      const alreadyOwned =
        t.ownerId === f.id || (teamMode && t.ownerTeam && t.ownerTeam === (f.team || 'alpha'));
      if (alreadyOwned) continue;
      if (Math.hypot(f.x - t.terminalX, f.y - t.terminalY) <= 68) {
        hacker = f;
        break;
      }
    }

    if (hacker) {
      t.hackingFighterId = hacker.id;
      t.hackingPlayerName = hacker.name;
      t.hackProgress = Math.min(1, t.hackProgress + dt / 3.0);
      if (t.hackProgress >= 1) {
        t.ownerId = hacker.id;
        t.ownerTeam = teamMode ? hacker.team || 'alpha' : null;
        t.ownerName = hacker.name;
        t.hackProgress = 0;
        t.hackingFighterId = null;
        t.hackingPlayerName = null;
        soundEngine.playTurretHacked();
        this.spawnFloatingText(t.terminalX, t.terminalY - 42, 'TURRET HACKED!', '#22D3EE');
        this.spawnBurst(t.terminalX, t.terminalY - 12, '#22D3EE', 14, 180);
        this.pendingNetEvents.push({
          kind: 'turret_hack',
          x: t.terminalX,
          y: t.terminalY,
          text: hacker.name,
        });
      }
    } else {
      t.hackingFighterId = null;
      t.hackingPlayerName = null;
      t.hackProgress = Math.max(0, t.hackProgress - dt * 0.4);
    }

    // Target nearest valid enemy (or anyone if neutral)
    let bestTarget: FighterEntity | null = null;
    let bestDist = 640;
    for (const f of this.fighters) {
      if (!f.alive || f.spawnInvulnTimer > 0) continue;
      if (t.ownerId && f.id === t.ownerId) continue;
      if (teamMode && t.ownerTeam && (f.team || 'alpha') === t.ownerTeam) continue;
      const dist = Math.hypot(f.x - t.x, f.y - t.y);
      if (dist <= bestDist && this.hasLineOfSight(t.x, t.y + 12, f.x, f.y - 8)) {
        bestDist = dist;
        bestTarget = f;
      }
    }

    if (bestTarget) {
      const targetAngle = Math.atan2(bestTarget.y - 8 - (t.y + 10), bestTarget.x - t.x);
      t.aimAngle = targetAngle;
      t.fireCooldown -= dt;
      if (t.fireCooldown <= 0) {
        t.fireCooldown = 0.24;
        t.muzzleFlashTimer = 0.08;
        soundEngine.playTurretShoot();
        this.geometryBeams.push({
          id: this.nextBeamId++,
          ownerId: t.ownerId || 'arena',
          x: t.x + Math.cos(targetAngle) * 18,
          y: t.y + 10 + Math.sin(targetAngle) * 18,
          angle: targetAngle,
          length: bestDist,
          life: 0.1,
          maxLife: 0.1,
          color: t.ownerId ? '#22D3EE' : '#F43F5E',
        });
        this.applyDamage(bestTarget, 11, t.ownerId || 'arena', 'turret', false);
      }
    } else {
      t.aimAngle = Math.PI / 2 + Math.sin(this.elapsedSec * 1.6) * 0.7;
    }
  }

  private updateGlassFloors(dt: number): void {
    for (const gf of this.glassFloors) {
      if (gf.alive) continue;
      gf.respawnTimer -= dt;
      if (gf.respawnTimer <= 0) {
        gf.alive = true;
        gf.cracks = 0;
      }
    }
  }

  private damageGlassFloor(gf: GlassFloorEntity, instant = false): void {
    if (!gf.alive) return;
    gf.cracks += instant ? 2 : 1;
    if (gf.cracks >= 2) {
      gf.alive = false;
      gf.respawnTimer = 16;
      soundEngine.playGlassShatter();
      this.spawnDebris(gf.x + gf.w / 2, gf.y + gf.h / 2, '#BAE6FD', 14, 'glass');
      this.pendingNetEvents.push({
        kind: 'glass_shatter',
        x: gf.x,
        y: gf.y,
        w: gf.w,
        h: gf.h,
      });
    } else {
      soundEngine.playGlassCrack();
      this.spawnBurst(gf.x + gf.w / 2, gf.y + gf.h / 2, '#E0F2FE', 6, 110);
    }
  }

  private updateGoldenAirdrop(dt: number): void {
    const ad = this.goldenAirdrop;
    if (!ad.active) return;

    ad.life -= dt;
    if (ad.life <= 0) {
      ad.active = false;
      return;
    }

    if (!ad.landed) {
      ad.y += ad.vy * dt;
      for (const p of this.getActivePlatforms()) {
        if (ad.x >= p.x && ad.x <= p.x + p.w && ad.y + 18 >= p.y && ad.y + 18 <= p.y + 30) {
          ad.y = p.y - 18;
          ad.landed = true;
          soundEngine.playPickup();
          this.spawnBurst(ad.x, ad.y, '#FACC15', 14, 190);
          break;
        }
      }
      if (!ad.landed && ad.y >= this.map.height - 64) {
        ad.y = this.map.height - 64;
        ad.landed = true;
      }
    }

    for (const f of this.fighters) {
      if (!f.alive || f.isLastStand || f.isBoss) continue;
      if (Math.hypot(f.x - ad.x, f.y - ad.y) < 42) {
        ad.active = false;
        f.primaryWeaponId = 'orbital_laser';
        f.activeSlot = 'primary';
        f.weaponId = 'orbital_laser';
        f.primaryAmmo = this.getEffectiveClipSize(f, 'orbital_laser');
        f.ammo = f.primaryAmmo;
        f.isReloading = false;
        f.reloadTimerMs = 0;
        f.dualWield = null;
        f.dualWieldAmmo = 0;
        soundEngine.playPowerUpMystery();
        this.spawnBurst(f.x, f.y - 10, '#FACC15', 18, 240);
        this.spawnFloatingText(f.x, f.y - 44, 'MYTHIC ORBITAL LASER!', '#FACC15');
        break;
      }
    }
  }

  private updateHolograms(dt: number): void {
    const activePlatforms = this.getActivePlatforms();
    const kept: HologramCloneEntity[] = [];
    for (const h of this.holograms) {
      h.life -= dt;
      if (h.life <= 0) continue;
      h.vy = Math.min(540, h.vy + GRAVITY * dt * 0.85);
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (h.x < 80 || h.x > this.map.width - 80) {
        h.vx = -h.vx;
        h.facing = h.vx >= 0 ? 1 : -1;
      }
      for (const p of activePlatforms) {
        if (h.vy >= 0 && h.x >= p.x && h.x <= p.x + p.w && h.y + 24 >= p.y && h.y + 24 <= p.y + 22) {
          h.y = p.y - 24;
          h.vy = -120;
        }
      }
      kept.push(h);
    }
    this.holograms = kept;
  }

  private updateAfterimages(dt: number): void {
    for (const ag of this.afterimages) {
      ag.alpha -= dt * 3.4;
    }
    this.afterimages = this.afterimages.filter((ag) => ag.alpha > 0.04);
  }

  private updateEmotesAndSprays(dt: number): void {
    for (const em of this.emotePopups) {
      em.life -= dt;
      const owner = this.fighters.find((f) => f.id === em.fighterId);
      if (owner && owner.alive) {
        em.x = owner.x;
        em.y = owner.y - 50;
      }
    }
    this.emotePopups = this.emotePopups.filter((em) => em.life > 0);

    for (const sp of this.wallSprays) {
      sp.life -= dt;
    }
    this.wallSprays = this.wallSprays.filter((sp) => sp.life > 0);
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const steps = 14;
    const activePlatforms = this.getActivePlatforms();
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = x1 + (x2 - x1) * t;
      const sy = y1 + (y2 - y1) * t;
      for (const p of activePlatforms) {
        if (p.kind === 'oneway') continue;
        if (this.pointInRect(sx, sy, p.x, p.y, p.w, p.h)) return false;
      }
      for (const s of this.smokeClouds) {
        if (Math.hypot(sx - s.x, sy - s.y) < s.radius * 0.82) return false;
      }
    }
    return true;
  }

  private raycastAimedWall(f: FighterEntity): AimedWallSnapshot | null {
    const maxRange = 540;
    const step = 12;
    const dx = Math.cos(f.aimAngle);
    const dy = Math.sin(f.aimAngle);
    const activePlatforms = this.getActivePlatforms();
    for (let dist = 24; dist <= maxRange; dist += step) {
      const rx = f.x + dx * dist;
      const ry = f.y - 4 + dy * dist;
      for (const p of activePlatforms) {
        if (p.kind !== 'oneway' && this.pointInRect(rx, ry, p.x, p.y, p.w, p.h)) {
          return null;
        }
      }
      for (const dw of this.destructibleWalls) {
        if (!dw.alive) continue;
        if (this.pointInRect(rx, ry, dw.x, dw.y, dw.w, dw.h)) {
          return {
            wallId: dw.id,
            style: dw.style,
            hp: Math.max(0, Math.round(dw.hp)),
            maxHp: dw.maxHp,
            playerIndex: f.playerIndex || 1,
          };
        }
      }
    }
    return null;
  }

  private pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  private rectOverlap(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private spawnJetpackFlame(f: FighterEntity): void {
    const flame = FLAME_COSMETICS.find((fl) => fl.id === f.flameId) || FLAME_COSMETICS[0];
    const rainbowColors = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#A855F7'];
    const isSugarRush = f.characterId === 'captain_jalebi' && f.ultActiveTimer > 0;
    const color = isSugarRush
      ? rainbowColors[Math.floor(Math.random() * rainbowColors.length)]
      : Math.random() > 0.4
      ? flame.primaryColor
      : flame.secondaryColor;
    this.spawnParticle({
      x: f.x - f.facing * 12 + (Math.random() - 0.5) * 4,
      y: f.y + 10,
      vx: (Math.random() - 0.5) * 40,
      vy: 120 + Math.random() * 80,
      size: isSugarRush ? 4.2 + Math.random() * 2.5 : 3 + Math.random() * 2.5,
      color,
      alpha: 0.9,
      life: 0.24,
      maxLife: 0.24,
      gravity: -80,
      kind: 'flame',
      rot: 0,
      vRot: 0,
    });
  }

  private spawnCasing(x: number, y: number, facing: 1 | -1): void {
    this.spawnParticle({
      x,
      y,
      vx: -facing * (65 + Math.random() * 65),
      vy: -135 - Math.random() * 80,
      size: 3,
      color: '#FBBF24',
      alpha: 1,
      life: 1.25,
      maxLife: 1.25,
      gravity: 780,
      kind: 'casing',
      rot: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 18,
    });
  }

  private spawnDebris(
    x: number,
    y: number,
    color: string,
    count: number,
    kind: 'debris' | 'glass' = 'debris'
  ): void {
    for (let i = 0; i < count; i++) {
      this.spawnParticle({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 260,
        vy: -120 - Math.random() * 220,
        size: 5 + Math.random() * 6,
        color,
        alpha: kind === 'glass' ? 0.88 : 1,
        life: 0.65 + Math.random() * 0.4,
        maxLife: 1.05,
        gravity: 820,
        kind,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 14,
      });
    }
  }

  private spawnBurst(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number,
    kind: Particle['kind'] = 'spark'
  ): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: kind === 'smoke' ? 7 + Math.random() * 7 : 2.5 + Math.random() * 2.5,
        color,
        alpha: 0.9,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65,
        gravity: kind === 'smoke' ? -40 : 280,
        kind,
        rot: 0,
        vRot: 0,
      });
    }
  }

  private spawnRing(x: number, y: number, radius: number, color: string): void {
    this.spawnParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      size: radius * 0.35,
      color,
      alpha: 0.9,
      life: 0.35,
      maxLife: 0.35,
      gravity: 0,
      kind: 'ring',
      rot: 0,
      vRot: 0,
    });
  }

  private spawnExplosionVisual(x: number, y: number, radius: number): void {
    this.spawnRing(x, y, radius * 0.7, '#F59E0B');
    this.spawnBurst(x, y, '#F97316', 18, 280, 'flame');
    this.spawnBurst(x, y, '#64748B', 12, 140, 'smoke');
  }

  private spawnParticle(opts: Omit<Particle, 'active'>): void {
    for (const pt of this.particles) {
      if (!pt.active) {
        Object.assign(pt, opts, { active: true });
        return;
      }
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -36,
      text,
      color,
      life: 1.0,
      maxLife: 1.0,
    });
  }

  private recordReplayFrame(): void {
    this.replayFrames.push({
      elapsedSec: this.elapsedSec,
      timeRemainingSec: this.timeRemainingSec,
      fighters: this.fighters.map((f) => ({
        id: f.id,
        x: Math.round(f.x),
        y: Math.round(f.y),
        facing: f.facing,
        aimAngle: f.aimAngle,
        grounded: f.grounded,
        wallSliding: f.wallSlideDir !== 0,
        jetpacking: f.jetpacking,
        hp: Math.round(f.hp),
        maxHp: f.maxHp,
        weaponId: f.weaponId,
        activeSlot: f.activeSlot,
        meleeWeaponId: f.meleeWeaponId,
        weaponMastery: f.weaponMastery,
        gunWrap: f.gunWrap,
        dualWield: f.dualWield,
        ultActiveTimer: f.ultActiveTimer,
        muzzleFlashTimer: f.muzzleFlashTimer,
        hitFlashTimer: f.hitFlashTimer,
        meleeSwingTimer: f.meleeSwingTimer,
        walkCycle: f.walkCycle,
        alive: f.alive,
        spawnInvulnTimer: f.spawnInvulnTimer,
        kills: f.kills,
        deaths: f.deaths,
        speedBuffTimer: f.speedBuffTimer,
        fuelBuffTimer: f.fuelBuffTimer,
        shieldHp: f.shieldHp,
        shieldBuffTimer: f.shieldBuffTimer,
        freezeTimer: f.freezeTimer,
        empDisableTimer: f.empDisableTimer,
        speechText: f.speechText,
        speechTimer: f.speechTimer,
        stunTimer: f.stunTimer,
        danceTimer: f.danceTimer,
        grappleActive: f.grappleActive,
        grappleX: Math.round(f.grappleX),
        grappleY: Math.round(f.grappleY),
        dashTimer: f.dashTimer,
        shrinkTimer: f.shrinkTimer,
        megaSizeTimer: f.megaSizeTimer,
        bubbleShieldHp: f.bubbleShieldHp,
        bubbleShieldTimer: f.bubbleShieldTimer,
        isLastStand: f.isLastStand,
        lastStandTimer: f.lastStandTimer,
        isVip: f.isVip,
        isBoss: f.isBoss,
        nemesisKillerIds: [...f.nemesisKillerIds],
      })),
      projectiles: this.projectiles.map((p) => ({
        id: p.id,
        weaponId: p.weaponId,
        x: Math.round(p.x),
        y: Math.round(p.y),
        prevX: Math.round(p.prevX),
        prevY: Math.round(p.prevY),
        vx: Math.round(p.vx),
        vy: Math.round(p.vy),
        color: p.color,
        isRocket: p.isRocket,
        isHoming: p.isHoming,
        isChappal: p.isChappal,
        stuck: p.stuck,
      })),
      cookerBombs: this.cookerBombs.map((cb) => ({
        id: cb.id,
        x: Math.round(cb.x),
        y: Math.round(cb.y),
        fuseTimer: cb.fuseTimer,
        maxFuse: cb.maxFuse,
      })),
      geometryBeams: this.geometryBeams.map((bm) => ({
        id: bm.id,
        x: Math.round(bm.x),
        y: Math.round(bm.y),
        angle: bm.angle,
        length: bm.length,
        life: bm.life,
        maxLife: bm.maxLife,
        color: bm.color,
        isGossip: bm.isGossip,
      })),
      grenades: this.grenades.map((g) => ({
        id: g.id,
        type: g.type,
        x: Math.round(g.x),
        y: Math.round(g.y),
        rot: g.rot,
        stuck: g.stuck,
        fuseTimer: g.fuseTimer,
      })),
      smokeClouds: this.smokeClouds.map((s) => ({
        id: s.id,
        x: Math.round(s.x),
        y: Math.round(s.y),
        radius: s.radius,
        life: s.life,
        maxLife: s.maxLife,
      })),
      airstrikes: this.airstrikes.map((a) => ({
        id: a.id,
        targetX: a.targetX,
        targetY: a.targetY,
        timer: a.timer,
      })),
      barrelsAlive: this.barrels.map((b) => b.alive),
      pickupsActive: this.pickups.map((pk) => pk.active),
      destructibleWalls: this.destructibleWalls.map((dw) => ({
        hp: Math.round(dw.hp),
        alive: dw.alive,
        hitFlashTimer: dw.hitFlashTimer,
      })),
      tempWalls: this.tempWalls.map((tw) => ({ ...tw })),
      powerUps: this.powerUps.map((pu) => ({
        id: pu.id,
        x: Math.round(pu.x),
        y: Math.round(pu.y),
        type: pu.type,
        life: pu.life,
      })),
      dualWieldDrops: this.dualWieldDrops.map((dw) => ({
        id: dw.id,
        x: Math.round(dw.x),
        y: Math.round(dw.y),
        type: dw.type,
        life: dw.life,
      })),
      weaponDrops: this.weaponDrops.map((wd) => ({
        id: wd.id,
        x: Math.round(wd.x),
        y: Math.round(wd.y),
        weaponId: wd.weaponId,
        life: wd.life,
      })),
      floatingTexts: this.floatingTexts.map((ft) => ({ ...ft })),
      chaos: { ...this.chaosState },
      train: this.subwayTrain
        ? {
            active: this.subwayTrain.active,
            warningTimerSec: this.subwayTrain.warningTimerSec,
            x: Math.round(this.subwayTrain.x),
            y: Math.round(this.subwayTrain.y),
            w: this.subwayTrain.w,
            h: this.subwayTrain.h,
            dir: this.subwayTrain.dir,
            carCount: this.subwayTrain.carCount,
          }
        : undefined,
      turret: this.turret
        ? {
            x: this.turret.x,
            y: this.turret.y,
            terminalX: this.turret.terminalX,
            terminalY: this.turret.terminalY,
            ownerTeam: this.turret.ownerTeam,
            ownerId: this.turret.ownerId,
            ownerName: this.turret.ownerName,
            hackProgress: this.turret.hackProgress,
            hackingPlayerName: this.turret.hackingPlayerName,
            aimAngle: this.turret.aimAngle,
            muzzleFlashTimer: this.turret.muzzleFlashTimer,
          }
        : undefined,
      airdrop: this.goldenAirdrop.active
        ? {
            active: true,
            landed: this.goldenAirdrop.landed,
            x: Math.round(this.goldenAirdrop.x),
            y: Math.round(this.goldenAirdrop.y),
          }
        : undefined,
      glassFloors: this.glassFloors.map((gf) => ({ ...gf })),
      collapsedPlatformIds: Array.from(this.collapsedPlatformIds),
      wallSprays: this.wallSprays.map((sp) => ({ ...sp })),
      emotePopups: this.emotePopups.map((em) => ({ ...em })),
      holograms: this.holograms.map((h) => ({
        id: h.id,
        x: Math.round(h.x),
        y: Math.round(h.y),
        facing: h.facing,
        characterId: h.characterId,
        outfitId: h.outfitId,
        life: h.life,
      })),
      afterimages: this.afterimages.map((ag) => ({ ...ag })),
      killFeed: [...this.killFeed],
      announcer: this.activeAnnouncer ? { ...this.activeAnnouncer } : null,
    });
    if (this.replayFrames.length > 3600) {
      this.replayFrames.shift();
    }
  }

  private render(): void {
    const crosshairs: CrosshairRenderInfo[] = [];
    const uavActiveForCam: boolean[] = [];
    const localIdx = this.config.localPlayerIndex || 2;

    if (
      (this.config.mode === 'solo' ||
        this.config.mode === 'online_host' ||
        this.config.mode === 'online_client') &&
      this.cameras[0]
    ) {
      const cam = this.cameras[0];
      const worldX = (this.mouseScreen.x - this.canvas.width / 2) / cam.zoom + cam.x;
      const worldY = (this.mouseScreen.y - this.canvas.height / 2) / cam.zoom + cam.y;
      const localF =
        this.config.mode === 'online_client'
          ? this.fighters.find((f) => f.playerIndex === localIdx) ||
            this.fighters.find((f) => f.playerIndex === 2)
          : this.fighters[0];
      const maxRel = localF ? this.getEffectiveReloadMs(localF, localF.weaponId) : 1400;
      const reloadProgress =
        localF && localF.isReloading
          ? 1 - Math.max(0, localF.reloadTimerMs) / maxRel
          : 0;

      crosshairs.push({
        x: worldX,
        y: worldY,
        active: this.mouseScreen.movedRecently,
        isReloading: Boolean(localF?.isReloading),
        reloadProgress,
      });
      uavActiveForCam.push(Boolean(localF && localF.uavTimer > 0));
    } else if (this.config.mode === 'versus_2p') {
      uavActiveForCam.push(
        Boolean(this.fighters[0] && this.fighters[0].uavTimer > 0),
        Boolean(this.fighters[1] && this.fighters[1].uavTimer > 0)
      );
    }

    this.renderer.renderFrame(
      this.ctx,
      this.canvas.width,
      this.canvas.height,
      this.config.mode,
      this.cameras,
      this.fighters,
      this.projectiles,
      this.barrels,
      this.pickups,
      this.tempWalls,
      this.destructibleWalls,
      this.particles,
      this.floatingTexts,
      crosshairs,
      this.elapsedSec,
      this.powerUps,
      {
        map: this.map,
        grenades: this.grenades,
        cookerBombs: this.cookerBombs,
        geometryBeams: this.geometryBeams,
        smokeClouds: this.smokeClouds,
        airstrikes: this.airstrikes,
        scorchDecals: this.scorchDecals,
        dualWieldDrops: this.dualWieldDrops,
        weaponDrops: this.weaponDrops,
        isTeamMode: this.isTeamMode(),
        teamScores: this.teamScores,
        hardpoint: this.rules.gameMode === 'hardpoint' ? this.hardpointState : undefined,
        domination: this.rules.gameMode === 'domination' ? this.dominationState : undefined,
        ctf: this.rules.gameMode === 'ctf' ? this.ctfState : undefined,
        uavActiveForCam,
        chaos: this.chaosState,
        train: this.subwayTrain
          ? {
              active: this.subwayTrain.active,
              warningTimerSec: this.subwayTrain.warningTimerSec,
              x: this.subwayTrain.x,
              y: this.subwayTrain.y,
              w: this.subwayTrain.w,
              h: this.subwayTrain.h,
              dir: this.subwayTrain.dir,
              carCount: this.subwayTrain.carCount,
            }
          : undefined,
        turret: this.turret
          ? {
              x: this.turret.x,
              y: this.turret.y,
              terminalX: this.turret.terminalX,
              terminalY: this.turret.terminalY,
              ownerTeam: this.turret.ownerTeam,
              ownerId: this.turret.ownerId,
              ownerName: this.turret.ownerName,
              hackProgress: this.turret.hackProgress,
              hackingPlayerName: this.turret.hackingPlayerName,
              aimAngle: this.turret.aimAngle,
              muzzleFlashTimer: this.turret.muzzleFlashTimer,
            }
          : undefined,
        portals: this.portals,
        jumpPads: this.jumpPads,
        windVents: this.windVents,
        glassFloors: this.glassFloors,
        airdrop: this.goldenAirdrop.active
          ? {
              active: true,
              landed: this.goldenAirdrop.landed,
              x: this.goldenAirdrop.x,
              y: this.goldenAirdrop.y,
            }
          : undefined,
        collapsedPlatformIds: Array.from(this.collapsedPlatformIds),
        wallSprays: this.wallSprays,
        emotePopups: this.emotePopups,
        holograms: this.holograms,
        afterimages: this.afterimages,
        earthquakeActive: this.earthquakeActive,
      }
    );
  }

  private pushHudSnapshot(): void {
    const aimedWalls: AimedWallSnapshot[] = [];
    for (const f of this.fighters) {
      if (f.isHuman && f.alive) {
        const aw = this.raycastAimedWall(f);
        if (aw) aimedWalls.push(aw);
      }
    }

    const localIdx = this.config.localPlayerIndex || 2;

    this.config.onHudUpdate({
      mapId: this.map.id,
      rules: this.rules,
      timeRemainingSec: this.timeRemainingSec,
      fps: this.currentFps,
      fighters: this.fighters.map((f) => {
        const maxClip = this.getEffectiveClipSize(f, f.weaponId);
        const maxReload = this.getEffectiveReloadMs(f, f.weaponId);
        return {
          id: f.id,
          name: f.name,
          characterId: f.characterId,
          isHuman: f.isHuman,
          playerIndex: f.playerIndex,
          team: f.team || 'alpha',
          x: f.x,
          y: f.y,
          hp: f.hp,
          maxHp: f.maxHp,
          fuel: f.fuel,
          maxFuel: f.maxFuel,
          weaponId: f.weaponId,
          activeSlot: f.activeSlot,
          primaryWeaponId: f.primaryWeaponId,
          secondaryWeaponId: f.secondaryWeaponId,
          meleeWeaponId: f.meleeWeaponId,
          weaponMastery: f.weaponMastery,
          gunWrap: f.gunWrap,
          ammo: f.ammo,
          maxAmmo: maxClip,
          isReloading: f.isReloading,
          reloadProgress: f.isReloading ? 1 - Math.max(0, f.reloadTimerMs) / maxReload : 0,
          ultCharge: Math.round(f.ultCharge),
          ultActive: f.ultActiveTimer > 0,
          ultTitle: CHARACTERS.find((c) => c.id === f.characterId)?.ultimateTitle || 'Ultimate',
          kills: f.kills,
          deaths: f.deaths,
          alive: f.alive,
          respawnTimer: f.respawnTimer,
          speedBuffTimer: f.speedBuffTimer,
          fuelBuffTimer: f.fuelBuffTimer,
          shieldHp: Math.round(f.shieldHp),
          shieldBuffTimer: f.shieldBuffTimer,
          freezeTimer: f.freezeTimer,
          empDisableTimer: f.empDisableTimer,
          wallSliding: f.wallSlideDir !== 0,
          grenades: f.grenades,
          grenadeType: f.grenadeType,
          meleeCooldownPct: Math.max(
            0,
            Math.min(
              1,
              1 - f.meleeCooldownTimer / (MELEE_WEAPONS[f.meleeWeaponId || 'knife']?.cooldownSec || 0.75)
            )
          ),
          dualWield: f.dualWield,
          dualWieldAmmo: f.dualWieldAmmo,
          killstreak: f.killstreak,
          uavTimer: f.uavTimer,
          rapidJetTimer: f.rapidJetTimer,
          kothPoints: Math.round(f.kothPoints),
          inPodium: f.inPodium,
          carryingFlagTeam: f.carryingFlagTeam || null,
          grappleActive: f.grappleActive,
          dashCooldownPct: Math.max(0, Math.min(1, 1 - f.dashCooldown / 1.4)),
          shrinkTimer: f.shrinkTimer,
          megaSizeTimer: f.megaSizeTimer,
          bubbleShieldHp: Math.round(f.bubbleShieldHp),
          bubbleShieldTimer: f.bubbleShieldTimer,
          isLastStand: f.isLastStand,
          lastStandTimer: f.lastStandTimer,
          isVip: f.isVip,
          isBoss: f.isBoss,
          gunGameTier: f.gunGameTier,
          nemesisKillerIds: [...f.nemesisKillerIds],
          afterlifeKills: f.afterlifeKillsCount,
          nemesisKills: f.nemesisKillsCount,
        };
      }),
      killFeed: [...this.killFeed],
      pickups: this.pickups.map((pk) => ({
        id: pk.id,
        x: pk.x,
        y: pk.y,
        type: pk.type,
        active: pk.active,
      })),
      dualWieldDrops: this.dualWieldDrops.map((dw) => ({
        id: dw.id,
        x: dw.x,
        y: dw.y,
        type: dw.type,
      })),
      weaponDrops: this.weaponDrops.map((wd) => ({
        id: wd.id,
        x: wd.x,
        y: wd.y,
        weaponId: wd.weaponId,
      })),
      announcer: this.activeAnnouncer ? { ...this.activeAnnouncer } : null,
      aimedWalls,
      killIcons: this.activeKillIcons.filter((k) => {
        if (this.config.mode === 'online_client') return k.playerIndex === localIdx;
        if (this.config.mode === 'versus_2p') return k.playerIndex === 1 || k.playerIndex === 2;
        return k.playerIndex === 1;
      }),
      teamScores: this.teamScores,
      hardpoint: this.rules.gameMode === 'hardpoint' ? this.hardpointState : undefined,
      domination: this.rules.gameMode === 'domination' ? this.dominationState : undefined,
      ctf: this.rules.gameMode === 'ctf' ? this.ctfState : undefined,
      chaos: { ...this.chaosState },
      train: this.subwayTrain
        ? {
            active: this.subwayTrain.active,
            warningTimerSec: this.subwayTrain.warningTimerSec,
            x: Math.round(this.subwayTrain.x),
            y: Math.round(this.subwayTrain.y),
            w: this.subwayTrain.w,
            h: this.subwayTrain.h,
            dir: this.subwayTrain.dir,
            carCount: this.subwayTrain.carCount,
          }
        : undefined,
      turret: this.turret
        ? {
            x: this.turret.x,
            y: this.turret.y,
            terminalX: this.turret.terminalX,
            terminalY: this.turret.terminalY,
            ownerTeam: this.turret.ownerTeam,
            ownerId: this.turret.ownerId,
            ownerName: this.turret.ownerName,
            hackProgress: this.turret.hackProgress,
            hackingPlayerName: this.turret.hackingPlayerName,
            aimAngle: this.turret.aimAngle,
            muzzleFlashTimer: this.turret.muzzleFlashTimer,
          }
        : undefined,
      airdrop: this.goldenAirdrop.active
        ? {
            active: true,
            landed: this.goldenAirdrop.landed,
            x: Math.round(this.goldenAirdrop.x),
            y: Math.round(this.goldenAirdrop.y),
          }
        : undefined,
      earthquakeActive: this.earthquakeActive,
      gunGame:
        this.rules.gameMode === 'gun_game'
          ? (() => {
              const leader = [...this.fighters].sort(
                (a, b) => b.gunGameTier - a.gunGameTier || b.kills - a.kills
              )[0];
              return {
                leaderName: leader?.name || '',
                leaderTier: leader?.gunGameTier || 0,
                maxTiers: GUN_GAME_LADDER.length + 1,
              };
            })()
          : undefined,
      bossRaid:
        this.rules.gameMode === 'boss_raid'
          ? (() => {
              const boss = this.fighters.find((f) => f.isBoss);
              return {
                bossName: boss?.name || 'MEGA BARON VOLTAGE',
                hp: Math.round(boss?.hp || 0),
                maxHp: boss?.maxHp || 1500,
                alive: Boolean(boss?.alive),
                empCooldownSec: Math.max(0, Math.round(boss?.bossEmpTimer || 0)),
              };
            })()
          : undefined,
    });
  }

  private broadcastWorldSnapshot(): void {
    const peer = this.config.peerSession;
    if (!peer || !peer.isConnected()) return;

    const events = [...this.pendingNetEvents];
    this.pendingNetEvents = [];

    const snap: WorldSyncSnapshot = {
      timeRemainingSec: this.timeRemainingSec,
      elapsedSec: this.elapsedSec,
      fighters: this.fighters.map((f) => ({
        id: f.id,
        name: f.name,
        characterId: f.characterId,
        outfitId: f.outfitId,
        flameId: f.flameId,
        rankId: f.rank.id,
        isHuman: f.isHuman,
        playerIndex: f.playerIndex,
        team: f.team || 'alpha',
        x: Math.round(f.x),
        y: Math.round(f.y),
        vx: Math.round(f.vx),
        vy: Math.round(f.vy),
        facing: f.facing,
        aimAngle: Number(f.aimAngle.toFixed(3)),
        grounded: f.grounded,
        wallSliding: f.wallSlideDir !== 0,
        jetpacking: f.jetpacking,
        hp: Math.round(f.hp),
        maxHp: f.maxHp,
        fuel: Math.round(f.fuel),
        maxFuel: f.maxFuel,
        weaponId: f.weaponId,
        activeSlot: f.activeSlot,
        primaryWeaponId: f.primaryWeaponId,
        secondaryWeaponId: f.secondaryWeaponId,
        meleeWeaponId: f.meleeWeaponId,
        weaponMastery: f.weaponMastery,
        gunWrap: f.gunWrap,
        ammo: f.ammo,
        isReloading: f.isReloading,
        reloadProgress: f.isReloading
          ? 1 - Math.max(0, f.reloadTimerMs) / this.getEffectiveReloadMs(f, f.weaponId)
          : 0,
        ultCharge: Math.round(f.ultCharge),
        ultActiveTimer: f.ultActiveTimer,
        muzzleFlashTimer: f.muzzleFlashTimer,
        hitFlashTimer: f.hitFlashTimer,
        meleeSwingTimer: f.meleeSwingTimer,
        walkCycle: f.walkCycle,
        alive: f.alive,
        respawnTimer: f.respawnTimer,
        spawnInvulnTimer: f.spawnInvulnTimer,
        kills: f.kills,
        deaths: f.deaths,
        speedBuffTimer: f.speedBuffTimer,
        fuelBuffTimer: f.fuelBuffTimer,
        shieldHp: f.shieldHp,
        shieldBuffTimer: f.shieldBuffTimer,
        freezeTimer: f.freezeTimer,
        empDisableTimer: f.empDisableTimer,
        grenades: f.grenades,
        grenadeType: f.grenadeType,
        dualWield: f.dualWield,
        dualWieldAmmo: f.dualWieldAmmo,
        killstreak: f.killstreak,
        uavTimer: f.uavTimer,
        rapidJetTimer: f.rapidJetTimer,
        kothPoints: f.kothPoints,
        speechText: f.speechText,
        speechTimer: f.speechTimer,
        stunTimer: f.stunTimer,
        danceTimer: f.danceTimer,
        grappleActive: f.grappleActive,
        grappleX: Math.round(f.grappleX),
        grappleY: Math.round(f.grappleY),
        dashTimer: f.dashTimer,
        shrinkTimer: f.shrinkTimer,
        megaSizeTimer: f.megaSizeTimer,
        bubbleShieldHp: f.bubbleShieldHp,
        bubbleShieldTimer: f.bubbleShieldTimer,
        isLastStand: f.isLastStand,
        lastStandTimer: f.lastStandTimer,
        isVip: f.isVip,
        isBoss: f.isBoss,
        gunGameTier: f.gunGameTier,
        nemesisKillerIds: [...f.nemesisKillerIds],
      })),
      projectiles: this.projectiles.map((p) => ({
        id: p.id,
        weaponId: p.weaponId,
        x: Math.round(p.x),
        y: Math.round(p.y),
        prevX: Math.round(p.prevX),
        prevY: Math.round(p.prevY),
        vx: Math.round(p.vx),
        vy: Math.round(p.vy),
        color: p.color,
        isRocket: p.isRocket,
        isHoming: p.isHoming,
        isChappal: p.isChappal,
        stuck: p.stuck,
      })),
      cookerBombs: this.cookerBombs.map((cb) => ({
        id: cb.id,
        x: Math.round(cb.x),
        y: Math.round(cb.y),
        fuseTimer: cb.fuseTimer,
        maxFuse: cb.maxFuse,
      })),
      geometryBeams: this.geometryBeams.map((bm) => ({
        id: bm.id,
        x: Math.round(bm.x),
        y: Math.round(bm.y),
        angle: bm.angle,
        length: bm.length,
        life: bm.life,
        maxLife: bm.maxLife,
        color: bm.color,
        isGossip: bm.isGossip,
      })),
      grenades: this.grenades.map((g) => ({
        id: g.id,
        type: g.type,
        x: Math.round(g.x),
        y: Math.round(g.y),
        rot: g.rot,
        stuck: g.stuck,
        fuseTimer: g.fuseTimer,
      })),
      smokeClouds: this.smokeClouds.map((s) => ({
        id: s.id,
        x: Math.round(s.x),
        y: Math.round(s.y),
        radius: s.radius,
        life: s.life,
        maxLife: s.maxLife,
      })),
      airstrikes: this.airstrikes.map((a) => ({
        id: a.id,
        targetX: a.targetX,
        targetY: a.targetY,
        timer: a.timer,
      })),
      dualWieldDrops: this.dualWieldDrops.map((dw) => ({
        id: dw.id,
        x: Math.round(dw.x),
        y: Math.round(dw.y),
        type: dw.type,
        life: dw.life,
      })),
      weaponDrops: this.weaponDrops.map((wd) => ({
        id: wd.id,
        x: Math.round(wd.x),
        y: Math.round(wd.y),
        weaponId: wd.weaponId,
        life: wd.life,
      })),
      barrels: this.barrels.map((b) => ({
        id: b.id,
        x: Math.round(b.x),
        y: Math.round(b.y),
        launched: b.launched,
        alive: b.alive,
        hitFlashTimer: b.hitFlashTimer,
      })),
      pickups: this.pickups.map((pk) => ({
        id: pk.id,
        active: pk.active,
        respawnTimer: pk.respawnTimer,
      })),
      tempWalls: this.tempWalls,
      destructibleWalls: this.destructibleWalls.map((dw) => ({
        id: dw.id,
        hp: Math.round(dw.hp),
        alive: dw.alive,
        hitFlashTimer: dw.hitFlashTimer,
      })),
      powerUps: this.powerUps.map((pu) => ({
        id: pu.id,
        x: Math.round(pu.x),
        y: Math.round(pu.y),
        type: pu.type,
        life: pu.life,
      })),
      chaos: { ...this.chaosState },
      train: this.subwayTrain
        ? {
            active: this.subwayTrain.active,
            warningTimerSec: this.subwayTrain.warningTimerSec,
            x: Math.round(this.subwayTrain.x),
            y: Math.round(this.subwayTrain.y),
            w: this.subwayTrain.w,
            h: this.subwayTrain.h,
            dir: this.subwayTrain.dir,
            carCount: this.subwayTrain.carCount,
          }
        : undefined,
      turret: this.turret
        ? {
            x: this.turret.x,
            y: this.turret.y,
            terminalX: this.turret.terminalX,
            terminalY: this.turret.terminalY,
            ownerTeam: this.turret.ownerTeam,
            ownerId: this.turret.ownerId,
            ownerName: this.turret.ownerName,
            hackProgress: this.turret.hackProgress,
            hackingPlayerName: this.turret.hackingPlayerName,
            aimAngle: this.turret.aimAngle,
            muzzleFlashTimer: this.turret.muzzleFlashTimer,
          }
        : undefined,
      airdrop: this.goldenAirdrop.active
        ? {
            active: true,
            landed: this.goldenAirdrop.landed,
            x: Math.round(this.goldenAirdrop.x),
            y: Math.round(this.goldenAirdrop.y),
          }
        : undefined,
      glassFloors: this.glassFloors.map((gf) => ({ ...gf })),
      collapsedPlatformIds: Array.from(this.collapsedPlatformIds),
      wallSprays: this.wallSprays.map((sp) => ({ ...sp })),
      emotePopups: this.emotePopups.map((em) => ({ ...em })),
      holograms: this.holograms.map((h) => ({
        id: h.id,
        x: Math.round(h.x),
        y: Math.round(h.y),
        facing: h.facing,
        characterId: h.characterId,
        outfitId: h.outfitId,
        life: h.life,
      })),
      afterimages: this.afterimages.map((ag) => ({ ...ag })),
      earthquakeActive: this.earthquakeActive,
      teamScores: this.teamScores,
      hardpoint: this.rules.gameMode === 'hardpoint' ? this.hardpointState : undefined,
      domination: this.rules.gameMode === 'domination' ? this.dominationState : undefined,
      ctf: this.rules.gameMode === 'ctf' ? this.ctfState : undefined,
      killFeed: [...this.killFeed],
      announcer: this.activeAnnouncer,
      events,
    };

    peer.send({ type: 'world_sync', payload: snap });
  }

  private applyWorldSnapshot(snap: WorldSyncSnapshot): void {
    this.timeRemainingSec = snap.timeRemainingSec;
    this.elapsedSec = snap.elapsedSec;
    this.killFeed = snap.killFeed;
    this.activeAnnouncer = snap.announcer;
    if (snap.teamScores) this.teamScores = snap.teamScores;
    if (snap.hardpoint) this.hardpointState = snap.hardpoint;
    if (snap.domination) this.dominationState = snap.domination;
    if (snap.ctf) this.ctfState = snap.ctf;

    for (const sf of snap.fighters) {
      let f = this.fighters.find((ft) => ft.id === sf.id);
      if (!f) {
        const rankObj = RANKS.find((r) => r.id === sf.rankId) || RANKS[0];
        f = this.createFighter({
          id: sf.id,
          name: sf.name,
          characterId: sf.characterId,
          outfitId: sf.outfitId,
          flameId: sf.flameId,
          rank: rankObj,
          isHuman: sf.isHuman,
          playerIndex: sf.playerIndex,
          team: sf.team || 'alpha',
          weaponId: sf.weaponId,
          secondaryWeaponId: sf.secondaryWeaponId,
          meleeWeaponId: sf.meleeWeaponId,
          gunWrap: sf.gunWrap || 'none',
          x: sf.x,
          y: sf.y,
        });
        this.fighters.push(f);
      }
      if (sf.team) f.team = sf.team;
      f.x = sf.x;
      f.y = sf.y;
      f.vx = sf.vx;
      f.vy = sf.vy;
      f.facing = sf.facing;
      f.aimAngle = sf.aimAngle;
      f.grounded = sf.grounded;
      f.wallSlideDir = sf.wallSliding ? sf.facing : 0;
      f.jetpacking = sf.jetpacking;
      f.hp = sf.hp;
      f.maxHp = sf.maxHp;
      f.fuel = sf.fuel;
      f.maxFuel = sf.maxFuel;
      f.weaponId = sf.weaponId;
      if (sf.activeSlot) f.activeSlot = sf.activeSlot;
      if (sf.primaryWeaponId) f.primaryWeaponId = sf.primaryWeaponId;
      if (sf.secondaryWeaponId) f.secondaryWeaponId = sf.secondaryWeaponId;
      if (sf.meleeWeaponId) f.meleeWeaponId = sf.meleeWeaponId;
      f.weaponMastery = sf.weaponMastery || 'none';
      f.gunWrap = sf.gunWrap || 'none';
      f.ammo = sf.ammo;
      f.isReloading = sf.isReloading;
      f.ultCharge = sf.ultCharge;
      f.ultActiveTimer = sf.ultActiveTimer;
      f.muzzleFlashTimer = sf.muzzleFlashTimer;
      f.hitFlashTimer = sf.hitFlashTimer;
      f.meleeSwingTimer = sf.meleeSwingTimer || 0;
      f.walkCycle = sf.walkCycle;
      f.alive = sf.alive;
      f.respawnTimer = sf.respawnTimer;
      f.spawnInvulnTimer = sf.spawnInvulnTimer;
      f.kills = sf.kills;
      f.deaths = sf.deaths;
      f.speedBuffTimer = sf.speedBuffTimer;
      f.fuelBuffTimer = sf.fuelBuffTimer;
      f.shieldHp = sf.shieldHp;
      f.shieldBuffTimer = sf.shieldBuffTimer;
      f.freezeTimer = sf.freezeTimer ?? 0;
      f.empDisableTimer = sf.empDisableTimer ?? 0;
      f.grenades = sf.grenades ?? f.grenades;
      f.grenadeType = sf.grenadeType ?? f.grenadeType;
      f.dualWield = sf.dualWield ?? null;
      f.dualWieldAmmo = sf.dualWieldAmmo ?? 0;
      f.killstreak = sf.killstreak ?? 0;
      f.uavTimer = sf.uavTimer ?? 0;
      f.rapidJetTimer = sf.rapidJetTimer ?? 0;
      f.kothPoints = sf.kothPoints ?? 0;
      f.speechText = sf.speechText ?? '';
      f.speechTimer = sf.speechTimer ?? 0;
      f.stunTimer = sf.stunTimer ?? 0;
      f.danceTimer = sf.danceTimer ?? 0;
      f.grappleActive = Boolean(sf.grappleActive);
      f.grappleX = sf.grappleX ?? 0;
      f.grappleY = sf.grappleY ?? 0;
      f.dashTimer = sf.dashTimer ?? 0;
      f.shrinkTimer = sf.shrinkTimer ?? 0;
      f.megaSizeTimer = sf.megaSizeTimer ?? 0;
      f.bubbleShieldHp = sf.bubbleShieldHp ?? 0;
      f.bubbleShieldTimer = sf.bubbleShieldTimer ?? 0;
      f.isLastStand = Boolean(sf.isLastStand);
      f.lastStandTimer = sf.lastStandTimer ?? 0;
      f.isVip = Boolean(sf.isVip);
      f.isBoss = Boolean(sf.isBoss);
      if (sf.gunGameTier !== undefined) f.gunGameTier = sf.gunGameTier;
      if (sf.nemesisKillerIds) f.nemesisKillerIds = sf.nemesisKillerIds;
    }

    if (snap.chaos) this.chaosState = snap.chaos;
    if (snap.train && this.subwayTrain) {
      this.subwayTrain.active = snap.train.active;
      this.subwayTrain.warningTimerSec = snap.train.warningTimerSec;
      this.subwayTrain.x = snap.train.x;
      this.subwayTrain.y = snap.train.y;
      this.subwayTrain.dir = snap.train.dir;
    }
    if (snap.turret && this.turret) {
      this.turret.ownerTeam = snap.turret.ownerTeam;
      this.turret.ownerId = snap.turret.ownerId;
      this.turret.ownerName = snap.turret.ownerName;
      this.turret.hackProgress = snap.turret.hackProgress;
      this.turret.hackingPlayerName = snap.turret.hackingPlayerName;
      this.turret.aimAngle = snap.turret.aimAngle;
      this.turret.muzzleFlashTimer = snap.turret.muzzleFlashTimer;
    }
    if (snap.airdrop) {
      this.goldenAirdrop = {
        active: snap.airdrop.active,
        landed: snap.airdrop.landed,
        x: snap.airdrop.x,
        y: snap.airdrop.y,
        vy: 0,
        life: 25,
      };
    } else {
      this.goldenAirdrop.active = false;
    }
    if (snap.glassFloors) {
      this.glassFloors = snap.glassFloors;
    }
    if (snap.collapsedPlatformIds) {
      this.collapsedPlatformIds = new Set(snap.collapsedPlatformIds);
    }
    if (snap.wallSprays) {
      this.wallSprays = snap.wallSprays;
    }
    if (snap.emotePopups) {
      this.emotePopups = snap.emotePopups;
    }
    if (snap.holograms) {
      this.holograms = snap.holograms.map((h) => ({
        ...h,
        ownerId: '',
        vx: 0,
        vy: 0,
        fireTimer: 0,
      }));
    }
    if (snap.afterimages) {
      this.afterimages = snap.afterimages;
    }
    if (snap.earthquakeActive !== undefined) {
      this.earthquakeActive = snap.earthquakeActive;
    }

    this.projectiles = snap.projectiles.map((p) => ({
      ...p,
      ownerId: '',
      damage: 0,
      explosionRadius: 0,
      life: 1,
    }));

    this.cookerBombs = (snap.cookerBombs || []).map((cb) => ({
      ...cb,
      ownerId: '',
      vx: 0,
      vy: 0,
      whistleTimer: 0,
    }));

    this.geometryBeams = (snap.geometryBeams || []).map((bm) => ({
      ...bm,
      ownerId: '',
    }));

    this.grenades = (snap.grenades || []).map((g) => ({
      ...g,
      ownerId: '',
      vx: 0,
      vy: 0,
      vRot: 0,
      stuck: Boolean(g.stuck),
    }));

    this.smokeClouds = snap.smokeClouds || [];
    this.airstrikes = (snap.airstrikes || []).map((a) => ({
      ...a,
      ownerId: '',
      shellsDropped: 0,
    }));
    this.dualWieldDrops = (snap.dualWieldDrops || []).map((dw) => ({
      ...dw,
      vx: 0,
      vy: 0,
      maxLife: 20,
      bobPhase: 0,
    }));
    this.weaponDrops = (snap.weaponDrops || []).map((wd) => ({
      ...wd,
      vx: 0,
      vy: 0,
      maxLife: 24,
      bobPhase: 0,
    }));

    snap.barrels.forEach((sb) => {
      const b = this.barrels.find((br) => br.id === sb.id);
      if (b) {
        b.alive = sb.alive;
        b.hitFlashTimer = sb.hitFlashTimer;
        if (sb.x !== undefined) b.x = sb.x;
        if (sb.y !== undefined) b.y = sb.y;
        if (sb.launched !== undefined) b.launched = sb.launched;
      }
    });

    snap.pickups.forEach((sp) => {
      const pk = this.pickups.find((p) => p.id === sp.id);
      if (pk) {
        pk.active = sp.active;
        pk.respawnTimer = sp.respawnTimer;
      }
    });

    snap.destructibleWalls.forEach((sdw) => {
      const dw = this.destructibleWalls.find((d) => d.id === sdw.id);
      if (dw) {
        dw.hp = sdw.hp;
        dw.alive = sdw.alive;
        dw.hitFlashTimer = sdw.hitFlashTimer;
      }
    });

    this.powerUps = snap.powerUps.map((sp) => ({
      id: sp.id,
      x: sp.x,
      y: sp.y,
      vx: 0,
      vy: 0,
      type: sp.type,
      life: sp.life,
      maxLife: 18,
      bobPhase: 0,
    }));

    this.tempWalls = snap.tempWalls.map((tw) => ({ ...tw, ownerId: '' }));

    const localIdx = this.config.localPlayerIndex || 2;
    for (const ev of snap.events) {
      if (ev.kind === 'shoot' && ev.weaponId) soundEngine.playShoot(ev.weaponId, 0.7);
      else if (ev.kind === 'explosion' && ev.x !== undefined && ev.y !== undefined) {
        soundEngine.playExplosion(0.8);
        this.spawnExplosionVisual(ev.x, ev.y, 110);
      } else if (ev.kind === 'glass_shatter' && ev.x !== undefined && ev.y !== undefined) {
        soundEngine.playGlassShatter();
        this.spawnDebris(ev.x + (ev.w || 22) / 2, ev.y + (ev.h || 90) / 2, '#BAE6FD', 14, 'glass');
      } else if (ev.kind === 'crumble' && ev.x !== undefined && ev.y !== undefined) {
        soundEngine.playExplosion(0.4);
        this.spawnDebris(ev.x + (ev.w || 36) / 2, ev.y + (ev.h || 90) / 2, '#92400E', 12, 'debris');
      } else if (ev.kind === 'hit') soundEngine.playHit();
      else if (ev.kind === 'headshot') soundEngine.playHeadshotDing();
      else if (ev.kind === 'melee') soundEngine.playMeleeSwing(ev.meleeWeaponId);
      else if (ev.kind === 'airstrike') soundEngine.playAirstrikeWhistle();
      else if (ev.kind === 'ult') soundEngine.playUltimate();
      else if (ev.kind === 'multikill' && ev.streakCount) soundEngine.playMultikill(ev.streakCount);
      else if (ev.kind === 'chaos_warning') soundEngine.playChaosWarning();
      else if (ev.kind === 'train_siren') soundEngine.playTrainSiren();
      else if (ev.kind === 'portal_warp') soundEngine.playPortalWarp();
      else if (ev.kind === 'jump_pad') soundEngine.playJumpPad();
      else if (ev.kind === 'turret_hack') soundEngine.playTurretHacked();
      else if (ev.kind === 'dash') soundEngine.playDash();
      else if (ev.kind === 'grapple') soundEngine.playGrappleFire();
      else if (ev.kind === 'emote') soundEngine.playEmote();
      else if (ev.kind === 'spray') soundEngine.playSpray();
      else if (ev.kind === 'nemesis_bounty') soundEngine.playNemesisBounty();
      else if (ev.kind === 'player_kill' && ev.playerIndex === localIdx) {
        this.activeKillIcons.push({
          id: this.nextKillIconId++,
          playerIndex: localIdx,
          victimName: ev.text || 'Enemy',
          isHeadshot: ev.isHeadshot,
          remainingSec: 1.65,
        });
      }
    }

    this.recordReplayFrame();
  }

  private finishMatch(): void {
    if (this.ended) return;
    this.ended = true;

    const teamMode = this.isTeamMode();
    let winnerTeam: TeamId | undefined;
    if (teamMode) {
      if (this.teamScores.alpha > this.teamScores.bravo) {
        winnerTeam = 'alpha';
      } else if (this.teamScores.bravo > this.teamScores.alpha) {
        winnerTeam = 'bravo';
      } else {
        const alphaKills = this.fighters
          .filter((f) => (f.team || 'alpha') === 'alpha')
          .reduce((acc, f) => acc + f.kills, 0);
        const bravoKills = this.fighters
          .filter((f) => f.team === 'bravo')
          .reduce((acc, f) => acc + f.kills, 0);
        if (alphaKills !== bravoKills) {
          winnerTeam = alphaKills > bravoKills ? 'alpha' : 'bravo';
        } else {
          const alphaDmg = this.fighters
            .filter((f) => (f.team || 'alpha') === 'alpha')
            .reduce((acc, f) => acc + f.damageDealt, 0);
          const bravoDmg = this.fighters
            .filter((f) => f.team === 'bravo')
            .reduce((acc, f) => acc + f.damageDealt, 0);
          winnerTeam = alphaDmg >= bravoDmg ? 'alpha' : 'bravo';
        }
      }
    }

    const sorted = [...this.fighters].sort((a, b) => {
      if (this.rules.gameMode === 'gun_game') {
        if (b.gunGameTier !== a.gunGameTier) return b.gunGameTier - a.gunGameTier;
      }
      if (teamMode && winnerTeam) {
        const aWin = (a.team || 'alpha') === winnerTeam ? 1 : 0;
        const bWin = (b.team || 'alpha') === winnerTeam ? 1 : 0;
        if (bWin !== aWin) return bWin - aWin;
      }
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (Math.round(b.kothPoints) !== Math.round(a.kothPoints)) {
        return b.kothPoints - a.kothPoints;
      }
      if (a.deaths !== b.deaths) return a.deaths - b.deaths;
      return b.damageDealt - a.damageDealt;
    });

    const standings: FighterMatchSummary[] = sorted.map((f) => ({
      id: f.id,
      name: f.name,
      characterId: f.characterId,
      isHuman: f.isHuman,
      playerIndex: f.playerIndex,
      team: f.team || 'alpha',
      profileId: f.profileId,
      kills: f.kills,
      deaths: f.deaths,
      damageDealt: Math.round(f.damageDealt),
      weaponKills: f.weaponKills,
      rankTitle: f.rank.title,
      kothPoints: Math.round(f.kothPoints),
      objectivePoints: Math.round(f.kothPoints),
      afterlifeKills: f.afterlifeKillsCount,
      nemesisKills: f.nemesisKillsCount,
      telemetry: {
        headshots: f.headshotsCount,
        midairKills: f.midairKillsCount,
        meleeKills: f.meleeKillsCount,
        grenadeKills: f.grenadeKillsCount,
        coverDestroyed: f.coverDestroyedCount,
        killstreaksEarned: f.killstreaksEarnedCount,
        usedOnlySniper: !f.usedNonSniper && f.kills > 0,
        kothPoints: Math.round(f.kothPoints),
        afterlifeKills: f.afterlifeKillsCount,
        nemesisKills: f.nemesisKillsCount,
        nemesisRevengeCoins: f.nemesisRevengeCoinsEarned,
      },
    }));

    const summary: MatchSummary = {
      mode: this.config.mode,
      mapId: this.map.id,
      gameMode: this.rules.gameMode,
      durationSec: Math.round(this.elapsedSec),
      winnerId: standings[0]?.id || '',
      winnerTeam,
      teamScores: teamMode ? { ...this.teamScores } : undefined,
      standings,
    };

    if (this.config.mode === 'online_host' && this.config.peerSession?.isConnected()) {
      this.config.peerSession.send({ type: 'match_end', payload: summary });
    }

    this.config.onMatchEnd(summary);
  }
}
