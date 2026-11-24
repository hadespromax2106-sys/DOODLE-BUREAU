import React, { useEffect, useRef, useState } from 'react';
import type * as ThreeTypes from 'three';
import {
  CHARACTERS,
  FLAME_COSMETICS,
  MELEE_WEAPONS,
  OUTFIT_COSMETICS,
  WEAPONS,
} from '../data/catalog';
import {
  disposeThreeObject,
  isSoftwareWebGLRenderer,
  loadThreeFromCdn,
  ThreeModule,
} from '../three/threeCdn';
import {
  CharacterId,
  FlameColorId,
  OutfitId,
  PartyMember,
  WeaponId,
  WeaponMasteryTier,
} from '../types/game';

export interface LobbyActionSignal {
  type: 'switch' | 'unlock' | 'ready';
  seq: number;
}

interface LobbyStage3DProps {
  characterId: CharacterId;
  outfitId: OutfitId;
  flameId: FlameColorId;
  weaponId: WeaponId;
  weaponMastery: WeaponMasteryTier;
  partyMembers?: PartyMember[];
  paused?: boolean;
  actionSignal?: LobbyActionSignal | null;
}

interface RigRefs {
  root: ThreeTypes.Group;
  bodyPivot: ThreeTypes.Group;
  headGroup: ThreeTypes.Group;
  weaponGroup: ThreeTypes.Group;
  rightArmGroup: ThreeTypes.Group;
  leftArmGroup: ThreeTypes.Group;
  flameLeft: ThreeTypes.Mesh;
  flameRight: ThreeTypes.Mesh;
}

interface SquadSlotEntry {
  memberId: string;
  rig: RigRefs;
  pedestalRing?: ThreeTypes.Mesh;
  offset: [number, number, number];
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

function makeEmberGlowTexture(THREE: ThreeModule): ThreeTypes.CanvasTexture {
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

function buildWeaponMaterial(
  THREE: ThreeModule,
  mastery: WeaponMasteryTier,
  baseHex: number
): ThreeTypes.Material {
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

function build3DWeapon(
  THREE: ThreeModule,
  weaponId: WeaponId,
  mastery: WeaponMasteryTier
): ThreeTypes.Group {
  const g = new THREE.Group();
  const def = WEAPONS[weaponId];
  const primaryMat = buildWeaponMaterial(THREE, mastery, 0x334155);
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.82,
    roughness: 0.32,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: weaponId === 'ak' && mastery === 'none' ? 0x7c2d12 : 0x1e293b,
    metalness: 0.15,
    roughness: 0.72,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.bulletColor),
    emissive: new THREE.Color(def.bulletColor),
    emissiveIntensity: mastery === 'diamond' ? 0.9 : 0.45,
    metalness: 0.4,
    roughness: 0.25,
  });

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

  // Main receiver
  const receiverLen = isSniper ? 0.62 : isCompactSmg ? 0.4 : isShotgun ? 0.48 : 0.54;
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(receiverLen, 0.13, 0.095),
    primaryMat
  );
  receiver.castShadow = true;
  g.add(receiver);

  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.075), gripMat);
  stock.position.set(-receiverLen * 0.5 - 0.12, -0.02, 0);
  stock.castShadow = true;
  g.add(stock);

  // Pistol grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.16, 0.065), gripMat);
  grip.position.set(-0.14, -0.12, 0);
  grip.rotation.z = 0.22;
  g.add(grip);

  // Magazine
  if (!isShotgun) {
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, isSniper ? 0.14 : isCompactSmg ? 0.24 : 0.22, 0.06),
      darkMetal
    );
    mag.position.set(0.08, -0.14, 0);
    mag.rotation.z = weaponId === 'ak' ? -0.28 : -0.1;
    g.add(mag);
  }

  // Barrel(s)
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

  // Scope / Optic
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

  // Mastery Diamond Facet Strip / Glow Accent
  const accentStrip = new THREE.Mesh(
    new THREE.BoxGeometry(receiverLen * 0.65, 0.025, 0.105),
    accentMat
  );
  accentStrip.position.set(0.04, 0.03, 0);
  g.add(accentStrip);

  return g;
}

