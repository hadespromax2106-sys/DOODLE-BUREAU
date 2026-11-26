import React, { useEffect, useMemo, useState } from 'react';
import {
  CloudRain,
  Flame,
  MapPin,
  Play,
  Shuffle,
  Snowflake,
  Sun,
  Users,
  Vote,
} from 'lucide-react';
import {
  BOT_NAMES,
  MAP_CATALOG,
  getGameModeDef,
} from '../data/catalog';
import {
  CustomMatchRules,
  MapId,
  MatchGameMode,
  PartyMember,
  VoteLobbyOption,
} from '../types/game';

interface MapVotingModalProps {
  botCount: number;
  rules: CustomMatchRules;
  voteOptions: VoteLobbyOption[];
  partyMembers?: PartyMember[];
  localVoterId: string;
  localVoterName: string;
  isOnlineHost?: boolean;
  isOnlineGuest?: boolean;
  externalVotes?: Record<string, string>;
  onCastVote: (optionId: string) => void;
  onVotingComplete: (winningMapId: MapId, winningGameMode: MatchGameMode) => void;
  onCancel: () => void;
}

const MapPreviewArt: React.FC<{ mapId: MapId; isRandom?: boolean }> = ({
  mapId,
  isRandom,
}) => {
  if (isRandom) {
    return (
      <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/60">
        <Shuffle className="h-9 w-9 text-amber-400/80" />
        <span className="absolute bottom-2 left-2.5 font-mono text-[9px] font-extrabold uppercase tracking-widest text-amber-300">
          CLASSIFIED DROP
        </span>
      </div>
    );
  }
  if (mapId === 'city_dusk') {
    return (
      <div className="relative h-24 w-full overflow-hidden rounded-lg border border-slate-700/70 bg-gradient-to-b from-[#090D1A] via-[#1D1E38] to-[#4A2622]">
        <div className="absolute bottom-0 left-3 h-12 w-7 border-t border-sky-400/40 bg-slate-900/90" />
        <div className="absolute bottom-0 left-12 h-16 w-8 border-t border-rose-400/50 bg-slate-950/90" />
        <div className="absolute bottom-0 right-5 h-14 w-9 border-t border-amber-400/40 bg-slate-900/90" />
        <div className="absolute right-3 top-2 text-[9px] font-bold tracking-wider text-sky-300">
          VETO CLUB
        </div>
        <CloudRain className="absolute bottom-2 right-2 h-4 w-4 text-sky-300/70" />
      </div>
    );
  }
  if (mapId === 'jungle_fortress') {
    return (
      <div className="relative h-24 w-full overflow-hidden rounded-lg border border-emerald-700/60 bg-gradient-to-b from-[#022C22] via-[#064E3B] to-[#14532D]">
        <div className="absolute inset-x-0 bottom-0 h-3 border-t border-sky-300/60 bg-sky-500/45" />
        <div className="absolute bottom-3 left-1/2 h-11 w-16 -translate-x-1/2 border-t-2 border-emerald-400 bg-stone-800/85" />
        <div className="absolute left-6 top-0 h-10 w-0.5 bg-emerald-400/70" />
        <div className="absolute right-8 top-0 h-12 w-0.5 bg-lime-400/70" />
        <CloudRain className="absolute right-2 top-2 h-4 w-4 text-emerald-300/80" />
      </div>
    );
  }
  if (mapId === 'scorched_desert') {
    return (
      <div className="relative h-24 w-full overflow-hidden rounded-lg border border-amber-700/60 bg-gradient-to-b from-[#1C1917] via-[#7C2D12] to-[#B45309]">
        <div className="absolute -left-4 bottom-0 h-8 w-28 rounded-t-full bg-amber-900/80" />
        <div className="absolute bottom-0 right-0 h-10 w-32 rounded-t-full bg-amber-800/75" />
        <div className="absolute bottom-2 left-1/2 h-8 w-14 -translate-x-1/2 border-t-2 border-amber-300/70 bg-amber-700/90" />
        <Sun className="absolute right-2 top-2 h-4 w-4 text-amber-300" />
      </div>
    );
  }
  if (mapId === 'arctic_bunker') {
    return (
      <div className="relative h-24 w-full overflow-hidden rounded-lg border border-sky-700/60 bg-gradient-to-b from-[#082F49] via-[#0C4A6E] to-[#334155]">
        <div className="absolute inset-x-0 bottom-0 h-2.5 bg-sky-300/80" />
        <div className="absolute bottom-2 left-4 h-12 w-10 border-t-2 border-white/80 bg-slate-800/85" />
        <div className="absolute bottom-2 right-5 h-10 w-12 border-t-2 border-sky-200/90 bg-slate-800/85" />
        <Snowflake className="absolute right-2 top-2 h-4 w-4 text-sky-200" />
      </div>
    );
  }
  return (
    <div className="relative h-24 w-full overflow-hidden rounded-lg border border-purple-700/60 bg-gradient-to-r from-[#0F172A] via-[#064E3B] to-[#92400E]">
      <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-slate-400 via-emerald-400 to-amber-400" />
      <Flame className="absolute right-2 top-2 h-4 w-4 text-purple-300" />
      <span className="absolute bottom-3 left-2 font-mono text-[9px] font-bold text-white/85">
        CITY · FOREST · DESERT
      </span>
    </div>
  );
};

