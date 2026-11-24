import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Video,
} from 'lucide-react';
import { FLAME_COSMETICS, RANKS } from '../data/catalog';
import { createEmptyWeaponKills } from '../db/playerDb';
import { getArenaMap } from '../game/map';
import { ArenaRenderer } from '../game/renderer';
import {
  AirstrikeBeaconEntity,
  BarrelEntity,
  CameraState,
  DestructibleWallEntity,
  DualWieldDropEntity,
  FighterEntity,
  FloatingText,
  GrenadeEntity,
  Particle,
  PickupEntity,
  PowerUpDropEntity,
  ProjectileEntity,
  SmokeCloudEntity,
  TempWallEntity,
} from '../game/types';
import {
  KillFeedItem,
  MatchReplayData,
  PlayerSlotIndex,
  ReplayFrame,
  ZoomLevel,
} from '../types/game';
import { KillFeedOverlay } from './KillFeedOverlay';

interface MatchReplayModalProps {
  replay: MatchReplayData;
  onClose: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;
const ZOOM_OPTIONS: ZoomLevel[] = [0.5, 1, 2, 3];

function formatClock(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function lerpAngle(a: number, b: number, t: number): number {
  const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + diff * t;
}

function findBracketingFrames(
  frames: ReplayFrame[],
  sec: number
): { a: ReplayFrame; b: ReplayFrame; t: number } {
  if (frames.length === 1) {
    return { a: frames[0], b: frames[0], t: 0 };
  }
  if (sec <= frames[0].elapsedSec) {
    return { a: frames[0], b: frames[1], t: 0 };
  }
  const last = frames[frames.length - 1];
  if (sec >= last.elapsedSec) {
    return { a: last, b: last, t: 0 };
  }

  let lo = 0;
  let hi = frames.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].elapsedSec <= sec) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const a = frames[lo];
  const b = frames[hi];
  const span = Math.max(0.0001, b.elapsedSec - a.elapsedSec);
  const t = Math.max(0, Math.min(1, (sec - a.elapsedSec) / span));
  return { a, b, t };
}

