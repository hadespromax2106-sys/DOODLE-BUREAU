import {
  ACHIEVEMENTS,
  BOT_NAMES,
  CHARACTERS,
  DEFAULT_FREE_CHARACTERS,
  FLAME_COSMETICS,
  GUN_WRAPS,
  MELEE_WEAPONS,
  OUTFIT_COSMETICS,
  PROMO_CODES,
  SECONDARY_WEAPON_COSMETICS,
  STARTING_WEAPON_COSMETICS,
  WEAPON_MASTERY_TIERS,
  getDailyChallengesForDate,
  getRankForXp,
  getTodayDateKey,
  normalizeCharacterId,
  normalizeGunWrapId,
  normalizeMeleeId,
  normalizeOutfitId,
  normalizeSecondaryId,
  normalizeWeaponId,
} from '../data/catalog';
import {
  CareerCounters,
  CharacterId,
  DailyChallengeProgress,
  FighterMatchTelemetry,
  FlameColorId,
  FriendEntry,
  GunWrapId,
  MeleeWeaponId,
  OutfitId,
  PlayerMatchReward,
  PlayerProfile,
  SecondaryWeaponId,
  WeaponId,
  WeaponMasteryTier,
} from '../types/game';

const DB_NAME = 'doodle_bureau_db';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';
const LS_FALLBACK_KEY = 'doodle_bureau_profiles_v1';
const LS_ACTIVE_P1_KEY = 'doodle_bureau_active_p1';
const LS_ACTIVE_P2_KEY = 'doodle_bureau_active_p2';

export function createEmptyWeaponKills(): Record<WeaponId, number> {
  return {
    ak: 0,
    m4a1: 0,
    mp7: 0,
    sawshot: 0,
    double_pump: 0,
    spas12: 0,
    anu34: 0,
    dlp44: 0,
    awq: 0,
    bomberier: 0,
    plasma_repeater: 0,
    boomstick: 0,
    minigun: 0,
    crossbow_launcher: 0,
    freeze_ray: 0,
    orbital_laser: 0,
    pistol: 0,
    ghost_pistol: 0,
    uzi: 0,
    shorty: 0,
    revolver: 0,
  };
}

export function isBotReservedName(name: string): boolean {
  const clean = name.trim().toLowerCase();
  return BOT_NAMES.some((b) => b.toLowerCase() === clean);
}

export function makeUniqueUsername(baseName: string, takenNames: Set<string>): string {
  const trimmed = baseName.trim().slice(0, 18) || 'Agent';
  if (!takenNames.has(trimmed.toLowerCase())) {
    takenNames.add(trimmed.toLowerCase());
    return trimmed;
  }
  for (let i = 2; i <= 999; i++) {
    const suffix = `_${i}`;
    const candidate = `${trimmed.slice(0, Math.max(2, 18 - suffix.length))}${suffix}`;
    if (!takenNames.has(candidate.toLowerCase())) {
      takenNames.add(candidate.toLowerCase());
      return candidate;
    }
  }
  const fallback = `${trimmed.slice(0, 12)}_${Math.floor(100 + Math.random() * 899)}`;
  takenNames.add(fallback.toLowerCase());
  return fallback;
}

export async function isUsernameTaken(
  username: string,
  excludeProfileId?: string,
  extraBlockedNames: string[] = []
): Promise<boolean> {
  const clean = username.trim().toLowerCase();
  if (!clean) return true;
  if (isBotReservedName(clean)) return true;
  if (extraBlockedNames.some((n) => n.trim().toLowerCase() === clean)) return true;
  const existing = await listAllProfiles();
  return existing.some(
    (p) => p.id !== excludeProfileId && p.username.trim().toLowerCase() === clean
  );
}

export function createEmptyCareerCounters(): CareerCounters {
  return {
    midairKills: 0,
    sniperOnlyWins: 0,
    meleeKills: 0,
    grenadeKills: 0,
    coverDestroyed: 0,
    kothWins: 0,
    killstreaksEarned: 0,
    headshots: 0,
  };
}

function buildDailyChallengesForToday(
  existing?: DailyChallengeProgress[]
): DailyChallengeProgress[] {
  const todayKey = getTodayDateKey();
  const defs = getDailyChallengesForDate(todayKey);
  return defs.map((def) => {
    const match = Array.isArray(existing)
      ? existing.find((e) => e.id === def.id && e.dateKey === todayKey)
      : undefined;
    return (
      match || {
        id: def.id,
        dateKey: todayKey,
        progress: 0,
        claimed: false,
      }
    );
  });
}

export async function hashPin(pin: string): Promise<string> {
  const normalized = pin.trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(`db_salt_${normalized}_arena`);
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback below
    }
  }
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv_${(hash >>> 0).toString(16)}`;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `prof_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function computeDiscriminator(seedInput: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seedInput.length; i++) {
    hash ^= seedInput.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const num = 1000 + ((hash >>> 0) % 9000);
  return String(num);
}

export function formatPlayerTag(username: string, discriminator?: string): string {
  const disc = discriminator && /^\d{4}$/.test(discriminator)
    ? discriminator
    : computeDiscriminator(username);
  return `${username}#${disc}`;
}

