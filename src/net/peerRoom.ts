import Peer, { DataConnection } from 'peerjs';
import { getRankForXp } from '../data/catalog';
import {
  CustomMatchRules,
  MapId,
  MatchGameMode,
  MatchSummary,
  OnlinePeerMeta,
  PartyChatMessage,
  PartyMember,
  PlayerSlotIndex,
  RemoteInputPacket,
  VoteLobbyOption,
  WorldSyncSnapshot,
} from '../types/game';

const ROOM_PREFIX = 'dbarena-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export type PeerMessage =
  | { type: 'hello'; payload: OnlinePeerMeta }
  | { type: 'slot_assign'; payload: { slot: PlayerSlotIndex } }
  | {
      type: 'party_state';
      payload: { members: PartyMember[]; botCount: number; rules: CustomMatchRules };
    }
  | { type: 'party_ready'; payload: { slot: PlayerSlotIndex; ready: boolean } }
  | { type: 'party_chat'; payload: PartyChatMessage }
  | { type: 'lobby_update'; payload: { hostMeta: OnlinePeerMeta; botCount: number } }
  | {
      type: 'vote_start';
      payload: {
        hostMeta: OnlinePeerMeta;
        botCount: number;
        rules: CustomMatchRules;
        options: VoteLobbyOption[];
        partyMembers: PartyMember[];
      };
    }
  | { type: 'map_vote'; payload: { voterId: string; optionId: string; mapId: MapId } }
  | {
      type: 'match_start';
      payload: {
        hostMeta: OnlinePeerMeta;
        guestMeta?: OnlinePeerMeta;
        remotePeers: Array<{ slot: 2 | 3 | 4; meta: OnlinePeerMeta }>;
        partyMembers: PartyMember[];
        botCount: number;
        mapId: MapId;
        gameMode: MatchGameMode;
        rules: CustomMatchRules;
      };
    }
  | { type: 'input'; payload: RemoteInputPacket & { senderSlot?: PlayerSlotIndex } }
  | { type: 'world_sync'; payload: WorldSyncSnapshot }
  | { type: 'match_end'; payload: MatchSummary }
  | { type: 'ping'; payload: { ts: number } }
  | { type: 'pong'; payload: { ts: number } };

export interface PeerRoomCallbacks {
  onStatusChange: (
    status: 'idle' | 'connecting' | 'waiting' | 'connected' | 'error',
    message?: string
  ) => void;
  onRemoteMeta: (meta: OnlinePeerMeta, slot?: PlayerSlotIndex) => void;
  onSlotAssigned?: (slot: PlayerSlotIndex) => void;
  onPartyState?: (data: {
    members: PartyMember[];
    botCount: number;
    rules: CustomMatchRules;
  }) => void;
  onPartyChat?: (msg: PartyChatMessage) => void;
  onPeerReadyChange?: (slot: PlayerSlotIndex, ready: boolean) => void;
  onPeerDisconnected?: (slot: PlayerSlotIndex) => void;
  onLobbyUpdate?: (data: { hostMeta: OnlinePeerMeta; botCount: number }) => void;
  onVoteStart?: (data: {
    hostMeta: OnlinePeerMeta;
    botCount: number;
    rules: CustomMatchRules;
    options: VoteLobbyOption[];
    partyMembers: PartyMember[];
  }) => void;
  onMapVote?: (data: { voterId: string; optionId: string; mapId: MapId }) => void;
  onMatchStart?: (data: {
    hostMeta: OnlinePeerMeta;
    guestMeta?: OnlinePeerMeta;
    remotePeers: Array<{ slot: 2 | 3 | 4; meta: OnlinePeerMeta }>;
    partyMembers: PartyMember[];
    botCount: number;
    mapId: MapId;
    gameMode: MatchGameMode;
    rules: CustomMatchRules;
  }) => void;
  onRemoteInput?: (input: RemoteInputPacket, senderSlot: PlayerSlotIndex) => void;
  onWorldSync?: (snapshot: WorldSyncSnapshot) => void;
  onMatchEnd?: (summary: MatchSummary) => void;
  onPingUpdate?: (pingMs: number) => void;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface HostPeerSlot {
  conn: DataConnection;
  slot: 2 | 3 | 4;
  meta?: OnlinePeerMeta;
  ready: boolean;
}

export class PeerRoomSession {
  private peer: Peer | null = null;
  private guestConn: DataConnection | null = null;
  private hostConns = new Map<string, HostPeerSlot>();
  private role: 'host' | 'guest' = 'host';
  private localSlot: PlayerSlotIndex = 1;
  private roomCode = '';
  private callbacks: PeerRoomCallbacks;
  private localMeta: OnlinePeerMeta;
  private connectTimeout: number | null = null;
  private pingTimer: number | null = null;
  private pingMs = 0;

