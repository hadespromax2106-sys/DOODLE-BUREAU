import type * as ThreeTypes from 'three';
import {
  CHARACTERS,
  FLAME_COSMETICS,
  OUTFIT_COSMETICS,
  WEAPONS,
} from '../data/catalog';
import { ThreeModule } from './threeCdn';
import {
  CharacterId,
  FlameColorId,
  GunWrapId,
  OutfitId,
  WeaponId,
  WeaponMasteryTier,
} from '../types/game';

export interface RigRefs {
  root: ThreeTypes.Group;
  bodyPivot: ThreeTypes.Group;
  headGroup: ThreeTypes.Group;
  weaponGroup: ThreeTypes.Group;
  minigunBarrelSpin?: ThreeTypes.Object3D;
  rightArmGroup: ThreeTypes.Group;
  leftArmGroup: ThreeTypes.Group;
  flameLeft: ThreeTypes.Mesh;
  flameRight: ThreeTypes.Mesh;
  floatProps: Array<{
    obj: ThreeTypes.Object3D;
    baseY: number;
    speed: number;
    amp: number;
    phase: number;
  }>;
}

function makeCamoTexture(THREE: ThreeModule): ThreeTypes.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#365314';
  ctx.fillRect(0, 0, 128, 128);
  const swatches = ['#4D7C0F', '#1A2E05', '#65A30D', '#3F3F46', '#713F12'];
  for (let i = 0; i < 42; i++) {
    ctx.fillStyle = swatches[i % swatches.length];
    const x = (i * 37) % 120;
    const y = (i * 53) % 120;
    const w = 14 + (i % 4) * 8;
    const h = 10 + (i % 3) * 7;
    ctx.fillRect(x, y, w, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function makeEmberGlowTexture(THREE: ThreeModule): ThreeTypes.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,220,160,0.75)');
  grad.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGunWrapTexture(
  THREE: ThreeModule,
  wrapId: GunWrapId
): ThreeTypes.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  if (wrapId === 'carbon_fiber') {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 8) {
      for (let x = 0; x < 128; x += 8) {
        ctx.fillStyle = ((x + y) / 8) % 2 === 0 ? '#27272A' : '#3F3F46';
        ctx.fillRect(x, y, 6, 4);
      }
    }
  } else if (wrapId === 'lava_magma') {
    ctx.fillStyle = '#290808';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 4;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 23) % 128, 0);
      ctx.lineTo((i * 41 + 30) % 128, 64);
      ctx.lineTo((i * 19 + 70) % 128, 128);
      ctx.stroke();
    }
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 31) % 128, 0);
      ctx.lineTo((i * 17 + 45) % 128, 128);
      ctx.stroke();
    }
  } else if (wrapId === 'electric_ice') {
    const grad = ctx.createLinearGradient(0, 0, 128, 128);
    grad.addColorStop(0, '#0C4A6E');
    grad.addColorStop(0.5, '#0284C7');
    grad.addColorStop(1, '#38BDF8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * 17) % 128);
      ctx.lineTo(48, (i * 29 + 20) % 128);
      ctx.lineTo(92, (i * 13 + 50) % 128);
      ctx.lineTo(128, (i * 37) % 128);
      ctx.stroke();
    }
  } else if (wrapId === 'comic_halftone') {
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#EC4899';
    for (let y = 6; y < 128; y += 12) {
      for (let x = 6; x < 128; x += 12) {
        ctx.beginPath();
        ctx.arc(x + ((y / 12) % 2) * 5, y, 3.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (wrapId === 'galaxy_void') {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 72);
    grad.addColorStop(0, '#7E22CE');
    grad.addColorStop(0.55, '#3B0764');
    grad.addColorStop(1, '#09090B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#E879F9' : '#F8FAFC';
      ctx.fillRect((i * 37) % 124, (i * 53) % 124, i % 4 === 0 ? 2.5 : 1.5, i % 4 === 0 ? 2.5 : 1.5);
    }
  } else if (wrapId === 'golden_kettle') {
    const grad = ctx.createLinearGradient(0, 0, 128, 128);
    grad.addColorStop(0, '#B45309');
    grad.addColorStop(0.45, '#F59E0B');
    grad.addColorStop(0.75, '#FDE68A');
    grad.addColorStop(1, '#D97706');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    // Hammered kettle dimples & warm steam swirls
    for (let y = 8; y < 128; y += 16) {
      for (let x = 8; x < 128; x += 16) {
        ctx.fillStyle = ((x + y) / 16) % 2 === 0 ? 'rgba(255,251,235,0.28)' : 'rgba(120,53,15,0.28)';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 18 + i * 24);
      ctx.bezierCurveTo(42, 6 + i * 24, 86, 30 + i * 24, 128, 18 + i * 24);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function buildWeaponMaterial(
  THREE: ThreeModule,
  mastery: WeaponMasteryTier,
  gunWrap: GunWrapId,
  baseHex: number
): ThreeTypes.Material {
  if (gunWrap && gunWrap !== 'none') {
    if (gunWrap === 'royal_gold') {
      return new THREE.MeshPhysicalMaterial({
        color: 0xfbbf24,
        emissive: 0x92400e,
        emissiveIntensity: 0.16,
        metalness: 0.96,
        roughness: 0.14,
        clearcoat: 0.85,
        clearcoatRoughness: 0.08,
      });
    }
    if (gunWrap === 'golden_kettle') {
      const kettleTex = makeGunWrapTexture(THREE, 'golden_kettle');
      return new THREE.MeshPhysicalMaterial({
        map: kettleTex,
        color: 0xfde68a,
        emissive: 0xb45309,
        emissiveIntensity: 0.28,
        metalness: 0.92,
        roughness: 0.18,
        clearcoat: 0.85,
        clearcoatRoughness: 0.1,
      });
    }
    const wrapTex = makeGunWrapTexture(THREE, gunWrap);
    return new THREE.MeshStandardMaterial({
      map: wrapTex,
      emissive:
        gunWrap === 'lava_magma'
          ? 0x7c2d12
          : gunWrap === 'electric_ice'
          ? 0x0369a1
          : gunWrap === 'galaxy_void'
          ? 0x4c1d95
          : 0x000000,
      emissiveIntensity:
        gunWrap === 'lava_magma' || gunWrap === 'electric_ice' || gunWrap === 'galaxy_void' ? 0.35 : 0,
      metalness: gunWrap === 'carbon_fiber' ? 0.55 : gunWrap === 'electric_ice' ? 0.65 : 0.35,
      roughness: gunWrap === 'carbon_fiber' ? 0.38 : 0.42,
    });
  }
  if (mastery === 'gold') {
    return new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      metalness: 0.94,
      roughness: 0.16,
      clearcoat: 0.7,
      clearcoatRoughness: 0.1,
    });
  }
  if (mastery === 'diamond') {
    return new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.22,
      metalness: 0.85,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      iridescence: 0.85,
    });
  }
  if (mastery === 'camo') {
    return new THREE.MeshStandardMaterial({
      map: makeCamoTexture(THREE),
      metalness: 0.35,
      roughness: 0.55,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: baseHex,
    metalness: 0.74,
    roughness: 0.38,
  });
}

export function build3DWeapon(
  THREE: ThreeModule,
  weaponId: WeaponId,
  mastery: WeaponMasteryTier,
  gunWrap: GunWrapId = 'none'
): ThreeTypes.Group {
  const g = new THREE.Group();
  const def = WEAPONS[weaponId] || WEAPONS.ak;
  const primaryMat = buildWeaponMaterial(THREE, mastery, gunWrap, weaponId === 'orbital_laser' ? 0xf8fafc : 0x334155);
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.82,
    roughness: 0.32,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: (weaponId === 'ak' || weaponId === 'boomstick') && mastery === 'none' && gunWrap === 'none' ? 0x7c2d12 : 0x1e293b,
    metalness: 0.15,
    roughness: 0.72,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.bulletColor),
    emissive: new THREE.Color(def.bulletColor),
    emissiveIntensity:
      weaponId === 'orbital_laser' || mastery === 'diamond' || gunWrap === 'electric_ice' || gunWrap === 'lava_magma'
        ? 1.15
        : 0.45,
    metalness: 0.4,
    roughness: 0.25,
  });

  if (weaponId === 'orbital_laser') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.17, 0.14), primaryMat);
    chassis.castShadow = true;
    g.add(chassis);

    const goldTrimMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      metalness: 0.94,
      roughness: 0.16,
      clearcoat: 0.8,
    });
    const goldSpine = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.15), goldTrimMat);
    goldSpine.position.set(0.05, 0.085, 0);
    g.add(goldSpine);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.1), darkMetal);
    stock.position.set(-0.46, -0.02, 0);
    g.add(stock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.17, 0.07), gripMat);
    grip.position.set(-0.16, -0.13, 0);
    grip.rotation.z = 0.22;
    g.add(grip);

    [-0.045, 0.045].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.042, 0.03), darkMetal);
      rail.position.set(0.54, 0.02, rz);
      g.add(rail);
    });

    const coreBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.72, 12), accentMat);
    coreBeam.rotation.z = Math.PI / 2;
    coreBeam.position.set(0.36, 0.02, 0);
    g.add(coreBeam);

    const emitterRing = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 10, 18), goldTrimMat);
    emitterRing.rotation.y = Math.PI / 2;
    emitterRing.position.set(0.76, 0.02, 0);
    g.add(emitterRing);

    return g;
  }

  if (weaponId === 'bomberier') {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.25, 16), primaryMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0.12, 0.05, 0);
    tube.castShadow = true;
    g.add(tube);

    const flareFront = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.11, 0.18, 16), darkMetal);
    flareFront.rotation.z = Math.PI / 2;
    flareFront.position.set(0.76, 0.05, 0);
    g.add(flareFront);

    const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.22, 12), accentMat);
    warhead.rotation.z = -Math.PI / 2;
    warhead.position.set(0.84, 0.05, 0);
    g.add(warhead);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.07), gripMat);
    handle.position.set(-0.08, -0.1, 0);
    g.add(handle);
    return g;
  }

  if (weaponId === 'minigun') {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.44, 16), primaryMat);
    housing.rotation.z = Math.PI / 2;
    housing.position.set(-0.06, 0.02, 0);
    housing.castShadow = true;
    g.add(housing);

    const handleTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, 0.06), darkMetal);
    handleTop.position.set(-0.04, 0.19, 0);
    g.add(handleTop);
    [-0.16, 0.08].forEach((hx) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), darkMetal);
      strut.position.set(hx, 0.13, 0);
      g.add(strut);
    });

    const ammoDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 14), accentMat);
    ammoDrum.position.set(0.02, -0.14, 0.09);
    g.add(ammoDrum);

    const spinGroup = new THREE.Group();
    spinGroup.position.set(0.46, 0.02, 0);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.62, 8), darkMetal);
      b.rotation.z = Math.PI / 2;
      b.position.set(0, Math.cos(ang) * 0.058, Math.sin(ang) * 0.058);
      spinGroup.add(b);
    }
    const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.06, 14), primaryMat);
    clamp.rotation.z = Math.PI / 2;
    clamp.position.set(0.18, 0, 0);
    spinGroup.add(clamp);
    g.add(spinGroup);
    g.userData.spinGroup = spinGroup;
    return g;
  }

  if (weaponId === 'crossbow_launcher') {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.08), primaryMat);
    rail.position.set(0.1, 0.02, 0);
    rail.castShadow = true;
    g.add(rail);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.07), gripMat);
    stock.position.set(-0.34, -0.02, 0);
    g.add(stock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.06), gripMat);
    grip.position.set(-0.14, -0.11, 0);
    grip.rotation.z = 0.2;
    g.add(grip);

    [-1, 1].forEach((side) => {
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.36), darkMetal);
      limb.position.set(0.36, 0.03, side * 0.19);
      limb.rotation.y = side * -0.45;
      g.add(limb);
      const stringSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 6), accentMat);
      stringSeg.rotation.x = Math.PI / 2;
      stringSeg.position.set(0.2, 0.04, side * 0.17);
      stringSeg.rotation.z = side * 0.6;
      g.add(stringSeg);
    });

    const boltShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 8), darkMetal);
    boltShaft.rotation.z = Math.PI / 2;
    boltShaft.position.set(0.32, 0.07, 0);
    g.add(boltShaft);

    const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.11, 10), accentMat);
    warhead.rotation.z = -Math.PI / 2;
    warhead.position.set(0.56, 0.07, 0);
    g.add(warhead);
    return g;
  }

  if (weaponId === 'plasma_repeater' || weaponId === 'freeze_ray') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.11), primaryMat);
    body.castShadow = true;
    g.add(body);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.08), gripMat);
    stock.position.set(-0.38, -0.02, 0);
    g.add(stock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.16, 0.065), gripMat);
    grip.position.set(-0.14, -0.12, 0);
    grip.rotation.z = 0.22;
    g.add(grip);

    const energyCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.28, 12),
      accentMat
    );
    energyCore.rotation.z = Math.PI / 2;
    energyCore.position.set(0.06, 0.08, 0);
    g.add(energyCore);

    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.085), darkMetal);
    shroud.position.set(0.42, 0.02, 0);
    g.add(shroud);

    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(
        weaponId === 'freeze_ray' ? 0.062 : 0.04,
        weaponId === 'freeze_ray' ? 0.036 : 0.048,
        0.14,
        12
      ),
      accentMat
    );
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(0.67, 0.02, 0);
    g.add(nozzle);
    return g;
  }

  if (weaponId === 'boomstick') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.11), primaryMat);
    body.castShadow = true;
    g.add(body);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), gripMat);
    stock.position.set(-0.3, -0.04, 0);
    stock.rotation.z = 0.18;
    g.add(stock);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.065), gripMat);
    grip.position.set(-0.13, -0.1, 0);
    grip.rotation.z = 0.24;
    g.add(grip);
    [-0.03, 0.03].forEach((bz) => {
      const dblBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.56, 10), darkMetal);
      dblBarrel.rotation.z = Math.PI / 2;
      dblBarrel.position.set(0.42, 0.025, bz);
      dblBarrel.castShadow = true;
      g.add(dblBarrel);
    });
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.022, 0.095), accentMat);
    rib.position.set(0.38, 0.06, 0);
    g.add(rib);
    return g;
  }

  const isSniper = weaponId === 'anu34' || weaponId === 'dlp44' || weaponId === 'awq';
  const isShotgun = weaponId === 'sawshot' || weaponId === 'double_pump' || weaponId === 'spas12' || weaponId === 'shorty';
  const isSidearm = weaponId === 'pistol' || weaponId === 'ghost_pistol' || weaponId === 'revolver' || weaponId === 'uzi';
  const isCompactSmg = weaponId === 'mp7' || weaponId === 'uzi';

  if (isSidearm) {
    const slideLen = weaponId === 'ghost_pistol' ? 0.34 : weaponId === 'uzi' ? 0.36 : 0.28;
    const slide = new THREE.Mesh(
      new THREE.BoxGeometry(slideLen, 0.095, 0.068),
      primaryMat
    );
    slide.castShadow = true;
    g.add(slide);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.16, 0.056), gripMat);
    grip.position.set(-0.07, -0.1, 0);
    grip.rotation.z = 0.2;
    g.add(grip);

    if (weaponId === 'revolver') {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.09, 10), darkMetal);
      drum.rotation.z = Math.PI / 2;
      drum.position.set(0.01, 0.01, 0);
      g.add(drum);
      const revBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.048, 0.044), darkMetal);
      revBarrel.position.set(0.15, 0.02, 0);
      g.add(revBarrel);
    } else if (weaponId === 'ghost_pistol') {
      const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.24, 12), darkMetal);
      suppressor.rotation.z = Math.PI / 2;
      suppressor.position.set(0.28, 0.02, 0);
      g.add(suppressor);
    } else if (weaponId === 'uzi') {
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.24, 0.045), darkMetal);
      mag.position.set(0.03, -0.14, 0);
      g.add(mag);
    }
    const accentStrip = new THREE.Mesh(
      new THREE.BoxGeometry(slideLen * 0.6, 0.02, 0.075),
      accentMat
    );
    accentStrip.position.set(0.02, 0.025, 0);
    g.add(accentStrip);
    return g;
  }

  const receiverLen = isSniper ? 0.62 : isCompactSmg ? 0.4 : isShotgun ? 0.48 : 0.54;
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(receiverLen, 0.13, 0.095),
    primaryMat
  );
  receiver.castShadow = true;
  g.add(receiver);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.075), gripMat);
  stock.position.set(-receiverLen * 0.5 - 0.12, -0.02, 0);
  stock.castShadow = true;
  g.add(stock);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.16, 0.065), gripMat);
  grip.position.set(-0.14, -0.12, 0);
  grip.rotation.z = 0.22;
  g.add(grip);

  if (!isShotgun) {
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, isSniper ? 0.14 : isCompactSmg ? 0.24 : 0.22, 0.06),
      darkMetal
    );
    mag.position.set(0.08, -0.14, 0);
    mag.rotation.z = weaponId === 'ak' ? -0.28 : -0.1;
    g.add(mag);
  }

  const barrelLen = isSniper ? 0.66 : isCompactSmg ? 0.24 : isShotgun ? 0.44 : 0.42;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.03, barrelLen, 10),
    darkMetal
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(receiverLen * 0.5 + barrelLen * 0.45, 0.025, 0);
  barrel.castShadow = true;
  g.add(barrel);

  if (weaponId === 'double_pump' || weaponId === 'sawshot' || weaponId === 'spas12') {
    const underBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.026, barrelLen * 0.88, 10),
      primaryMat
    );
    underBarrel.rotation.z = Math.PI / 2;
    underBarrel.position.set(receiverLen * 0.5 + barrelLen * 0.4, -0.02, 0);
    g.add(underBarrel);
  }

  if (isSniper || weaponId === 'm4a1' || weaponId === 'mp7') {
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.034, isSniper ? 0.28 : 0.16, 12),
      darkMetal
    );
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0.02, 0.11, 0);
    g.add(scope);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 12), accentMat);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(isSniper ? 0.165 : 0.105, 0.11, 0);
    g.add(lens);
  }

  const accentStrip = new THREE.Mesh(
    new THREE.BoxGeometry(receiverLen * 0.65, 0.025, 0.105),
    accentMat
  );
  accentStrip.position.set(0.04, 0.03, 0);
  g.add(accentStrip);

  return g;
}