export function getSampleAiRivals(): FriendEntry[] {
  const baseTs = 1700000000000;
  return [
    {
      id: 'rival_voltage_01',
      playerTag: 'Bot_Voltage#7104',
      username: 'Bot_Voltage',
      rankTitle: 'Senator',
      characterId: 'baron_voltage',
      outfitId: 'navy',
      status: 'online',
      isAiRival: true,
      addedAt: baseTs + 1,
    },
    {
      id: 'rival_wifi_02',
      playerTag: 'Bot_WiFi#4492',
      username: 'Bot_WiFi',
      rankTitle: 'Minister',
      characterId: 'baba_wifi',
      outfitId: 'sovereign',
      status: 'online',
      isAiRival: true,
      addedAt: baseTs + 2,
    },
    {
      id: 'rival_chappal_03',
      playerTag: 'Bot_Chappal#8831',
      username: 'Bot_Chappal',
      rankTitle: 'Councilor',
      characterId: 'chappal_ninja',
      outfitId: 'burgundy',
      status: 'in_match',
      isAiRival: true,
      addedAt: baseTs + 3,
    },
    {
      id: 'rival_404_04',
      playerTag: 'Bot_404#2059',
      username: 'Bot_404',
      rankTitle: 'Prime Commander',
      characterId: 'agent_404',
      outfitId: 'stealth',
      status: 'offline',
      isAiRival: true,
      addedAt: baseTs + 4,
    },
  ];
}

// --- IndexedDB + localStorage Dual-Layer Persistence ---

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('usernameLower', 'usernameLower', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

function readLocalFallback(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalFallback(profiles: PlayerProfile[]): void {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(profiles));
  } catch {
    // Ignore storage quota errors
  }
}

async function syncFallbackMirror(profiles: PlayerProfile[]): Promise<void> {
  writeLocalFallback(profiles);
}

export async function listAllProfiles(): Promise<PlayerProfile[]> {
  try {
    const db = await openDb();
    const profiles = await new Promise<PlayerProfile[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as PlayerProfile[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (profiles.length === 0) {
      const ls = readLocalFallback();
      if (ls.length > 0) {
        for (const p of ls) {
          await putProfile(p);
        }
        return ls.map((p) => normalizeProfile(p));
      }
    } else {
      await syncFallbackMirror(profiles);
    }
    return profiles.map((p) => normalizeProfile(p));
  } catch {
    return readLocalFallback().map((p) => normalizeProfile(p));
  }
}

export async function getProfileById(id: string): Promise<PlayerProfile | null> {
  if (!id) return null;
  try {
    const db = await openDb();
    const result = await new Promise<PlayerProfile | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as PlayerProfile) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (result) return normalizeProfile(result);
  } catch {
    // Fallback below
  }
  const ls = readLocalFallback();
  const found = ls.find((p) => p.id === id);
  return found ? normalizeProfile(found) : null;
}

export async function putProfile(profile: PlayerProfile): Promise<PlayerProfile> {
  const sanitized = normalizeProfile(profile);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        ...sanitized,
        usernameLower: sanitized.username.toLowerCase(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Fallback handled below
  }
  const ls = readLocalFallback();
  const idx = ls.findIndex((p) => p.id === sanitized.id);
  if (idx >= 0) {
    ls[idx] = sanitized;
  } else {
    ls.push(sanitized);
  }
  writeLocalFallback(ls);
  return sanitized;
}

export async function deleteProfile(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Fallback below
  }
  const ls = readLocalFallback().filter((p) => p.id !== id);
  writeLocalFallback(ls);
}

