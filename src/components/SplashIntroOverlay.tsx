import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../game/audio';

interface SplashIntroOverlayProps {
  onComplete: (skippedByUser: boolean) => void;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const SplashIntroOverlay: React.FC<SplashIntroOverlayProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Attempt immediate slash SFX (works if browser permits autoplay; click-to-skip also unlocks)
    soundEngine.playSplashSlash();

    const revealTimer = window.setTimeout(() => setRevealed(true), 220);
    const fadeTimer = window.setTimeout(() => setFadingOut(true), 2150);
    const doneTimer = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete(false);
      }
    }, 2550);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const sparks: Spark[] = [];
    const startMs = performance.now();
    let slashEmitted = 0;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = (now - startMs) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Diagonal blade slash from bottom-left-center toward top-right-center (0.08s -> 0.36s)
      const slashStart = 0.08;
      const slashDur = 0.28;
      const progress = Math.max(0, Math.min(1, (elapsed - slashStart) / slashDur));

      const x0 = w * 0.22;
      const y0 = h * 0.64;
      const x1 = w * 0.78;
      const y1 = h * 0.36;

      if (progress > 0 && progress < 1 && slashEmitted < 44) {
        const curX = x0 + (x1 - x0) * progress;
        const curY = y0 + (y1 - y0) * progress;
        for (let i = 0; i < 4; i++) {
          const angle = Math.atan2(y1 - y0, x1 - x0) + (Math.random() - 0.5) * 1.45;
          const speed = 170 + Math.random() * 440;
          sparks.push({
            x: curX + (Math.random() - 0.5) * 14,
            y: curY + (Math.random() - 0.5) * 14,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 60,
            life: 0.45 + Math.random() * 0.65,
            maxLife: 1.0,
            size: 1.6 + Math.random() * 2.8,
            color: Math.random() < 0.52 ? '#FB923C' : '#22D3EE',
          });
          slashEmitted += 1;
        }
      }

      // Draw glowing blade slash arc & lingering scorch trail
      if (elapsed >= slashStart && elapsed < 1.35) {
        const trailAlpha = elapsed < 0.36 ? 1 : Math.max(0, 1 - (elapsed - 0.36) / 0.99);
        const curX = x0 + (x1 - x0) * progress;
        const curY = y0 + (y1 - y0) * progress;
        const tailFrac = Math.max(0, progress - 0.42);
        const tx = x0 + (x1 - x0) * tailFrac;
        const ty = y0 + (y1 - y0) * tailFrac;

        ctx.save();
        ctx.globalAlpha = trailAlpha;

        // Outer cyan/amber bloom
        const grad = ctx.createLinearGradient(tx, ty, curX, curY);
        grad.addColorStop(0, 'rgba(34, 211, 238, 0)');
        grad.addColorStop(0.35, 'rgba(34, 211, 238, 0.85)');
        grad.addColorStop(0.75, 'rgba(249, 115, 22, 0.95)');
        grad.addColorStop(1, '#FFFFFF');

        ctx.strokeStyle = grad;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#22D3EE';
        ctx.shadowBlur = 22;
        ctx.lineWidth = elapsed < 0.38 ? 9 : Math.max(1.5, 9 * trailAlpha);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        // Razor white-steel core
        ctx.shadowColor = '#F97316';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = elapsed < 0.38 ? 3.2 : Math.max(0.8, 3.2 * trailAlpha);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(curX, curY);
        ctx.stroke();
        ctx.restore();
      }

      // Update & draw sparks
      const dt = 0.016;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.vy += 380 * dt;
        s.vx *= 0.985;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const alpha = Math.max(0, Math.min(1, s.life / 0.55));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 0.025, s.y - s.vy * 0.025);
        ctx.stroke();
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleSkip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    void soundEngine.unlock();
    soundEngine.playUiClick();
    onComplete(true);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-slate-950 select-none cursor-pointer transition-opacity duration-400 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Tactical dark-slate radial vignette & subtle stencil grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.92) 55%, rgba(2,6,23,1) 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.16) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />

      {/* Spark & metallic slash canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Center Weathered Stencil Title Reveal */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 transition-all duration-500 ease-out ${
          revealed ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-2'
        }`}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="h-[2px] w-10 bg-gradient-to-r from-transparent to-cyan-400" />
          <span className="text-[11px] font-black uppercase tracking-[0.42em] text-cyan-300/90">
            Tactical Sketchbook Arena
          </span>
          <span className="h-[2px] w-10 bg-gradient-to-l from-transparent to-orange-400" />
        </div>

        <div className="relative">
          {/* Stencil backdrop glow */}
          <div
            className="absolute -inset-6 blur-2xl opacity-35 pointer-events-none"
            style={{
              background:
                'linear-gradient(120deg, rgba(34,211,238,0.45), rgba(249,115,22,0.45))',
            }}
          />
          <h1
            className="relative font-display text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-[0.14em] leading-none"
            style={{
              background:
                'linear-gradient(180deg, #F8FAFC 0%, #CBD5E1 46%, #94A3B8 52%, #E2E8F0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 6px 24px rgba(15,23,42,0.95))',
            }}
          >
            DOODLE BUREAU
          </h1>
          {/* Subtle diagonal stencil cut line */}
          <div
            className="pointer-events-none absolute left-[-6%] right-[-6%] top-1/2 h-[3px] -rotate-6 opacity-75"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, #22D3EE 28%, #FFFFFF 50%, #F97316 74%, transparent 100%)',
              boxShadow: '0 0 18px rgba(34, 211, 238, 0.75)',
            }}
          />
        </div>

        <p className="mt-4 text-xs sm:text-sm font-bold uppercase tracking-[0.28em] text-slate-400">
          Locked • Loaded • Outgunned
        </p>
      </div>

      {/* Subtle Click to Skip button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        className="absolute bottom-8 right-8 z-20 rounded-lg border border-slate-700/80 bg-slate-900/75 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-300 backdrop-blur transition hover:border-cyan-400/70 hover:text-white"
      >
        Click to Skip
      </button>
    </div>
  );
};
