import React, { useMemo, useState } from 'react';
import { BOT_NAMES, CHARACTERS, MAP_CATALOG } from '../data/catalog';
import {
  MapId,
  PartyMember,
  PlayerProfile,
  TournamentBracket,
  TournamentMatch,
  TournamentParticipant,
} from '../types/game';

interface TournamentBracketModalProps {
  profile: PlayerProfile;
  partyMembers: PartyMember[];
  existingBracket: TournamentBracket | null;
  onUpdateBracket: (bracket: TournamentBracket | null) => void;
  onLaunchMatch: (match: TournamentMatch, bracket: TournamentBracket) => void;
  onClose: () => void;
}

export function buildTournamentBracket(
  size: 4 | 8,
  mapId: MapId,
  profile: PlayerProfile,
  partyMembers: PartyMember[]
): TournamentBracket {
  const participants: TournamentParticipant[] = [];
  const usedNames = new Set<string>();

  const pushUnique = (p: Omit<TournamentParticipant, 'seed'>) => {
    let name = p.name.trim();
    let suffix = 2;
    while (usedNames.has(name.toLowerCase())) {
      name = `${p.name}_${suffix}`;
      suffix++;
    }
    usedNames.add(name.toLowerCase());
    participants.push({ ...p, name, seed: participants.length + 1 });
  };

  pushUnique({
    id: 'local_p1',
    name: profile.username,
    characterId: profile.avatarId,
    outfitId: profile.cosmetics.equippedOutfit,
    flameId: profile.cosmetics.equippedFlame,
    startingWeapon: profile.cosmetics.equippedStartingWeapon,
    isHuman: true,
    rankTitle: 'Local Player',
  });

  for (const pm of partyMembers) {
    if (participants.length >= size) break;
    if (pm.id === 'local_p1' || pm.isHost) continue;
    pushUnique({
      id: pm.id,
      name: pm.username,
      characterId: pm.characterId,
      outfitId: pm.outfitId,
      flameId: pm.flameId,
      startingWeapon: pm.startingWeapon,
      isHuman: !pm.isAi,
      rankTitle: pm.rankTitle,
    });
  }

  let botIdx = 0;
  while (participants.length < size) {
    const ch = CHARACTERS[(botIdx + 1) % CHARACTERS.length];
    const botName = BOT_NAMES[botIdx % BOT_NAMES.length] || `Bot_${botIdx + 1}`;
    pushUnique({
      id: `tourney_bot_${botIdx + 1}`,
      name: botName,
      characterId: ch.id,
      outfitId: 'charcoal',
      flameId: 'amber',
      startingWeapon: botIdx % 3 === 0 ? 'm4a1' : botIdx % 3 === 1 ? 'anu34' : 'mp7',
      isHuman: false,
      rankTitle: 'Arena Bot',
    });
    botIdx++;
  }

  const rounds: TournamentMatch[][] = [];
  const round1Count = size / 2;
  const r1: TournamentMatch[] = [];
  for (let i = 0; i < round1Count; i++) {
    r1.push({
      id: `r0_m${i}`,
      roundIndex: 0,
      matchIndex: i,
      p1: participants[i * 2],
      p2: participants[i * 2 + 1],
      winnerId: null,
    });
  }
  rounds.push(r1);

  if (size === 8) {
    rounds.push(
      [0, 1].map((i) => ({
        id: `r1_m${i}`,
        roundIndex: 1,
        matchIndex: i,
        p1: null,
        p2: null,
        winnerId: null,
      }))
    );
  }

  const finalRoundIndex = size === 8 ? 2 : 1;
  rounds.push([
    {
      id: `r${finalRoundIndex}_m0`,
      roundIndex: finalRoundIndex,
      matchIndex: 0,
      p1: null,
      p2: null,
      winnerId: null,
    },
  ]);

  return {
    id: `tourney_${Date.now()}`,
    size,
    mapId,
    rounds,
    currentRoundIndex: 0,
    currentMatchIndex: 0,
    championId: null,
  };
}

