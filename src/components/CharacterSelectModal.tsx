import React, { useState } from 'react';
import { Check, Coins, Crown, Lock, Sparkles, X, Zap } from 'lucide-react';
import { CHARACTERS, DEFAULT_FREE_CHARACTERS } from '../data/catalog';
import { unlockOrSelectCharacter } from '../db/playerDb';
import { CharacterId, GameMode, PlayerProfile } from '../types/game';
import { CaricatureAvatar } from './CaricatureAvatar';

interface CharacterSelectModalProps {
  mode: GameMode;
  p1Profile: PlayerProfile;
  p2Profile: PlayerProfile;
  p1Char: CharacterId;
  p2Char: CharacterId;
  onSelectP1: (charId: CharacterId) => void;
  onSelectP2: (charId: CharacterId) => void;
  onP1ProfileUpdated: (profile: PlayerProfile) => void;
  onOpenAuth: () => void;
  onClose: () => void;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  mode,
  p1Profile,
  p2Profile,
  p1Char,
  p2Char,
  onSelectP1,
  onSelectP2,
  onP1ProfileUpdated,
  onOpenAuth,
  onClose,
}) => {
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [inspectId, setInspectId] = useState<CharacterId>(p1Char);

  const unlockedChars = new Set<CharacterId>(
    p1Profile.cosmetics.unlockedCharacters || DEFAULT_FREE_CHARACTERS
  );
  const p2UnlockedChars = new Set<CharacterId>(
    p2Profile.cosmetics.unlockedCharacters || DEFAULT_FREE_CHARACTERS
  );

  const inspectedChar = CHARACTERS.find((c) => c.id === inspectId) || CHARACTERS[0];

  const handlePickOrUnlockP1 = async (charId: CharacterId) => {
    setFeedback(null);
    setInspectId(charId);
    const charDef = CHARACTERS.find((c) => c.id === charId);
    if (!charDef) return;

    const isUnlocked = !charDef.isPremium || unlockedChars.has(charId);
    if (isUnlocked) {
      onSelectP1(charId);
      setFeedback({ type: 'ok', text: `${charDef.name} selected for battle.` });
      return;
    }

    if (p1Profile.isGuest) {
      setFeedback({
        type: 'err',
        text: `Sign in or create a profile to unlock ${charDef.name} for ${charDef.cost} Coins.`,
      });
      return;
    }

    const res = await unlockOrSelectCharacter(p1Profile.id, charId);
    if (!res.ok) {
      setFeedback({ type: 'err', text: res.error });
    } else {
      onP1ProfileUpdated(res.profile);
      onSelectP1(charId);
      setFeedback({
        type: 'ok',
        text: `Unlocked & equipped ${charDef.name}!`,
      });
    }
  };

  const handlePickP2 = (charId: CharacterId) => {
    setFeedback(null);
    setInspectId(charId);
    const charDef = CHARACTERS.find((c) => c.id === charId);
    if (!charDef) return;

    const p2HasIt = !charDef.isPremium || p2UnlockedChars.has(charId) || unlockedChars.has(charId);
    if (!p2HasIt) {
      setFeedback({
        type: 'err',
        text: `Unlock ${charDef.name} for ${charDef.cost} Coins first to deploy in 2P Local.`,
      });
      return;
    }
    onSelectP2(charId);
    setFeedback({ type: 'ok', text: `Player 2 selected ${charDef.name}.` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-700/80 bg-[#111827] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 gap-3 flex-wrap">
          <div>
            <h2 className="font-display text-3xl tracking-wide text-white leading-none">
              Select Character
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'versus_2p'
                ? 'Click card for P1 (Amber) · Click P2 badge for P2 (Sky)'
                : 'Choose your fighter or unlock Premium roster members with match coins'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-300 font-mono-tabular">
              <Coins className="h-4 w-4" />
              <span>{p1Profile.coins} Coins</span>
            </div>
            {p1Profile.isGuest && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-slate-700 transition-colors"
              >
                Sign In to Unlock
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Close character selection"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scroll">
          {feedback && (
            <div
              className={`rounded-lg border px-4 py-2.5 text-xs sm:text-sm ${
                feedback.type === 'ok'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                  : 'border-red-500/40 bg-red-950/40 text-red-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Roster Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CHARACTERS.map((char) => {
              const isP1 = p1Char === char.id;
              const isP2 = mode === 'versus_2p' && p2Char === char.id;
              const isUnlocked = !char.isPremium || unlockedChars.has(char.id);
              const cost = char.cost || 0;

              return (
                <div
                  key={char.id}
                  onClick={() => handlePickOrUnlockP1(char.id)}
                  className={`cursor-pointer rounded-xl border p-3 transition-all flex flex-col justify-between ${
                    isP1 && isP2
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : isP1
                      ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/40'
                      : isP2
                      ? 'border-sky-400 bg-sky-500/15'
                      : char.isPremium
                      ? 'border-cyan-500/45 bg-slate-900/85 hover:border-cyan-400'
                      : 'border-slate-800 bg-slate-900/75 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <CaricatureAvatar
                            characterId={char.id}
                            outfitId={isP1 ? p1Profile.cosmetics.equippedOutfit : 'charcoal'}
                            size={50}
                          />
                          {!isUnlocked && (
                            <div className="absolute inset-0 rounded-lg bg-black/55 flex items-center justify-center">
                              <Lock className="h-5 w-5 text-amber-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-extrabold text-white truncate">
                              {char.name}
                            </span>
                            {char.isPremium && (
                              <Crown className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] font-medium text-amber-400/90 truncate">
                            {char.ultimateTitle}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {char.archetype}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-300 italic line-clamp-2">
                      &ldquo;{char.tagline}&rdquo;
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {!isUnlocked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickOrUnlockP1(char.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-amber-400 transition-colors"
                      >
                        <Coins className="h-3 w-3" />
                        Unlock {cost} Coins
                      </button>
                    ) : (
                      <span
                        className={`flex items-center gap-1 text-[11px] font-bold ${
                          isP1 ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      >
                        {isP1 ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Selected
                          </>
                        ) : char.isPremium ? (
                          <span className="flex items-center gap-1 text-cyan-300">
                            <Sparkles className="h-3 w-3" /> Premium Owned
                          </span>
                        ) : (
                          'Click to Select'
                        )}
                      </span>
                    )}

                    {mode === 'versus_2p' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickP2(char.id);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 ${
                          isP2
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        P2
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inspected / Selected Character Details */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-3">
              <CaricatureAvatar characterId={inspectedChar.id} size={58} />
              <div>
                <div className="text-base font-extrabold text-white">{inspectedChar.name}</div>
                <div className="text-xs text-slate-400">{inspectedChar.tagline}</div>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Passive Perk
              </div>
              <div className="text-xs font-bold text-emerald-300 mt-0.5">
                {inspectedChar.passivePerkTitle}
              </div>
              <div className="text-[11px] text-slate-300">{inspectedChar.passivePerkDesc}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Zap className="h-3 w-3 text-amber-400" />
                Ultimate Ability (E / Shift)
              </div>
              <div className="text-xs font-bold text-amber-300 mt-0.5">
                {inspectedChar.ultimateTitle}
              </div>
              <div className="text-[11px] text-slate-300">{inspectedChar.ultimateDesc}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
