export type PrimaryWeaponId =
  | 'ak'
  | 'm4a1'
  | 'mp7'
  | 'sawshot'
  | 'double_pump'
  | 'spas12'
  | 'anu34'
  | 'dlp44'
  | 'awq'
  | 'bomberier';

export type SecondaryWeaponId =
  | 'pistol'
  | 'ghost_pistol'
  | 'uzi'
  | 'shorty'
  | 'revolver';

export type WeaponId = PrimaryWeaponId | SecondaryWeaponId;

export type MeleeWeaponId = 'knife' | 'karambit' | 'katana' | 'boxing_glove';

export type WeaponSlot = 'primary' | 'secondary' | 'melee';

export type MapId =
  | 'city_dusk'
  | 'jungle_fortress'
  | 'scorched_desert'
  | 'arctic_bunker'
  | 'hybrid_arena';

export type MatchGameMode = 'tdm' | 'hardpoint' | 'domination' | 'ffa' | 'ctf';

export type TeamId = 'alpha' | 'bravo';

export type PlayerSlotIndex = 1 | 2 | 3 | 4;

export interface CustomMatchRules {
  gravityScale: number; // 0.45 (Low Gravity) .. 1.0 (Standard) .. 1.25
  infiniteFuel: boolean;
  oneHitSnipers: boolean;
  durationSec: number; // 120 .. 600 (10-Minute Chaos Mode)
  gameMode: MatchGameMode;
  enableKillstreaks: boolean;
  showFpsPing?: boolean;
}

export type GrenadeType = 'frag' | 'smoke' | 'plasma';
export type DualWieldType = 'dual_pistols' | 'dual_smgs';
export type WeaponMasteryTier = 'none' | 'camo' | 'gold' | 'diamond';

export type ZoomLevel = 0.5 | 1 | 2 | 3;

export type PowerUpType = 'speed' | 'fuel_efficiency' | 'shield';

export type CharacterId =
  | 'mitron'
  | 'tariff_boss'
  | 'revolutionary'
  | 'yogi_boy'
  | 'red_dragon'
  | 'iron_bear'
  | 'dashing_trudeau'
  | 'thongi_baba';

export type FlameColorId =
  | 'amber'
  | 'cobalt'
  | 'crimson'
  | 'emerald'
  | 'violet'
  | 'gold';

export type OutfitId =
  | 'charcoal'
  | 'navy'
  | 'olive'
  | 'burgundy'
  | 'stealth'
  | 'sovereign';

export type RankId =
  | 'intern'
  | 'councilor'
  | 'senator'
  | 'minister'
  | 'prime_commander';

export interface RankDef {
  id: RankId;
  title: string;
  minXp: number;
  badgeColor: string;
  stars: number;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  archetype: string;
  tagline: string;
  skinTone: string;
  hairColor: string;
  hairStyle:
    | 'swept_white'
    | 'swept_blonde'
    | 'short_stubble'
    | 'shaved_tilak'
    | 'mao_part'
    | 'receding_blonde'
    | 'wavy_curls'
    | 'steve_sigma';
  defaultSuitColor: string;
  tieColor: string;
  cost?: number;
  isPremium?: boolean;
  passivePerkTitle: string;
  passivePerkDesc: string;
  ultimateTitle: string;
  ultimateDesc: string;
  killQuips: string[];
  spawnQuips: string[];
  ultQuips: string[];
}

export interface WeaponDef {
  id: WeaponId;
  slot: 'primary' | 'secondary';
  name: string;
  shortName: string;
  category:
    | 'Assault Rifle'
    | 'SMG'
    | 'Shotgun'
    | 'Sniper'
    | 'Rocket Launcher'
    | 'Pistol'
    | 'Revolver';
  damage: number;
  fireRateMs: number;
  clipSize: number;
  reloadMs: number;
  projectileSpeed: number;
  pellets: number;
  spreadRad: number;
  recoil: number;
  explosionRadius: number;
  bulletColor: string;
  length: number;
  isAuto: boolean;
  suppressed?: boolean;
  burstCount?: number;
  burstIntervalMs?: number;
}

export interface MeleeWeaponDef {
  id: MeleeWeaponId;
  name: string;
  shortName: string;
  description: string;
  cost: number;
  damage: number;
  range: number;
  cooldownSec: number;
  swingDurationSec: number;
  knockback: number;
  primaryColor: string;
  accentColor: string;
}

