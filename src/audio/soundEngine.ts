/**
 * Web Audio API procedural sound effects and multi-track dynamic BGM engine.
 * Runs 100% in browser with zero external dependencies and zero network lag.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.45;
  private sfxVolume: number = 0.6;
  private isMusicPlaying: boolean = false;
  private currentTrack: 'campus_stride' | 'sniper_focus' | 'boss_climax' = 'campus_stride';
  private musicIntervalId: any = null;
  private beatStep: number = 0;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.musicGainNode = this.ctx.createGain();
      this.sfxGainNode = this.ctx.createGain();

      this.musicGainNode.gain.value = this.isMuted ? 0 : this.musicVolume;
      this.sfxGainNode.gain.value = this.isMuted ? 0 : this.sfxVolume;

      this.musicGainNode.connect(this.ctx.destination);
      this.sfxGainNode.connect(this.ctx.destination);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.musicGainNode && this.sfxGainNode) {
      this.musicGainNode.gain.value = muted ? 0 : this.musicVolume;
      this.sfxGainNode.gain.value = muted ? 0 : this.sfxVolume;
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGainNode && !this.isMuted) {
      this.musicGainNode.gain.value = this.musicVolume;
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGainNode && !this.isMuted) {
      this.sfxGainNode.gain.value = this.sfxVolume;
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public getMusicVolume() {
    return this.musicVolume;
  }

  public getSfxVolume() {
    return this.sfxVolume;
  }

  // --- SOUND EFFECTS ---

  public playSniperShot(isCrit: boolean = false) {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Punchy transient noise
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isCrit ? 3600 : 2200, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isCrit ? 1.0 : 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);
    noise.start(t);

    // Deep sub-bass kick for heavy caliber feel
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isCrit ? 180 : 130, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);
    oscGain.gain.setValueAtTime(0.9, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.3);

    // Shell ejection "ping / clink" 200ms later
    setTimeout(() => {
      this.playCasingClink();
    }, 220);
  }

  public playCasingClink() {
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(3200 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.08);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playKatanaSlash(comboStep: number = 1) {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const baseFreq = 400 + comboStep * 150;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.14);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 + comboStep * 300, t);
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playHitImpact(isHeavy: boolean = false) {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isHeavy ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(isHeavy ? 160 : 260, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + (isHeavy ? 0.2 : 0.1));

    gain.gain.setValueAtTime(isHeavy ? 0.7 : 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + (isHeavy ? 0.22 : 0.12));

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playHeadshotDing() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t); // A6
    osc.frequency.setValueAtTime(2349, t + 0.06); // D7

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  public playDash() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.18);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.19);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playJump() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.13);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  public playPunch(comboStep: number = 1) {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = comboStep === 3 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(comboStep === 3 ? 180 : 120 + comboStep * 30, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    gain.gain.setValueAtTime(0.55 + comboStep * 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playFlyingKick() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  public playSpinSpecial() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280 + i * 140, t + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(90, t + i * 0.08 + 0.15);

      gain.gain.setValueAtTime(0.4, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.18);
    }
  }

  public playBarrelSmash() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);
    noise.start(t);
  }

  public playItemPickup() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.06);
      gain.gain.setValueAtTime(0.25, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGainNode!);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.2);
    });
  }

  public playRevive() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const freqs = [220, 277.18, 329.63, 440, 554.37, 659.25];
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t + idx * 0.07);
      gain.gain.setValueAtTime(0.3, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGainNode!);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.3);
    });
  }

  public playScopeToggle(inScope: boolean) {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(inScope ? 500 : 700, t);
    osc.frequency.exponentialRampToValueAtTime(inScope ? 800 : 350, t + 0.09);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playHeartbeat() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playUltimateCast() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Rising energy chord
    const freqs = [220, 330, 440, 554, 659];
    freqs.forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 2, t + 0.45);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  public playReload() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Mag out
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(450, t);
    osc1.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    gain1.gain.setValueAtTime(0.3, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.sfxGainNode);
    osc1.start(t);
    osc1.stop(t + 0.13);

    // Mag lock in 250ms later
    setTimeout(() => {
      if (!this.ctx || !this.sfxGainNode || this.isMuted) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(250, t2);
      osc2.frequency.exponentialRampToValueAtTime(700, t2 + 0.08);
      gain2.gain.setValueAtTime(0.35, t2);
      gain2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.1);
      osc2.connect(gain2);
      gain2.connect(this.sfxGainNode);
      osc2.start(t2);
      osc2.stop(t2 + 0.12);
    }, 280);
  }

  // --- PROCEDURAL BACKGROUND MUSIC GENERATOR ---

  public startMusic(track: 'campus_stride' | 'sniper_focus' | 'boss_climax' = 'campus_stride') {
    this.initCtx();
    this.currentTrack = track;
    this.isMusicPlaying = true;
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
    }

    const bpm = track === 'boss_climax' ? 144 : track === 'campus_stride' ? 128 : 100;
    const stepDurationMs = (60 / bpm / 4) * 1000; // 16th note step

    this.musicIntervalId = setInterval(() => {
      if (!this.isMusicPlaying || this.isMuted) return;
      this.playMusicStep(this.currentTrack, this.beatStep);
      this.beatStep = (this.beatStep + 1) % 32;
    }, stepDurationMs);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  public switchTrack(track: 'campus_stride' | 'sniper_focus' | 'boss_climax') {
    if (this.currentTrack === track && this.isMusicPlaying) return;
    this.startMusic(track);
  }

  private playMusicStep(track: 'campus_stride' | 'sniper_focus' | 'boss_climax', step: number) {
    if (!this.ctx || !this.musicGainNode) return;
    const t = this.ctx.currentTime;

    // Track 1: Campus Stride (Anime battle pop / synth action)
    if (track === 'campus_stride') {
      // Kick on steps 0, 4, 8, 12, 16, 20, 24, 28
      if (step % 4 === 0) {
        this.synthKick(t, 0.45);
      }
      // Snare on steps 4, 12, 20, 28
      if (step % 8 === 4) {
        this.synthSnare(t, 0.35);
      }
      // Hi-hat on every offbeat
      if (step % 2 === 1) {
        this.synthHiHat(t, 0.15);
      }
      // Bass line
      const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83]; // A, C, D, E
      const bassNote = bassNotes[Math.floor(step / 4) % bassNotes.length];
      if (step % 2 === 0) {
        this.synthBass(t, bassNote, 0.22, 'sawtooth');
      }
      // Melodic arpeggio
      const melodyNotes = [440, 523.25, 659.25, 783.99, 880, 659.25, 587.33, 523.25];
      const mNote = melodyNotes[step % melodyNotes.length];
      if (step % 4 === 0 || step % 4 === 2) {
        this.synthPluck(t, mNote, 0.12);
      }
    } 
    // Track 2: Sniper Focus (Tense tactical stealth)
    else if (track === 'sniper_focus') {
      // Subdued kick on step 0, 16
      if (step % 16 === 0) {
        this.synthKick(t, 0.3);
      }
      // Tension hi-hat tick on even steps
      if (step % 2 === 0) {
        this.synthHiHat(t, 0.1);
      }
      // Low drone pulse
      const droneNote = step < 16 ? 73.42 : 65.41; // D, C
      if (step % 8 === 0) {
        this.synthBass(t, droneNote, 0.25, 'sine');
      }
      // Atmospheric chime
      if (step === 0 || step === 12 || step === 20) {
        this.synthPluck(t, 587.33, 0.15); // D5
      }
      if (step === 4 || step === 16) {
        this.synthPluck(t, 659.25, 0.15); // E5
      }
    } 
    // Track 3: Boss Climax (High speed anime overdrive)
    else {
      // Fast double kicks
      if (step % 2 === 0) {
        this.synthKick(t, 0.5);
      }
      // Snare on 4, 12, 20, 28
      if (step % 8 === 4) {
        this.synthSnare(t, 0.42);
      }
      // Fast hi-hats
      this.synthHiHat(t, 0.14);
      // Heavy distorted bass
      const bossBass = [98, 110, 123.47, 130.81, 146.83, 130.81, 110, 98];
      const note = bossBass[Math.floor(step / 4) % bossBass.length];
      this.synthBass(t, note, 0.28, 'sawtooth');
      // Lead riff
      const leadNotes = [587.33, 659.25, 783.99, 880, 1046.5, 880, 783.99, 659.25];
      const leadNote = leadNotes[step % leadNotes.length];
      this.synthPluck(t, leadNote, 0.18);
    }
  }

  private synthKick(t: number, vol: number) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.1);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.musicGainNode);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  private synthSnare(t: number, vol: number) {
    if (!this.ctx || !this.musicGainNode) return;
    // Tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    oscGain.gain.setValueAtTime(vol * 0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(oscGain);
    oscGain.connect(this.musicGainNode);
    osc.start(t);
    osc.stop(t + 0.1);

    // Noise snap
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGainNode);
    noise.start(t);
  }

  private synthHiHat(t: number, vol: number) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(8000, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.musicGainNode);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private synthBass(t: number, freq: number, vol: number, wave: OscillatorType) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    osc.connect(gain);
    gain.connect(this.musicGainNode);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private synthPluck(t: number, freq: number, vol: number) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.musicGainNode);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

export const soundEngine = new SoundEngine();
