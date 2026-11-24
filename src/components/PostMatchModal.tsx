import React, { useEffect, useState } from 'react';
import { Award, Coins, Crown, Database, Home, RotateCcw, Sparkles, Target, Video } from 'lucide-react';
import { MAP_CATALOG, getGameModeDef, getNextRank, normalizeGameMode } from '../data/catalog';
import { FighterMatchSummary, MatchSummary, PlayerMatchReward } from '../types/game';
import { CaricatureAvatar } from './CaricatureAvatar';
import { MvpConfettiCanvas } from './MvpConfettiCanvas';

interface PostMatchModalProps {
  summary: MatchSummary;
  hasReplay?: boolean;
  onWatchReplay?: () => void;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

function getFighterKd(row: FighterMatchSummary): number {
  return row.deaths === 0 ? row.kills : row.kills / row.deaths;
}

function selectMatchMvp(standings: FighterMatchSummary[]): FighterMatchSummary | undefined {
  if (standings.length === 0) return undefined;
  return [...standings].sort((a, b) => {
    const kdDiff = getFighterKd(b) - getFighterKd(a);
    if (Math.abs(kdDiff) > 0.0001) return kdDiff;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return b.damageDealt - a.damageDealt;
  })[0];
}

const RewardCard: React.FC<{ reward: PlayerMatchReward; slotLabel: string }> = ({
  reward,
  slotLabel,
}) => {
  const [barPct, setBarPct] = useState(0);
  const nextRank = getNextRank(reward.newXp);
  const targetPct = nextRank
    ? Math.min(
        100,
        Math.round(
          ((reward.newXp - reward.newRank.minXp) /
            Math.max(1, nextRank.minXp - reward.newRank.minXp)) *
            100
        )
      )
    : 100;

  useEffect(() => {
    const startPct = nextRank
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((reward.prevXp - reward.newRank.minXp) /
                Math.max(1, nextRank.minXp - reward.newRank.minXp)) *
                100
            )
          )
        )
      : 100;
    setBarPct(startPct);
    const id = setTimeout(() => setBarPct(targetPct), 180);
    return () => clearTimeout(id);
  }, [reward.prevXp, reward.newXp, reward.newRank.minXp, nextRank, targetPct]);

  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-900/75 p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs text-slate-400">
            {slotLabel} · {reward.username}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-base font-bold text-white">{reward.newRank.title}</span>
            {reward.rankedUp && (
              <span className="text-xs font-bold text-amber-400">RANK UP!</span>
            )}
          </div>
        </div>

        <div className="text-right font-mono-tabular">
          <div className="text-sm font-bold text-amber-300">+{reward.xpEarned} XP</div>
          <div className="flex items-center justify-end gap-1 text-xs font-semibold text-emerald-400">
            <Coins className="h-3.5 w-3.5" />+{reward.coinsEarned} Coins
          </div>
        </div>
      </div>

      {/* Animated XP Bar */}
      <div>
        <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${barPct}%`,
              backgroundColor: reward.newRank.badgeColor,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
          <span>
            {nextRank
              ? `${reward.newXp} / ${nextRank.minXp} XP to ${nextRank.title}`
              : `${reward.newXp} XP · Max Rank`}
          </span>
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {reward.savedToDb ? 'Synced to DB' : 'Guest (Not Saved)'}
          </span>
        </div>
      </div>

      {/* Newly Unlocked Achievements / Daily Challenges */}
      {((reward.newAchievements && reward.newAchievements.length > 0) ||
        (reward.completedChallenges && reward.completedChallenges.length > 0)) && (
        <div className="border-t border-slate-800 pt-2 space-y-1 text-xs">
          {reward.newAchievements?.map((title) => (
            <div key={title} className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Badge Unlocked: {title}
            </div>
          ))}
          {reward.completedChallenges?.map((title) => (
            <div key={title} className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <Target className="h-3.5 w-3.5 shrink-0" />
              Daily Complete: {title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const PostMatchModal: React.FC<PostMatchModalProps> = ({
  summary,
  hasReplay,
  onWatchReplay,
  onPlayAgain,
  onReturnLobby,
}) => {
  const winner = summary.standings[0];
  const mvp = selectMatchMvp(summary.standings);
  const mapName = MAP_CATALOG.find((m) => m.id === summary.mapId)?.name || 'Arena';
  const activeMode = normalizeGameMode(summary.gameMode);
  const modeDef = getGameModeDef(activeMode);
  const showObjCol = activeMode === 'hardpoint' || activeMode === 'domination';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-slate-700/80 bg-[#111827] shadow-2xl overflow-hidden">
        {/* Top Banner */}
        <div className="border-b border-slate-800 px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-3xl tracking-wide text-white leading-none">
                {summary.winnerTeam
                  ? `TEAM ${summary.winnerTeam.toUpperCase()} VICTORY`
                  : 'Match Complete'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mapName} · {modeDef.name} ·{' '}
                {summary.winnerTeam && summary.teamScores ? (
                  <span className="font-semibold text-amber-300">
                    Alpha {summary.teamScores.alpha} — {summary.teamScores.bravo} Bravo ({summary.teamScores.label})
                  </span>
                ) : (
                  <>
                    Winner: <span className="font-semibold text-amber-300">{winner?.name}</span> ({winner?.kills} Kills)
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {hasReplay && onWatchReplay && (
              <button
                onClick={onWatchReplay}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/60 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/25 whitespace-nowrap shrink-0 transition-colors"
              >
                <Video className="h-3.5 w-3.5 text-amber-400" />
                Watch Replay
              </button>
            )}
            <button
              onClick={onReturnLobby}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Lobby
            </button>
            <button
              onClick={onPlayAgain}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap shrink-0 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Play Again
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto custom-scroll">
          {/* MVP Spotlight with Celebratory Avatar & Three.js 3D Confetti Shower */}
          {mvp && (
            <div className="relative rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-sky-500/15 px-5 py-4 overflow-hidden">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-5">
                  <div className="relative flex h-24 w-24 items-center justify-center shrink-0">
                    <MvpConfettiCanvas className="absolute -inset-6 z-20" />
                    <div className="relative z-10 rounded-xl ring-2 ring-amber-400 mvp-avatar-celebrate">
                      <CaricatureAvatar characterId={mvp.characterId} size={74} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 rounded border border-amber-400/60 bg-amber-500/20 px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-amber-300">
                      <Crown className="h-3.5 w-3.5 text-amber-300" />
                      MVP · Highest K/D
                    </div>
                    <div className="font-display text-3xl tracking-wide text-white leading-none">
                      {mvp.name}
                      {mvp.isHuman && mvp.playerIndex ? ` (P${mvp.playerIndex})` : ''}
                    </div>
                    <div className="text-xs text-slate-300">{mvp.rankTitle}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center font-mono-tabular">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      K/D Ratio
                    </div>
                    <div className="text-xl font-black text-amber-300">
                      {getFighterKd(mvp).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Elims
                    </div>
                    <div className="text-xl font-bold text-white">
                      {mvp.kills}/{mvp.deaths}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Damage
                    </div>
                    <div className="text-xl font-bold text-sky-300">{mvp.damageDealt}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Player XP & Rank Sync Cards */}
          {(summary.p1Reward || summary.p2Reward) && (
            <div
              className={`grid gap-3 ${
                summary.p1Reward && summary.p2Reward ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {summary.p1Reward && <RewardCard reward={summary.p1Reward} slotLabel="Player 1" />}
              {summary.p2Reward && <RewardCard reward={summary.p2Reward} slotLabel="Player 2" />}
            </div>
          )}

          {/* Match Standings Table */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 mb-2.5">Final Arena Standings</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/80 text-xs text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Combatant</th>
                    {showObjCol && <th className="py-2.5 px-3 text-right">Obj Pts</th>}
                    <th className="py-2.5 px-3 text-right">K/D</th>
                    <th className="py-2.5 px-3 text-right">Kills</th>
                    <th className="py-2.5 px-3 text-right">Deaths</th>
                    <th className="py-2.5 px-3 text-right">Damage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {summary.standings.map((row, idx) => {
                    const isMvp = mvp?.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={
                          isMvp
                            ? 'bg-amber-500/15'
                            : row.isHuman
                            ? 'bg-amber-500/10'
                            : 'bg-slate-900/30'
                        }
                      >
                        <td className="py-2.5 px-3 font-mono-tabular text-xs font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className={isMvp ? 'rounded-lg mvp-avatar-celebrate' : ''}>
                              <CaricatureAvatar characterId={row.characterId} size={30} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 font-semibold text-white">
                                <span>
                                  {row.name}
                                  {row.isHuman ? ` (P${row.playerIndex})` : ''}
                                </span>
                                {modeDef.teamBased && row.team && (
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                                      row.team === 'alpha'
                                        ? 'bg-rose-500/20 text-rose-300'
                                        : 'bg-sky-500/20 text-sky-300'
                                    }`}
                                  >
                                    {row.team}
                                  </span>
                                )}
                                {isMvp && (
                                  <span className="inline-flex items-center gap-1 rounded border border-amber-400/70 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-amber-300">
                                    <Crown className="h-2.5 w-2.5" />
                                    MVP
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{row.rankTitle}</div>
                            </div>
                          </div>
                        </td>
                        {showObjCol && (
                          <td className="py-2.5 px-3 text-right font-mono-tabular font-bold text-purple-300">
                            {row.objectivePoints ?? row.kothPoints ?? 0}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold text-sky-300">
                          {getFighterKd(row).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular font-bold text-amber-300">
                          {row.kills}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-300">
                          {row.deaths}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-300">
                          {row.damageDealt}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

