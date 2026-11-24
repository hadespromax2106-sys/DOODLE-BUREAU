import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  Crosshair,
  Crown,
  Flame,
  Gamepad2,
  Home,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Scale,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { CareerArmoryModal, CareerArmoryTab } from './components/CareerArmoryModal';
import { CaricatureAvatar } from './components/CaricatureAvatar';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { DisclaimerModal } from './components/DisclaimerModal';
import { GameHud } from './components/GameHud';
import { HowToPlayModal } from './components/HowToPlayModal';
import { KillCamOverlay } from './components/KillCamOverlay';
import { LeaderboardModal } from './components/LeaderboardModal';
import { LobbyActionSignal, LobbyStage3D } from './components/LobbyStage3D';
import { MapVotingModal } from './components/MapVotingModal';
import { MatchReplayModal } from './components/MatchReplayModal';
import { OnlineRoomModal } from './components/OnlineRoomModal';
import { PostMatchModal } from './components/PostMatchModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SocialPartyDrawer } from './components/SocialPartyDrawer';
import { TouchControlsOverlay } from './components/TouchControlsOverlay';
import {
  CHARACTERS,
  DEFAULT_CUSTOM_RULES,
  DEFAULT_FREE_CHARACTERS,
  GAME_MODE_CATALOG,
  MAP_CATALOG,
  MELEE_WEAPONS,
  WEAPONS,
  WEAPON_MASTERY_TIERS,
  getGameModeDef,
  getRankForXp,
  normalizeCharacterId,
  normalizeGameMode,
} from './data/catalog';
import {
  acceptFriendRequest,
  createGuestProfile,
  createUniqueGuestProfile,
  declineFriendRequest,
  getActiveSessionIds,
  getProfileById,
  getSampleAiRivals,
  makeUniqueUsername,
  recordMatchForProfile,
  removeFriendByTag,
  sendFriendRequestByTag,
  setActiveSessionId,
  updateProfileAvatar,
} from './db/playerDb';
import { soundEngine } from './game/audio';
import { ArenaGameEngine } from './game/engine';
import { PeerRoomSession } from './net/peerRoom';
import {
  CharacterId,
  CustomMatchRules,
  FriendEntry,
  GameMode,
  HudSnapshot,
  MapId,
  MatchGameMode,
  MatchReplayData,
  MatchSummary,
  OnlinePeerMeta,
  PartyChatMessage,
  PartyMember,
  PlayerProfile,
  PlayerSlotIndex,
  ScreenState,
  VoteLobbyOption,
  ZoomLevel,
} from './types/game';

const DISCLAIMER_STORAGE_KEY = 'doodle_bureau_disclaimer_v1';
const ZOOM_LEVELS: ZoomLevel[] = [0.5, 1, 2, 3];
const DURATION_OPTIONS = [
  { sec: 120, label: '2m' },
  { sec: 180, label: '3m' },
  { sec: 240, label: '4m' },
  { sec: 600, label: '10m Chaos' },
];