function normalizeProfile(raw: Partial<PlayerProfile>): PlayerProfile {
  const id = String(raw.id || generateId());
  const username = String(raw.username || 'Agent').slice(0, 20);
  const discriminator =
    typeof raw.discriminator === 'string' && /^\d{4}$/.test(raw.discriminator)
      ? raw.discriminator
      : computeDiscriminator(`${id}_${username}`);
  const playerTag = formatPlayerTag(username, discriminator);

  return {
    id,
    username,
    discriminator,
    playerTag,
    pinHash: String(raw.pinHash || ''),
    avatarId: normalizeCharacterId(raw.avatarId),
    tagline: String(raw.tagline || 'Ready for arena combat.').slice(0, 60),
    xp: Math.max(0, Number(raw.xp) || 0),
    coins: Math.max(0, Number(raw.coins) || 0),
    stats: {
      kills: Math.max(0, Number(raw.stats?.kills) || 0),
      deaths: Math.max(0, Number(raw.stats?.deaths) || 0),
      matchesPlayed: Math.max(0, Number(raw.stats?.matchesPlayed) || 0),
      wins: Math.max(0, Number(raw.stats?.wins) || 0),
      weaponKills: {
        ...createEmptyWeaponKills(),
        ...(raw.stats?.weaponKills || {}),
      },
    },
    cosmetics: {
      unlockedFlames: Array.isArray(raw.cosmetics?.unlockedFlames)
        ? raw.cosmetics!.unlockedFlames.includes('amber')
          ? raw.cosmetics!.unlockedFlames
          : ['amber', ...raw.cosmetics!.unlockedFlames]
        : ['amber'],
      unlockedOutfits: Array.isArray(raw.cosmetics?.unlockedOutfits)
        ? raw.cosmetics!.unlockedOutfits.includes('charcoal')
          ? raw.cosmetics!.unlockedOutfits
          : ['charcoal', ...raw.cosmetics!.unlockedOutfits]
        : ['charcoal'],
      unlockedWeapons: Array.isArray(raw.cosmetics?.unlockedWeapons)
        ? raw.cosmetics!.unlockedWeapons.includes('ak')
          ? raw.cosmetics!.unlockedWeapons
          : ['ak', ...raw.cosmetics!.unlockedWeapons]
        : ['ak'],
      unlockedSecondaries: Array.from(
        new Set<SecondaryWeaponId>([
          'pistol',
          ...(Array.isArray(raw.cosmetics?.unlockedSecondaries)
            ? raw.cosmetics!.unlockedSecondaries
            : []),
        ])
      ),
      unlockedMelees: Array.from(
        new Set<MeleeWeaponId>([
          'knife',
          ...(Array.isArray(raw.cosmetics?.unlockedMelees)
            ? raw.cosmetics!.unlockedMelees
            : []),
        ])
      ),
      unlockedCharacters: Array.from(
        new Set<CharacterId>([
          ...DEFAULT_FREE_CHARACTERS,
          ...(Array.isArray(raw.cosmetics?.unlockedCharacters)
            ? raw.cosmetics!.unlockedCharacters.map((c) => normalizeCharacterId(c))
            : []),
        ])
      ),
      unlockedWraps: Array.from(
        new Set<GunWrapId>([
          'none',
          ...(Array.isArray(raw.cosmetics?.unlockedWraps)
            ? raw.cosmetics!.unlockedWraps.map((w) => normalizeGunWrapId(w))
            : []),
        ])
      ),
      equippedFlame: (raw.cosmetics?.equippedFlame || 'amber') as FlameColorId,
      equippedOutfit: normalizeOutfitId(raw.cosmetics?.equippedOutfit),
      equippedStartingWeapon: normalizeWeaponId(raw.cosmetics?.equippedStartingWeapon),
      equippedSecondary: normalizeSecondaryId(raw.cosmetics?.equippedSecondary),
      equippedMelee: normalizeMeleeId(raw.cosmetics?.equippedMelee),
      equippedWrap: normalizeGunWrapId(raw.cosmetics?.equippedWrap),
    },
    masteryEquipped: { ...(raw.masteryEquipped || {}) },
    careerCounters: {
      ...createEmptyCareerCounters(),
      ...(raw.careerCounters || {}),
    },
    unlockedAchievements: Array.isArray(raw.unlockedAchievements)
      ? [...raw.unlockedAchievements]
      : [],
    dailyChallenges: buildDailyChallengesForToday(raw.dailyChallenges),
    friends: Array.isArray(raw.friends) ? [...raw.friends] : [],
    friendRequests: Array.isArray(raw.friendRequests) ? [...raw.friendRequests] : [],
    redeemedCodes: Array.isArray(raw.redeemedCodes) ? [...raw.redeemedCodes] : [],
    createdAt: Number(raw.createdAt) || Date.now(),
    lastPlayedAt: Number(raw.lastPlayedAt) || Date.now(),
  };
}

export async function registerProfile(params: {
  username: string;
  pin: string;
  avatarId: CharacterId;
  tagline: string;
  blockedNames?: string[];
}): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }> {
  const cleanName = params.username.trim();
  if (cleanName.length < 2 || cleanName.length > 18) {
    return { ok: false, error: 'Username must be between 2 and 18 characters.' };
  }
  if (params.pin.trim().length < 3) {
    return { ok: false, error: 'PIN / Password must be at least 3 characters.' };
  }
  if (isBotReservedName(cleanName)) {
    return { ok: false, error: 'That callsign belongs to an arena bot. Pick a unique name.' };
  }
  if ((params.blockedNames || []).some((n) => n.trim().toLowerCase() === cleanName.toLowerCase())) {
    return { ok: false, error: 'That name is already in use by another active player.' };
  }
  const existing = await listAllProfiles();
  if (existing.some((p) => p.username.trim().toLowerCase() === cleanName.toLowerCase())) {
    return { ok: false, error: 'Username already taken. Every player must have a unique name.' };
  }

  const pinHash = await hashPin(params.pin);
  const newId = generateId();
  const disc = String(1000 + Math.floor(Math.random() * 9000));
  const profile = normalizeProfile({
    id: newId,
    username: cleanName,
    discriminator: disc,
    playerTag: formatPlayerTag(cleanName, disc),
    pinHash,
    avatarId: params.avatarId,
    tagline: params.tagline.trim() || 'Chai first, ask later.',
    xp: 0,
    coins: 75,
    stats: {
      kills: 0,
      deaths: 0,
      matchesPlayed: 0,
      wins: 0,
      weaponKills: createEmptyWeaponKills(),
    },
    friends: [],
    friendRequests: [],
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
  });

  const saved = await putProfile(profile);
  return { ok: true, profile: saved };
}

export async function loginProfile(
  username: string,
  pin: string
): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }> {
  const cleanName = username.trim().toLowerCase();
  if (!cleanName) {
    return { ok: false, error: 'Enter a username.' };
  }
  const all = await listAllProfiles();
  const target = all.find((p) => p.username.toLowerCase() === cleanName);
  if (!target) {
    return { ok: false, error: 'Profile not found on this device.' };
  }
  const hashed = await hashPin(pin);
  if (target.pinHash !== hashed) {
    return { ok: false, error: 'Incorrect PIN / Password.' };
  }
  target.lastPlayedAt = Date.now();
  await putProfile(target);
  return { ok: true, profile: target };
}

