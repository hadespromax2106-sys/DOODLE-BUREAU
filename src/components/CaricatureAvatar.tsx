import React from 'react';
import { CHARACTERS, OUTFIT_COSMETICS } from '../data/catalog';
import { CharacterId, OutfitId } from '../types/game';

interface CaricatureAvatarProps {
  characterId: CharacterId;
  outfitId?: OutfitId;
  size?: number;
  className?: string;
}

export const CaricatureAvatar: React.FC<CaricatureAvatarProps> = ({
  characterId,
  outfitId = 'charcoal',
  size = 56,
  className = '',
}) => {
  const charDef = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];
  const outfit = OUTFIT_COSMETICS.find((o) => o.id === outfitId) || OUTFIT_COSMETICS[0];

  const useCustomOutfit = outfitId !== 'charcoal';
  const bodyColor = useCustomOutfit ? outfit.primaryColor : charDef.defaultSuitColor;
  const accentColor = useCustomOutfit ? outfit.secondaryColor : charDef.tieColor;
  const isSteve = charDef.id === 'thongi_baba';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-label={charDef.name}
    >
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="10"
        fill="#151D2E"
        stroke={isSteve ? '#06B6D4' : '#334155'}
        strokeWidth="2"
      />

      {/* Outfit / Torso */}
      {charDef.id === 'mitron' && (
        <g>
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill="#FEF3C7" stroke="#0B101B" strokeWidth="2.2" />
          <path d="M13 60 C13 46, 26 46, 28 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="1.8" />
          <path d="M51 60 C51 46, 38 46, 36 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="1.8" />
        </g>
      )}

      {(charDef.id === 'tariff_boss' || charDef.id === 'dashing_trudeau') && (
        <g>
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <polygon points="26,47 38,47 32,57" fill="#F8FAFC" />
          <polygon
            points={
              charDef.id === 'tariff_boss'
                ? '29.5,48 34.5,48 35.5,62 28.5,62'
                : '30,48 34,48 34,60 30,60'
            }
            fill={accentColor}
          />
        </g>
      )}

      {charDef.id === 'revolutionary' && (
        <g>
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={useCustomOutfit ? bodyColor : '#F8FAFC'} stroke="#0B101B" strokeWidth="2.2" />
          <path d="M25 46 Q32 52 39 46" fill="none" stroke="#CBD5E1" strokeWidth="2" />
          <rect x="16" y="57" width="32" height="4" fill={accentColor} />
        </g>
      )}

      {charDef.id === 'yogi_boy' && (
        <g>
          <path d="M11 60 C11 44, 53 44, 53 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <path d="M20 47 L38 60" stroke={accentColor} strokeWidth="3.5" />
        </g>
      )}

      {charDef.id === 'red_dragon' && (
        <g>
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <rect x="26" y="45" width="12" height="4" rx="1" fill={bodyColor} stroke="#0B101B" strokeWidth="1.4" />
          <circle cx="40" cy="52" r="2.6" fill={accentColor} stroke="#FEF08A" strokeWidth="0.8" />
        </g>
      )}

      {charDef.id === 'iron_bear' && (
        <g>
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <path d="M18 52 L25 48 L27 56 Z" fill={accentColor} opacity="0.7" />
          <path d="M39 50 L46 54 L41 58 Z" fill={accentColor} opacity="0.7" />
          <line x1="32" y1="47" x2="32" y2="60" stroke="#94A3B8" strokeWidth="1.5" />
        </g>
      )}

      {isSteve && (
        <g>
          {/* Blocky Minecraft Steve Shoulders & Cyan Shirt */}
          <rect x="11" y="46" width="42" height="15" rx="1" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <rect x="26" y="46" width="12" height="5" fill={charDef.skinTone} />
          <rect x="28" y="51" width="8" height="3" fill={charDef.skinTone} />
          {/* Block pixel shirt shading */}
          <rect x="13" y="48" width="6" height="11" fill="rgba(0,0,0,0.16)" />
          <rect x="45" y="48" width="6" height="11" fill="rgba(255,255,255,0.12)" />
        </g>
      )}

      {/* Head: Blocky Minecraft Steve + Sigma Jawline vs Round Caricature */}
      {isSteve ? (
        <g>
          {/* Square Blocky Steve Head with Chiseled Sigma Jaw */}
          <polygon
            points="16,13 48,13 48,37 42,46 22,46 16,37"
            fill={charDef.skinTone}
            stroke="#0B101B"
            strokeWidth="2.4"
            strokeLinejoin="miter"
          />
          {/* Chiseled Sigma Cheekbone & Jawline Shading */}
          <polygon points="17.5,32 24,38 23,44.5 17.5,37" fill="#9A6238" opacity="0.75" />
          <polygon points="46.5,32 40,38 41,44.5 46.5,37" fill="#9A6238" opacity="0.75" />
          <line x1="20" y1="36" x2="25" y2="43" stroke="#5C3418" strokeWidth="1.6" />
          <line x1="44" y1="36" x2="39" y2="43" stroke="#5C3418" strokeWidth="1.6" />
          {/* Blocky Nose */}
          <rect x="29.5" y="29" width="5" height="4" fill="#A46B40" />
          {/* Classic Steve Goatee / Jaw Beard */}
          <path d="M24 38 H40 V44 H36 V41 H28 V44 H24 Z" fill="#4A2E1B" />
          {/* Sigma Brow & Rectangular Pixel Steve Eyes */}
          <rect x="20" y="25" width="7" height="3.8" fill="#FFFFFF" />
          <rect x="37" y="25" width="7" height="3.8" fill="#FFFFFF" />
          <rect x="23" y="25" width="4" height="3.8" fill="#4338CA" />
          <rect x="37" y="25" width="4" height="3.8" fill="#4338CA" />
          <line x1="19.5" y1="23.5" x2="27.5" y2="24.6" stroke="#2D1B0F" strokeWidth="1.8" />
          <line x1="44.5" y1="23.5" x2="36.5" y2="24.6" stroke="#2D1B0F" strokeWidth="1.8" />
          {/* Sigma Smirk */}
          <path d="M28 36.2 Q33 37.5 37 35" fill="none" stroke="#3B1F0F" strokeWidth="1.6" />
          {/* Blocky Minecraft Steve Hair */}
          <polygon
            points="15.5,12 48.5,12 48.5,24 44,24 44,19 20,19 20,24 15.5,24"
            fill={charDef.hairColor}
            stroke="#0B101B"
            strokeWidth="1.8"
          />
        </g>
      ) : (
        <>
          <circle cx="32" cy="30" r="15.5" fill={charDef.skinTone} stroke="#0B101B" strokeWidth="2.4" />

          {charDef.id === 'mitron' && (
            <g>
              <path
                d="M18 31 C18 46, 46 46, 46 31 Q39 36 32 34 Q25 36 18 31 Z"
                fill="#F8FAFC"
                stroke="#CBD5E1"
                strokeWidth="1.4"
              />
              <path d="M25 34 Q32 37 39 34" fill="none" stroke="#94A3B8" strokeWidth="1.2" />
            </g>
          )}

          {charDef.id === 'revolutionary' && (
            <g fill="#475569" opacity="0.55">
              <circle cx="24" cy="36" r="0.8" />
              <circle cx="28" cy="39" r="0.8" />
              <circle cx="32" cy="40" r="0.8" />
              <circle cx="36" cy="39" r="0.8" />
              <circle cx="40" cy="36" r="0.8" />
              <circle cx="26" cy="38" r="0.8" />
              <circle cx="38" cy="38" r="0.8" />
            </g>
          )}

          {charDef.id === 'iron_bear' ? (
            <g>
              <rect x="19" y="24" width="11.5" height="6" rx="1.5" fill="#09090B" />
              <rect x="33.5" y="24" width="11.5" height="6" rx="1.5" fill="#09090B" />
              <line x1="30.5" y1="26" x2="33.5" y2="26" stroke="#09090B" strokeWidth="2" />
              <line x1="21" y1="25.5" x2="25" y2="25.5" stroke="#CBD5E1" strokeWidth="1.2" />
            </g>
          ) : (
            <g>
              <circle cx="26" cy="27" r="3.2" fill="#FFFFFF" />
              <circle cx="38" cy="27" r="3.2" fill="#FFFFFF" />
              <circle cx="26.7" cy="27" r="1.7" fill="#0F172A" />
              <circle cx="38.7" cy="27" r="1.7" fill="#0F172A" />
              {charDef.id === 'mitron' && (
                <g stroke="#CBD5E1" strokeWidth="1.3" fill="none">
                  <rect x="20.5" y="23.5" width="10" height="6.5" rx="1" />
                  <rect x="33.5" y="23.5" width="10" height="6.5" rx="1" />
                  <line x1="30.5" y1="26.5" x2="33.5" y2="26.5" />
                </g>
              )}
            </g>
          )}

          {/* Mouth */}
          {charDef.id === 'dashing_trudeau' ? (
            <path d="M25 35 Q32 41 39 35 Z" fill="#FFFFFF" stroke="#7C2D12" strokeWidth="1.6" />
          ) : charDef.id !== 'mitron' ? (
            <path
              d="M27 36 Q32 38 37 35.5"
              fill="none"
              stroke="#7C2D12"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : null}

          {/* Hairstyles */}
          {charDef.hairStyle === 'swept_white' && (
            <path
              d="M17 24 Q24 11 44 16 Q48 20 46 25 Q35 16 17 24 Z"
              fill={charDef.hairColor}
              stroke="#0B101B"
              strokeWidth="1.8"
            />
          )}
          {charDef.hairStyle === 'swept_blonde' && (
            <path
              d="M16 23 Q32 3 50 18 Q35 14 16 23 Z"
              fill={charDef.hairColor}
              stroke="#0B101B"
              strokeWidth="2"
            />
          )}
          {charDef.hairStyle === 'short_stubble' && (
            <path
              d="M17 24 C18 11, 46 11, 47 24 Q33 17 17 24 Z"
              fill={charDef.hairColor}
              stroke="#0B101B"
              strokeWidth="1.8"
            />
          )}
          {charDef.hairStyle === 'shaved_tilak' && (
            <g>
              <rect x="30.5" y="16" width="3" height="7" rx="1" fill="#F97316" />
              <circle cx="32" cy="18" r="1.4" fill="#DC2626" />
            </g>
          )}
          {charDef.hairStyle === 'mao_part' && (
            <path
              d="M17 24 C18 11, 46 11, 47 24 Q36 16 28 19 L25 16 Q21 19 17 24 Z"
              fill={charDef.hairColor}
              stroke="#0B101B"
              strokeWidth="1.8"
            />
          )}
          {charDef.hairStyle === 'receding_blonde' && (
            <path
              d="M18 22 Q24 14 32 16 Q40 14 46 22 Q38 17 32 18 Q26 17 18 22 Z"
              fill={charDef.hairColor}
              stroke="#0B101B"
              strokeWidth="1.5"
            />
          )}
          {charDef.hairStyle === 'wavy_curls' && (
            <g fill={charDef.hairColor} stroke="#0B101B" strokeWidth="1.8">
              <circle cx="22" cy="16" r="7.5" />
              <circle cx="33" cy="13" r="8" />
              <circle cx="43" cy="17" r="6.5" />
            </g>
          )}
        </>
      )}
    </svg>
  );
};