function build3DCharacterRig(
  THREE: ThreeModule,
  opts: {
    characterId: CharacterId;
    outfitId: OutfitId;
    flameId: FlameColorId;
    weaponId: WeaponId;
    weaponMastery: WeaponMasteryTier;
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
    charDef.id === 'revolutionary' && !useCustomOutfit
      ? '#1D4ED8'
      : charDef.id === 'thongi_baba' && !useCustomOutfit
      ? '#312E81'
      : charDef.id === 'yogi_boy' && !useCustomOutfit
      ? '#C2410C'
      : charDef.id === 'mitron' && !useCustomOutfit
      ? '#FEF3C7'
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
    color: 0x0f172a,
    roughness: 0.45,
    metalness: 0.35,
  });

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Boots + Legs (grounded cleanly at y = 0)
  const legGeo = isSteve
    ? new THREE.BoxGeometry(0.24, 0.72, 0.24)
    : new THREE.CylinderGeometry(0.115, 0.105, 0.72, 14);
  const bootGeo = new THREE.BoxGeometry(0.25, 0.14, 0.31);

  [-0.17, 0.17].forEach((lx) => {
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(lx, 0.07, 0.03);
    boot.castShadow = true;
    boot.receiveShadow = true;
    bodyPivot.add(boot);

    const leg = new THREE.Mesh(legGeo, pantsMat);
    leg.position.set(lx, 0.49, 0);
    leg.castShadow = true;
    bodyPivot.add(leg);
  });

  // Torso
  const torsoGeo = isSteve
    ? new THREE.BoxGeometry(0.62, 0.78, 0.36)
    : new THREE.CylinderGeometry(0.28, 0.31, 0.78, 16);
  const torso = new THREE.Mesh(torsoGeo, suitMat);
  torso.position.set(0, 1.24, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Character-specific outfit details
  if (charDef.id === 'mitron') {
    // Cream kurta center & Nehru jacket lapel
    const kurta = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.74, 0.37),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 })
    );
    kurta.position.set(0, 1.24, 0.01);
    bodyPivot.add(kurta);
    const jacketLeft = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.76, 0.38), suitMat);
    jacketLeft.position.set(-0.2, 1.24, 0.01);
    bodyPivot.add(jacketLeft);
    const jacketRight = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.76, 0.38), suitMat);
    jacketRight.position.set(0.2, 1.24, 0.01);
    bodyPivot.add(jacketRight);
  } else if (charDef.id === 'tariff_boss' || charDef.id === 'dashing_trudeau') {
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.48, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 })
    );
    shirt.position.set(0, 1.38, 0.04);
    bodyPivot.add(shirt);

    const tieLen = charDef.id === 'tariff_boss' ? 0.72 : 0.5;
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.085, tieLen, 0.04), accentMat);
    tie.position.set(0, 1.56 - tieLen * 0.5, 0.21);
    tie.castShadow = true;
    bodyPivot.add(tie);
  } else if (charDef.id === 'yogi_boy') {
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.38), accentMat);
    sash.position.set(0, 1.24, 0.01);
    sash.rotation.z = 0.52;
    bodyPivot.add(sash);
  } else if (charDef.id === 'red_dragon') {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.11, 14), suitMat);
    collar.position.set(0, 1.64, 0);
    bodyPivot.add(collar);
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.025, 12),
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x991b1b,
        emissiveIntensity: 0.4,
        metalness: 0.5,
      })
    );
    pin.rotation.x = Math.PI / 2;
    pin.position.set(0.14, 1.38, 0.28);
    bodyPivot.add(pin);
  } else if (charDef.id === 'iron_bear') {
    [-0.31, 0.31].forEach((sx) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.34), accentMat);
      pad.position.set(sx, 1.55, 0);
      bodyPivot.add(pad);
    });
  } else if (isSteve) {
    // Steve neckline V-notch
    const neckPatch = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.04), skinMat);
    neckPatch.position.set(0, 1.57, 0.175);
    bodyPivot.add(neckPatch);
  }

  // Jetpack Thruster Pack on Back
  const jetpack = new THREE.Group();
  jetpack.position.set(0, 1.28, -0.32);
  const packMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.72,
    roughness: 0.32,
  });
  const packCore = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.18), packMat);
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
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.42, 12), packMat);
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

  // Stylized Big-Headed Caricature Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.04, 0);
  bodyPivot.add(headGroup);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  if (isSteve) {
    // Blocky Minecraft Steve Head with Ultra-Chiseled Sculpted Sigma Jawline
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.58, 0.7), skinMat);
    cranium.position.set(0, 0.1, 0);
    cranium.castShadow = true;
    headGroup.add(cranium);

    const cheekShadeMat = new THREE.MeshStandardMaterial({
      color: 0x7c4522,
      roughness: 0.78,
    });
    const jawHighlightMat = new THREE.MeshStandardMaterial({
      color: 0xd9a06c,
      roughness: 0.48,
      metalness: 0.06,
    });
    const neckShadowMat = new THREE.MeshStandardMaterial({
      color: 0x5c3318,
      roughness: 0.85,
    });

    // Recessed under-jaw neck block so the sculpted jaw overhangs dramatically
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.42), neckShadowMat);
    neck.position.set(0, -0.34, -0.04);
    headGroup.add(neck);

    // Prominent sculpted upper cheekbones + deep hollowed buccal cheek shadow underneath
    [-0.31, 0.31].forEach((sideX) => {
      const sign = sideX < 0 ? -1 : 1;

      // Sharp cheekbone highlight shelf
      const cheekBone = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.48), jawHighlightMat);
      cheekBone.position.set(sideX * 0.92, -0.02, 0.14);
      cheekBone.rotation.z = sign * 0.12;
      headGroup.add(cheekBone);

      // Deep hollowed Sigma cheek recess
      const buccalHollow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.17, 0.42), cheekShadeMat);
      buccalHollow.position.set(sideX * 0.88, -0.14, 0.13);
      buccalHollow.rotation.z = -sign * 0.14;
      headGroup.add(buccalHollow);

      // Razor-sharp flared Gonial Jaw Wing (widens at back-jaw corner, angles sharply down to chin!)
      const gonialWing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.48), skinMat);
      gonialWing.position.set(sideX * 0.84, -0.26, 0.1);
      gonialWing.rotation.z = sign * 0.34;
      gonialWing.rotation.y = -sign * 0.16;
      gonialWing.castShadow = true;
      headGroup.add(gonialWing);

      // Crisp bright jaw-edge bevel ridge running from ear-corner to chin
      const jawRim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.065, 0.46), jawHighlightMat);
      jawRim.position.set(sideX * 0.86, -0.33, 0.13);
      jawRim.rotation.z = sign * 0.34;
      jawRim.rotation.y = -sign * 0.22;
      headGroup.add(jawRim);
    });

    // Core structural lower jaw + Forward-jutting sculpted Giga-Chin Wedge
    const jawCore = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.56), skinMat);
    jawCore.position.set(0, -0.27, 0.08);
    jawCore.castShadow = true;
    headGroup.add(jawCore);

    const chinProtrusion = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.24), jawHighlightMat);
    chinProtrusion.position.set(0, -0.29, 0.33);
    chinProtrusion.rotation.x = 0.16;
    chinProtrusion.castShadow = true;
    headGroup.add(chinProtrusion);

    // Subtle sculpted chin cleft shadow + crisp flat underside bevel
    const chinCleft = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.11, 0.06), cheekShadeMat);
    chinCleft.position.set(0, -0.31, 0.44);
    headGroup.add(chinCleft);

    const chinBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.3), skinMat);
    chinBase.position.set(0, -0.39, 0.26);
    chinBase.castShadow = true;
    headGroup.add(chinBase);

    // Blocky Hair Cap + sideburns
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.74), hairMat);
    hairTop.position.set(0, 0.35, 0);
    hairTop.castShadow = true;
    headGroup.add(hairTop);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.44, 0.2), hairMat);
    hairBack.position.set(0, 0.12, -0.28);
    headGroup.add(hairBack);

    // Chiseled Brow Ridge + Pixel Eyes + Indigo Pupils + Sharp Goatee
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
    // Classic Big-Headed Smooth Caricature Sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 20), skinMat);
    head.scale.set(1.0, 1.06, 0.96);
    head.castShadow = true;
    headGroup.add(head);

    // Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), skinMat);
    nose.position.set(0, -0.02, 0.41);
    headGroup.add(nose);

    // Eyes / Shades
    if (charDef.id === 'iron_bear') {
      const shadeMat = new THREE.MeshPhysicalMaterial({
        color: 0x09090b,
        metalness: 0.7,
        roughness: 0.1,
        clearcoat: 1.0,
      });
      [-0.14, 0.14].forEach((ex) => {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.06), shadeMat);
        lens.position.set(ex, 0.06, 0.38);
        headGroup.add(lens);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), shadeMat);
      bridge.position.set(0, 0.08, 0.39);
      headGroup.add(bridge);
    } else {
      [-0.135, 0.135].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), whiteMat);
        eye.position.set(ex, 0.055, 0.36);
        headGroup.add(eye);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), pupilMat);
        pupil.position.set(ex, 0.055, 0.415);
        headGroup.add(pupil);
      });

      if (charDef.id === 'mitron') {
        const rimMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.9,
          roughness: 0.15,
        });
        [-0.135, 0.135].forEach((ex) => {
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 18), rimMat);
          rim.position.set(ex, 0.055, 0.41);
          headGroup.add(rim);
        });
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.02), rimMat);
        bridge.position.set(0, 0.065, 0.415);
        headGroup.add(bridge);
      }
    }

    // Character Hairstyles, Beard & Tilak
    if (charDef.id === 'mitron') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
      hair.position.set(0, 0.04, -0.02);
      hair.rotation.x = -0.2;
      headGroup.add(hair);

      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.37, 18, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), hairMat);
      beard.position.set(0, -0.1, 0.07);
      beard.scale.set(1.02, 1.05, 0.95);
      headGroup.add(beard);
    } else if (charDef.id === 'tariff_boss') {
      const sweep = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 14), hairMat);
      sweep.scale.set(1.04, 0.56, 1.15);
      sweep.position.set(0.02, 0.34, 0.05);
      sweep.rotation.z = -0.18;
      headGroup.add(sweep);
    } else if (charDef.id === 'revolutionary') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.43, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
      cap.position.set(0, 0.04, -0.02);
      headGroup.add(cap);
      const stubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.405, 16, 12, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.42),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
      );
      stubble.position.set(0, -0.04, 0.02);
      headGroup.add(stubble);
    } else if (charDef.id === 'yogi_boy') {
      const tilak = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.16, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.25 })
      );
      tilak.position.set(0, 0.22, 0.39);
      headGroup.add(tilak);
      const bindu = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xdc2626 })
      );
      bindu.position.set(0, 0.19, 0.41);
      headGroup.add(bindu);
    } else if (charDef.id === 'red_dragon') {
      const sideHair = new THREE.Mesh(new THREE.SphereGeometry(0.435, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.54), hairMat);
      sideHair.position.set(-0.02, 0.05, -0.02);
      sideHair.rotation.z = 0.16;
      headGroup.add(sideHair);
    } else if (charDef.id === 'iron_bear') {
      const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.415, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.46), hairMat);
      backHair.position.set(0, 0.06, -0.08);
      backHair.rotation.x = -0.35;
      headGroup.add(backHair);
    } else if (charDef.id === 'dashing_trudeau') {
      [
        [-0.2, 0.36, 0.08, 0.22],
        [0.02, 0.41, 0.1, 0.25],
        [0.24, 0.34, 0.06, 0.2],
        [-0.3, 0.2, -0.04, 0.18],
        [0.3, 0.2, -0.04, 0.18],
      ].forEach(([cx, cy, cz, r]) => {
        const curl = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), hairMat);
        curl.position.set(cx, cy, cz);
        headGroup.add(curl);
      });
    }
  }

  // Two-Handed Ready Pose: Weapon + Arms
  const weaponGroup = build3DWeapon(THREE, opts.weaponId, opts.weaponMastery);
  weaponGroup.position.set(0.06, 1.24, 0.46);
  weaponGroup.rotation.set(0.06, -0.32, 0.14);
  bodyPivot.add(weaponGroup);

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
  const rHand = new THREE.Mesh(handGeo, skinMat);
  rHand.position.set(0.26, -0.26, 0.38);
  rightArmGroup.add(rHand);
  bodyPivot.add(rightArmGroup);

  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(0.37, 1.48, 0.05);
  const lArm = new THREE.Mesh(armGeo, suitMat);
  lArm.position.set(-0.08, -0.16, 0.24);
  lArm.rotation.set(-1.05, 0, -0.25);
  lArm.castShadow = true;
  leftArmGroup.add(lArm);
  const lHand = new THREE.Mesh(handGeo, skinMat);
  lHand.position.set(-0.14, -0.25, 0.44);
  leftArmGroup.add(lHand);
  bodyPivot.add(leftArmGroup);

  return {
    root,
    bodyPivot,
    headGroup,
    weaponGroup,
    rightArmGroup,
    leftArmGroup,
    flameLeft,
    flameRight,
  };
}