export function createGuestProfile(
  slot: 1 | 2,
  avatarId: CharacterId = slot === 1 ? 'chai_storm' : 'baron_voltage',
  customName?: string,
  blockedNames: string[] = []
): PlayerProfile {
  const baseName = customName?.trim().slice(0, 18) || (slot === 1 ? 'Guest_P1' : 'Guest_P2');
  const taken = new Set<string>([
    ...BOT_NAMES.map((b) => b.toLowerCase()),
    ...blockedNames.map((n) => n.trim().toLowerCase()),
  ]);
  const username = makeUniqueUsername(baseName, taken);
  const disc = computeDiscriminator(`${username}_${slot}`);
  return {
    id: `guest_${slot}_${Date.now()}`,
    username,
    discriminator: disc,
    playerTag: formatPlayerTag(username, disc),
    pinHash: '',
    avatarId: normalizeCharacterId(avatarId),
    tagline: 'Unregistered observer.',
    xp: 0,
    coins: 0,
    stats: {
      kills: 0,
      deaths: 0,
      matchesPlayed: 0,
      wins: 0,
      weaponKills: createEmptyWeaponKills(),
    },
    cosmetics: {
      unlockedFlames: ['amber'],
      unlockedOutfits: ['charcoal'],
      unlockedWeapons: ['ak'],
      unlockedSecondaries: ['pistol'],
      unlockedMelees: ['knife'],
      unlockedCharacters: [...DEFAULT_FREE_CHARACTERS],
      unlockedWraps: ['none'],
      equippedFlame: 'amber',
      equippedOutfit: 'charcoal',
      equippedStartingWeapon: 'ak',
      equippedSecondary: 'pistol',
      equippedMelee: 'knife',
      equippedWrap: 'none',
    },
    masteryEquipped: {},
    careerCounters: createEmptyCareerCounters(),
    unlockedAchievements: [],
    dailyChallenges: buildDailyChallengesForToday(),
    friends: [],
    friendRequests: [],
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    isGuest: true,
  };
}

export async function createUniqueGuestProfile(
  slot: 1 | 2,
  avatarId: CharacterId = slot === 1 ? 'chai_storm' : 'baron_voltage',
  customName?: string,
  blockedNames: string[] = []
): Promise<PlayerProfile> {
  const existing = await listAllProfiles();
  const mergedBlocked = [...blockedNames, ...existing.map((p) => p.username)];
  return createGuestProfile(slot, avatarId, customName, mergedBlocked);
}