  constructor(localMeta: OnlinePeerMeta, callbacks: PeerRoomCallbacks) {
    this.localMeta = localMeta;
    this.callbacks = callbacks;
  }

  public updateCallbacks(partial: Partial<PeerRoomCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...partial };
  }

  public updateLocalMeta(meta: OnlinePeerMeta): void {
    this.localMeta = meta;
    if (this.isConnected()) {
      this.send({ type: 'hello', payload: meta });
    }
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public getRole(): 'host' | 'guest' {
    return this.role;
  }

  public getLocalSlot(): PlayerSlotIndex {
    return this.localSlot;
  }

  public getPingMs(): number {
    return this.pingMs;
  }

  public getConnectedPeers(): Array<{ slot: 2 | 3 | 4; meta: OnlinePeerMeta; ready: boolean }> {
    const out: Array<{ slot: 2 | 3 | 4; meta: OnlinePeerMeta; ready: boolean }> = [];
    for (const entry of this.hostConns.values()) {
      if (entry.conn.open && entry.meta) {
        out.push({ slot: entry.slot, meta: entry.meta, ready: entry.ready });
      }
    }
    return out.sort((a, b) => a.slot - b.slot);
  }

  public isConnected(): boolean {
    if (this.role === 'host') {
      for (const entry of this.hostConns.values()) {
        if (entry.conn.open) return true;
      }
      return false;
    }
    return Boolean(this.guestConn && this.guestConn.open);
  }

  public hostRoom(customCode?: string): string {
    this.destroy();
    this.role = 'host';
    this.localSlot = 1;
    this.roomCode = (customCode || generateRoomCode()).toUpperCase();
    this.callbacks.onStatusChange('connecting', `Opening party room ${this.roomCode}...`);

    const peer = new Peer(`${ROOM_PREFIX}${this.roomCode}`, {
      config: ICE_CONFIG,
      debug: 0,
    });
    this.peer = peer;

    peer.on('open', () => {
      this.callbacks.onStatusChange(
        'waiting',
        `Party ${this.roomCode} open. Up to 4 players can join!`
      );
      this.startPingLoop();
    });

    peer.on('connection', (conn) => {
      const usedSlots = new Set<number>();
      for (const entry of this.hostConns.values()) {
        if (entry.conn.open) usedSlots.add(entry.slot);
      }
      const nextSlot = ([2, 3, 4] as const).find((s) => !usedSlots.has(s));
      if (!nextSlot) {
        conn.close();
        return;
      }
      this.attachHostConnection(conn, nextSlot);
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        const fresh = generateRoomCode();
        this.hostRoom(fresh);
        return;
      }
      this.callbacks.onStatusChange('error', `WebRTC error: ${err.message || err.type}`);
    });

    return this.roomCode;
  }

