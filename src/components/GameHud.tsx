import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bomb,
  BrickWall,
  Crown,
  Flag,
  Fuel,
  Gauge,
  Maximize2,
  Minimize2,
  Pause,
  Radar,
  Shield,
  Smartphone,
  Swords,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { MELEE_WEAPONS, WEAPONS, getGameModeDef, normalizeGameMode } from '../data/catalog';
import { getArenaMap } from '../game/map';
import {
  AimedWallSnapshot,
  GameMode,
  HudFighterSnapshot,
  HudSnapshot,
  KillIconPrompt,
  MultikillAnnouncement,
  PlayerSlotIndex,
  ZoomLevel,
} from '../types/game';
import { KillFeedOverlay } from './KillFeedOverlay';

interface GameHudProps {
  hud: HudSnapshot;
  mode: GameMode;
  localPlayerIndex?: PlayerSlotIndex;
  pingMs?: number;
  muted: boolean;
  zoom: ZoomLevel;
  touchEnabled: boolean;
  isFullscreen?: boolean;
  onToggleTouch: () => void;
  onChangeZoom: (zoom: ZoomLevel) => void;
  onToggleMute: () => void;
  onToggleFullscreen?: () => void;
  onPause: () => void;
}

const ZOOM_OPTIONS: ZoomLevel[] = [0.5, 1, 2, 3];

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const MultikillAnnouncerOverlay: React.FC<{ announcer: MultikillAnnouncement | null }> = ({
  announcer,
}) => {
  const getTierStyle = (ann: MultikillAnnouncement) => {
    if (ann.bannerTone === 'blood') {
      return {
        headline: 'text-rose-400',
        line: 'via-rose-500',
        kicker: 'text-rose-200',
        glow: 'drop-shadow-[0_6px_24px_rgba(244,63,94,0.65)]',
      };
    }
    if (ann.bannerTone === 'shutdown') {
      return {
        headline: 'text-sky-300',
        line: 'via-sky-400',
        kicker: 'text-slate-100',
        glow: 'drop-shadow-[0_6px_24px_rgba(56,189,248,0.65)]',
      };
    }
    if (ann.streakCount >= 5) {
      return {
        headline: 'text-red-400',
        line: 'via-red-500',
        kicker: 'text-amber-200',
        glow: 'drop-shadow-[0_6px_24px_rgba(239,68,68,0.65)]',
      };
    }
    if (ann.streakCount === 4) {
      return {
        headline: 'text-orange-400',
        line: 'via-orange-500',
        kicker: 'text-amber-100',
        glow: 'drop-shadow-[0_6px_22px_rgba(249,115,22,0.6)]',
      };
    }
    return {
      headline: 'text-amber-400',
      line: 'via-amber-400',
      kicker: 'text-slate-100',
      glow: 'drop-shadow-[0_6px_20px_rgba(245,158,11,0.55)]',
    };
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 sm:top-24 z-30 flex justify-center px-4">
      <AnimatePresence mode="wait">
        {announcer && (
          <motion.div
            key={`${announcer.id}-${announcer.streakCount}`}
            initial={{ opacity: 0, scale: 0.72, y: -14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.08, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center select-none"
          >
            {(() => {
              const style = getTierStyle(announcer);
              return (
                <>
                  <div
                    className={`h-[2px] w-48 sm:w-64 bg-gradient-to-r from-transparent ${style.line} to-transparent mb-1`}
                  />
                  <div
                    className={`font-display text-4xl sm:text-5xl font-black italic tracking-wider uppercase leading-none -skew-x-6 ${style.headline} ${style.glow}`}
                    style={{ textShadow: '0 3px 0 #0B101B, 0 8px 24px rgba(0,0,0,0.85)' }}
                  >
                    {announcer.title}
                  </div>
                  <div
                    className={`mt-1 text-xs sm:text-sm font-bold tracking-wide font-mono-tabular ${style.kicker}`}
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
                  >
                    {announcer.subtitle}
                  </div>
                  <div
                    className={`h-[2px] w-36 sm:w-48 bg-gradient-to-r from-transparent ${style.line} to-transparent mt-1`}
                  />
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SkullWithSwordIcon: React.FC<{ isHeadshot?: boolean }> = ({ isHeadshot }) => (
  <svg
    viewBox="0 0 88 96"
    className="h-16 w-16 sm:h-20 sm:w-20 drop-shadow-[0_6px_18px_rgba(239,68,68,0.68)]"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="killSwordSteel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#94A3B8" />
        <stop offset="48%" stopColor="#F8FAFC" />
        <stop offset="52%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#64748B" />
      </linearGradient>
      <linearGradient id="killSkullBone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F8FAFC" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>

    {/* Sword Pommel & Hilt protruding above skull crown */}
    <circle cx="44" cy="7" r="4" fill="#F59E0B" stroke="#0B101B" strokeWidth="1.5" />
    <rect x="41.5" y="10" width="5" height="12" rx="1" fill="#78350F" stroke="#0B101B" strokeWidth="1.4" />
    {/* Sword Crossguard */}
    <path
      d="M27 21 L61 21 L57 25.5 L31 25.5 Z"
      fill={isHeadshot ? '#FACC15' : '#F59E0B'}
      stroke="#0B101B"
      strokeWidth="1.6"
    />
    {/* Upper Sword Blade entering skull crown */}
    <polygon
      points="40,25.5 48,25.5 47,40 41,40"
      fill="url(#killSwordSteel)"
      stroke="#0B101B"
      strokeWidth="1.4"
    />

    {/* Skull Cranium & Jaw */}
    <path
      d="M20 47 C20 31, 68 31, 68 47 C68 56, 62 61, 59 64 L58 75 C58 77.5, 55.5 79, 53 79 L35 79 C32.5 79, 30 77.5, 30 75 L29 64 C26 61, 20 56, 20 47 Z"
      fill="url(#killSkullBone)"
      stroke="#0B101B"
      strokeWidth="2.4"
    />

    {/* Crack & Crimson Impact Glow where blade embeds into skull */}
    <path
      d="M36 37 L42 42 L44 36 L47 42 L53 38"
      fill="none"
      stroke="#EF4444"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Blade spine visible inside skull fracture & emerging below jaw */}
    <polygon
      points="41.2,35 46.8,35 46,50 42,50"
      fill="url(#killSwordSteel)"
      stroke="#0B101B"
      strokeWidth="1.3"
    />
    <polygon
      points="41.5,79 46.5,79 44,94"
      fill="url(#killSwordSteel)"
      stroke="#0B101B"
      strokeWidth="1.6"
    />

    {/* Dark Angry Eye Sockets */}
    <ellipse cx="33" cy="52" rx="6.2" ry="5.5" transform="rotate(-10 33 52)" fill="#0B101B" />
    <ellipse cx="55" cy="52" rx="6.2" ry="5.5" transform="rotate(10 55 52)" fill="#0B101B" />
    <circle cx="33" cy="52" r="2" fill={isHeadshot ? '#FACC15' : '#EF4444'} />
    <circle cx="55" cy="52" r="2" fill={isHeadshot ? '#FACC15' : '#EF4444'} />

    {/* Nasal Cavity */}
    <polygon points="44,57 40.5,64 47.5,64" fill="#0B101B" />

    {/* Teeth */}
    <line x1="36" y1="69" x2="36" y2="78" stroke="#0B101B" strokeWidth="1.7" />
    <line x1="41" y1="69" x2="41" y2="78" stroke="#0B101B" strokeWidth="1.7" />
    <line x1="47" y1="69" x2="47" y2="78" stroke="#0B101B" strokeWidth="1.7" />
    <line x1="52" y1="69" x2="52" y2="78" stroke="#0B101B" strokeWidth="1.7" />
  </svg>
);

const PlayerKillIconOverlay: React.FC<{
  killIcons: KillIconPrompt[];
  mode: GameMode;
  localPlayerIndex?: PlayerSlotIndex;
}> = ({ killIcons, mode, localPlayerIndex }) => {
  const renderSlot = (slotPlayerIndex: PlayerSlotIndex, regionClass: string) => {
    const latest = [...killIcons]
      .reverse()
      .find((k) => k.playerIndex === slotPlayerIndex);
    return (
      <div
        className={`pointer-events-none fixed bottom-28 z-30 flex flex-col items-center justify-center ${regionClass}`}
      >
        <AnimatePresence mode="wait">
          {latest && (
            <motion.div
              key={latest.id}
              initial={{ opacity: 0, scale: 0.45, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: -12 }}
              transition={{ type: 'spring', stiffness: 460, damping: 24 }}
              className="flex flex-col items-center text-center select-none"
            >
              <SkullWithSwordIcon isHeadshot={latest.isHeadshot} />
              <div
                className={`mt-1 text-[11px] font-mono-tabular font-black uppercase tracking-widest ${
                  latest.isHeadshot ? 'text-amber-300' : 'text-rose-400'
                }`}
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
              >
                {latest.isHeadshot ? 'HEADSHOT ELIM' : 'ELIMINATED'} · {latest.victimName}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (mode === 'versus_2p') {
    return (
      <>
        {renderSlot(1, 'left-0 w-1/2')}
        {renderSlot(2, 'right-0 w-1/2')}
      </>
    );
  }

  const slot: PlayerSlotIndex = localPlayerIndex || (mode === 'online_client' ? 2 : 1);
  return renderSlot(slot, 'inset-x-0');
};

const WALL_STYLE_LABELS: Record<AimedWallSnapshot['style'], string> = {
  brick: 'Brick Barrier',
  timber: 'Timber Barricade',
  sandstone: 'Sandstone Wall',
  crate_cover: 'Reinforced Crate',
  glass: 'Reinforced Glass',
  crate_wood: 'Supply Crate',
};

const WallDurabilityOverlay: React.FC<{
  aimedWalls: AimedWallSnapshot[];
  mode: GameMode;
}> = ({ aimedWalls, mode }) => {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-48 sm:bottom-16 z-20 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {aimedWalls.map((wall) => {
          const pct = Math.max(0, Math.min(100, (wall.hp / wall.maxHp) * 100));
          const barColor = pct > 60 ? '#10B981' : pct > 30 ? '#F59E0B' : '#EF4444';
          const valueColor =
            pct > 60 ? 'text-emerald-300' : pct > 30 ? 'text-amber-300' : 'text-red-400';

          return (
            <motion.div
              key={`${wall.playerIndex}-${wall.wallId}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.14 }}
              className="w-64 sm:w-72 rounded-lg border border-slate-600/75 bg-[#0B101B]/90 px-3.5 py-2 shadow-lg"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-slate-100">
                  <BrickWall className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  Wall Durability
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {mode === 'versus_2p' ? `P${wall.playerIndex} · ` : ''}
                  {WALL_STYLE_LABELS[wall.style]}
                </span>
              </div>

              <div className="h-2 w-full rounded-sm bg-slate-800 overflow-hidden mb-1">
                <div
                  className="h-full transition-all duration-100"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                <span className="text-slate-400">
                  {pct <= 30 ? 'CRITICAL' : pct <= 60 ? 'DAMAGED' : 'INTACT'}
                </span>
                <span className={`font-bold ${valueColor}`}>
                  {wall.hp} / {wall.maxHp} HP ({Math.round(pct)}%)
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

const CircularRadarMinimap: React.FC<{
  hud: HudSnapshot;
  mode: GameMode;
  localFighter?: HudFighterSnapshot;
}> = ({ hud, mode, localFighter }) => {
  const map = getArenaMap(hud.mapId);
  const modeDef = getGameModeDef(hud.rules.gameMode);
  const cx = localFighter ? localFighter.x : map.width / 2;
  const cy = localFighter ? localFighter.y : map.height / 2;
  const uavOn = Boolean(localFighter && localFighter.uavTimer > 0);
  const radarRange = uavOn ? 2200 : 1250;
  const R = 74;

  const project = (wx: number, wy: number) => {
    const dx = ((wx - cx) / radarRange) * R;
    const dy = ((wy - cy) / radarRange) * R;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(R - 7, dist);
    const ang = Math.atan2(dy, dx);
    return {
      px: 80 + Math.cos(ang) * clampedDist,
      py: 80 + Math.sin(ang) * clampedDist,
      inRange: dist <= R - 4,
    };
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40 rounded-full border-2 border-sky-400/40 bg-[#070B14]/82 shadow-xl overflow-hidden">
        <svg viewBox="0 0 160 160" className="h-full w-full" aria-label="Live circular radar">
          <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(56, 189, 248, 0.16)" strokeWidth="1" />
          <circle cx="80" cy="80" r="48" fill="none" stroke="rgba(56, 189, 248, 0.14)" strokeWidth="1" />
          <circle cx="80" cy="80" r="24" fill="none" stroke="rgba(56, 189, 248, 0.14)" strokeWidth="1" />
          <line x1="80" y1="6" x2="80" y2="154" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" />
          <line x1="6" y1="80" x2="154" y2="80" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" />

          {map.platforms.map((p) => {
            if (p.id === 'ceiling' || p.id === 'wall_left' || p.id === 'wall_right') return null;
            const px1 = 80 + ((p.x - cx) / radarRange) * R;
            const py1 = 80 + ((p.y - cy) / radarRange) * R;
            const pw = (p.w / radarRange) * R;
            const ph = Math.max(2, (p.h / radarRange) * R);
            return (
              <rect
                key={p.id}
                x={px1}
                y={py1}
                width={pw}
                height={ph}
                fill="rgba(148, 163, 184, 0.3)"
              />
            );
          })}

          {/* Hardpoint Zone Marker */}
          {hud.hardpoint && (() => {
            const p = project(
              hud.hardpoint.x + hud.hardpoint.w / 2,
              hud.hardpoint.y + hud.hardpoint.h / 2
            );
            const fill =
              hud.hardpoint.ownerTeam === 'alpha'
                ? '#F43F5E'
                : hud.hardpoint.ownerTeam === 'bravo'
                ? '#38BDF8'
                : '#F59E0B';
            return (
              <polygon
                points={`${p.px},${p.py - 5.5} ${p.px + 5.5},${p.py} ${p.px},${p.py + 5.5} ${p.px - 5.5},${p.py}`}
                fill={fill}
                stroke="#0B101B"
                strokeWidth="1.2"
              />
            );
          })()}

          {/* Domination Flag Markers */}
          {hud.domination?.flags.map((flag) => {
            const p = project(flag.x, flag.y);
            const fill =
              flag.ownerTeam === 'alpha'
                ? '#F43F5E'
                : flag.ownerTeam === 'bravo'
                ? '#38BDF8'
                : '#CBD5E1';
            return (
              <g key={flag.id}>
                <circle cx={p.px} cy={p.py} r={5} fill={fill} stroke="#0B101B" strokeWidth="1" />
                <text
                  x={p.px}
                  y={p.py + 2.5}
                  textAnchor="middle"
                  fontSize="6"
                  fontWeight="900"
                  fill="#0B101B"
                >
                  {flag.id}
                </text>
              </g>
            );
          })}

          {/* CTF Flag Markers */}
          {hud.ctf?.flags.map((flag) => {
            const p = project(flag.x, flag.y);
            const fill = flag.team === 'alpha' ? '#F43F5E' : '#38BDF8';
            return (
              <rect
                key={flag.team}
                x={p.px - 3.5}
                y={p.py - 3.5}
                width={7}
                height={7}
                rx={1}
                fill={fill}
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            );
          })}

          {/* Legacy KOTH Podium marker */}
          {hud.koth && (() => {
            const p = project(
              hud.koth.podiumX + hud.koth.podiumW / 2,
              hud.koth.podiumY + hud.koth.podiumH / 2
            );
            return (
              <polygon
                points={`${p.px},${p.py - 5} ${p.px + 5},${p.py} ${p.px},${p.py + 5} ${p.px - 5},${p.py}`}
                fill="#F59E0B"
                stroke="#0B101B"
                strokeWidth="1"
              />
            );
          })()}

          {/* Medkit / Fuel / Dual-Wield Spawns */}
          {(hud.pickups || []).map((pk) => {
            if (!pk.active) return null;
            const p = project(pk.x, pk.y);
            return (
              <circle
                key={pk.id}
                cx={p.px}
                cy={p.py}
                r={p.inRange ? 2.6 : 1.8}
                fill={pk.type === 'medkit' ? '#10B981' : '#38BDF8'}
              />
            );
          })}

          {(hud.dualWieldDrops || []).map((dw) => {
            const p = project(dw.x, dw.y);
            return (
              <rect
                key={dw.id}
                x={p.px - 2.5}
                y={p.py - 2.5}
                width={5}
                height={5}
                fill="#A855F7"
              />
            );
          })}

          {/* Fighter Dots (Teammates Emerald/Sky vs Enemies Red) */}
          {hud.fighters.map((f) => {
            if (!f.alive) return null;
            const isLocal =
              mode === 'versus_2p'
                ? f.playerIndex === 1 || f.playerIndex === 2
                : localFighter?.id === f.id;
            if (isLocal) return null;
            const isTeammate =
              modeDef.teamBased && localFighter && f.team === localFighter.team;
            const p = project(f.x, f.y);
            return (
              <g key={f.id}>
                {uavOn && !isTeammate && (
                  <circle
                    cx={p.px}
                    cy={p.py}
                    r={6.5}
                    fill="none"
                    stroke="rgba(239, 68, 68, 0.7)"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={p.px}
                  cy={p.py}
                  r={p.inRange ? 3.8 : 2.8}
                  fill={isTeammate ? '#10B981' : '#EF4444'}
                  stroke="#0B101B"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Local Player Center Marker */}
          <circle cx="80" cy="80" r="4.2" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.2" />
        </svg>

        <div className="absolute bottom-1.5 inset-x-0 text-center text-[9px] font-mono-tabular font-bold text-sky-300/90">
          {uavOn ? 'UAV ACTIVE' : map.name.split('(')[0].trim().slice(0, 14).toUpperCase()}
        </div>
      </div>
    </div>
  );
};

const PlayerMeterCluster: React.FC<{ fighter: HudFighterSnapshot; align: 'left' | 'right' }> = ({
  fighter,
  align,
}) => {
  const weapon = WEAPONS[fighter.weaponId];
  const hpPct = Math.max(0, Math.min(100, (fighter.hp / fighter.maxHp) * 100));
  const fuelPct = Math.max(0, Math.min(100, (fighter.fuel / fighter.maxFuel) * 100));
  const ultPct = Math.max(0, Math.min(100, fighter.ultCharge));
  const ultReady = ultPct >= 100;
  const accentColor = fighter.playerIndex === 2 ? '#38BDF8' : '#F59E0B';

  return (
    <div
      className={`w-72 rounded-lg border border-slate-700/70 bg-[#0B101B]/88 px-3.5 py-2.5 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-bold truncate" style={{ color: accentColor }}>
          P{fighter.playerIndex} · {fighter.name}
        </span>
        <span className="font-mono-tabular text-xs font-semibold text-slate-200">
          {fighter.alive
            ? `${fighter.kills} K · ${fighter.killstreak} KS`
            : `RESPAWN ${fighter.respawnTimer.toFixed(1)}s`}
        </span>
      </div>

      {/* Health Bar */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono-tabular mb-0.5">
          <span className="text-slate-400">HP</span>
          <span className="flex items-center gap-1.5">
            {fighter.shieldHp > 0 && fighter.shieldBuffTimer > 0 && (
              <span className="text-sky-300 font-bold">+{fighter.shieldHp} SHD</span>
            )}
            <span className={hpPct <= 25 ? 'text-red-400 font-bold' : 'text-emerald-400 font-semibold'}>
              {fighter.hp}/{fighter.maxHp}
            </span>
          </span>
        </div>
        <div className="h-2 w-full rounded-sm bg-slate-800 overflow-hidden">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${hpPct}%`,
              backgroundColor: hpPct > 50 ? '#10B981' : hpPct > 25 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>
      </div>

      {/* Active Buffs & Killstreak Perks */}
      {(fighter.speedBuffTimer > 0 ||
        fighter.fuelBuffTimer > 0 ||
        fighter.uavTimer > 0 ||
        fighter.rapidJetTimer > 0 ||
        (fighter.shieldHp > 0 && fighter.shieldBuffTimer > 0)) && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {fighter.uavTimer > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-rose-400/50 bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-mono-tabular font-bold text-rose-300">
              <Radar className="h-2.5 w-2.5 shrink-0" />
              UAV {fighter.uavTimer.toFixed(0)}s
            </span>
          )}
          {fighter.rapidJetTimer > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-mono-tabular font-bold text-emerald-300">
              <Fuel className="h-2.5 w-2.5 shrink-0" />
              RAPID JET {fighter.rapidJetTimer.toFixed(0)}s
            </span>
          )}
          {fighter.speedBuffTimer > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono-tabular font-bold text-amber-300">
              <Gauge className="h-2.5 w-2.5 shrink-0" />
              SPD {fighter.speedBuffTimer.toFixed(1)}s
            </span>
          )}
          {fighter.fuelBuffTimer > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-teal-400/50 bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-mono-tabular font-bold text-teal-300">
              <Fuel className="h-2.5 w-2.5 shrink-0" />
              ECO {fighter.fuelBuffTimer.toFixed(1)}s
            </span>
          )}
          {fighter.shieldHp > 0 && fighter.shieldBuffTimer > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-sky-400/50 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-mono-tabular font-bold text-sky-300">
              <Shield className="h-2.5 w-2.5 shrink-0" />
              {fighter.shieldHp}
            </span>
          )}
        </div>
      )}

      {/* Jetpack Fuel */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono-tabular mb-0.5">
          <span className="text-slate-400">
            JETPACK {fighter.wallSliding ? '· WALL SLIDE' : ''}
          </span>
          <span className="text-sky-300">{fuelPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-sm bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-sky-400 transition-all duration-75"
            style={{ width: `${fuelPct}%` }}
          />
        </div>
      </div>

      {/* Ultimate Charge */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[11px] font-mono-tabular mb-0.5">
          <span className="flex items-center gap-1 text-slate-300 truncate">
            <Zap className="h-3 w-3 text-amber-400 shrink-0" />
            {fighter.ultTitle}
          </span>
          <span className={ultReady ? 'text-amber-300 font-bold' : 'text-slate-400'}>
            {fighter.ultActive ? 'ACTIVE' : ultReady ? 'E / SHIFT' : `${ultPct}%`}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-sm bg-slate-800 overflow-hidden">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${fighter.ultActive ? 100 : ultPct}%`,
              backgroundColor: fighter.ultActive ? '#EF4444' : ultReady ? '#F59E0B' : '#A855F7',
            }}
          />
        </div>
      </div>

      {/* Tactical Slots: 1-3 Weapon Strip + Grenade + Active Ammo */}
      <div className="border-t border-slate-800 pt-1.5 space-y-1.5 text-[11px] font-mono-tabular">
        <div className="grid grid-cols-3 gap-1">
          <div
            className={`truncate rounded border px-1.5 py-0.5 text-[10px] ${
              fighter.activeSlot === 'primary' && !fighter.dualWield
                ? 'border-amber-400/80 bg-amber-500/20 text-amber-200 font-bold'
                : 'border-slate-800 bg-slate-900/70 text-slate-400'
            }`}
          >
            [1] {WEAPONS[fighter.primaryWeaponId]?.shortName || 'Primary'}
          </div>
          <div
            className={`truncate rounded border px-1.5 py-0.5 text-[10px] ${
              fighter.activeSlot === 'secondary' && !fighter.dualWield
                ? 'border-sky-400/80 bg-sky-500/20 text-sky-200 font-bold'
                : 'border-slate-800 bg-slate-900/70 text-slate-400'
            }`}
          >
            [2] {WEAPONS[fighter.secondaryWeaponId]?.shortName || 'Pistol'}
          </div>
          <div
            className={`truncate rounded border px-1.5 py-0.5 text-[10px] ${
              fighter.activeSlot === 'melee' && !fighter.dualWield
                ? 'border-yellow-400/80 bg-yellow-500/20 text-yellow-200 font-bold'
                : 'border-slate-800 bg-slate-900/70 text-slate-400'
            }`}
          >
            [3] {MELEE_WEAPONS[fighter.meleeWeaponId]?.shortName || 'Knife'}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 ${
                fighter.meleeCooldownPct >= 0.99 ? 'text-yellow-300' : 'text-slate-500'
              }`}
              title="Melee Strike (V / Q or Key 3)"
            >
              <Swords className="h-3 w-3" />
              [V]
            </span>
            <span
              className="inline-flex items-center gap-1 text-rose-300 uppercase"
              title="Throw Grenade (G) · Cycle Grenade (Tab)"
            >
              <Bomb className="h-3 w-3" />
              {fighter.grenades} {fighter.grenadeType}
            </span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-slate-100 truncate">
              {fighter.dualWield
                ? fighter.dualWield === 'dual_smgs'
                  ? '2x SMGs'
                  : '2x Pistols'
                : fighter.activeSlot === 'melee'
                ? MELEE_WEAPONS[fighter.meleeWeaponId]?.shortName || 'Knife'
                : weapon.shortName}
            </span>
            <span className="font-bold text-amber-300">
              {fighter.dualWield
                ? `${fighter.dualWieldAmmo}`
                : fighter.activeSlot === 'melee'
                ? fighter.meleeCooldownPct >= 0.99
                  ? 'READY'
                  : `${Math.round(fighter.meleeCooldownPct * 100)}%`
                : fighter.isReloading
                ? `${Math.round(fighter.reloadProgress * 100)}%`
                : `${fighter.ammo}/${fighter.maxAmmo}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  mode,
  localPlayerIndex,
  pingMs,
  muted,
  zoom,
  touchEnabled,
  isFullscreen,
  onToggleTouch,
  onChangeZoom,
  onToggleMute,
  onToggleFullscreen,
  onPause,
}) => {
  const activeMode = normalizeGameMode(hud.rules.gameMode);
  const modeDef = getGameModeDef(activeMode);

  const sortedStandings = [...hud.fighters].sort((a, b) => {
    if ((activeMode === 'hardpoint' || activeMode === 'domination') && b.kothPoints !== a.kothPoints) {
      return b.kothPoints - a.kothPoints;
    }
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.deaths - b.deaths;
  });

  const resolvedSlot: PlayerSlotIndex =
    localPlayerIndex || (mode === 'online_client' ? 2 : 1);
  const p1 = hud.fighters.find((f) => f.playerIndex === 1);
  const p2 = hud.fighters.find((f) => f.playerIndex === 2);
  const localSingleFighter =
    hud.fighters.find((f) => f.playerIndex === resolvedSlot) || p1 || hud.fighters[0];
  const lowTime = hud.timeRemainingSec <= 15;
  const showTelemetry = hud.rules.showFpsPing !== false;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Team Scoreboard or FFA Standings */}
        <div className="rounded-lg border border-slate-700/70 bg-[#0B101B]/88 px-3 py-2 w-56">
          <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-400 mb-1.5">
            <span>{modeDef.shortName.toUpperCase()}</span>
            <span className="font-mono-tabular text-slate-300">
              {modeDef.teamBased ? `FIRST TO ${modeDef.scoreLimit}` : 'FIRST TO 20 KILLS'}
            </span>
          </div>

          {modeDef.teamBased && hud.teamScores && (
            <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-md border border-slate-800 bg-slate-900/90 p-1.5 font-mono-tabular">
              <div className="rounded bg-rose-500/15 px-2 py-1 text-center">
                <div className="text-[9px] font-bold text-rose-300">ALPHA</div>
                <div className="text-sm font-black text-white">
                  {hud.teamScores.alpha}
                  <span className="text-[10px] text-slate-400">/{hud.teamScores.targetScore}</span>
                </div>
              </div>
              <div className="rounded bg-sky-500/15 px-2 py-1 text-center">
                <div className="text-[9px] font-bold text-sky-300">BRAVO</div>
                <div className="text-sm font-black text-white">
                  {hud.teamScores.bravo}
                  <span className="text-[10px] text-slate-400">/{hud.teamScores.targetScore}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {sortedStandings.slice(0, 5).map((f, idx) => (
              <div
                key={f.id}
                className="flex items-center justify-between text-xs font-mono-tabular"
              >
                <span className="flex items-center gap-1.5 truncate max-w-[130px]">
                  {modeDef.teamBased && (
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        f.team === 'alpha' ? 'bg-rose-400' : 'bg-sky-400'
                      }`}
                    />
                  )}
                  <span
                    className={`truncate ${
                      f.id === localSingleFighter?.id
                        ? 'text-amber-300 font-bold'
                        : f.isHuman
                        ? 'text-sky-300 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    {idx + 1}. {f.name}
                  </span>
                </span>
                <span className="text-slate-200">
                  {activeMode === 'hardpoint' || activeMode === 'domination'
                    ? `${f.kothPoints}p · ${f.kills}k`
                    : `${f.kills}/${f.deaths}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top-Center: Match Clock, Telemetry, Controls & Live Objective Bar */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <div className="rounded-lg border border-slate-700/70 bg-[#0B101B]/90 px-4 py-1.5 text-center">
              <div
                className={`font-mono-tabular text-xl font-bold leading-none ${
                  lowTime ? 'text-red-400' : 'text-white'
                }`}
              >
                {formatTime(hud.timeRemainingSec)}
              </div>
            </div>

            {showTelemetry && (
              <div className="rounded-lg border border-slate-700/70 bg-[#0B101B]/90 px-2.5 py-1.5 text-[11px] font-mono-tabular text-slate-300 whitespace-nowrap">
                <span className="font-bold text-emerald-300">{hud.fps ?? 60}</span> FPS ·{' '}
                <span className="font-bold text-sky-300">
                  {mode === 'online_host' || mode === 'online_client' ? `${pingMs ?? 0}ms` : 'LOCAL'}
                </span>
              </div>
            )}

            <div
              className="flex items-center gap-0.5 rounded-lg border border-slate-700/70 bg-[#0B101B]/90 p-1"
              role="group"
              aria-label="Camera Zoom"
            >
              {ZOOM_OPTIONS.map((z) => (
                <button
                  key={z}
                  onClick={() => onChangeZoom(z)}
                  className={`rounded px-2 py-1 text-xs font-bold font-mono-tabular whitespace-nowrap shrink-0 transition-colors ${
                    zoom === z
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={`Zoom ${z}x (Z to cycle)`}
                >
                  {z}x
                </button>
              ))}
            </div>

            <button
              onClick={onToggleTouch}
              className={`rounded-lg border p-2 transition-colors ${
                touchEnabled
                  ? 'border-amber-500/70 bg-amber-500/20 text-amber-300'
                  : 'border-slate-700/70 bg-[#0B101B]/90 text-slate-300 hover:text-white'
              }`}
              title="Toggle On-Screen Touch Twin-Stick Controls"
              aria-label="Toggle touch controls"
            >
              <Smartphone className="h-4 w-4" />
            </button>

            <button
              onClick={onToggleMute}
              className="rounded-lg border border-slate-700/70 bg-[#0B101B]/90 p-2 text-slate-200 hover:border-amber-500/70 hover:text-white transition-colors"
              title={muted ? 'Unmute audio' : 'Mute audio'}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="rounded-lg border border-slate-700/70 bg-[#0B101B]/90 p-2 text-slate-200 hover:border-amber-500/70 hover:text-white transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            )}

            <button
              onClick={onPause}
              className="rounded-lg border border-slate-700/70 bg-[#0B101B]/90 p-2 text-slate-200 hover:border-amber-500/70 hover:text-white transition-colors"
              title="Pause (Esc)"
              aria-label="Pause match"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>

          {/* Hardpoint Objective Banner */}
          {activeMode === 'hardpoint' && hud.hardpoint && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/45 bg-[#0B101B]/90 px-3 py-1 text-[11px] font-mono-tabular">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-bold text-white">{hud.hardpoint.zoneLabel}</span>
              <span
                className={`font-bold ${
                  hud.hardpoint.contested
                    ? 'text-amber-300'
                    : hud.hardpoint.ownerTeam === 'alpha'
                    ? 'text-rose-300'
                    : hud.hardpoint.ownerTeam === 'bravo'
                    ? 'text-sky-300'
                    : 'text-slate-400'
                }`}
              >
                {hud.hardpoint.contested
                  ? 'CONTESTED'
                  : hud.hardpoint.ownerTeam
                  ? `${hud.hardpoint.ownerTeam.toUpperCase()} HOLDING`
                  : 'OPEN ZONE'}
              </span>
              <span className="text-slate-400">
                · Moves {Math.ceil(hud.hardpoint.rotateTimerSec)}s
              </span>
            </div>
          )}

          {/* Domination A / B / C Flag Banner */}
          {activeMode === 'domination' && hud.domination && (
            <div className="flex items-center gap-2 rounded-lg border border-sky-500/40 bg-[#0B101B]/90 px-3 py-1 text-[11px] font-mono-tabular">
              {hud.domination.flags.map((flag) => {
                const bg =
                  flag.ownerTeam === 'alpha'
                    ? 'border-rose-400/70 bg-rose-500/25 text-rose-200'
                    : flag.ownerTeam === 'bravo'
                    ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
                    : 'border-slate-600 bg-slate-800/80 text-slate-300';
                return (
                  <span
                    key={flag.id}
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-black ${bg}`}
                  >
                    <Flag className="h-2.5 w-2.5" />
                    {flag.id}
                    {flag.contested && <span className="text-amber-300">*</span>}
                  </span>
                );
              })}
              <span className="text-slate-300">
                ALPHA {hud.domination.alphaScore} : {hud.domination.bravoScore} BRAVO
              </span>
            </div>
          )}

          {/* CTF Flag Status Banner */}
          {activeMode === 'ctf' && hud.ctf && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/40 bg-[#0B101B]/90 px-3 py-1 text-[11px] font-mono-tabular">
              {hud.ctf.flags.map((flag) => (
                <span
                  key={flag.team}
                  className={`flex items-center gap-1 font-bold ${
                    flag.team === 'alpha' ? 'text-rose-300' : 'text-sky-300'
                  }`}
                >
                  <Flag className="h-3 w-3" />
                  {flag.team.toUpperCase()}:{' '}
                  {flag.state === 'at_base'
                    ? 'HOME'
                    : flag.state === 'carried'
                    ? `${flag.carrierName || 'TAKEN'}`
                    : `DROP ${Math.ceil(flag.returnTimerSec)}s`}
                </span>
              ))}
            </div>
          )}

          {/* TDM / FFA Compact Header */}
          {activeMode === 'tdm' && hud.teamScores && (
            <div className="rounded-lg border border-rose-500/40 bg-[#0B101B]/90 px-3 py-1 text-[11px] font-mono-tabular font-bold text-slate-200">
              <span className="text-rose-300">ALPHA {hud.teamScores.alpha}</span>
              <span className="mx-2 text-slate-500">VS</span>
              <span className="text-sky-300">{hud.teamScores.bravo} BRAVO</span>
              <span className="ml-2 text-slate-400">· TO {hud.teamScores.targetScore}</span>
            </div>
          )}

          {activeMode === 'ffa' && sortedStandings[0] && (
            <div className="rounded-lg border border-purple-500/40 bg-[#0B101B]/90 px-3 py-1 text-[11px] font-mono-tabular font-bold text-purple-200">
              FREE-FOR-ALL · LEADER: {sortedStandings[0].name} ({sortedStandings[0].kills}/20)
            </div>
          )}
        </div>

        {/* Top-Right: Circular Live Radar Minimap + Sliding Kill Feed */}
        <div className="flex flex-col items-end gap-2">
          <CircularRadarMinimap hud={hud} mode={mode} localFighter={localSingleFighter} />
          <KillFeedOverlay items={hud.killFeed} />
        </div>
      </div>

      {/* Bottom Perimeter: Player Status Clusters */}
      <div className="flex items-end justify-between gap-4">
        {mode === 'versus_2p' ? (
          <>
            {p1 ? <PlayerMeterCluster fighter={p1} align="left" /> : <div />}
            {p2 ? <PlayerMeterCluster fighter={p2} align="right" /> : <div />}
          </>
        ) : (
          <>
            {localSingleFighter ? (
              <PlayerMeterCluster fighter={localSingleFighter} align="left" />
            ) : (
              <div />
            )}
            <div className="hidden lg:block rounded-lg border border-slate-800/70 bg-[#0B101B]/75 px-3 py-1.5 text-[11px] text-slate-400 font-mono-tabular">
              WASD Move/Jet · Click Fire · 1 Primary · 2 Secondary · 3 Melee · V Strike · G/Tab Grenade · E Ult · R Reload · Z Zoom
            </div>
          </>
        )}
      </div>

      <WallDurabilityOverlay aimedWalls={hud.aimedWalls || []} mode={mode} />
      <PlayerKillIconOverlay
        killIcons={hud.killIcons || []}
        mode={mode}
        localPlayerIndex={localPlayerIndex}
      />
      <MultikillAnnouncerOverlay announcer={hud.announcer} />
    </div>
  );
};
