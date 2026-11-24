import React, { useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Play,
  Radio,
  SlidersHorizontal,
  Wifi,
  X,
} from 'lucide-react';
import { getGameModeDef, getRankForXp } from '../data/catalog';
import {
  CustomMatchRules,
  OnlinePeerMeta,
  PartyMember,
  PlayerSlotIndex,
} from '../types/game';
import { CaricatureAvatar } from './CaricatureAvatar';

interface OnlineRoomModalProps {
  roomCode: string;
  role: 'host' | 'guest' | null;
  status: 'idle' | 'connecting' | 'waiting' | 'connected' | 'error';
  statusMessage: string;
  remoteMeta: OnlinePeerMeta | null;
  remotePeers?: Array<{ slot: PlayerSlotIndex; meta: OnlinePeerMeta }>;
  partyMembers?: PartyMember[];
  botCount: number;
  rules: CustomMatchRules;
  onChangeBotCount: (n: number) => void;
  onHostRoom: () => void;
  onJoinRoom: (code: string) => void;
  onStartOnlineMatch: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  roomCode,
  role,
  status,
  statusMessage,
  remoteMeta,
  remotePeers = [],
  partyMembers = [],
  botCount,
  rules,
  onChangeBotCount,
  onHostRoom,
  onJoinRoom,
  onStartOnlineMatch,
  onDisconnect,
  onClose,
}) => {
  const [joinInput, setJoinInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyInviteLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?party=${roomCode}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const modeDef = getGameModeDef(rules.gameMode);
  const peersList =
    remotePeers.length > 0
      ? remotePeers
      : remoteMeta
      ? [{ slot: 2 as PlayerSlotIndex, meta: remoteMeta }]
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0F172A] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-display text-2xl tracking-wide text-white">
                Online Party Room · PeerJS WebRTC
              </h2>
              <p className="text-xs text-slate-400">
                Up to 4 squadmates connect across laptops or phones via 4-letter code or invite link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Active Custom Rules Preview */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-2 font-mono text-[11px] text-slate-300">
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span className="font-bold text-amber-300">{modeDef.name}</span>
            <span>· {Math.round(rules.durationSec / 60)}m</span>
            <span>· Gravity {Math.round(rules.gravityScale * 100)}%</span>
            {rules.infiniteFuel && <span className="text-sky-300">· Infinite Fuel</span>}
            {rules.oneHitSnipers && <span className="text-rose-300">· 1-Hit Snipers</span>}
            {!rules.enableKillstreaks && <span className="text-slate-500">· No Streaks</span>}
          </div>

          {!role && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Host a Party Room</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Generate a 4-letter party code &amp; shareable URL for up to 4 players.
                  </p>
                </div>
                <button
                  onClick={onHostRoom}
                  className="mt-4 w-full whitespace-nowrap shrink-0 rounded-lg bg-amber-500 py-2.5 text-xs font-black text-slate-950 transition-colors hover:bg-amber-400"
                >
                  Create 4-Letter Party
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onJoinRoom(joinInput);
                }}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-white">Join a Party Room</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Enter the 4-letter code shared by the Party Leader.
                  </p>
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) =>
                      setJoinInput(
                        e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
                      )
                    }
                    placeholder="ABCD"
                    maxLength={4}
                    className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.35em] text-amber-300 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={joinInput.length !== 4}
                  className="mt-3 w-full whitespace-nowrap shrink-0 rounded-lg border border-amber-500/60 bg-amber-500/15 py-2.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/25 disabled:opacity-40"
                >
                  Join Party
                </button>
              </form>
            </div>
          )}

          {role && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div>
                  <div className="text-xs text-slate-400">
                    {role === 'host' ? 'Share Party Code or Invite URL' : 'Connected Party Code'}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-3xl font-extrabold tracking-[0.28em] text-amber-400">
                      {roomCode}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-500"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? 'Copied' : 'Code'}
                    </button>
                    <button
                      onClick={handleCopyInviteLink}
                      className="flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
                    >
                      {copiedLink ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      {copiedLink ? 'Link Copied' : 'Copy Invite Link'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={onDisconnect}
                  className="whitespace-nowrap shrink-0 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-950/70"
                >
                  Leave Room
                </button>
              </div>

              <div
                className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-xs ${
                  status === 'connected'
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                    : status === 'error'
                    ? 'border-red-500/40 bg-red-950/40 text-red-200'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                <Radio className="h-4 w-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>

              {/* Connected Peers & Squad List */}
              {(peersList.length > 0 || partyMembers.length > 1) && (
                <div className="space-y-2">
                  {peersList.map(({ slot, meta }) => {
                    const rank = getRankForXp(meta.xp);
                    return (
                      <div
                        key={`${slot}_${meta.profileId}`}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <CaricatureAvatar
                            characterId={meta.characterId}
                            outfitId={meta.outfitId}
                            size={40}
                          />
                          <div>
                            <div className="text-sm font-bold text-white">
                              {meta.username}{' '}
                              <span
                                className="text-xs font-medium"
                                style={{ color: rank.badgeColor }}
                              >
                                · {rank.title}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400">
                              Slot {slot} · {meta.playerTag || 'Squadmate'}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400">
                          WebRTC Connected
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {role === 'host' && (
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
                    <span className="px-2.5 text-xs text-slate-400">AI Bots:</span>
                    {[2, 3, 4].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => onChangeBotCount(cnt)}
                        className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold ${
                          botCount === cnt
                            ? 'bg-slate-700 text-amber-300'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={onStartOnlineMatch}
                    disabled={status !== 'connected' && peersList.length === 0}
                    className="whitespace-nowrap shrink-0 flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-40"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Start Map Vote &amp; Deploy
                  </button>
                </div>
              )}

              {role === 'guest' && status === 'connected' && (
                <div className="py-1 text-center text-xs text-slate-400">
                  Connected! Waiting for Party Leader to launch Map &amp; Mode Voting...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
