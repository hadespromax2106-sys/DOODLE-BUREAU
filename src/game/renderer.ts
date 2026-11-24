import {
  CHARACTERS,
  FLAME_COSMETICS,
  MELEE_WEAPONS,
  OUTFIT_COSMETICS,
  WEAPONS,
} from '../data/catalog';
import {
  CtfHudState,
  DominationHudState,
  GameMode,
  HardpointHudState,
  KothHudState,
  MeleeWeaponId,
  TeamScoreHud,
  WeaponMasteryTier,
} from '../types/game';
import { ArenaMap, ARENA_MAP, PlatformRect } from './map';
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
  ScorchDecal,
  SmokeCloudEntity,
  TempWallEntity,
} from './types';

export const SKYLINE_IMAGE_URL = '/src/assets/images/dusk_city_skyline_1795269121163.jpg';

export interface CrosshairRenderInfo {
  x: number;
  y: number;
  active: boolean;
  isReloading?: boolean;
  reloadProgress?: number;
}

export interface ExtraRenderState {
  map?: ArenaMap;
  grenades?: GrenadeEntity[];
  smokeClouds?: SmokeCloudEntity[];
  airstrikes?: AirstrikeBeaconEntity[];
  scorchDecals?: ScorchDecal[];
  dualWieldDrops?: DualWieldDropEntity[];
  isTeamMode?: boolean;
  teamScores?: TeamScoreHud;
  hardpoint?: HardpointHudState;
  domination?: DominationHudState;
  ctf?: CtfHudState;
  koth?: KothHudState;
  uavActiveForCam?: boolean[];
}

export class ArenaRenderer {
  private bgImage: HTMLImageElement | null = null;
  private bgLoaded = false;

