import React, { useEffect, useRef, useState } from 'react';
import type * as ThreeTypes from 'three';
import { MELEE_WEAPONS, WEAPONS } from '../data/catalog';
import {
  build3DCharacterRig,
  makeEmberGlowTexture,
  RigRefs,
} from '../three/characterRig3D';
import {
  disposeThreeObject,
  isSoftwareWebGLRenderer,
  loadThreeFromCdn,
  ThreeModule,
} from '../three/threeCdn';
import {
  CharacterId,
  FlameColorId,
  GunWrapId,
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
  gunWrap?: GunWrapId;
  partyMembers?: PartyMember[];
  paused?: boolean;
  actionSignal?: LobbyActionSignal | null;
}

interface SquadSlotEntry {
  memberId: string;
  rig: RigRefs;
  pedestalRing?: ThreeTypes.Mesh;
  offset: [number, number, number];
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
  if (weapon.category === 'Minigun') {
    return (
      <svg viewBox="0 0 28 12" className="h-3.5 w-7 shrink-0" aria-hidden="true">
        <path
          d="M2 4h11v4.2H2V4zm11 0.5h13v1H13v-1zm0 2h13v1H13v-1zm-7 1.7h5V11H6V8.2z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Crossbow') {
    return (
      <svg viewBox="0 0 26 12" className="h-3.5 w-6.5 shrink-0" aria-hidden="true">
        <path
          d="M2 6h14V4l3.5-2.5L21 2.7 18.2 5H24l-2.5 1L24 7h-5.8L21 9.3l-1.5 1.2L16 8V6H2z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Energy' || weapon.category === 'Cryo') {
    return (
      <svg viewBox="0 0 26 12" className="h-3.5 w-6.5 shrink-0" aria-hidden="true">
        <path
          d="M1 5.5h5l1.5-2h11l1.5 1.5h4v2h-4l-1.5 1.5H11l-1.2 2H7l.8-2H1v-3zm8.5-.7v2.4h6.5V4.8H9.5z"
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
  gunWrap = 'none',
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
    gunWrap,
    partyMembers,
  });
  propsRef.current = {
    characterId,
    outfitId,
    flameId,
    weaponId,
    weaponMastery,
    gunWrap,
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
            gunWrap: idx === 0 && m.isHost ? curr.gunWrap : m.gunWrap || 'none',
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
              gunWrap: curr.gunWrap || 'none',
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
        gunWrap: item.gunWrap,
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

              rig.floatProps.forEach((fp) => {
                fp.obj.position.y = fp.baseY + Math.sin(elapsed * fp.speed + fp.phase) * fp.amp;
              });
              if (rig.minigunBarrelSpin) {
                rig.minigunBarrelSpin.rotation.x = elapsed * 2.8;
              }

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

  // Hot-swap 3D character(s), outfits, flames, weapon skins, wraps, or squad roster
  const partySignature = partyMembers
    .map(
      (m) =>
        `${m.id}:${m.characterId}:${m.outfitId}:${m.flameId}:${m.startingWeapon}:${m.weaponMastery}:${m.gunWrap || 'none'}:${m.isReady}`
    )
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
  }, [characterId, outfitId, flameId, weaponId, weaponMastery, gunWrap, partySignature]);

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
