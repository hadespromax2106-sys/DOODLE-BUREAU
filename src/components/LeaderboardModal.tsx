import React, { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { getRankForXp } from '../data/catalog';
import { listAllProfiles } from '../db/playerDb';
import { PlayerProfile } from '../types/game';
import { CaricatureAvatar } from './CaricatureAvatar';

interface LeaderboardModalProps {
  activeP1Id: string;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ activeP1Id, onClose }) => {
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [sortBy, setSortBy] = useState<'xp' | 'kills' | 'wins'>('xp');

  useEffect(() => {
    listAllProfiles().then(setProfiles);
  }, []);

  const sorted = [...profiles].sort((a, b) => {
    if (sortBy === 'kills') return b.stats.kills - a.stats.kills;
    if (sortBy === 'wins') return b.stats.wins - a.stats.wins;
    return b.xp - a.xp;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-slate-700/80 bg-[#111827] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-display text-2xl tracking-wide text-white">
                Device Leaderboard
              </h2>
              <p className="text-xs text-slate-400">
                All registered profiles ranked across local sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
          <span className="text-xs text-slate-400 font-mono-tabular">
            {profiles.length} Registered {profiles.length === 1 ? 'Account' : 'Accounts'}
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
            <button
              onClick={() => setSortBy('xp')}
              className={`rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                sortBy === 'xp' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Rank XP
            </button>
            <button
              onClick={() => setSortBy('kills')}
              className={`rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                sortBy === 'kills' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Kills
            </button>
            <button
              onClick={() => setSortBy('wins')}
              className={`rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                sortBy === 'wins' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Wins
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto custom-scroll">
          {sorted.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              No registered profiles found yet. Register an account to climb the device leaderboard.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
                    <th className="pb-2.5 pr-3">#</th>
                    <th className="pb-2.5 pr-3">Player</th>
                    <th className="pb-2.5 pr-3">Rank</th>
                    <th className="pb-2.5 pr-3 text-right">XP</th>
                    <th className="pb-2.5 pr-3 text-right">Kills</th>
                    <th className="pb-2.5 pr-3 text-right">K/D</th>
                    <th className="pb-2.5 text-right">Wins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {sorted.map((p, idx) => {
                    const rank = getRankForXp(p.xp);
                    const kd =
                      p.stats.deaths > 0
                        ? (p.stats.kills / p.stats.deaths).toFixed(2)
                        : p.stats.kills.toFixed(2);
                    const isSelf = p.id === activeP1Id;
                    return (
                      <tr
                        key={p.id}
                        className={isSelf ? 'bg-amber-500/10' : 'hover:bg-slate-900/50'}
                      >
                        <td className="py-3 pr-3 font-mono-tabular text-xs font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <CaricatureAvatar
                              characterId={p.avatarId}
                              outfitId={p.cosmetics.equippedOutfit}
                              size={34}
                            />
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-white">
                                <span>
                                  {p.username}
                                  {isSelf ? ' (You)' : ''}
                                </span>
                                {p.playerTag && (
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono-tabular text-sky-300">
                                    {p.playerTag}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                                {p.tagline}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-xs font-semibold" style={{ color: rank.badgeColor }}>
                          {rank.title}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono-tabular text-amber-300">
                          {p.xp}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono-tabular text-slate-200">
                          {p.stats.kills}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono-tabular text-slate-300">
                          {kd}
                        </td>
                        <td className="py-3 text-right font-mono-tabular text-emerald-400">
                          {p.stats.wins}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
