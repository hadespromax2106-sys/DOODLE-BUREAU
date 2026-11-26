import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Crown,
  Link2,
  MessageSquare,
  Radio,
  Send,
  ShieldCheck,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { CHARACTERS, getRankForXp } from '../data/catalog';
import {
  FriendEntry,
  PartyChatMessage,
  PartyMember,
  PlayerProfile,
} from '../types/game';
import { CaricatureAvatar } from './CaricatureAvatar';

interface SocialPartyDrawerProps {
  open: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  aiRivals: FriendEntry[];
  partyMembers: PartyMember[];
  partyChat: PartyChatMessage[];
  roomCode: string;
  peerRole: 'host' | 'guest' | null;
  peerStatus: 'idle' | 'connecting' | 'waiting' | 'connected' | 'error';
  peerStatusMsg: string;
  localReady: boolean;
  onSendFriendRequest: (tag: string) => Promise<{ ok: boolean; error?: string }>;
  onAcceptFriendRequest: (requestId: string) => Promise<void>;
  onDeclineFriendRequest: (requestId: string) => Promise<void>;
  onRemoveFriend: (playerTag: string) => Promise<void>;
  onInviteFriendToParty: (friend: FriendEntry) => void;
  onKickPartyMember: (memberId: string) => void;
  onHostParty: () => void;
  onJoinParty: (code: string) => void;
  onLeaveParty: () => void;
  onToggleReady: () => void;
  onSendChat: (text: string) => void;
  onOpenTournament?: () => void;
}

const STATUS_BADGE: Record<
  FriendEntry['status'],
  { label: string; dotClass: string; textClass: string }
> = {
  online: {
    label: 'Online in Lobby',
    dotClass: 'bg-emerald-400',
    textClass: 'text-emerald-300',
  },
  in_match: {
    label: 'In Match',
    dotClass: 'bg-amber-400',
    textClass: 'text-amber-300',
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-slate-500',
    textClass: 'text-slate-400',
  },
};