export function advanceBracketWinner(
  bracket: TournamentBracket,
  roundIndex: number,
  matchIndex: number,
  winnerId: string,
  scoreLabel?: string
): TournamentBracket {
  const nextRounds = bracket.rounds.map((r) => r.map((m) => ({ ...m })));
  const match = nextRounds[roundIndex]?.[matchIndex];
  if (!match) return bracket;
  const winnerParticipant =
    match.p1?.id === winnerId ? match.p1 : match.p2?.id === winnerId ? match.p2 : match.p1;
  if (!winnerParticipant) return bracket;

  match.winnerId = winnerParticipant.id;
  match.scoreLabel = scoreLabel || '1-0';

  const nextRoundIdx = roundIndex + 1;
  if (nextRoundIdx < nextRounds.length) {
    const nextMatchIdx = Math.floor(matchIndex / 2);
    const nextMatch = nextRounds[nextRoundIdx][nextMatchIdx];
    if (matchIndex % 2 === 0) {
      nextMatch.p1 = winnerParticipant;
    } else {
      nextMatch.p2 = winnerParticipant;
    }
    return {
      ...bracket,
      rounds: nextRounds,
      currentRoundIndex: nextRoundIdx,
      currentMatchIndex: nextMatchIdx,
    };
  }

  return {
    ...bracket,
    rounds: nextRounds,
    championId: winnerParticipant.id,
  };
}