export interface CosmeticItem<T extends string = string> {
  id: T;
  name: string;
  description: string;
  cost: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface CareerCounters {
  midairKills: number;
  sniperOnlyWins: number;
  meleeKills: number;
  grenadeKills: number;
  coverDestroyed: number;
  kothWins: number;
  killstreaksEarned: number;
  headshots: number;
}

export interface DailyChallengeProgress {
  id: string;
  dateKey: string;
  progress: number;
  claimed: boolean;
}

export interface CareerStats {
  kills: number;
  deaths: number;
  matchesPlayed: number;
  wins: number;
  weaponKills: Record<WeaponId, number>;
}

export interface PlayerCosmetics {
  unlockedFlames: FlameColorId[];
  unlockedOutfits: OutfitId[];
  unlockedWeapons: WeaponId[];
  unlockedSecondaries?: SecondaryWeaponId[];
  unlockedMelees?: MeleeWeaponId[];
  unlockedCharacters?: CharacterId[];
  equippedFlame: FlameColorId;
  equippedOutfit: OutfitId;
  equippedStartingWeapon: WeaponId;
  equippedSecondary?: SecondaryWeaponId;
  equippedMelee?: MeleeWeaponId;
}

export type FriendStatus = 'online' | 'in_match' | 'offline';

export interface FriendEntry {
  id: string;
  playerTag: string;
  username: string;
  rankTitle: string;
  characterId: CharacterId;
  outfitId: OutfitId;
  status: FriendStatus;
  isAiRival?: boolean;
  addedAt: number;
}

export interface FriendRequest {
  id: string;
  fromTag: string;
  fromUsername: string;
  fromCharacterId: CharacterId;
  fromRankTitle: string;
  direction: 'incoming' | 'outgoing';
  createdAt: number;
}

export interface PartyMember {
  slot: PlayerSlotIndex;
  id: string;
  username: string;
  playerTag: string;
  characterId: CharacterId;
  outfitId: OutfitId;
  flameId: FlameColorId;
  startingWeapon: WeaponId;
  secondaryWeapon?: SecondaryWeaponId;
  meleeWeapon?: MeleeWeaponId;
  weaponMastery: WeaponMasteryTier;
  xp: number;
  rankTitle: string;
  isHost: boolean;
  isAi: boolean;
  isReady: boolean;
  status?: FriendStatus;
}

export interface PartyChatMessage {
  id: string;
  senderName: string;
  senderTag: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface VoteLobbyOption {
  id: string;
  isRandom?: boolean;
  mapId: MapId;
  gameMode: MatchGameMode;
}

export interface PlayerProfile {
  id: string;
  username: string;
  discriminator: string;
  playerTag: string;
  pinHash: string;
  avatarId: CharacterId;
  tagline: string;
  xp: number;
  coins: number;
  stats: CareerStats;
  cosmetics: PlayerCosmetics;
  masteryEquipped?: Partial<Record<WeaponId, WeaponMasteryTier>>;
  careerCounters?: CareerCounters;
  unlockedAchievements?: string[];
  dailyChallenges?: DailyChallengeProgress[];
  friends?: FriendEntry[];
  friendRequests?: FriendRequest[];
  createdAt: number;
  lastPlayedAt: number;
  isGuest?: boolean;
}

export type GameMode = 'solo' | 'versus_2p' | 'online_host' | 'online_client';

export type ScreenState =
  | 'TITLE_MENU'
  | 'MAP_VOTING'
  | 'PLAYING'
  | 'PAUSED'
  | 'KILL_CAM'
  | 'MATCH_SUMMARY';

export interface FighterMatchTelemetry {
  headshots: number;
  midairKills: number;
  meleeKills: number;
  grenadeKills: number;
  coverDestroyed: number;
  killstreaksEarned: number;
  usedOnlySniper: boolean;
  kothPoints: number;
}

export interface FighterMatchSummary {
  id: string;
  name: string;
  characterId: CharacterId;
  isHuman: boolean;
  playerIndex?: PlayerSlotIndex;
  team?: TeamId;
  profileId?: string;
  kills: number;
  deaths: number;
  damageDealt: number;
  weaponKills: Record<WeaponId, number>;
  rankTitle: string;
  kothPoints?: number;
  objectivePoints?: number;
  telemetry?: FighterMatchTelemetry;
}

export interface MatchSummary {
  mode: GameMode;
  mapId: MapId;
  gameMode: MatchGameMode;
  durationSec: number;
  winnerId: string;
  winnerTeam?: TeamId;
  teamScores?: TeamScoreHud;
  standings: FighterMatchSummary[];
  p1Reward?: PlayerMatchReward;
  p2Reward?: PlayerMatchReward;
}

export interface PlayerMatchReward {
  profileId: string;
  username: string;
  isGuest: boolean;
  kills: number;
  deaths: number;
  won: boolean;
  xpEarned: number;
  coinsEarned: number;
  prevXp: number;
  newXp: number;
  prevRank: RankDef;
  newRank: RankDef;
  rankedUp: boolean;
  savedToDb: boolean;
  newAchievements?: string[];
  completedChallenges?: string[];
}

export interface HudFighterSnapshot {
  id: string;
  name: string;
  characterId: CharacterId;
  isHuman: boolean;
  playerIndex?: PlayerSlotIndex;
  team: TeamId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  fuel: number;
  maxFuel: number;
  weaponId: WeaponId;
  activeSlot: WeaponSlot;
  primaryWeaponId: WeaponId;
  secondaryWeaponId: SecondaryWeaponId;
  meleeWeaponId: MeleeWeaponId;
  weaponMastery: WeaponMasteryTier;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  ultCharge: number;
  ultActive: boolean;
  ultTitle: string;
  kills: number;
  deaths: number;
  alive: boolean;
  respawnTimer: number;
  speedBuffTimer: number;
  fuelBuffTimer: number;
  shieldHp: number;
  shieldBuffTimer: number;
  wallSliding: boolean;
  grenades: number;
  grenadeType: GrenadeType;
  meleeCooldownPct: number;
  dualWield: DualWieldType | null;
  dualWieldAmmo: number;
  killstreak: number;
  uavTimer: number;
  rapidJetTimer: number;
  kothPoints: number;
  inPodium: boolean;
  carryingFlagTeam?: TeamId | null;
}

export type KillFeedWeaponId =
  | WeaponId
  | MeleeWeaponId
  | 'barrel'
  | 'ultimate'
  | 'melee'
  | 'frag'
  | 'plasma'
  | 'airstrike'
  | 'dual_pistols'
  | 'dual_smgs';

export interface KillFeedItem {
  id: number;
  killerName: string;
  killerPlayerIndex?: PlayerSlotIndex;
  victimName: string;
  victimPlayerIndex?: PlayerSlotIndex;
  weaponId: KillFeedWeaponId;
  isHeadshot?: boolean;
  multiKillCount?: number;
  timestamp: number;
}

export interface HudPickupMarker {
  id: string;
  x: number;
  y: number;
  type: 'medkit' | 'fuel';
  active: boolean;
}

export interface HudDualWieldDrop {
  id: number;
  x: number;
  y: number;
  type: DualWieldType;
}

export interface TeamScoreHud {
  alpha: number;
  bravo: number;
  targetScore: number;
  label: string;
}

export interface HardpointHudState {
  zoneIndex: number;
  zoneLabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotateTimerSec: number;
  ownerTeam: TeamId | null;
  contested: boolean;
  alphaScore: number;
  bravoScore: number;
  targetScore: number;
}

export interface DominationFlagHud {
  id: 'A' | 'B' | 'C';
  label: string;
  x: number;
  y: number;
  ownerTeam: TeamId | null;
  capturingTeam: TeamId | null;
  progress: number; // -100 (bravo) .. 0 .. +100 (alpha)
  contested: boolean;
}

export interface DominationHudState {
  flags: DominationFlagHud[];
  alphaScore: number;
  bravoScore: number;
  targetScore: number;
}

export interface CtfFlagHud {
  team: TeamId;
  state: 'at_base' | 'carried' | 'dropped';
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  carrierId: string | null;
  carrierName: string | null;
  returnTimerSec: number;
}

export interface CtfHudState {
  flags: [CtfFlagHud, CtfFlagHud];
  alphaCaptures: number;
  bravoCaptures: number;
  targetCaptures: number;
}

export interface KothHudState {
  podiumX: number;
  podiumY: number;
  podiumW: number;
  podiumH: number;
  ownerId: string | null;
  ownerName: string | null;
  contested: boolean;
  targetPoints: number;
  scores: Array<{
    id: string;
    name: string;
    points: number;
    isHuman: boolean;
    playerIndex?: PlayerSlotIndex;
  }>;
}

export interface MultikillAnnouncement {
  id: number;
  playerId: string;
  playerName: string;
  playerIndex?: PlayerSlotIndex;
  streakCount: number;
  title: string;
  subtitle: string;
  remainingSec: number;
  bannerTone?: 'blood' | 'streak' | 'shutdown' | 'killstreak';
}

export type DestructibleWallStyle =
  | 'brick'
  | 'timber'
  | 'sandstone'
  | 'crate_cover'
  | 'glass'
  | 'crate_wood';

export interface AimedWallSnapshot {
  wallId: string;
  style: DestructibleWallStyle;
  hp: number;
  maxHp: number;
  playerIndex: PlayerSlotIndex;
}

export interface KillIconPrompt {
  id: number;
  playerIndex: PlayerSlotIndex;
  victimName: string;
  isHeadshot?: boolean;
  remainingSec: number;
}

export interface HudSnapshot {
  mapId: MapId;
  rules: CustomMatchRules;
  timeRemainingSec: number;
  fps?: number;
  fighters: HudFighterSnapshot[];
  killFeed: KillFeedItem[];
  pickups: HudPickupMarker[];
  dualWieldDrops: HudDualWieldDrop[];
  announcer: MultikillAnnouncement | null;
  aimedWalls: AimedWallSnapshot[];
  killIcons?: KillIconPrompt[];
  teamScores?: TeamScoreHud;
  hardpoint?: HardpointHudState;
  domination?: DominationHudState;
  ctf?: CtfHudState;
  koth?: KothHudState;
}

export interface RemoteInputPacket {
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
}

export interface OnlinePeerMeta {
  username: string;
  playerTag?: string;
  profileId: string;
  characterId: CharacterId;
  outfitId: OutfitId;
  flameId: FlameColorId;
  startingWeapon: WeaponId;
  secondaryWeapon?: SecondaryWeaponId;
  meleeWeapon?: MeleeWeaponId;
  xp: number;
  masteryEquipped?: Partial<Record<WeaponId, WeaponMasteryTier>>;
}

export interface WorldSyncFighter {
  id: string;
  name: string;
  characterId: CharacterId;
  outfitId: OutfitId;
  flameId: FlameColorId;
  rankId: RankId;
  isHuman: boolean;
  playerIndex?: PlayerSlotIndex;
  team?: TeamId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  aimAngle: number;
  grounded: boolean;
  wallSliding?: boolean;
  jetpacking: boolean;
  hp: number;
  maxHp: number;
  fuel: number;
  maxFuel: number;
  weaponId: WeaponId;
  activeSlot?: WeaponSlot;
  primaryWeaponId?: WeaponId;
  secondaryWeaponId?: SecondaryWeaponId;
  meleeWeaponId?: MeleeWeaponId;
  weaponMastery?: WeaponMasteryTier;
  ammo: number;
  isReloading: boolean;
  reloadProgress: number;
  ultCharge: number;
  ultActiveTimer: number;
  muzzleFlashTimer: number;
  hitFlashTimer: number;
  meleeSwingTimer?: number;
  walkCycle: number;
  alive: boolean;
  respawnTimer: number;
  spawnInvulnTimer: number;
  kills: number;
  deaths: number;
  speedBuffTimer: number;
  fuelBuffTimer: number;
  shieldHp: number;
  shieldBuffTimer: number;
  grenades?: number;
  grenadeType?: GrenadeType;
  dualWield?: DualWieldType | null;
  dualWieldAmmo?: number;
  killstreak?: number;
  uavTimer?: number;
  rapidJetTimer?: number;
  kothPoints?: number;
  speechText?: string;
  speechTimer?: number;
}

export interface WorldSyncSnapshot {
  timeRemainingSec: number;
  elapsedSec: number;
  fighters: WorldSyncFighter[];
  projectiles: Array<{
    id: number;
    weaponId: WeaponId;
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    vx: number;
    vy: number;
    color: string;
    isRocket: boolean;
    isHoming?: boolean;
  }>;
  grenades?: Array<{
    id: number;
    type: GrenadeType;
    x: number;
    y: number;
    rot: number;
    stuck?: boolean;
    fuseTimer: number;
  }>;
  smokeClouds?: Array<{
    id: number;
    x: number;
    y: number;
    radius: number;
    life: number;
    maxLife: number;
  }>;
  airstrikes?: Array<{
    id: number;
    targetX: number;
    targetY: number;
    timer: number;
  }>;
  dualWieldDrops?: Array<{
    id: number;
    x: number;
    y: number;
    type: DualWieldType;
    life: number;
  }>;
  barrels: Array<{ id: string; alive: boolean; hitFlashTimer: number }>;
  pickups: Array<{ id: string; active: boolean; respawnTimer: number }>;
  tempWalls: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    hp: number;
    maxHp: number;
    life: number;
  }>;
  destructibleWalls: Array<{
    id: string;
    hp: number;
    alive: boolean;
    hitFlashTimer: number;
  }>;
  powerUps: Array<{
    id: number;
    x: number;
    y: number;
    type: PowerUpType;
    life: number;
  }>;
  teamScores?: TeamScoreHud;
  hardpoint?: HardpointHudState;
  domination?: DominationHudState;
  ctf?: CtfHudState;
  koth?: KothHudState;
  killFeed: KillFeedItem[];
  announcer: MultikillAnnouncement | null;
  events: Array<{
    kind:
      | 'shoot'
      | 'explosion'
      | 'hit'
      | 'headshot'
      | 'ult'
      | 'pickup'
      | 'quip'
      | 'multikill'
      | 'crumble'
      | 'glass_shatter'
      | 'melee'
      | 'airstrike'
      | 'player_kill'
      | 'flag_event';
    weaponId?: WeaponId;
    meleeWeaponId?: MeleeWeaponId;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    text?: string;
    streakCount?: number;
    playerIndex?: PlayerSlotIndex;
    isHeadshot?: boolean;
  }>;
}

export interface ReplayFighterMeta {
  id: string;
  name: string;
  characterId: CharacterId;
  outfitId: OutfitId;
  flameId: FlameColorId;
  rankId: RankId;
  isHuman: boolean;
  playerIndex?: PlayerSlotIndex;
  team?: TeamId;
  weaponMastery?: WeaponMasteryTier;
}

export interface ReplayFighterState {
  id: string;
  x: number;
  y: number;
  facing: 1 | -1;
  aimAngle: number;
  grounded: boolean;
  wallSliding?: boolean;
  jetpacking: boolean;
  hp: number;
  maxHp: number;
  weaponId: WeaponId;
  activeSlot?: WeaponSlot;
  meleeWeaponId?: MeleeWeaponId;
  weaponMastery?: WeaponMasteryTier;
  dualWield?: DualWieldType | null;
  ultActiveTimer: number;
  muzzleFlashTimer: number;
  hitFlashTimer: number;
  meleeSwingTimer?: number;
  walkCycle: number;
  alive: boolean;
  spawnInvulnTimer: number;
  kills: number;
  deaths: number;
  speedBuffTimer?: number;
  fuelBuffTimer?: number;
  shieldHp?: number;
  shieldBuffTimer?: number;
  speechText?: string;
  speechTimer?: number;
}

export interface ReplayProjectileState {
  id: number;
  weaponId: WeaponId;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  color: string;
  isRocket: boolean;
  isHoming?: boolean;
}

export interface ReplayFrame {
  elapsedSec: number;
  timeRemainingSec: number;
  fighters: ReplayFighterState[];
  projectiles: ReplayProjectileState[];
  grenades?: Array<{
    id: number;
    type: GrenadeType;
    x: number;
    y: number;
    rot: number;
    stuck?: boolean;
    fuseTimer: number;
  }>;
  smokeClouds?: Array<{
    id: number;
    x: number;
    y: number;
    radius: number;
    life: number;
    maxLife: number;
  }>;
  airstrikes?: Array<{
    id: number;
    targetX: number;
    targetY: number;
    timer: number;
  }>;
  barrelsAlive: boolean[];
  pickupsActive: boolean[];
  destructibleWalls: Array<{ hp: number; alive: boolean; hitFlashTimer: number }>;
  tempWalls: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    hp: number;
    maxHp: number;
    life: number;
  }>;
  powerUps?: Array<{
    id: number;
    x: number;
    y: number;
    type: PowerUpType;
    life: number;
  }>;
  dualWieldDrops?: Array<{
    id: number;
    x: number;
    y: number;
    type: DualWieldType;
    life: number;
  }>;
  floatingTexts: Array<{
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    maxLife: number;
  }>;
  killFeed: KillFeedItem[];
  announcer: MultikillAnnouncement | null;
}

export interface MatchReplayData {
  mode: GameMode;
  mapId?: MapId;
  durationSec: number;
  fightersMeta: ReplayFighterMeta[];
  frames: ReplayFrame[];
  killEvents: KillFeedItem[];
  winningKillerId?: string;
  winningVictimId?: string;
}
