import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bomb, Flame, Plane, Swords, Zap } from 'lucide-react';
import { WEAPONS } from '../data/catalog';
import { KillFeedItem, KillFeedWeaponId } from '../types/game';

interface KillFeedOverlayProps {
  items: KillFeedItem[];
  className?: string;
}

const HeadshotBadgeIcon: React.FC = () => (
  <span
    className="inline-flex items-center gap-0.5 rounded bg-rose-500/20 border border-rose-400/55 px-1 py-0.5 text-[9px] font-extrabold tracking-wider text-rose-300 shrink-0"
    title="Headshot Elimination"
  >
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
      <path
        d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
    HS
  </span>
);

const MultiKillBadgeIcon: React.FC<{ count: number }> = ({ count }) => {
  const tierColor =
    count >= 5
      ? 'bg-red-500/25 border-red-400/70 text-red-200'
      : count >= 3
      ? 'bg-amber-500/25 border-amber-400/70 text-amber-200'
      : 'bg-orange-500/20 border-orange-400/55 text-orange-200';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-extrabold font-mono-tabular tracking-wide shrink-0 ${tierColor}`}
      title={`${count}x Rapid Multi-Kill`}
    >
      <Flame className="h-2.5 w-2.5 fill-current shrink-0" />
      {count}x
    </span>
  );
};

const WeaponCategoryGlyph: React.FC<{ weaponId: KillFeedWeaponId }> = ({
  weaponId,
}) => {
  if (weaponId === 'barrel') {
    return (
      <svg viewBox="0 0 18 14" className="h-3 w-3.5 text-orange-400 shrink-0" aria-hidden="true">
        <path
          d="M9 1l1.8 3.2 3.7-.7-1.5 3.3L16 9l-3.6 1 .5 3L9 11.3 5.1 13l.5-3L2 9l3-2.2-1.5-3.3 3.7.7z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weaponId === 'ultimate') {
    return <Zap className="h-3 w-3 text-amber-400 fill-current shrink-0" />;
  }
  if (
    weaponId === 'melee' ||
    weaponId === 'knife' ||
    weaponId === 'karambit' ||
    weaponId === 'katana' ||
    weaponId === 'boxing_glove'
  ) {
    return (
      <Swords
        className={`h-3 w-3 shrink-0 ${
          weaponId === 'katana'
            ? 'text-slate-100'
            : weaponId === 'karambit'
            ? 'text-sky-300'
            : weaponId === 'boxing_glove'
            ? 'text-rose-400'
            : 'text-yellow-300'
        }`}
      />
    );
  }
  if (weaponId === 'frag' || weaponId === 'plasma') {
    return (
      <Bomb
        className={`h-3 w-3 shrink-0 ${
          weaponId === 'plasma' ? 'text-sky-400' : 'text-emerald-400'
        }`}
      />
    );
  }
  if (weaponId === 'airstrike') {
    return <Plane className="h-3 w-3 text-red-400 shrink-0" />;
  }
  if (weaponId === 'dual_pistols' || weaponId === 'dual_smgs') {
    return (
      <svg viewBox="0 0 22 12" className="h-3 w-4.5 text-purple-300 shrink-0" aria-hidden="true">
        <path
          d="M2 3h15v2H2zm3 4h15v2H5z"
          fill="currentColor"
        />
      </svg>
    );
  }

  const weapon = WEAPONS[weaponId];
  if (!weapon) return null;
  if (weapon.category === 'Sniper') {
    return (
      <svg viewBox="0 0 24 12" className="h-3 w-5 text-sky-300 shrink-0" aria-hidden="true">
        <path
          d="M1 7h6l2-2h6v1h8v1.5h-8v1H9l-1 2H5l1-2H1V7zm9-4h4v1.5h-4z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Shotgun') {
    return (
      <svg viewBox="0 0 22 12" className="h-3 w-4.5 text-orange-300 shrink-0" aria-hidden="true">
        <path
          d="M1 7.5l3-2h16v1.5H9l-1.5 1H14v1.2H7L5 11H2l1.2-2.2L1 7.5z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Rocket Launcher') {
    return (
      <svg viewBox="0 0 24 12" className="h-3 w-5 text-red-400 shrink-0" aria-hidden="true">
        <path
          d="M2 4h17l3 2-3 2H2V4zm4 4h3v2.5H6zm7 0h3v2.5h-3z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Pistol' || weapon.category === 'Revolver') {
    return (
      <svg viewBox="0 0 20 12" className="h-3 w-4 text-cyan-300 shrink-0" aria-hidden="true">
        <path
          d="M2 4h15v2.2H9l-.8 3.8H5.5L6.2 6.2H2V4z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Energy' || weapon.category === 'Cryo') {
    return (
      <svg
        viewBox="0 0 22 12"
        className={`h-3 w-4.5 shrink-0 ${
          weapon.category === 'Cryo' ? 'text-sky-300' : 'text-cyan-300'
        }`}
        aria-hidden="true"
      >
        <path d="M1 5h12l2-2h6v2h-4v2h4v2h-6l-2-2H7l-1.5 3H3l1.2-3H1V5z" fill="currentColor" />
      </svg>
    );
  }
  if (weapon.category === 'Minigun') {
    return (
      <svg viewBox="0 0 24 12" className="h-3 w-5 text-amber-300 shrink-0" aria-hidden="true">
        <path
          d="M1 4h8l2 1.2h11v1H11v1h11v1H11v1H9L7 11H2l1.5-3H1V4z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (weapon.category === 'Crossbow') {
    return (
      <svg viewBox="0 0 22 12" className="h-3 w-4.5 text-rose-300 shrink-0" aria-hidden="true">
        <path
          d="M12 1l4 5-4 5h-1.5l3-4.2H1V5.2h12.5L10.5 1H12z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 22 12" className="h-3 w-4.5 text-amber-300 shrink-0" aria-hidden="true">
      <path
        d="M1 6.5h4.5L7 4.5h6l1 1.5h7v1.3h-7l-.6 1.5h-2l.4 2.2H10l-.4-2.2H6L4.2 10.5H2l1-2.5H1z"
        fill="currentColor"
      />
    </svg>
  );
};

function getWeaponLabel(weaponId: KillFeedWeaponId): string {
  if (weaponId === 'barrel') return 'BARREL';
  if (weaponId === 'ultimate') return 'ULTIMATE';
  if (weaponId === 'melee' || weaponId === 'knife') return 'KNIFE';
  if (weaponId === 'karambit') return 'KARAMBIT';
  if (weaponId === 'katana') return 'KATANA';
  if (weaponId === 'boxing_glove') return 'BOXING GLOVE';
  if (weaponId === 'frag') return 'FRAG';
  if (weaponId === 'plasma') return 'PLASMA';
  if (weaponId === 'airstrike') return 'AIRSTRIKE';
  if (weaponId === 'dual_pistols') return '2X PISTOLS';
  if (weaponId === 'dual_smgs') return '2X SMGS';
  return WEAPONS[weaponId]?.shortName || weaponId.toUpperCase();
}

export const KillFeedOverlay: React.FC<KillFeedOverlayProps> = ({ items, className = '' }) => {
  return (
    <div
      className={`pointer-events-none flex flex-col items-end gap-1.5 w-72 sm:w-84 ${className}`}
      aria-live="polite"
      aria-label="Recent eliminations killfeed"
    >
      <AnimatePresence initial={false}>
        {items.slice(0, 5).map((item) => {
          const isMulti = Boolean(item.multiKillCount && item.multiKillCount >= 2);
          const isHeadshot = Boolean(item.isHeadshot);
          const accentBorder = isMulti
            ? 'border-l-amber-400'
            : isHeadshot
            ? 'border-l-rose-400'
            : 'border-l-slate-500';

          const killerColor =
            item.killerPlayerIndex === 1
              ? 'text-amber-300'
              : item.killerPlayerIndex === 2
              ? 'text-sky-300'
              : 'text-slate-100';

          const victimColor =
            item.victimPlayerIndex === 1
              ? 'text-amber-200'
              : item.victimPlayerIndex === 2
              ? 'text-sky-200'
              : 'text-rose-300';

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: 72, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 64, scale: 0.94 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center justify-end gap-1.5 rounded-md border border-slate-700/70 border-l-[3px] ${accentBorder} bg-[#0B101B]/86 px-2.5 py-1.5 text-[11px] shadow-md max-w-full`}
            >
              <span className={`font-bold truncate max-w-[82px] ${killerColor}`}>
                {item.killerName}
              </span>

              {isMulti && item.multiKillCount && (
                <MultiKillBadgeIcon count={item.multiKillCount} />
              )}

              <span className="inline-flex items-center gap-1 rounded bg-slate-900/90 border border-slate-700/75 px-1.5 py-0.5 text-[10px] font-mono-tabular font-semibold text-slate-200 shrink-0">
                <WeaponCategoryGlyph weaponId={item.weaponId} />
                <span>{getWeaponLabel(item.weaponId)}</span>
              </span>

              {isHeadshot && <HeadshotBadgeIcon />}

              <span className={`font-semibold truncate max-w-[82px] ${victimColor}`}>
                {item.victimName}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