  public joinRoom(rawCode: string): void {
    const clean = rawCode.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    if (clean.length !== 4) {
      this.callbacks.onStatusChange('error', 'Enter a valid 4-letter party code.');
      return;
    }

    this.destroy();
    this.role = 'guest';
    this.localSlot = 2;
    this.roomCode = clean;
    this.callbacks.onStatusChange('connecting', `Connecting to party ${clean}...`);

    const peer = new Peer({
      config: ICE_CONFIG,
      debug: 0,
    });
    this.peer = peer;

    this.connectTimeout = window.setTimeout(() => {
      if (!this.isConnected()) {
        this.callbacks.onStatusChange(
          'error',
          `Could not reach party ${clean}. Verify the code and host.`
        );
      }
    }, 11000);

    peer.on('open', () => {
      const conn = peer.connect(`${ROOM_PREFIX}${clean}`, {
        reliable: false,
        serialization: 'json',
      });
      this.attachGuestConnection(conn);
    });

    peer.on('error', (err) => {
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      if (err.type === 'peer-unavailable') {
        this.callbacks.onStatusChange('error', `Party ${clean} not found.`);
      } else {
        this.callbacks.onStatusChange('error', `Connection error: ${err.message || err.type}`);
      }
    });
  }

  private attachHostConnection(conn: DataConnection, slot: 2 | 3 | 4): void {
    const key = conn.peer || `peer_${slot}_${Date.now()}`;
    const entry: HostPeerSlot = { conn, slot, ready: false };
    this.hostConns.set(key, entry);

    conn.on('open', () => {
      try {
        conn.send({ type: 'slot_assign', payload: { slot } } satisfies PeerMessage);
        conn.send({ type: 'hello', payload: this.localMeta } satisfies PeerMessage);
      } catch {
        // Ignore
      }
      this.callbacks.onStatusChange(
        'connected',
        `${this.hostConns.size} squad peer${this.hostConns.size > 1 ? 's' : ''} connected in ${this.roomCode}`
      );
    });

    conn.on('data', (raw) => {
      const msg = raw as PeerMessage;
      if (!msg || typeof msg !== 'object') return;
      switch (msg.type) {
        case 'hello':
          entry.meta = msg.payload;
          this.callbacks.onRemoteMeta(msg.payload, slot);
          break;
        case 'party_ready':
          entry.ready = msg.payload.ready;
          this.callbacks.onPeerReadyChange?.(slot, msg.payload.ready);
          break;
        case 'party_chat':
          this.callbacks.onPartyChat?.(msg.payload);
          this.broadcastFromHost(msg, key);
          break;
        case 'map_vote':
          this.callbacks.onMapVote?.(msg.payload);
          this.broadcastFromHost(msg, key);
          break;
        case 'input':
          this.callbacks.onRemoteInput?.(msg.payload, msg.payload.senderSlot || slot);
          break;
        case 'ping':
          try {
            conn.send({ type: 'pong', payload: msg.payload } satisfies PeerMessage);
          } catch {
            // Ignore
          }
          break;
        case 'pong':
          this.recordPingSample(Date.now() - msg.payload.ts);
          break;
      }
    });

    conn.on('close', () => {
      this.hostConns.delete(key);
      this.callbacks.onPeerDisconnected?.(slot);
      if (this.hostConns.size === 0) {
        this.callbacks.onStatusChange(
          'waiting',
          `Party ${this.roomCode} open. Waiting for squadmates...`
        );
      }
    });

    conn.on('error', () => {
      this.hostConns.delete(key);
      this.callbacks.onPeerDisconnected?.(slot);
    });
  }