export const MapVotingModal: React.FC<MapVotingModalProps> = ({
  botCount,
  rules,
  voteOptions,
  partyMembers = [],
  localVoterId,
  localVoterName,
  isOnlineHost,
  isOnlineGuest,
  externalVotes,
  onCastVote,
  onVotingComplete,
  onCancel,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(12);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [finalized, setFinalized] = useState(false);

  const mergedVotes = useMemo(() => {
    return { ...votes, ...(externalVotes || {}) };
  }, [votes, externalVotes]);

  // Schedule AI bots + AI squadmates to cast live votes across the 12-second window
  useEffect(() => {
    if (isOnlineGuest || voteOptions.length === 0) return;
    const timers: number[] = [];

    const aiVoters: string[] = [];
    partyMembers
      .filter((m) => m.isAi)
      .forEach((m) => aiVoters.push(`squad_${m.id}`));
    for (let i = 0; i < botCount; i++) {
      aiVoters.push(`bot_${i + 1}`);
    }

    aiVoters.forEach((voterId, i) => {
      const chosenOpt = voteOptions[Math.floor(Math.random() * voteOptions.length)].id;
      const delayMs = 950 + i * 950 + Math.floor(Math.random() * 550);
      const t = window.setTimeout(() => {
        setVotes((prev) => ({ ...prev, [voterId]: chosenOpt }));
      }, delayMs);
      timers.push(t);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [botCount, isOnlineGuest, voteOptions, partyMembers]);

  const tally = useMemo(() => {
    const counts: Record<string, number> = {};
    voteOptions.forEach((opt) => {
      counts[opt.id] = 0;
    });
    Object.values(mergedVotes).forEach((optId) => {
      if (counts[optId] !== undefined) counts[optId] += 1;
    });
    return counts;
  }, [mergedVotes, voteOptions]);

  const computeWinner = (): { mapId: MapId; gameMode: MatchGameMode } => {
    const entries = Object.entries(tally);
    entries.sort((a, b) => b[1] - a[1]);
    const topCount = entries[0]?.[1] || 0;
    const pool =
      topCount === 0
        ? voteOptions
        : voteOptions.filter((opt) => (tally[opt.id] || 0) === topCount);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || voteOptions[0];
    return { mapId: chosen.mapId, gameMode: chosen.gameMode };
  };

  useEffect(() => {
    if (finalized) return;
    if (secondsLeft <= 0) {
      if (!isOnlineGuest) {
        setFinalized(true);
        const win = computeWinner();
        onVotingComplete(win.mapId, win.gameMode);
      }
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, finalized, isOnlineGuest]);

  const handleVote = (optionId: string) => {
    setVotes((prev) => ({ ...prev, [localVoterId]: optionId }));
    onCastVote(optionId);
  };

  const myVote = mergedVotes[localVoterId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060911]/94 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0F172A] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
              <Vote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-3xl leading-none tracking-wide text-white">
                Matchmaking · Map &amp; Mode Vote
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                9 Modes · Chaos Events &amp; Arena Gadgets Active · {Math.round(rules.durationSec / 60)}m · Gravity {Math.round(rules.gravityScale * 100)}%
                {rules.oneHitSnipers ? ' · 1-Hit Snipers' : ''}
                {rules.infiniteFuel ? ' · Infinite Fuel' : ''}
                {partyMembers.length > 0 && ` · ${partyMembers.length}-Player Squad Locked on Team Alpha`}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/60 bg-amber-500/15 px-4 py-1.5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Deploying In
            </div>
            <div className="font-mono text-2xl font-black leading-none text-white">
              {secondsLeft}s
            </div>
          </div>
        </div>

        {/* Team Alpha Squad Banner */}
        {partyMembers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 bg-rose-950/25 px-6 py-2 text-[11px]">
            <span className="rounded bg-rose-500/20 px-2 py-0.5 font-black uppercase text-rose-300">
              Team Alpha Squad
            </span>
            {partyMembers.map((m) => (
              <span
                key={m.id}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 font-semibold text-slate-200"
              >
                {m.username}
              </span>
            ))}
          </div>
        )}

        {/* 3 Randomized Map+Mode Combos + Random Classified */}
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {voteOptions.map((opt) => {
              const mapDef = MAP_CATALOG.find((m) => m.id === opt.mapId) || MAP_CATALOG[0];
              const modeDef = getGameModeDef(opt.gameMode);
              const voteCount = tally[opt.id] || 0;
              const isSelected = myVote === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleVote(opt.id)}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? '-translate-y-0.5 border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/50'
                      : 'border-slate-800 bg-slate-900/80 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <MapPreviewArt mapId={opt.mapId} isRandom={opt.isRandom} />

                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <span
                          className="inline-block rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                          style={{
                            backgroundColor: `${modeDef.accentColor}22`,
                            color: modeDef.accentColor,
                          }}
                        >
                          {opt.isRandom ? 'MYSTERY MODE' : modeDef.name}
                        </span>
                        <h3 className="mt-1 text-sm font-extrabold leading-tight text-white">
                          {opt.isRandom ? 'Random / Classified' : mapDef.shortName}
                        </h3>
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs font-extrabold ${
                          voteCount > 0
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {voteCount}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                      {opt.isRandom
                        ? 'Surprise arena + game mode revealed at match deployment!'
                        : `${modeDef.description} · ${mapDef.weatherLabel}`}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 font-mono text-[10px]">
                    <span className="flex items-center gap-1 truncate text-slate-400">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {opt.isRandom ? 'Any Arena' : mapDef.hazardLabel}
                    </span>
                    {isSelected && <span className="shrink-0 font-bold text-amber-300">VOTED</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Ballots Strip */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/65 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <Users className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="font-semibold">Live Votes:</span>
              <span className="font-semibold text-amber-300">
                {localVoterName}:{' '}
                {myVote
                  ? (() => {
                      const opt = voteOptions.find((o) => o.id === myVote);
                      if (!opt) return 'Voted';
                      return opt.isRandom
                        ? 'Classified'
                        : `${MAP_CATALOG.find((m) => m.id === opt.mapId)?.shortName}`;
                    })()
                  : 'Undecided'}
              </span>
              {Array.from({ length: botCount }).map((_, idx) => {
                const bid = `bot_${idx + 1}`;
                const opt = voteOptions.find((o) => o.id === mergedVotes[bid]);
                return (
                  <span key={bid} className="font-mono text-[11px] text-slate-400">
                    · {BOT_NAMES[idx % BOT_NAMES.length]}:{' '}
                    {opt
                      ? opt.isRandom
                        ? 'Classified'
                        : MAP_CATALOG.find((m) => m.id === opt.mapId)?.shortName
                      : '...'}
                  </span>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="whitespace-nowrap shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
              >
                Cancel
              </button>
              {(!isOnlineGuest || isOnlineHost) && (
                <button
                  type="button"
                  onClick={() => {
                    if (finalized) return;
                    setFinalized(true);
                    const win = computeWinner();
                    onVotingComplete(win.mapId, win.gameMode);
                  }}
                  className="whitespace-nowrap shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 transition-colors hover:bg-amber-400"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Deploy Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