export async function recordMatchForProfile(
  profile: PlayerProfile,
  matchData: {
    kills: number;
    deaths: number;
    won: boolean;
    weaponKills: Record<WeaponId, number>;
    isKoth?: boolean;
    telemetry?: FighterMatchTelemetry;
  }
): Promise<{ updatedProfile: PlayerProfile; reward: PlayerMatchReward }> {
  const baseXpEarned =
    matchData.kills * 30 +
    (matchData.won ? 120 : 40) +
    Math.max(0, matchData.kills - matchData.deaths) * 10;
  const nemesisRevengeCoins = Math.max(0, Number(matchData.telemetry?.nemesisRevengeCoins) || 0);
  let coinsEarned = matchData.kills * 18 + (matchData.won ? 80 : 25) + nemesisRevengeCoins;

  const prevXp = profile.xp;
  const newXp = prevXp + baseXpEarned;
  const prevRank = getRankForXp(prevXp);
  const newRank = getRankForXp(newXp);
  const rankedUp = newRank.id !== prevRank.id;

  if (profile.isGuest) {
    return {
      updatedProfile: profile,
      reward: {
        profileId: profile.id,
        username: profile.username,
        isGuest: true,
        kills: matchData.kills,
        deaths: matchData.deaths,
        won: matchData.won,
        xpEarned: baseXpEarned,
        coinsEarned,
        nemesisRevengeCoins,
        nemesisKills: matchData.telemetry?.nemesisKills || 0,
        afterlifeKills: matchData.telemetry?.afterlifeKills || 0,
        prevXp,
        newXp,
        prevRank,
        newRank,
        rankedUp,
        savedToDb: false,
      },
    };
  }

  const latest = normalizeProfile((await getProfileById(profile.id)) || profile);
  const mergedWeaponKills = { ...latest.stats.weaponKills };
  (Object.keys(matchData.weaponKills) as WeaponId[]).forEach((w) => {
    mergedWeaponKills[w] = (mergedWeaponKills[w] || 0) + (matchData.weaponKills[w] || 0);
  });

  const tel = matchData.telemetry;
  const prevCounters = latest.careerCounters || createEmptyCareerCounters();
  const nextCounters: CareerCounters = {
    midairKills: prevCounters.midairKills + (tel?.midairKills || 0),
    sniperOnlyWins:
      prevCounters.sniperOnlyWins + (matchData.won && tel?.usedOnlySniper ? 1 : 0),
    meleeKills: prevCounters.meleeKills + (tel?.meleeKills || 0),
    grenadeKills: prevCounters.grenadeKills + (tel?.grenadeKills || 0),
    coverDestroyed: prevCounters.coverDestroyed + (tel?.coverDestroyed || 0),
    kothWins: prevCounters.kothWins + (matchData.won && matchData.isKoth ? 1 : 0),
    killstreaksEarned: prevCounters.killstreaksEarned + (tel?.killstreaksEarned || 0),
    headshots: prevCounters.headshots + (tel?.headshots || 0),
  };

  // Update Daily Challenges & award coins on completion
  const todayKey = getTodayDateKey();
  const dailyDefs = getDailyChallengesForDate(todayKey);
  const nextDaily = buildDailyChallengesForToday(latest.dailyChallenges);
  const completedChallenges: string[] = [];

  for (const dc of nextDaily) {
    const def = dailyDefs.find((d) => d.id === dc.id);
    if (!def || dc.claimed) continue;
    let delta = 0;
    if (def.metric === 'kills') delta = matchData.kills;
    else if (def.metric === 'headshots') delta = tel?.headshots || 0;
    else if (def.metric === 'midairKills') delta = tel?.midairKills || 0;
    else if (def.metric === 'coverDestroyed') delta = tel?.coverDestroyed || 0;
    else if (def.metric === 'wins') delta = matchData.won ? 1 : 0;
    else if (def.metric === 'grenadeKills') delta = tel?.grenadeKills || 0;

    dc.progress = Math.min(def.target, dc.progress + delta);
    if (dc.progress >= def.target && !dc.claimed) {
      dc.claimed = true;
      coinsEarned += def.coinReward;
      completedChallenges.push(def.title);
    }
  }

  // Evaluate Achievements & award bonus coins
  const unlockedAch = new Set<string>(latest.unlockedAchievements || []);
  const newAchievements: string[] = [];
  const totalWins = latest.stats.wins + (matchData.won ? 1 : 0);

  const checkAch = (id: string, condition: boolean) => {
    if (!unlockedAch.has(id) && condition) {
      unlockedAch.add(id);
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        coinsEarned += def.coinReward;
        newAchievements.push(def.title);
      }
    }
  };

  checkAch('ach_first_win', totalWins >= 1);
  checkAch('ach_sniper_master', nextCounters.sniperOnlyWins >= 1);
  checkAch('ach_sky_pirate', nextCounters.midairKills >= 10);
  checkAch('ach_headhunter', nextCounters.headshots >= 25);
  checkAch('ach_demolition', nextCounters.coverDestroyed >= 15);
  checkAch('ach_brawler', nextCounters.meleeKills >= 5);
  checkAch('ach_grenadier', nextCounters.grenadeKills >= 8);
  checkAch('ach_koth_champ', nextCounters.kothWins >= 3);

  const updated = await putProfile({
    ...latest,
    xp: latest.xp + baseXpEarned,
    coins: latest.coins + coinsEarned,
    lastPlayedAt: Date.now(),
    stats: {
      kills: latest.stats.kills + matchData.kills,
      deaths: latest.stats.deaths + matchData.deaths,
      matchesPlayed: latest.stats.matchesPlayed + 1,
      wins: totalWins,
      weaponKills: mergedWeaponKills,
    },
    careerCounters: nextCounters,
    unlockedAchievements: Array.from(unlockedAch),
    dailyChallenges: nextDaily,
  });

  return {
    updatedProfile: updated,
    reward: {
      profileId: updated.id,
      username: updated.username,
      isGuest: false,
      kills: matchData.kills,
      deaths: matchData.deaths,
      won: matchData.won,
      xpEarned: baseXpEarned,
      coinsEarned,
      nemesisRevengeCoins,
      nemesisKills: matchData.telemetry?.nemesisKills || 0,
      afterlifeKills: matchData.telemetry?.afterlifeKills || 0,
      prevXp,
      newXp: updated.xp,
      prevRank: getRankForXp(prevXp),
      newRank: getRankForXp(updated.xp),
      rankedUp: getRankForXp(updated.xp).id !== getRankForXp(prevXp).id,
      savedToDb: true,
      newAchievements,
      completedChallenges,
    },
  };
}

export async function equipWeaponMasterySkin(
  profileId: string,
  weaponId: WeaponId,
  tier: WeaponMasteryTier
): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }> {
  const profile = await getProfileById(profileId);
  if (!profile) {
    return { ok: false, error: 'Guest accounts cannot save mastery wraps. Register first.' };
  }
  const tierDef = WEAPON_MASTERY_TIERS.find((m) => m.tier === tier);
  if (!tierDef) return { ok: false, error: 'Unknown mastery wrap.' };
  const kills = profile.stats.weaponKills[weaponId] || 0;
  if (kills < tierDef.requiredKills) {
    return {
      ok: false,
      error: `Requires ${tierDef.requiredKills} kills with this weapon (currently ${kills}).`,
    };
  }
  const nextMastery = { ...(profile.masteryEquipped || {}), [weaponId]: tier };
  const saved = await putProfile({ ...profile, masteryEquipped: nextMastery });
  return { ok: true, profile: saved };
}

