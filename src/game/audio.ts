import { MeleeWeaponId, WeaponId } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastJetpackAt = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playShoot(weaponId: WeaponId, volumeScale = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = Math.min(1, Math.max(0.1, volumeScale));

    if (weaponId === 'ak') {
      this.noiseBurst(ctx, now, 0.08, 1750, 0.16 * vol);
      this.tone(ctx, now, 'sawtooth', 240, 80, 0.07, 0.15 * vol);
    } else if (weaponId === 'm4a1') {
      this.noiseBurst(ctx, now, 0.06, 2100, 0.14 * vol);
      this.tone(ctx, now, 'triangle', 320, 115, 0.055, 0.14 * vol);
    } else if (weaponId === 'mp7' || weaponId === 'uzi') {
      this.noiseBurst(ctx, now, 0.045, weaponId === 'uzi' ? 2800 : 2400, 0.11 * vol);
      this.tone(ctx, now, 'triangle', weaponId === 'uzi' ? 420 : 360, 150, 0.045, 0.11 * vol);
    } else if (weaponId === 'pistol') {
      this.noiseBurst(ctx, now, 0.06, 1950, 0.14 * vol);
      this.tone(ctx, now, 'triangle', 380, 120, 0.06, 0.15 * vol);
    } else if (weaponId === 'ghost_pistol') {
      // Whisper-quiet suppressed puff
      this.noiseBurst(ctx, now, 0.04, 980, 0.08 * vol);
      this.tone(ctx, now, 'sine', 290, 95, 0.045, 0.09 * vol);
    } else if (weaponId === 'revolver') {
      // Heavy magnum hand-cannon crack
      this.noiseBurst(ctx, now, 0.16, 1450, 0.28 * vol);
      this.tone(ctx, now, 'sawtooth', 460, 62, 0.16, 0.24 * vol);
    } else if (weaponId === 'sawshot' || weaponId === 'double_pump' || weaponId === 'spas12' || weaponId === 'shorty') {
      this.noiseBurst(ctx, now, weaponId === 'shorty' ? 0.19 : 0.24, 820, 0.34 * vol);
      this.tone(ctx, now, 'sawtooth', weaponId === 'double_pump' ? 140 : 170, 38, 0.2, 0.28 * vol);
    } else if (weaponId === 'anu34' || weaponId === 'dlp44' || weaponId === 'awq') {
      this.noiseBurst(ctx, now, 0.19, 2700, 0.26 * vol);
      this.tone(ctx, now, 'sine', weaponId === 'awq' ? 1040 : 880, 130, 0.18, 0.26 * vol);
    } else if (weaponId === 'bomberier') {
      this.noiseBurst(ctx, now, 0.32, 580, 0.28 * vol);
      this.tone(ctx, now, 'sawtooth', 175, 70, 0.26, 0.24 * vol);
    }
  }

  public playExplosion(volumeScale = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = Math.min(1, Math.max(0.2, volumeScale));
    this.noiseBurst(ctx, now, 0.55, 340, 0.48 * vol);
    this.tone(ctx, now, 'sine', 110, 26, 0.5, 0.45 * vol);
    this.tone(ctx, now + 0.03, 'triangle', 75, 24, 0.42, 0.3 * vol);
  }

  public playJetpack(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastJetpackAt < 68) return;
    this.lastJetpackAt = nowMs;
    const now = ctx.currentTime;
    this.noiseBurst(ctx, now, 0.075, 420, 0.055);
  }

  public playHit(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'sine', 1150, 620, 0.045, 0.12);
  }

  public playHeadshotDing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'sine', 1680, 1620, 0.16, 0.19);
    this.tone(ctx, now + 0.015, 'triangle', 2520, 2450, 0.14, 0.14);
  }

  public playMeleeSwing(meleeId?: MeleeWeaponId): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (meleeId === 'katana') {
      this.noiseBurst(ctx, now, 0.13, 3200, 0.15);
      this.tone(ctx, now, 'sine', 780, 290, 0.11, 0.12);
    } else if (meleeId === 'karambit') {
      this.noiseBurst(ctx, now, 0.08, 2600, 0.12);
      this.tone(ctx, now, 'triangle', 620, 260, 0.07, 0.1);
    } else if (meleeId === 'boxing_glove') {
      this.noiseBurst(ctx, now, 0.14, 650, 0.18);
      this.tone(ctx, now, 'sine', 210, 75, 0.12, 0.16);
    } else {
      this.noiseBurst(ctx, now, 0.11, 1400, 0.13);
      this.tone(ctx, now, 'sine', 340, 160, 0.09, 0.11);
    }
  }

  public playMeleeHit(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.noiseBurst(ctx, now, 0.14, 720, 0.26);
    this.tone(ctx, now, 'triangle', 190, 58, 0.14, 0.25);
  }

  public playGlassShatter(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.noiseBurst(ctx, now, 0.2, 5400, 0.22);
    this.tone(ctx, now, 'sine', 2400, 1800, 0.07, 0.09);
    this.tone(ctx, now + 0.04, 'sine', 3100, 2200, 0.08, 0.08);
    this.tone(ctx, now + 0.09, 'sine', 2750, 1950, 0.07, 0.06);
  }

  public playGrenadeBounce(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'triangle', 420, 260, 0.045, 0.09);
  }

  public playSmokeHiss(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.noiseBurst(ctx, now, 0.45, 2900, 0.18);
  }

  public playPlasmaStick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'sine', 640, 1280, 0.12, 0.14);
  }

  public playAirstrikeWhistle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'sine', 1350, 320, 0.52, 0.16);
  }

  public playKillstreak(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'triangle', 523.25, 523.25, 0.09, 0.16);
    this.tone(ctx, now + 0.09, 'triangle', 659.25, 659.25, 0.09, 0.16);
    this.tone(ctx, now + 0.18, 'triangle', 1046.5, 1046.5, 0.22, 0.2);
  }

  public playWaterSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.noiseBurst(ctx, now, 0.22, 1650, 0.14);
    this.tone(ctx, now, 'sine', 290, 140, 0.12, 0.08);
  }

  public playReload(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'square', 460, 580, 0.04, 0.08);
    this.tone(ctx, now + 0.08, 'square', 680, 820, 0.04, 0.08);
  }

  public playPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'sine', 520, 780, 0.08, 0.13);
    this.tone(ctx, now + 0.07, 'sine', 780, 1040, 0.1, 0.13);
  }

  public playKill(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'triangle', 440, 660, 0.08, 0.15);
    this.tone(ctx, now + 0.07, 'triangle', 660, 880, 0.12, 0.15);
  }

  public playMultikill(streak: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const root = streak >= 6 ? 659.25 : streak === 5 ? 587.33 : streak === 4 ? 523.25 : 440;
    this.tone(ctx, now, 'sawtooth', root, root * 1.02, 0.12, 0.14);
    this.tone(ctx, now + 0.08, 'triangle', root * 1.25, root * 1.27, 0.14, 0.18);
    this.tone(ctx, now + 0.16, 'triangle', root * 1.5, root * 2, 0.28, 0.22);
    this.noiseBurst(ctx, now + 0.15, 0.18, 2200, 0.12);
  }

  public playAnnouncerBanner(
    kind: 'first_blood' | 'double' | 'shutdown' | 'rampage' | 'unstoppable'
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === 'first_blood') {
      this.tone(ctx, now, 'sawtooth', 330, 440, 0.14, 0.16);
      this.tone(ctx, now + 0.1, 'triangle', 660, 880, 0.24, 0.18);
    } else if (kind === 'shutdown') {
      this.tone(ctx, now, 'sawtooth', 587, 293, 0.18, 0.18);
      this.tone(ctx, now + 0.14, 'triangle', 220, 146, 0.22, 0.18);
    } else if (kind === 'double') {
      this.tone(ctx, now, 'triangle', 440, 554, 0.1, 0.15);
      this.tone(ctx, now + 0.09, 'triangle', 659, 880, 0.18, 0.17);
    } else {
      this.playMultikill(5);
    }
  }

  public playVictoryJingle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Triumphant brassy major fanfare + warm octave chord
    const melody = [
      { freq: 523.25, t: 0, dur: 0.16, gain: 0.16 },
      { freq: 659.25, t: 0.11, dur: 0.16, gain: 0.17 },
      { freq: 783.99, t: 0.22, dur: 0.18, gain: 0.18 },
      { freq: 1046.5, t: 0.34, dur: 0.48, gain: 0.22 },
    ];
    melody.forEach((n) => {
      this.tone(ctx, now + n.t, 'triangle', n.freq, n.freq * 1.006, n.dur, n.gain);
      this.tone(ctx, now + n.t, 'sawtooth', n.freq * 0.5, n.freq * 0.502, n.dur, n.gain * 0.45);
    });
    // Shimmering final fifth chord
    this.tone(ctx, now + 0.36, 'sine', 1318.5, 1318.5, 0.45, 0.11);
    this.tone(ctx, now + 0.36, 'sine', 1567.98, 1567.98, 0.45, 0.1);
  }

  public playDefeatJingle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Somber descending minor cadence + low bass drop
    const notes = [
      { freq: 392.0, t: 0, dur: 0.2, gain: 0.15 },
      { freq: 349.23, t: 0.16, dur: 0.2, gain: 0.15 },
      { freq: 311.13, t: 0.32, dur: 0.24, gain: 0.16 },
      { freq: 261.63, t: 0.5, dur: 0.55, gain: 0.18 },
    ];
    notes.forEach((n) => {
      this.tone(ctx, now + n.t, 'sawtooth', n.freq, n.freq * 0.985, n.dur, n.gain * 0.55);
      this.tone(ctx, now + n.t, 'triangle', n.freq * 0.5, n.freq * 0.49, n.dur, n.gain * 0.8);
    });
    this.tone(ctx, now + 0.5, 'sine', 130.81, 110, 0.58, 0.16);
  }

  public playEndOfMatchJingle(won: boolean): void {
    if (won) {
      this.playVictoryJingle();
    } else {
      this.playDefeatJingle();
    }
  }

  public playVictoryFanfare(): void {
    this.playVictoryJingle();
  }

  public playUltimate(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, now, 'sawtooth', 220, 880, 0.24, 0.2);
    this.tone(ctx, now + 0.08, 'triangle', 440, 1180, 0.26, 0.18);
    this.noiseBurst(ctx, now + 0.04, 0.22, 1600, 0.16);
  }

  private tone(
    ctx: AudioContext,
    startTime: number,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    gainVal: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private noiseBurst(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterFreq: number,
    gainVal: number
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = this.createNoiseBuffer(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }
}

export const soundEngine = new SoundEngine();
