import React, { useRef } from 'react';
import { EMOTE_DEFS, SPRAY_DEFS } from '../data/catalog';
import { EmoteId, SprayId } from '../types/game';

interface RadialEmoteSprayWheelProps {
  mode: 'emote' | 'spray';
  hoveredIndex: number | null;
  onHoverIndexChange: (index: number | null) => void;
  onSelectEmote: (emoteId: EmoteId) => void;
  onSelectSpray: (sprayId: SprayId) => void;
  onSwitchMode: (mode: 'emote' | 'spray') => void;
  onClose: () => void;
}

const WHEEL_SIZE = 344;
const CENTER = WHEEL_SIZE / 2;
const OUTER_R = 160;
const INNER_R = 54;
const ICON_R = 109;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSectorPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number
): string {
  const p1 = polarToCartesian(cx, cy, outerR, startDeg);
  const p2 = polarToCartesian(cx, cy, outerR, endDeg);
  const p3 = polarToCartesian(cx, cy, innerR, endDeg);
  const p4 = polarToCartesian(cx, cy, innerR, startDeg);
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 0 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

const EmoteGlyph: React.FC<{ id: EmoteId; color: string }> = ({ id, color }) => {
  switch (id) {
    case 'chai':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <polygon points="-8,-3 8,-3 6,10 -6,10" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.6" />
          <path d="M-3,-6 Q-6,-11 -2,-14 M3,-5 Q6,-10 2,-13" fill="none" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'trophy':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <polygon points="-9,-9 9,-9 6,2 2,4 2,9 6,11 -6,11 -2,9 -2,4 -6,2" fill="#FACC15" stroke="#FEF08A" strokeWidth="1.4" />
          <circle cx="9" cy="-10" r="2" fill="#FFFFFF" />
        </svg>
      );
    case 'laugh_skull':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <path d="M-9,-3 A9,9 0 0,1 9,-3 L9,4 L-9,4 Z" fill="#E2E8F0" />
          <rect x="-5" y="6" width="10" height="4" rx="1" fill="#E2E8F0" />
          <circle cx="-3.5" cy="-2" r="2.2" fill="#0F172A" />
          <circle cx="3.5" cy="-2" r="2.2" fill="#0F172A" />
        </svg>
      );
    case 'dab_flex':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <path d="M-9,7 L-7,-3 A7,7 0 0,1 7,-1 L10,7 Z" fill="#F43F5E" stroke="#FDA4AF" strokeWidth="1.6" />
          <circle cx="7" cy="-6" r="3.2" fill="#FEF08A" />
        </svg>
      );
    case 'salute':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <path d="M-10,-1 A8,8 0 0,1 6,-1 L6,5 L-10,5 Z" fill="#38BDF8" />
          <rect x="-8" y="-1" width="12" height="3" fill="#0F172A" />
          <line x1="6" y1="6" x2="11" y2="-4" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'crown_king':
    default:
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <polygon points="-10,7 -12,-5 -5,1 0,-9 5,1 12,-5 10,7" fill="#FACC15" stroke={color} strokeWidth="1.6" />
          <circle cx="0" cy="2" r="2.2" fill="#EC4899" />
        </svg>
      );
  }
};

const SprayGlyph: React.FC<{ id: SprayId; fg: string; accent: string }> = ({ id, fg, accent }) => {
  switch (id) {
    case 'chai_break':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <polygon points="-9,-4 9,-4 7,10 -7,10" fill={fg} />
          <path d="M-4,-8 Q-7,-12 -3,-15 M3,-8 Q0,-12 4,-15" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'aim_404':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <circle cx="0" cy="0" r="10" fill="none" stroke={fg} strokeWidth="2" />
          <path d="M-14,0 H-7 M7,0 H14 M0,-14 V-7 M0,7 V14" stroke={fg} strokeWidth="2" />
          <path d="M-5,-5 L5,5 M5,-5 L-5,5" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'doodle_crown':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <polygon points="-12,8 -14,-6 -6,1 0,-10 6,1 14,-6 12,8" fill={fg} stroke={accent} strokeWidth="1.6" />
        </svg>
      );
    case 'no_camping':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <polygon points="-9,7 0,-7 9,7" fill={fg} />
          <circle cx="0" cy="0" r="12" fill="none" stroke="#EF4444" strokeWidth="2.4" />
          <line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5" stroke="#EF4444" strokeWidth="2.4" />
        </svg>
      );
    case 'sniper_bait':
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <circle cx="0" cy="0" r="11" fill="none" stroke={fg} strokeWidth="2" />
          <circle cx="0" cy="0" r="6" fill="none" stroke={fg} strokeWidth="2" />
          <circle cx="0" cy="0" r="2.5" fill="#FACC15" />
        </svg>
      );
    case 'kadak_bolt':
    default:
      return (
        <svg viewBox="-16 -16 32 32" className="h-8 w-8">
          <polygon points="2,-12 -8,1 -1,1 -4,12 9,-2 2,-2" fill="#FACC15" stroke={fg} strokeWidth="1.4" />
        </svg>
      );
  }
};

