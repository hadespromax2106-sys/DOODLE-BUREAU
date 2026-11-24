import React from 'react';
import {
  Flag,
  Flame,
  Gamepad2,
  Keyboard,
  Shield,
  Sparkles,
  Swords,
  Target,
  X,
  Zap,
} from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0F172A] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-base font-extrabold uppercase tracking-wider text-white">
                How to Play · Field Manual
              </h2>
              <p className="text-[11px] text-slate-400">
                Controls, 5 Multiplayer Modes, Power-Ups &amp; Killstreak Rewards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            aria-label="Close How to Play"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          {/* Controls */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cyan-300">
              <Keyboard className="h-4 w-4" /> Combat Controls
            </div>
            <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                <span className="text-slate-300">Move &amp; Drop Down</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  A D / S
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                <span className="text-slate-300">Jump / Jetpack / Wall-Jump</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  W or Space
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                <span className="text-slate-300">Aim &amp; Fire Primary</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  Mouse + Click / F
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                <span className="text-slate-300">Switch Primary / Secondary / Melee</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  1 / 2 / 3
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                <span className="text-slate-300">Reload / Quick Melee Strike</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  R / V or Q
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                <span className="text-slate-300">Throw / Cycle Grenades</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  G / Tab
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                <span className="text-slate-300">Activate Character Ultimate</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  E or Left Shift
                </kbd>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] text-slate-400">
              In <span className="font-bold text-slate-200">2P Local Split-Screen</span>, Player 2 uses Arrow Keys, Enter (Fire), Numpad 1-3 or . (Swap Primary/Secondary/Melee), P (Reload), M (Melee), \ (Grenade), and Right Shift (Ultimate).
            </p>
          </section>

          {/* 5 Game Modes */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300">
              <Flag className="h-4 w-4" /> 5 Arena Game Modes
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-rose-300">Team Deathmatch (40 Kills)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Team Alpha vs Team Bravo. Friendly fire is off. First squad to 40 eliminations wins.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-amber-300">Hardpoint (200 Pts)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Hold the glowing perimeter as it rotates every 45s across 3 zones for +1 pt/sec.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-cyan-300">Domination (200 Pts)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Capture Flags A, B, and C to earn +1 pt per held flag every 2 seconds.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-emerald-300">Capture the Flag (3 Caps)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Steal the enemy flag and return it to base while your own flag is home.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 sm:col-span-2">
                <div className="text-xs font-extrabold text-purple-300">Free-For-All (20 Kills)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Every operative for themselves. First player to reach 20 eliminations takes victory.
                </p>
              </div>
            </div>
          </section>

          {/* Powerups, Ultimates & Killstreaks */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                <Sparkles className="h-4 w-4" /> Crate Drops &amp; Buffs
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span><strong className="text-white">Speed Boost:</strong> +38% run &amp; air acceleration.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 shrink-0 text-teal-400" />
                  <span><strong className="text-white">Eco Jetpack:</strong> 65% less fuel drain + faster recharge.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span><strong className="text-white">+60 Shield:</strong> Absorbs incoming gunfire &amp; explosions.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-300">
                <Target className="h-4 w-4" /> Killstreak Rewards
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-2">
                  <Swords className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span><strong className="text-white">3 Kills:</strong> Radar UAV reveals enemies through smoke.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span><strong className="text-white">5 Kills:</strong> Rapid Jetpack overcharge &amp; fast regen.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span><strong className="text-white">7 Kills:</strong> Orbital Airstrike locks onto enemy cluster.</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-slate-800 bg-slate-900/60 px-6 py-3">
          <button
            onClick={onClose}
            className="whitespace-nowrap shrink-0 rounded-xl bg-amber-500 px-5 py-2 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-amber-400"
          >
            Got It · Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
