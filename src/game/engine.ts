import {
  BOT_NAMES,
  CHARACTERS,
  DEFAULT_CUSTOM_RULES,
  FLAME_COSMETICS,
  MELEE_WEAPONS,
  RANKS,
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
  AimedWallSnapshot,
  CharacterId,
  CtfHudState,
  CustomMatchRules,
  DominationHudState,
  DualWieldType,
  FighterMatchSummary,
  GameMode,
  GrenadeType,
  HardpointHudState,
  HudSnapshot,
  KillFeedItem,
  KillFeedWeaponId,
  KillIconPrompt,
  MapId,
  MatchReplayData,
  MatchSummary,
  MeleeWeaponId,
  MultikillAnnouncement,
  OnlinePeerMeta,
  PartyMember,
  PlayerProfile,
  PlayerSlotIndex,
  PowerUpType,
  RemoteInputPacket,
  ReplayFrame,
  SecondaryWeaponId,
  TeamId,
  TeamScoreHud,
  WeaponId,
  WeaponMasteryTier,
  WeaponSlot,
  WorldSyncSnapshot,
  ZoomLevel,
} from '../types/game';
import { soundEngine } from './audio';
import { ArenaMap, PickupType, getArenaMap } from './map';
import { ArenaRenderer, CrosshairRenderInfo } from './renderer';
import {
  AirstrikeBeaconEntity,
  BarrelEntity,
  CameraState,
  DestructibleWallEntity,
  DualWieldDropEntity,
  FighterEntity,
  FloatingText,
  GrenadeEntity,
  Particle,
  PickupEntity,
  PowerUpDropEntity,
  ProjectileEntity,
  ScorchDecal,
  SmokeCloudEntity,
  TempWallEntity,
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
  private nextKillIconId = 1;

  private fighters: FighterEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private grenades: GrenadeEntity[] = [];
  private smokeClouds: SmokeCloudEntity[] = [];
  private airstrikes: AirstrikeBeaconEntity[] = [];
  private scorchDecals: ScorchDecal[] = [];
  private barrels: BarrelEntity[] = [];
  private pickups: PickupEntity[] = [];
  private powerUps: PowerUpDropEntity[] = [];
  private dualWieldDrops: DualWieldDropEntity[] = [];
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
  private mouseScreen = { x: 0, y: 0, down: false, movedRecently: false };
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
    action: 'jump' | 'reload' | 'ultimate' | 'melee' | 'grenade' | 'cycle_grenade' | 'cycle_slot'
  ): void {
    this.touchButtonsJust.add(action);
  }

  private getEffectiveClipSize(f: FighterEntity, weaponId: WeaponId): number {
    const base = WEAPONS[weaponId].clipSize;
    return f.characterId === 'tariff_boss' ? Math.ceil(base * 1.2) : base;
  }

  private getEffectiveReloadMs(f: FighterEntity, weaponId: WeaponId): number {
    const base = WEAPONS[weaponId].reloadMs;
    return f.characterId === 'mitron' ? Math.round(base * 0.8) : base;
  }

  private getMasteryForWeapon(
    masteryMap: Partial<Record<WeaponId, WeaponMasteryTier>> | undefined,
    weaponId: WeaponId
  ): WeaponMasteryTier {
    return (masteryMap && masteryMap[weaponId]) || 'none';
  }

  private isTeamMode(): boolean {
    return this.rules.gameMode !== 'ffa';
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
      x: b.x,
      y: b.y,
      w: 26,
      h: 38,
      hp: 45,
      maxHp: 45,
      alive: true,
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
        x: p1Spawn.x,
        y: p1Spawn.y,
      })
    );

    if (mode === 'versus_2p' && p2Profile) {
      const p2Spawn = bravoSpawnList[0];
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
          team: 'bravo',
          profileId: p2Profile.id,
          weaponId: p2Profile.cosmetics.equippedStartingWeapon,
          secondaryWeaponId: p2Profile.cosmetics.equippedSecondary,
          meleeWeaponId: p2Profile.cosmetics.equippedMelee,
          masteryMap: p2Profile.masteryEquipped,
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
          x: sp.x,
          y: sp.y,
        })
      );
    });

    // Balance arena bots: ensure Team Bravo always has rivals in team modes!
    const alphaCount = this.fighters.filter((f) => f.team === 'alpha').length;
    const bravoCount = this.fighters.filter((f) => f.team === 'bravo').length;
    const effectiveBotCount =
      this.isTeamMode() && bravoCount === 0
        ? Math.max(botCount, alphaCount)
        : botCount;

    const usedChars = new Set(this.fighters.map((f) => f.characterId));
    const botChars = CHARACTERS.filter((c) => !c.isPremium && !usedChars.has(c.id));
    const availableBotNames = BOT_NAMES.filter((bn) => !usedNames.has(bn.toLowerCase()));
    const botWeapons: WeaponId[] = ['ak', 'm4a1', 'sawshot', 'mp7', 'spas12'];
    const botSecondaries: SecondaryWeaponId[] = ['pistol', 'uzi', 'shorty', 'revolver', 'ghost_pistol'];
    const botMelees: MeleeWeaponId[] = ['knife', 'karambit', 'katana', 'boxing_glove'];

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
          x: sp.x,
          y: sp.y,
        })
      );
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
    x: number;
    y: number;
  }): FighterEntity {
    const maxHp =
      params.characterId === 'yogi_boy'
        ? 125
        : params.characterId === 'thongi_baba'
        ? 115
        : 100;
    const maxFuel = params.characterId === 'revolutionary' ? 115 : 100;
    const primaryWeaponId = params.weaponId;
    const secondaryWeaponId = normalizeSecondaryId(params.secondaryWeaponId || 'pistol');
    const meleeWeaponId = normalizeMeleeId(params.meleeWeaponId || 'knife');
    const baseClip = WEAPONS[primaryWeaponId].clipSize;
    const primaryAmmo = params.characterId === 'tariff_boss' ? Math.ceil(baseClip * 1.2) : baseClip;
    const secBaseClip = WEAPONS[secondaryWeaponId].clipSize;
    const secondaryAmmo =
      params.characterId === 'tariff_boss' ? Math.ceil(secBaseClip * 1.2) : secBaseClip;
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
      masteryMap: params.masteryMap,
      ammo: primaryAmmo,
      isReloading: false,
      reloadTimerMs: 0,
      fireCooldownMs: 0,
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
          };
          if (input.upJust) existing.upJustLatch = true;
          if (input.meleeJust) existing.meleeLatch = true;
          if (input.grenadeJust) existing.grenadeLatch = true;
          if (input.cycleGrenadeJust) existing.cycleGrenadeLatch = true;
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
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseScreen.down = false;
    }
  };

  private handleBlur = () => {
    this.heldKeys.clear();
    this.mouseScreen.down = false;
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
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
      };
      this.config.peerSession?.send({ type: 'input', payload: packet });
      cam.x += (clientFighter.x - cam.x) * Math.min(1, dt * 8);
      cam.y += (clientFighter.y - cam.y) * Math.min(1, dt * 8);
      cam.shake = Math.max(0, cam.shake - dt * 28);
    }

    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    for (const s of this.smokeClouds) {
      s.life -= dt;
    }
    this.smokeClouds = this.smokeClouds.filter((s) => s.life > 0);
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

      if (f.grenades < 2) {
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
            };
            remote.upJustLatch = false;
            remote.meleeLatch = false;
            remote.grenadeLatch = false;
            remote.cycleGrenadeLatch = false;
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
            };
          }
        } else {
          input = this.getP2LocalInput(f);
        }
      } else {
        input = this.getBotInput(f, dt);
      }

      f.aimAngle = input.aimAngle;
      f.facing = Math.cos(f.aimAngle) >= 0 ? 1 : -1;

      if (input.switchSlot) {
        this.switchFighterSlot(f, input.switchSlot);
      }

      if (input.cycleGrenadeJust) {
        const order: GrenadeType[] = ['frag', 'smoke', 'plasma'];
        f.grenadeType = order[(order.indexOf(f.grenadeType) + 1) % order.length];
      }

      if (input.grenadeJust && f.grenades > 0) {
        this.throwGrenade(f);
      }

      if (input.meleeJust && f.meleeCooldownTimer <= 0) {
        this.performMeleeStrike(f);
      }

      if (input.ultimate && f.ultCharge >= 100) {
        this.activateUltimate(f);
      }

      this.updateFighterPhysics(f, input, dt);
      this.updateFighterWeapon(f, input, dt);
    }

    this.updateActiveModeRules(dt);
    if (this.ended) return;

    this.updateProjectiles(dt);
    this.updateGrenades(dt);
    this.updateSmokeClouds(dt);
    this.updateAirstrikes(dt);
    this.updateTempWalls(dt);
    this.updateDestructibleWalls(dt);
    this.updateBarrels(dt);
    this.updatePickups(dt);
    this.updatePowerUpDrops(dt);
    this.updateDualWieldDrops(dt);
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
        ((bot.characterId === 'yogi_boy' || bot.characterId === 'dashing_trudeau') &&
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
    };
  }

  private activateUltimate(f: FighterEntity): void {
    f.ultCharge = 0;
    soundEngine.playUltimate();
    this.triggerSpeechQuip(f, 'ult');
    this.pendingNetEvents.push({ kind: 'ult', x: f.x, y: f.y, text: f.characterId });

    if (
      f.characterId === 'mitron' ||
      f.characterId === 'dashing_trudeau' ||
      f.characterId === 'thongi_baba'
    ) {
      const isTrudeau = f.characterId === 'dashing_trudeau';
      const isThongi = f.characterId === 'thongi_baba';
      const blastRadius = isThongi ? 275 : isTrudeau ? 230 : 250;
      const blastDmg = isThongi ? 46 : isTrudeau ? 34 : 42;
      if (isThongi) {
        this.spawnFloatingText(f.x, f.y - 45, 'YAHAN WALA BLAST!', '#22D3EE');
        this.spawnRing(f.x, f.y, blastRadius * 0.72, '#FACC15');
        this.spawnBurst(f.x, f.y, '#22D3EE', 18, 280);
      } else if (isTrudeau) {
        f.hp = Math.min(f.maxHp, f.hp + 30);
        this.spawnFloatingText(f.x, f.y - 45, '+30 HP MAPLE FLASH!', '#F43F5E');
      } else {
        this.spawnFloatingText(f.x, f.y - 45, 'MANN KI BLAST!', '#F59E0B');
      }
      this.spawnRing(f.x, f.y, blastRadius, isThongi ? '#22D3EE' : isTrudeau ? '#F43F5E' : '#F59E0B');

      for (const other of this.fighters) {
        if (other.id === f.id || !other.alive || this.isFriendly(f, other)) continue;
        const dx = other.x - f.x;
        const dy = other.y - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= blastRadius) {
          const push = (1 - dist / blastRadius) * (isThongi ? 680 : 620) + (isThongi ? 260 : 220);
          const ang = Math.atan2(dy - 40, dx);
          other.vx += Math.cos(ang) * push;
          other.vy += Math.sin(ang) * push - 150;
          this.applyDamage(other, blastDmg, f.id, 'ultimate', false);
        }
      }
    } else if (f.characterId === 'tariff_boss') {
      const wallX = f.x + f.facing * 44 - 11;
      const wallY = f.y - 48;
      this.tempWalls.push({
        id: `tw_${this.nextWallId++}`,
        ownerId: f.id,
        x: wallX,
        y: wallY,
        w: 22,
        h: 92,
        hp: 260,
        maxHp: 260,
        life: 8.5,
      });
      this.spawnFloatingText(f.x, f.y - 45, 'GOLDEN WALL!', '#FACC15');
    } else if (f.characterId === 'revolutionary') {
      f.ultActiveTimer = 6.0;
      f.fuel = f.maxFuel;
      this.spawnFloatingText(f.x, f.y - 45, 'BHARAT SPRINT!', '#38BDF8');
    } else if (f.characterId === 'yogi_boy') {
      f.ultActiveTimer = 5.0;
      this.spawnFloatingText(f.x, f.y - 45, 'BULLDOZER RUSH!', '#FB923C');
    } else if (f.characterId === 'red_dragon') {
      const target = this.findNearestEnemy(f);
      this.spawnFloatingText(f.x, f.y - 45, 'DRONE SWARM!', '#EF4444');
      for (let i = 0; i < 2; i++) {
        const ang = f.aimAngle + (i === 0 ? -0.35 : 0.35);
        this.projectiles.push({
          id: this.nextProjectileId++,
          ownerId: f.id,
          weaponId: f.weaponId,
          x: f.x + f.facing * 16,
          y: f.y - 12 + (i === 0 ? -8 : 8),
          prevX: f.x,
          prevY: f.y - 12,
          vx: Math.cos(ang) * 440,
          vy: Math.sin(ang) * 440,
          damage: 38,
          explosionRadius: 72,
          color: '#EF4444',
          life: 3.6,
          isRocket: true,
          isHoming: true,
          targetId: target ? target.id : null,
          fromUltimate: true,
        });
      }
    } else if (f.characterId === 'iron_bear') {
      f.ultActiveTimer = 6.0;
      this.spawnFloatingText(f.x, f.y - 45, 'HEAVY RECOIL (2X DMG)!', '#EF4444');
    }
  }

  private switchFighterSlot(f: FighterEntity, targetSlot: WeaponSlot): void {
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
    f.meleeCooldownTimer = mDef.cooldownSec;
    f.meleeSwingTimer = mDef.swingDurationSec;
    soundEngine.playMeleeSwing(meleeId);
    this.pendingNetEvents.push({ kind: 'melee', meleeWeaponId: meleeId, x: f.x, y: f.y });

    const reachOffset = Math.round(mDef.range * 0.72);
    const reachX = f.x + Math.cos(f.aimAngle) * reachOffset;
    const reachY = f.y - 4 + Math.sin(f.aimAngle) * reachOffset;
    const hitRadius = Math.max(42, mDef.range * 0.92);
    let landed = false;

    for (const other of this.fighters) {
      if (other.id === f.id || !other.alive || this.isFriendly(f, other)) continue;
      if (Math.hypot(other.x - reachX, other.y - reachY) < hitRadius) {
        other.vx += Math.cos(f.aimAngle) * mDef.knockback;
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
          // Bounce or stick against solid platforms
          for (const p of this.map.platforms) {
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
          if (!collided) {
            g.x = nextX;
            g.y = nextY;
          }
        }
      }

      if (g.fuseTimer <= 0) {
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
          this.triggerExplosion(g.x, g.y, 118, 95, g.ownerId, 'plasma');
        } else {
          this.triggerExplosion(g.x, g.y, 124, 82, g.ownerId, 'frag');
        }
      } else {
        kept.push(g);
      }
    }

    this.grenades = kept;
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

    const speedBonus = f.characterId === 'revolutionary' ? 1.12 : 1.0;
    const ultSpeedMult = f.characterId === 'revolutionary' && f.ultActiveTimer > 0 ? 1.48 : 1.0;
    const buffSpeedMult = f.speedBuffTimer > 0 ? 1.38 : 1.0;

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
    const maxRun = BASE_RUN_SPEED * speedBonus * ultSpeedMult * buffSpeedMult * waterMult * botPace;

    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const accel = (f.grounded ? MOVE_ACCEL_GROUND * iceAccelMult : MOVE_ACCEL_AIR) * speedBonus * ultSpeedMult * buffSpeedMult;

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
    const rapidUltFuel = f.characterId === 'revolutionary' && f.ultActiveTimer > 0;
    const trudeauFuel = f.characterId === 'dashing_trudeau';
    const fuelEfficiency =
      this.rules.infiniteFuel || rapidUltFuel
        ? 0.0
        : f.fuelBuffTimer > 0 || f.rapidJetTimer > 0
        ? 0.35
        : 1.0;
    const gravityAccel = GRAVITY * this.rules.gravityScale;

    if (f.onLadder) {
      f.vy = 0;
      if (input.up) f.vy = -210;
      if (input.down) f.vy = 210;
      f.wallSlideDir = 0;
    } else {
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
      } else if (input.up && f.fuel > 0 && f.vy > MAX_JETPACK_RISE) {
        f.jetpacking = true;
        f.vy += JETPACK_ACCEL * dt;
        if (f.vy < MAX_JETPACK_RISE) f.vy = MAX_JETPACK_RISE;
        f.fuel = Math.max(0, f.fuel - 36 * fuelEfficiency * dt);
        this.spawnJetpackFlame(f);
        if (f.isHuman) soundEngine.playJetpack();
      }

      if (!f.jetpacking) {
        f.vy = Math.min(MAX_FALL_SPEED, f.vy + gravityAccel * dt);
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
          : trudeauFuel
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

    for (const p of this.map.platforms) {
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

    for (const p of this.map.platforms) {
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
  }

  private isStandingOnIce(f: FighterEntity): boolean {
    if (!f.grounded) return false;
    const feetY = f.y + f.h / 2;
    for (const p of this.map.platforms) {
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
    f.fireCooldownMs = Math.max(0, f.fireCooldownMs - dt * 1000);

    // Dual-Wield Firing Branch
    if (f.dualWield) {
      if (input.shoot && f.fireCooldownMs <= 0) {
        const isSmgs = f.dualWield === 'dual_smgs';
        f.fireCooldownMs = isSmgs ? 88 : 205;
        this.fireDualWieldRound(f);
      }
      return;
    }

    // Active Melee Slot (Key 3): Fire input swings the equipped melee weapon
    if (f.activeSlot === 'melee') {
      if (input.shoot && f.meleeCooldownTimer <= 0) {
        this.performMeleeStrike(f);
      }
      return;
    }

    const w = WEAPONS[f.weaponId];
    const maxClip = this.getEffectiveClipSize(f, f.weaponId);

    if (f.isReloading) {
      f.reloadTimerMs -= dt * 1000;
      if (f.reloadTimerMs <= 0) {
        f.isReloading = false;
        f.ammo = maxClip;
      }
      return;
    }

    if ((input.reload && f.ammo < maxClip) || (input.shoot && f.ammo <= 0)) {
      f.isReloading = true;
      f.reloadTimerMs = this.getEffectiveReloadMs(f, f.weaponId);
      f.burstRemaining = 0;
      if (f.isHuman) soundEngine.playReload();
      return;
    }

    if (f.burstRemaining > 0) {
      f.burstTimerMs -= dt * 1000;
      if (f.burstTimerMs <= 0 && f.ammo > 0) {
        this.fireSingleWeaponRound(f);
        f.burstRemaining -= 1;
        f.burstTimerMs = w.burstIntervalMs || 65;
      }
      return;
    }

    if (input.shoot && f.fireCooldownMs <= 0 && f.ammo > 0) {
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
    const dmgMult = f.characterId === 'iron_bear' && f.ultActiveTimer > 0 ? 2 : 1;

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
        damage: dmg * dmgMult,
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
    const recoilScale = f.characterId === 'iron_bear' ? 0.65 : 1.0;
    f.recoilKick = Math.min(11, (w.recoil / 28) * recoilScale);

    const ironBearDmgMult = f.characterId === 'iron_bear' && f.ultActiveTimer > 0 ? 2 : 1;
    const spreadMult = f.characterId === 'iron_bear' ? 0.65 : 1.0;
    const oneHitSniper = this.rules.oneHitSnipers && w.category === 'Sniper';
    const roundDmg = oneHitSniper ? 240 : w.damage * ironBearDmgMult;

    const muzzleX = f.x + Math.cos(f.aimAngle) * (w.length + 4);
    const muzzleY = f.y - 4 + Math.sin(f.aimAngle) * (w.length + 4);

    if (f.weaponId !== 'bomberier') {
      this.spawnCasing(f.x, f.y - 6, f.facing);
    }

    for (let i = 0; i < w.pellets; i++) {
      const ang = f.aimAngle + (Math.random() - 0.5) * w.spreadRad * spreadMult;
      const spd = w.projectileSpeed * (0.96 + Math.random() * 0.08);
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
        explosionRadius: w.explosionRadius,
        color: w.bulletColor,
        life: w.id === 'bomberier' ? 3.2 : 1.8,
        isRocket: w.id === 'bomberier',
      });
    }

    const p1 = this.fighters[0];
    const distToCam = p1 ? Math.hypot(f.x - p1.x, f.y - p1.y) : 0;
    const vol = Math.max(0.18, 1 - distToCam / 1700);
    soundEngine.playShoot(f.weaponId, vol);
    this.pendingNetEvents.push({ kind: 'shoot', weaponId: f.weaponId, x: f.x, y: f.y });

    f.vx -= Math.cos(f.aimAngle) * w.recoil * 0.16 * recoilScale;
    this.addCameraShake(f.playerIndex, Math.min(6, w.recoil / 50));

    if (f.ammo <= 0) {
      f.isReloading = true;
      f.reloadTimerMs = this.getEffectiveReloadMs(f, f.weaponId);
      f.burstRemaining = 0;
      if (f.isHuman) soundEngine.playReload();
    }
  }

  private updateProjectiles(dt: number): void {
    const kept: ProjectileEntity[] = [];

    for (const proj of this.projectiles) {
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

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;

      if (proj.isRocket && Math.random() < 0.75) {
        this.spawnBurst(proj.x, proj.y, proj.isHoming ? '#FACC15' : '#94A3B8', 1, 35, 'smoke');
      }

      let hit = false;

      if (proj.x < 36 || proj.x > this.map.width - 36 || proj.y < 32 || proj.y > this.map.height) {
        hit = true;
      }

      if (!hit) {
        for (const p of this.map.platforms) {
          if (p.kind === 'oneway') continue;
          if (this.pointInRect(proj.x, proj.y, p.x, p.y, p.w, p.h)) {
            hit = true;
            this.spawnBurst(proj.x, proj.y, '#CBD5E1', 5, 130);
            break;
          }
        }
      }

      if (!hit) {
        for (const tw of this.tempWalls) {
          if (this.pointInRect(proj.x, proj.y, tw.x, tw.y, tw.w, tw.h)) {
            hit = true;
            tw.hp -= proj.damage;
            this.spawnBurst(proj.x, proj.y, '#FACC15', 6, 150);
            break;
          }
        }
      }

      if (!hit) {
        for (const dw of this.destructibleWalls) {
          if (!dw.alive) continue;
          if (this.pointInRect(proj.x, proj.y, dw.x, dw.y, dw.w, dw.h)) {
            hit = true;
            this.damageDestructibleWall(dw, proj.damage, proj.ownerId);
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
            this.damageBarrel(b, proj.damage, proj.ownerId);
            break;
          }
        }
      }

      if (!hit) {
        const owner = this.fighters.find((ft) => ft.id === proj.ownerId);
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
            if (!proj.isRocket) {
              const isHeadshot = proj.y <= f.y - 6;
              const finalDmg = isHeadshot ? Math.round(proj.damage * 1.5) : proj.damage;
              const kWeapon: KillFeedWeaponId =
                proj.killFeedWeaponOverride || (proj.fromUltimate ? 'ultimate' : proj.weaponId);

              this.applyDamage(f, finalDmg, proj.ownerId, kWeapon, isHeadshot);
              this.spawnBurst(proj.x, proj.y, isHeadshot ? '#FACC15' : '#EF4444', isHeadshot ? 10 : 6, 160);

              if (WEAPONS[proj.weaponId].category === 'Sniper') {
                this.hitstopTimer = 0.025;
              }
            }
            break;
          }
        }
      }

      if (hit && proj.isRocket) {
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

  private damageBarrel(b: BarrelEntity, dmg: number, attackerId: string): void {
    b.hp -= dmg;
    b.hitFlashTimer = 0.1;
    if (b.hp <= 0) {
      b.alive = false;
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
    if (Math.random() < 0.28) {
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
        const dmg = Math.round(maxDamage * falloff);
        const knockAng = Math.atan2(f.y - y, f.x - x);
        f.vx += Math.cos(knockAng) * 320 * falloff;
        f.vy += Math.sin(knockAng) * 280 * falloff - 110;
        this.applyDamage(f, dmg, attackerId, weaponId, false);
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
    if (!victim.alive || victim.spawnInvulnTimer > 0) return;

    const attacker = this.fighters.find((f) => f.id === attackerId);
    if (attacker && attacker.id !== victim.id && this.isFriendly(attacker, victim)) {
      return;
    }
    const botDmgMult = attacker && !attacker.isHuman && victim.isHuman ? 0.62 : 1.0;
    const armorMult =
      victim.characterId === 'yogi_boy' && victim.ultActiveTimer > 0 ? 0.4 : 1.0;
    let dmg = Math.max(1, Math.round(rawDmg * armorMult * botDmgMult));

    if (victim.shieldHp > 0 && victim.shieldBuffTimer > 0) {
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
    } else {
      this.spawnFloatingText(victim.x, victim.y - 28, `-${dmg}`, '#F87171');
    }

    if (attacker && attacker.id !== victim.id) {
      attacker.damageDealt += dmg;
      if (isHeadshot) attacker.headshotsCount += 1;
      const ultGainMult = attacker.characterId === 'red_dragon' ? 1.25 : 1.0;
      attacker.ultCharge = Math.min(100, attacker.ultCharge + dmg * 0.65 * ultGainMult);
      if (attacker.isHuman && !isHeadshot) {
        soundEngine.playHit();
        this.pendingNetEvents.push({ kind: 'hit' });
      } else if (isHeadshot) {
        this.pendingNetEvents.push({ kind: 'headshot' });
      }
    }

    if (victim.hp <= 0) {
      this.handleFighterDeath(victim, attackerId, weaponId, isHeadshot);
    }
  }

  private handleFighterDeath(
    victim: FighterEntity,
    killerId: string,
    weaponId: KillFeedWeaponId,
    isHeadshot: boolean
  ): void {
    victim.alive = false;
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

    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      killer.killstreak += 1;
      this.lastKillerId = killer.id;
      this.lastVictimId = victim.id;

      if (this.rules.gameMode === 'tdm') {
        const kTeam = killer.team || 'alpha';
        if (kTeam === 'alpha') {
          this.teamScores.alpha = Math.min(40, this.teamScores.alpha + 1);
        } else {
          this.teamScores.bravo = Math.min(40, this.teamScores.bravo + 1);
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
      weaponId,
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
    f.activeSlot = 'primary';
    f.weaponId = f.primaryWeaponId;
    f.primaryAmmo = this.getEffectiveClipSize(f, f.primaryWeaponId);
    f.secondaryAmmo = this.getEffectiveClipSize(f, f.secondaryWeaponId);
    f.ammo = f.primaryAmmo;
    f.weaponMastery = this.getMasteryForWeapon(f.masteryMap, f.weaponId);
    f.isReloading = false;
    f.alive = true;
    f.carryingFlagTeam = null;
    f.spawnInvulnTimer = 1.6;
    f.grenades = Math.max(f.grenades, 2);
    f.speedBuffTimer = 0;
    f.fuelBuffTimer = 0;
    f.shieldHp = 0;
    f.shieldBuffTimer = 0;
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
    for (const b of this.barrels) {
      if (b.hitFlashTimer > 0) b.hitFlashTimer = Math.max(0, b.hitFlashTimer - dt);
      if (!b.alive) {
        b.respawnTimer -= dt;
        if (b.respawnTimer <= 0) {
          b.alive = true;
          b.hp = b.maxHp;
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

      for (const p of this.map.platforms) {
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
          soundEngine.playPickup();
          if (pu.type === 'speed') {
            f.speedBuffTimer = 9;
            this.spawnFloatingText(f.x, f.y - 38, 'SPEED BOOST!', '#FACC15');
          } else if (pu.type === 'fuel_efficiency') {
            f.fuelBuffTimer = 10;
            f.fuel = f.maxFuel;
            this.spawnFloatingText(f.x, f.y - 38, 'ECO JETPACK!', '#2DD4BF');
          } else {
            f.shieldHp = 60;
            f.shieldBuffTimer = 11;
            this.spawnFloatingText(f.x, f.y - 38, '+60 SHIELD!', '#38BDF8');
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

      for (const p of this.map.platforms) {
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
        for (const p of this.map.platforms) {
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

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const steps = 14;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = x1 + (x2 - x1) * t;
      const sy = y1 + (y2 - y1) * t;
      for (const p of this.map.platforms) {
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
    for (let dist = 24; dist <= maxRange; dist += step) {
      const rx = f.x + dx * dist;
      const ry = f.y - 4 + dy * dist;
      for (const p of this.map.platforms) {
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
    this.spawnParticle({
      x: f.x - f.facing * 12 + (Math.random() - 0.5) * 4,
      y: f.y + 10,
      vx: (Math.random() - 0.5) * 40,
      vy: 120 + Math.random() * 80,
      size: 3 + Math.random() * 2.5,
      color: Math.random() > 0.4 ? flame.primaryColor : flame.secondaryColor,
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
        speechText: f.speechText,
        speechTimer: f.speechTimer,
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
      floatingTexts: this.floatingTexts.map((ft) => ({ ...ft })),
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
        smokeClouds: this.smokeClouds,
        airstrikes: this.airstrikes,
        scorchDecals: this.scorchDecals,
        dualWieldDrops: this.dualWieldDrops,
        isTeamMode: this.isTeamMode(),
        teamScores: this.teamScores,
        hardpoint: this.rules.gameMode === 'hardpoint' ? this.hardpointState : undefined,
        domination: this.rules.gameMode === 'domination' ? this.dominationState : undefined,
        ctf: this.rules.gameMode === 'ctf' ? this.ctfState : undefined,
        uavActiveForCam,
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
      barrels: this.barrels.map((b) => ({
        id: b.id,
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
    }

    this.projectiles = snap.projectiles.map((p) => ({
      ...p,
      ownerId: '',
      damage: 0,
      explosionRadius: 0,
      life: 1,
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

    snap.barrels.forEach((sb) => {
      const b = this.barrels.find((br) => br.id === sb.id);
      if (b) {
        b.alive = sb.alive;
        b.hitFlashTimer = sb.hitFlashTimer;
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
      telemetry: {
        headshots: f.headshotsCount,
        midairKills: f.midairKillsCount,
        meleeKills: f.meleeKillsCount,
        grenadeKills: f.grenadeKillsCount,
        coverDestroyed: f.coverDestroyedCount,
        killstreaksEarned: f.killstreaksEarnedCount,
        usedOnlySniper: !f.usedNonSniper && f.kills > 0,
        kothPoints: Math.round(f.kothPoints),
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