export async function unlockOrEquipCosmetic(
  profileId: string,
  category: 'flame' | 'outfit' | 'weapon' | 'secondary' | 'melee' | 'wrap',
  itemId: string
): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }> {
  const profile = await getProfileById(profileId);
  if (!profile) {
    return { ok: false, error: 'Guest accounts cannot unlock permanent items. Register a profile first.' };
  }

  if (category === 'flame') {
    const id = itemId as FlameColorId;
    const item = FLAME_COSMETICS.find((i) => i.id === id);
    if (!item) return { ok: false, error: 'Unknown item.' };
    const unlocked = profile.cosmetics.unlockedFlames.includes(id);
    if (!unlocked) {
      if (profile.coins < item.cost) {
        return { ok: false, error: `Need ${item.cost} coins to unlock ${item.name}.` };
      }
      profile.coins -= item.cost;
      profile.cosmetics.unlockedFlames.push(id);
    }
    profile.cosmetics.equippedFlame = id;
  } else if (category === 'outfit') {
    const id = itemId as OutfitId;
    const item = OUTFIT_COSMETICS.find((i) => i.id === id);
    if (!item) return { ok: false, error: 'Unknown item.' };
    const unlocked = profile.cosmetics.unlockedOutfits.includes(id);
    if (!unlocked) {
      if (profile.coins < item.cost) {
        return { ok: false, error: `Need ${item.cost} coins to unlock ${item.name}.` };
      }
      profile.coins -= item.cost;
      profile.cosmetics.unlockedOutfits.push(id);
    }
    profile.cosmetics.equippedOutfit = id;
  } else if (category === 'secondary') {
    const id = itemId as SecondaryWeaponId;
    const item = SECONDARY_WEAPON_COSMETICS.find((i) => i.id === id);
    if (!item) return { ok: false, error: 'Unknown secondary weapon.' };
    const list = profile.cosmetics.unlockedSecondaries || ['pistol'];
    if (!list.includes(id)) {
      if (profile.coins < item.cost) {
        return { ok: false, error: `Need ${item.cost} coins to unlock ${item.name}.` };
      }
      profile.coins -= item.cost;
      list.push(id);
    }
    profile.cosmetics.unlockedSecondaries = Array.from(new Set(list));
    profile.cosmetics.equippedSecondary = id;
  } else if (category === 'melee') {
    const id = itemId as MeleeWeaponId;
    const item = MELEE_WEAPONS[id];
    if (!item) return { ok: false, error: 'Unknown melee weapon.' };
    const list = profile.cosmetics.unlockedMelees || ['knife'];
    if (!list.includes(id)) {
      if (profile.coins < item.cost) {
        return { ok: false, error: `Need ${item.cost} coins to unlock ${item.name}.` };
      }
      profile.coins -= item.cost;
      list.push(id);
    }
    profile.cosmetics.unlockedMelees = Array.from(new Set(list));
    profile.cosmetics.equippedMelee = id;
  } else if (category === 'wrap') {
    const id = itemId as GunWrapId;
    const item = GUN_WRAPS.find((w) => w.id === id);
    if (!item) return { ok: false, error: 'Unknown gun wrap.' };
    const list = profile.cosmetics.unlockedWraps || ['none'];
    if (!list.includes(id)) {
      if (id === 'golden_kettle') {
        return {
          ok: false,
          error: 'Golden Kettle is exclusive to promo code CHAI2026. Enter it in Redeem Code above!',
        };
      }
      if (profile.coins < item.cost) {
        return { ok: false, error: `Need ${item.cost} coins to unlock ${item.name}.` };
      }
      profile.coins -= item.cost;
      list.push(id);
    }
    profile.cosmetics.unlockedWraps = Array.from(new Set(list));
    profile.cosmetics.equippedWrap = id;
  } else {
    const id = itemId as WeaponId;
    const item = STARTING_WEAPON_COSMETICS.find((i) => i.id === id);
    if (!item) return { ok: false, error: 'Unknown item.' };
    const unlocked = profile.cosmetics.unlockedWeapons.includes(id);
    if (!unlocked) {
      if (profile.coins < item.cost) {
        return { ok: false, error: `Need ${item.cost} coins to unlock ${item.name}.` };
      }
      profile.coins -= item.cost;
      profile.cosmetics.unlockedWeapons.push(id);
    }
    profile.cosmetics.equippedStartingWeapon = id;
  }

  const saved = await putProfile(profile);
  return { ok: true, profile: saved };
}

export async function updateProfileAvatar(
  profileId: string,
  avatarId: CharacterId
): Promise<PlayerProfile | null> {
  const profile = await getProfileById(profileId);
  if (!profile) return null;
  return putProfile({ ...profile, avatarId });
}

export async function unlockOrSelectCharacter(
  profileId: string,
  characterId: CharacterId
): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }> {
  const charDef = CHARACTERS.find((c) => c.id === characterId);
  if (!charDef) return { ok: false, error: 'Unknown character.' };

  const profile = await getProfileById(profileId);
  if (!profile) {
    if (charDef.isPremium && (charDef.cost || 0) > 0) {
      return {
        ok: false,
        error: `Guest profiles cannot unlock ${charDef.name}. Sign in or register a profile first.`,
      };
    }
    return { ok: false, error: 'Profile not found.' };
  }

  const unlocked = new Set<CharacterId>(
    profile.cosmetics.unlockedCharacters || DEFAULT_FREE_CHARACTERS
  );
  if (!unlocked.has(characterId)) {
    const cost = charDef.cost || 0;
    if (profile.coins < cost) {
      return {
        ok: false,
        error: `Need ${cost} coins to unlock ${charDef.name} (you have ${profile.coins}).`,
      };
    }
    profile.coins -= cost;
    unlocked.add(characterId);
  }

  profile.cosmetics.unlockedCharacters = Array.from(unlocked);
  profile.avatarId = characterId;
  const saved = await putProfile(profile);
  return { ok: true, profile: saved };
}