export const TournamentBracketModal: React.FC<TournamentBracketModalProps> = ({
  profile,
  partyMembers,
  existingBracket,
  onUpdateBracket,
  onLaunchMatch,
  onClose,
}) => {
  const [size, setSize] = useState<4 | 8>(existingBracket?.size || 4);
  const [mapId, setMapId] = useState<MapId>(existingBracket?.mapId || 'city_dusk');

  const bracket = existingBracket;

  const champion = useMemo(() => {
    if (!bracket?.championId) return null;
    for (const r of bracket.rounds) {
      for (const m of r) {
        if (m.p1?.id === bracket.championId) return m.p1;
        if (m.p2?.id === bracket.championId) return m.p2;
      }
    }
    return null;
  }, [bracket]);

  const handleCreate = () => {
    const created = buildTournamentBracket(size, mapId, profile, partyMembers);
    onUpdateBracket(created);
  };

  const handleSimulateMatch = (m: TournamentMatch) => {
    if (!bracket || !m.p1 || !m.p2 || m.winnerId) return;
    // Slight edge for higher seed / human or random coin toss
    const winner = Math.random() < 0.52 ? m.p1 : m.p2;
    const score = `${5 + Math.floor(Math.random() * 4)}-${1 + Math.floor(Math.random() * 4)}`;
    onUpdateBracket(advanceBracketWinner(bracket, m.roundIndex, m.matchIndex, winner.id, score));
  };

  const getRoundTitle = (roundIdx: number, totalRounds: number) => {
    if (roundIdx === totalRounds - 1) return 'Grand Finals';
    if (roundIdx === totalRounds - 2) return 'Semifinals';
    return 'Quarterfinals';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0F172A] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-300">
                KNOCKOUT CUP
              </span>
              <span className="font-mono text-xs text-slate-400">1v1 Arena Bracket</span>
            </div>
            <h2 className="mt-0.5 text-2xl font-black text-white">Party Tournament Bracket</h2>
          </div>
          <div className="flex items-center gap-2">
            {bracket && (
              <button
                onClick={() => onUpdateBracket(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                New Bracket
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!bracket ? (
            <div className="mx-auto max-w-xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div>
                <h3 className="text-lg font-extrabold text-white">Configure Knockout Tournament</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Seeds your local operative, squad members, and arena bots into a single-elimination 1v1 cup.
                </p>
              </div>

              <div>
                <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Bracket Size
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {([4, 8] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setSize(n)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        size === n
                          ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                          : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-base font-black">{n}-Player Bracket</div>
                      <div className="text-[11px] text-slate-400">
                        {n === 4 ? 'Semifinals → Finals' : 'Quarterfinals → Semifinals → Finals'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tournament Arena Map
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MAP_CATALOG.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMapId(m.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        mapId === m.id
                          ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                          : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-xs font-extrabold">{m.name}</div>
                      <div className="text-[10px] text-slate-400">{m.hazardLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full rounded-xl bg-amber-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-amber-400"
              >
                Generate {size}-Player Bracket
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {champion && (
                <div className="flex items-center justify-between rounded-2xl border border-amber-400/70 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-cyan-500/10 px-6 py-4">
                  <div>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      TOURNAMENT CHAMPION CROWNED
                    </div>
                    <div className="mt-0.5 text-2xl font-black text-white">{champion.name}</div>
                    <div className="text-xs text-slate-300">
                      {CHARACTERS.find((c) => c.id === champion.characterId)?.name} · Seed #{champion.seed}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black uppercase text-slate-950">
                    1st Place Trophy
                  </div>
                </div>
              )}

              <div
                className={`grid gap-5 ${
                  bracket.rounds.length === 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
                }`}
              >
                {bracket.rounds.map((roundMatches, rIdx) => (
                  <div key={rIdx} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-mono text-xs font-black uppercase tracking-wider text-cyan-300">
                        {getRoundTitle(rIdx, bracket.rounds.length)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {roundMatches.filter((m) => m.winnerId).length}/{roundMatches.length} Complete
                      </span>
                    </div>

                    <div className="space-y-3">
                      {roundMatches.map((m) => {
                        const ready = Boolean(m.p1 && m.p2 && !m.winnerId);
                        const involvesHuman = m.p1?.isHuman || m.p2?.isHuman;
                        return (
                          <div
                            key={m.id}
                            className={`rounded-xl border p-3 transition ${
                              ready
                                ? 'border-amber-400/60 bg-slate-900'
                                : m.winnerId
                                ? 'border-emerald-500/40 bg-slate-900/70'
                                : 'border-slate-800 bg-slate-900/40'
                            }`}
                          >
                            {[m.p1, m.p2].map((slot, sIdx) => {
                              const isWin = Boolean(slot && m.winnerId === slot.id);
                              const isLose = Boolean(slot && m.winnerId && m.winnerId !== slot.id);
                              return (
                                <div
                                  key={sIdx}
                                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                                    sIdx === 0 ? 'mb-1.5' : ''
                                  } ${
                                    isWin
                                      ? 'border border-emerald-400/50 bg-emerald-500/15 font-black text-emerald-200'
                                      : isLose
                                      ? 'bg-slate-950/60 text-slate-500 line-through'
                                      : 'bg-slate-800/70 font-bold text-slate-200'
                                  }`}
                                >
                                  <span className="truncate">
                                    {slot ? `#${slot.seed} ${slot.name}` : 'TBD'}
                                  </span>
                                  {slot && (
                                    <span className="ml-2 shrink-0 font-mono text-[10px] text-slate-400">
                                      {slot.isHuman ? 'YOU' : 'BOT'}
                                    </span>
                                  )}
                                </div>
                              );
                            })}

                            {ready && (
                              <div className="mt-2.5 flex gap-2">
                                <button
                                  onClick={() => onLaunchMatch(m, bracket)}
                                  className="flex-1 rounded-lg bg-amber-500 py-1.5 text-[11px] font-black uppercase text-slate-950 transition hover:bg-amber-400"
                                >
                                  {involvesHuman ? 'Play Match' : 'Watch / Play'}
                                </button>
                                {!involvesHuman && (
                                  <button
                                    onClick={() => handleSimulateMatch(m)}
                                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/25"
                                  >
                                    Sim Bot
                                  </button>
                                )}
                              </div>
                            )}

                            {m.winnerId && m.scoreLabel && (
                              <div className="mt-1.5 text-right font-mono text-[10px] text-emerald-400">
                                Final: {m.scoreLabel}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
