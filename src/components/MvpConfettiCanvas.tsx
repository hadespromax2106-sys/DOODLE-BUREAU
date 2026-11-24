import React, { useEffect, useRef } from 'react';
import type * as ThreeTypes from 'three';
import { isSoftwareWebGLRenderer, loadThreeFromCdn } from '../three/threeCdn';

interface MvpConfettiCanvasProps {
  className?: string;
  paused?: boolean;
}

interface ConfettiParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  swayPhase: number;
  scale: number;
}

const CONFETTI_PALETTE = [
  0xfacc15, // gold
  0xf59e0b, // amber
  0x38bdf8, // sky cyan
  0xf43f5e, // rose
  0x10b981, // emerald
  0xfef08a, // pale gold
];

export const MvpConfettiCanvas: React.FC<MvpConfettiCanvasProps> = ({
  className = '',
  paused = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let rafId = 0;
    let renderer: ThreeTypes.WebGLRenderer | null = null;
    let geometry: ThreeTypes.PlaneGeometry | null = null;
    let material: ThreeTypes.MeshStandardMaterial | null = null;
    let contextLost = false;
    let resizeObs: ResizeObserver | null = null;
    let lastMs = performance.now();

    const onVisibility = () => {
      if (!document.hidden) {
        lastMs = performance.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    loadThreeFromCdn()
      .then(({ THREE }) => {
        if (cancelled || !containerRef.current) return;

        const w = Math.max(120, container.clientWidth || 160);
        const h = Math.max(120, container.clientHeight || 160);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.setClearColor(0x000000, 0);

        const canvas = renderer.domElement;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'none';
        container.appendChild(canvas);

        const isSoftGl = isSoftwareWebGLRenderer(renderer);
        const count = isSoftGl ? 68 : 150;

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
        const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 30);
        camera.position.set(0, 0.15, 4.4);
        camera.lookAt(0, 0, 0);

        const hemi = new THREE.HemisphereLight(0xfffbeb, 0x1e293b, 1.35);
        scene.add(hemi);

        const keyLight = new THREE.DirectionalLight(0xfff3c4, 1.8);
        keyLight.position.set(2.5, 4, 3.5);
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
        rimLight.position.set(-2.5, 2, -2);
        scene.add(rimLight);

        geometry = new THREE.PlaneGeometry(0.11, 0.06);
        material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.28,
          metalness: 0.45,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.InstancedMesh(geometry, material, count);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(mesh);

        const particles: ConfettiParticle[] = [];
        const tmpColor = new THREE.Color();
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.4 + Math.random() * 2.5;
          particles.push({
            x: (Math.random() - 0.5) * 0.45,
            y: -0.15 + Math.random() * 0.4,
            z: (Math.random() - 0.5) * 0.55,
            vx: Math.cos(angle) * speed * 0.72,
            vy: 1.6 + Math.random() * 2.4,
            vz: Math.sin(angle) * speed * 0.48,
            rx: Math.random() * Math.PI * 2,
            ry: Math.random() * Math.PI * 2,
            rz: Math.random() * Math.PI * 2,
            vrx: (Math.random() - 0.5) * 9,
            vry: (Math.random() - 0.5) * 9,
            vrz: (Math.random() - 0.5) * 7,
            swayPhase: Math.random() * Math.PI * 2,
            scale: 0.75 + Math.random() * 0.75,
          });
          tmpColor.setHex(CONFETTI_PALETTE[i % CONFETTI_PALETTE.length]);
          mesh.setColorAt(i, tmpColor);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        const dummy = new THREE.Object3D();
        lastMs = performance.now();
        let elapsed = 0;

        resizeObs = new ResizeObserver(() => {
          if (!renderer || !container) return;
          const nw = Math.max(120, container.clientWidth);
          const nh = Math.max(120, container.clientHeight);
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        });
        resizeObs.observe(container);

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

          for (let i = 0; i < count; i++) {
            const p = particles[i];
            p.vy -= 2.45 * dt;
            // Air drag & gentle horizontal flutter
            p.vx *= 1 - 1.15 * dt;
            p.vz *= 1 - 1.15 * dt;
            p.x += (p.vx + Math.sin(elapsed * 4.5 + p.swayPhase) * 0.42) * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rx += p.vrx * dt;
            p.ry += p.vry * dt;
            p.rz += p.vrz * dt;

            if (p.y < -1.85) {
              // Respawn cleanly at top / center shower loop
              p.x = (Math.random() - 0.5) * 2.1;
              p.y = 1.65 + Math.random() * 0.55;
              p.z = (Math.random() - 0.5) * 0.9;
              p.vx = (Math.random() - 0.5) * 0.9;
              p.vy = -0.3 - Math.random() * 0.7;
              p.vz = (Math.random() - 0.5) * 0.5;
            }

            dummy.position.set(p.x, p.y, p.z);
            dummy.rotation.set(p.rx, p.ry, p.rz);
            dummy.scale.setScalar(p.scale);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          }

          mesh.instanceMatrix.needsUpdate = true;
          renderer.render(scene, camera);
        };

        rafId = requestAnimationFrame(animate);
      })
      .catch(() => {
        // Silent graceful degradation if CDN is unreachable
      });

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeObs) resizeObs.disconnect();
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};