export function exportProfileJson(profile: PlayerProfile): string {
  const payload = {
    schema: 'doodle_bureau_profile_v1',
    exportedAt: new Date().toISOString(),
    profile,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importProfileJson(
  jsonText: string
): Promise<{ ok: true; profile: PlayerProfile; replaced: boolean } | { ok: false; error: string }> {
  try {
    const parsed = JSON.parse(jsonText);
    const rawProfile: Partial<PlayerProfile> =
      parsed?.schema === 'doodle_bureau_profile_v1' && parsed?.profile ? parsed.profile : parsed;

    if (!rawProfile || typeof rawProfile.username !== 'string' || !rawProfile.username.trim()) {
      return { ok: false, error: 'Invalid profile JSON file.' };
    }

    const existing = await listAllProfiles();
    const conflictById = existing.find((p) => p.id === rawProfile.id);
    const desiredName = rawProfile.username.trim().slice(0, 18);
    const taken = new Set<string>([
      ...BOT_NAMES.map((b) => b.toLowerCase()),
      ...existing
        .filter((p) => p.id !== conflictById?.id)
        .map((p) => p.username.trim().toLowerCase()),
    ]);
    const uniqueName = makeUniqueUsername(desiredName, taken);

    const normalized = normalizeProfile({
      ...rawProfile,
      id: conflictById ? conflictById.id : rawProfile.id || generateId(),
      username: uniqueName,
      lastPlayedAt: Date.now(),
    });

    const saved = await putProfile(normalized);
    return { ok: true, profile: saved, replaced: Boolean(conflictById) };
  } catch {
    return { ok: false, error: 'Could not parse JSON file. Please select a valid backup.' };
  }
}

export function getActiveSessionIds(): { p1Id: string | null; p2Id: string | null } {
  try {
    return {
      p1Id: localStorage.getItem(LS_ACTIVE_P1_KEY),
      p2Id: localStorage.getItem(LS_ACTIVE_P2_KEY),
    };
  } catch {
    return { p1Id: null, p2Id: null };
  }
}

export function setActiveSessionId(slot: 1 | 2, id: string | null): void {
  try {
    const key = slot === 1 ? LS_ACTIVE_P1_KEY : LS_ACTIVE_P2_KEY;
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore
  }
}

export function getFavoriteWeapon(weaponKills: Record<WeaponId, number>): WeaponId {
  let best: WeaponId = 'ak';
  let max = -1;
  (Object.keys(createEmptyWeaponKills()) as WeaponId[]).forEach((w) => {
    if ((weaponKills[w] || 0) > max) {
      max = weaponKills[w] || 0;
      best = w;
    }
  });
  return best;
}

export async function sendFriendRequestByTag(
  senderProfile: PlayerProfile,
  targetTagInput: string
): Promise<{ ok: true; profile: PlayerProfile; message: string } | { ok: false; error: string }> {
  if (senderProfile.isGuest) {
    return { ok: false, error: 'Create or sign in to a saved profile to add friends.' };
  }
  const cleanTag = targetTagInput.trim();
  if (!/^[^#]+#\d{4}$/.test(cleanTag)) {
    return { ok: false, error: 'Enter a valid Player ID tag (e.g. Username#4821).' };
  }
  if (cleanTag.toLowerCase() === senderProfile.playerTag.toLowerCase()) {
    return { ok: false, error: 'You cannot send a friend request to yourself.' };
  }

  const sender = normalizeProfile((await getProfileById(senderProfile.id)) || senderProfile);
  const existingFriend = (sender.friends || []).find(
    (f) => f.playerTag.toLowerCase() === cleanTag.toLowerCase()
  );
  if (existingFriend) {
    return { ok: false, error: `${existingFriend.playerTag} is already on your friends list.` };
  }

  // Check AI rivals first
  const aiRival = getSampleAiRivals().find(
    (r) => r.playerTag.toLowerCase() === cleanTag.toLowerCase()
  );
  if (aiRival) {
    const nextFriends = [...(sender.friends || []), { ...aiRival, addedAt: Date.now() }];
    const saved = await putProfile({ ...sender, friends: nextFriends });
    return {
      ok: true,
      profile: saved,
      message: `${aiRival.playerTag} accepted your friend request immediately.`,
    };
  }

  // Check local device profiles in IndexedDB
  const allProfiles = await listAllProfiles();
  const localTarget = allProfiles.find(
    (p) => p.playerTag.toLowerCase() === cleanTag.toLowerCase()
  );

  if (localTarget) {
    const incomingReqs = [...(localTarget.friendRequests || [])];
    if (!incomingReqs.some((r) => r.fromTag.toLowerCase() === sender.playerTag.toLowerCase())) {
      incomingReqs.push({
        id: `fr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fromTag: sender.playerTag,
        fromUsername: sender.username,
        fromCharacterId: sender.avatarId,
        fromRankTitle: getRankForXp(sender.xp).title,
        direction: 'incoming',
        createdAt: Date.now(),
      });
      await putProfile({ ...localTarget, friendRequests: incomingReqs });
    }
    const outgoingReqs = [...(sender.friendRequests || [])];
    if (!outgoingReqs.some((r) => r.fromTag.toLowerCase() === localTarget.playerTag.toLowerCase())) {
      outgoingReqs.push({
        id: `fr_out_${Date.now()}`,
        fromTag: localTarget.playerTag,
        fromUsername: localTarget.username,
        fromCharacterId: localTarget.avatarId,
        fromRankTitle: getRankForXp(localTarget.xp).title,
        direction: 'outgoing',
        createdAt: Date.now(),
      });
    }
    const savedSender = await putProfile({ ...sender, friendRequests: outgoingReqs });
    return {
      ok: true,
      profile: savedSender,
      message: `Friend request sent to ${localTarget.playerTag}!`,
    };
  }

  // Cross-device / remote tag: add as tracked friend request / contact so player can invite or accept
  const [namePart] = cleanTag.split('#');
  const outgoingReqs = [...(sender.friendRequests || [])];
  if (!outgoingReqs.some((r) => r.fromTag.toLowerCase() === cleanTag.toLowerCase())) {
    outgoingReqs.push({
      id: `fr_out_${Date.now()}`,
      fromTag: cleanTag,
      fromUsername: namePart,
      fromCharacterId: 'chai_storm',
      fromRankTitle: 'Operative',
      direction: 'outgoing',
      createdAt: Date.now(),
    });
  }
  const savedSender = await putProfile({ ...sender, friendRequests: outgoingReqs });
  return {
    ok: true,
    profile: savedSender,
    message: `Friend request queued for ${cleanTag}. Share a Party Code to squad up cross-device!`,
  };
}

export async function acceptFriendRequest(
  profile: PlayerProfile,
  requestId: string
): Promise<PlayerProfile> {
  if (profile.isGuest) return profile;
  const latest = normalizeProfile((await getProfileById(profile.id)) || profile);
  const req = (latest.friendRequests || []).find((r) => r.id === requestId);
  if (!req) return latest;

  const remaining = (latest.friendRequests || []).filter((r) => r.id !== requestId);
  const friends = [...(latest.friends || [])];
  if (!friends.some((f) => f.playerTag.toLowerCase() === req.fromTag.toLowerCase())) {
    friends.push({
      id: `friend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      playerTag: req.fromTag,
      username: req.fromUsername,
      rankTitle: req.fromRankTitle,
      characterId: req.fromCharacterId,
      outfitId: 'charcoal',
      status: 'online',
      addedAt: Date.now(),
    });
  }
  const saved = await putProfile({ ...latest, friends, friendRequests: remaining });

  // Also reciprocate on local profile if it exists on this device
  const all = await listAllProfiles();
  const other = all.find((p) => p.playerTag.toLowerCase() === req.fromTag.toLowerCase());
  if (other) {
    const otherReqs = (other.friendRequests || []).filter(
      (r) => r.fromTag.toLowerCase() !== latest.playerTag.toLowerCase()
    );
    const otherFriends = [...(other.friends || [])];
    if (!otherFriends.some((f) => f.playerTag.toLowerCase() === latest.playerTag.toLowerCase())) {
      otherFriends.push({
        id: latest.id,
        playerTag: latest.playerTag,
        username: latest.username,
        rankTitle: getRankForXp(latest.xp).title,
        characterId: latest.avatarId,
        outfitId: latest.cosmetics.equippedOutfit,
        status: 'online',
        addedAt: Date.now(),
      });
    }
    await putProfile({ ...other, friends: otherFriends, friendRequests: otherReqs });
  }

  return saved;
}

export async function declineFriendRequest(
  profile: PlayerProfile,
  requestId: string
): Promise<PlayerProfile> {
  if (profile.isGuest) return profile;
  const latest = normalizeProfile((await getProfileById(profile.id)) || profile);
  const remaining = (latest.friendRequests || []).filter((r) => r.id !== requestId);
  return putProfile({ ...latest, friendRequests: remaining });
}

export async function removeFriendByTag(
  profile: PlayerProfile,
  playerTag: string
): Promise<PlayerProfile> {
  if (profile.isGuest) return profile;
  const latest = normalizeProfile((await getProfileById(profile.id)) || profile);
  const friends = (latest.friends || []).filter(
    (f) => f.playerTag.toLowerCase() !== playerTag.toLowerCase()
  );
  return putProfile({ ...latest, friends });
}

export async function redeemPromoCode(
  profileId: string,
  rawCode: string
): Promise<
  | { ok: true; profile: PlayerProfile; message: string }
  | { ok: false; error: string }
> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: 'Enter a promo code first.' };
  }
  const profile = await getProfileById(profileId);
  if (!profile || profile.isGuest) {
    return { ok: false, error: 'Sign in or register a profile to redeem promo codes.' };
  }
  const latest = normalizeProfile(profile);
  const redeemed = new Set((latest.redeemedCodes || []).map((c) => c.toUpperCase()));
  if (redeemed.has(code)) {
    return { ok: false, error: `Code ${code} has already been redeemed on this profile.` };
  }

  if (code === PROMO_CODES.DOODLE100.code) {
    redeemed.add(code);
    const saved = await putProfile({
      ...latest,
      coins: latest.coins + PROMO_CODES.DOODLE100.coins,
      redeemedCodes: Array.from(redeemed),
    });
    return {
      ok: true,
      profile: saved,
      message: 'Code DOODLE100 redeemed! +1,000 Coins added to your balance.',
    };
  }

  if (code === PROMO_CODES.CHAI2026.code) {
    redeemed.add(code);
    const wraps = new Set<GunWrapId>(latest.cosmetics.unlockedWraps || ['none']);
    wraps.add('golden_kettle');
    const saved = await putProfile({
      ...latest,
      cosmetics: {
        ...latest.cosmetics,
        unlockedWraps: Array.from(wraps),
        equippedWrap: 'golden_kettle',
      },
      redeemedCodes: Array.from(redeemed),
    });
    return {
      ok: true,
      profile: saved,
      message: 'Code CHAI2026 redeemed! Exclusive Golden Kettle gun wrap unlocked & equipped.',
    };
  }

  return { ok: false, error: `Invalid promo code "${code}".` };
}