function generateVoteLobbyOptions(preferredMode: MatchGameMode): VoteLobbyOption[] {
  const shuffledMaps = [...MAP_CATALOG].sort(() => Math.random() - 0.5);
  const otherModes = GAME_MODE_CATALOG.map((m) => m.id)
    .filter((m) => m !== preferredMode)
    .sort(() => Math.random() - 0.5);

  const pickedModes: MatchGameMode[] = [
    preferredMode,
    otherModes[0] || 'hardpoint',
    otherModes[1] || 'domination',
  ];

  const randomMap = shuffledMaps[3] || shuffledMaps[0];
  const randomMode =
    GAME_MODE_CATALOG[Math.floor(Math.random() * GAME_MODE_CATALOG.length)]?.id || preferredMode;

  return [
    {
      id: `opt_1_${shuffledMaps[0].id}_${pickedModes[0]}`,
      mapId: shuffledMaps[0].id,
      gameMode: pickedModes[0],
    },
    {
      id: `opt_2_${shuffledMaps[1].id}_${pickedModes[1]}`,
      mapId: shuffledMaps[1].id,
      gameMode: pickedModes[1],
    },
    {
      id: `opt_3_${shuffledMaps[2].id}_${pickedModes[2]}`,
      mapId: shuffledMaps[2].id,
      gameMode: pickedModes[2],
    },
    {
      id: 'opt_random',
      isRandom: true,
      mapId: randomMap.id,
      gameMode: randomMode,
    },
  ];
}

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('TITLE_MENU');
  const [mode, setMode] = useState<GameMode>('solo');
  const [botCount, setBotCount] = useState<number>(4);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(1);
  const [muted, setMuted] = useState<boolean>(false);

  // Audio Unlock Splash & Deep-Link Party Invite
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('party');
    if (raw && /^[A-Za-z]{4}$/.test(raw.trim())) {
      return raw.trim().toUpperCase();
    }
    return null;
  });
  const [guestCallsignInput, setGuestCallsignInput] = useState<string>('Operative_Guest');

  // Connectivity & Fullscreen
  const [isOnlineNet, setIsOnlineNet] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Custom Match Rules & Map/Mode Voting
  const [customRules, setCustomRules] = useState<CustomMatchRules>({ ...DEFAULT_CUSTOM_RULES });
  const [showRulesPanel, setShowRulesPanel] = useState<boolean>(false);
  const [selectedMapId, setSelectedMapId] = useState<MapId>('city_dusk');
  const [voteOptions, setVoteOptions] = useState<VoteLobbyOption[]>(() =>
    generateVoteLobbyOptions(DEFAULT_CUSTOM_RULES.gameMode)
  );
  const [voteExternalBallots, setVoteExternalBallots] = useState<Record<string, string>>({});
  const [touchEnabled, setTouchEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  // Profiles & Characters
  const [p1Profile, setP1Profile] = useState<PlayerProfile>(() =>
    createGuestProfile(1, 'mitron')
  );
  const [p2Profile, setP2Profile] = useState<PlayerProfile>(() =>
    createGuestProfile(2, 'tariff_boss')
  );
  const [p1Char, setP1Char] = useState<CharacterId>('mitron');
  const [p2Char, setP2Char] = useState<CharacterId>('tariff_boss');

  // Modals & Drawers
  const [authSlot, setAuthSlot] = useState<1 | 2 | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState<boolean>(false);
  const [showCareer, setShowCareer] = useState<boolean>(false);
  const [careerInitialTab, setCareerInitialTab] = useState<CareerArmoryTab>('career');
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showOnlineModal, setShowOnlineModal] = useState<boolean>(false);
  const [showSocialDrawer, setShowSocialDrawer] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  // Friends & 4-Player Party Squad State
  const [aiRivals] = useState<FriendEntry[]>(() => getSampleAiRivals());
  const [aiPartyBots, setAiPartyBots] = useState<PartyMember[]>([]);
  const [guestPartyMembers, setGuestPartyMembers] = useState<PartyMember[] | null>(null);
  const [partyChat, setPartyChat] = useState<PartyChatMessage[]>([
    {
      id: 'sys_welcome',
      senderName: 'BUREAU COMMS',
      senderTag: 'SYSTEM',
      text: 'Squad radio online. Add friends by #Tag, invite AI rivals, or share a 4-letter Party Code.',
      timestamp: Date.now(),
      isSystem: true,
    },
  ]);
  const [localReady, setLocalReady] = useState<boolean>(true);
  const [localPeerSlot, setLocalPeerSlot] = useState<PlayerSlotIndex>(1);
  const [pingMs, setPingMs] = useState<number>(0);

  // PeerJS Online Room State
  const peerSessionRef = useRef<PeerRoomSession | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [peerRole, setPeerRole] = useState<'host' | 'guest' | null>(null);
  const [peerStatus, setPeerStatus] = useState<
    'idle' | 'connecting' | 'waiting' | 'connected' | 'error'
  >('idle');
  const [peerMessage, setPeerMessage] = useState<string>('');
  const [remotePeerMeta, setRemotePeerMeta] = useState<OnlinePeerMeta | null>(null);
  const [remotePeers, setRemotePeers] = useState<
    Array<{ slot: 2 | 3 | 4; meta: OnlinePeerMeta; ready: boolean }>
  >([]);

  // Active Match State
  const [matchKey, setMatchKey] = useState<number>(0);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);
  const [lastReplay, setLastReplay] = useState<MatchReplayData | null>(null);
  const [showReplay, setShowReplay] = useState<boolean>(false);
  const [lobbyAction, setLobbyAction] = useState<LobbyActionSignal | null>(null);
  const readyLaunchTimeoutRef = useRef<number | null>(null);

  const triggerLobbyAction = useCallback((type: LobbyActionSignal['type']) => {
    setLobbyAction((prev) => ({ type, seq: (prev?.seq || 0) + 1 }));
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ArenaGameEngine | null>(null);

  const buildLocalMeta = useCallback((): OnlinePeerMeta => {
    return {
      username: p1Profile.username,
      playerTag: p1Profile.playerTag,
      profileId: p1Profile.id,
      characterId: p1Char,
      outfitId: p1Profile.cosmetics.equippedOutfit,
      flameId: p1Profile.cosmetics.equippedFlame,
      startingWeapon: p1Profile.cosmetics.equippedStartingWeapon,
      secondaryWeapon: p1Profile.cosmetics.equippedSecondary || 'pistol',
      meleeWeapon: p1Profile.cosmetics.equippedMelee || 'knife',
      xp: p1Profile.xp,
      masteryEquipped: p1Profile.masteryEquipped,
    };
  }, [p1Profile, p1Char]);

  const partyMembers: PartyMember[] = React.useMemo(() => {
    if (peerRole === 'guest' && guestPartyMembers && guestPartyMembers.length > 0) {
      return guestPartyMembers;
    }
    const list: PartyMember[] = [
      PeerRoomSession.buildPartyMemberFromMeta(1, buildLocalMeta(), {
        isHost: true,
        isAi: false,
        isReady: true,
      }),
    ];
    for (const rp of remotePeers) {
      if (list.length >= 4) break;
      list.push(
        PeerRoomSession.buildPartyMemberFromMeta(rp.slot, rp.meta, {
          isHost: false,
          isAi: false,
          isReady: rp.ready,
        })
      );
    }
    for (const bot of aiPartyBots) {
      if (list.length >= 4) break;
      const used = new Set(list.map((m) => m.slot));
      const freeSlot = ([2, 3, 4] as const).find((s) => !used.has(s));
      if (!freeSlot) break;
      list.push({ ...bot, slot: freeSlot });
    }
    return list;
  }, [peerRole, guestPartyMembers, buildLocalMeta, remotePeers, aiPartyBots]);

  // Broadcast party state when Host updates squad/rules
  useEffect(() => {
    if (peerRole === 'host' && peerSessionRef.current?.isConnected()) {
      peerSessionRef.current.send({
        type: 'party_state',
        payload: { members: partyMembers, botCount, rules: customRules },
      });
    }
  }, [peerRole, partyMembers, botCount, customRules]);

  // Keep connected PeerJS opponent synced if P1 changes character or profile in lobby
  useEffect(() => {
    if (peerSessionRef.current && peerSessionRef.current.isConnected()) {
      peerSessionRef.current.updateLocalMeta(buildLocalMeta());
    }
  }, [buildLocalMeta]);

  const syncPeersFromSession = useCallback(() => {
    if (!peerSessionRef.current) return;
    const peers = peerSessionRef.current.getConnectedPeers();
    setRemotePeers(peers);
    setRemotePeerMeta(peers[0]?.meta || null);
  }, []);

  // Keep PeerJS lobby/vote/party callbacks fresh
  useEffect(() => {
    peerSessionRef.current?.updateCallbacks({
      onStatusChange: (status, message) => {
        setPeerStatus(status);
        setPeerMessage(message || '');
      },
      onSlotAssigned: (slot) => {
        setLocalPeerSlot(slot);
      },
      onRemoteMeta: (meta, slot) => {
        setRemotePeerMeta(meta);
        if (slot && slot >= 2) {
          syncPeersFromSession();
        }
      },
      onPeerReadyChange: () => {
        syncPeersFromSession();
      },
      onPeerDisconnected: () => {
        syncPeersFromSession();
      },
      onPartyState: (data) => {
        setGuestPartyMembers(data.members);
        setBotCount(data.botCount);
        setCustomRules(data.rules);
      },
      onPartyChat: (msg) => {
        setPartyChat((prev) => [...prev.slice(-49), msg]);
      },
      onPingUpdate: (ms) => {
        setPingMs(ms);
      },
      onVoteStart: (data) => {
        setRemotePeerMeta(data.hostMeta);
        setBotCount(data.botCount);
        setCustomRules(data.rules);
        if (data.options?.length) setVoteOptions(data.options);
        if (data.partyMembers?.length) setGuestPartyMembers(data.partyMembers);
        setVoteExternalBallots({});
        setMode('online_client');
        setShowOnlineModal(false);
        setShowSocialDrawer(false);
        setShowReplay(false);
        setMatchSummary(null);
        setScreen('MAP_VOTING');
      },
      onMapVote: (data) => {
        setVoteExternalBallots((prev) => ({
          ...prev,
          [data.voterId]: data.optionId || data.mapId,
        }));
      },
      onMatchStart: (data) => {
        setRemotePeerMeta(data.hostMeta);
        if (data.remotePeers) {
          setRemotePeers(
            data.remotePeers.map((rp) => ({ slot: rp.slot, meta: rp.meta, ready: true }))
          );
        }
        if (data.partyMembers?.length) setGuestPartyMembers(data.partyMembers);
        setBotCount(data.botCount);
        setSelectedMapId(data.mapId);
        const resolvedRules = {
          ...data.rules,
          gameMode: normalizeGameMode(data.gameMode || data.rules.gameMode),
        };
        setCustomRules(resolvedRules);
        setMode('online_client');
        setShowOnlineModal(false);
        setShowSocialDrawer(false);
        setShowReplay(false);
        setLastReplay(null);
        setMatchSummary(null);
        setScreen('PLAYING');
        setMatchKey((k) => k + 1);
      },
    });
  }, [syncPeersFromSession]);

  // Track online/offline & fullscreen state
  useEffect(() => {
    const onOnline = () => setIsOnlineNet(true);
    const onOffline = () => setIsOnlineNet(false);
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  // Load persisted active profiles on boot
  useEffect(() => {
    (async () => {
      const { p1Id, p2Id } = getActiveSessionIds();
      let resolvedP1Name = '';
      if (p1Id) {
        const prof1 = await getProfileById(p1Id);
        if (prof1) {
          resolvedP1Name = prof1.username.toLowerCase();
          setP1Profile(prof1);
          const norm = normalizeCharacterId(prof1.avatarId);
          const allowed = prof1.cosmetics.unlockedCharacters || DEFAULT_FREE_CHARACTERS;
          setP1Char(allowed.includes(norm) ? norm : 'mitron');
        }
      }
      if (p2Id) {
        const prof2 = await getProfileById(p2Id);
        if (prof2 && prof2.username.toLowerCase() !== resolvedP1Name) {
          setP2Profile(prof2);
          const norm = normalizeCharacterId(prof2.avatarId);
          const allowed = prof2.cosmetics.unlockedCharacters || DEFAULT_FREE_CHARACTERS;
          setP2Char(allowed.includes(norm) ? norm : 'tariff_boss');
        } else if (prof2 && prof2.username.toLowerCase() === resolvedP1Name) {
          setP2Profile(await createUniqueGuestProfile(2, 'tariff_boss', undefined, [prof2.username]));
          setActiveSessionId(2, null);
        }
      }
    })();

    return () => {
      peerSessionRef.current?.destroy();
    };
  }, []);

  // Copyright & Humor Disclaimer Screen
  const [disclaimerAcked, setDisclaimerAcked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISCLAIMER_STORAGE_KEY) === 'accepted';
    } catch {
      return false;
    }
  });
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISCLAIMER_STORAGE_KEY) !== 'accepted';
    } catch {
      return true;
    }
  });

  const handleAcceptDisclaimer = () => {
    soundEngine.unlock();
    setAudioUnlocked(true);
    setDisclaimerAcked(true);
    setShowDisclaimer(false);
    try {
      localStorage.setItem(DISCLAIMER_STORAGE_KEY, 'accepted');
    } catch {
      // Ignore storage error
    }
  };

  const handleUnlockAudioSplash = () => {
    soundEngine.unlock();
    setAudioUnlocked(true);
  };

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleChangeZoom = useCallback((nextZoom: ZoomLevel) => {
    setZoomLevel(nextZoom);
    engineRef.current?.setZoom(nextZoom);
  }, []);

  const handleSelectProfile = useCallback(
    (slot: 1 | 2, profile: PlayerProfile) => {
      const safeChar = normalizeCharacterId(profile.avatarId);
      const unlocked = profile.cosmetics.unlockedCharacters || DEFAULT_FREE_CHARACTERS;
      const validChar = unlocked.includes(safeChar)
        ? safeChar
        : slot === 1
        ? 'mitron'
        : 'tariff_boss';
      if (slot === 1) {
        setP1Profile(profile);
        setP1Char(validChar);
        setActiveSessionId(1, profile.isGuest ? null : profile.id);
        if (p2Profile.username.toLowerCase() === profile.username.toLowerCase()) {
          setP2Profile(createGuestProfile(2, p2Char, undefined, [profile.username]));
          setActiveSessionId(2, null);
          void createUniqueGuestProfile(2, p2Char, undefined, [profile.username]).then((u) => {
            setP2Profile((curr) => (curr.isGuest ? u : curr));
          });
        }
      } else {
        setP2Profile(profile);
        setP2Char(validChar);
        setActiveSessionId(2, profile.isGuest ? null : profile.id);
        if (p1Profile.username.toLowerCase() === profile.username.toLowerCase()) {
          setP1Profile(createGuestProfile(1, p1Char, undefined, [profile.username]));
          setActiveSessionId(1, null);
          void createUniqueGuestProfile(1, p1Char, undefined, [profile.username]).then((u) => {
            setP1Profile((curr) => (curr.isGuest ? u : curr));
          });
        }
      }
    },
    [p1Profile.username, p2Profile.username, p1Char, p2Char]
  );

  const handlePickCharacter = async (slot: 1 | 2, charId: CharacterId) => {
    if (slot === 1) {
      setP1Char(charId);
      triggerLobbyAction('switch');
      if (!p1Profile.isGuest) {
        const updated = await updateProfileAvatar(p1Profile.id, charId);
        if (updated) setP1Profile(updated);
      }
    } else {
      setP2Char(charId);
      if (!p2Profile.isGuest) {
        const updated = await updateProfileAvatar(p2Profile.id, charId);
        if (updated) setP2Profile(updated);
      }
    }
  };

  const ensurePeerSession = useCallback(() => {
    if (!peerSessionRef.current) {
      peerSessionRef.current = new PeerRoomSession(buildLocalMeta(), {
        onStatusChange: (status, message) => {
          setPeerStatus(status);
          setPeerMessage(message || '');
        },
        onSlotAssigned: (slot) => {
          setLocalPeerSlot(slot);
        },
        onRemoteMeta: (meta, slot) => {
          setRemotePeerMeta(meta);
          if (slot && slot >= 2) {
            syncPeersFromSession();
          }
        },
        onPeerReadyChange: () => {
          syncPeersFromSession();
        },
        onPeerDisconnected: () => {
          syncPeersFromSession();
        },
        onPartyState: (data) => {
          setGuestPartyMembers(data.members);
          setBotCount(data.botCount);
          setCustomRules(data.rules);
        },
        onPartyChat: (msg) => {
          setPartyChat((prev) => [...prev.slice(-49), msg]);
        },
        onPingUpdate: (ms) => {
          setPingMs(ms);
        },
        onVoteStart: (data) => {
          setRemotePeerMeta(data.hostMeta);
          setBotCount(data.botCount);
          setCustomRules(data.rules);
          if (data.options?.length) setVoteOptions(data.options);
          if (data.partyMembers?.length) setGuestPartyMembers(data.partyMembers);
          setVoteExternalBallots({});
          setMode('online_client');
          setShowOnlineModal(false);
          setShowSocialDrawer(false);
          setShowReplay(false);
          setMatchSummary(null);
          setScreen('MAP_VOTING');
        },
        onMapVote: (data) => {
          setVoteExternalBallots((prev) => ({
            ...prev,
            [data.voterId]: data.optionId || data.mapId,
          }));
        },
        onMatchStart: (data) => {
          setRemotePeerMeta(data.hostMeta);
          if (data.remotePeers) {
            setRemotePeers(
              data.remotePeers.map((rp) => ({ slot: rp.slot, meta: rp.meta, ready: true }))
            );
          }
          if (data.partyMembers?.length) setGuestPartyMembers(data.partyMembers);
          setBotCount(data.botCount);
          setSelectedMapId(data.mapId);
          setCustomRules({
            ...data.rules,
            gameMode: normalizeGameMode(data.gameMode || data.rules.gameMode),
          });
          setMode('online_client');
          setShowOnlineModal(false);
          setShowSocialDrawer(false);
          setShowReplay(false);
          setLastReplay(null);
          setMatchSummary(null);
          setScreen('PLAYING');
          setMatchKey((k) => k + 1);
        },
      });
    }
    return peerSessionRef.current;
  }, [buildLocalMeta, syncPeersFromSession]);

  const handleHostOnlineRoom = () => {
    if (!isOnlineNet) return;
    const session = ensurePeerSession();
    session.updateLocalMeta(buildLocalMeta());
    setRemotePeerMeta(null);
    setRemotePeers([]);
    setGuestPartyMembers(null);
    setPeerRole('host');
    setLocalPeerSlot(1);
    const code = session.hostRoom();
    setRoomCode(code);
  };

  const handleJoinOnlineRoom = (code: string) => {
    if (!isOnlineNet) return;
    const session = ensurePeerSession();
    session.updateLocalMeta(buildLocalMeta());
    setRemotePeerMeta(null);
    setRemotePeers([]);
    setGuestPartyMembers(null);
    setPeerRole('guest');
    setLocalReady(true);
    setRoomCode(code.trim().toUpperCase());
    session.joinRoom(code);
  };

  const handleDisconnectOnline = () => {
    peerSessionRef.current?.destroy();
    peerSessionRef.current = null;
    setPeerRole(null);
    setRoomCode('');
    setPeerStatus('idle');
    setPeerMessage('');
    setRemotePeerMeta(null);
    setRemotePeers([]);
    setGuestPartyMembers(null);
    setLocalPeerSlot(1);
    setPingMs(0);
    if (mode === 'online_host' || mode === 'online_client') {
      setMode('solo');
    }
  };

  const handleStartOnlineMatchAsHost = () => {
    const session = peerSessionRef.current;
    if (!session || !session.isConnected()) return;
    const hostMeta = buildLocalMeta();
    const generatedOptions = generateVoteLobbyOptions(customRules.gameMode);
    soundEngine.unlock();
    setVoteOptions(generatedOptions);
    setVoteExternalBallots({});
    setMode('online_host');
    setShowOnlineModal(false);
    setShowSocialDrawer(false);
    setShowReplay(false);
    setLastReplay(null);
    setMatchSummary(null);
    session.send({
      type: 'vote_start',
      payload: {
        hostMeta,
        botCount,
        rules: customRules,
        options: generatedOptions,
        partyMembers,
      },
    });
    setScreen('MAP_VOTING');
  };

  const launchGameplayWithMap = useCallback(
    (winningMapId: MapId, winningGameMode: MatchGameMode) => {
      const resolvedMode = normalizeGameMode(winningGameMode || customRules.gameMode);
      const nextRules = { ...customRules, gameMode: resolvedMode };
      setSelectedMapId(winningMapId);
      setCustomRules(nextRules);

      if (mode === 'online_host' && peerSessionRef.current) {
        const connectedList = peerSessionRef.current.getConnectedPeers();
        peerSessionRef.current.send({
          type: 'match_start',
          payload: {
            hostMeta: buildLocalMeta(),
            guestMeta: connectedList[0]?.meta || remotePeerMeta || undefined,
            remotePeers: connectedList.map((p) => ({ slot: p.slot, meta: p.meta })),
            partyMembers,
            botCount,
            mapId: winningMapId,
            gameMode: resolvedMode,
            rules: nextRules,
          },
        });
      }
      soundEngine.unlock();
      setShowReplay(false);
      setLastReplay(null);
      setMatchSummary(null);
      setScreen('PLAYING');
      setMatchKey((k) => k + 1);
    },
    [mode, remotePeerMeta, buildLocalMeta, partyMembers, botCount, customRules]
  );

  const startMatch = useCallback(() => {
    if (mode === 'online_host' || mode === 'online_client') {
      if (mode === 'online_host' && peerSessionRef.current?.isConnected()) {
        handleStartOnlineMatchAsHost();
      } else {
        setShowOnlineModal(true);
      }
      return;
    }
    soundEngine.unlock();
    triggerLobbyAction('ready');
    setShowRulesPanel(false);
    setShowSocialDrawer(false);
    setVoteOptions(generateVoteLobbyOptions(customRules.gameMode));
    setVoteExternalBallots({});
    setShowReplay(false);
    setLastReplay(null);
    setMatchSummary(null);
    if (readyLaunchTimeoutRef.current) {
      window.clearTimeout(readyLaunchTimeoutRef.current);
    }
    readyLaunchTimeoutRef.current = window.setTimeout(() => {
      readyLaunchTimeoutRef.current = null;
      setScreen('MAP_VOTING');
    }, 260);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, triggerLobbyAction, customRules.gameMode]);

  useEffect(() => {
    return () => {
      if (readyLaunchTimeoutRef.current) {
        window.clearTimeout(readyLaunchTimeoutRef.current);
      }
    };
  }, []);

  const handleMatchEnd = useCallback(
    async (rawSummary: MatchSummary) => {
      const capturedReplay = engineRef.current?.getReplayData() ?? null;
      if (capturedReplay && capturedReplay.frames.length > 0) {
        setLastReplay(capturedReplay);
      }

      const activeMode = normalizeGameMode(rawSummary.gameMode);
      const isObjMode = activeMode === 'hardpoint' || activeMode === 'domination' || activeMode === 'ctf';
      const localSlot = mode === 'online_client' ? localPeerSlot : 1;
      const localStanding = rawSummary.standings.find((s) => s.playerIndex === localSlot);
      const p2Standing =
        mode === 'versus_2p' ? rawSummary.standings.find((s) => s.playerIndex === 2) : undefined;

      const isStandingWinner = (standing?: typeof localStanding) => {
        if (!standing) return false;
        if (rawSummary.winnerTeam && standing.team) {
          return rawSummary.winnerTeam === standing.team;
        }
        return rawSummary.winnerId === standing.id;
      };

      const localWon =
        mode === 'versus_2p'
          ? Boolean(rawSummary.standings[0]?.isHuman)
          : isStandingWinner(localStanding);
      soundEngine.playEndOfMatchJingle(localWon);

      let p1Reward;
      if (localStanding) {
        const res1 = await recordMatchForProfile(p1Profile, {
          kills: localStanding.kills,
          deaths: localStanding.deaths,
          won: isStandingWinner(localStanding),
          weaponKills: localStanding.weaponKills,
          isKoth: isObjMode,
          telemetry: localStanding.telemetry,
        });
        p1Reward = res1.reward;
        if (!p1Profile.isGuest) {
          setP1Profile(res1.updatedProfile);
        }
      }

      let p2Reward;
      if (mode === 'versus_2p' && p2Standing) {
        const res2 = await recordMatchForProfile(p2Profile, {
          kills: p2Standing.kills,
          deaths: p2Standing.deaths,
          won: isStandingWinner(p2Standing),
          weaponKills: p2Standing.weaponKills,
          isKoth: isObjMode,
          telemetry: p2Standing.telemetry,
        });
        p2Reward = res2.reward;
        if (!p2Profile.isGuest) {
          setP2Profile(res2.updatedProfile);
        }
      }

      setMatchSummary({
        ...rawSummary,
        p1Reward,
        p2Reward,
      });

      if (capturedReplay && capturedReplay.frames.length > 10 && capturedReplay.winningKillerId) {
        setScreen('KILL_CAM');
      } else {
        setScreen('MATCH_SUMMARY');
      }
    },
    [mode, localPeerSlot, p1Profile, p2Profile]
  );

  useEffect(() => {
    if (screen !== 'PLAYING' && screen !== 'PAUSED') {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (!engineRef.current) {
      const engine = new ArenaGameEngine(canvas, {
        mode,
        botCount,
        matchDurationSec: customRules.durationSec,
        mapId: selectedMapId,
        rules: customRules,
        zoom: zoomLevel,
        p1Profile,
        p1CharacterId: p1Char,
        p2Profile: mode === 'versus_2p' ? p2Profile : undefined,
        p2CharacterId: mode === 'versus_2p' ? p2Char : undefined,
        onlinePeerMeta:
          mode === 'online_host' || mode === 'online_client'
            ? remotePeerMeta || undefined
            : undefined,
        onlinePeers:
          mode === 'online_host' || mode === 'online_client'
            ? remotePeers.map((rp) => ({ slot: rp.slot, meta: rp.meta }))
            : undefined,
        partyMembers,
        localPlayerIndex: mode === 'online_client' ? localPeerSlot : 1,
        peerSession: peerSessionRef.current,
        onHudUpdate: setHud,
        onMatchEnd: handleMatchEnd,
      });
      engineRef.current = engine;
      engine.start();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchKey, screen === 'PLAYING' || screen === 'PAUSED']);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setPaused(screen === 'PAUSED');
    }
  }, [screen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (
          authSlot ||
          showCharacterModal ||
          showCareer ||
          showLeaderboard ||
          showOnlineModal ||
          showRulesPanel ||
          showSocialDrawer ||
          showHowToPlay ||
          (showDisclaimer && disclaimerAcked)
        ) {
          setAuthSlot(null);
          setShowCharacterModal(false);
          setShowCareer(false);
          setShowLeaderboard(false);
          setShowOnlineModal(false);
          setShowRulesPanel(false);
          setShowSocialDrawer(false);
          setShowHowToPlay(false);
          if (disclaimerAcked) setShowDisclaimer(false);
          return;
        }
        if (screen === 'PLAYING') {
          setScreen('PAUSED');
        } else if (screen === 'PAUSED') {
          setScreen('PLAYING');
        }
      } else if (e.code === 'KeyZ' && screen === 'PLAYING') {
        setZoomLevel((prev) => {
          const idx = ZOOM_LEVELS.indexOf(prev);
          const next = ZOOM_LEVELS[(idx + 1) % ZOOM_LEVELS.length];
          engineRef.current?.setZoom(next);
          return next;
        });
      } else if (
        e.code === 'Enter' &&
        screen === 'TITLE_MENU' &&
        audioUnlocked &&
        !authSlot &&
        !showCharacterModal &&
        !showCareer &&
        !showLeaderboard &&
        !showOnlineModal &&
        !showReplay &&
        !showRulesPanel &&
        !showSocialDrawer &&
        !showHowToPlay &&
        !showDisclaimer &&
        !pendingInviteCode
      ) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'BUTTON') {
          startMatch();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screen,
    audioUnlocked,
    authSlot,
    showCharacterModal,
    showCareer,
    showLeaderboard,
    showOnlineModal,
    showReplay,
    showRulesPanel,
    showSocialDrawer,
    showHowToPlay,
    showDisclaimer,
    disclaimerAcked,
    pendingInviteCode,
    startMatch,
  ]);

  const quitToLobby = () => {
    if (engineRef.current) {
      if (!matchSummary) {
        const partial = engineRef.current.getReplayData();
        if (partial.frames.length > 20) {
          setLastReplay(partial);
        }
      }
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setShowReplay(false);
    setHud(null);
    setMatchSummary(null);
    if (mode === 'online_host' || mode === 'online_client') {
      setMode('solo');
    }
    setScreen('TITLE_MENU');
  };

  const restartMatch = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    if (mode === 'online_host') {
      handleStartOnlineMatchAsHost();
      return;
    }
    if (mode === 'online_client') {
      quitToLobby();
      setShowOnlineModal(true);
      return;
    }
    startMatch();
  };

  const p1Rank = getRankForXp(p1Profile.xp);
  const p2Rank = getRankForXp(p2Profile.xp);
  const activeP1Def = CHARACTERS.find((c) => c.id === p1Char) || CHARACTERS[0];
  const activeP2Def = CHARACTERS.find((c) => c.id === p2Char) || CHARACTERS[1];
  const equippedWeapon = WEAPONS[p1Profile.cosmetics.equippedStartingWeapon];
  const equippedMastery =
    p1Profile.masteryEquipped?.[p1Profile.cosmetics.equippedStartingWeapon] || 'none';
  const equippedMasteryDef =
    WEAPON_MASTERY_TIERS.find((m) => m.tier === equippedMastery) || WEAPON_MASTERY_TIERS[0];
  const p1Kd =
    p1Profile.stats.deaths > 0
      ? (p1Profile.stats.kills / p1Profile.stats.deaths).toFixed(2)
      : p1Profile.stats.kills.toFixed(2);
  const activeGameModeDef = getGameModeDef(customRules.gameMode);
  const localVoterId =
    mode === 'online_client' ? `guest_p${localPeerSlot}` : 'host_p1';

  const localHudFighter = hud
    ? mode === 'online_client'
      ? hud.fighters.find((f) => f.playerIndex === localPeerSlot) || hud.fighters[0]
      : hud.fighters.find((f) => f.playerIndex === 1) || hud.fighters[0]
    : undefined;

  const durationMinutes = Math.round(customRules.durationSec / 60);
  const playLabel =
    customRules.durationSec >= 600
      ? `Play ${activeGameModeDef.shortName} (10m Chaos)`
      : `Play ${activeGameModeDef.shortName} (${durationMinutes}m)`;

  const incomingFriendRequestsCount = (p1Profile.friendRequests || []).filter(
    (r) => r.direction === 'incoming'
  ).length;

  const handleSendFriendRequest = async (tag: string) => {
    const res = await sendFriendRequestByTag(p1Profile, tag);
    if (res.ok) {
      setP1Profile(res.profile);
      return { ok: true };
    }
    return { ok: false, error: res.error };
  };

  const handleAcceptFriendReq = async (reqId: string) => {
    const updated = await acceptFriendRequest(p1Profile, reqId);
    setP1Profile(updated);
  };

  const handleDeclineFriendReq = async (reqId: string) => {
    const updated = await declineFriendRequest(p1Profile, reqId);
    setP1Profile(updated);
  };

  const handleRemoveFriend = async (tag: string) => {
    const updated = await removeFriendByTag(p1Profile, tag);
    setP1Profile(updated);
  };

  const handleInviteFriendToParty = (friend: FriendEntry) => {
    if (friend.isAiRival) {
      if (partyMembers.length >= 4) return;
      if (aiPartyBots.some((b) => b.id === friend.id)) return;
      const newBot: PartyMember = {
        slot: 2,
        id: friend.id,
        username: friend.username,
        playerTag: friend.playerTag,
        characterId: friend.characterId,
        outfitId: friend.outfitId,
        flameId: 'cobalt',
        startingWeapon: 'ak',
        secondaryWeapon: 'pistol',
        meleeWeapon: 'knife',
        weaponMastery: 'none',
        xp: 900,
        rankTitle: friend.rankTitle,
        isHost: false,
        isAi: true,
        isReady: true,
        status: 'online',
      };
      setAiPartyBots((prev) => [...prev, newBot]);
      setPartyChat((prev) => [
        ...prev.slice(-49),
        {
          id: `sys_${Date.now()}`,
          senderName: 'BUREAU COMMS',
          senderTag: 'SYSTEM',
          text: `${friend.username} joined your 3D squad pedestal!`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
      return;
    }
    if (!peerSessionRef.current && isOnlineNet) {
      handleHostOnlineRoom();
    }
  };

  const handleKickPartyMember = (memberId: string) => {
    setAiPartyBots((prev) => prev.filter((b) => b.id !== memberId));
  };

  const handleSendPartyChat = (text: string) => {
    const msg: PartyChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderName: p1Profile.username,
      senderTag: p1Profile.playerTag || `${p1Profile.username}#1001`,
      text,
      timestamp: Date.now(),
    };
    setPartyChat((prev) => [...prev.slice(-49), msg]);
    if (peerSessionRef.current?.isConnected()) {
      peerSessionRef.current.send({ type: 'party_chat', payload: msg });
    }
  };

  const handleTogglePartyReady = () => {
    setLocalReady((prev) => {
      const next = !prev;
      if (peerRole === 'guest' && peerSessionRef.current?.isConnected()) {
        peerSessionRef.current.send({
          type: 'party_ready',
          payload: { slot: localPeerSlot, ready: next },
        });
      }
      return next;
    });
  };

  const handleConfirmJoinInvite = () => {
    if (!pendingInviteCode) return;
    const rawCallsign = guestCallsignInput.trim().slice(0, 16);
    if (p1Profile.isGuest && rawCallsign) {
      const taken = new Set([p2Profile.username.toLowerCase()]);
      const uniqueCallsign = makeUniqueUsername(rawCallsign, taken);
      setP1Profile((prev) => ({
        ...prev,
        username: uniqueCallsign,
        playerTag: `${uniqueCallsign}#${prev.discriminator || '1001'}`,
      }));
    }
    const targetCode = pendingInviteCode;
    setPendingInviteCode(null);
    if (typeof window !== 'undefined' && window.location.search.includes('party=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    handleJoinOnlineRoom(targetCode);
    setShowSocialDrawer(true);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B101B] text-slate-100">
      {/* ================= TITLE SCREEN / 3D COD-STYLE LOBBY ================= */}
      {screen === 'TITLE_MENU' && (
        <div className="relative h-full w-full flex flex-col justify-between overflow-hidden">
          {/* Interactive 3D Three.js Stage Backdrop */}
          <LobbyStage3D
            characterId={p1Char}
            outfitId={p1Profile.cosmetics.equippedOutfit}
            flameId={p1Profile.cosmetics.equippedFlame}
            weaponId={p1Profile.cosmetics.equippedStartingWeapon}
            weaponMastery={equippedMastery}
            partyMembers={partyMembers}
            paused={screen !== 'TITLE_MENU'}
            actionSignal={lobbyAction}
          />

          {/* Offline Notice Banner */}
          {!isOnlineNet && (
            <div className="relative z-20 flex items-center justify-center gap-2 bg-rose-950/90 border-b border-rose-500/50 px-4 py-1.5 text-xs font-semibold text-rose-200">
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              Offline Mode · Local Solo &amp; 2P Matches available · Online WebRTC rooms paused until reconnected
            </div>
          )}

          {/* Top Navigation Bar */}
          <div className="pointer-events-none relative z-10 flex items-center justify-between px-6 pt-4 gap-3 flex-wrap">
            {/* Left: Active Profile Pills with Floating Caricature Avatars */}
            <div className="pointer-events-auto flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setAuthSlot(1)}
                className="flex items-center gap-2.5 rounded-lg border border-slate-700/80 bg-[#0B101B]/88 px-3.5 py-2 text-left hover:border-amber-500/70 transition-colors"
              >
                <div className="animate-avatar-float shrink-0">
                  <CaricatureAvatar
                    characterId={p1Char}
                    outfitId={p1Profile.cosmetics.equippedOutfit}
                    size={36}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span>{p1Profile.username}</span>
                    {p1Profile.playerTag && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono-tabular text-sky-300">
                        {p1Profile.playerTag}
                      </span>
                    )}
                    <span className="text-slate-500">·</span>
                    <span style={{ color: p1Rank.badgeColor }}>{p1Rank.title}</span>
                  </div>
                  <div className="text-[11px] font-mono-tabular text-slate-400">
                    {p1Profile.isGuest
                      ? 'Guest · Click to Sign In / Register'
                      : `${p1Profile.xp} XP · ${p1Profile.coins} Coins`}
                  </div>
                </div>
              </button>

              {mode === 'versus_2p' && (
                <button
                  onClick={() => setAuthSlot(2)}
                  className="flex items-center gap-2.5 rounded-lg border border-sky-700/70 bg-[#0B101B]/88 px-3.5 py-2 text-left hover:border-sky-400 transition-colors"
                >
                  <div className="animate-avatar-float shrink-0">
                    <CaricatureAvatar
                      characterId={p2Char}
                      outfitId={p2Profile.cosmetics.equippedOutfit}
                      size={36}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span>P2: {p2Profile.username}</span>
                      <span className="text-slate-500">·</span>
                      <span style={{ color: p2Rank.badgeColor }}>{p2Rank.title}</span>
                    </div>
                    <div className="text-[11px] font-mono-tabular text-slate-400">
                      {p2Profile.isGuest ? 'Guest · Switch P2 Account' : `${p2Profile.xp} XP`}
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Right: Utility, PWA, Social/Friends, How-To-Play & Quick Actions */}
            <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
              <PWAInstallButton />

              <button
                onClick={() => {
                  setCareerInitialTab('challenges');
                  setShowCareer(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0B101B]/88 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-amber-500/70 whitespace-nowrap shrink-0 transition-colors"
              >
                <Target className="h-4 w-4 text-emerald-400" />
                Challenges
              </button>

              <button
                onClick={() => setShowHowToPlay(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0B101B]/88 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/70 hover:text-white whitespace-nowrap shrink-0 transition-colors"
                title="How to Play & Controls"
              >
                <Gamepad2 className="h-4 w-4 text-cyan-400" />
                How to Play
              </button>

              <button
                onClick={() => setShowSocialDrawer(true)}
                className="relative flex items-center gap-1.5 rounded-lg border border-cyan-500/60 bg-[#0B101B]/90 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:border-cyan-400 hover:text-white whitespace-nowrap shrink-0 transition-colors"
                title="Friends List & 4-Player Party Squad"
              >
                <Users className="h-4 w-4 text-cyan-400" />
                Social / Squad ({partyMembers.length}/4)
                {incomingFriendRequestsCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                    {incomingFriendRequestsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowDisclaimer(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0B101B]/88 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-amber-500/70 hover:text-white whitespace-nowrap shrink-0 transition-colors"
                title="Copyright & Humor Disclaimer"
              >
                <Scale className="h-4 w-4 text-slate-400" />
                Disclaimer
              </button>

              <button
                onClick={toggleFullscreen}
                className="rounded-lg border border-slate-700/80 bg-[#0B101B]/88 p-2 text-slate-200 hover:border-amber-500/70 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                onClick={toggleMute}
                className="rounded-lg border border-slate-700/80 bg-[#0B101B]/88 p-2 text-slate-200 hover:border-amber-500/70 transition-colors"
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Center COD-Style Menu Layout: Left Glass Menu Stack + Open 3D Stage + Floating Holographic Nameplate */}
          <div className="pointer-events-none relative z-10 px-6 sm:px-10 py-2 max-w-7xl w-full mx-auto flex-1 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left Side: Doodle Bureau Branding + Sleek Translucent Dark-Glass COD Menu */}
            <div className="pointer-events-auto w-full max-w-sm space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-1.5 rounded-sm bg-amber-500 shrink-0" />
                  <h1 className="font-display text-5xl sm:text-6xl font-black tracking-wide text-white leading-none uppercase">
                    Doodle Bureau
                  </h1>
                </div>
                <p className="text-xs text-slate-300/90 pl-4">
                  3D Operator Squad Lobby · Drag open stage to inspect 360°
                </p>
              </div>

              {/* COD-Style Vertical Menu Buttons */}
              <nav className="space-y-2" aria-label="Main Menu">
                <button
                  onClick={startMatch}
                  className="w-full flex items-center justify-between rounded-lg border border-amber-400/80 bg-amber-500/90 px-4 py-3 text-left text-slate-950 shadow-lg hover:bg-amber-400 whitespace-nowrap shrink-0 transition-all"
                >
                  <span className="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider">
                    <Play className="h-4 w-4 fill-current" />
                    Play / Mode Vote
                  </span>
                  <span className="text-[11px] font-mono-tabular font-bold">
                    {activeGameModeDef.shortName} · {durationMinutes}m
                  </span>
                </button>

                <button
                  onClick={() => setShowCharacterModal(true)}
                  className="w-full flex items-center justify-between rounded-lg border border-cyan-500/45 bg-[#0B101B]/82 px-4 py-2.5 text-left text-slate-100 hover:border-cyan-400 hover:bg-[#111827]/90 whitespace-nowrap shrink-0 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-300">
                    <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
                    Operators / Skins
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[125px]">
                    {activeP1Def.name}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setCareerInitialTab('weapons');
                    setShowCareer(true);
                  }}
                  className="w-full flex items-center justify-between rounded-lg border border-slate-700/75 bg-[#0B101B]/82 px-4 py-2.5 text-left text-slate-100 hover:border-amber-400/70 hover:bg-[#111827]/90 whitespace-nowrap shrink-0 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300">
                    <Crosshair className="h-4 w-4 text-amber-400 shrink-0" />
                    Loadout &amp; Armory
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-mono-tabular text-slate-300">
                    {equippedWeapon.shortName}
                    {!p1Profile.isGuest && (
                      <span className="text-amber-300 font-bold">· {p1Profile.coins}c</span>
                    )}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setCareerInitialTab('career');
                      setShowCareer(true);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-slate-700/75 bg-[#0B101B]/82 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-100 hover:border-amber-500/70 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Award className="h-4 w-4 text-amber-400 shrink-0" />
                    Career
                  </button>
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="flex items-center gap-2 rounded-lg border border-slate-700/75 bg-[#0B101B]/82 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-100 hover:border-amber-500/70 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                    Leaderboard
                  </button>
                </div>

                <button
                  onClick={() => setShowOnlineModal(true)}
                  className={`w-full flex items-center justify-between rounded-lg border px-4 py-2.5 text-left whitespace-nowrap shrink-0 transition-colors ${
                    peerStatus === 'connected'
                      ? 'border-emerald-500/70 bg-emerald-950/75 text-emerald-200'
                      : 'border-slate-700/75 bg-[#0B101B]/82 text-slate-100 hover:border-amber-500/70'
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider">
                    <Wifi className="h-4 w-4 text-amber-400 shrink-0" />
                    Online Room
                  </span>
                  <span className="text-[11px] font-mono-tabular text-slate-300">
                    {peerStatus === 'connected' ? `Room ${roomCode}` : '4-Letter WebRTC'}
                  </span>
                </button>
              </nav>
            </div>

            {/* Right Side: Floating Holographic Nameplate beside 3D Operator */}
            <div className="pointer-events-none flex flex-col items-end gap-3 self-end lg:self-center ml-auto">
              <div className="pointer-events-auto w-72 sm:w-80 rounded-xl border border-cyan-400/45 bg-[#0B101B]/78 p-4 shadow-[0_0_28px_rgba(6,182,212,0.16)]">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-cyan-500/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="animate-avatar-float shrink-0">
                      <CaricatureAvatar
                        characterId={activeP1Def.id}
                        outfitId={p1Profile.cosmetics.equippedOutfit}
                        size={48}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-cyan-300">
                        Active Operator
                      </div>
                      <div className="font-display text-2xl tracking-wide text-white leading-none truncate">
                        {p1Profile.username}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: p1Rank.stars }).map((_, idx) => (
                          <Star
                            key={idx}
                            className="h-3 w-3 fill-current"
                            style={{ color: p1Rank.badgeColor }}
                          />
                        ))}
                        <span
                          className="ml-1 text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: p1Rank.badgeColor }}
                        >
                          {p1Rank.title}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono-tabular shrink-0">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      K/D Ratio
                    </div>
                    <div className="text-xl font-black text-amber-300 leading-tight">{p1Kd}</div>
                  </div>
                </div>

                <div className="pt-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white flex items-center gap-1.5 truncate">
                      {activeP1Def.name}
                      {activeP1Def.isPremium && (
                        <Crown className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                      )}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-300 truncate">
                      {equippedWeapon.shortName} · {equippedMasteryDef.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1 text-emerald-300 truncate">
                      <Zap className="h-3 w-3 text-amber-400 shrink-0" />
                      {activeP1Def.ultimateTitle} ·{' '}
                      {WEAPONS[p1Profile.cosmetics.equippedSecondary || 'pistol']?.shortName} ·{' '}
                      {MELEE_WEAPONS[p1Profile.cosmetics.equippedMelee || 'knife']?.shortName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCharacterModal(true)}
                      className="text-cyan-300 font-semibold hover:underline"
                    >
                      Switch →
                    </button>
                  </div>
                </div>
              </div>

              {mode === 'versus_2p' && (
                <button
                  type="button"
                  onClick={() => setShowCharacterModal(true)}
                  className="pointer-events-auto flex items-center gap-3 rounded-xl border border-sky-400/50 bg-[#0B101B]/82 px-3.5 py-2 text-left hover:border-sky-300 transition-colors"
                >
                  <div className="animate-avatar-float shrink-0">
                    <CaricatureAvatar
                      characterId={activeP2Def.id}
                      outfitId={p2Profile.cosmetics.equippedOutfit}
                      size={40}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                      P2 Selected · Click to Switch
                    </div>
                    <div className="text-xs font-bold text-white">
                      {activeP2Def.name} · {activeP2Def.ultimateTitle}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* ================= BOTTOM ROW: MATCH SETTINGS & PLAY OPTION ================= */}
          <div className="pointer-events-auto relative z-10 px-6 pb-4 pt-1 space-y-2 max-w-7xl w-full mx-auto">
            {/* Expandable Custom Rules Popover above Bottom Row */}
            {showRulesPanel && (
              <div className="rounded-xl border border-slate-700/90 bg-[#111827]/95 p-4 space-y-3 shadow-2xl max-w-2xl mx-auto">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Custom Match Rules
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCustomRules({ ...DEFAULT_CUSTOM_RULES })}
                      className="text-[11px] font-semibold text-slate-400 hover:text-white"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRulesPanel(false)}
                      className="text-[11px] font-semibold text-amber-300 hover:text-amber-200"
                    >
                      Done
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Default Match Mode</div>
                    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-900 p-1">
                      {GAME_MODE_CATALOG.map((gm) => (
                        <button
                          key={gm.id}
                          type="button"
                          onClick={() => setCustomRules((r) => ({ ...r, gameMode: gm.id }))}
                          className={`rounded px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap ${
                            customRules.gameMode === gm.id
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {gm.shortName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Match Duration</div>
                    <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
                      {DURATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.sec}
                          type="button"
                          onClick={() => setCustomRules((r) => ({ ...r, durationSec: opt.sec }))}
                          className={`flex-1 rounded px-2 py-1.5 text-[11px] font-mono-tabular font-bold transition-colors ${
                            customRules.durationSec === opt.sec
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Arena Gravity Scale</span>
                    <span className="font-mono-tabular font-bold text-amber-300">
                      {Math.round(customRules.gravityScale * 100)}%
                      {customRules.gravityScale <= 0.65
                        ? ' (Low Gravity)'
                        : customRules.gravityScale >= 1.15
                        ? ' (Heavy)'
                        : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.45}
                    max={1.25}
                    step={0.05}
                    value={customRules.gravityScale}
                    onChange={(e) =>
                      setCustomRules((r) => ({
                        ...r,
                        gravityScale: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCustomRules((r) => ({ ...r, infiniteFuel: !r.infiniteFuel }))
                    }
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      customRules.infiniteFuel
                        ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    Infinite Jetpack Fuel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCustomRules((r) => ({ ...r, oneHitSnipers: !r.oneHitSnipers }))
                    }
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      customRules.oneHitSnipers
                        ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    One-Hit Snipers
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCustomRules((r) => ({
                        ...r,
                        enableKillstreaks: !r.enableKillstreaks,
                      }))
                    }
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      customRules.enableKillstreaks
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Killstreaks (3/5/7)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCustomRules((r) => ({
                        ...r,
                        showFpsPing: !(r.showFpsPing !== false),
                      }))
                    }
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      customRules.showFpsPing !== false
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    FPS / Ping HUD
                  </button>
                </div>
              </div>
            )}

            {/* Anchored Bottom Action Row */}
            <div className="rounded-xl border border-slate-700/80 bg-[#111827]/92 px-4 py-3 flex items-center justify-between gap-3 flex-wrap shadow-xl">
              {/* Mode, Bots, Zoom & Rules */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 p-1">
                  <button
                    onClick={() => setMode('solo')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                      mode === 'solo'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Solo
                  </button>
                  <button
                    onClick={() => setMode('versus_2p')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                      mode === 'versus_2p'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    2P Local
                  </button>
                  <button
                    onClick={() => setShowOnlineModal(true)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                      mode === 'online_host' || mode === 'online_client'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Wifi className="h-3.5 w-3.5" />
                    Online Code
                  </button>
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 p-1">
                  <span className="px-2 text-xs font-medium text-slate-400">Bots:</span>
                  {[3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setBotCount(cnt)}
                      className={`rounded-md px-2 py-1 text-xs font-bold font-mono-tabular transition-colors ${
                        botCount === cnt
                          ? 'bg-slate-700 text-amber-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 p-1">
                  <span className="px-2 text-xs font-medium text-slate-400">Zoom:</span>
                  {ZOOM_LEVELS.map((z) => (
                    <button
                      key={z}
                      onClick={() => handleChangeZoom(z)}
                      className={`rounded-md px-2 py-1 text-xs font-bold font-mono-tabular transition-colors ${
                        zoomLevel === z
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {z}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowRulesPanel((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                    showRulesPanel
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-500/70'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
                  Rules
                </button>
              </div>

              {/* Right Side of Bottom Row: Last Replay + Prominent PLAY Button */}
              <div className="flex items-center gap-3 ml-auto">
                {lastReplay && lastReplay.frames.length > 1 && (
                  <button
                    onClick={() => setShowReplay(true)}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/60 bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-300 hover:bg-amber-500/15 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Last Replay
                  </button>
                )}

                <button
                  onClick={startMatch}
                  className="flex items-center gap-2.5 rounded-lg bg-amber-500 px-7 py-3 text-sm sm:text-base font-extrabold text-slate-950 shadow-lg hover:bg-amber-400 active:scale-[0.99] whitespace-nowrap shrink-0 transition-all"
                >
                  <Play className="h-5 w-5 fill-current" />
                  {playLabel}
                </button>
              </div>
            </div>

            {/* Bottom Controls Hint + Attribution & Satire Notice Line */}
            <div className="flex items-center justify-between gap-4 px-1 flex-wrap text-[11px] font-mono-tabular text-slate-400">
              <span>
                {mode === 'versus_2p'
                  ? 'P1: WASD + Space/F Fire + 1-3 Swap + V Melee + G Grenade · P2: Arrows + Enter/L Fire + . Swap'
                  : 'WASD Move/Jet · Click Fire · 1-3 Weapon/Melee · V Strike · G/Tab Grenade · E/Shift Ult · R Reload · Z Zoom'}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-semibold">
                  Doodle Bureau · made by samarth
                </span>
                <button
                  type="button"
                  onClick={() => setShowDisclaimer(true)}
                  className="text-slate-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                  Satire &amp; Copyright Disclaimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRE-MATCH MAP & MODE VOTING LOBBY ================= */}
      {screen === 'MAP_VOTING' && (
        <MapVotingModal
          botCount={botCount}
          rules={customRules}
          voteOptions={voteOptions}
          partyMembers={partyMembers}
          localVoterId={localVoterId}
          localVoterName={p1Profile.username}
          isOnlineHost={mode === 'online_host'}
          isOnlineGuest={mode === 'online_client'}
          externalVotes={voteExternalBallots}
          onCastVote={(optionId) => {
            const matchedOpt = voteOptions.find((o) => o.id === optionId);
            if (
              (mode === 'online_host' || mode === 'online_client') &&
              peerSessionRef.current?.isConnected()
            ) {
              peerSessionRef.current.send({
                type: 'map_vote',
                payload: {
                  voterId: localVoterId,
                  optionId,
                  mapId: matchedOpt?.mapId || selectedMapId,
                },
              });
            }
          }}
          onVotingComplete={launchGameplayWithMap}
          onCancel={() => {
            setScreen('TITLE_MENU');
          }}
        />
      )}

      {/* ================= ACTIVE GAMEPLAY VIEW ================= */}
      {(screen === 'PLAYING' || screen === 'PAUSED') && (
        <div className="relative h-full w-full bg-[#0B101B]">
          <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
          {hud && (
            <GameHud
              hud={hud}
              mode={mode}
              localPlayerIndex={mode === 'online_client' ? localPeerSlot : 1}
              pingMs={pingMs}
              muted={muted}
              zoom={zoomLevel}
              touchEnabled={touchEnabled}
              isFullscreen={isFullscreen}
              onToggleTouch={() => setTouchEnabled((t) => !t)}
              onChangeZoom={handleChangeZoom}
              onToggleMute={toggleMute}
              onToggleFullscreen={toggleFullscreen}
              onPause={() => setScreen('PAUSED')}
            />
          )}
          {screen === 'PLAYING' && touchEnabled && (
            <TouchControlsOverlay
              engine={engineRef.current}
              grenades={localHudFighter?.grenades ?? 0}
              grenadeType={localHudFighter?.grenadeType ?? 'frag'}
              ultReady={(localHudFighter?.ultCharge ?? 0) >= 100}
            />
          )}
        </div>
      )}

      {/* ================= PAUSE MODAL ================= */}
      {screen === 'PAUSED' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 mb-2">
              <Shield className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-3xl tracking-wide text-white">Match Paused</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Press Esc to resume combat immediately.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => setScreen('PLAYING')}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                <Play className="h-4 w-4 fill-current" />
                Resume Match
              </button>
              <button
                onClick={restartMatch}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Vote New Map &amp; Restart
              </button>
              <button
                onClick={toggleMute}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {muted ? 'Unmute Audio' : 'Mute Audio'}
              </button>
              <button
                onClick={quitToLobby}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-950/70 transition-colors"
              >
                <Home className="h-4 w-4" />
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FINAL KILL-CAM SLOW-MO REPLAY ================= */}
      {screen === 'KILL_CAM' && lastReplay && (
        <KillCamOverlay
          replay={lastReplay}
          onComplete={() => setScreen('MATCH_SUMMARY')}
        />
      )}

      {/* ================= MODALS ================= */}
      {showDisclaimer && (
        <DisclaimerModal
          requireAck={!disclaimerAcked}
          onAccept={handleAcceptDisclaimer}
          onClose={() => {
            if (disclaimerAcked) setShowDisclaimer(false);
          }}
        />
      )}

      {showCharacterModal && (
        <CharacterSelectModal
          mode={mode}
          p1Profile={p1Profile}
          p2Profile={p2Profile}
          p1Char={p1Char}
          p2Char={p2Char}
          onSelectP1={(cid) => handlePickCharacter(1, cid)}
          onSelectP2={(cid) => handlePickCharacter(2, cid)}
          onP1ProfileUpdated={(updated) => {
            setP1Profile(updated);
            triggerLobbyAction('unlock');
          }}
          onOpenAuth={() => setAuthSlot(1)}
          onClose={() => setShowCharacterModal(false)}
        />
      )}

      {authSlot !== null && (
        <AuthModal
          slot={authSlot}
          currentProfile={authSlot === 1 ? p1Profile : p2Profile}
          otherSlotUsername={authSlot === 1 ? p2Profile.username : p1Profile.username}
          onSelectProfile={(prof) => handleSelectProfile(authSlot, prof)}
          onClose={() => setAuthSlot(null)}
        />
      )}

      {showCareer && (
        <CareerArmoryModal
          profile={p1Profile}
          initialTab={careerInitialTab}
          onProfileUpdated={(updated) => {
            setP1Profile(updated);
            triggerLobbyAction('unlock');
          }}
          onOpenAuth={() => setAuthSlot(1)}
          onClose={() => setShowCareer(false)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          activeP1Id={p1Profile.id}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showOnlineModal && (
        <OnlineRoomModal
          roomCode={roomCode}
          role={peerRole}
          status={peerStatus}
          statusMessage={peerMessage}
          remoteMeta={remotePeerMeta}
          remotePeers={remotePeers}
          partyMembers={partyMembers}
          botCount={botCount}
          rules={customRules}
          onChangeBotCount={setBotCount}
          onHostRoom={handleHostOnlineRoom}
          onJoinRoom={handleJoinOnlineRoom}
          onStartOnlineMatch={handleStartOnlineMatchAsHost}
          onDisconnect={handleDisconnectOnline}
          onClose={() => setShowOnlineModal(false)}
        />
      )}

      <SocialPartyDrawer
        open={showSocialDrawer}
        onClose={() => setShowSocialDrawer(false)}
        profile={p1Profile}
        aiRivals={aiRivals}
        partyMembers={partyMembers}
        partyChat={partyChat}
        roomCode={roomCode}
        peerRole={peerRole}
        peerStatus={peerStatus}
        peerStatusMsg={peerMessage}
        localReady={localReady}
        onSendFriendRequest={handleSendFriendRequest}
        onAcceptFriendRequest={handleAcceptFriendReq}
        onDeclineFriendRequest={handleDeclineFriendReq}
        onRemoveFriend={handleRemoveFriend}
        onInviteFriendToParty={handleInviteFriendToParty}
        onKickPartyMember={handleKickPartyMember}
        onHostParty={handleHostOnlineRoom}
        onJoinParty={handleJoinOnlineRoom}
        onLeaveParty={handleDisconnectOnline}
        onToggleReady={handleTogglePartyReady}
        onSendChat={handleSendPartyChat}
      />

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}

      {/* Click-to-Enter Audio Unlock Splash */}
      {!showDisclaimer && !audioUnlocked && screen === 'TITLE_MENU' && (
        <div
          onClick={handleUnlockAudioSplash}
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 cursor-pointer"
        >
          <div className="max-w-md w-full rounded-2xl border border-amber-500/50 bg-[#0F172A] p-7 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/15 text-amber-300">
              <Volume2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-3xl tracking-wide text-white uppercase">
                Doodle Bureau
              </h2>
              <p className="mt-1 text-xs text-slate-300">
                Click anywhere to enable arena sound effects, voice quips, and squad radio.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUnlockAudioSplash}
              className="w-full rounded-xl bg-amber-500 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-amber-400 transition-colors"
            >
              Click to Enter Arena
            </button>
            <div className="text-[11px] font-mono-tabular text-slate-400">made by samarth</div>
          </div>
        </div>
      )}

      {/* Deep-Link ?party=XXXX Invite Prompt */}
      {!showDisclaimer && audioUnlocked && pendingInviteCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/50 bg-[#0F172A] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/35">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold uppercase tracking-wider text-white">
                  Squad Invite: {pendingInviteCode}
                </h2>
                <p className="text-xs text-slate-400">
                  Join this live WebRTC party squad or switch your saved operative first.
                </p>
              </div>
            </div>

            {p1Profile.isGuest ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Quick Guest Callsign
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={guestCallsignInput}
                  onChange={(e) => setGuestCallsignInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  placeholder="Enter callsign..."
                />
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3.5 py-2.5 text-xs text-slate-200">
                Joining as <span className="font-bold text-amber-300">{p1Profile.playerTag}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPendingInviteCode(null);
                  if (typeof window !== 'undefined' && window.location.search.includes('party=')) {
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                }}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => setAuthSlot(1)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-slate-700"
              >
                Switch Profile
              </button>
              <button
                type="button"
                onClick={handleConfirmJoinInvite}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-cyan-400"
              >
                Join Party {pendingInviteCode}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'MATCH_SUMMARY' && matchSummary && !showReplay && (
        <PostMatchModal
          summary={matchSummary}
          hasReplay={Boolean(lastReplay && lastReplay.frames.length > 1)}
          onWatchReplay={() => setShowReplay(true)}
          onPlayAgain={restartMatch}
          onReturnLobby={quitToLobby}
        />
      )}

      {showReplay && lastReplay && (
        <MatchReplayModal replay={lastReplay} onClose={() => setShowReplay(false)} />
      )}
    </div>
  );
}