export function build3DCharacterRig(
  THREE: ThreeModule,
  opts: {
    characterId: CharacterId;
    outfitId: OutfitId;
    flameId: FlameColorId;
    weaponId: WeaponId;
    weaponMastery: WeaponMasteryTier;
    gunWrap?: GunWrapId;
  }
): RigRefs {
  const charDef = CHARACTERS.find((c) => c.id === opts.characterId) || CHARACTERS[0];
  const outfit = OUTFIT_COSMETICS.find((o) => o.id === opts.outfitId) || OUTFIT_COSMETICS[0];
  const flame = FLAME_COSMETICS.find((f) => f.id === opts.flameId) || FLAME_COSMETICS[0];
  const useCustomOutfit = opts.outfitId !== 'charcoal';
  const isSteve = charDef.id === 'thongi_baba';

  const suitHex = useCustomOutfit ? outfit.primaryColor : charDef.defaultSuitColor;
  const accentHex = useCustomOutfit ? outfit.secondaryColor : charDef.tieColor;
  const pantsHex =
    charDef.id === 'thongi_baba' && !useCustomOutfit
      ? '#312E81'
      : charDef.id === 'chai_storm' && !useCustomOutfit
      ? '#FEF3C7'
      : charDef.id === 'baron_voltage' && !useCustomOutfit
      ? '#1E293B'
      : charDef.id === 'baba_wifi' && !useCustomOutfit
      ? '#C2410C'
      : charDef.id === 'captain_jalebi' && !useCustomOutfit
      ? '#1E293B'
      : charDef.id === 'prof_jugaad' && !useCustomOutfit
      ? '#334155'
      : charDef.id === 'chappal_ninja' && !useCustomOutfit
      ? '#9D174D'
      : charDef.id === 'bhaijaan_gymbro' && !useCustomOutfit
      ? '#09090B'
      : suitHex;

  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(charDef.skinTone),
    roughness: 0.62,
    metalness: 0.04,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(charDef.hairColor),
    roughness: 0.68,
    metalness: 0.06,
  });
  const suitMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(suitHex),
    roughness: 0.48,
    metalness: 0.14,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(pantsHex),
    roughness: 0.62,
    metalness: 0.08,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    roughness: 0.42,
    metalness: 0.16,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color:
      charDef.id === 'captain_jalebi'
        ? 0x22d3ee
        : charDef.id === 'baba_wifi'
        ? 0xfb923c
        : charDef.id === 'baron_voltage'
        ? 0x1e3a8a
        : 0x0f172a,
    emissive: charDef.id === 'captain_jalebi' ? 0x0891b2 : 0x000000,
    emissiveIntensity: charDef.id === 'captain_jalebi' ? 0.6 : 0,
    roughness: 0.45,
    metalness: 0.35,
  });

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);
  const floatProps: RigRefs['floatProps'] = [];

  const isGymBro = charDef.id === 'bhaijaan_gymbro';
  const isWifi = charDef.id === 'baba_wifi';

  const legRadius = isGymBro ? 0.068 : 0.115;
  const legGeo = isSteve
    ? new THREE.BoxGeometry(0.24, 0.72, 0.24)
    : new THREE.CylinderGeometry(legRadius, legRadius * 0.9, 0.72, 14);
  const bootGeo = isGymBro
    ? new THREE.BoxGeometry(0.18, 0.12, 0.24)
    : isWifi
    ? new THREE.BoxGeometry(0.22, 0.06, 0.3)
    : new THREE.BoxGeometry(0.25, 0.14, 0.31);

  [-0.17, 0.17].forEach((lx, legIdx) => {
    const boot = new THREE.Mesh(bootGeo, bootMat);
    const bootBaseY = isWifi ? 0.14 : 0.07;
    boot.position.set(lx, bootBaseY, 0.03);
    boot.castShadow = true;
    boot.receiveShadow = true;
    bodyPivot.add(boot);
    if (isWifi) {
      floatProps.push({ obj: boot, baseY: bootBaseY, speed: 3.2, amp: 0.04, phase: legIdx * 1.4 });
    }

    const leg = new THREE.Mesh(legGeo, pantsMat);
    leg.position.set(lx, 0.49, 0);
    leg.castShadow = true;
    bodyPivot.add(leg);
  });

  const torsoGeo = isSteve
    ? new THREE.BoxGeometry(0.62, 0.78, 0.36)
    : isGymBro
    ? new THREE.CylinderGeometry(0.46, 0.24, 0.84, 16)
    : charDef.id === 'baron_voltage'
    ? new THREE.CylinderGeometry(0.35, 0.32, 0.82, 16)
    : charDef.id === 'general_noodle'
    ? new THREE.CylinderGeometry(0.36, 0.39, 0.82, 16)
    : new THREE.CylinderGeometry(0.28, 0.31, 0.78, 16);
  const torso = new THREE.Mesh(torsoGeo, suitMat);
  torso.position.set(0, 1.24, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  if (opts.outfitId === 'neon_cyber') {
    const cyberMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const chestLine = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.36), cyberMat);
    chestLine.position.set(0, 1.38, 0.04);
    bodyPivot.add(chestLine);
    const beltLine = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.36), cyberMat);
    beltLine.position.set(0, 0.94, 0.02);
    bodyPivot.add(beltLine);
  }

  if (charDef.id === 'chai_storm') {
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.74, 0.37),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 })
    );
    shirt.position.set(0, 1.24, 0.02);
    bodyPivot.add(shirt);
    const vestL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.72, 0.39), suitMat);
    vestL.position.set(-0.2, 1.24, 0.01);
    bodyPivot.add(vestL);
    const vestR = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.72, 0.39), suitMat);
    vestR.position.set(0.2, 1.24, 0.01);
    bodyPivot.add(vestR);
    const tumbler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.065, 0.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.18 })
    );
    tumbler.position.set(0.31, 0.96, 0.2);
    tumbler.castShadow = true;
    bodyPivot.add(tumbler);
  } else if (charDef.id === 'baron_voltage') {
    const charcoalCloakMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 });
    const brassArmorMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.84, roughness: 0.26 });
    const circuitGlowMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    });
    const cloakBack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.02, 0.12), suitMat);
    cloakBack.position.set(0, 1.06, -0.34);
    cloakBack.rotation.x = 0.1;
    cloakBack.castShadow = true;
    bodyPivot.add(cloakBack);
    const cloakTrim = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.13), circuitGlowMat);
    cloakTrim.position.set(0, 0.62, -0.38);
    bodyPivot.add(cloakTrim);
    [-0.36, 0.36].forEach((sx) => {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), charcoalCloakMat);
      pauldron.scale.set(1.1, 0.75, 1.0);
      pauldron.position.set(sx, 1.58, 0);
      bodyPivot.add(pauldron);
    });
    const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 10, 20), brassArmorMat);
    reactorRing.position.set(0, 1.36, 0.33);
    bodyPivot.add(reactorRing);
    const reactorCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), circuitGlowMat);
    reactorCore.position.set(0, 1.36, 0.33);
    bodyPivot.add(reactorCore);
    const circuitLine = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.03, 0.34), circuitGlowMat);
    circuitLine.position.set(0, 1.04, 0.04);
    bodyPivot.add(circuitLine);
  } else if (charDef.id === 'captain_jalebi') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.76, 0.34), accentMat);
    stripe.position.set(0, 1.24, 0.14);
    bodyPivot.add(stripe);
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const cape = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.075, 10, 28), capeMat);
    cape.position.set(0, 1.18, -0.36);
    cape.rotation.x = 0.22;
    bodyPivot.add(cape);
  } else if (charDef.id === 'baba_wifi') {
    const sash = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.14, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.9 })
    );
    sash.position.set(0, 1.24, 0.01);
    sash.rotation.z = 0.52;
    bodyPivot.add(sash);
  } else if (charDef.id === 'general_noodle') {
    const furCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.09, 10, 20),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 })
    );
    furCollar.rotation.x = Math.PI / 2;
    furCollar.position.set(0, 1.62, 0);
    bodyPivot.add(furCollar);
    [-0.58, 0.58].forEach((dx, dIdx) => {
      const drone = new THREE.Group();
      drone.position.set(dx, 1.88, 0.06);
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 10),
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xdc2626,
          emissiveIntensity: 1.1,
          roughness: 0.35,
        })
      );
      lantern.scale.set(1, 1.2, 1);
      drone.add(lantern);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 })
      );
      cap.position.y = 0.13;
      drone.add(cap);
      bodyPivot.add(drone);
      floatProps.push({ obj: drone, baseY: 1.88, speed: 2.8, amp: 0.075, phase: dIdx * 2.1 });
    });
  } else if (charDef.id === 'agent_404') {
    const coatSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.42, 16), suitMat);
    coatSkirt.position.set(0, 0.78, 0);
    bodyPivot.add(coatSkirt);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.04), accentMat);
    tie.position.set(0, 1.32, 0.31);
    bodyPivot.add(tie);
  } else if (charDef.id === 'prof_jugaad') {
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.35 });
    const tape1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.34), tapeMat);
    tape1.position.set(-0.08, 1.32, 0.14);
    tape1.rotation.z = 0.35;
    bodyPivot.add(tape1);
    const tape2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.34), tapeMat);
    tape2.position.set(0.12, 1.1, 0.14);
    tape2.rotation.z = -0.28;
    bodyPivot.add(tape2);
  } else if (charDef.id === 'chappal_ninja') {
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.09, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
    );
    belt.position.set(0, 0.94, 0);
    bodyPivot.add(belt);
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.11, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 })
    );
    buckle.position.set(0, 0.94, 0.32);
    bodyPivot.add(buckle);
    const slipper = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.46, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.5, metalness: 0.65 })
    );
    slipper.position.set(0.22, 1.54, -0.42);
    slipper.rotation.z = -0.45;
    bodyPivot.add(slipper);
  } else if (charDef.id === 'dj_dholak') {
    const dhol = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.44, 14),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.45 })
    );
    dhol.rotation.z = Math.PI / 2 - 0.18;
    dhol.position.set(0, 1.16, 0.34);
    dhol.castShadow = true;
    bodyPivot.add(dhol);
    [-0.22, 0.22].forEach((hx) => {
      const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.175, 0.175, 0.03, 14),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 })
      );
      head.rotation.z = Math.PI / 2 - 0.18;
      head.position.set(hx, 1.16 + hx * 0.18, 0.34);
      bodyPivot.add(head);
    });
  } else if (charDef.id === 'aunty_cctv') {
    const binoMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.75, roughness: 0.25 });
    [-0.09, 0.09].forEach((bx) => {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.18, 10), binoMat);
      lens.rotation.x = Math.PI / 2.6;
      lens.position.set(bx, 1.38, 0.33);
      bodyPivot.add(lens);
    });
  } else if (charDef.id === 'bhaijaan_gymbro') {
    [-0.46, 0.46].forEach((bx) => {
      const delt = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skinMat);
      delt.position.set(bx, 1.54, 0.02);
      bodyPivot.add(delt);
    });
  } else if (charDef.id === 'exam_topper') {
    const medalMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.92, roughness: 0.18 });
    [
      [-0.14, 1.44],
      [-0.14, 1.3],
      [0.14, 1.44],
    ].forEach(([mx, my]) => {
      const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.025, 12), medalMat);
      medal.rotation.x = Math.PI / 2;
      medal.position.set(mx, my, 0.31);
      bodyPivot.add(medal);
    });
    const ruler = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.9, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 })
    );
    ruler.position.set(0.24, 1.66, -0.42);
    ruler.rotation.z = -0.38;
    bodyPivot.add(ruler);
  } else if (isSteve) {
    const neckPatch = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.04), skinMat);
    neckPatch.position.set(0, 1.57, 0.175);
    bodyPivot.add(neckPatch);
  }

  const jetpack = new THREE.Group();
  jetpack.position.set(0, 1.28, -0.32);
  const packMat = new THREE.MeshStandardMaterial({
    color:
      charDef.id === 'exam_topper'
        ? 0x7c2d12
        : charDef.id === 'bhaijaan_gymbro'
        ? 0x0891b2
        : 0x1e293b,
    metalness: charDef.id === 'exam_topper' ? 0.15 : 0.72,
    roughness: charDef.id === 'exam_topper' ? 0.72 : 0.32,
  });
  const packCore = new THREE.Mesh(
    charDef.id === 'prof_jugaad'
      ? new THREE.CylinderGeometry(0.2, 0.22, 0.38, 14)
      : new THREE.BoxGeometry(0.42, 0.46, 0.18),
    packMat
  );
  packCore.castShadow = true;
  jetpack.add(packCore);

  const flameGlowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(flame.secondaryColor),
    emissive: new THREE.Color(flame.primaryColor),
    emissiveIntensity: 2.2,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });

  const makeThrusterPod = (xPos: number) => {
    const podColor =
      charDef.id === 'prof_jugaad'
        ? new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.25, metalness: 0.2 })
        : packMat;
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.42, 12), podColor);
    pod.position.set(xPos, -0.02, -0.04);
    pod.castShadow = true;
    jetpack.add(pod);

    const flameCone = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 12), flameGlowMat);
    flameCone.rotation.x = Math.PI;
    flameCone.position.set(xPos, -0.34, -0.04);
    jetpack.add(flameCone);
    return flameCone;
  };
  const flameLeft = makeThrusterPod(-0.15);
  const flameRight = makeThrusterPod(0.15);
  bodyPivot.add(jetpack);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.04, 0);
  bodyPivot.add(headGroup);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  if (isSteve) {
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.58, 0.7), skinMat);
    cranium.position.set(0, 0.1, 0);
    cranium.castShadow = true;
    headGroup.add(cranium);

    const cheekShadeMat = new THREE.MeshStandardMaterial({ color: 0x7c4522, roughness: 0.78 });
    const jawHighlightMat = new THREE.MeshStandardMaterial({ color: 0xd9a06c, roughness: 0.48, metalness: 0.06 });
    const neckShadowMat = new THREE.MeshStandardMaterial({ color: 0x5c3318, roughness: 0.85 });

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.42), neckShadowMat);
    neck.position.set(0, -0.34, -0.04);
    headGroup.add(neck);

    [-0.31, 0.31].forEach((sideX) => {
      const sign = sideX < 0 ? -1 : 1;
      const cheekBone = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.48), jawHighlightMat);
      cheekBone.position.set(sideX * 0.92, -0.02, 0.14);
      cheekBone.rotation.z = sign * 0.12;
      headGroup.add(cheekBone);

      const buccalHollow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.17, 0.42), cheekShadeMat);
      buccalHollow.position.set(sideX * 0.88, -0.14, 0.13);
      buccalHollow.rotation.z = -sign * 0.14;
      headGroup.add(buccalHollow);

      const gonialWing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.48), skinMat);
      gonialWing.position.set(sideX * 0.84, -0.26, 0.1);
      gonialWing.rotation.z = sign * 0.34;
      gonialWing.rotation.y = -sign * 0.16;
      gonialWing.castShadow = true;
      headGroup.add(gonialWing);

      const jawRim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.065, 0.46), jawHighlightMat);
      jawRim.position.set(sideX * 0.86, -0.33, 0.13);
      jawRim.rotation.z = sign * 0.34;
      jawRim.rotation.y = -sign * 0.22;
      headGroup.add(jawRim);
    });

    const jawCore = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.56), skinMat);
    jawCore.position.set(0, -0.27, 0.08);
    jawCore.castShadow = true;
    headGroup.add(jawCore);

    const chinProtrusion = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.24), jawHighlightMat);
    chinProtrusion.position.set(0, -0.29, 0.33);
    chinProtrusion.rotation.x = 0.16;
    chinProtrusion.castShadow = true;
    headGroup.add(chinProtrusion);

    const chinCleft = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.11, 0.06), cheekShadeMat);
    chinCleft.position.set(0, -0.31, 0.44);
    headGroup.add(chinCleft);

    const chinBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.3), skinMat);
    chinBase.position.set(0, -0.39, 0.26);
    chinBase.castShadow = true;
    headGroup.add(chinBase);

    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.74), hairMat);
    hairTop.position.set(0, 0.35, 0);
    hairTop.castShadow = true;
    headGroup.add(hairTop);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.44, 0.2), hairMat);
    hairBack.position.set(0, 0.12, -0.28);
    headGroup.add(hairBack);

    const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.075, 0.12), jawHighlightMat);
    browRidge.position.set(0, 0.14, 0.34);
    headGroup.add(browRidge);

    [-0.17, 0.17].forEach((ex) => {
      const eyeW = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), whiteMat);
      eyeW.position.set(ex, 0.06, 0.355);
      headGroup.add(eyeW);

      const pupil = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.045),
        new THREE.MeshStandardMaterial({ color: 0x4338ca, roughness: 0.25 })
      );
      pupil.position.set(ex + (ex < 0 ? 0.03 : -0.03), 0.06, 0.36);
      headGroup.add(pupil);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.042, 0.055), hairMat);
      brow.position.set(ex, 0.145, 0.385);
      brow.rotation.z = ex < 0 ? -0.18 : 0.18;
      headGroup.add(brow);
    });

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.09), cheekShadeMat);
    nose.position.set(0, -0.03, 0.375);
    headGroup.add(nose);

    const goatee = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.12, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.8 })
    );
    goatee.position.set(0, -0.21, 0.42);
    headGroup.add(goatee);
  } else {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 20), skinMat);
    head.scale.set(1.0, 1.06, 0.96);
    head.castShadow = true;
    headGroup.add(head);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), skinMat);
    nose.position.set(0, -0.02, 0.41);
    headGroup.add(nose);

    if (charDef.id === 'baron_voltage') {
      const cobaltPlateMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.82, roughness: 0.26 });
      const brassPlateMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.88, roughness: 0.22 });
      const cyanEyeMat = new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x22d3ee,
        emissiveIntensity: 2.0,
        roughness: 0.1,
      });
      const maskBase = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.66, 0.28), cobaltPlateMat);
      maskBase.position.set(0, 0.02, 0.28);
      headGroup.add(maskBase);
      const cheekGuard = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.26, 0.22), brassPlateMat);
      cheekGuard.position.set(0, -0.17, 0.34);
      headGroup.add(cheekGuard);
      [-0.24, 0.24].forEach((rx) => {
        const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), brassPlateMat);
        rivet.rotation.x = Math.PI / 2;
        rivet.position.set(rx, 0.22, 0.43);
        headGroup.add(rivet);
      });
      [-0.14, 0.14].forEach((ex) => {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.055, 0.05), cyanEyeMat);
        slit.position.set(ex, 0.08, 0.42);
        slit.rotation.z = ex < 0 ? -0.15 : 0.15;
        headGroup.add(slit);
      });
    } else if (charDef.id === 'baba_wifi') {
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.15, 0.16),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.85,
          metalness: 0.85,
          roughness: 0.15,
        })
      );
      visor.position.set(0, 0.06, 0.36);
      headGroup.add(visor);
    } else if (charDef.id === 'agent_404') {
      const nvgMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x16a34a,
        emissiveIntensity: 1.4,
        roughness: 0.2,
      });
      [-0.13, 0.13].forEach((ex) => {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.12, 12), nvgMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(ex, 0.06, 0.41);
        headGroup.add(tube);
      });
    } else if (charDef.id === 'dj_dholak') {
      [-0.14, 0.14].forEach((ex, i) => {
        const lens = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.1, 0.06),
          new THREE.MeshStandardMaterial({
            color: i === 0 ? 0x22d3ee : 0xf472b6,
            emissive: i === 0 ? 0x06b6d4 : 0xdb2777,
            emissiveIntensity: 0.8,
            roughness: 0.2,
          })
        );
        lens.position.set(ex, 0.06, 0.39);
        headGroup.add(lens);
      });
    } else {
      [-0.135, 0.135].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), whiteMat);
        eye.position.set(ex, 0.055, 0.36);
        headGroup.add(eye);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), pupilMat);
        pupil.position.set(ex, 0.055, 0.415);
        headGroup.add(pupil);
      });

      if (charDef.id === 'chai_storm' || charDef.id === 'exam_topper' || charDef.id === 'aunty_cctv') {
        const rimMat = new THREE.MeshStandardMaterial({
          color: charDef.id === 'chai_storm' ? 0x1e293b : 0x0f172a,
          metalness: 0.85,
          roughness: 0.15,
        });
        const rSize = charDef.id === 'chai_storm' ? 0.11 : 0.088;
        [-0.135, 0.135].forEach((ex) => {
          const rim = new THREE.Mesh(new THREE.TorusGeometry(rSize, 0.015, 8, 18), rimMat);
          rim.position.set(ex, 0.055, 0.415);
          headGroup.add(rim);
        });
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.016, 0.02), rimMat);
        bridge.position.set(0, 0.065, 0.415);
        headGroup.add(bridge);
      }
    }

    if (charDef.id === 'chai_storm') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
      hair.position.set(0, 0.05, -0.02);
      hair.rotation.x = -0.2;
      headGroup.add(hair);
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.1), hairMat);
      stache.position.set(0, -0.1, 0.4);
      headGroup.add(stache);
    } else if (charDef.id === 'baron_voltage') {
      const hoodTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
        suitMat
      );
      hoodTop.position.set(0, 0.08, -0.05);
      hoodTop.rotation.x = -0.22;
      headGroup.add(hoodTop);
      const cowlTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.045, 10, 24),
        new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.3 })
      );
      cowlTrim.position.set(0, 0.05, 0.14);
      headGroup.add(cowlTrim);
      [-0.45, 0.45].forEach((fx) => {
        const fin = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.34, 6),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 })
        );
        fin.position.set(fx, 0.18, 0);
        fin.rotation.z = fx < 0 ? 0.55 : -0.55;
        headGroup.add(fin);
      });
    } else if (charDef.id === 'captain_jalebi') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.43, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
      hair.position.set(0, 0.05, -0.02);
      headGroup.add(hair);
      const headband = new THREE.Mesh(
        new THREE.CylinderGeometry(0.435, 0.435, 0.1, 20),
        new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.3 })
      );
      headband.position.set(0, 0.19, 0);
      headGroup.add(headband);
    } else if (charDef.id === 'baba_wifi') {
      const antenna = new THREE.Group();
      antenna.position.set(0, 0.56, 0);
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.24, 10),
        new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.2 })
      );
      antenna.add(mast);
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x22d3ee, emissiveIntensity: 1.8 })
      );
      orb.position.y = 0.15;
      antenna.add(orb);
      headGroup.add(antenna);
      floatProps.push({ obj: antenna, baseY: 0.56, speed: 3.6, amp: 0.055, phase: 0.5 });
    } else if (charDef.id === 'general_noodle') {
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.445, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
      bowl.position.set(0, 0.05, 0);
      headGroup.add(bowl);
    } else if (charDef.id === 'agent_404') {
      const hatMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.65 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.04, 20), hatMat);
      brim.position.set(0, 0.28, 0.04);
      brim.rotation.x = 0.14;
      headGroup.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.37, 0.26, 18), hatMat);
      crown.position.set(0, 0.42, 0.02);
      crown.rotation.x = 0.14;
      headGroup.add(crown);
      const stache = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.065, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x18181b })
      );
      stache.position.set(0, -0.1, 0.41);
      headGroup.add(stache);
    } else if (charDef.id === 'prof_jugaad') {
      [
        [-0.3, 0.34, 0, 0.2],
        [0, 0.42, -0.05, 0.24],
        [0.3, 0.34, 0, 0.2],
        [-0.36, 0.18, -0.1, 0.17],
        [0.36, 0.18, -0.1, 0.17],
      ].forEach(([cx, cy, cz, r]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), hairMat);
        puff.position.set(cx, cy, cz);
        headGroup.add(puff);
      });
      const goggleGroup = new THREE.Group();
      goggleGroup.position.set(0, 0.25, 0.34);
      goggleGroup.rotation.z = -0.14;
      [-0.12, 0.12].forEach((gx) => {
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.085, 0.085, 0.09, 12),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45, metalness: 0.7 })
        );
        cup.rotation.x = Math.PI / 2;
        cup.position.x = gx;
        goggleGroup.add(cup);
      });
      headGroup.add(goggleGroup);
    } else if (charDef.id === 'chappal_ninja') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.43, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
      cap.position.set(0, 0.04, -0.02);
      headGroup.add(cap);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), hairMat);
      bun.position.set(0, 0.48, -0.12);
      headGroup.add(bun);
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.65, metalness: 0.85 })
      );
      pin.position.set(0, 0.5, -0.12);
      pin.rotation.z = 1.15;
      headGroup.add(pin);
    } else if (charDef.id === 'dj_dholak') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.425, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
      hair.position.set(0, 0.05, -0.02);
      headGroup.add(hair);
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.04, 10, 24, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xdb2777, emissiveIntensity: 0.5 })
      );
      band.position.set(0, 0.08, 0);
      headGroup.add(band);
      [-0.46, 0.46].forEach((cx) => {
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x22d3ee, emissiveIntensity: 0.45 })
        );
        cup.rotation.z = Math.PI / 2;
        cup.position.set(cx, 0.06, 0);
        headGroup.add(cup);
      });
    } else if (charDef.id === 'aunty_cctv') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.43, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
      cap.position.set(0, 0.04, -0.02);
      headGroup.add(cap);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), hairMat);
      bun.position.set(0, 0.46, -0.1);
      headGroup.add(bun);
      const dish = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.09, 14),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 })
      );
      dish.position.set(0, 0.62, -0.04);
      dish.rotation.x = 0.65;
      headGroup.add(dish);
    } else if (charDef.id === 'bhaijaan_gymbro') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.425, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), hairMat);
      cap.position.set(0, 0.06, -0.02);
      headGroup.add(cap);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.435, 0.435, 0.09, 18),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 })
      );
      band.position.set(0, 0.2, 0);
      headGroup.add(band);
    } else if (charDef.id === 'exam_topper') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.425, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
      cap.position.set(0, 0.05, -0.02);
      headGroup.add(cap);
    }
  }

  const weaponGroup = build3DWeapon(THREE, opts.weaponId, opts.weaponMastery, opts.gunWrap || 'none');
  weaponGroup.position.set(0.06, 1.24, 0.46);
  weaponGroup.rotation.set(0.06, -0.32, 0.14);
  bodyPivot.add(weaponGroup);
  const minigunBarrelSpin = weaponGroup.userData.spinGroup as ThreeTypes.Object3D | undefined;

  const armGeo = isSteve
    ? new THREE.BoxGeometry(0.17, 0.5, 0.17)
    : new THREE.CylinderGeometry(0.08, 0.072, 0.5, 12);
  const handGeo = new THREE.SphereGeometry(0.085, 10, 10);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-0.37, 1.48, 0.05);
  const rArm = new THREE.Mesh(armGeo, suitMat);
  rArm.position.set(0.14, -0.16, 0.2);
  rArm.rotation.set(-0.95, 0, 0.38);
  rArm.castShadow = true;
  rightArmGroup.add(rArm);
  const rHand = new THREE.Mesh(handGeo, charDef.id === 'baron_voltage' ? accentMat : skinMat);
  rHand.position.set(0.26, -0.26, 0.38);
  rightArmGroup.add(rHand);
  if (charDef.id === 'baron_voltage') {
    const rCoil = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.022, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x22d3ee, emissiveIntensity: 1.8 })
    );
    rCoil.position.set(0.22, -0.22, 0.33);
    rCoil.rotation.x = Math.PI / 3;
    rightArmGroup.add(rCoil);
  }
  bodyPivot.add(rightArmGroup);

  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(0.37, 1.48, 0.05);
  const lArm = new THREE.Mesh(armGeo, suitMat);
  lArm.position.set(-0.08, -0.16, 0.24);
  lArm.rotation.set(-1.05, 0, -0.25);
  lArm.castShadow = true;
  leftArmGroup.add(lArm);
  const lHand = new THREE.Mesh(handGeo, charDef.id === 'baron_voltage' ? accentMat : skinMat);
  lHand.position.set(-0.14, -0.25, 0.44);
  leftArmGroup.add(lHand);
  if (charDef.id === 'baron_voltage') {
    const lCoil = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.022, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x22d3ee, emissiveIntensity: 1.8 })
    );
    lCoil.position.set(-0.12, -0.22, 0.38);
    lCoil.rotation.x = Math.PI / 3;
    leftArmGroup.add(lCoil);
  }
  bodyPivot.add(leftArmGroup);

  return {
    root,
    bodyPivot,
    headGroup,
    weaponGroup,
    minigunBarrelSpin,
    rightArmGroup,
    leftArmGroup,
    flameLeft,
    flameRight,
    floatProps,
  };
}
