import React, { useRef, useState } from 'react';
import { Bomb, Crosshair, Flame, RotateCw, Swords, Zap } from 'lucide-react';
import { ArenaGameEngine } from '../game/engine';
import { GrenadeType } from '../types/game';

interface TouchControlsOverlayProps {
  engine: ArenaGameEngine | null;
  grenades: number;
  grenadeType: GrenadeType;
  ultReady: boolean;
  onOpenEmoteWheel?: () => void;
  onOpenSprayWheel?: () => void;
}

export const TouchControlsOverlay: React.FC<TouchControlsOverlayProps> = ({
  engine,
  grenades,
  grenadeType,
  ultReady,
  onOpenEmoteWheel,
  onOpenSprayWheel,
}) => {
  const [leftStick, setLeftStick] = useState({ dx: 0, dy: 0, active: false });
  const [rightStick, setRightStick] = useState({ dx: 0, dy: 0, active: false });
  const leftOrigin = useRef<{ x: number; y: number; pointerId: number | null }>({
    x: 0,
    y: 0,
    pointerId: null,
  });
  const rightOrigin = useRef<{ x: number; y: number; pointerId: number | null }>({
    x: 0,
    y: 0,
    pointerId: null,
  });

  const MAX_R = 42;

  const handleLeftDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    leftOrigin.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      pointerId: e.pointerId,
    };
    updateLeft(e.clientX, e.clientY);
  };

  const updateLeft = (cx: number, cy: number) => {
    const rawX = cx - leftOrigin.current.x;
    const rawY = cy - leftOrigin.current.y;
    const dist = Math.hypot(rawX, rawY);
    const scale = dist > MAX_R ? MAX_R / dist : 1;
    const dx = rawX * scale;
    const dy = rawY * scale;
    setLeftStick({ dx, dy, active: true });
    engine?.setTouchState({
      active: true,
      moveX: dx / MAX_R,
      moveY: dy / MAX_R,
      jetpack: dy / MAX_R < -0.55,
    });
    if (dy / MAX_R < -0.7) {
      engine?.triggerTouchButton('jump');
    }
  };

  const handleLeftUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftOrigin.current.pointerId === e.pointerId) {
      leftOrigin.current.pointerId = null;
      setLeftStick({ dx: 0, dy: 0, active: false });
      engine?.setTouchState({ moveX: 0, moveY: 0, jetpack: false });
    }
  };

  const handleRightDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    rightOrigin.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      pointerId: e.pointerId,
    };
    updateRight(e.clientX, e.clientY);
  };

  const updateRight = (cx: number, cy: number) => {
    const rawX = cx - rightOrigin.current.x;
    const rawY = cy - rightOrigin.current.y;
    const dist = Math.hypot(rawX, rawY);
    const scale = dist > MAX_R ? MAX_R / dist : 1;
    const dx = rawX * scale;
    const dy = rawY * scale;
    setRightStick({ dx, dy, active: true });
    const aimAngle = dist > 6 ? Math.atan2(rawY, rawX) : undefined;
    engine?.setTouchState({
      active: true,
      hasAim: dist > 6,
      aimAngle,
      firing: dist > 14,
    });
  };

  const handleRightUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rightOrigin.current.pointerId === e.pointerId) {
      rightOrigin.current.pointerId = null;
      setRightStick({ dx: 0, dy: 0, active: false });
      engine?.setTouchState({ firing: false });
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none touch-none">
      {/* Left Virtual Movement & Jetpack Joystick */}
      <div
        onPointerDown={handleLeftDown}
        onPointerMove={(e) => {
          if (leftOrigin.current.pointerId === e.pointerId) {
            updateLeft(e.clientX, e.clientY);
          }
        }}
        onPointerUp={handleLeftUp}
        onPointerCancel={handleLeftUp}
        className="pointer-events-auto fixed bottom-28 left-5 h-28 w-28 rounded-full border-2 border-slate-400/40 bg-slate-950/45 flex items-center justify-center backdrop-blur-xs"
      >
        <div
          className="h-12 w-12 rounded-full border-2 border-amber-400 bg-amber-500/40 transition-transform duration-75"
          style={{
            transform: `translate(${leftStick.dx}px, ${leftStick.dy}px)`,
          }}
        />
        <span className="absolute -bottom-5 text-[10px] font-mono-tabular font-bold text-slate-300/80">
          MOVE / JET
        </span>
      </div>

      {/* Right Action Cluster */}
      <div className="pointer-events-auto fixed bottom-52 right-6 flex flex-wrap gap-2 justify-end max-w-[180px]">
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.triggerTouchButton('melee');
          }}
          onClick={() => engine?.triggerTouchButton('melee')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/60 bg-slate-900/80 text-amber-300 active:scale-95"
          aria-label="Melee strike"
        >
          <Swords className="h-4 w-4" />
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.triggerTouchButton('grenade');
          }}
          onClick={() => engine?.triggerTouchButton('grenade')}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-rose-400/60 bg-slate-900/80 text-rose-300 active:scale-95"
          aria-label="Throw grenade"
        >
          <Bomb className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {grenades}
          </span>
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.triggerTouchButton('cycle_grenade');
          }}
          onClick={() => engine?.triggerTouchButton('cycle_grenade')}
          className="flex h-11 px-2.5 items-center justify-center rounded-full border border-slate-500/70 bg-slate-900/80 text-[10px] font-mono-tabular font-bold text-slate-200 uppercase active:scale-95"
        >
          {grenadeType}
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.triggerTouchButton('cycle_slot');
          }}
          onClick={() => engine?.triggerTouchButton('cycle_slot')}
          className="flex h-11 px-2.5 items-center justify-center rounded-full border border-amber-400/70 bg-slate-900/80 text-[10px] font-mono-tabular font-bold text-amber-300 uppercase active:scale-95"
          aria-label="Switch weapon slot"
        >
          1/2/3
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.triggerTouchButton('reload');
          }}
          onClick={() => engine?.triggerTouchButton('reload')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-sky-400/60 bg-slate-900/80 text-sky-300 active:scale-95"
          aria-label="Reload"
        >
          <RotateCw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.triggerTouchButton('ultimate');
          }}
          onClick={() => engine?.triggerTouchButton('ultimate')}
          className={`flex h-11 w-11 items-center justify-center rounded-full border active:scale-95 ${
            ultReady
              ? 'border-amber-300 bg-amber-500 text-slate-950 animate-pulse'
              : 'border-slate-700 bg-slate-900/75 text-slate-500'
          }`}
          aria-label="Ultimate ability"
        >
          <Zap className="h-4 w-4" />
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.triggerTouchButton('grapple');
          }}
          onClick={() => engine?.triggerTouchButton('grapple')}
          className="flex h-10 px-2.5 items-center justify-center rounded-full border border-cyan-400/70 bg-slate-900/85 text-[10px] font-mono-tabular font-bold text-cyan-200 uppercase active:scale-95"
        >
          HOOK
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.triggerTouchButton('dash_left');
          }}
          onClick={() => engine?.triggerTouchButton('dash_left')}
          className="flex h-10 px-2 items-center justify-center rounded-full border border-sky-400/60 bg-slate-900/85 text-[10px] font-mono-tabular font-bold text-sky-200 active:scale-95"
        >
          &laquo;DASH
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.triggerTouchButton('dash_right');
          }}
          onClick={() => engine?.triggerTouchButton('dash_right')}
          className="flex h-10 px-2 items-center justify-center rounded-full border border-sky-400/60 bg-slate-900/85 text-[10px] font-mono-tabular font-bold text-sky-200 active:scale-95"
        >
          DASH&raquo;
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            if (onOpenEmoteWheel) onOpenEmoteWheel();
            else engine?.triggerTouchButton('emote');
          }}
          onClick={() => {
            if (onOpenEmoteWheel) onOpenEmoteWheel();
            else engine?.triggerTouchButton('emote');
          }}
          className="flex h-10 px-2 items-center justify-center rounded-full border border-amber-400/50 bg-slate-900/85 text-[10px] font-mono-tabular font-bold text-amber-200 active:scale-95"
        >
          EMOTE
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            if (onOpenSprayWheel) onOpenSprayWheel();
            else engine?.triggerTouchButton('spray');
          }}
          onClick={() => {
            if (onOpenSprayWheel) onOpenSprayWheel();
            else engine?.triggerTouchButton('spray');
          }}
          className="flex h-10 px-2 items-center justify-center rounded-full border border-pink-400/50 bg-slate-900/85 text-[10px] font-mono-tabular font-bold text-pink-200 active:scale-95"
        >
          SPRAY
        </button>

        <button
          type="button"
          onPointerDown={() => {
            engine?.setTouchState({ active: true, jetpack: true });
            engine?.triggerTouchButton('jump');
          }}
          onPointerUp={() => engine?.setTouchState({ jetpack: false })}
          onPointerCancel={() => engine?.setTouchState({ jetpack: false })}
          className="flex h-11 px-3 items-center gap-1 rounded-full border border-sky-400/70 bg-sky-500/25 text-xs font-bold text-sky-200 active:scale-95"
        >
          <Flame className="h-4 w-4" />
          JET
        </button>
      </div>

      {/* Right Virtual Aim & Fire Stick */}
      <div
        onPointerDown={handleRightDown}
        onPointerMove={(e) => {
          if (rightOrigin.current.pointerId === e.pointerId) {
            updateRight(e.clientX, e.clientY);
          }
        }}
        onPointerUp={handleRightUp}
        onPointerCancel={handleRightUp}
        className="pointer-events-auto fixed bottom-20 right-6 h-28 w-28 rounded-full border-2 border-red-400/50 bg-slate-950/45 flex items-center justify-center backdrop-blur-xs"
      >
        <div
          className="h-12 w-12 rounded-full border-2 border-red-400 bg-red-500/45 flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `translate(${rightStick.dx}px, ${rightStick.dy}px)`,
          }}
        >
          <Crosshair className="h-4 w-4 text-white" />
        </div>
        <span className="absolute -bottom-5 text-[10px] font-mono-tabular font-bold text-red-300/85">
          AIM & FIRE
        </span>
      </div>
    </div>
  );
};