  private attachGuestConnection(conn: DataConnection): void {
    this.guestConn = conn;

    conn.on('open', () => {
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      this.callbacks.onStatusChange('connected', `Connected to party ${this.roomCode}`);
      this.send({ type: 'hello', payload: this.localMeta });
      this.startPingLoop();
    });

    conn.on('data', (raw) => {
      const msg = raw as PeerMessage;
      if (!msg || typeof msg !== 'object') return;
      switch (msg.type) {
        case 'slot_assign':
          this.localSlot = msg.payload.slot;
          this.callbacks.onSlotAssigned?.(msg.payload.slot);
          break;
        case 'hello':
          this.callbacks.onRemoteMeta(msg.payload, 1);
          break;
        case 'party_state':
          this.callbacks.onPartyState?.(msg.payload);
          break;
        case 'party_chat':
          this.callbacks.onPartyChat?.(msg.payload);
          break;
        case 'lobby_update':
          this.callbacks.onLobbyUpdate?.(msg.payload);
          break;
        case 'vote_start':
          this.callbacks.onVoteStart?.(msg.payload);
          break;
        case 'map_vote':
          this.callbacks.onMapVote?.(msg.payload);
          break;
        case 'match_start':
          this.callbacks.onMatchStart?.(msg.payload);
          break;
        case 'world_sync':
          this.callbacks.onWorldSync?.(msg.payload);
          break;
        case 'match_end':
          this.callbacks.onMatchEnd?.(msg.payload);
          break;
        case 'ping':
          try {
            conn.send({ type: 'pong', payload: msg.payload } satisfies PeerMessage);
          } catch {
            // Ignore
          }
          break;
        case 'pong':
          this.recordPingSample(Date.now() - msg.payload.ts);
          break;
      }
    });

    conn.on('close', () => {
      this.guestConn = null;
      this.callbacks.onStatusChange('error', 'Party leader closed the room.');
    });

    conn.on('error', () => {
      this.callbacks.onStatusChange('error', 'PeerJS DataChannel error.');
    });
  }

  private broadcastFromHost(msg: PeerMessage, excludeKey?: string): void {
    for (const [k, entry] of this.hostConns.entries()) {
      if (excludeKey && k === excludeKey) continue;
      if (entry.conn.open) {
        try {
          entry.conn.send(msg);
        } catch {
          // Ignore
        }
      }
    }
  }

  private startPingLoop(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = window.setInterval(() => {
      if (!this.isConnected()) {
        this.pingMs = 0;
        this.callbacks.onPingUpdate?.(0);
        return;
      }
      this.send({ type: 'ping', payload: { ts: Date.now() } });
    }, 2000);
  }

  private recordPingSample(sampleMs: number): void {
    const clamped = Math.max(1, Math.min(999, Math.round(sampleMs)));
    this.pingMs = this.pingMs === 0 ? clamped : Math.round(this.pingMs * 0.6 + clamped * 0.4);
    this.callbacks.onPingUpdate?.(this.pingMs);
  }

  public send(msg: PeerMessage): void {
    if (this.role === 'host') {
      this.broadcastFromHost(msg);
      return;
    }
    if (this.guestConn && this.guestConn.open) {
      try {
        if (msg.type === 'input') {
          this.guestConn.send({
            type: 'input',
            payload: { ...msg.payload, senderSlot: this.localSlot },
          } satisfies PeerMessage);
        } else {
          this.guestConn.send(msg);
        }
      } catch {
        // Ignore transient send failure
      }
    }
  }

  public static buildPartyMemberFromMeta(
    slot: PlayerSlotIndex,
    meta: OnlinePeerMeta,
    options: { isHost: boolean; isAi: boolean; isReady: boolean }
  ): PartyMember {
    return {
      slot,
      id: meta.profileId,
      username: meta.username,
      playerTag: meta.playerTag || `${meta.username}#${1000 + slot * 111}`,
      characterId: meta.characterId,
      outfitId: meta.outfitId,
      flameId: meta.flameId,
      startingWeapon: meta.startingWeapon,
      secondaryWeapon: meta.secondaryWeapon || 'pistol',
      meleeWeapon: meta.meleeWeapon || 'knife',
      weaponMastery: meta.masteryEquipped?.[meta.startingWeapon] || 'none',
      xp: meta.xp,
      rankTitle: getRankForXp(meta.xp).title,
      isHost: options.isHost,
      isAi: options.isAi,
      isReady: options.isReady,
      status: 'online',
    };
  }

  public destroy(): void {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.pingMs = 0;
    for (const entry of this.hostConns.values()) {
      try {
        entry.conn.close();
      } catch {
        // Ignore
      }
    }
    this.hostConns.clear();
    if (this.guestConn) {
      try {
        this.guestConn.close();
      } catch {
        // Ignore
      }
      this.guestConn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore
      }
      this.peer = null;
    }
  }
}