const SQUAD_OFFSETS: Array<[number, number, number]> = [
  [0, 0, 0],
  [-1.42, 0, -1.02],
  [1.42, 0, -1.02],
  [-2.38, 0.04, -1.92],
];

const SquadWeaponGlyph: React.FC<{ weaponId: WeaponId }> = ({ weaponId }) => {
  const weapon = WEAPONS[weaponId] || WEAPONS.ak;
  if (weapon.category === 'Sniper') {
    return (
      <svg viewBox="0 0 28 12" className="h-3.5 w-7 shrink-0" aria-hidden="true">
        <path
          d="M1 7h6.5l2-2h6.5v1h10v1.5H16v1H9.5l-1.2 2.2H5.2l1.1-2.2H1V7zm9.5-4h5v1.6h-5z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Shotgun') {
    return (
      <svg viewBox="0 0 24 12" className="h-3.5 w-6 shrink-0" aria-hidden="true">
        <path
          d="M1 7.5l3.2-2h18v1.6H10l-1.6 1H15v1.3H7.5L5.2 11H2l1.3-2.2L1 7.5z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Rocket Launcher') {
    return (
      <svg viewBox="0 0 26 12" className="h-3.5 w-6.5 shrink-0" aria-hidden="true">
        <path
          d="M2 3.8h18.5l3.5 2.2-3.5 2.2H2V3.8zm4 4.4h3.2v2.6H6zm8 0h3.2v2.6H14z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'SMG') {
    return (
      <svg viewBox="0 0 22 12" className="h-3.5 w-5.5 shrink-0" aria-hidden="true">
        <path
          d="M2 5h4.5l1-1.5h6.5l.8 1.5h5.2v1.6h-5.2l-.5 1.4h-2.1l.4 2.8h-2l-.4-2.8H7.2l-1.5 2.5H3.5l1-2.5H2V5z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Pistol' || weapon.category === 'Revolver') {
    return (
      <svg viewBox="0 0 20 12" className="h-3.5 w-5 shrink-0" aria-hidden="true">
        <path
          d="M2 4h15v2.2H9l-.8 3.8H5.5L6.2 6.2H2V4z"
          fill="currentColor"
        />
      </svg>
    );
  }
  // Assault Rifle (AK / M4A1)
  return (
    <svg viewBox="0 0 26 12" className="h-3.5 w-6.5 shrink-0" aria-hidden="true">
      <path
        d="M1 6.4h5l1.6-2h7l1.1 1.6h8.3v1.4h-8.3l-.7 1.6h-2.2l.5 2.3H11l-.5-2.3H6.8L4.6 10.7H2.1l1.1-2.6H1z"
        fill="currentColor"
      />
    </svg>
  );
};

export const LobbyStage3D: React.FC<LobbyStage3DProps> = ({
  characterId,
  outfitId,
  flameId,
  weaponId,
  weaponMastery,
  partyMembers = [],
  paused = false,
  actionSignal,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const nameplateRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [webglReady, setWebglReady] = useState(false);

  const sceneRefs = useRef<{
    THREE: ThreeModule;
    scene: ThreeTypes.Scene;
    camera: ThreeTypes.PerspectiveCamera;
    turntable: ThreeTypes.Group;
    squadSlots: SquadSlotEntry[];
    actionTimer: number;
    actionType: 'switch' | 'unlock' | 'ready';
    updateFraming: (width: number, squadLen: number) => void;
  } | null>(null);

  const propsRef = useRef({
    characterId,
    outfitId,
    flameId,
    weaponId,
    weaponMastery,
    partyMembers,
  });
  propsRef.current = {
    characterId,
    outfitId,
    flameId,
    weaponId,
    weaponMastery,
    partyMembers,
  };

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const rebuildSquadRigs = (
    THREE: ThreeModule,
    turntable: ThreeTypes.Group,
    oldSlots: SquadSlotEntry[]
  ): SquadSlotEntry[] => {
    oldSlots.forEach((slot) => {
      turntable.remove(slot.rig.root);
      disposeThreeObject(slot.rig.root);
      if (slot.pedestalRing) {
        turntable.remove(slot.pedestalRing);
        disposeThreeObject(slot.pedestalRing);
      }
    });

    const curr = propsRef.current;
    const members = curr.partyMembers;
    const slotsToRender =
      members.length > 0
        ? members.slice(0, 4).map((m, idx) => ({
            id: m.id,
            characterId: idx === 0 && m.isHost ? curr.characterId : m.characterId,
            outfitId: idx === 0 && m.isHost ? curr.outfitId : m.outfitId,
            flameId: idx === 0 && m.isHost ? curr.flameId : m.flameId,
            weaponId: idx === 0 && m.isHost ? curr.weaponId : m.startingWeapon,
            weaponMastery: idx === 0 && m.isHost ? curr.weaponMastery : m.weaponMastery,
            isReady: m.isReady,
            isHost: m.isHost,
          }))
        : [
            {
              id: 'local_solo',
              characterId: curr.characterId,
              outfitId: curr.outfitId,
              flameId: curr.flameId,
              weaponId: curr.weaponId,
              weaponMastery: curr.weaponMastery,
              isReady: true,
              isHost: true,
            },
          ];

    return slotsToRender.map((item, idx) => {
      const offset = SQUAD_OFFSETS[idx] || SQUAD_OFFSETS[0];
      const rig = build3DCharacterRig(THREE, {
        characterId: item.characterId,
        outfitId: item.outfitId,
        flameId: item.flameId,
        weaponId: item.weaponId,
        weaponMastery: item.weaponMastery,
      });
      rig.root.position.set(offset[0], offset[1], offset[2]);
      if (idx > 0) {
        rig.root.scale.setScalar(0.92);
        rig.root.rotation.y = idx === 1 ? 0.14 : idx === 2 ? -0.14 : 0.22;
      }
      turntable.add(rig.root);

      let pedestalRing: ThreeTypes.Mesh | undefined;
      if (idx > 0) {
        pedestalRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.62, 0.025, 10, 36),
          new THREE.MeshStandardMaterial({
            color: item.isReady ? 0x10b981 : 0xf59e0b,
            emissive: item.isReady ? 0x059669 : 0xd97706,
            emissiveIntensity: 1.9,
          })
        );
        pedestalRing.rotation.x = Math.PI / 2;
        pedestalRing.position.set(offset[0], offset[1] + 0.01, offset[2]);
        turntable.add(pedestalRing);
      }

      return {
        memberId: item.id,
        rig,
        pedestalRing,
        offset,
      };
    });
  };

  // Build 3D scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    let rafId = 0;
    let renderer: ThreeTypes.WebGLRenderer | null = null;
    let pmremTarget: ThreeTypes.WebGLRenderTarget | null = null;
    let contextLost = false;
    let resizeObs: ResizeObserver | null = null;
    let removePointerListeners: (() => void) | null = null;
    let lastMs = performance.now();

    const onVisibility = () => {
      if (!document.hidden) {
        lastMs = performance.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    loadThreeFromCdn()
      .then(({ THREE, RoomEnvironment }) => {
        if (cancelled || !mountRef.current) return;

        const w = Math.max(320, container.clientWidth || window.innerWidth);
        const h = Math.max(320, container.clientHeight || window.innerHeight);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x090e1a, 1);

        const canvas = renderer.domElement;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.cursor = 'grab';
        container.appendChild(canvas);

        const isSoftGl = isSoftwareWebGLRenderer(renderer);

        const onLost = (e: Event) => {
          e.preventDefault();
          contextLost = true;
        };
        const onRestored = () => {
          contextLost = false;
        };
        canvas.addEventListener('webglcontextlost', onLost);
        canvas.addEventListener('webglcontextrestored', onRestored);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x090e1a);
        scene.fog = new THREE.FogExp2(0x090e1a, 0.044);

        if (RoomEnvironment) {
          const pmrem = new THREE.PMREMGenerator(renderer);
          const envScene = new RoomEnvironment();
          pmremTarget = pmrem.fromScene(envScene, 0.04);
          scene.environment = pmremTarget.texture;
          disposeThreeObject(envScene);
          pmrem.dispose();
        }

        const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 80);
        const updateCameraFraming = (width: number, squadLen: number) => {
          const isWide = width >= 920;
          const squadPull = squadLen > 2 ? 1.55 : squadLen > 1 ? 0.9 : 0;
          camera.position.set(
            isWide ? -0.95 : 0,
            2.05 + squadPull * 0.18,
            (isWide ? 5.15 : 5.6) + squadPull
          );
          camera.lookAt(
            isWide ? (squadLen > 1 ? -0.35 : -0.68) : 0,
            1.32,
            squadLen > 1 ? -0.55 : 0
          );
        };
        updateCameraFraming(w, propsRef.current.partyMembers.length);

        const hemi = new THREE.HemisphereLight(0x38bdf8, 0x0b101b, 0.95);
        scene.add(hemi);

        const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.0);
        keyLight.position.set(4.5, 6.8, 5.2);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(isSoftGl ? 512 : 1024, isSoftGl ? 512 : 1024);
        keyLight.shadow.camera.near = 1;
        keyLight.shadow.camera.far = 20;
        keyLight.shadow.camera.left = -5;
        keyLight.shadow.camera.right = 5;
        keyLight.shadow.camera.top = 5;
        keyLight.shadow.camera.bottom = -5;
        keyLight.shadow.bias = -0.0005;
        scene.add(keyLight);

        const cyanRim = new THREE.DirectionalLight(0x22d3ee, 2.2);
        cyanRim.position.set(-4.2, 3.8, -3.5);
        scene.add(cyanRim);

        const amberRim = new THREE.PointLight(0xf59e0b, 3.4, 14, 1.5);
        amberRim.position.set(2.4, 1.8, -2.2);
        scene.add(amberRim);

        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(60, 60),
          new THREE.MeshStandardMaterial({
            color: 0x0b1220,
            roughness: 0.72,
            metalness: 0.25,
          })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.34;
        floor.receiveShadow = true;
        scene.add(floor);

        const cityGroup = new THREE.Group();
        const bldgMat = new THREE.MeshStandardMaterial({
          color: 0x111a2e,
          roughness: 0.85,
          metalness: 0.18,
        });
        const beaconAmber = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.5,
        });
        const beaconCyan = new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 1.3,
        });

        const silhouettes = [
          { x: -11, z: -13, w: 3.2, h: 11, d: 2.8, beacon: 'amber' },
          { x: -7, z: -15, w: 2.6, h: 14, d: 2.6, beacon: 'cyan' },
          { x: -2.8, z: -16, w: 3.8, h: 9.5, d: 3.0, beacon: 'none' },
          { x: 2.2, z: -14.5, w: 2.8, h: 13.5, d: 2.5, beacon: 'amber' },
          { x: 6.5, z: -13.5, w: 3.6, h: 10.2, d: 2.9, beacon: 'cyan' },
          { x: 10.5, z: -12, w: 3.0, h: 8.5, d: 2.6, beacon: 'amber' },
        ];
        silhouettes.forEach((b) => {
          const tower = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), bldgMat);
          tower.position.set(b.x, b.h * 0.5 - 0.4, b.z);
          cityGroup.add(tower);
          if (b.beacon !== 'none') {
            const strip = new THREE.Mesh(
              new THREE.BoxGeometry(b.w * 0.55, 0.14, 0.12),
              b.beacon === 'amber' ? beaconAmber : beaconCyan
            );
            strip.position.set(b.x, b.h * 0.72, b.z + b.d * 0.51);
            cityGroup.add(strip);
          }
        });
        scene.add(cityGroup);

        const stageAnchor = new THREE.Group();
        stageAnchor.position.set(0.45, 0, 0);
        scene.add(stageAnchor);

        const pedestalGroup = new THREE.Group();
        stageAnchor.add(pedestalGroup);

        const baseMat = new THREE.MeshStandardMaterial({
          color: 0x161f33,
          metalness: 0.78,
          roughness: 0.28,
        });
        const topDeck = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.52, 0.16, 48), baseMat);
        topDeck.position.y = -0.08;
        topDeck.receiveShadow = true;
        topDeck.castShadow = true;
        pedestalGroup.add(topDeck);

        const lowerPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.85, 0.18, 48), baseMat);
        lowerPlinth.position.y = -0.25;
        lowerPlinth.receiveShadow = true;
        pedestalGroup.add(lowerPlinth);

        const cyanRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.42, 0.022, 12, 64),
          new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x06b6d4,
            emissiveIntensity: 2.2,
          })
        );
        cyanRing.rotation.x = Math.PI / 2;
        cyanRing.position.y = 0.005;
        pedestalGroup.add(cyanRing);

        const amberOuterRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.68, 0.02, 12, 64),
          new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xd97706,
            emissiveIntensity: 1.8,
          })
        );
        amberOuterRing.rotation.x = Math.PI / 2;
        amberOuterRing.position.y = -0.15;
        pedestalGroup.add(amberOuterRing);

        const beamMatCyan = new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          transparent: true,
          opacity: 0.065,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const beamMatAmber = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.055,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const coneMain = new THREE.Mesh(new THREE.ConeGeometry(2.1, 6.2, 32, 1, true), beamMatCyan);
        coneMain.position.set(0, 3.05, 0);
        stageAnchor.add(coneMain);

        const coneWarm = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5.8, 28, 1, true), beamMatAmber);
        coneWarm.position.set(0.45, 2.9, -0.2);
        coneWarm.rotation.z = 0.14;
        stageAnchor.add(coneWarm);

        const particleCount = isSoftGl ? 65 : 140;
        const posArr = new Float32Array(particleCount * 3);
        const velArr = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
          posArr[i * 3] = (Math.random() - 0.5) * 9.5;
          posArr[i * 3 + 1] = -0.2 + Math.random() * 5.2;
          posArr[i * 3 + 2] = (Math.random() - 0.5) * 6.5 - 0.6;
          velArr[i] = 0.22 + Math.random() * 0.45;
        }
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        const emberTex = makeEmberGlowTexture(THREE);
        const particleMat = new THREE.PointsMaterial({
          map: emberTex,
          color: 0xfbbf24,
          size: 0.14,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const embers = new THREE.Points(particleGeo, particleMat);
        scene.add(embers);

        const turntable = new THREE.Group();
        stageAnchor.add(turntable);

        const initialSlots = rebuildSquadRigs(THREE, turntable, []);

        sceneRefs.current = {
          THREE,
          scene,
          camera,
          turntable,
          squadSlots: initialSlots,
          actionTimer: 0,
          actionType: 'switch',
          updateFraming: updateCameraFraming,
        };
        setWebglReady(true);

        let dragging = false;
        let lastX = 0;
        let spinVelocity = 0;

        const onPointerDown = (e: PointerEvent) => {
          dragging = true;
          lastX = e.clientX;
          spinVelocity = 0;
          canvas.style.cursor = 'grabbing';
        };
        const onPointerMove = (e: PointerEvent) => {
          if (!dragging) return;
          const dx = e.clientX - lastX;
          lastX = e.clientX;
          const deltaAngle = dx * 0.011;
          turntable.rotation.y += deltaAngle;
          spinVelocity = deltaAngle * 35;
        };
        const onPointerUp = () => {
          if (dragging) {
            dragging = false;
            canvas.style.cursor = 'grab';
          }
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        resizeObs = new ResizeObserver(() => {
          if (!renderer || !container) return;
          const nw = Math.max(320, container.clientWidth);
          const nh = Math.max(320, container.clientHeight);
          camera.aspect = nw / nh;
          updateCameraFraming(nw, propsRef.current.partyMembers.length);
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        });
        resizeObs.observe(container);

        lastMs = performance.now();
        let elapsed = 0;
        const projVec = new THREE.Vector3();

        const animate = (nowMs: number) => {
          if (cancelled) return;
          rafId = requestAnimationFrame(animate);
          if (contextLost || !renderer || pausedRef.current || document.hidden) {
            lastMs = nowMs;
            return;
          }

          const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastMs) / 1000));
          lastMs = nowMs;
          elapsed += dt;

          const hasSquad = propsRef.current.partyMembers.length > 1;

          if (!dragging) {
            if (Math.abs(spinVelocity) > 0.02) {
              turntable.rotation.y += spinVelocity * dt;
              spinVelocity *= Math.pow(0.06, dt);
            } else {
              // Gentle oscillation when squad is shown so teammates remain facing camera cleanly
              if (hasSquad) {
                const targetAngle = Math.sin(elapsed * 0.38) * 0.22;
                turntable.rotation.y += (targetAngle - turntable.rotation.y) * Math.min(1, dt * 2);
              } else {
                turntable.rotation.y += dt * 0.28;
              }
            }
          }
          pedestalGroup.rotation.y = -elapsed * 0.14;

          const state = sceneRefs.current;
          if (state) {
            if (state.actionTimer > 0) {
              state.actionTimer = Math.max(0, state.actionTimer - dt);
            }
            const p = state.actionTimer / 0.55;
            const wave = state.actionTimer > 0 ? Math.sin(p * Math.PI) : 0;

            state.squadSlots.forEach((slot, idx) => {
              const rig = slot.rig;
              const phase = elapsed * 2.2 + idx * 1.3;
              const breathe = Math.sin(phase) * 0.016;
              rig.bodyPivot.position.y = breathe;
              rig.headGroup.rotation.y = Math.sin(elapsed * 1.1 + idx) * 0.08;
              rig.headGroup.rotation.x = Math.sin(elapsed * 1.6 + idx) * 0.035;

              const fPulse = 0.85 + Math.sin(elapsed * 18 + idx) * 0.18;
              rig.flameLeft.scale.set(1, fPulse, 1);
              rig.flameRight.scale.set(1, fPulse, 1);

              if (idx === 0 && state.actionTimer > 0) {
                if (state.actionType === 'ready') {
                  rig.weaponGroup.position.set(0.06, 1.24 + wave * 0.24, 0.46 - wave * 0.06);
                  rig.weaponGroup.rotation.set(0.06 - wave * 0.42, -0.32 + wave * 0.25, 0.14);
                  rig.rightArmGroup.rotation.x = -wave * 0.38;
                  rig.leftArmGroup.rotation.x = -wave * 0.35;
                  rig.headGroup.rotation.x = -wave * 0.1;
                } else {
                  rig.weaponGroup.position.set(0.06, 1.24 + wave * 0.14, 0.46 + wave * 0.08);
                  rig.weaponGroup.rotation.set(0.06, -0.32 + wave * 0.38, 0.14 - wave * 0.28);
                  rig.rightArmGroup.rotation.z = wave * 0.25;
                  rig.bodyPivot.position.y = breathe + wave * 0.06;
                }
              } else {
                rig.weaponGroup.position.set(0.06, 1.24 + Math.sin(phase + 0.5) * 0.014, 0.46);
                rig.weaponGroup.rotation.set(0.06, -0.32, 0.14);
                rig.rightArmGroup.rotation.set(0, 0, 0);
                rig.leftArmGroup.rotation.set(0, 0, 0);
              }
            });
          }

          const posAttr = particleGeo.getAttribute('position') as ThreeTypes.BufferAttribute;
          const arr = posAttr.array as Float32Array;
          for (let i = 0; i < particleCount; i++) {
            arr[i * 3 + 1] += velArr[i] * dt;
            arr[i * 3] += Math.sin(elapsed * 0.8 + i) * 0.12 * dt;
            if (arr[i * 3 + 1] > 5.0) {
              arr[i * 3 + 1] = -0.25;
              arr[i * 3] = (Math.random() - 0.5) * 9.5;
            }
          }
          posAttr.needsUpdate = true;

          renderer.render(scene, camera);

          // Update projected 2D coordinates for Squad Nameplates
          if (state && propsRef.current.partyMembers.length > 0 && container) {
            const cw = container.clientWidth;
            const ch = container.clientHeight;
            state.squadSlots.forEach((slot, idx) => {
              const el = nameplateRefs.current[idx];
              if (!el) return;
              slot.rig.headGroup.getWorldPosition(projVec);
              projVec.y += idx === 0 ? 0.82 : 0.76;
              projVec.project(camera);
              if (projVec.z > 1) {
                el.style.opacity = '0';
                return;
              }
              const sx = (projVec.x * 0.5 + 0.5) * cw;
              const sy = (-projVec.y * 0.5 + 0.5) * ch;
              el.style.opacity = '1';
              el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
            });
          }
        };

        rafId = requestAnimationFrame(animate);

        removePointerListeners = () => {
          canvas.removeEventListener('pointerdown', onPointerDown);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
        };
      })
      .catch(() => {
        setWebglReady(false);
      });

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId) cancelAnimationFrame(rafId);
      if (removePointerListeners) removePointerListeners();
      if (resizeObs) resizeObs.disconnect();
      if (sceneRefs.current) {
        disposeThreeObject(sceneRefs.current.scene);
        sceneRefs.current = null;
      }
      if (pmremTarget) pmremTarget.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  // Hot-swap 3D character(s), outfits, flames, weapon skins, or squad roster
  const partySignature = partyMembers
    .map((m) => `${m.id}:${m.characterId}:${m.outfitId}:${m.flameId}:${m.startingWeapon}:${m.weaponMastery}:${m.isReady}`)
    .join('|');

  useEffect(() => {
    const state = sceneRefs.current;
    if (!state) return;

    state.squadSlots = rebuildSquadRigs(state.THREE, state.turntable, state.squadSlots);
    const width = mountRef.current?.clientWidth || window.innerWidth;
    state.updateFraming(width, partyMembers.length);
    state.camera.updateProjectionMatrix();
    state.actionType = 'switch';
    state.actionTimer = 0.55;
  }, [characterId, outfitId, flameId, weaponId, weaponMastery, partySignature]);

  useEffect(() => {
    if (!actionSignal || !sceneRefs.current) return;
    sceneRefs.current.actionType = actionSignal.type;
    sceneRefs.current.actionTimer = 0.55;
  }, [actionSignal]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#090E1A]">
      {!webglReady && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 65% 45%, rgba(34,211,238,0.16), rgba(11,16,27,0.96) 62%)',
          }}
        />
      )}
      <div ref={mountRef} className="h-full w-full" />

      {/* Projected 3D Squad Floating Nameplates (no backdrop-blur over WebGL) */}
      {partyMembers.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {partyMembers.slice(0, 4).map((m, idx) => {
            const equippedWeapon = WEAPONS[m.startingWeapon] || WEAPONS.ak;
            const equippedSecondary = m.secondaryWeapon ? WEAPONS[m.secondaryWeapon] : WEAPONS.pistol;
            const equippedMelee = m.meleeWeapon ? MELEE_WEAPONS[m.meleeWeapon] : MELEE_WEAPONS.knife;
            const masteryAccent =
              m.weaponMastery === 'diamond'
                ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-300'
                : m.weaponMastery === 'gold'
                ? 'border-amber-400/70 bg-amber-500/10 text-amber-300'
                : m.weaponMastery === 'camo'
                ? 'border-lime-500/60 bg-lime-500/10 text-lime-300'
                : 'border-slate-700/80 bg-slate-900/90 text-slate-200';

            return (
              <div
                key={m.id}
                ref={(el) => {
                  nameplateRefs.current[idx] = el;
                }}
                style={{ opacity: 0 }}
                className="absolute left-0 top-0 flex flex-col items-center transition-opacity duration-200"
              >
                <div className="flex items-stretch gap-2 rounded-lg border border-slate-700 bg-[#0B101B]/92 px-2.5 py-1.5 shadow-lg">
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          m.isHost
                            ? 'bg-amber-500/20 text-amber-300'
                            : m.isReady
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.isHost ? 'LEADER' : m.isReady ? 'READY' : 'NOT READY'}
                      </span>
                      {m.isAi && (
                        <span className="rounded bg-cyan-500/20 px-1 py-0.5 text-[8px] font-bold uppercase text-cyan-300">
                          BOT
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 whitespace-nowrap text-xs font-extrabold text-white">
                      {m.username}
                    </div>
                    <div className="font-mono text-[9px] text-slate-400">
                      {m.rankTitle} · {m.playerTag}
                    </div>
                  </div>

                  {/* Equipped Weapon Icon beside Nameplate */}
                  <div
                    className={`flex min-w-[54px] flex-col items-center justify-center rounded-md border px-1.5 py-1 ${masteryAccent}`}
                    title={`Primary: ${equippedWeapon.name} · Secondary: ${equippedSecondary.shortName} · Melee: ${equippedMelee.shortName}`}
                  >
                    <SquadWeaponGlyph weaponId={equippedWeapon.id} />
                    <span className="mt-0.5 max-w-[60px] truncate font-mono text-[8px] font-bold uppercase tracking-wide">
                      {equippedWeapon.shortName}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-0.5 bg-cyan-400/60" />
              </div>
            );
          })}
        </div>
      )}

      {/* Subtle left & bottom legibility scrim without backdrop-blur */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#090E1A]/85 via-[#090E1A]/25 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090E1A]/90 via-transparent to-[#090E1A]/45" />
    </div>
  );
};