export const MatchReplayModal: React.FC<MatchReplayModalProps> = ({ replay, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ArenaRenderer | null>(null);
  const map = useMemo(() => getArenaMap(replay.mapId), [replay.mapId]);

  const totalDuration = useMemo(() => {
    const lastFrameSec = replay.frames[replay.frames.length - 1]?.elapsedSec ?? 0;
    return Math.max(0.5, replay.durationSec || lastFrameSec);
  }, [replay]);

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const [followId, setFollowId] = useState<string>(replay.fightersMeta[0]?.id || 'p1');
  const [playheadSec, setPlayheadSec] = useState(0);
  const [activeKillFeed, setActiveKillFeed] = useState<KillFeedItem[]>([]);
  const [liveStandings, setLiveStandings] = useState<
    Array<{
      id: string;
      name: string;
      kills: number;
      deaths: number;
      isHuman: boolean;
      playerIndex?: PlayerSlotIndex;
    }>
  >([]);

  const playheadRef = useRef(0);
  const playingRef = useRef(true);
  const speedRef = useRef<(typeof SPEED_OPTIONS)[number]>(1);
  const zoomRef = useRef<ZoomLevel>(1);
  const followIdRef = useRef(followId);
  const camRef = useRef<CameraState>({
    x: map.playerSpawns[0].x,
    y: map.playerSpawns[0].y,
    zoom: 1,
    shake: 0,
  });
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    zoomRef.current = zoom;
    camRef.current.zoom = zoom;
  }, [zoom]);

  useEffect(() => {
    followIdRef.current = followId;
  }, [followId]);

  const seekTo = (sec: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, sec));
    playheadRef.current = clamped;
    setPlayheadSec(clamped);
    particlesRef.current = [];
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(playheadRef.current - 5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTo(playheadRef.current + 5);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, totalDuration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!rendererRef.current) {
      rendererRef.current = new ArenaRenderer();
    }
    const renderer = rendererRef.current;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    if (replay.frames.length > 0) {
      const f0 =
        replay.frames[0].fighters.find((f) => f.id === followIdRef.current) ||
        replay.frames[0].fighters[0];
      if (f0) {
        camRef.current.x = f0.x;
        camRef.current.y = f0.y;
      }
    }

    let rafId = 0;
    let lastMs = performance.now();
    let uiSyncAcc = 0;
    const emptyKills = createEmptyWeaponKills();

    const loop = (nowMs: number) => {
      const dt = Math.min(Math.max((nowMs - lastMs) / 1000, 0.001), 0.05);
      lastMs = nowMs;

      if (playingRef.current && replay.frames.length > 0) {
        const nextSec = playheadRef.current + dt * speedRef.current;
        if (nextSec >= totalDuration) {
          playheadRef.current = totalDuration;
          playingRef.current = false;
          setPlaying(false);
        } else {
          playheadRef.current = nextSec;
        }
      }

      if (replay.frames.length > 0) {
        const { a, b, t } = findBracketingFrames(replay.frames, playheadRef.current);

        const fighters: FighterEntity[] = replay.fightersMeta.map((meta) => {
          const fa = a.fighters.find((x) => x.id === meta.id) || a.fighters[0];
          const fb = b.fighters.find((x) => x.id === meta.id) || fa;
          const canInterp =
            fa && fb && fa.alive && fb.alive && Math.hypot(fb.x - fa.x, fb.y - fa.y) < 180;
          const x = canInterp ? fa.x + (fb.x - fa.x) * t : fa?.x ?? 400;
          const y = canInterp ? fa.y + (fb.y - fa.y) * t : fa?.y ?? 400;
          const aimAngle = canInterp ? lerpAngle(fa.aimAngle, fb.aimAngle, t) : fa?.aimAngle ?? 0;

          if (playingRef.current && fa?.alive && fa.jetpacking && Math.random() < 0.55) {
            const flame = FLAME_COSMETICS.find((fl) => fl.id === meta.flameId) || FLAME_COSMETICS[0];
            particlesRef.current.push({
              active: true,
              x: x - fa.facing * 12 + (Math.random() * 4 - 2),
              y: y + 12,
              vx: -fa.facing * 24 + (Math.random() * 28 - 14),
              vy: 120 + Math.random() * 60,
              size: 3.5 + Math.random() * 2.5,
              color: Math.random() < 0.65 ? flame.primaryColor : flame.secondaryColor,
              alpha: 0.9,
              life: 0.22,
              maxLife: 0.22,
              gravity: -40,
              kind: 'flame',
              rot: 0,
              vRot: 0,
            });
          }

          return {
            id: meta.id,
            name: meta.name,
            characterId: meta.characterId,
            outfitId: meta.outfitId,
            flameId: meta.flameId,
            rank: RANKS.find((r) => r.id === meta.rankId) || RANKS[0],
            isHuman: meta.isHuman,
            playerIndex: meta.playerIndex,
            x,
            y,
            vx: 0,
            vy: 0,
            w: 28,
            h: 48,
            facing: fa?.facing ?? 1,
            aimAngle,
            grounded: fa?.grounded ?? true,
            coyoteTimer: 0,
            wallSlideDir: fa?.wallSliding ? fa.facing : 0,
            onLadder: false,
            dropThroughTimer: 0,
            jetpacking: fa?.jetpacking ?? false,
            inWater: false,
            hp: fa?.hp ?? 100,
            maxHp: fa?.maxHp ?? 100,
            fuel: 100,
            maxFuel: 100,
            weaponId: fa?.weaponId ?? 'ak',
            activeSlot: fa?.activeSlot ?? 'primary',
            primaryWeaponId: fa?.weaponId ?? 'ak',
            primaryAmmo: 30,
            secondaryWeaponId: 'pistol',
            secondaryAmmo: 15,
            meleeWeaponId: fa?.meleeWeaponId ?? 'knife',
            weaponMastery: fa?.weaponMastery || meta.weaponMastery || 'none',
            ammo: 30,
            isReloading: false,
            reloadTimerMs: 0,
            fireCooldownMs: 0,
            burstRemaining: 0,
            burstTimerMs: 0,
            recoilKick: 0,
            muzzleFlashTimer: fa?.muzzleFlashTimer ?? 0,
            hitFlashTimer: fa?.hitFlashTimer ?? 0,
            walkCycle: fa?.walkCycle ?? 0,
            alive: fa?.alive ?? true,
            respawnTimer: 0,
            spawnInvulnTimer: fa?.spawnInvulnTimer ?? 0,
            lastHitById: null,
            lastHitWeapon: null,
            lastHitAt: 0,
            meleeCooldownTimer: 0,
            meleeSwingTimer: fa?.meleeSwingTimer ?? 0,
            grenades: 0,
            grenadeType: 'frag',
            grenadeRegenTimer: 0,
            dualWield: fa?.dualWield ?? null,
            dualWieldAmmo: 0,
            ultCharge: 0,
            ultActiveTimer: fa?.ultActiveTimer ?? 0,
            killstreak: 0,
            uavTimer: 0,
            rapidJetTimer: 0,
            speedBuffTimer: fa?.speedBuffTimer ?? 0,
            fuelBuffTimer: fsBuff(fa?.fuelBuffTimer),
            shieldHp: fa?.shieldHp ?? 0,
            shieldBuffTimer: fa?.shieldBuffTimer ?? 0,
            kothPoints: 0,
            inPodium: false,
            speechText: fa?.speechText ?? '',
            speechTimer: fa?.speechTimer ?? 0,
            kills: fa?.kills ?? 0,
            deaths: fa?.deaths ?? 0,
            damageDealt: 0,
            weaponKills: { ...emptyKills },
            rapidKillCount: 0,
            lastKillAt: -999,
            headshotsCount: 0,
            midairKillsCount: 0,
            meleeKillsCount: 0,
            grenadeKillsCount: 0,
            coverDestroyedCount: 0,
            killstreaksEarnedCount: 0,
            usedNonSniper: false,
            aiState: 'patrol',
            aiDecisionTimer: 0,
            aiTargetId: null,
            aiGoalX: x,
            aiGoalY: y,
            aiStrafeDir: 1,
            aiFireHoldTimer: 0,
          };
        });

        const projectiles: ProjectileEntity[] = a.projectiles.map((pa) => {
          const pb = b.projectiles.find((p) => p.id === pa.id);
          const x = pb ? pa.x + (pb.x - pa.x) * t : pa.x;
          const y = pb ? pa.y + (pb.y - pa.y) * t : pa.y;
          return {
            id: pa.id,
            ownerId: '',
            weaponId: pa.weaponId,
            x,
            y,
            prevX: pa.prevX,
            prevY: pa.prevY,
            vx: pa.vx,
            vy: pa.vy,
            damage: 0,
            explosionRadius: 0,
            color: pa.color,
            life: 1,
            isRocket: pa.isRocket,
            isHoming: pa.isHoming,
          };
        });

        const grenades: GrenadeEntity[] = (a.grenades || []).map((g) => ({
          ...g,
          ownerId: '',
          vx: 0,
          vy: 0,
          vRot: 0,
          stuck: Boolean(g.stuck),
        }));

        const smokeClouds: SmokeCloudEntity[] = a.smokeClouds || [];
        const airstrikes: AirstrikeBeaconEntity[] = (a.airstrikes || []).map((as) => ({
          ...as,
          ownerId: '',
          shellsDropped: 0,
        }));

        const dualWieldDrops: DualWieldDropEntity[] = (a.dualWieldDrops || []).map((dw) => ({
          ...dw,
          vx: 0,
          vy: 0,
          maxLife: 20,
          bobPhase: 0,
        }));

        const barrels: BarrelEntity[] = map.barrelSpawns.map((bs, idx) => ({
          id: bs.id,
          x: bs.x,
          y: bs.y,
          w: 26,
          h: 38,
          hp: 45,
          maxHp: 45,
          alive: a.barrelsAlive[idx] ?? true,
          respawnTimer: 0,
          hitFlashTimer: 0,
        }));

        const pickups: PickupEntity[] = map.pickupSpawns.map((ps, idx) => ({
          id: ps.id,
          x: ps.x,
          y: ps.y,
          type: ps.type,
          respawnSec: ps.respawnSec,
          active: a.pickupsActive[idx] ?? true,
          respawnTimer: 0,
          bobPhase: idx * 0.9,
        }));

        const destructibleWalls: DestructibleWallEntity[] = map.destructibleWalls.map(
          (dw, idx) => {
            const state = a.destructibleWalls[idx];
            return {
              id: dw.id,
              x: dw.x,
              y: dw.y,
              w: dw.w,
              h: dw.h,
              hp: state?.hp ?? dw.maxHp,
              maxHp: dw.maxHp,
              style: dw.style,
              alive: state?.alive ?? true,
              respawnSec: dw.respawnSec,
              respawnTimer: 0,
              hitFlashTimer: state?.hitFlashTimer ?? 0,
            };
          }
        );

        const tempWalls: TempWallEntity[] = a.tempWalls.map((w) => ({
          ...w,
          ownerId: '',
        }));

        const powerUps: PowerUpDropEntity[] = (a.powerUps || []).map((pu) => ({
          id: pu.id,
          x: pu.x,
          y: pu.y,
          vx: 0,
          vy: 0,
          type: pu.type,
          life: pu.life,
          maxLife: 22,
          bobPhase: pu.id * 1.1,
        }));

        const floatingTexts: FloatingText[] = a.floatingTexts.map((ft) => ({
          ...ft,
          vy: -30,
        }));

        const nextParticles: Particle[] = [];
        for (const pt of particlesRef.current) {
          pt.life -= dt * speedRef.current;
          if (pt.life > 0) {
            pt.vy += pt.gravity * dt * speedRef.current;
            pt.x += pt.vx * dt * speedRef.current;
            pt.y += pt.vy * dt * speedRef.current;
            nextParticles.push(pt);
          }
        }
        particlesRef.current = nextParticles.slice(-160);

        const targetFighter =
          fighters.find((f) => f.id === followIdRef.current) || fighters[0];
        if (targetFighter) {
          const cam = camRef.current;
          const desiredX = targetFighter.x + Math.cos(targetFighter.aimAngle) * 55;
          const desiredY = targetFighter.y + Math.sin(targetFighter.aimAngle) * 32;
          cam.x += (desiredX - cam.x) * Math.min(1, 7.5 * dt);
          cam.y += (desiredY - cam.y) * Math.min(1, 7.5 * dt);

          const halfW = canvas.width / (2 * cam.zoom);
          const halfH = canvas.height / (2 * cam.zoom);
          cam.x =
            halfW >= map.width / 2
              ? map.width / 2
              : Math.max(halfW, Math.min(map.width - halfW, cam.x));
          cam.y =
            halfH >= map.height / 2
              ? map.height / 2
              : Math.max(halfH, Math.min(map.height - halfH, cam.y));
        }

        renderer.renderFrame(
          ctx,
          canvas.width,
          canvas.height,
          'solo',
          [camRef.current],
          fighters,
          projectiles,
          barrels,
          pickups,
          tempWalls,
          destructibleWalls,
          particlesRef.current,
          floatingTexts,
          [],
          a.elapsedSec,
          powerUps,
          { map, grenades, smokeClouds, airstrikes, dualWieldDrops }
        );

        uiSyncAcc += dt;
        if (uiSyncAcc >= 0.06 || !playingRef.current) {
          uiSyncAcc = 0;
          setPlayheadSec(playheadRef.current);
          setActiveKillFeed(a.killFeed);
          setLiveStandings(
            [...fighters]
              .sort((x, y) => y.kills - x.kills || x.deaths - y.deaths)
              .slice(0, 4)
              .map((f) => ({
                id: f.id,
                name: f.name,
                kills: f.kills,
                deaths: f.deaths,
                isHuman: f.isHuman,
                playerIndex: f.playerIndex,
              }))
          );
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [replay, totalDuration, map]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B101B]">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Top Overlay: Theatre Header & Replay Standings */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-3 sm:p-4">
        <div className="flex flex-col gap-2">
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-amber-500/50 bg-[#0B101B]/90 px-3 py-2">
            <Video className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-xs font-extrabold tracking-wider uppercase text-amber-300">
              Match Replay · {map.name}
            </span>
            <span className="text-slate-600">·</span>
            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-100 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Summary
            </button>
          </div>

          <div className="rounded-lg border border-slate-700/70 bg-[#0B101B]/82 px-3 py-2 w-52">
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 mb-1">
              STANDINGS AT {formatClock(playheadSec)}
            </div>
            <div className="space-y-1">
              {liveStandings.map((f, idx) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between text-xs font-mono-tabular"
                >
                  <span
                    className={`truncate max-w-[125px] ${
                      f.isHuman
                        ? f.playerIndex === 2
                          ? 'text-sky-300 font-bold'
                          : 'text-amber-300 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    {idx + 1}. {f.name}
                  </span>
                  <span className="text-slate-200">
                    {f.kills}/{f.deaths}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top-Center: Replay Clock & Zoom */}
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap justify-center">
          <div className="rounded-lg border border-slate-700/75 bg-[#0B101B]/90 px-4 py-1.5 font-mono-tabular text-sm font-bold text-white">
            {formatClock(playheadSec)} <span className="text-slate-500">/</span>{' '}
            <span className="text-slate-400">{formatClock(totalDuration)}</span>
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border border-slate-700/75 bg-[#0B101B]/90 p-1">
            {ZOOM_OPTIONS.map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`rounded px-2 py-1 text-xs font-bold font-mono-tabular transition-colors ${
                  zoom === z
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>

        <KillFeedOverlay items={activeKillFeed} />
      </div>

      {/* Bottom Theatre Controls Bar */}
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 p-3 sm:p-4">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-700/80 bg-[#0B101B]/92 px-4 py-3 shadow-2xl space-y-2.5">
          <div className="relative pt-1">
            <div className="relative h-5 flex items-center">
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.05}
                value={playheadSec}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Replay timeline scrubber"
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-2">
                {replay.killEvents.map((ev) => {
                  const pct = Math.max(
                    0,
                    Math.min(100, (ev.timestamp / Math.max(0.1, totalDuration)) * 100)
                  );
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => seekTo(Math.max(0, ev.timestamp - 1.5))}
                      title={`${ev.killerName} eliminated ${ev.victimName} (${formatClock(ev.timestamp)})`}
                      style={{ left: `${pct}%` }}
                      className={`pointer-events-auto absolute -translate-x-1/2 top-0 h-2.5 w-1.5 rounded-sm transition-transform hover:scale-150 ${
                        ev.multiKillCount && ev.multiKillCount >= 3
                          ? 'bg-amber-400'
                          : ev.isHeadshot
                          ? 'bg-rose-400'
                          : 'bg-red-500/85'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => seekTo(0)}
                className="rounded-lg border border-slate-700 bg-slate-800/90 p-2 text-slate-200 hover:border-amber-500/60 hover:text-white transition-colors"
                title="Restart replay"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => seekTo(playheadSec - 5)}
                className="rounded-lg border border-slate-700 bg-slate-800/90 p-2 text-slate-200 hover:border-amber-500/60 hover:text-white transition-colors"
                title="Back 5s (Left Arrow)"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (playheadRef.current >= totalDuration - 0.1) {
                    seekTo(0);
                  }
                  setPlaying((p) => !p);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                {playing ? (
                  <>
                    <Pause className="h-4 w-4 fill-current" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Play
                  </>
                )}
              </button>
              <button
                onClick={() => seekTo(playheadSec + 5)}
                className="rounded-lg border border-slate-700 bg-slate-800/90 p-2 text-slate-200 hover:border-amber-500/60 hover:text-white transition-colors"
                title="Forward 5s (Right Arrow)"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              <div className="ml-1 flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900/90 p-0.5">
                <FastForward className="h-3.5 w-3.5 text-slate-400 mx-1.5" />
                {SPEED_OPTIONS.map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setSpeed(sp)}
                    className={`rounded px-2 py-1 text-xs font-bold font-mono-tabular transition-colors ${
                      speed === sp
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mr-0.5">
                <Camera className="h-3.5 w-3.5 text-amber-400" />
                Follow:
              </span>
              {replay.fightersMeta.map((fm) => (
                <button
                  key={fm.id}
                  onClick={() => setFollowId(fm.id)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    followId === fm.id
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {fm.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function fsBuff(val: number | undefined): number {
  return val ?? 0;
}
