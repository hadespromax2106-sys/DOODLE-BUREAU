import React, { useState } from 'react';
import {
  Award,
  Check,
  Coins,
  Crosshair,
  Flame,
  Lock,
  Shirt,
  Sparkles,
  Swords,
  Target,
  X,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  FLAME_COSMETICS,
  MELEE_WEAPON_LIST,
  OUTFIT_COSMETICS,
  SECONDARY_WEAPON_COSMETICS,
  STARTING_WEAPON_COSMETICS,
  WEAPONS,
  WEAPON_MASTERY_TIERS,
  getDailyChallengesForDate,
  getNextRank,
  getRankForXp,
  getTodayDateKey,
  getUnlockedMasteryTiers,
} from '../data/catalog';
import {
  equipWeaponMasterySkin,
  getFavoriteWeapon,
  unlockOrEquipCosmetic,
} from '../db/playerDb';
import { PlayerProfile, WeaponId, WeaponMasteryTier } from '../types/game';
import { CaricatureAvatar } from './CaricatureAvatar';

export type CareerArmoryTab = 'career' | 'challenges' | 'flames' | 'outfits' | 'weapons';

interface CareerArmoryModalProps {
  profile: PlayerProfile;
  initialTab?: CareerArmoryTab;
  onProfileUpdated: (updated: PlayerProfile) => void;
  onOpenAuth: () => void;
  onClose: () => void;
}

