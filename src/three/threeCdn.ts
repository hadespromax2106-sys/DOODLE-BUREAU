import type * as ThreeTypes from 'three';

export type ThreeModule = typeof ThreeTypes;

export interface LoadedThreeBundle {
  THREE: ThreeModule;
  RoomEnvironment: (new () => ThreeTypes.Scene) | null;
}

const THREE_CDN_URL = 'https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.module.js';
const ROOM_ENV_CDN_URL =
  'https://cdn.jsdelivr.net/npm/three@0.175.0/examples/jsm/environments/RoomEnvironment.js';

let cachedPromise: Promise<LoadedThreeBundle> | null = null;

export function loadThreeFromCdn(): Promise<LoadedThreeBundle> {
  if (!cachedPromise) {
    cachedPromise = (async () => {
      const THREE = (await import(/* @vite-ignore */ THREE_CDN_URL)) as ThreeModule;
      let RoomEnvironment: (new () => ThreeTypes.Scene) | null = null;
      try {
        const envMod = (await import(/* @vite-ignore */ ROOM_ENV_CDN_URL)) as {
          RoomEnvironment?: new () => ThreeTypes.Scene;
        };
        if (envMod && typeof envMod.RoomEnvironment === 'function') {
          RoomEnvironment = envMod.RoomEnvironment;
        }
      } catch {
        RoomEnvironment = null;
      }
      return { THREE, RoomEnvironment };
    })();
  }
  return cachedPromise;
}

export function isSoftwareWebGLRenderer(renderer: ThreeTypes.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return false;
    const label = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(label);
  } catch {
    return false;
  }
}

export function disposeThreeObject(root: ThreeTypes.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as ThreeTypes.Mesh;
    if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
      mesh.geometry.dispose();
    }
    const mat = (mesh as { material?: ThreeTypes.Material | ThreeTypes.Material[] }).material;
    if (mat) {
      const list = Array.isArray(mat) ? mat : [mat];
      for (const m of list) {
        if (!m) continue;
        const texKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'] as const;
        for (const k of texKeys) {
          const maybeTex = (m as unknown as Record<string, unknown>)[k];
          if (maybeTex && typeof (maybeTex as ThreeTypes.Texture).dispose === 'function') {
            (maybeTex as ThreeTypes.Texture).dispose();
          }
        }
        m.dispose();
      }
    }
  });
}
