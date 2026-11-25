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

      {/* Back Silhouette Props (Capes, Wings, Drones, Rulers, Shakers) */}
      {charDef.id === 'captain_jalebi' && (
        <g>
          <path
            d="M8 58 Q10 38 22 46 L17 60 Z"
            fill="#F97316"
            stroke="#FDBA74"
            strokeWidth="1.4"
          />
          <path
            d="M56 58 Q54 38 42 46 L47 60 Z"
            fill="#F97316"
            stroke="#FDBA74"
            strokeWidth="1.4"
          />
          <circle cx="14" cy="52" r="3.2" fill="none" stroke="#FDE047" strokeWidth="1.5" />
          <circle cx="50" cy="52" r="3.2" fill="none" stroke="#FDE047" strokeWidth="1.5" />
        </g>
      )}
      {charDef.id === 'chappal_ninja' && (
        <g transform="translate(46, 36) rotate(24)">
          <ellipse cx="4" cy="6" rx="4" ry="8" fill="#FBBF24" stroke="#0B101B" strokeWidth="1.3" />
          <path d="M1 4 Q4 1 7 4" fill="none" stroke="#B45309" strokeWidth="1.4" />
          <path d="M-2 3 L1 5 M7 5 L10 3" stroke="#FEF08A" strokeWidth="1.3" />
        </g>
      )}
      {charDef.id === 'exam_topper' && (
        <g transform="translate(45, 22) rotate(28)">
          <rect x="0" y="0" width="5" height="24" rx="1" fill="#FACC15" stroke="#0B101B" strokeWidth="1.3" />
          <line x1="0" y1="5" x2="2.5" y2="5" stroke="#0B101B" strokeWidth="1" />
          <line x1="0" y1="10" x2="2.5" y2="10" stroke="#0B101B" strokeWidth="1" />
          <line x1="0" y1="15" x2="2.5" y2="15" stroke="#0B101B" strokeWidth="1" />
        </g>
      )}
      {charDef.id === 'bhaijaan_gymbro' && (
        <g transform="translate(46, 34) rotate(12)">
          <rect x="0" y="3" width="8" height="13" rx="2" fill="#22D3EE" stroke="#0B101B" strokeWidth="1.3" />
          <rect x="-1" y="0" width="10" height="4" rx="1" fill="#0F172A" />
        </g>
      )}

      {/* Outfit / Torso */}
      {charDef.id === 'chai_storm' && (
        <g>
          {/* Collared shirt + sleeveless sweater-vest + belt chai tumbler */}
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill="#F8FAFC" stroke="#0B101B" strokeWidth="2.2" />
          <path d="M15 60 C15 46, 49 46, 49 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="1.8" />
          <polygon points="26,46 38,46 32,56" fill="#F8FAFC" />
          {/* Steel chai tumbler with steam */}
          <rect x="41" y="51" width="7" height="9" rx="1" fill="#CBD5E1" stroke="#0B101B" strokeWidth="1.3" />
          <path d="M43 49 Q45 46 44 44 M46 49 Q48 46 47 44" fill="none" stroke="#E2E8F0" strokeWidth="1.1" />
        </g>
      )}

      {charDef.id === 'baron_voltage' && (
        <g>
          {/* Tattered crimson-and-charcoal cloak + circuit trim + gauntlet electric coils */}
          <path d="M9 60 C10 44, 54 44, 55 60 Z" fill="#1E293B" stroke="#0B101B" strokeWidth="2.2" />
          <path d="M13 60 C14 45, 50 45, 51 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="1.8" />
          {/* Circuit-board cyan trim */}
          <path d="M19 48 L24 53 L24 60 M45 48 L40 53 L40 60" fill="none" stroke={accentColor} strokeWidth="1.6" />
          <circle cx="24" cy="53" r="1.4" fill="#22D3EE" />
          <circle cx="40" cy="53" r="1.4" fill="#22D3EE" />
          {/* Brass chest plate & gauntlet lightning coils */}
          <rect x="27" y="48" width="10" height="8" rx="1.5" fill="#B45309" stroke="#FDE047" strokeWidth="1" />
          <circle cx="32" cy="52" r="2.1" fill="#22D3EE" />
          <circle cx="11" cy="54" r="3" fill="none" stroke="#22D3EE" strokeWidth="1.3" />
          <circle cx="53" cy="54" r="3" fill="none" stroke="#22D3EE" strokeWidth="1.3" />
        </g>
      )}

      {charDef.id === 'captain_jalebi' && (
        <g>
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <line x1="32" y1="47" x2="32" y2="60" stroke={accentColor} strokeWidth="3" />
          <circle cx="32" cy="54" r="3" fill="#F97316" stroke="#FEF08A" strokeWidth="1" />
        </g>
      )}

      {charDef.id === 'baba_wifi' && (
        <g>
          <path d="M11 60 C11 44, 53 44, 53 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <path d="M20 47 L38 60" stroke={accentColor} strokeWidth="3.2" />
          <circle cx="42" cy="53" r="2.2" fill="#22D3EE" />
        </g>
      )}

      {charDef.id === 'general_noodle' && (
        <g>
          {/* Puffy winter parka ribs */}
          <path d="M10 60 C10 44, 54 44, 54 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <line x1="16" y1="53" x2="48" y2="53" stroke="#374151" strokeWidth="1.6" />
          <line x1="14" y1="57" x2="50" y2="57" stroke="#374151" strokeWidth="1.6" />
          <path d="M22 46 Q32 51 42 46" fill="none" stroke={accentColor} strokeWidth="2.4" />
        </g>
      )}

      {charDef.id === 'agent_404' && (
        <g>
          {/* Trench coat + upturned lapels + green tie */}
          <path d="M11 60 C11 45, 53 45, 53 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <polygon points="22,46 30,46 27,57" fill="#57534E" stroke="#0B101B" strokeWidth="1.2" />
          <polygon points="42,46 34,46 37,57" fill="#57534E" stroke="#0B101B" strokeWidth="1.2" />
          <polygon points="30,48 34,48 33.5,60 30.5,60" fill={accentColor} />
        </g>
      )}

      {charDef.id === 'prof_jugaad' && (
        <g>
          {/* Lab coat held with silver duct tape */}
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <polygon points="27,46 37,46 32,57" fill="#38BDF8" />
          <rect x="20" y="51" width="11" height="3.2" transform="rotate(-18 20 51)" fill="#94A3B8" stroke="#475569" strokeWidth="0.9" />
          <rect x="35" y="54" width="10" height="3.2" transform="rotate(14 35 54)" fill="#94A3B8" stroke="#475569" strokeWidth="0.9" />
        </g>
      )}

      {charDef.id === 'chappal_ninja' && (
        <g>
          {/* Floral kurti + utility belt */}
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <circle cx="22" cy="52" r="2" fill="#FDE047" />
          <circle cx="42" cy="52" r="2" fill="#F472B6" />
          <rect x="15" y="55.5" width="34" height="3.5" fill="#1E293B" stroke={accentColor} strokeWidth="1" />
          <rect x="29" y="55" width="6" height="4.5" fill={accentColor} />
        </g>
      )}

      {charDef.id === 'dj_dholak' && (
        <g>
          {/* Neon sherwani + chest dhol drum */}
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <rect x="21" y="50" width="22" height="10" rx="3" fill="#B45309" stroke="#FDE047" strokeWidth="1.5" />
          <line x1="25" y1="50" x2="29" y2="60" stroke="#FEF08A" strokeWidth="1.2" />
          <line x1="31" y1="50" x2="35" y2="60" stroke="#FEF08A" strokeWidth="1.2" />
          <line x1="37" y1="50" x2="41" y2="60" stroke="#FEF08A" strokeWidth="1.2" />
        </g>
      )}

      {charDef.id === 'aunty_cctv' && (
        <g>
          {/* Pink cardigan + binoculars + teacup */}
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <rect x="24" y="49" width="6" height="8" rx="1.5" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.2" />
          <rect x="34" y="49" width="6" height="8" rx="1.5" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.2" />
          <line x1="30" y1="52" x2="34" y2="52" stroke="#94A3B8" strokeWidth="2" />
          <rect x="44" y="53" width="6" height="6" rx="1" fill="#F8FAFC" stroke="#0B101B" strokeWidth="1.1" />
        </g>
      )}

      {charDef.id === 'bhaijaan_gymbro' && (
        <g>
          {/* Extra-broad muscular shoulders + neon tank top */}
          <path d="M7 60 C7 42, 57 42, 57 60 Z" fill={charDef.skinTone} stroke="#0B101B" strokeWidth="2.2" />
          <path d="M17 60 L20 45 L26 45 L28 50 L36 50 L38 45 L44 45 L47 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="1.8" />
        </g>
      )}

      {charDef.id === 'exam_topper' && (
        <g>
          {/* School blazer covered in gold medals */}
          <path d="M12 60 C12 45, 52 45, 52 60 Z" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <polygon points="27,46 37,46 32,56" fill="#F8FAFC" />
          <polygon points="30,47 34,47 33.5,58 30.5,58" fill={accentColor} />
          <circle cx="20" cy="53" r="2.5" fill="#FACC15" stroke="#92400E" strokeWidth="0.9" />
          <circle cx="24" cy="57" r="2.2" fill="#FACC15" stroke="#92400E" strokeWidth="0.9" />
          <circle cx="43" cy="54" r="2.5" fill="#FACC15" stroke="#92400E" strokeWidth="0.9" />
        </g>
      )}

      {isSteve && (
        <g>
          <rect x="11" y="46" width="42" height="15" rx="1" fill={bodyColor} stroke="#0B101B" strokeWidth="2.2" />
          <rect x="26" y="46" width="12" height="5" fill={charDef.skinTone} />
          <rect x="28" y="51" width="8" height="3" fill={charDef.skinTone} />
          <rect x="13" y="48" width="6" height="11" fill="rgba(0,0,0,0.16)" />
          <rect x="45" y="48" width="6" height="11" fill="rgba(255,255,255,0.12)" />
        </g>
      )}

      {/* Head: Blocky Minecraft Steve + Sigma Jawline vs Round Caricature */}
      {isSteve ? (
        <g>
          <polygon
            points="16,13 48,13 48,37 42,46 22,46 16,37"
            fill={charDef.skinTone}
            stroke="#0B101B"
            strokeWidth="2.4"
            strokeLinejoin="miter"
          />
          <polygon points="17.5,32 24,38 23,44.5 17.5,37" fill="#9A6238" opacity="0.75" />
          <polygon points="46.5,32 40,38 41,44.5 46.5,37" fill="#9A6238" opacity="0.75" />
          <line x1="20" y1="36" x2="25" y2="43" stroke="#5C3418" strokeWidth="1.6" />
          <line x1="44" y1="36" x2="39" y2="43" stroke="#5C3418" strokeWidth="1.6" />
          <rect x="29.5" y="29" width="5" height="4" fill="#A46B40" />
          <path d="M24 38 H40 V44 H36 V41 H28 V44 H24 Z" fill="#4A2E1B" />
          <rect x="20" y="25" width="7" height="3.8" fill="#FFFFFF" />
          <rect x="37" y="25" width="7" height="3.8" fill="#FFFFFF" />
          <rect x="23" y="25" width="4" height="3.8" fill="#4338CA" />
          <rect x="37" y="25" width="4" height="3.8" fill="#4338CA" />
          <line x1="19.5" y1="23.5" x2="27.5" y2="24.6" stroke="#2D1B0F" strokeWidth="1.8" />
          <line x1="44.5" y1="23.5" x2="36.5" y2="24.6" stroke="#2D1B0F" strokeWidth="1.8" />
          <path d="M28 36.2 Q33 37.5 37 35" fill="none" stroke="#3B1F0F" strokeWidth="1.6" />
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

          {/* Neon Cyber outfit chest glow accent for any character */}
          {outfitId === 'neon_cyber' && (
            <path d="M16 58 L25 50 L39 50 L48 58" fill="none" stroke="#22D3EE" strokeWidth="1.6" opacity="0.85" />
          )}

          {/* Eyes & Eyewear */}
          {charDef.id === 'baron_voltage' ? (
            <g>
              {/* Riveted brass-and-cobalt iron mask + glowing cyan eye slits */}
              <path
                d="M17 20 C17 13, 47 13, 47 20 L46 39 C42 45, 22 45, 18 39 Z"
                fill="#1E3A8A"
                stroke="#0B101B"
                strokeWidth="2"
              />
              {/* Brass brow plate & rivets */}
              <path d="M18 22 H46 L44 26 H20 Z" fill="#B45309" stroke="#0B101B" strokeWidth="1.3" />
              <circle cx="20.5" cy="24" r="1" fill="#FDE047" />
              <circle cx="43.5" cy="24" r="1" fill="#FDE047" />
              <circle cx="21" cy="36" r="1" fill="#FDE047" />
              <circle cx="43" cy="36" r="1" fill="#FDE047" />
              {/* Glowing cyan eye slits */}
              <polygon points="21,28 29,29.5 28,32 21,31" fill="#22D3EE" />
              <polygon points="43,28 35,29.5 36,32 43,31" fill="#22D3EE" />
              {/* Brass vent grille */}
              <rect x="27" y="35.5" width="10" height="5" rx="1" fill="#92400E" stroke="#0B101B" strokeWidth="1.1" />
              <line x1="30" y1="36" x2="30" y2="40" stroke="#0B101B" strokeWidth="1" />
              <line x1="34" y1="36" x2="34" y2="40" stroke="#0B101B" strokeWidth="1" />
            </g>
          ) : charDef.id === 'baba_wifi' ? (
            <g>
              {/* Glowing VR Visor */}
              <rect x="17.5" y="22.5" width="29" height="8" rx="3" fill="#0F172A" stroke="#22D3EE" strokeWidth="1.6" />
              <line x1="20" y1="26.5" x2="44" y2="26.5" stroke="#22D3EE" strokeWidth="2.2" />
            </g>
          ) : charDef.id === 'agent_404' ? (
            <g>
              {/* Glowing Green Night-Vision Goggles */}
              <circle cx="25.5" cy="27" r="4.6" fill="#052E16" stroke="#4ADE80" strokeWidth="1.6" />
              <circle cx="38.5" cy="27" r="4.6" fill="#052E16" stroke="#4ADE80" strokeWidth="1.6" />
              <circle cx="25.5" cy="27" r="2.2" fill="#22C55E" />
              <circle cx="38.5" cy="27" r="2.2" fill="#22C55E" />
              <line x1="30.1" y1="27" x2="33.9" y2="27" stroke="#4ADE80" strokeWidth="1.8" />
            </g>
          ) : charDef.id === 'dj_dholak' ? (
            <g>
              {/* LED Shutter Shades */}
              <rect x="18.5" y="23.5" width="11.5" height="6.5" rx="1.2" fill="#22D3EE" stroke="#0B101B" strokeWidth="1.4" />
              <rect x="34" y="23.5" width="11.5" height="6.5" rx="1.2" fill="#F472B6" stroke="#0B101B" strokeWidth="1.4" />
              <line x1="19" y1="25.8" x2="29.5" y2="25.8" stroke="#0B101B" strokeWidth="1.2" />
              <line x1="34.5" y1="25.8" x2="45" y2="25.8" stroke="#0B101B" strokeWidth="1.2" />
              <line x1="30" y1="26" x2="34" y2="26" stroke="#0B101B" strokeWidth="2" />
            </g>
          ) : (
            <g>
              <circle cx="26" cy="27" r="3.2" fill="#FFFFFF" />
              <circle cx="38" cy="27" r="3.2" fill="#FFFFFF" />
              <circle cx="26.7" cy="27" r="1.7" fill="#0F172A" />
              <circle cx="38.7" cy="27" r="1.7" fill="#0F172A" />

              {charDef.id === 'chai_storm' && (
                <g stroke="#1E293B" strokeWidth="1.8" fill="rgba(255,255,255,0.16)">
                  <circle cx="25.5" cy="27" r="6" />
                  <circle cx="38.5" cy="27" r="6" />
                  <line x1="31.5" y1="27" x2="32.5" y2="27" />
                </g>
              )}

              {(charDef.id === 'exam_topper' || charDef.id === 'aunty_cctv') && (
                <g stroke="#0F172A" strokeWidth="1.6" fill="none">
                  <circle cx="25.5" cy="27" r="5.2" />
                  <circle cx="38.5" cy="27" r="5.2" />
                  <line x1="30.7" y1="27" x2="33.3" y2="27" />
                  {charDef.id === 'exam_topper' && (
                    <g stroke="#38BDF8" strokeWidth="1">
                      <circle cx="25.5" cy="27" r="3.2" />
                      <circle cx="38.5" cy="27" r="3.2" />
                    </g>
                  )}
                </g>
              )}
            </g>
          )}

          {/* Mustaches & Mouths */}
          {charDef.id === 'baron_voltage' ? null : charDef.id === 'chai_storm' ? (
            <path
              d="M20 35 Q26 30 32 34 Q38 30 44 35 Q39 39 32 36 Q25 39 20 35 Z"
              fill="#E2E8F0"
              stroke="#0B101B"
              strokeWidth="1.3"
            />
          ) : charDef.id === 'agent_404' ? (
            <path
              d="M23 34.5 Q28 31 32 33.8 Q36 31 41 34.5 Q36 36.5 32 35 Q28 36.5 23 34.5 Z"
              fill="#18181B"
            />
          ) : charDef.id === 'bhaijaan_gymbro' ? (
            <path d="M25 35 Q32 40 39 35 Z" fill="#FFFFFF" stroke="#7C2D12" strokeWidth="1.6" />
          ) : (
            <path
              d="M27 36 Q32 38.5 37 35.5"
              fill="none"
              stroke="#7C2D12"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}

          {/* Hairstyles & Headgear */}
          {charDef.hairStyle === 'chai_specs' && (
            <path
              d="M16 24 Q20 12 32 13 Q44 12 48 24 Q37 16 16 24 Z"
              fill={charDef.hairColor}
              stroke="#0B101B"
              strokeWidth="1.8"
            />
          )}
          {charDef.hairStyle === 'voltage_mask' && (
            <g>
              {/* Tattered crimson-and-charcoal sorcerer hood with cyan circuit line */}
              <path
                d="M13 28 C12 10, 52 10, 51 28 L46 21 C41 14, 23 14, 18 21 Z"
                fill="#7F1D1D"
                stroke="#0B101B"
                strokeWidth="1.8"
              />
              <path d="M20 15 Q32 10 44 15" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
            </g>
          )}
          {charDef.hairStyle === 'jalebi_band' && (
            <g>
              <path
                d="M17 22 C18 11, 46 11, 47 22 Z"
                fill={charDef.hairColor}
                stroke="#0B101B"
                strokeWidth="1.8"
              />
              <rect x="16" y="18" width="32" height="4.5" rx="1.5" fill="#F97316" stroke="#0B101B" strokeWidth="1.4" />
              <path d="M47 19 L55 16 M47 21 L54 23" stroke="#F97316" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          )}
          {charDef.hairStyle === 'wifi_visor' && (
            <g>
              <line x1="32" y1="14" x2="32" y2="6" stroke="#22D3EE" strokeWidth="2" />
              <circle cx="32" cy="5" r="2" fill="#22D3EE" />
              <path d="M26 7 Q32 3 38 7" fill="none" stroke="#67E8F9" strokeWidth="1.3" />
            </g>
          )}
          {charDef.hairStyle === 'bowl_drones' && (
            <g>
              {/* Bowl-cut helmet + 2 hovering paper lantern drones */}
              <path
                d="M15 23 C15 10, 49 10, 49 23 Z"
                fill={charDef.hairColor}
                stroke="#0B101B"
                strokeWidth="1.8"
              />
              <circle cx="10" cy="21" r="4.5" fill="#EF4444" stroke="#FDE047" strokeWidth="1.3" />
              <line x1="10" y1="15" x2="10" y2="17" stroke="#FDE047" strokeWidth="1.5" />
              <circle cx="54" cy="21" r="4.5" fill="#EF4444" stroke="#FDE047" strokeWidth="1.3" />
              <line x1="54" y1="15" x2="54" y2="17" stroke="#FDE047" strokeWidth="1.5" />
            </g>
          )}
          {charDef.hairStyle === 'spy_fedora' && (
            <g>
              <path d="M21 18 L24 8 L40 8 L43 18 Z" fill="#292524" stroke="#0B101B" strokeWidth="1.6" />
              <rect x="22" y="15" width="20" height="2.6" fill="#22C55E" />
              <ellipse cx="32" cy="18.5" rx="19" ry="3.2" fill="#1C1917" stroke="#0B101B" strokeWidth="1.5" />
            </g>
          )}
          {charDef.hairStyle === 'einstein_goggles' && (
            <g>
              {/* Wild Einstein hair + crooked welding goggles on forehead */}
              <g fill={charDef.hairColor} stroke="#0B101B" strokeWidth="1.6">
                <circle cx="18" cy="19" r="6" />
                <circle cx="26" cy="13" r="6.5" />
                <circle cx="38" cy="13" r="6.5" />
                <circle cx="46" cy="19" r="6" />
              </g>
              <g transform="rotate(-7 32 18)">
                <circle cx="26" cy="18" r="4.2" fill="#38BDF8" stroke="#92400E" strokeWidth="1.8" />
                <circle cx="38" cy="18" r="4.2" fill="#38BDF8" stroke="#92400E" strokeWidth="1.8" />
              </g>
            </g>
          )}
          {charDef.hairStyle === 'bun_hairpin' && (
            <g>
              <circle cx="32" cy="11" r="6.5" fill={charDef.hairColor} stroke="#0B101B" strokeWidth="1.8" />
              <path d="M17 24 C17 12, 47 12, 47 24 Q32 16 17 24 Z" fill={charDef.hairColor} stroke="#0B101B" strokeWidth="1.6" />
              <line x1="25" y1="8" x2="40" y2="14" stroke="#FBBF24" strokeWidth="2.2" />
              <circle cx="40.5" cy="14.2" r="2" fill="#FDE047" />
            </g>
          )}
          {charDef.hairStyle === 'dj_shades' && (
            <g>
              <path d="M17 22 C18 11, 46 11, 47 22 Z" fill={charDef.hairColor} stroke="#0B101B" strokeWidth="1.6" />
              {/* Giant Headphones */}
              <path d="M15 28 C15 10, 49 10, 49 28" fill="none" stroke="#F472B6" strokeWidth="3" />
              <rect x="11.5" y="23" width="5.5" height="11" rx="2.5" fill="#1E293B" stroke="#22D3EE" strokeWidth="1.5" />
              <rect x="47" y="23" width="5.5" height="11" rx="2.5" fill="#1E293B" stroke="#22D3EE" strokeWidth="1.5" />
            </g>
          )}
          {charDef.hairStyle === 'aunty_dish' && (
            <g>
              <circle cx="32" cy="12" r="6" fill={charDef.hairColor} stroke="#0B101B" strokeWidth="1.6" />
              <path d="M17 24 C18 12, 46 12, 47 24 Q32 16 17 24 Z" fill={charDef.hairColor} stroke="#0B101B" strokeWidth="1.6" />
              {/* Mini Satellite Dish on hair bun */}
              <path d="M26 7 Q32 12 38 7" fill="#CBD5E1" stroke="#0B101B" strokeWidth="1.4" />
              <line x1="32" y1="9" x2="32" y2="4.5" stroke="#EC4899" strokeWidth="1.5" />
              <circle cx="32" cy="4" r="1.4" fill="#22D3EE" />
            </g>
          )}
          {charDef.hairStyle === 'gym_sweatband' && (
            <g>
              <path d="M17 21 L23 11 L32 14 L41 11 L47 21 Z" fill={charDef.hairColor} stroke="#0B101B" strokeWidth="1.6" />
              <rect x="16.5" y="17.5" width="31" height="4.2" rx="1.5" fill="#F43F5E" stroke="#0B101B" strokeWidth="1.3" />
            </g>
          )}
          {charDef.hairStyle === 'topper_swirl' && (
            <g>
              <path d="M17 23 C18 11, 46 11, 47 23 Q32 17 17 23 Z" fill={charDef.hairColor} stroke="#0B101B" strokeWidth="1.6" />
              <line x1="25" y1="15" x2="31" y2="19" stroke="#F8FAFC" strokeWidth="1.5" />
            </g>
          )}
        </>
      )}
    </svg>
  );
};