export const CareerArmoryModal: React.FC<CareerArmoryModalProps> = ({
  profile,
  initialTab = 'career',
  onProfileUpdated,
  onOpenAuth,
  onClose,
}) => {
  const [tab, setTab] = useState<CareerArmoryTab>(initialTab);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const rank = getRankForXp(profile.xp);
  const nextRank = getNextRank(profile.xp);
  const rankProgress = nextRank
    ? Math.min(100, Math.round(((profile.xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100))
    : 100;

  const kd =
    profile.stats.deaths > 0
      ? (profile.stats.kills / profile.stats.deaths).toFixed(2)
      : profile.stats.kills.toFixed(2);
  const winRate =
    profile.stats.matchesPlayed > 0
      ? Math.round((profile.stats.wins / profile.stats.matchesPlayed) * 100)
      : 0;
  const favWeapon = WEAPONS[getFavoriteWeapon(profile.stats.weaponKills)];

  const todayKey = getTodayDateKey();
  const dailyDefs = getDailyChallengesForDate(todayKey);
  const dailyProgressList = profile.dailyChallenges || [];
  const unlockedAch = new Set(profile.unlockedAchievements || []);
  const counters = profile.careerCounters || {
    midairKills: 0,
    sniperOnlyWins: 0,
    meleeKills: 0,
    grenadeKills: 0,
    coverDestroyed: 0,
    kothWins: 0,
    killstreaksEarned: 0,
    headshots: 0,
  };

  const handleCosmeticAction = async (
    category: 'flame' | 'outfit' | 'weapon' | 'secondary' | 'melee',
    itemId: string
  ) => {
    setFeedback(null);
    if (profile.isGuest) {
      setFeedback({
        type: 'err',
        text: 'Guest profiles cannot save permanent unlocks. Sign in or register a profile.',
      });
      return;
    }
    const res = await unlockOrEquipCosmetic(profile.id, category, itemId);
    if (!res.ok) {
      setFeedback({ type: 'err', text: res.error });
    } else {
      onProfileUpdated(res.profile);
      setFeedback({ type: 'ok', text: 'Loadout saved to your player database.' });
    }
  };

  const handleEquipMastery = async (weaponId: WeaponId, tier: WeaponMasteryTier) => {
    setFeedback(null);
    if (profile.isGuest) {
      setFeedback({
        type: 'err',
        text: 'Register or sign in to equip and save Weapon Mastery wraps.',
      });
      return;
    }
    const res = await equipWeaponMasterySkin(profile.id, weaponId, tier);
    if (!res.ok) {
      setFeedback({ type: 'err', text: res.error });
    } else {
      onProfileUpdated(res.profile);
      const label = WEAPON_MASTERY_TIERS.find((t) => t.tier === tier)?.label || tier;
      setFeedback({
        type: 'ok',
        text: `${WEAPONS[weaponId].shortName} wrap updated to ${label}.`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-700/80 bg-[#111827] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-4">
            <CaricatureAvatar
              characterId={profile.avatarId}
              outfitId={profile.cosmetics.equippedOutfit}
              size={52}
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-2xl tracking-wide text-white">
                  {profile.username}
                </h2>
                <span className="text-slate-600">·</span>
                <span className="text-sm font-semibold" style={{ color: rank.badgeColor }}>
                  {rank.title}
                </span>
              </div>
              <p className="text-xs text-slate-400">{profile.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-amber-400 font-mono-tabular">
              <Coins className="h-4 w-4" />
              <span>{profile.coins}</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3 gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1 flex-wrap">
            <button
              onClick={() => setTab('career')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'career' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Career Dossier
            </button>
            <button
              onClick={() => setTab('challenges')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'challenges'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              Challenges & Badges
            </button>
            <button
              onClick={() => setTab('flames')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'flames' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              Jetpack Flames
            </button>
            <button
              onClick={() => setTab('outfits')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'outfits'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Shirt className="h-3.5 w-3.5" />
              Suit Outfits
            </button>
            <button
              onClick={() => setTab('weapons')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'weapons'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              Weapons & Mastery
            </button>
          </div>

          {profile.isGuest && (
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors"
            >
              Register to Save Progress
            </button>
          )}
        </div>

        <div className="p-6 max-h-[68vh] overflow-y-auto custom-scroll">
          {feedback && (
            <div
              className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
                feedback.type === 'ok'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                  : 'border-red-500/40 bg-red-950/40 text-red-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {tab === 'career' && (
            <div className="space-y-6">
              {/* Rank & XP Bar */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">
                    Rank Progress · {rank.title} ({'★'.repeat(rank.stars)})
                  </span>
                  <span className="font-mono-tabular text-slate-400">
                    {nextRank
                      ? `${profile.xp} / ${nextRank.minXp} XP to ${nextRank.title}`
                      : `${profile.xp} XP · Max Rank`}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${rankProgress}%`,
                      backgroundColor: rank.badgeColor,
                    }}
                  />
                </div>
              </div>

              {/* Lifetime Career Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
                  <div className="text-xs text-slate-400">Total Kills</div>
                  <div className="mt-1 text-2xl font-bold text-white font-mono-tabular">
                    {profile.stats.kills}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
                  <div className="text-xs text-slate-400">Total Deaths</div>
                  <div className="mt-1 text-2xl font-bold text-white font-mono-tabular">
                    {profile.stats.deaths}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
                  <div className="text-xs text-slate-400">K/D Ratio</div>
                  <div className="mt-1 text-2xl font-bold text-amber-400 font-mono-tabular">
                    {kd}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
                  <div className="text-xs text-slate-400">Wins / Matches</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-400 font-mono-tabular">
                    {profile.stats.wins}/{profile.stats.matchesPlayed}
                  </div>
                </div>
              </div>

              {/* Combat Specializations */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { label: 'Headshots', val: counters.headshots, color: 'text-rose-300' },
                  { label: 'Mid-Air Kills', val: counters.midairKills, color: 'text-sky-300' },
                  { label: 'Melee Kills', val: counters.meleeKills, color: 'text-yellow-300' },
                  { label: 'Grenade Kills', val: counters.grenadeKills, color: 'text-orange-300' },
                  { label: 'Cover Broken', val: counters.coverDestroyed, color: 'text-amber-300' },
                  { label: 'KOTH Wins', val: counters.kothWins, color: 'text-purple-300' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3"
                  >
                    <div className="text-[11px] text-slate-400">{stat.label}</div>
                    <div className={`mt-0.5 text-lg font-bold font-mono-tabular ${stat.color}`}>
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Favorite Weapon</div>
                    <div className="mt-0.5 text-base font-semibold text-white">
                      {favWeapon.name}
                    </div>
                  </div>
                  <div className="text-xs font-mono-tabular text-amber-400">
                    {profile.stats.weaponKills[favWeapon.id] || 0} Kills
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Win Rate</div>
                    <div className="mt-0.5 text-base font-semibold text-white font-mono-tabular">
                      {winRate}%
                    </div>
                  </div>
                  <div className="text-xs font-mono-tabular text-slate-400">
                    {unlockedAch.size}/{ACHIEVEMENTS.length} Badges Unlocked
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'challenges' && (
            <div className="space-y-6">
              {/* Today's 3 Rotating Daily Challenges */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-amber-300">
                    Today&apos;s Daily Challenges ({todayKey})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Auto-claims bonus coins upon completion in match
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {dailyDefs.map((def) => {
                    const progObj = dailyProgressList.find((d) => d.id === def.id);
                    const current = Math.min(def.target, progObj?.progress || 0);
                    const done = Boolean(progObj?.claimed || current >= def.target);
                    const pct = Math.round((current / Math.max(1, def.target)) * 100);
                    return (
                      <div
                        key={def.id}
                        className={`rounded-lg border p-3.5 ${
                          done
                            ? 'border-emerald-500/60 bg-emerald-950/25'
                            : 'border-slate-800 bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-bold text-white">{def.title}</div>
                          <span className="flex items-center gap-1 text-xs font-mono-tabular font-bold text-amber-400 shrink-0">
                            <Coins className="h-3.5 w-3.5" />+{def.coinReward}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 leading-snug">
                          {def.description}
                        </p>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] font-mono-tabular mb-1">
                            <span className={done ? 'text-emerald-300 font-bold' : 'text-slate-300'}>
                              {done ? 'COMPLETED' : 'PROGRESS'}
                            </span>
                            <span className="text-slate-300">
                              {current} / {def.target}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: done ? '#10B981' : '#F59E0B',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 8 Career Achievements */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-slate-300">
                    Career Achievements ({unlockedAch.size}/{ACHIEVEMENTS.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ACHIEVEMENTS.map((ach) => {
                    const earned = unlockedAch.has(ach.id);
                    return (
                      <div
                        key={ach.id}
                        className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 ${
                          earned
                            ? 'border-amber-500/60 bg-amber-500/10'
                            : 'border-slate-800 bg-slate-900/50 opacity-80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg border shrink-0"
                            style={{
                              borderColor: earned ? ach.badgeColor : '#334155',
                              backgroundColor: earned ? `${ach.badgeColor}24` : '#0F172A',
                              color: earned ? ach.badgeColor : '#64748B',
                            }}
                          >
                            {earned ? (
                              <Sparkles className="h-5 w-5" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">{ach.title}</div>
                            <div className="text-xs text-slate-400">{ach.description}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 font-mono-tabular">
                          <div
                            className={`text-xs font-bold ${
                              earned ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {earned ? 'EARNED' : `+${ach.coinReward}`}
                          </div>
                          {!earned && <div className="text-[10px] text-slate-500">Coins</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'flames' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FLAME_COSMETICS.map((item) => {
                const unlocked = profile.cosmetics.unlockedFlames.includes(item.id);
                const equipped = profile.cosmetics.equippedFlame === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 ${
                      equipped
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg border border-slate-700 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${item.primaryColor}, ${item.secondaryColor})`,
                        }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-white">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCosmeticAction('flame', item.id)}
                      disabled={equipped}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                        equipped
                          ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                          : unlocked
                          ? 'bg-slate-800 text-white hover:bg-slate-700'
                          : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      }`}
                    >
                      {equipped ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Equipped
                        </span>
                      ) : unlocked ? (
                        'Equip'
                      ) : (
                        `${item.cost} Coins`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'outfits' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OUTFIT_COSMETICS.map((item) => {
                const unlocked = profile.cosmetics.unlockedOutfits.includes(item.id);
                const equipped = profile.cosmetics.equippedOutfit === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 ${
                      equipped
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CaricatureAvatar
                        characterId={profile.avatarId}
                        outfitId={item.id}
                        size={42}
                      />
                      <div>
                        <div className="text-sm font-semibold text-white">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCosmeticAction('outfit', item.id)}
                      disabled={equipped}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                        equipped
                          ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                          : unlocked
                          ? 'bg-slate-800 text-white hover:bg-slate-700'
                          : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      }`}
                    >
                      {equipped ? 'Equipped' : unlocked ? 'Equip' : `${item.cost} Coins`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'weapons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
                <span>
                  Equip Primary (Key 1), Secondary (Key 2) &amp; Melee (Key 3). Unlock Mastery
                  Wraps at 25 (Camo), 50 (Gold), and 100 (Diamond) kills.
                </span>
              </div>

              {/* Section 1: Primary Guns (Slot 1) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    <Crosshair className="h-3.5 w-3.5" />
                    Primary Firearms · Key [1]
                  </h3>
                  <span className="text-[11px] font-mono-tabular text-slate-400">
                    Equipped: {WEAPONS[profile.cosmetics.equippedStartingWeapon]?.shortName}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTING_WEAPON_COSMETICS.map((item) => {
                    const unlocked = profile.cosmetics.unlockedWeapons.includes(item.id);
                    const equipped = profile.cosmetics.equippedStartingWeapon === item.id;
                    const spec = WEAPONS[item.id];
                    const dmgText =
                      spec.pellets > 1 ? `${spec.damage}×${spec.pellets} DMG` : `${spec.damage} DMG`;
                    const wKills = profile.stats.weaponKills[item.id] || 0;
                    const unlockedTiers = getUnlockedMasteryTiers(wKills);
                    const equippedWrap = (profile.masteryEquipped && profile.masteryEquipped[item.id]) || 'none';
                    const nextTier = WEAPON_MASTERY_TIERS.find((t) => wKills < t.requiredKills);

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col justify-between gap-2.5 rounded-lg border p-3.5 ${
                          equipped
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-slate-800 bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white truncate">
                                {item.name}
                              </span>
                              <span className="text-[11px] font-medium text-amber-400/90 shrink-0">
                                {spec.category}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                            <div className="mt-1 text-[11px] font-mono-tabular text-slate-300">
                              {dmgText} · {spec.clipSize} Mag · {(spec.reloadMs / 1000).toFixed(1)}s
                              Reload
                            </div>
                          </div>

                          <button
                            onClick={() => handleCosmeticAction('weapon', item.id)}
                            disabled={equipped}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                              equipped
                                ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                                : unlocked
                                ? 'bg-slate-800 text-white hover:bg-slate-700'
                                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            }`}
                          >
                            {equipped ? (
                              <span className="flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" /> Equipped
                              </span>
                            ) : unlocked ? (
                              'Equip'
                            ) : (
                              `${item.cost} Coins`
                            )}
                          </button>
                        </div>

                        <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between gap-2">
                          <div className="text-[10px] font-mono-tabular text-slate-400">
                            <span className="text-slate-200 font-bold">{wKills} Kills</span>
                            {nextTier
                              ? ` · Next: ${nextTier.label} (${wKills}/${nextTier.requiredKills})`
                              : ' · All Wraps Unlocked'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {WEAPON_MASTERY_TIERS.map((tierDef) => {
                              const canUse = unlockedTiers.includes(tierDef.tier);
                              const isActive = equippedWrap === tierDef.tier;
                              return (
                                <button
                                  key={tierDef.tier}
                                  type="button"
                                  onClick={() => handleEquipMastery(item.id, tierDef.tier)}
                                  title={
                                    canUse
                                      ? `Equip ${tierDef.label}`
                                      : `${tierDef.label}: Unlock at ${tierDef.requiredKills} kills`
                                  }
                                  className={`h-5 w-5 rounded border transition-all flex items-center justify-center ${
                                    isActive
                                      ? 'border-white ring-1 ring-amber-400 scale-110'
                                      : canUse
                                      ? 'border-slate-500 hover:border-white'
                                      : 'border-slate-800 opacity-35'
                                  }`}
                                  style={{
                                    background: `linear-gradient(135deg, ${tierDef.swatchPrimary}, ${tierDef.swatchSecondary})`,
                                  }}
                                >
                                  {!canUse && <Lock className="h-2.5 w-2.5 text-slate-950" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Secondary Weapons (Slot 2) */}
              <div className="space-y-2.5 border-t border-slate-800 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-sky-300">
                    <Target className="h-3.5 w-3.5" />
                    Secondary Sidearms · Key [2]
                  </h3>
                  <span className="text-[11px] font-mono-tabular text-slate-400">
                    Equipped: {WEAPONS[profile.cosmetics.equippedSecondary || 'pistol']?.shortName}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SECONDARY_WEAPON_COSMETICS.map((item) => {
                    const unlocked = (profile.cosmetics.unlockedSecondaries || ['pistol']).includes(
                      item.id
                    );
                    const equipped = (profile.cosmetics.equippedSecondary || 'pistol') === item.id;
                    const spec = WEAPONS[item.id];
                    const dmgText =
                      spec.pellets > 1 ? `${spec.damage}×${spec.pellets} DMG` : `${spec.damage} DMG`;
                    const wKills = profile.stats.weaponKills[item.id] || 0;
                    const unlockedTiers = getUnlockedMasteryTiers(wKills);
                    const equippedWrap = (profile.masteryEquipped && profile.masteryEquipped[item.id]) || 'none';
                    const nextTier = WEAPON_MASTERY_TIERS.find((t) => wKills < t.requiredKills);

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col justify-between gap-2.5 rounded-lg border p-3.5 ${
                          equipped
                            ? 'border-sky-400 bg-sky-500/10'
                            : 'border-slate-800 bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white truncate">
                                {item.name}
                              </span>
                              <span className="text-[11px] font-medium text-sky-300 shrink-0">
                                {spec.category}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                            <div className="mt-1 text-[11px] font-mono-tabular text-slate-300">
                              {dmgText} · {spec.clipSize} Mag · {(spec.reloadMs / 1000).toFixed(1)}s
                              Reload
                            </div>
                          </div>

                          <button
                            onClick={() => handleCosmeticAction('secondary', item.id)}
                            disabled={equipped}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                              equipped
                                ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                                : unlocked
                                ? 'bg-slate-800 text-white hover:bg-slate-700'
                                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            }`}
                          >
                            {equipped ? (
                              <span className="flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" /> Equipped
                              </span>
                            ) : unlocked ? (
                              'Equip'
                            ) : (
                              `${item.cost} Coins`
                            )}
                          </button>
                        </div>

                        <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between gap-2">
                          <div className="text-[10px] font-mono-tabular text-slate-400">
                            <span className="text-slate-200 font-bold">{wKills} Kills</span>
                            {nextTier
                              ? ` · Next: ${nextTier.label} (${wKills}/${nextTier.requiredKills})`
                              : ' · All Wraps Unlocked'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {WEAPON_MASTERY_TIERS.map((tierDef) => {
                              const canUse = unlockedTiers.includes(tierDef.tier);
                              const isActive = equippedWrap === tierDef.tier;
                              return (
                                <button
                                  key={tierDef.tier}
                                  type="button"
                                  onClick={() => handleEquipMastery(item.id, tierDef.tier)}
                                  title={
                                    canUse
                                      ? `Equip ${tierDef.label}`
                                      : `${tierDef.label}: Unlock at ${tierDef.requiredKills} kills`
                                  }
                                  className={`h-5 w-5 rounded border transition-all flex items-center justify-center ${
                                    isActive
                                      ? 'border-white ring-1 ring-sky-400 scale-110'
                                      : canUse
                                      ? 'border-slate-500 hover:border-white'
                                      : 'border-slate-800 opacity-35'
                                  }`}
                                  style={{
                                    background: `linear-gradient(135deg, ${tierDef.swatchPrimary}, ${tierDef.swatchSecondary})`,
                                  }}
                                >
                                  {!canUse && <Lock className="h-2.5 w-2.5 text-slate-950" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Melee Weapons (Slot 3) */}
              <div className="space-y-2.5 border-t border-slate-800 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-yellow-300">
                    <Swords className="h-3.5 w-3.5" />
                    Melee Weapons · Key [3] / [V]
                  </h3>
                  <span className="text-[11px] font-mono-tabular text-slate-400">
                    Equipped:{' '}
                    {MELEE_WEAPON_LIST.find(
                      (m) => m.id === (profile.cosmetics.equippedMelee || 'knife')
                    )?.shortName || 'Knife'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MELEE_WEAPON_LIST.map((mDef) => {
                    const unlocked = (profile.cosmetics.unlockedMelees || ['knife']).includes(
                      mDef.id
                    );
                    const equipped = (profile.cosmetics.equippedMelee || 'knife') === mDef.id;
                    return (
                      <div
                        key={mDef.id}
                        className={`flex items-start justify-between gap-3 rounded-lg border p-3.5 ${
                          equipped
                            ? 'border-yellow-400 bg-yellow-500/10'
                            : 'border-slate-800 bg-slate-900/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-sm shrink-0 border border-slate-600"
                              style={{ backgroundColor: mDef.accentColor }}
                            />
                            <span className="text-sm font-semibold text-white truncate">
                              {mDef.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{mDef.description}</div>
                          <div className="mt-1.5 text-[11px] font-mono-tabular text-slate-300">
                            {mDef.damage} DMG · {mDef.range}px Reach · {mDef.cooldownSec.toFixed(2)}s
                            CD
                          </div>
                        </div>

                        <button
                          onClick={() => handleCosmeticAction('melee', mDef.id)}
                          disabled={equipped}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                            equipped
                              ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                              : unlocked
                              ? 'bg-slate-800 text-white hover:bg-slate-700'
                              : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          }`}
                        >
                          {equipped ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Equipped
                            </span>
                          ) : unlocked ? (
                            'Equip'
                          ) : (
                            `${mDef.cost} Coins`
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
