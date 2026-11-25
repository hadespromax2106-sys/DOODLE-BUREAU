import React, { useEffect, useRef, useState } from 'react';
import { Download, LogIn, Upload, UserPlus, Users, X } from 'lucide-react';
import { CHARACTERS, getRankForXp } from '../data/catalog';
import {
  createUniqueGuestProfile,
  exportProfileJson,
  importProfileJson,
  isBotReservedName,
  listAllProfiles,
  loginProfile,
  registerProfile,
} from '../db/playerDb';
import { CharacterId, PlayerProfile } from '../types/game';
import { CaricatureAvatar } from './CaricatureAvatar';

interface AuthModalProps {
  slot: 1 | 2;
  currentProfile: PlayerProfile;
  otherSlotUsername?: string;
  onSelectProfile: (profile: PlayerProfile) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  slot,
  currentProfile,
  otherSlotUsername,
  onSelectProfile,
  onClose,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'accounts'>('login');
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [tagline, setTagline] = useState('');
  const [avatarId, setAvatarId] = useState<CharacterId>('chai_storm');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshProfiles = async () => {
    const all = await listAllProfiles();
    setProfiles(all.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt));
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (
      otherSlotUsername &&
      username.trim().toLowerCase() === otherSlotUsername.trim().toLowerCase()
    ) {
      setError(`Player ${slot === 1 ? 2 : 1} is already signed in as "${otherSlotUsername}". Every person must have a unique name.`);
      return;
    }
    const res = await loginProfile(username, pin);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSelectProfile(res.profile);
    onClose();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await registerProfile({
      username,
      pin,
      avatarId,
      tagline,
      blockedNames: otherSlotUsername ? [otherSlotUsername] : [],
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSelectProfile(res.profile);
    onClose();
  };

  const handleGuest = async () => {
    const guest = await createUniqueGuestProfile(
      slot,
      avatarId,
      undefined,
      otherSlotUsername ? [otherSlotUsername] : []
    );
    onSelectProfile(guest);
    onClose();
  };

  const handleExport = (profile: PlayerProfile) => {
    const json = exportProfileJson(profile);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.username.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_profile.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${profile.username}'s profile backup.`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setNotice(null);
    const text = await file.text();
    const res = await importProfileJson(text);
    if (!res.ok) {
      setError(res.error);
    } else {
      await refreshProfiles();
      onSelectProfile(res.profile);
      setNotice(
        res.replaced
          ? `Updated & signed in as ${res.profile.username}.`
          : `Imported & signed in as ${res.profile.username}.`
      );
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700/80 bg-[#111827] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="font-display text-2xl tracking-wide text-slate-50">
              Player {slot} Account & Database
            </h2>
            <p className="text-xs text-slate-400">
              Stored locally in IndexedDB with JSON export & import
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3 gap-4 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
            <button
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'login' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'register' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Create Profile
            </button>
            <button
              onClick={() => {
                setTab('accounts');
                setError(null);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'accounts' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Saved Profiles ({profiles.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-500/60 hover:text-white whitespace-nowrap shrink-0 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Import JSON
            </button>
            {!currentProfile.isGuest && (
              <button
                onClick={() => handleExport(currentProfile)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-500/60 hover:text-white whitespace-nowrap shrink-0 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export Active
              </button>
            )}
          </div>
        </div>

        <div className="p-6 max-h-[68vh] overflow-y-auto custom-scroll">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-2.5 text-sm text-red-200">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-4 py-2.5 text-sm text-emerald-200">
              {notice}
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {profiles.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Quick Fill Saved Account
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profiles.slice(0, 6).map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setUsername(p.username)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          username.toLowerCase() === p.username.toLowerCase()
                            ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <CaricatureAvatar characterId={p.avatarId} outfitId={p.cosmetics.equippedOutfit} size={22} />
                        <span>{p.username}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. ChaiCommander"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">PIN / Password</label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter PIN or password"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 gap-3">
                <button
                  type="button"
                  onClick={handleGuest}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors"
                >
                  Continue as Quick Guest
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap shrink-0 transition-colors"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Unique Username (2–18 chars)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose unique callsign"
                    maxLength={18}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    required
                  />
                  {username.trim().length >= 2 &&
                    (profiles.some(
                      (p) => p.username.trim().toLowerCase() === username.trim().toLowerCase()
                    ) ||
                      isBotReservedName(username) ||
                      (otherSlotUsername &&
                        otherSlotUsername.trim().toLowerCase() ===
                          username.trim().toLowerCase())) && (
                      <p className="mt-1 text-[11px] text-rose-400">
                        This name is already taken or reserved. Choose another callsign.
                      </p>
                    )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    PIN / Password (min 3 chars)
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Protect this profile"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Custom Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Executive order: open fire."
                  maxLength={55}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Default Candidate Avatar
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {CHARACTERS.filter((c) => !c.isPremium).map((char) => (
                    <button
                      type="button"
                      key={char.id}
                      onClick={() => setAvatarId(char.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${
                        avatarId === char.id
                          ? 'border-amber-500 bg-amber-500/15'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                      }`}
                    >
                      <CaricatureAvatar characterId={char.id} size={46} />
                      <span className="text-[11px] font-medium text-slate-200 truncate w-full text-center">
                        {char.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleGuest}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors"
                >
                  Play as Quick Guest
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap shrink-0 transition-colors"
                >
                  Register & Save Profile
                </button>
              </div>
            </form>
          )}

          {tab === 'accounts' && (
            <div className="space-y-2.5">
              {profiles.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
                  No registered profiles on this device yet. Create one or import a JSON backup.
                </div>
              ) : (
                profiles.map((p) => {
                  const rank = getRankForXp(p.xp);
                  const kd =
                    p.stats.deaths > 0
                      ? (p.stats.kills / p.stats.deaths).toFixed(2)
                      : p.stats.kills.toFixed(2);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CaricatureAvatar
                          characterId={p.avatarId}
                          outfitId={p.cosmetics.equippedOutfit}
                          size={44}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold text-white truncate">
                            <span>{p.username}</span>
                            <span className="text-slate-500">·</span>
                            <span style={{ color: rank.badgeColor }} className="text-xs font-medium">
                              {rank.title}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono-tabular flex items-center gap-2">
                            <span>{p.xp} XP</span>
                            <span>·</span>
                            <span>{p.stats.kills} Kills</span>
                            <span>·</span>
                            <span>K/D {kd}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleExport(p)}
                          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
                          title="Export JSON backup"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setTab('login');
                            setUsername(p.username);
                            setPin('');
                          }}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors"
                        >
                          Sign In
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