export const SocialPartyDrawer: React.FC<SocialPartyDrawerProps> = ({
  open,
  onClose,
  profile,
  aiRivals,
  partyMembers,
  partyChat,
  roomCode,
  peerRole,
  peerStatus,
  peerStatusMsg,
  localReady,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onRemoveFriend,
  onInviteFriendToParty,
  onKickPartyMember,
  onHostParty,
  onJoinParty,
  onLeaveParty,
  onToggleReady,
  onSendChat,
  onOpenTournament,
}) => {
  const [tab, setTab] = useState<'friends' | 'squad'>('friends');
  const [tagInput, setTagInput] = useState('');
  const [tagFeedback, setTagFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedTag, setCopiedTag] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [partyChat.length, chatOpen]);

  if (!open) return null;

  const friendsList = profile.friends || [];
  const incomingRequests = (profile.friendRequests || []).filter(
    (r) => r.direction === 'incoming'
  );
  const outgoingRequests = (profile.friendRequests || []).filter(
    (r) => r.direction === 'outgoing'
  );
  const myRank = getRankForXp(profile.xp);

  const handleCopyTag = () => {
    navigator.clipboard?.writeText(profile.playerTag).catch(() => {});
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 1600);
  };

  const handleCopyInviteLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?party=${roomCode}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTagFeedback(null);
    const res = await onSendFriendRequest(tagInput);
    if (res.ok) {
      setTagFeedback({ ok: true, msg: `Friend request sent to ${tagInput.trim()}` });
      setTagInput('');
    } else {
      setTagFeedback({ ok: false, msg: res.error || 'Could not send request.' });
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  const allDisplayFriends: FriendEntry[] = [
    ...friendsList,
    ...aiRivals.filter(
      (ai) => !friendsList.some((f) => f.playerTag.toLowerCase() === ai.playerTag.toLowerCase())
    ),
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-700 bg-[#0B101B] shadow-2xl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#0F172A] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              Social &amp; Party Squad
            </h2>
            <p className="text-[11px] text-slate-400">
              {partyMembers.length}/4 Squad · {allDisplayFriends.length} Operatives
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 transition hover:bg-slate-700 hover:text-white"
          aria-label="Close Social Drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Player ID Card */}
      <div className="border-b border-slate-800 bg-slate-900/70 px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <CaricatureAvatar
              characterId={profile.avatarId}
              outfitId={profile.cosmetics.equippedOutfit}
              size={38}
            />
            <div className="min-w-0">
              <div className="truncate text-xs font-extrabold text-white">
                {profile.username}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
                <span className="truncate">{profile.playerTag}</span>
                <span className="text-slate-500">· {myRank.title}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyTag}
            className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:border-cyan-500/60"
          >
            {copiedTag ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 text-cyan-400" />
            )}
            {copiedTag ? 'Copied ID' : 'Copy ID'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-slate-800 bg-[#0F172A]">
        <button
          type="button"
          onClick={() => setTab('friends')}
          className={`py-2.5 text-xs font-extrabold uppercase tracking-wider transition ${
            tab === 'friends'
              ? 'border-b-2 border-cyan-400 text-cyan-300 bg-slate-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Friends ({allDisplayFriends.length})
          {incomingRequests.length > 0 && (
            <span className="ml-1.5 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
              {incomingRequests.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('squad')}
          className={`py-2.5 text-xs font-extrabold uppercase tracking-wider transition ${
            tab === 'squad'
              ? 'border-b-2 border-amber-400 text-amber-300 bg-slate-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Party Squad ({partyMembers.length}/4)
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === 'friends' ? (
          <>
            {/* Search & Add Friend by Tag */}
            <form
              onSubmit={handleAddFriendSubmit}
              className="rounded-xl border border-slate-800 bg-slate-900/75 p-3"
            >
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Add Friend by Player ID Tag
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Operative#4821"
                  className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-cyan-400"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
              {tagFeedback && (
                <p
                  className={`mt-1.5 text-[11px] font-semibold ${
                    tagFeedback.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {tagFeedback.msg}
                </p>
              )}
            </form>

            {/* Incoming & Outgoing Friend Requests */}
            {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
              <div className="space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                  Friend Requests ({incomingRequests.length + outgoingRequests.length})
                </div>
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CaricatureAvatar characterId={req.fromCharacterId} size={32} />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-white">
                          {req.fromTag}
                        </div>
                        <div className="text-[10px] text-amber-300">{req.fromRankTitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAcceptFriendRequest(req.id)}
                        className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-black text-slate-950 hover:bg-emerald-400"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeclineFriendRequest(req.id)}
                        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-bold text-slate-200">
                        {req.fromTag}
                      </div>
                      <div className="text-[10px] text-slate-400">Pending outgoing request</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeclineFriendRequest(req.id)}
                      className="whitespace-nowrap shrink-0 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Friends & AI Rivals List */}
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Squad Contacts &amp; AI Rivals
              </div>
              {allDisplayFriends.map((fr) => {
                const badge = STATUS_BADGE[fr.status];
                const charDef = CHARACTERS.find((c) => c.id === fr.characterId);
                const alreadyInParty = partyMembers.some(
                  (m) =>
                    m.playerTag.toLowerCase() === fr.playerTag.toLowerCase() ||
                    m.id === fr.id
                );
                return (
                  <div
                    key={fr.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/75 p-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CaricatureAvatar
                        characterId={fr.characterId}
                        outfitId={fr.outfitId}
                        size={36}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-extrabold text-white">
                            {fr.username}
                          </span>
                          {fr.isAiRival && (
                            <span className="rounded bg-cyan-500/15 px-1 py-0.5 text-[8px] font-black uppercase text-cyan-300">
                              AI RIVAL
                            </span>
                          )}
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-400">
                          {fr.playerTag} · {charDef?.name || 'Operative'}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                          <span className={badge.textClass}>{badge.label}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400">{fr.rankTitle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={alreadyInParty || partyMembers.length >= 4}
                        onClick={() => {
                          onInviteFriendToParty(fr);
                          setTab('squad');
                        }}
                        className="whitespace-nowrap shrink-0 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-950 hover:bg-amber-400 disabled:opacity-40"
                      >
                        {alreadyInParty ? 'In Squad' : 'Invite'}
                      </button>
                      {!fr.isAiRival && (
                        <button
                          type="button"
                          onClick={() => onRemoveFriend(fr.playerTag)}
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-rose-400"
                          title="Remove friend"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* PeerJS Live Party Controls */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-3">
              {!peerRole ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        Online Cross-Device Party
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Host a 4-player party link or join via 4-letter code
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onHostParty}
                      className="whitespace-nowrap shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black text-slate-950 hover:bg-amber-400"
                    >
                      Host Party
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) =>
                        setJoinCodeInput(
                          e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
                        )
                      }
                      placeholder="CODE"
                      maxLength={4}
                      className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-center font-mono text-sm font-extrabold tracking-widest text-amber-300 focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={joinCodeInput.length !== 4}
                      onClick={() => onJoinParty(joinCodeInput)}
                      className="flex-1 rounded-lg border border-amber-500/50 bg-amber-500/15 py-1.5 text-xs font-extrabold text-amber-300 hover:bg-amber-500/25 disabled:opacity-40"
                    >
                      Join Party Code
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Live Party Code
                      </div>
                      <div className="font-mono text-2xl font-black tracking-[0.25em] text-amber-400">
                        {roomCode}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyInviteLink}
                        className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/25"
                      >
                        {copiedLink ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                        {copiedLink ? 'Link Copied' : 'Copy Invite Link'}
                      </button>
                      <button
                        type="button"
                        onClick={onLeaveParty}
                        className="whitespace-nowrap shrink-0 rounded-lg border border-rose-900/60 bg-rose-950/50 px-2.5 py-1.5 text-[11px] font-bold text-rose-200 hover:bg-rose-950/80"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-300">
                    <Radio
                      className={`h-3.5 w-3.5 shrink-0 ${
                        peerStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    />
                    <span className="truncate">{peerStatusMsg || 'Party active'}</span>
                  </div>
                  {peerRole === 'guest' && (
                    <button
                      type="button"
                      onClick={onToggleReady}
                      className={`w-full rounded-lg py-2 text-xs font-black uppercase tracking-wider transition ${
                        localReady
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'border border-amber-500/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                      }`}
                    >
                      {localReady ? 'Ready · Click to Unready' : 'Click to Ready Up'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Party Tournament Bracket Launcher */}
            {onOpenTournament && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-cyan-500/10 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                    <Trophy className="h-3.5 w-3.5 shrink-0" />
                    Knockout Cup
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Run a 4 or 8-player 1v1 Tournament Bracket with your squad!
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTournament();
                  }}
                  className="whitespace-nowrap shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black uppercase text-slate-950 hover:bg-amber-400"
                >
                  Open Bracket
                </button>
              </div>
            )}

            {/* 4-Slot Squad Roster */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <span>Team Alpha Party Squad ({partyMembers.length}/4)</span>
                <span className="text-cyan-300">Auto-assigned same team</span>
              </div>
              {[0, 1, 2, 3].map((slotIdx) => {
                const m = partyMembers[slotIdx];
                if (!m) {
                  return (
                    <div
                      key={`empty_${slotIdx}`}
                      className="flex items-center justify-between rounded-xl border border-dashed border-slate-800 bg-slate-900/35 px-3 py-2.5 text-xs text-slate-500"
                    >
                      <span>Slot {slotIdx + 1} · Open Squad Spot</span>
                      <button
                        type="button"
                        onClick={() => setTab('friends')}
                        className="text-[11px] font-bold text-cyan-400 hover:underline"
                      >
                        + Invite Friend
                      </button>
                    </div>
                  );
                }
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CaricatureAvatar
                        characterId={m.characterId}
                        outfitId={m.outfitId}
                        size={36}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {m.isHost && <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                          <span className="truncate text-xs font-extrabold text-white">
                            {m.username}
                          </span>
                          {m.isAi && (
                            <span className="rounded bg-cyan-500/15 px-1 py-0.5 text-[8px] font-black text-cyan-300">
                              AI
                            </span>
                          )}
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-400">
                          {m.playerTag} · {m.rankTitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                          m.isHost || m.isReady
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.isHost ? 'Leader' : m.isReady ? 'Ready' : 'Waiting'}
                      </span>
                      {!m.isHost && peerRole !== 'guest' && (
                        <button
                          type="button"
                          onClick={() => onKickPartyMember(m.id)}
                          className="rounded-md border border-slate-700 bg-slate-800 p-1 text-slate-400 hover:text-rose-400"
                          title="Remove from squad"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Collapsible Party Text Chat */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setChatOpen((v) => !v)}
                className="flex w-full items-center justify-between bg-slate-900 px-3.5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-200 hover:bg-slate-800/80"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                  Party Lobby Chat ({partyChat.length})
                </span>
                {chatOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {chatOpen && (
                <div className="border-t border-slate-800 p-3 space-y-2.5">
                  <div className="h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {partyChat.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-slate-500">
                        Say hello to your squad before deploying!
                      </div>
                    ) : (
                      partyChat.map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg px-2.5 py-1.5 ${
                            msg.isSystem
                              ? 'bg-slate-950/60 text-[10px] italic text-cyan-300'
                              : 'bg-slate-950/90 text-slate-200'
                          }`}
                        >
                          {!msg.isSystem && (
                            <span className="mr-1.5 font-extrabold text-amber-300">
                              {msg.senderName}:
                            </span>
                          )}
                          <span>{msg.text}</span>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Message squad..."
                      maxLength={140}
                      className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-cyan-400"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-[#0F172A] px-5 py-2.5 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Squad members auto-deploy on Team Alpha
        </span>
      </div>
    </div>
  );
};