export const RadialEmoteSprayWheel: React.FC<RadialEmoteSprayWheelProps> = ({
  mode,
  hoveredIndex,
  onHoverIndexChange,
  onSelectEmote,
  onSelectSpray,
  onSwitchMode,
  onClose,
}) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const items = mode === 'emote' ? EMOTE_DEFS : SPRAY_DEFS;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < INNER_R - 8) {
      if (hoveredIndex !== null) onHoverIndexChange(null);
      return;
    }
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const normalized = (deg + 90 + 30 + 360) % 360;
    const sector = Math.floor(normalized / 60) % 6;
    if (sector !== hoveredIndex) {
      onHoverIndexChange(sector);
    }
  };

  const triggerAt = (index: number) => {
    if (mode === 'emote') {
      const def = EMOTE_DEFS[index];
      if (def) onSelectEmote(def.id);
    } else {
      const def = SPRAY_DEFS[index];
      if (def) onSelectSpray(def.id);
    }
  };

  const activeEmote = mode === 'emote' && hoveredIndex !== null ? EMOTE_DEFS[hoveredIndex] : null;
  const activeSpray = mode === 'spray' && hoveredIndex !== null ? SPRAY_DEFS[hoveredIndex] : null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/55 select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {/* Top Mode Switcher Tabs */}
      <div
        className="mb-3 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onSwitchMode('emote')}
          className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-colors ${
            mode === 'emote'
              ? 'bg-amber-500 text-slate-950'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          [T] Emotes
        </button>
        <button
          type="button"
          onClick={() => onSwitchMode('spray')}
          className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-colors ${
            mode === 'spray'
              ? 'bg-pink-500 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          [Y] Wall Sprays
        </button>
      </div>

      {/* Radial Sector Wheel */}
      <div
        ref={wheelRef}
        onPointerMove={handlePointerMove}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
        className="relative flex items-center justify-center"
      >
        <svg
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          className="drop-shadow-[0_18px_40px_rgba(0,0,0,0.75)]"
        >
          {/* Outer subtle frame ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_R + 3}
            fill="none"
            stroke="rgba(148, 163, 184, 0.28)"
            strokeWidth="1.5"
          />

          {items.map((item, idx) => {
            const startDeg = idx * 60 - 120;
            const endDeg = startDeg + 60;
            const isHovered = hoveredIndex === idx;
            const accentColor = 'color' in item ? item.color : item.accent;
            const fillColor = isHovered
              ? 'color' in item
                ? 'rgba(30, 41, 59, 0.98)'
                : item.bg
              : 'rgba(15, 23, 42, 0.92)';

            return (
              <path
                key={item.id}
                d={describeSectorPath(
                  CENTER,
                  CENTER,
                  INNER_R,
                  isHovered ? OUTER_R + 4 : OUTER_R,
                  startDeg + 1.4,
                  endDeg - 1.4
                )}
                fill={fillColor}
                stroke={isHovered ? accentColor : 'rgba(71, 85, 105, 0.7)'}
                strokeWidth={isHovered ? 2.8 : 1.4}
                className="cursor-pointer transition-all duration-100"
                onMouseEnter={() => onHoverIndexChange(idx)}
                onClick={() => triggerAt(idx)}
              />
            );
          })}
        </svg>

        {/* Sector Glyphs & Labels */}
        {items.map((item, idx) => {
          const midDeg = idx * 60 - 90;
          const pos = polarToCartesian(CENTER, CENTER, ICON_R, midDeg);
          const isHovered = hoveredIndex === idx;
          const label = 'label' in item ? item.label : item.title;

          return (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => onHoverIndexChange(idx)}
              onClick={() => triggerAt(idx)}
              style={{
                left: pos.x,
                top: pos.y,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1 transition-transform ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
            >
              <span className="rounded bg-slate-950/90 px-1.5 py-0.2 font-mono-tabular text-[10px] font-bold text-slate-300 border border-slate-700/80">
                {idx + 1}
              </span>
              {'color' in item ? (
                <EmoteGlyph id={item.id} color={item.color} />
              ) : (
                <SprayGlyph id={item.id} fg={item.fg} accent={item.accent} />
              )}
              <span className="max-w-[78px] truncate text-[10px] font-extrabold tracking-tight text-white drop-shadow">
                {label}
              </span>
            </button>
          );
        })}

        {/* Center Status / Cancel Hub */}
        <button
          type="button"
          onClick={onClose}
          onMouseEnter={() => onHoverIndexChange(null)}
          className="absolute flex h-[96px] w-[96px] flex-col items-center justify-center rounded-full border-2 border-slate-600 bg-slate-950/95 px-2 text-center shadow-inner transition hover:border-slate-400"
        >
          {activeEmote ? (
            <>
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: activeEmote.color }}
              >
                {activeEmote.badge}
              </span>
              <span className="mt-0.5 text-[11px] font-extrabold leading-tight text-white">
                {activeEmote.label}
              </span>
              <span className="mt-0.5 text-[9px] text-slate-400">{activeEmote.subtitle}</span>
            </>
          ) : activeSpray ? (
            <>
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: activeSpray.accent }}
              >
                SPRAY WALL
              </span>
              <span className="mt-0.5 text-[11px] font-extrabold leading-tight text-white">
                {activeSpray.title}
              </span>
              <span className="mt-0.5 text-[9px] text-slate-400">{activeSpray.subtitle}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                {mode === 'emote' ? 'EMOTES' : 'SPRAYS'}
              </span>
              <span className="mt-0.5 text-[10px] font-semibold leading-tight text-slate-300">
                Click or 1-6
              </span>
              <span className="mt-1 text-[9px] text-slate-500">Esc · Cancel</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Help Line */}
      <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-1.5 text-[11px] font-mono-tabular text-slate-300">
        {mode === 'spray'
          ? 'Aim at a wall or cover block and select a decal · Sprays persist all match'
          : 'Hold & release T, click a slice, or press 1-6 to trigger an animated emote'}
      </div>
    </div>
  );
};
