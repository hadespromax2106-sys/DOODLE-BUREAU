import React, { useEffect, useRef } from 'react';
import { FastForward, Film } from 'lucide-react';
import { RANKS } from '../data/catalog';
import { createEmptyWeaponKills } from '../db/playerDb';
import { getArenaMap } from '../game/map';
import { ArenaRenderer } from '../game/renderer';
import {
  BarrelEntity,
  CameraState,
  DestructibleWallEntity,
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
import { MatchReplayData } from '../types/game';

interface KillCamOverlayProps {
  replay: MatchReplayData;
  onComplete: () => void;
}

export const KillCamOverlay: React.FC<KillCamOverlayProps> = ({ replay, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);

  const killerMeta =
    replay.fightersMeta.find((f) => f.id === replay.winningKillerId) || replay.fightersMeta[0];
  const victimMeta = replay.fightersMeta.find((f) => f.id === replay.winningVictimId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || replay.frames.length < 2) {
      onComplete();
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onComplete();
      return;
    }

    const renderer = new ArenaRenderer();
    const map = getArenaMap(replay.mapId);
    const totalSec = replay.frames[replay.frames.length - 1].elapsedSec;
    const startSec = Math.max(0, totalSec - 3.2);
    let playhead = startSec;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const cam: CameraState = {
      x: map.width / 2,
      y: map.height / 2,
      zoom: 1.35,
      shake: 0,
    };

    const emptyKills = createEmptyWeaponKills();
    const particles: Particle[] = [];
    let lastMs = performance.now();
    let rafId = 0;

    const loop = (nowMs: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastMs) / 1000));
      lastMs = nowMs;

      // Dramatic 0.42x slow-motion playback
      playhead += dt * 0.42;

      if (playhead >= totalSec && !completedRef.current) {
        completedRef.current = true;
        onComplete();
        return;
      }

      // Find nearest frame
      let frameIdx = replay.frames.length - 1;
      for (let i = 0; i < replay.frames.length; i++) {
        if (replay.frames[i].elapsedSec >= playhead) {
          frameIdx = i;
          break;
        }
      }
      const fState = replay.frames[frameIdx];

      const fighters: FighterEntity[] = replay.fightersMeta.map((meta) => {
        const fs = fState.fighters.find((x) => x.id === meta.id) || fState.fighters[0];
        return {
          id: meta.id,
          name: meta.name,
          characterId: meta.characterId,
          outfitId: meta.outfitId,
          flameId: meta.flameId,
          rank: RANKS.find((r) => r.id === meta.rankId) || RANKS[0],
          isHuman: meta.isHuman,
          playerIndex: meta.playerIndex,
          x: fs?.x ?? 400,
          y: fs?.y ?? 400,
          vx: 0,
          vy: 0,
          w: 28,
          h: 48,
          facing: fs?.facing ?? 1,
          aimAngle: fs?.aimAngle ?? 0,
          grounded: fs?.grounded ?? true,
          coyoteTimer: 0,
          wallSlideDir: 0,
          onLadder: false,
          dropThroughTimer: 0,
          jetpacking: fs?.jetpacking ?? false,
          inWater: false,
          hp: fs?.hp ?? 100,
          maxHp: fs?.maxHp ?? 100,
          fuel: 100,
          maxFuel: 100,
          weaponId: fs?.weaponId ?? 'ak',
          activeSlot: fs?.activeSlot ?? 'primary',
          primaryWeaponId: fs?.weaponId ?? 'ak',
          primaryAmmo: 30,
          secondaryWeaponId: 'pistol',
          secondaryAmmo: 15,
          meleeWeaponId: fs?.meleeWeaponId ?? 'knife',
          weaponMastery: fs?.weaponMastery || meta.weaponMastery || 'none',
          ammo: 30,
          isReloading: false,
          reloadTimerMs: 0,
          fireCooldownMs: 0,
          burstRemaining: 0,
          burstTimerMs: 0,
          recoilKick: 0,
          muzzleFlashTimer: fs?.muzzleFlashTimer ?? 0,
          hitFlashTimer: fs?.hitFlashTimer ?? 0,
          walkCycle: fs?.walkCycle ?? 0,
          alive: fs?.alive ?? true,
          respawnTimer: 0,
          spawnInvulnTimer: fs?.spawnInvulnTimer ?? 0,
          lastHitById: null,
          lastHitWeapon: null,
          lastHitAt: 0,
          meleeCooldownTimer: 0,
          meleeSwingTimer: fs?.meleeSwingTimer ?? 0,
          grenades: 0,
          grenadeType: 'frag',
          grenadeRegenTimer: 0,
          dualWield: fs?.dualWield ?? null,
          dualWieldAmmo: 0,
          ultCharge: 0,
          ultActiveTimer: fs?.ultActiveTimer ?? 0,
          killstreak: 0,
          uavTimer: 0,
          rapidJetTimer: 0,
          speedBuffTimer: fs?.speedBuffTimer ?? 0,
          fuelBuffTimer: fs?.fuelBuffTimer ?? 0,
          shieldHp: fs?.shieldHp ?? 0,
          shieldBuffTimer: fs?.shieldBuffTimer ?? 0,
          kothPoints: 0,
          inPodium: false,
          speechText: fs?.speechText ?? '',
          speechTimer: fs?.speechTimer ?? 0,
          kills: fs?.kills ?? 0,
          deaths: fs?.deaths ?? 0,
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
          aiGoalX: 0,
          aiGoalY: 0,
          aiStrafeDir: 1,
          aiFireHoldTimer: 0,
        };
      });

      const target =
        fighters.find((f) => f.id === killerMeta?.id) || fighters[0];
      if (target) {
        cam.x += (target.x - cam.x) * Math.min(1, dt * 8);
        cam.y += (target.y - cam.y) * Math.min(1, dt * 8);
      }

      const projectiles: ProjectileEntity[] = fState.projectiles.map((p) => ({
        ...p,
        ownerId: '',
        damage: 0,
        explosionRadius: 0,
        life: 1,
      }));
      const grenades: GrenadeEntity[] = (fState.grenades || []).map((g) => ({
        ...g,
        ownerId: '',
        vx: 0,
        vy: 0,
        vRot: 0,
        stuck: Boolean(g.stuck),
      }));
      const smokeClouds: SmokeCloudEntity[] = fState.smokeClouds || [];
      const barrels: BarrelEntity[] = map.barrelSpawns.map((bs, idx) => ({
        id: bs.id,
        x: bs.x,
        y: bs.y,
        w: 26,
        h: 38,
        hp: 45,
        maxHp: 45,
        alive: fState.barrelsAlive[idx] ?? true,
        respawnTimer: 0,
        hitFlashTimer: 0,
      }));
      const pickups: PickupEntity[] = map.pickupSpawns.map((ps, idx) => ({
        id: ps.id,
        x: ps.x,
        y: ps.y,
        type: ps.type,
        respawnSec: ps.respawnSec,
        active: fState.pickupsActive[idx] ?? true,
        respawnTimer: 0,
        bobPhase: idx * 0.9,
      }));
      const destructibleWalls: DestructibleWallEntity[] = map.destructibleWalls.map((dw, idx) => {
        const s = fState.destructibleWalls[idx];
        return {
          ...dw,
          hp: s?.hp ?? dw.maxHp,
          alive: s?.alive ?? true,
          respawnTimer: 0,
          hitFlashTimer: s?.hitFlashTimer ?? 0,
        };
      });
      const tempWalls: TempWallEntity[] = fState.tempWalls.map((w) => ({ ...w, ownerId: '' }));
      const powerUps: PowerUpDropEntity[] = (fState.powerUps || []).map((pu) => ({
        ...pu,
        vx: 0,
        vy: 0,
        maxLife: 18,
        bobPhase: 0,
      }));
      const floatingTexts: FloatingText[] = fState.floatingTexts.map((ft) => ({
        ...ft,
        vy: -30,
      }));

      renderer.renderFrame(
        ctx,
        canvas.width,
        canvas.height,
        'solo',
        [cam],
        fighters,
        projectiles,
        barrels,
        pickups,
        tempWalls,
        destructibleWalls,
        particles,
        floatingTexts,
        [],
        fState.elapsedSec,
        powerUps,
        { map, grenades, smokeClouds }
      );

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [replay, killerMeta?.id, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B101B]">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Cinema Letterbox Bars */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-14 bg-gradient-to-b from-black/95 to-transparent flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <Film className="h-5 w-5 text-amber-400 animate-pulse" />
          <span className="font-display text-2xl tracking-widest text-amber-300 uppercase">
            FINAL KILL-CAM · SLOW MOTION
          </span>
        </div>
        <div className="text-xs font-mono-tabular text-slate-300">
          {killerMeta ? `${killerMeta.name}` : 'Champion'}
          {victimMeta ? ` → ${victimMeta.name}` : ''}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/95 to-transparent flex items-center justify-end px-6">
        <button
          type="button"
          onClick={() => {
            if (!completedRef.current) {
              completedRef.current = true;
              onComplete();
            }
          }}
          className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-amber-500/60 bg-slate-900/90 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
        >
          <FastForward className="h-3.5 w-3.5" />
          Skip to Results
        </button>
      </div>
    </div>
  );
};
