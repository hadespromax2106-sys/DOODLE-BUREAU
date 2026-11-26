import React, { useEffect, useRef, useState } from 'react';
import type * as ThreeTypes from 'three';
import { CHARACTERS, getGameModeDef, MAP_CATALOG } from '../data/catalog';
import { build3DCharacterRig, makeEmberGlowTexture } from '../three/characterRig3D';
import {
  disposeThreeObject,
  isSoftwareWebGLRenderer,
  loadThreeFromCdn,
} from '../three/threeCdn';
import {
  CharacterId,
  FlameColorId,
  GunWrapId,
  MatchSummary,
  OutfitId,
  WeaponId,
  WeaponMasteryTier,
} from '../types/game';

export interface MvpWinnerMeta {
  characterId: CharacterId;
  outfitId: OutfitId;
  flameId: FlameColorId;
  weaponId: WeaponId;
  weaponMastery: WeaponMasteryTier;
  gunWrap: GunWrapId;
}

interface VictoryMvpSpotlightModalProps {
  summary: MatchSummary;
  winnerMeta?: MvpWinnerMeta;
  onContinue: () => void;
}

export const VictoryMvpSpotlightModal: React.FC<VictoryMvpSpotlightModalProps> = ({
  summary,
  winnerMeta,
  onContinue,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [countdown, setCountdown] = useState(8);
  const [webglReady, setWebglReady] = useState(false);

  // Pick top K/D or winner from standings
  const mvp = React.useMemo(() => {
    const sorted = [...summary.standings].sort((a, b) => {
      const kdrA = a.kills / Math.max(1, a.deaths);
      const kdrB = b.kills / Math.max(1, b.deaths);
      if (Math.abs(kdrB - kdrA) > 0.001) return kdrB - kdrA;
      return b.kills - a.kills;
    });
    return sorted[0] || summary.standings[0];
  }, [summary]);

  const charDef = CHARACTERS.find((c) => c.id === mvp?.characterId) || CHARACTERS[0];
  const modeDef = getGameModeDef(summary.gameMode);
  const mapDef = MAP_CATALOG.find((m) => m.id === summary.mapId);
  const kdr = mvp ? (mvp.kills / Math.max(1, mvp.deaths)).toFixed(2) : '0.00';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onContinue]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !mvp) return;

    let cancelled = false;
    let rafId = 0;
    let renderer: ThreeTypes.WebGLRenderer | null = null;
    let scene: ThreeTypes.Scene | null = null;
    let pmremTarget: ThreeTypes.WebGLRenderTarget | null = null;
    let resizeObs: ResizeObserver | null = null;
    let contextLost = false;
    let lastMs = performance.now();

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
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x070b14, 1);

        const canvas = renderer.domElement;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        container.appendChild(canvas);

        const onLost = (e: Event) => {
          e.preventDefault();
          contextLost = true;
        };
        const onRestored = () => {
          contextLost = false;
        };
        canvas.addEventListener('webglcontextlost', onLost);
        canvas.addEventListener('webglcontextrestored', onRestored);

        const isSoftGl = isSoftwareWebGLRenderer(renderer);
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x070b14);
        scene.fog = new THREE.FogExp2(0x070b14, 0.055);

        if (RoomEnvironment) {
          const pmrem = new THREE.PMREMGenerator(renderer);
          const envScene = new RoomEnvironment();
          pmremTarget = pmrem.fromScene(envScene, 0.04);
          scene.environment = pmremTarget.texture;
          disposeThreeObject(envScene);
          pmrem.dispose();
        }

        const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 60);
        camera.position.set(0, 2.1, 4.9);
        camera.lookAt(0, 1.38, 0);

        const hemi = new THREE.HemisphereLight(0xfde68a, 0x0f172a, 1.0);
        scene.add(hemi);

        const keySpot = new THREE.DirectionalLight(0xfffbeb, 2.3);
        keySpot.position.set(3.4, 6.2, 4.8);
        keySpot.castShadow = true;
        keySpot.shadow.mapSize.set(isSoftGl ? 512 : 1024, isSoftGl ? 512 : 1024);
        keySpot.shadow.bias = -0.0005;
        scene.add(keySpot);

        const goldRim = new THREE.PointLight(0xf59e0b, 4.0, 14, 1.4);
        goldRim.position.set(2.3, 2.2, -1.8);
        scene.add(goldRim);

        const cyanRim = new THREE.PointLight(0x22d3ee, 3.6, 14, 1.4);
        cyanRim.position.set(-2.3, 2.4, -1.8);
        scene.add(cyanRim);

        // Arena Floor
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(40, 40),
          new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.72, metalness: 0.25 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.34;
        floor.receiveShadow = true;
        scene.add(floor);

        // Hero Gold/Cyan Pedestal
        const pedestalGroup = new THREE.Group();
        scene.add(pedestalGroup);

        const baseMat = new THREE.MeshStandardMaterial({
          color: 0x161f33,
          metalness: 0.82,
          roughness: 0.24,
        });
        const topDeck = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.5, 0.18, 48), baseMat);
        topDeck.position.y = -0.09;
        topDeck.receiveShadow = true;
        pedestalGroup.add(topDeck);

        const lowerPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.85, 0.18, 48), baseMat);
        lowerPlinth.position.y = -0.25;
        lowerPlinth.receiveShadow = true;
        pedestalGroup.add(lowerPlinth);

        const goldRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.4, 0.032, 12, 64),
          new THREE.MeshStandardMaterial({
            color: 0xfacc15,
            emissive: 0xd97706,
            emissiveIntensity: 2.3,
          })
        );
        goldRing.rotation.x = Math.PI / 2;
        goldRing.position.y = 0.005;
        pedestalGroup.add(goldRing);

        const cyanRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.68, 0.025, 12, 64),
          new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x06b6d4,
            emissiveIntensity: 1.9,
          })
        );
        cyanRing.rotation.x = Math.PI / 2;
        cyanRing.position.y = -0.15;
        pedestalGroup.add(cyanRing);

        // Volumetric Victory Spotlight Cone
        const beamGold = new THREE.Mesh(
          new THREE.ConeGeometry(2.05, 6.4, 32, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xfbbf24,
            transparent: true,
            opacity: 0.075,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        beamGold.position.set(0, 3.1, 0);
        scene.add(beamGold);

        // MVP Character Rig
        const turntable = new THREE.Group();
        scene.add(turntable);

        const rig = build3DCharacterRig(THREE, {
          characterId: winnerMeta?.characterId || mvp.characterId,
          outfitId: winnerMeta?.outfitId || 'charcoal',
          flameId: winnerMeta?.flameId || 'gold',
          weaponId: winnerMeta?.weaponId || 'ak',
          weaponMastery: winnerMeta?.weaponMastery || 'gold',
          gunWrap: winnerMeta?.gunWrap || 'none',
        });
        turntable.add(rig.root);

        // 3D Confetti + Sparkle Shower
        const confettiCount = isSoftGl ? 90 : 180;
        const confettiPos = new Float32Array(confettiCount * 3);
        const confettiCol = new Float32Array(confettiCount * 3);
        const confettiVel = new Float32Array(confettiCount * 3);
        const palette = [
          new THREE.Color(0xfacc15),
          new THREE.Color(0x22d3ee),
          new THREE.Color(0xf43f5e),
          new THREE.Color(0x34d399),
          new THREE.Color(0xf97316),
          new THREE.Color(0xa855f7),
        ];
        for (let i = 0; i < confettiCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 0.25 + Math.random() * 2.9;
          confettiPos[i * 3] = Math.cos(angle) * dist;
          confettiPos[i * 3 + 1] = 0.4 + Math.random() * 4.5;
          confettiPos[i * 3 + 2] = Math.sin(angle) * dist;
          confettiVel[i * 3] = (Math.random() - 0.5) * 0.45;
          confettiVel[i * 3 + 1] = -(0.65 + Math.random() * 0.95);
          confettiVel[i * 3 + 2] = (Math.random() - 0.5) * 0.45;
          const c = palette[i % palette.length];
          confettiCol[i * 3] = c.r;
          confettiCol[i * 3 + 1] = c.g;
          confettiCol[i * 3 + 2] = c.b;
        }
        const confettiGeo = new THREE.BufferGeometry();
        confettiGeo.setAttribute('position', new THREE.BufferAttribute(confettiPos, 3));
        confettiGeo.setAttribute('color', new THREE.BufferAttribute(confettiCol, 3));
        const emberTex = makeEmberGlowTexture(THREE);
        const confettiMat = new THREE.PointsMaterial({
          map: emberTex,
          size: 0.16,
          vertexColors: true,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const confetti = new THREE.Points(confettiGeo, confettiMat);
        scene.add(confetti);

        setWebglReady(true);

        resizeObs = new ResizeObserver(() => {
          if (!renderer || !container) return;
          const nw = Math.max(320, container.clientWidth);
          const nh = Math.max(320, container.clientHeight);
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        });
        resizeObs.observe(container);

        let elapsed = 0;
        lastMs = performance.now();

        const animate = (nowMs: number) => {
          if (cancelled) return;
          rafId = requestAnimationFrame(animate);
          if (contextLost || !renderer || !scene || document.hidden) {
            lastMs = nowMs;
            return;
          }
          const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastMs) / 1000));
          lastMs = nowMs;
          elapsed += dt;

          // Victory Dance & Turntable Rotation
          turntable.rotation.y = Math.sin(elapsed * 0.8) * 0.45;
          pedestalGroup.rotation.y = -elapsed * 0.35;

          const jumpBeat = Math.abs(Math.sin(elapsed * 5.2));
          rig.bodyPivot.position.y = jumpBeat * 0.14;
          rig.bodyPivot.rotation.z = Math.sin(elapsed * 2.6) * 0.06;
          rig.headGroup.rotation.y = Math.sin(elapsed * 3.1) * 0.22;
          rig.headGroup.rotation.z = Math.sin(elapsed * 5.2) * 0.08;

          // Cheering weapon raise + waving arm
          rig.weaponGroup.position.set(0.06, 1.38 + jumpBeat * 0.14, 0.46);
          rig.weaponGroup.rotation.set(-0.35 + Math.sin(elapsed * 5.2) * 0.12, -0.22, 0.18);
          rig.rightArmGroup.rotation.x = -0.45 + Math.sin(elapsed * 6.5) * 0.25;
          rig.leftArmGroup.rotation.x = -0.35 + Math.cos(elapsed * 6.5) * 0.2;
          rig.leftArmGroup.rotation.z = 0.25 + Math.sin(elapsed * 6.5) * 0.28;

          const fPulse = 1.0 + Math.sin(elapsed * 22) * 0.25;
          rig.flameLeft.scale.set(1.1, fPulse * 1.25, 1.1);
          rig.flameRight.scale.set(1.1, fPulse * 1.25, 1.1);

          rig.floatProps.forEach((fp) => {
            fp.obj.position.y = fp.baseY + Math.sin(elapsed * fp.speed + fp.phase) * fp.amp;
          });
          if (rig.minigunBarrelSpin) {
            rig.minigunBarrelSpin.rotation.x = elapsed * 4.5;
          }

          // Update Confetti
          const posAttr = confettiGeo.getAttribute('position') as ThreeTypes.BufferAttribute;
          const arr = posAttr.array as Float32Array;
          for (let i = 0; i < confettiCount; i++) {
            arr[i * 3] += (confettiVel[i * 3] + Math.sin(elapsed * 2.4 + i) * 0.35) * dt;
            arr[i * 3 + 1] += confettiVel[i * 3 + 1] * dt;
            arr[i * 3 + 2] += (confettiVel[i * 3 + 2] + Math.cos(elapsed * 2.1 + i) * 0.35) * dt;
            if (arr[i * 3 + 1] < -0.2) {
              const angle = Math.random() * Math.PI * 2;
              const dist = 0.2 + Math.random() * 2.7;
              arr[i * 3] = Math.cos(angle) * dist;
              arr[i * 3 + 1] = 4.4 + Math.random() * 0.8;
              arr[i * 3 + 2] = Math.sin(angle) * dist;
            }
          }
          posAttr.needsUpdate = true;

          renderer.render(scene, camera);
        };

        rafId = requestAnimationFrame(animate);
      })
      .catch(() => {
        setWebglReady(false);
      });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeObs) resizeObs.disconnect();
      if (scene) {
        disposeThreeObject(scene);
        scene = null;
      }
      if (pmremTarget) pmremTarget.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [mvp, winnerMeta]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#070B14] text-slate-100">
      <div className="absolute inset-0">
        {!webglReady && (
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 42%, rgba(250,204,21,0.22), rgba(7,11,20,0.98) 65%)',
            }}
          />
        )}
        <div ref={mountRef} className="h-full w-full" />
      </div>

      {/* Top MVP Spotlight Banner */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5">
        <div className="rounded-xl border border-amber-400/50 bg-[#0B101B]/90 px-5 py-3 shadow-xl">
          <div className="flex items-center gap-2.5">
            <span className="rounded bg-amber-400 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-slate-950">
              MATCH MVP SPOTLIGHT
            </span>
            <span className="font-mono text-xs uppercase text-cyan-300">
              {modeDef.name} {mapDef ? `· ${mapDef.shortName}` : ''}
            </span>
          </div>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-white">
            {mvp?.name || 'Bureau Champion'}
          </h2>
          <p className="text-xs font-semibold text-amber-300">
            {charDef.name} · {mvp?.rankTitle || 'Operative'}
          </p>
        </div>

        <button
          onClick={onContinue}
          className="rounded-xl border border-amber-400/60 bg-amber-500 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-amber-400"
        >
          View Match Summary ({countdown}s)
        </button>
      </div>

      {/* Bottom Stats Strip */}
      <div className="relative z-10 mx-auto mb-6 w-full max-w-3xl px-4">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-700/80 bg-[#0B101B]/92 p-4 shadow-2xl sm:grid-cols-5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-center">
            <div className="font-mono text-[10px] uppercase text-slate-400">Kills</div>
            <div className="text-xl font-black text-emerald-400">{mvp?.kills ?? 0}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-center">
            <div className="font-mono text-[10px] uppercase text-slate-400">Deaths</div>
            <div className="text-xl font-black text-rose-400">{mvp?.deaths ?? 0}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-center">
            <div className="font-mono text-[10px] uppercase text-slate-400">K / D Ratio</div>
            <div className="text-xl font-black text-amber-300">{kdr}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-center">
            <div className="font-mono text-[10px] uppercase text-slate-400">Damage</div>
            <div className="text-xl font-black text-cyan-300">{Math.round(mvp?.damageDealt ?? 0)}</div>
          </div>
          <div className="col-span-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-center sm:col-span-1">
            <div className="font-mono text-[10px] uppercase text-slate-400">Revenge / Afterlife</div>
            <div className="text-xl font-black text-fuchsia-300">
              {(mvp?.nemesisKills ?? 0) + (mvp?.afterlifeKills ?? 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