  constructor() {
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.onload = () => {
        this.bgLoaded = true;
      };
      img.src = SKYLINE_IMAGE_URL;
      this.bgImage = img;
    }
  }

  public renderFrame(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    mode: GameMode,
    cameras: CameraState[],
    fighters: FighterEntity[],
    projectiles: ProjectileEntity[],
    barrels: BarrelEntity[],
    pickups: PickupEntity[],
    tempWalls: TempWallEntity[],
    destructibleWalls: DestructibleWallEntity[],
    particles: Particle[],
    floatingTexts: FloatingText[],
    crosshairs: CrosshairRenderInfo[],
    elapsedSec: number,
    powerUps: PowerUpDropEntity[] = [],
    extra: ExtraRenderState = {}
  ): void {
    ctx.clearRect(0, 0, canvasW, canvasH);
    const map = extra.map || ARENA_MAP;

    if (mode === 'versus_2p' && cameras.length >= 2) {
      const halfW = Math.floor(canvasW / 2);
      this.renderViewport(
        ctx,
        0,
        0,
        halfW,
        canvasH,
        cameras[0],
        map,
        fighters,
        projectiles,
        barrels,
        pickups,
        tempWalls,
        destructibleWalls,
        particles,
        floatingTexts,
        crosshairs[0],
        elapsedSec,
        'P1',
        powerUps,
        extra,
        Boolean(extra.uavActiveForCam?.[0])
      );
      this.renderViewport(
        ctx,
        halfW,
        0,
        canvasW - halfW,
        canvasH,
        cameras[1],
        map,
        fighters,
        projectiles,
        barrels,
        pickups,
        tempWalls,
        destructibleWalls,
        particles,
        floatingTexts,
        crosshairs[1],
        elapsedSec,
        'P2',
        powerUps,
        extra,
        Boolean(extra.uavActiveForCam?.[1])
      );

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(halfW - 2, 0, 4, canvasH);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(halfW - 1, 0, 2, canvasH);
    } else {
      this.renderViewport(
        ctx,
        0,
        0,
        canvasW,
        canvasH,
        cameras[0],
        map,
        fighters,
        projectiles,
        barrels,
        pickups,
        tempWalls,
        destructibleWalls,
        particles,
        floatingTexts,
        crosshairs[0],
        elapsedSec,
        undefined,
        powerUps,
        extra,
        Boolean(extra.uavActiveForCam?.[0])
      );
    }
  }

  private renderViewport(
    ctx: CanvasRenderingContext2D,
    vx: number,
    vy: number,
    vw: number,
    vh: number,
    cam: CameraState,
    map: ArenaMap,
    fighters: FighterEntity[],
    projectiles: ProjectileEntity[],
    barrels: BarrelEntity[],
    pickups: PickupEntity[],
    tempWalls: TempWallEntity[],
    destructibleWalls: DestructibleWallEntity[],
    particles: Particle[],
    floatingTexts: FloatingText[],
    crosshair: CrosshairRenderInfo | undefined,
    elapsedSec: number,
    splitLabel?: string,
    powerUps: PowerUpDropEntity[] = [],
    extra: ExtraRenderState = {},
    uavActive = false
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();

    this.drawBackdrop(ctx, vx, vy, vw, vh, cam, map, elapsedSec);

    const shakeX = (Math.random() * 2 - 1) * cam.shake;
    const shakeY = (Math.random() * 2 - 1) * cam.shake;

    ctx.translate(vx + vw / 2 + shakeX, vy + vh / 2 + shakeY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    this.drawBiomeBackdrops(ctx, map, elapsedSec);
    this.drawLadders(ctx, map);

    // Mode Objectives (Hardpoint, Domination, CTF, KOTH fallback)
    if (extra.hardpoint) {
      this.drawHardpointZone(ctx, extra.hardpoint, elapsedSec);
    } else if (extra.domination) {
      this.drawDominationFlags(ctx, extra.domination, elapsedSec);
    } else if (extra.ctf) {
      this.drawCtfObjectives(ctx, extra.ctf, elapsedSec);
    } else if (extra.koth) {
      this.drawKothPodium(ctx, extra.koth, elapsedSec);
    }

    // Platforms & Procedural Surface Textures
    for (const p of map.platforms) {
      this.drawPlatform(ctx, p, elapsedSec);
    }
    this.drawRamps(ctx, map);

    // Persistent Blast Scorch Decals
    for (const sc of extra.scorchDecals || []) {
      ctx.save();
      ctx.globalAlpha = sc.alpha;
      const grad = ctx.createRadialGradient(sc.x, sc.y, 2, sc.x, sc.y, sc.radius);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
      grad.addColorStop(0.6, 'rgba(30, 41, 59, 0.45)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(sc.x, sc.y, sc.radius, sc.radius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Jungle Water Pools (drawn behind ankles / splashing)
    if (map.waterPools) {
      this.drawWaterPools(ctx, map, elapsedSec);
    }

    // Grounded Drop Shadows under crates, barrels, pickups, fighters
    this.drawGroundedShadows(ctx, map, fighters, barrels, destructibleWalls);

    for (const dw of destructibleWalls) {
      this.drawDestructibleWall(ctx, dw);
    }

    for (const wall of tempWalls) {
      this.drawGoldenWall(ctx, wall, elapsedSec);
    }

    for (const pk of pickups) {
      this.drawPickup(ctx, pk, elapsedSec);
    }

    for (const pu of powerUps) {
      this.drawPowerUpDrop(ctx, pu, elapsedSec);
    }

    for (const dwDrop of extra.dualWieldDrops || []) {
      this.drawDualWieldDrop(ctx, dwDrop, elapsedSec);
    }

    for (const b of barrels) {
      if (b.alive) {
        this.drawBarrel(ctx, b);
      } else {
        this.drawBarrelRespawnGhost(ctx, b);
      }
    }

    // Airstrike Laser Beacons
    for (const strike of extra.airstrikes || []) {
      this.drawAirstrikeBeacon(ctx, strike, elapsedSec);
    }

    for (const f of fighters) {
      if (f.alive) {
        this.drawFighter(ctx, f, elapsedSec, Boolean(extra.isTeamMode));
      }
    }

    for (const f of fighters) {
      if (
        f.alive &&
        !f.dualWield &&
        (f.weaponId === 'anu34' || f.weaponId === 'dlp44' || f.weaponId === 'awq') &&
        !f.isReloading
      ) {
        this.drawSniperLaser(ctx, f);
      }
    }

    for (const proj of projectiles) {
      this.drawProjectile(ctx, proj);
    }

    for (const gr of extra.grenades || []) {
      this.drawGrenade(ctx, gr, elapsedSec);
    }

    for (const pt of particles) {
      if (!pt.active) continue;
      this.drawParticle(ctx, pt);
    }

    // Smoke Grenade Clouds (drawn over fighters/projectiles to obscure sightlines!)
    for (const cloud of extra.smokeClouds || []) {
      this.drawSmokeCloud(ctx, cloud, elapsedSec);
    }

    // UAV Enemy Radar Brackets (visible even through smoke & cover!)
    if (uavActive) {
      const camOwner = splitLabel === 'P2' ? 2 : 1;
      for (const f of fighters) {
        if (!f.alive) continue;
        if (f.playerIndex === camOwner) continue;
        this.drawUavMarker(ctx, f, elapsedSec);
      }
    }

    // Comic Speech Bubbles & Floating Damage/Quip Texts
    for (const f of fighters) {
      if (f.alive && f.speechTimer > 0 && f.speechText) {
        this.drawSpeechBubble(ctx, f.x, f.y - 68, f.speechText, f.speechTimer);
      }
    }

    for (const ft of floatingTexts) {
      const alpha = Math.max(0, Math.min(1, ft.life / ft.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      const isQuip = ft.text.startsWith('"');
      ctx.font = isQuip
        ? '800 17px "Plus Jakarta Sans", sans-serif'
        : '700 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0B101B';
      ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    if (crosshair && crosshair.active) {
      this.drawCrosshair(
        ctx,
        crosshair.x,
        crosshair.y,
        crosshair.isReloading,
        crosshair.reloadProgress
      );
    }

    ctx.restore();

    // Dynamic biome weather overlay
    this.drawWeatherEffects(ctx, vx, vy, vw, vh, cam, map, elapsedSec);

    if (splitLabel) {
      ctx.save();
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(11, 16, 27, 0.78)';
      ctx.fillRect(vx + 12, vy + 12, 34, 22);
      ctx.strokeStyle = splitLabel === 'P1' ? '#F59E0B' : '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx + 12, vy + 12, 34, 22);
      ctx.fillStyle = '#F8FAFC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(splitLabel, vx + 29, vy + 23);
      ctx.restore();
    }
  }

  private drawBackdrop(
    ctx: CanvasRenderingContext2D,
    vx: number,
    vy: number,
    vw: number,
    vh: number,
    cam: CameraState,
    map: ArenaMap,
    elapsedSec: number
  ): void {
    const skyGrad = ctx.createLinearGradient(vx, vy, vx, vy + vh);
    if (map.biome === 'jungle') {
      skyGrad.addColorStop(0, '#022C22');
      skyGrad.addColorStop(0.55, '#064E3B');
      skyGrad.addColorStop(1, '#14532D');
    } else if (map.biome === 'desert') {
      skyGrad.addColorStop(0, '#1C1917');
      skyGrad.addColorStop(0.5, '#7C2D12');
      skyGrad.addColorStop(1, '#B45309');
    } else if (map.biome === 'arctic') {
      skyGrad.addColorStop(0, '#082F49');
      skyGrad.addColorStop(0.55, '#0C4A6E');
      skyGrad.addColorStop(1, '#334155');
    } else {
      skyGrad.addColorStop(0, '#090D1A');
      skyGrad.addColorStop(0.55, '#1D1E38');
      skyGrad.addColorStop(1, '#4A2622');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(vx, vy, vw, vh);

    if ((map.biome === 'city' || map.biome === 'hybrid') && this.bgLoaded && this.bgImage) {
      const parallaxX = ((cam.x - map.width / 2) / map.width) * 140;
      const parallaxY = ((cam.y - map.height / 2) / map.height) * 45;
      const imgAspect = this.bgImage.width / Math.max(1, this.bgImage.height);
      const drawH = Math.max(vh * 1.15, vw / imgAspect);
      const drawW = drawH * imgAspect;
      const dx = vx + (vw - drawW) / 2 - parallaxX;
      const dy = vy + (vh - drawH) / 2 - parallaxY;

      ctx.save();
      ctx.globalAlpha = 0.58;
      ctx.drawImage(this.bgImage, dx, dy, drawW, drawH);
      ctx.restore();
    }

    const haze = ctx.createLinearGradient(vx, vy, vx, vy + vh);
    haze.addColorStop(0, 'rgba(11, 16, 27, 0.34)');
    haze.addColorStop(0.7, 'rgba(11, 16, 27, 0.16)');
    haze.addColorStop(1, 'rgba(15, 23, 42, 0.45)');
    ctx.fillStyle = haze;
    ctx.fillRect(vx, vy, vw, vh);

    // Drifting ambient motes / embers / snow glints
    ctx.fillStyle =
      map.biome === 'arctic'
        ? 'rgba(224, 242, 254, 0.35)'
        : map.biome === 'jungle'
        ? 'rgba(163, 230, 53, 0.32)'
        : 'rgba(251, 191, 36, 0.32)';
    for (let i = 0; i < 16; i++) {
      const ex = vx + ((i * 197 + elapsedSec * (18 + (i % 4) * 6)) % (vw + 40)) - 20;
      const ey = vy + ((i * 131 - elapsedSec * (12 + (i % 3) * 5) + 2000) % vh);
      ctx.fillRect(ex, ey, 2.3, 2.3);
    }
  }

  private drawBiomeBackdrops(ctx: CanvasRenderingContext2D, map: ArenaMap, elapsedSec: number): void {
    ctx.save();

    if (map.biome === 'city') {
      // Ruined skyscrapers silhouettes behind West/East ruins
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.fillRect(110, 513, 420, 537);
      ctx.fillRect(2070, 513, 420, 537);
      ctx.fillRect(1080, 480, 440, 210);

      // Lit broken windows
      ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
          ctx.fillRect(145 + col * 74, 545 + row * 165, 38, 56);
          ctx.fillRect(2105 + col * 74, 545 + row * 165, 38, 56);
        }
      }
    } else if (map.biome === 'jungle') {
      // Distant stepped temple silhouette + towering ancient trees
      ctx.fillStyle = 'rgba(20, 83, 45, 0.36)';
      ctx.beginPath();
      ctx.moveTo(940, 1050);
      ctx.lineTo(1110, 520);
      ctx.lineTo(1490, 520);
      ctx.lineTo(1660, 1050);
      ctx.closePath();
      ctx.fill();

      for (let tx = 180; tx <= 2420; tx += 240) {
        ctx.fillStyle = 'rgba(41, 28, 20, 0.48)';
        ctx.fillRect(tx - 15, 180, 30, 870);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.beginPath();
        ctx.arc(tx, 190, 105, 0, Math.PI * 2);
        ctx.fill();
      }
      // Fireflies
      for (let i = 0; i < 18; i++) {
        const fx = 140 + ((i * 149 + Math.sin(elapsedSec * 1.4 + i) * 35) % 2320);
        const fy = 360 + ((i * 113 + Math.cos(elapsedSec * 1.8 + i) * 28) % 610);
        ctx.fillStyle = `rgba(163, 230, 53, ${0.4 + 0.4 * Math.sin(elapsedSec * 4 + i)})`;
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (map.biome === 'desert') {
      // Layered sandstone dunes & mesas
      ctx.fillStyle = 'rgba(120, 53, 15, 0.38)';
      ctx.beginPath();
      ctx.moveTo(0, 1050);
      ctx.quadraticCurveTo(420, 680, 840, 1050);
      ctx.quadraticCurveTo(1300, 590, 1780, 1050);
      ctx.quadraticCurveTo(2190, 700, 2600, 1050);
      ctx.closePath();
      ctx.fill();

      for (const cx of [310, 640, 1960, 2330]) {
        ctx.fillStyle = '#15803D';
        ctx.strokeStyle = '#052E16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - 7, 975, 14, 75, 6);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(cx - 21, 992, 14, 10, 4);
        ctx.roundRect(cx + 7, 998, 14, 10, 4);
        ctx.fill();
      }
    } else if (map.biome === 'arctic') {
      // Snowy jagged mountain peaks
      ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
      ctx.beginPath();
      ctx.moveTo(0, 1050);
      ctx.lineTo(360, 420);
      ctx.lineTo(740, 860);
      ctx.lineTo(1300, 320);
      ctx.lineTo(1860, 860);
      ctx.lineTo(2240, 400);
      ctx.lineTo(2600, 1050);
      ctx.closePath();
      ctx.fill();

      // White snow-capped ridge tips
      ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
      for (const [px, py] of [
        [360, 420],
        [1300, 320],
        [2240, 400],
      ]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 65, py + 95);
        ctx.lineTo(px + 65, py + 95);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Hybrid 3-Zone backdrops
      ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
      ctx.fillRect(92, 613, 420, 587);
      ctx.fillRect(875, 494, 290, 226);

      const forestGlow = ctx.createLinearGradient(1520, 0, 3000, 1300);
      forestGlow.addColorStop(0, 'rgba(6, 78, 59, 0.25)');
      forestGlow.addColorStop(0.5, 'rgba(5, 46, 22, 0.34)');
      forestGlow.addColorStop(1, 'rgba(6, 78, 59, 0.22)');
      ctx.fillStyle = forestGlow;
      ctx.fillRect(1520, 32, 1480, 1168);

      for (let tx = 1600; tx <= 2920; tx += 190) {
        ctx.fillStyle = 'rgba(41, 28, 20, 0.55)';
        ctx.fillRect(tx - 16, 260, 32, 940);
        ctx.fillStyle = 'rgba(20, 83, 45, 0.45)';
        ctx.beginPath();
        ctx.moveTo(tx, 120);
        ctx.lineTo(tx - 95, 360);
        ctx.lineTo(tx + 95, 360);
        ctx.closePath();
        ctx.fill();
      }

      const desertGlow = ctx.createLinearGradient(3000, 0, 4400, 1300);
      desertGlow.addColorStop(0, 'rgba(180, 83, 9, 0.16)');
      desertGlow.addColorStop(1, 'rgba(120, 53, 15, 0.3)');
      ctx.fillStyle = desertGlow;
      ctx.fillRect(3000, 32, 1400, 1168);

      ctx.font = '800 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(248, 250, 252, 0.45)';
      ctx.fillText('SECTOR 01 · ABANDONED CITY', 760, 90);
      ctx.fillStyle = 'rgba(163, 230, 53, 0.55)';
      ctx.fillText('SECTOR 02 · FOREST MAZE', 2260, 90);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.fillText('SECTOR 03 · DESERT OUTPOST', 3700, 90);
    }

    // Flickering Neon Signs (City & Hybrid)
    if (map.neonSigns) {
      for (const ns of map.neonSigns) {
        const flicker = Math.sin(elapsedSec * 19 + ns.x) > -0.75 ? 1 : 0.28;
        ctx.save();
        ctx.globalAlpha = flicker;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = ns.color;
        ctx.lineWidth = 2.5;
        ctx.fillRect(ns.x, ns.y, ns.w, ns.h);
        ctx.strokeRect(ns.x, ns.y, ns.w, ns.h);

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `${ns.color}33`;
        ctx.fillRect(ns.x - 6, ns.y - 6, ns.w + 12, ns.h + 12);

        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '800 15px "Big Shoulders Display", sans-serif';
        ctx.fillStyle = ns.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ns.text, ns.x + ns.w / 2, ns.y + ns.h / 2);
        ctx.restore();
      }
    }

    // Broken Flickering Streetlamps (City)
    if (map.streetLamps) {
      for (const sl of map.streetLamps) {
        const on = Math.sin(elapsedSec * 14 + sl.flickerPhase) > -0.6;
        ctx.fillStyle = '#334155';
        ctx.fillRect(sl.x - 3, sl.y - sl.h, 6, sl.h);
        ctx.fillRect(sl.x - 3, sl.y - sl.h, 24, 5);
        if (on) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const cone = ctx.createRadialGradient(
            sl.x + 18,
            sl.y - sl.h + 10,
            4,
            sl.x + 18,
            sl.y - 10,
            135
          );
          cone.addColorStop(0, 'rgba(251, 191, 36, 0.34)');
          cone.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = cone;
          ctx.beginPath();
          ctx.moveTo(sl.x + 14, sl.y - sl.h + 5);
          ctx.lineTo(sl.x + 90, sl.y);
          ctx.lineTo(sl.x - 50, sl.y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Swaying Hanging Vines (Jungle & Hybrid)
    if (map.vines) {
      for (const v of map.vines) {
        const sway = Math.sin(elapsedSec * 1.9 + v.phase) * 26;
        ctx.strokeStyle = '#15803D';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.quadraticCurveTo(v.x + sway * 0.5, v.y + v.len * 0.5, v.x + sway, v.y + v.len);
        ctx.stroke();
        // Leaves along vine
        ctx.fillStyle = '#22C55E';
        for (let t = 0.25; t <= 0.9; t += 0.22) {
          const lx = v.x + sway * t;
          const ly = v.y + v.len * t;
          ctx.beginPath();
          ctx.ellipse(lx + 6, ly, 7, 3, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Rotating Radar Towers (Arctic)
    if (map.radarTowers) {
      for (const rt of map.radarTowers) {
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(rt.x - 24, rt.y);
        ctx.lineTo(rt.x, rt.y - rt.h);
        ctx.lineTo(rt.x + 24, rt.y);
        ctx.stroke();
        const sweep = Math.sin(elapsedSec * 1.4) * 0.65;
        ctx.save();
        ctx.translate(rt.x, rt.y - rt.h);
        ctx.rotate(sweep);
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 22, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private drawWaterPools(ctx: CanvasRenderingContext2D, map: ArenaMap, elapsedSec: number): void {
    if (!map.waterPools) return;
    ctx.save();
    for (const wp of map.waterPools) {
      const grad = ctx.createLinearGradient(wp.x, wp.y, wp.x, wp.y + wp.h);
      grad.addColorStop(0, 'rgba(14, 165, 233, 0.42)');
      grad.addColorStop(1, 'rgba(3, 105, 161, 0.72)');
      ctx.fillStyle = grad;
      ctx.fillRect(wp.x, wp.y, wp.w, wp.h);

      // Animated surface wave line
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let wx = wp.x; wx <= wp.x + wp.w; wx += 14) {
        const wy = wp.y + Math.sin(elapsedSec * 4 + wx * 0.05) * 2.5;
        if (wx === wp.x) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawKothPodium(
    ctx: CanvasRenderingContext2D,
    koth: KothHudState,
    elapsedSec: number
  ): void {
    ctx.save();
    const zoneColor = koth.contested
      ? '#EF4444'
      : koth.ownerId
      ? '#F59E0B'
      : '#38BDF8';

    // Vertical holographic beam
    const grad = ctx.createLinearGradient(
      koth.podiumX,
      koth.podiumY + koth.podiumH,
      koth.podiumX,
      koth.podiumY
    );
    grad.addColorStop(0, `${zoneColor}44`);
    grad.addColorStop(1, `${zoneColor}08`);
    ctx.fillStyle = grad;
    ctx.fillRect(koth.podiumX, koth.podiumY, koth.podiumW, koth.podiumH);

    // Side boundaries
    ctx.strokeStyle = zoneColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(koth.podiumX, koth.podiumY, koth.podiumW, koth.podiumH);
    ctx.setLineDash([]);

    // Podium Floor Pad
    ctx.fillStyle = zoneColor;
    ctx.fillRect(koth.podiumX, koth.podiumY + koth.podiumH - 5, koth.podiumW, 5);

    const pulse = 0.75 + 0.25 * Math.sin(elapsedSec * 5);
    ctx.globalAlpha = pulse;
    ctx.font = '800 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = zoneColor;
    const statusText = koth.contested
      ? 'CONTESTED!'
      : koth.ownerName
      ? `CONTROLLED: ${koth.ownerName.toUpperCase()}`
      : 'CAPTURE PODIUM';
    ctx.fillText(statusText, koth.podiumX + koth.podiumW / 2, koth.podiumY - 10);
    ctx.restore();
  }

  private drawHardpointZone(
    ctx: CanvasRenderingContext2D,
    hp: HardpointHudState,
    elapsedSec: number
  ): void {
    ctx.save();
    const zoneColor = hp.contested
      ? '#F59E0B'
      : hp.ownerTeam === 'alpha'
      ? '#F43F5E'
      : hp.ownerTeam === 'bravo'
      ? '#38BDF8'
      : '#A855F7';

    const grad = ctx.createLinearGradient(hp.x, hp.y + hp.h, hp.x, hp.y);
    grad.addColorStop(0, `${zoneColor}52`);
    grad.addColorStop(1, `${zoneColor}0D`);
    ctx.fillStyle = grad;
    ctx.fillRect(hp.x, hp.y, hp.w, hp.h);

    ctx.strokeStyle = zoneColor;
    ctx.lineWidth = 2.8;
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = -elapsedSec * 22;
    ctx.strokeRect(hp.x, hp.y, hp.w, hp.h);
    ctx.setLineDash([]);

    ctx.fillStyle = zoneColor;
    ctx.fillRect(hp.x, hp.y + hp.h - 6, hp.w, 6);

    ctx.font = '800 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const banner = hp.contested
      ? `HARDPOINT CONTESTED · ${Math.ceil(hp.rotateTimerSec)}s`
      : hp.ownerTeam
      ? `${hp.ownerTeam.toUpperCase()} HARDPOINT · ${Math.ceil(hp.rotateTimerSec)}s`
      : `HARDPOINT: ${hp.zoneLabel.toUpperCase()} · ${Math.ceil(hp.rotateTimerSec)}s`;
    ctx.fillStyle = '#0B101B';
    ctx.fillText(banner, hp.x + hp.w / 2 + 1, hp.y - 9);
    ctx.fillStyle = zoneColor;
    ctx.fillText(banner, hp.x + hp.w / 2, hp.y - 10);
    ctx.restore();
  }

  private drawDominationFlags(
    ctx: CanvasRenderingContext2D,
    dom: DominationHudState,
    elapsedSec: number
  ): void {
    for (const flag of dom.flags) {
      ctx.save();
      const ownerColor =
        flag.contested
          ? '#F59E0B'
          : flag.ownerTeam === 'alpha'
          ? '#F43F5E'
          : flag.ownerTeam === 'bravo'
          ? '#38BDF8'
          : '#94A3B8';

      // Capture radius floor highlight
      ctx.fillStyle = `${ownerColor}24`;
      ctx.beginPath();
      ctx.ellipse(flag.x, flag.y, 72, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `${ownerColor}88`;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Flag Pole
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(flag.x, flag.y);
      ctx.lineTo(flag.x, flag.y - 78);
      ctx.stroke();

      // Fluttering Flag Banner
      const wave = Math.sin(elapsedSec * 6 + flag.x * 0.01) * 3;
      ctx.fillStyle = ownerColor;
      ctx.strokeStyle = '#0B101B';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(flag.x, flag.y - 76);
      ctx.lineTo(flag.x + 34, flag.y - 70 + wave);
      ctx.lineTo(flag.x + 30, flag.y - 52 + wave);
      ctx.lineTo(flag.x, flag.y - 54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Letter Badge (A / B / C)
      ctx.fillStyle = '#0B101B';
      ctx.strokeStyle = ownerColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(flag.x, flag.y - 94, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '900 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(flag.id, flag.x, flag.y - 94);

      // Capture progress bar if capturing/contested
      const absProg = Math.abs(flag.progress);
      if (absProg > 0 && absProg < 100) {
        const barColor = flag.progress > 0 ? '#F43F5E' : '#38BDF8';
        ctx.fillStyle = 'rgba(11, 16, 27, 0.85)';
        ctx.fillRect(flag.x - 24, flag.y - 116, 48, 6);
        ctx.fillStyle = barColor;
        ctx.fillRect(flag.x - 23, flag.y - 115, 46 * (absProg / 100), 4);
      } else if (flag.contested) {
        ctx.fillStyle = '#FACC15';
        ctx.font = '800 9px "JetBrains Mono", monospace';
        ctx.fillText('CONTESTED', flag.x, flag.y - 113);
      }

      ctx.restore();
    }
  }

  private drawCtfObjectives(
    ctx: CanvasRenderingContext2D,
    ctf: CtfHudState,
    elapsedSec: number
  ): void {
    for (const flag of ctf.flags) {
      const teamColor = flag.team === 'alpha' ? '#F43F5E' : '#38BDF8';
      const teamName = flag.team === 'alpha' ? 'ALPHA BASE' : 'BRAVO BASE';

      // Base pedestal
      ctx.save();
      ctx.fillStyle = `${teamColor}26`;
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(flag.baseX, flag.baseY, 44, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '800 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = teamColor;
      ctx.fillText(teamName, flag.baseX, flag.baseY + 20);
      ctx.restore();

      // Draw flag itself if at_base or dropped (carried flags are rendered directly on carrier)
      if (flag.state !== 'carried') {
        ctx.save();
        const fx = flag.x;
        const fy = flag.y;
        const wave = Math.sin(elapsedSec * 6.5) * 3;
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx, fy - 64);
        ctx.stroke();

        ctx.fillStyle = teamColor;
        ctx.strokeStyle = '#0B101B';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(fx, fy - 62);
        ctx.lineTo(fx + 30, fy - 56 + wave);
        ctx.lineTo(fx + 25, fy - 38 + wave);
        ctx.lineTo(fx, fy - 42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (flag.state === 'dropped') {
          ctx.font = '800 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FACC15';
          ctx.fillText(`RETURN ${Math.ceil(flag.returnTimerSec)}s`, fx, fy - 74);
        }
        ctx.restore();
      }
    }
  }

  private drawGroundedShadows(
    ctx: CanvasRenderingContext2D,
    map: ArenaMap,
    fighters: FighterEntity[],
    barrels: BarrelEntity[],
    destructibleWalls: DestructibleWallEntity[]
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';

    const findFloorY = (x: number, y: number): number | null => {
      let bestY: number | null = null;
      for (const p of map.platforms) {
        if (p.id === 'ceiling' || p.id === 'wall_left' || p.id === 'wall_right') continue;
        if (x >= p.x && x <= p.x + p.w && p.y >= y - 4 && p.y - y < 220) {
          if (bestY === null || p.y < bestY) bestY = p.y;
        }
      }
      return bestY;
    };

    for (const f of fighters) {
      if (!f.alive) continue;
      const fy = findFloorY(f.x, f.y + f.h / 2);
      if (fy !== null) {
        const dist = Math.max(0, fy - (f.y + f.h / 2));
        const scale = Math.max(0.35, 1 - dist / 220);
        ctx.beginPath();
        ctx.ellipse(f.x, fy + 1, 16 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const b of barrels) {
      if (!b.alive) continue;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y + 1, 15, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const dw of destructibleWalls) {
      if (!dw.alive) continue;
      ctx.beginPath();
      ctx.ellipse(dw.x + dw.w / 2, dw.y + dw.h + 1, dw.w * 0.52, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawLadders(ctx: CanvasRenderingContext2D, map: ArenaMap): void {
    ctx.save();
    for (const lad of map.ladders) {
      const inForest = map.biome === 'jungle' || (map.biome === 'hybrid' && lad.x >= 1520 && lad.x < 3000);
      ctx.strokeStyle = inForest ? '#65A30D' : '#64748B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lad.x + 6, lad.y);
      ctx.lineTo(lad.x + 6, lad.y + lad.h);
      ctx.moveTo(lad.x + lad.w - 6, lad.y);
      ctx.lineTo(lad.x + lad.w - 6, lad.y + lad.h);
      ctx.stroke();

      ctx.strokeStyle = inForest ? '#84CC16' : '#94A3B8';
      ctx.lineWidth = 2.5;
      for (let ry = lad.y + 14; ry < lad.y + lad.h - 6; ry += 22) {
        ctx.beginPath();
        ctx.moveTo(lad.x + 6, ry);
        ctx.lineTo(lad.x + lad.w - 6, ry);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawPlatform(ctx: CanvasRenderingContext2D, p: PlatformRect, elapsedSec: number): void {
    ctx.save();
    if (p.style === 'grate') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let gx = p.x + 8; gx < p.x + p.w - 8; gx += 18) {
        ctx.moveTo(gx, p.y + 5);
        ctx.lineTo(gx + 10, p.y + p.h - 2);
      }
      ctx.stroke();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else if (p.style === 'sandbag') {
      ctx.fillStyle = '#786B53';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#57534E';
      for (let sy = p.y + 12; sy < p.y + p.h; sy += 13) {
        ctx.beginPath();
        ctx.moveTo(p.x + 2, sy);
        ctx.lineTo(p.x + p.w - 2, sy);
        ctx.stroke();
      }
    } else if (p.style === 'brick') {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, '#6D3B32');
      grad.addColorStop(1, '#43221D');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#8C4D43';
      for (let by = p.y + 4; by < p.y + p.h - 6; by += 14) {
        ctx.fillRect(p.x + 4, by, Math.max(6, p.w - 8), 7);
      }
      ctx.strokeStyle = '#1C1917';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else if (p.style === 'timber') {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, '#784B2A');
      grad.addColorStop(1, '#4A2C16');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#925B33';
      for (let x = p.x + 6; x < p.x + p.w - 4; x += 14) {
        ctx.fillRect(x, p.y + 4, 4, p.h - 8);
      }
      ctx.strokeStyle = '#1C1008';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else if (p.style === 'moss') {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, '#3F3A36');
      grad.addColorStop(1, '#1C1917');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(p.x, p.y, p.w, 6);
      // Grass tufts along top edge
      ctx.fillStyle = '#4ADE80';
      for (let gx = p.x + 12; gx < p.x + p.w - 10; gx += 26) {
        ctx.fillRect(gx, p.y - 3, 4, 4);
      }
      ctx.strokeStyle = '#052E16';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else if (p.style === 'sandstone') {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, '#D97706');
      grad.addColorStop(1, '#78350F');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(p.x, p.y, p.w, 5);
      // Sand strata seams
      ctx.fillStyle = 'rgba(69, 26, 3, 0.28)';
      for (let sy = p.y + 16; sy < p.y + p.h - 6; sy += 22) {
        ctx.fillRect(p.x + 6, sy, Math.max(8, p.w - 12), 3);
      }
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else if (p.style === 'ice') {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, '#BAE6FD');
      grad.addColorStop(0.5, '#38BDF8');
      grad.addColorStop(1, '#0284C7');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // Shimmering glare streaks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(p.x, p.y, p.w, 4);
      for (let ix = p.x + 14; ix < p.x + p.w - 18; ix += 42) {
        const shimmer = 0.25 + 0.15 * Math.sin(elapsedSec * 3 + ix * 0.05);
        ctx.fillStyle = `rgba(255, 255, 255, ${shimmer})`;
        ctx.fillRect(ix, p.y + 5, 16, Math.min(8, p.h - 7));
      }
      ctx.strokeStyle = '#075985';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else if (p.style === 'snow') {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, '#475569');
      grad.addColorStop(1, '#1E293B');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // Thick snow cap
      ctx.fillStyle = '#F0F9FF';
      ctx.fillRect(p.x, p.y, p.w, 8);
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(p.x, p.y + 7, p.w, 3);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else if (p.style === 'crate_cover') {
      ctx.fillStyle = '#92400E';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.w, p.y + p.h);
      ctx.moveTo(p.x + p.w, p.y);
      ctx.lineTo(p.x, p.y + p.h);
      ctx.stroke();
    } else {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, p.kind === 'oneway' ? '#475569' : '#334155');
      grad.addColorStop(1, '#1E293B');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = p.kind === 'oneway' ? '#94A3B8' : '#64748B';
      ctx.fillRect(p.x, p.y, p.w, 5);
      // Concrete seam lines
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      for (let sx = p.x + 64; sx < p.x + p.w - 20; sx += 80) {
        ctx.fillRect(sx, p.y + 6, 2, p.h - 8);
      }
      ctx.strokeStyle = '#0B101B';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
    ctx.restore();
  }

  private drawDestructibleWall(
    ctx: CanvasRenderingContext2D,
    dw: DestructibleWallEntity
  ): void {
    ctx.save();
    if (!dw.alive) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.fillRect(dw.x + 2, dw.y + dw.h - 7, dw.w - 4, 7);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(dw.x, dw.y, dw.w, dw.h);
      ctx.restore();
      return;
    }

    const hpRatio = Math.max(0, Math.min(1, dw.hp / dw.maxHp));
    if (dw.hitFlashTimer > 0) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(dw.x, dw.y, dw.w, dw.h);
      ctx.strokeStyle = '#0B101B';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(dw.x, dw.y, dw.w, dw.h);
    } else if (dw.style === 'glass') {
      ctx.fillStyle = 'rgba(125, 211, 252, 0.34)';
      ctx.fillRect(dw.x, dw.y, dw.w, dw.h);
      // Glint streaks
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dw.x + 4, dw.y + 18);
      ctx.lineTo(dw.x + dw.w - 4, dw.y + 4);
      ctx.moveTo(dw.x + 4, dw.y + 54);
      ctx.lineTo(dw.x + dw.w - 4, dw.y + 40);
      ctx.stroke();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.strokeRect(dw.x, dw.y, dw.w, dw.h);
    } else if (dw.style === 'crate_wood' || dw.style === 'crate_cover') {
      ctx.fillStyle = '#A16207';
      ctx.fillRect(dw.x, dw.y, dw.w, dw.h);
      ctx.fillStyle = '#CA8A04';
      ctx.fillRect(dw.x + 4, dw.y + 4, dw.w - 8, dw.h - 8);
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(dw.x, dw.y, dw.w, dw.h);
      ctx.beginPath();
      ctx.moveTo(dw.x + 4, dw.y + 4);
      ctx.lineTo(dw.x + dw.w - 4, dw.y + dw.h - 4);
      ctx.moveTo(dw.x + dw.w - 4, dw.y + 4);
      ctx.lineTo(dw.x + 4, dw.y + dw.h - 4);
      ctx.stroke();
      // Powerup crate emblem
      if (dw.style === 'crate_wood') {
        ctx.fillStyle = '#FEF08A';
        ctx.font = '800 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', dw.x + dw.w / 2, dw.y + dw.h / 2);
      }
    } else if (dw.style === 'timber') {
      ctx.fillStyle = '#6B4226';
      ctx.fillRect(dw.x, dw.y, dw.w, dw.h);
      ctx.fillStyle = '#855331';
      for (let x = dw.x + 5; x < dw.x + dw.w - 4; x += 11) {
        ctx.fillRect(x, dw.y + 4, 4, dw.h - 8);
      }
      ctx.strokeStyle = '#1C1008';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(dw.x, dw.y, dw.w, dw.h);
    } else if (dw.style === 'sandstone') {
      ctx.fillStyle = '#B45309';
      ctx.fillRect(dw.x, dw.y, dw.w, dw.h);
      ctx.fillStyle = '#D97706';
      for (let by = dw.y + 8; by < dw.y + dw.h - 8; by += 20) {
        ctx.fillRect(dw.x + 3, by, dw.w - 6, 12);
      }
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(dw.x, dw.y, dw.w, dw.h);
    } else {
      ctx.fillStyle = '#6D3B32';
      ctx.fillRect(dw.x, dw.y, dw.w, dw.h);
      ctx.fillStyle = '#8A4E44';
      for (let by = dw.y + 6; by < dw.y + dw.h - 6; by += 16) {
        ctx.fillRect(dw.x + 4, by, Math.max(6, dw.w - 8), 8);
      }
      ctx.strokeStyle = '#1C1917';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(dw.x, dw.y, dw.w, dw.h);
    }

    if (hpRatio < 0.85) {
      ctx.strokeStyle = dw.style === 'glass' ? '#E0F2FE' : '#0B101B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dw.x + dw.w * 0.2, dw.y + dw.h * 0.18);
      ctx.lineTo(dw.x + dw.w * 0.55, dw.y + dw.h * 0.34);
      ctx.lineTo(dw.x + dw.w * 0.35, dw.y + dw.h * 0.48);
      if (hpRatio < 0.55) {
        ctx.moveTo(dw.x + dw.w * 0.8, dw.y + dw.h * 0.42);
        ctx.lineTo(dw.x + dw.w * 0.42, dw.y + dw.h * 0.62);
        ctx.lineTo(dw.x + dw.w * 0.7, dw.y + dw.h * 0.78);
      }
      ctx.stroke();
    }

    if (hpRatio < 0.99) {
      const barW = Math.max(28, dw.w);
      const bx = dw.x + dw.w / 2 - barW / 2;
      const by = dw.y - 9;
      ctx.fillStyle = 'rgba(11, 16, 27, 0.8)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, 5);
      ctx.fillStyle = hpRatio > 0.5 ? '#F59E0B' : '#EF4444';
      ctx.fillRect(bx, by, barW * hpRatio, 3);
    }

    ctx.restore();
  }

  private drawWeatherEffects(
    ctx: CanvasRenderingContext2D,
    vx: number,
    vy: number,
    vw: number,
    vh: number,
    cam: CameraState,
    map: ArenaMap,
    elapsedSec: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();

    let zone: 'city' | 'jungle' | 'desert' | 'arctic' =
      map.biome === 'hybrid'
        ? cam.x < 1520
          ? 'city'
          : cam.x < 3000
          ? 'jungle'
          : 'desert'
        : map.biome;

    if (zone === 'city') {
      const lightningCycle = elapsedSec % 9.5;
      if (lightningCycle < 0.16) {
        const flashAlpha = lightningCycle < 0.06 ? 0.14 : 0.06;
        ctx.fillStyle = `rgba(186, 230, 253, ${flashAlpha})`;
        ctx.fillRect(vx, vy, vw, vh);
      }

      // Drifting ash & dusk drizzle
      ctx.strokeStyle = 'rgba(148, 197, 255, 0.22)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < 62; i++) {
        const seedX = (i * 173) % (vw + 180);
        const seedY = (i * 251) % (vh + 160);
        const rx =
          vx + (((seedX - elapsedSec * 140) % (vw + 180)) + (vw + 180)) % (vw + 180) - 90;
        const ry = vy + ((seedY + elapsedSec * 580) % (vh + 160)) - 80;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 4, ry + 15);
      }
      ctx.stroke();

      ctx.fillStyle = 'rgba(203, 213, 225, 0.36)';
      for (let i = 0; i < 20; i++) {
        const ax = vx + ((i * 167 + elapsedSec * 28) % (vw + 40)) - 20;
        const ay = vy + ((i * 193 - elapsedSec * 18 + 3000) % vh);
        ctx.fillRect(ax, ay, 2.5, 2.5);
      }
    } else if (zone === 'jungle') {
      const mistGrad = ctx.createLinearGradient(vx, vy + vh * 0.62, vx, vy + vh);
      mistGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
      mistGrad.addColorStop(1, 'rgba(6, 78, 59, 0.22)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(vx, vy + vh * 0.62, vw, vh * 0.38);

      ctx.strokeStyle = 'rgba(167, 243, 208, 0.2)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < 46; i++) {
        const sx = (i * 211) % (vw + 120);
        const sy = (i * 149) % (vh + 120);
        const rx =
          vx + (((sx - elapsedSec * 85) % (vw + 120)) + (vw + 120)) % (vw + 120) - 60;
        const ry = vy + ((sy + elapsedSec * 420) % (vh + 120)) - 60;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 14);
      }
      ctx.stroke();

      for (let i = 0; i < 24; i++) {
        const lx =
          vx +
          (((i * 193 + elapsedSec * (45 + (i % 4) * 14) + Math.sin(elapsedSec * 2 + i) * 32) %
            (vw + 80)) -
            40);
        const ly = vy + ((i * 137 + elapsedSec * (52 + (i % 3) * 16)) % (vh + 60)) - 30;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(elapsedSec * 2.2 + i);
        ctx.fillStyle = i % 3 === 0 ? 'rgba(163, 230, 53, 0.55)' : 'rgba(52, 211, 153, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (zone === 'desert') {
      // Periodic Sandstorm reducing visibility gently on peak waves
      const stormWave = Math.max(0, Math.sin(elapsedSec * 0.38));
      ctx.fillStyle = `rgba(217, 119, 6, ${0.06 + 0.16 * stormWave})`;
      ctx.fillRect(vx, vy, vw, vh);

      ctx.strokeStyle = `rgba(253, 230, 138, ${0.18 + 0.22 * stormWave})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 48; i++) {
        const sx = (i * 181) % (vw + 220);
        const sy = (i * 113) % (vh + 80);
        const rx =
          vx +
          (((sx - elapsedSec * (440 + stormWave * 280)) % (vw + 220)) + (vw + 220)) %
            (vw + 220) -
          110;
        const ry = vy + ((sy + elapsedSec * 90) % (vh + 80)) - 40;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 28 - stormWave * 22, ry + 5);
      }
      ctx.stroke();
    } else {
      // Arctic Blizzard Snowfall
      const gust = 0.5 + 0.5 * Math.sin(elapsedSec * 0.5);
      ctx.fillStyle = `rgba(224, 242, 254, ${0.04 + 0.06 * gust})`;
      ctx.fillRect(vx, vy, vw, vh);

      ctx.fillStyle = 'rgba(240, 249, 255, 0.72)';
      for (let i = 0; i < 54; i++) {
        const sx = (i * 157) % (vw + 160);
        const sy = (i * 223) % (vh + 120);
        const fx =
          vx +
          (((sx - elapsedSec * (120 + gust * 140) + Math.sin(elapsedSec * 2 + i) * 20) %
            (vw + 160)) +
            (vw + 160)) %
            (vw + 160) -
          80;
        const fy = vy + ((sy + elapsedSec * (110 + (i % 4) * 22)) % (vh + 120)) - 60;
        const r = 1.6 + (i % 3) * 0.8;
        ctx.beginPath();
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawGoldenWall(ctx: CanvasRenderingContext2D, wall: TempWallEntity, elapsedSec: number): void {
    ctx.save();
    const alpha = wall.life < 1.2 ? Math.max(0.3, wall.life / 1.2) : 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#EAB308';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

    ctx.strokeStyle = '#854D0E';
    ctx.lineWidth = 2;
    for (let y = wall.y + 14; y < wall.y + wall.h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(wall.x, y);
      ctx.lineTo(wall.x + wall.w, y);
      ctx.stroke();
    }

    const sheen = 0.25 + 0.2 * Math.sin(elapsedSec * 5);
    ctx.fillStyle = `rgba(254, 249, 195, ${sheen})`;
    ctx.fillRect(wall.x + 3, wall.y + 3, 6, wall.h - 6);

    ctx.strokeStyle = '#422006';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    ctx.restore();
  }

  private drawRamps(ctx: CanvasRenderingContext2D, map: ArenaMap): void {
    ctx.save();
    for (const r of map.ramps) {
      const inDesert = map.biome === 'desert' || (map.biome === 'hybrid' && r.x1 >= 3000);
      const inForest =
        map.biome === 'jungle' || (map.biome === 'hybrid' && r.x1 >= 1520 && r.x1 < 3000);
      const inArctic = map.biome === 'arctic';
      ctx.fillStyle = inArctic
        ? '#38BDF8'
        : inDesert
        ? '#92400E'
        : inForest
        ? '#3F6212'
        : '#475569';
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.lineTo(r.x2, Math.max(r.y1, r.y2) + 20);
      ctx.lineTo(r.x1, Math.max(r.y1, r.y2) + 20);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = inArctic
        ? '#BAE6FD'
        : inDesert
        ? '#F59E0B'
        : inForest
        ? '#84CC16'
        : '#94A3B8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPickup(ctx: CanvasRenderingContext2D, pk: PickupEntity, elapsedSec: number): void {
    ctx.save();
    if (!pk.active) {
      const progress = 1 - Math.max(0, pk.respawnTimer) / pk.respawnSec;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 13, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 13, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const bobY = pk.y + Math.sin(elapsedSec * 3.8 + pk.bobPhase) * 4.5;
    const ringColor = pk.type === 'medkit' ? '#10B981' : '#38BDF8';
    const label = pk.type === 'medkit' ? '+HP' : 'FUEL';

    ctx.fillStyle = `${ringColor}28`;
    ctx.beginPath();
    ctx.arc(pk.x, bobY, 21, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(pk.x - 16, bobY - 12, 32, 24, 5);
    ctx.fill();
    ctx.stroke();

    if (pk.type === 'medkit') {
      ctx.fillStyle = '#10B981';
      ctx.fillRect(pk.x - 3, bobY - 7, 6, 14);
      ctx.fillRect(pk.x - 7, bobY - 3, 14, 6);
    } else {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(pk.x - 6, bobY - 7, 12, 14);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(pk.x - 2, bobY - 4, 4, 8);
    }

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = ringColor;
    ctx.fillText(label, pk.x, bobY - 17);
    ctx.restore();
  }

  private drawDualWieldDrop(
    ctx: CanvasRenderingContext2D,
    drop: DualWieldDropEntity,
    elapsedSec: number
  ): void {
    ctx.save();
    const bobY = drop.y + Math.sin(elapsedSec * 4.2 + drop.bobPhase) * 4;
    const color = drop.type === 'dual_smgs' ? '#F43F5E' : '#A855F7';
    const label = drop.type === 'dual_smgs' ? 'DUAL SMGs' : 'DUAL PISTOLS';

    ctx.fillStyle = `${color}2E`;
    ctx.beginPath();
    ctx.arc(drop.x, bobY, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0B101B';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(drop.x - 18, bobY - 11, 36, 22, 5);
    ctx.fill();
    ctx.stroke();

    // Twin weapon silhouettes
    ctx.fillStyle = color;
    ctx.fillRect(drop.x - 12, bobY - 5, 11, 4);
    ctx.fillRect(drop.x + 1, bobY + 1, 11, 4);

    ctx.font = '800 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(label, drop.x, bobY - 16);
    ctx.restore();
  }

  private drawPowerUpDrop(
    ctx: CanvasRenderingContext2D,
    pu: PowerUpDropEntity,
    elapsedSec: number
  ): void {
    if (pu.life < 3 && Math.floor(elapsedSec * 12) % 2 === 0) {
      return;
    }

    ctx.save();
    const bobY = pu.y + Math.sin(elapsedSec * 4.5 + pu.bobPhase) * 4;
    const color =
      pu.type === 'speed' ? '#FACC15' : pu.type === 'fuel_efficiency' ? '#2DD4BF' : '#38BDF8';
    const label =
      pu.type === 'speed' ? 'SPEED' : pu.type === 'fuel_efficiency' ? 'FUEL ECO' : 'SHIELD';

    const pulse = 20 + Math.sin(elapsedSec * 6 + pu.bobPhase) * 3;
    ctx.fillStyle = `${color}30`;
    ctx.beginPath();
    ctx.arc(pu.x, bobY, pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(pu.x, bobY);
    ctx.fillStyle = '#0B101B';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    if (pu.type === 'speed') {
      ctx.beginPath();
      ctx.moveTo(2, -8);
      ctx.lineTo(-4, 1);
      ctx.lineTo(0, 1);
      ctx.lineTo(-2, 8);
      ctx.lineTo(5, -1);
      ctx.lineTo(1, -1);
      ctx.closePath();
      ctx.fill();
    } else if (pu.type === 'fuel_efficiency') {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(6, -1, 4, 5);
      ctx.lineTo(0, 8);
      ctx.lineTo(-4, 5);
      ctx.quadraticCurveTo(-6, -1, 0, -8);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -7.5);
      ctx.lineTo(6.5, -4.5);
      ctx.lineTo(5.5, 2.5);
      ctx.lineTo(0, 7.5);
      ctx.lineTo(-5.5, 2.5);
      ctx.lineTo(-6.5, -4.5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.font = '800 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0B101B';
    ctx.fillText(label, 1, -18);
    ctx.fillStyle = color;
    ctx.fillText(label, 0, -19);
    ctx.restore();
  }

  private drawBarrel(ctx: CanvasRenderingContext2D, b: BarrelEntity): void {
    ctx.save();
    const x = b.x - b.w / 2;
    const y = b.y - b.h;
    ctx.fillStyle = b.hitFlashTimer > 0 ? '#FEF08A' : '#DC2626';
    ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = '#7F1D1D';
    ctx.fillRect(x, y + 6, b.w, 4);
    ctx.fillRect(x, y + b.h - 10, b.w, 4);
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(b.x, y + 14);
    ctx.lineTo(b.x + 7, y + 22);
    ctx.lineTo(b.x, y + 30);
    ctx.lineTo(b.x - 7, y + 22);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0B101B';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, b.w, b.h);
    ctx.restore();
  }

  private drawBarrelRespawnGhost(ctx: CanvasRenderingContext2D, b: BarrelEntity): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x - b.w / 2, b.y - b.h, b.w, b.h);
    ctx.restore();
  }

  private drawAirstrikeBeacon(
    ctx: CanvasRenderingContext2D,
    strike: AirstrikeBeaconEntity,
    elapsedSec: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.45 + 0.35 * Math.sin(elapsedSec * 16);
    ctx.fillStyle = `rgba(239, 68, 68, ${pulse * 0.45})`;
    ctx.fillRect(strike.targetX - 110, strike.targetY - 700, 220, 720);
    ctx.strokeStyle = `rgba(248, 113, 113, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(strike.targetX, strike.targetY - 700);
    ctx.lineTo(strike.targetX, strike.targetY + 12);
    ctx.stroke();

    ctx.font = '800 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FCA5A5';
    ctx.fillText('AIRSTRIKE INCOMING!', strike.targetX, strike.targetY - 56);
    ctx.restore();
  }

  private drawGrenade(
    ctx: CanvasRenderingContext2D,
    gr: GrenadeEntity,
    elapsedSec: number
  ): void {
    ctx.save();
    ctx.translate(gr.x, gr.y);
    ctx.rotate(gr.rot);
    if (gr.type === 'frag') {
      ctx.fillStyle = '#365314';
      ctx.strokeStyle = '#0B101B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (Math.floor(elapsedSec * 14) % 2 === 0) {
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(0, -4, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (gr.type === 'smoke') {
      ctx.fillStyle = '#94A3B8';
      ctx.strokeStyle = '#0B101B';
      ctx.lineWidth = 2;
      ctx.fillRect(-4.5, -7, 9, 14);
      ctx.strokeRect(-4.5, -7, 9, 14);
    } else {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, 12 + Math.sin(elapsedSec * 18) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0EA5E9';
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSmokeCloud(
    ctx: CanvasRenderingContext2D,
    cloud: SmokeCloudEntity,
    elapsedSec: number
  ): void {
    ctx.save();
    const fade = Math.min(1, cloud.life / 1.5) * Math.min(1, (cloud.maxLife - cloud.life) * 4 + 0.35);
    ctx.globalAlpha = Math.max(0.05, fade * 0.85);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + elapsedSec * 0.25;
      const px = cloud.x + Math.cos(ang) * (cloud.radius * 0.36);
      const py = cloud.y + Math.sin(ang) * (cloud.radius * 0.28);
      const grad = ctx.createRadialGradient(px, py, 8, px, py, cloud.radius * 0.65);
      grad.addColorStop(0, '#CBD5E1');
      grad.addColorStop(0.65, 'rgba(148, 163, 184, 0.72)');
      grad.addColorStop(1, 'rgba(100, 116, 139, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, cloud.radius * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawUavMarker(
    ctx: CanvasRenderingContext2D,
    f: FighterEntity,
    elapsedSec: number
  ): void {
    ctx.save();
    const pulse = 0.65 + 0.35 * Math.sin(elapsedSec * 10);
    ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(f.x - 19, f.y - 34, 38, 64);
    ctx.fillStyle = '#EF4444';
    ctx.font = '800 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UAV TARGET', f.x, f.y - 40);
    ctx.restore();
  }

  private drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    timer: number
  ): void {
    ctx.save();
    ctx.globalAlpha = Math.min(1, timer * 2.5);
    ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
    const padX = 10;
    const textW = ctx.measureText(text).width;
    const bw = Math.max(54, textW + padX * 2);
    const bh = 24;
    const bx = x - bw / 2;
    const by = y - bh;

    ctx.fillStyle = '#FFFBEB';
    ctx.strokeStyle = '#0B101B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    // Tail triangle
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + bh / 2);
    ctx.restore();
  }

  private getWeaponBodyColor(
    baseColor: string,
    mastery: WeaponMasteryTier
  ): { fill: string; trim?: string } {
    if (mastery === 'camo') return { fill: '#4D7C0F', trim: '#365314' };
    if (mastery === 'gold') return { fill: '#FACC15', trim: '#A16207' };
    if (mastery === 'diamond') return { fill: '#67E8F9', trim: '#FFFFFF' };
    return { fill: baseColor };
  }

  private drawFighter(
    ctx: CanvasRenderingContext2D,
    f: FighterEntity,
    elapsedSec: number,
    isTeamMode = false
  ): void {
    const charDef = CHARACTERS.find((c) => c.id === f.characterId) || CHARACTERS[0];
    const outfit = OUTFIT_COSMETICS.find((o) => o.id === f.outfitId) || OUTFIT_COSMETICS[0];
    const flame = FLAME_COSMETICS.find((fl) => fl.id === f.flameId) || FLAME_COSMETICS[0];
    const weapon = WEAPONS[f.weaponId];

    const customOutfit = f.outfitId !== 'charcoal';
    const suitColor = customOutfit ? outfit.primaryColor : charDef.defaultSuitColor;
    const tieColor = customOutfit ? outfit.secondaryColor : charDef.tieColor;

    const cx = f.x;
    const footY = f.y + f.h / 2;
    const bodyCenterY = f.y + 4;

    ctx.save();
    if (f.spawnInvulnTimer > 0 && Math.floor(elapsedSec * 16) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    if (isTeamMode && f.team) {
      const teamRing = f.team === 'alpha' ? 'rgba(244, 63, 94, 0.78)' : 'rgba(56, 189, 248, 0.78)';
      ctx.strokeStyle = teamRing;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(cx, footY - 1, 17, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (f.carryingFlagTeam) {
      const carriedColor = f.carryingFlagTeam === 'alpha' ? '#F43F5E' : '#38BDF8';
      const wave = Math.sin(elapsedSec * 8) * 3;
      ctx.save();
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - f.facing * 14, bodyCenterY - 8);
      ctx.lineTo(cx - f.facing * 14, bodyCenterY - 52);
      ctx.stroke();
      ctx.fillStyle = carriedColor;
      ctx.strokeStyle = '#0B101B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - f.facing * 14, bodyCenterY - 51);
      ctx.lineTo(cx - f.facing * 36, bodyCenterY - 46 + wave);
      ctx.lineTo(cx - f.facing * 32, bodyCenterY - 32 + wave);
      ctx.lineTo(cx - f.facing * 14, bodyCenterY - 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (f.ultActiveTimer > 0) {
      if (f.characterId === 'yogi_boy') {
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.88)';
        ctx.fillStyle = 'rgba(249, 115, 22, 0.16)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, f.y - 4, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (f.characterId === 'revolutionary') {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(cx - f.vx * 0.04, f.y - 2, 26, 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.characterId === 'iron_bear') {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, f.y - 4, 30 + Math.sin(elapsedSec * 14) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (f.speedBuffTimer > 0) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.78)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(cx, f.y - 2, 27, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (f.fuelBuffTimer > 0 || f.rapidJetTimer > 0) {
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx - f.facing * 12, bodyCenterY - 4, 15 + Math.sin(elapsedSec * 10) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (f.shieldHp > 0 && f.shieldBuffTimer > 0) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.88)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, f.y - 4, 33 + Math.sin(elapsedSec * 8) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const jetX = cx - f.facing * 12;
    const jetY = bodyCenterY - 4;
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#0B101B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(jetX - 5, jetY - 10, 10, 20, 3);
    ctx.fill();
    ctx.stroke();

    if (f.jetpacking) {
      const flameLen = 14 + Math.random() * 12;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = flame.primaryColor;
      ctx.beginPath();
      ctx.moveTo(jetX - 4.5, jetY + 10);
      ctx.lineTo(jetX + 4.5, jetY + 10);
      ctx.lineTo(jetX, jetY + 10 + flameLen);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = flame.secondaryColor;
      ctx.beginPath();
      ctx.moveTo(jetX - 2, jetY + 10);
      ctx.lineTo(jetX + 2, jetY + 10);
      ctx.lineTo(jetX, jetY + 10 + flameLen * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const legSwing = f.grounded ? Math.sin(f.walkCycle) * 7 : 4;
    ctx.strokeStyle =
      f.characterId === 'revolutionary'
        ? '#1D4ED8'
        : f.characterId === 'yogi_boy'
        ? '#C2410C'
        : f.characterId === 'thongi_baba'
        ? '#3B3B8F'
        : '#0B101B';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 4, footY - 13);
    ctx.lineTo(cx - 4 + legSwing, footY - 1);
    ctx.moveTo(cx + 4, footY - 13);
    ctx.lineTo(cx + 4 - legSwing, footY - 1);
    ctx.stroke();

    ctx.fillStyle = f.hitFlashTimer > 0 ? '#FFFFFF' : suitColor;
    ctx.strokeStyle = '#0B101B';
    ctx.lineWidth = 2.2;
    if (f.characterId === 'mitron') {
      ctx.fillStyle = f.hitFlashTimer > 0 ? '#FFFFFF' : '#FEF3C7';
      ctx.beginPath();
      ctx.roundRect(cx - 10, bodyCenterY - 12, 20, 23, 5);
      ctx.fill();
      ctx.stroke();
      if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = suitColor;
        ctx.fillRect(cx - 10, bodyCenterY - 12, 7, 21);
        ctx.fillRect(cx + 3, bodyCenterY - 12, 7, 21);
      }
    } else if (f.characterId === 'tariff_boss' || f.characterId === 'dashing_trudeau') {
      ctx.beginPath();
      ctx.roundRect(cx - 10, bodyCenterY - 12, 20, 22, 5);
      ctx.fill();
      ctx.stroke();
      if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.moveTo(cx - 4, bodyCenterY - 12);
        ctx.lineTo(cx + 4, bodyCenterY - 12);
        ctx.lineTo(cx + f.facing * 2, bodyCenterY - 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = tieColor;
        const tieLen = f.characterId === 'tariff_boss' ? 15 : 6;
        ctx.beginPath();
        ctx.moveTo(cx + f.facing * 2 - 2.5, bodyCenterY - 11);
        ctx.lineTo(cx + f.facing * 2 + 2.5, bodyCenterY - 11);
        ctx.lineTo(cx + f.facing * 3, bodyCenterY + tieLen);
        ctx.lineTo(cx + f.facing * 2 - 2, bodyCenterY + tieLen - 2);
        ctx.closePath();
        ctx.fill();
      }
    } else if (f.characterId === 'revolutionary') {
      ctx.fillStyle = f.hitFlashTimer > 0 ? '#FFFFFF' : customOutfit ? suitColor : '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(cx - 10, bodyCenterY - 12, 20, 22, 5);
      ctx.fill();
      ctx.stroke();
    } else if (f.characterId === 'yogi_boy') {
      ctx.beginPath();
      ctx.roundRect(cx - 11, bodyCenterY - 12, 22, 24, 5);
      ctx.fill();
      ctx.stroke();
      if (f.hitFlashTimer <= 0) {
        ctx.strokeStyle = '#FDBA74';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 8, bodyCenterY - 10);
        ctx.lineTo(cx + 8, bodyCenterY + 8);
        ctx.stroke();
      }
    } else if (f.characterId === 'red_dragon') {
      ctx.beginPath();
      ctx.roundRect(cx - 10, bodyCenterY - 12, 20, 22, 5);
      ctx.fill();
      ctx.stroke();
      if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(cx + f.facing * 5, bodyCenterY - 5, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (f.characterId === 'thongi_baba') {
      // Blocky Minecraft Steve cyan shirt
      ctx.fillRect(cx - 11, bodyCenterY - 12, 22, 22);
      ctx.strokeRect(cx - 11, bodyCenterY - 12, 22, 22);
      if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = charDef.skinTone;
        ctx.fillRect(cx - 4, bodyCenterY - 12, 8, 4);
      }
    } else {
      ctx.beginPath();
      ctx.roundRect(cx - 10, bodyCenterY - 12, 20, 22, 5);
      ctx.fill();
      ctx.stroke();
      if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = tieColor;
        ctx.fillRect(cx - 7, bodyCenterY - 8, 6, 5);
        ctx.fillRect(cx + 1, bodyCenterY - 2, 7, 5);
      }
    }

    const headY = bodyCenterY - 23;
    const headR = 14.5;
    ctx.fillStyle = f.hitFlashTimer > 0 ? '#FFFFFF' : charDef.skinTone;
    ctx.strokeStyle = '#0B101B';
    ctx.lineWidth = 2.4;
    if (f.characterId === 'thongi_baba') {
      // Square Minecraft Steve Head with sharp chiseled Sigma jawline
      ctx.beginPath();
      ctx.moveTo(cx - 14, headY - 14);
      ctx.lineTo(cx + 14, headY - 14);
      ctx.lineTo(cx + 14, headY + 7);
      ctx.lineTo(cx + 9 * f.facing + (f.facing > 0 ? 1 : -1), headY + 15);
      ctx.lineTo(cx - 9, headY + 15);
      ctx.lineTo(cx - 14, headY + 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (f.hitFlashTimer <= 0) {
        // Sigma jawline & cheekbone shadow
        ctx.strokeStyle = '#6B3D1C';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx + f.facing * 2, headY + 5);
        ctx.lineTo(cx + f.facing * 9, headY + 12);
        ctx.stroke();
        // Pixel Steve goatee
        ctx.fillStyle = '#4A2E1B';
        ctx.fillRect(cx + f.facing * 3 - 4, headY + 8, 9, 5);
      }
    } else {
      ctx.beginPath();
      ctx.arc(cx, headY, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (f.hitFlashTimer <= 0) {
      const eyeBaseX = cx + f.facing * 4.5;

      if (f.characterId === 'mitron') {
        ctx.fillStyle = '#F8FAFC';
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx + f.facing * 1.5, headY + 3, 12.5, 0.15, Math.PI - 0.15);
        ctx.fill();
        ctx.stroke();
      }

      if (f.characterId === 'revolutionary') {
        ctx.fillStyle = 'rgba(51, 65, 85, 0.55)';
        ctx.fillRect(cx + f.facing * 2 - 4, headY + 7, 2, 2);
        ctx.fillRect(cx + f.facing * 2, headY + 9, 2, 2);
        ctx.fillRect(cx + f.facing * 2 + 4, headY + 7, 2, 2);
      }

      if (f.characterId === 'iron_bear') {
        ctx.fillStyle = '#09090B';
        ctx.fillRect(eyeBaseX - 6, headY - 4, 13, 5);
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(eyeBaseX - 4, headY - 3, 3, 1.5);
      } else if (f.characterId === 'thongi_baba') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(eyeBaseX - 6, headY - 4, 5.5, 3);
        ctx.fillRect(eyeBaseX + 1.5, headY - 4, 5.5, 3);
        ctx.fillStyle = '#4338CA';
        ctx.fillRect(eyeBaseX - 3.5 + f.facing * 0.8, headY - 4, 2.8, 3);
        ctx.fillRect(eyeBaseX + 3.5 + f.facing * 0.8, headY - 4, 2.8, 3);
        ctx.strokeStyle = '#2D1B0F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(eyeBaseX - 6.5, headY - 6);
        ctx.lineTo(eyeBaseX - 0.5, headY - 5);
        ctx.moveTo(eyeBaseX + 7.5, headY - 6);
        ctx.lineTo(eyeBaseX + 1.5, headY - 5);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(eyeBaseX - 3, headY - 2, 3.1, 0, Math.PI * 2);
        ctx.arc(eyeBaseX + 4, headY - 2, 3.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(eyeBaseX - 2.3 + f.facing * 0.8, headY - 2, 1.5, 0, Math.PI * 2);
        ctx.arc(eyeBaseX + 4.7 + f.facing * 0.8, headY - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        if (f.characterId === 'mitron') {
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 1.3;
          ctx.strokeRect(eyeBaseX - 6, headY - 5, 6, 5.5);
          ctx.strokeRect(eyeBaseX + 1, headY - 5, 6, 5.5);
        }
      }

      if (f.characterId === 'dashing_trudeau') {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#7C2D12';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx + f.facing * 3.5, headY + 4.5, 4.5, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (f.characterId !== 'mitron') {
        ctx.strokeStyle = '#7C2D12';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx + f.facing * 1, headY + 6);
        ctx.lineTo(cx + f.facing * 7, headY + 5.5);
        ctx.stroke();
      }

      ctx.fillStyle = charDef.hairColor;
      ctx.strokeStyle = '#0B101B';
      ctx.lineWidth = 1.8;
      if (charDef.hairStyle === 'swept_white') {
        ctx.beginPath();
        ctx.moveTo(cx - 12, headY - 7);
        ctx.quadraticCurveTo(cx, headY - 19, cx + f.facing * 13, headY - 8);
        ctx.quadraticCurveTo(cx, headY - 11, cx - 12, headY - 7);
        ctx.fill();
        ctx.stroke();
      } else if (charDef.hairStyle === 'swept_blonde') {
        ctx.beginPath();
        ctx.moveTo(cx - 13, headY - 6);
        ctx.quadraticCurveTo(cx + f.facing * 15, headY - 25, cx + f.facing * 16, headY - 8);
        ctx.quadraticCurveTo(cx, headY - 12, cx - 13, headY - 6);
        ctx.fill();
        ctx.stroke();
      } else if (charDef.hairStyle === 'short_stubble') {
        ctx.beginPath();
        ctx.arc(cx, headY - 4, 13.5, Math.PI * 0.95, Math.PI * 2.05);
        ctx.fill();
        ctx.stroke();
      } else if (charDef.hairStyle === 'shaved_tilak') {
        ctx.fillStyle = '#F97316';
        ctx.fillRect(cx + f.facing * 4 - 1.5, headY - 11, 3, 6.5);
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(cx + f.facing * 4, headY - 9, 1.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (charDef.hairStyle === 'mao_part') {
        ctx.beginPath();
        ctx.arc(cx, headY - 4, 13.5, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();
        ctx.stroke();
      } else if (charDef.hairStyle === 'receding_blonde') {
        ctx.beginPath();
        ctx.ellipse(cx - f.facing * 2, headY - 12, 11, 4, -0.1 * f.facing, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (charDef.hairStyle === 'wavy_curls') {
        ctx.beginPath();
        ctx.arc(cx - 5, headY - 12, 7.5, 0, Math.PI * 2);
        ctx.arc(cx + 4, headY - 13, 7.5, 0, Math.PI * 2);
        ctx.arc(cx + f.facing * 8, headY - 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (charDef.hairStyle === 'steve_sigma') {
        // Blocky Minecraft Steve top & side hair
        ctx.fillRect(cx - 14.5, headY - 15, 29, 6.5);
        ctx.strokeRect(cx - 14.5, headY - 15, 29, 6.5);
        ctx.fillRect(cx - f.facing * 14.5 - (f.facing > 0 ? 0 : 6), headY - 9, 6, 6);
      }
    }

    // Melee Swing / Held Melee Slot / Rotating Firearm
    const meleeId = f.meleeWeaponId || 'knife';
    const mDef = MELEE_WEAPONS[meleeId] || MELEE_WEAPONS.knife;

    if (f.meleeSwingTimer > 0) {
      ctx.save();
      ctx.translate(cx, bodyCenterY - 4);
      ctx.rotate(f.aimAngle);
      const dur = Math.max(0.1, mDef.swingDurationSec);
      const swingProg = Math.max(0, Math.min(1, 1 - f.meleeSwingTimer / dur));
      const arcRadius = meleeId === 'katana' ? 48 : meleeId === 'boxing_glove' ? 36 : 38;
      ctx.strokeStyle = mDef.accentColor;
      ctx.lineWidth = meleeId === 'katana' ? 5 : 4;
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, -0.95 + swingProg * 0.45, 0.95);
      ctx.stroke();

      ctx.rotate(-0.75 + swingProg * 1.5);
      this.drawMeleeWeaponSprite(ctx, meleeId, 16, 0);
      ctx.restore();
    } else if (f.activeSlot === 'melee' && !f.dualWield) {
      ctx.save();
      ctx.translate(cx, bodyCenterY - 4);
      ctx.rotate(f.aimAngle);
      this.drawMeleeWeaponSprite(ctx, meleeId, 14, 0);
      ctx.restore();
    } else {
      // Rotating Weapon (Dual-Wield OR Mastery Skinned Primary/Secondary)
      ctx.save();
      ctx.translate(cx, bodyCenterY - 4);
      ctx.rotate(f.aimAngle);
      const kick = f.recoilKick;

      ctx.strokeStyle = '#0B101B';
      ctx.lineWidth = 1.8;
      if (f.dualWield) {
        const dwLen = f.dualWield === 'dual_smgs' ? 22 : 16;
        ctx.fillStyle = f.dualWield === 'dual_smgs' ? '#F43F5E' : '#A855F7';
        ctx.fillRect(6 - kick, -7, dwLen, 5);
        ctx.strokeRect(6 - kick, -7, dwLen, 5);
        ctx.fillRect(4 - kick * 0.7, 3, dwLen, 5);
        ctx.strokeRect(4 - kick * 0.7, 3, dwLen, 5);
      } else if (f.weaponId === 'bomberier') {
        const skin = this.getWeaponBodyColor('#3F6212', f.weaponMastery);
        ctx.fillStyle = skin.fill;
        ctx.fillRect(-8 - kick, -5, weapon.length, 10);
        ctx.strokeRect(-8 - kick, -5, weapon.length, 10);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(weapon.length - 10 - kick, -6, 7, 12);
      } else if (f.weaponId === 'ghost_pistol') {
        const skin = this.getWeaponBodyColor('#1E293B', f.weaponMastery);
        // Compact grip & slide + dark cylindrical suppressor
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(6 - kick, -1, 5, 7);
        ctx.strokeRect(6 - kick, -1, 5, 7);
        ctx.fillStyle = skin.fill;
        ctx.fillRect(6 - kick, -4, 13, 4.5);
        ctx.strokeRect(6 - kick, -4, 13, 4.5);
        ctx.fillStyle = '#334155';
        ctx.fillRect(19 - kick, -3.5, 11, 3.8);
        ctx.strokeRect(19 - kick, -3.5, 11, 3.8);
        ctx.fillStyle = '#22D3EE';
        ctx.fillRect(17 - kick, 0.2, 3, 1.8);
      } else if (f.weaponId === 'revolver') {
        const skin = this.getWeaponBodyColor('#94A3B8', f.weaponMastery);
        ctx.fillStyle = '#78350F';
        ctx.fillRect(6 - kick, 0, 5, 7);
        ctx.strokeRect(6 - kick, 0, 5, 7);
        // Cylinder drum
        ctx.fillStyle = skin.trim || '#CBD5E1';
        ctx.fillRect(9 - kick, -4.5, 7, 5.5);
        ctx.strokeRect(9 - kick, -4.5, 7, 5.5);
        // Heavy barrel
        ctx.fillStyle = skin.fill;
        ctx.fillRect(16 - kick, -4, 10, 4);
        ctx.strokeRect(16 - kick, -4, 10, 4);
      } else if (f.weaponId === 'pistol') {
        const skin = this.getWeaponBodyColor('#475569', f.weaponMastery);
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(7 - kick, -1, 5, 7);
        ctx.strokeRect(7 - kick, -1, 5, 7);
        ctx.fillStyle = skin.fill;
        ctx.fillRect(7 - kick, -4, 14, 4.5);
        ctx.strokeRect(7 - kick, -4, 14, 4.5);
      } else if (f.weaponId === 'uzi') {
        const skin = this.getWeaponBodyColor('#334155', f.weaponMastery);
        ctx.fillStyle = skin.fill;
        ctx.fillRect(5 - kick, -4, 16, 6);
        ctx.strokeRect(5 - kick, -4, 16, 6);
        // Extended stick magazine
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(10 - kick, 2, 4, 9);
        ctx.strokeRect(10 - kick, 2, 4, 9);
        ctx.fillRect(21 - kick, -2.5, 5, 2.5);
      } else if (f.weaponId === 'mp7') {
        const skin = this.getWeaponBodyColor('#1E293B', f.weaponMastery);
        ctx.fillStyle = skin.fill;
        ctx.fillRect(4 - kick, -4, weapon.length - 4, 6);
        ctx.strokeRect(4 - kick, -4, weapon.length - 4, 6);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(10 - kick, 2, 4, 8);
        ctx.fillRect(20 - kick, 2, 3.5, 5);
        ctx.fillStyle = skin.trim || '#F59E0B';
        ctx.fillRect(9 - kick, -6, 9, 2);
      } else if (f.weaponId === 'shorty') {
        const skin = this.getWeaponBodyColor('#92400E', f.weaponMastery);
        ctx.fillStyle = '#78350F';
        ctx.fillRect(5 - kick, -1, 6, 6);
        ctx.strokeRect(5 - kick, -1, 6, 6);
        ctx.fillStyle = skin.fill;
        ctx.fillRect(7 - kick, -4, weapon.length, 5.5);
        ctx.strokeRect(7 - kick, -4, weapon.length, 5.5);
      } else if (weapon.category === 'Sniper') {
        const skin = this.getWeaponBodyColor(
          f.weaponId === 'awq' ? '#4C1D95' : '#334155',
          f.weaponMastery
        );
        ctx.fillStyle = skin.fill;
        ctx.fillRect(2 - kick, -3, weapon.length, 5);
        ctx.strokeRect(2 - kick, -3, weapon.length, 5);
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(10 - kick, -7, 11, 3.5);
      } else if (weapon.category === 'Shotgun') {
        const skin = this.getWeaponBodyColor(
          f.weaponId === 'spas12' ? '#1E293B' : '#7C2D12',
          f.weaponMastery
        );
        ctx.fillStyle = skin.fill;
        ctx.fillRect(2 - kick, -3, weapon.length, 7);
        ctx.strokeRect(2 - kick, -3, weapon.length, 7);
        ctx.fillStyle = skin.trim || '#94A3B8';
        ctx.fillRect(8 - kick, -4, weapon.length - 6, 3);
      } else {
        const baseC =
          f.ultActiveTimer > 0 && f.characterId === 'iron_bear'
            ? '#DC2626'
            : f.weaponId === 'm4a1'
            ? '#334155'
            : '#78350F';
        const skin = this.getWeaponBodyColor(baseC, f.weaponMastery);
        ctx.fillStyle = skin.fill;
        ctx.fillRect(4 - kick, -3, weapon.length, 6);
        ctx.strokeRect(4 - kick, -3, weapon.length, 6);
        if (skin.trim) {
          ctx.fillStyle = skin.trim;
          ctx.fillRect(10 - kick, -2, 10, 4);
        }
      }

      if (f.muzzleFlashTimer > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle =
          f.ultActiveTimer > 0 && f.characterId === 'iron_bear'
            ? '#EF4444'
            : f.weaponId === 'ghost_pistol'
            ? '#67E8F9'
            : '#FEF08A';
        const tipX = (f.dualWield ? 26 : weapon.length + 7) - kick;
        const flashR = f.weaponId === 'ghost_pistol' ? 4 + Math.random() * 2 : 8 + Math.random() * 5;
        ctx.beginPath();
        ctx.arc(tipX, 0, flashR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    const tagY = headY - 30;
    const barW = 46;
    const barH = 5.5;
    const hpRatio = Math.max(0, Math.min(1, f.hp / f.maxHp));

    ctx.fillStyle = 'rgba(11, 16, 27, 0.85)';
    ctx.fillRect(cx - barW / 2 - 1, tagY - 1, barW + 2, barH + 2);
    ctx.fillStyle = hpRatio > 0.5 ? '#10B981' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
    ctx.fillRect(cx - barW / 2, tagY, barW * hpRatio, barH);

    if (f.shieldHp > 0 && f.shieldBuffTimer > 0) {
      const shRatio = Math.max(0, Math.min(1, f.shieldHp / 60));
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(cx - barW / 2, tagY - 4, barW * shRatio, 2.5);
    }

    if (f.isReloading) {
      const rProg = 1 - Math.max(0, f.reloadTimerMs) / weapon.reloadMs;
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(cx - barW / 2, tagY + barH + 2, barW * rProg, 2.5);
    }

    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const labelText = `${'★'.repeat(Math.min(3, f.rank.stars))} ${f.name}`;
    ctx.fillStyle = '#0B101B';
    ctx.fillText(labelText, cx + 1, tagY - 5);
    ctx.fillStyle = isTeamMode
      ? f.team === 'bravo'
        ? '#7DD3FC'
        : f.isHuman
        ? '#FCD34D'
        : '#FDA4AF'
      : f.isHuman
      ? f.playerIndex === 2
        ? '#38BDF8'
        : '#FCD34D'
      : '#E2E8F0';
    ctx.fillText(labelText, cx, tagY - 6);

    ctx.restore();
  }

  private drawMeleeWeaponSprite(
    ctx: CanvasRenderingContext2D,
    meleeId: MeleeWeaponId,
    xOff: number,
    yOff: number
  ): void {
    ctx.save();
    ctx.translate(xOff, yOff);
    ctx.strokeStyle = '#0B101B';
    ctx.lineWidth = 1.6;

    if (meleeId === 'katana') {
      // Wrapped tsuka handle + gold tsuba + long curved steel blade
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-6, -2, 10, 4);
      ctx.strokeRect(-6, -2, 10, 4);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(3, -5, 2.5, 10);
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.moveTo(5.5, -2.2);
      ctx.quadraticCurveTo(22, -4.5, 36, -1.5);
      ctx.lineTo(32, 2);
      ctx.quadraticCurveTo(18, 0.2, 5.5, 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (meleeId === 'karambit') {
      // Finger ring + curved crimson-tipped claw blade
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(-2, 0, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(1, -2.5);
      ctx.quadraticCurveTo(13, -7, 19, 3);
      ctx.quadraticCurveTo(11, -1, 1, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (meleeId === 'boxing_glove') {
      // Heavy padded crimson boxing glove with gold wrist cuff
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-3, -4, 6, 8);
      ctx.strokeRect(-3, -4, 6, 8);
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.ellipse(9, 0, 8.5, 6.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(10, -2.5, 4, 2, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Tactical Knife: dark grip + silver clip-point blade
      ctx.fillStyle = '#334155';
      ctx.fillRect(-4, -2, 7, 4);
      ctx.strokeRect(-4, -2, 7, 4);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(2.5, -4, 2, 8);
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(4.5, -2.5);
      ctx.lineTo(18, -2);
      ctx.lineTo(22, 0.5);
      ctx.lineTo(4.5, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSniperLaser(ctx: CanvasRenderingContext2D, f: FighterEntity): void {
    if (f.activeSlot === 'melee' || f.dualWield) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle =
      f.weaponId === 'awq' ? 'rgba(168, 85, 247, 0.42)' : 'rgba(56, 189, 248, 0.34)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(f.aimAngle) * 38, f.y - 2 + Math.sin(f.aimAngle) * 38);
    ctx.lineTo(f.x + Math.cos(f.aimAngle) * 620, f.y - 2 + Math.sin(f.aimAngle) * 620);
    ctx.stroke();
    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: ProjectileEntity): void {
    ctx.save();
    if (p.isHoming) {
      const ang = Math.atan2(p.vy, p.vx);
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(-7, -3, 12, 6);
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(5, -4);
      ctx.lineTo(11, 0);
      ctx.lineTo(5, 4);
      ctx.closePath();
      ctx.fill();
    } else if (p.isRocket) {
      const ang = Math.atan2(p.vy, p.vx);
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(-9, -3.5, 16, 7);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(7, -4.5);
      ctx.lineTo(13, 0);
      ctx.lineTo(7, 4.5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = p.color;
      ctx.lineWidth =
        p.weaponId === 'awq' || p.weaponId === 'dlp44' || p.weaponId === 'anu34' ? 3 : 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.prevX, p.prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticle(ctx: CanvasRenderingContext2D, pt: Particle): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha * (pt.life / pt.maxLife)));
    if (pt.kind === 'flame' || pt.kind === 'ring') {
      ctx.globalCompositeOperation = 'lighter';
    }
    if (pt.kind === 'ring') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 4;
      const expand = 1 + (1 - pt.life / pt.maxLife) * 2.2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * expand, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pt.kind === 'casing') {
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot);
      ctx.fillStyle = pt.color;
      ctx.fillRect(-2.5, -1, 5, 2);
    } else if (pt.kind === 'glass') {
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(0, -pt.size * 0.6);
      ctx.lineTo(pt.size * 0.5, pt.size * 0.4);
      ctx.lineTo(-pt.size * 0.5, pt.size * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (pt.kind === 'debris') {
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot);
      ctx.fillStyle = pt.color;
      ctx.fillRect(-pt.size / 2, -pt.size * 0.36, pt.size, pt.size * 0.72);
      ctx.strokeStyle = '#0B101B';
      ctx.lineWidth = 1;
      ctx.strokeRect(-pt.size / 2, -pt.size * 0.36, pt.size, pt.size * 0.72);
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(1, pt.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawCrosshair(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isReloading?: boolean,
    reloadProgress?: number
  ): void {
    ctx.save();
    ctx.strokeStyle = isReloading ? '#38BDF8' : '#F59E0B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 15, y);
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x, y + 15);
    ctx.stroke();

    // Reload progress arc right around the crosshair
    if (isReloading && reloadProgress !== undefined) {
      const clamped = Math.max(0, Math.min(1, reloadProgress));
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + clamped * Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
