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
                Controls, 9 Multiplayer Modes, Chaos Events, Arena Gadgets &amp; Tournament Cup
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
              <Keyboard className="h-4 w-4" /> Combat &amp; V3.0 Movement Controls
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
                <span className="text-slate-300">Grappling Hook (Swing / Pull)</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                  Right-Click or C
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                <span className="text-slate-300">Jetpack Air-Dodge Dash</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                  Double-Tap A or D
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
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                <span className="text-slate-300">Emote / Wall Spray Radial Wheel</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                  T / Y (Hold or Tap)
                </kbd>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] text-slate-400">
              In <span className="font-bold text-slate-200">2P Local Split-Screen</span>, Player 2 uses Arrow Keys, Enter (Fire), Numpad 1-3 or . (Swap Primary/Secondary/Melee), P (Reload), M (Melee), \ (Grenade), and Right Shift (Ultimate).
            </p>
          </section>

          {/* 9 Game Modes + Tournament */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300">
              <Flag className="h-4 w-4" /> 9 Arena Game Modes &amp; Knockout Cup
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-rose-300">Team Deathmatch (40 Kills)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Team Alpha vs Team Bravo. Friendly fire is off. First squad to 40 eliminations wins.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-amber-300">Hardpoint &amp; Domination (200 Pts)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Hold rotating Hardpoints (+1 pt/sec) or control Flags A, B, and C (+1 pt/2s per flag).
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-emerald-300">Capture the Flag (3 Caps) &amp; FFA (20 Kills)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Steal enemy flags back to base, or fight solo in Free-For-All to 20 eliminations.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-pink-300">Gun Game (11 Tiers)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Advance through 10 firearms with every kill and land the final Melee elimination to win!
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-yellow-300">VIP: Protect the Chai (25 Pts)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  One glowing 300 HP VIP per squad. Taking out the enemy VIP scores 2x points!
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-xs font-extrabold text-cyan-300">Boss Raid: Mega Baron (1,500 HP)</div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Team up 4v1 against a giant Mega Baron Voltage wielding a Minigun and Arcane EMP Storms.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 sm:col-span-2">
                <div className="text-xs font-extrabold text-fuchsia-300">
                  One-in-the-Chamber (15 Kills) &amp; Party Tournament Bracket
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  1 HP max with 1 golden bullet per kill, plus a 4/8-Player 1v1 Knockout Tournament Cup in the Squad Drawer!
                </p>
              </div>
            </div>
          </section>

          {/* V3.0 Chaos Events & Interactive Gadgets */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-2.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-fuchsia-300">
              <Zap className="h-4 w-4" /> Chaos Events, Hazards &amp; Interactive Gadgets
            </div>
            <div className="grid grid-cols-1 gap-2.5 text-[11px] text-slate-300 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 space-y-1">
                <div className="font-bold text-amber-300">Mid-Match Chaos Events (25s)</div>
                <p className="text-slate-400">
                  Halfway through every match: <strong className="text-white">Zero-G Moonwalk</strong>, <strong className="text-white">Golden Airdrop</strong> (drops Mythic Orbital Laser), <strong className="text-white">City Blackout</strong>, or <strong className="text-white">Hyper-Speed Frenzy</strong>.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 space-y-1">
                <div className="font-bold text-rose-300">Subway Train &amp; Final-30s Quake</div>
                <p className="text-slate-400">
                  Listen for the siren as a cargo train tears across Dusk City &amp; Hybrid tracks (ride the roof!). Outer ledges collapse in the final 30s!
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 space-y-1">
                <div className="font-bold text-cyan-300">Portals, Jump Pads, Vents &amp; Glass</div>
                <p className="text-slate-400">
                  Warp players &amp; bullets through blue/orange portals, bounce off spring pads, ride air vents, shatter 2-hit glass bridges, and punch barrels into flying rockets!
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 space-y-1">
                <div className="font-bold text-emerald-300">Hackable Turret, Last Stand &amp; Bounty</div>
                <p className="text-slate-400">
                  Stand by the terminal 3s to flip the ceiling turret. Downed? Fire your 3s Last Stand pistol for Afterlife kills! Kill a 3-streak Nemesis for +500 Coins.
                </p>
              </div>
            </div>
          </section>

          {/* Powerups, Killstreaks & Promo Codes */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                <Sparkles className="h-4 w-4" /> Crate Drops &amp; Mystery Buffs
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span><strong className="text-white">Core Drops:</strong> Speed Boost, Eco Jetpack &amp; +60 Shield.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 shrink-0 text-fuchsia-400" />
                  <span><strong className="text-white">Mystery Shrink / Mega-Size:</strong> Tiny hitbox or +200 Armor giant!</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span><strong className="text-white">Bubble Shield &amp; Holo-Decoy:</strong> 100 HP dome or mirror decoy!</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-300">
                <Target className="h-4 w-4" /> Killstreaks &amp; Armory Codes
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-2">
                  <Swords className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span><strong className="text-white">3 / 5 / 7 Kills:</strong> Radar UAV, Rapid Jetpack &amp; Orbital Airstrike.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span><strong className="text-white">Redeem in Armory:</strong> <code className="text-amber-300">DOODLE100</code> (+1,000 Coins) &amp; <code className="text-amber-300">CHAI2026</code> (Golden Kettle Wrap).</span>
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
