import { GameState } from '../types';

// Note Frequencies
const N = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Gb4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  C6: 1046.50
};

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentLoopId: number | null = null;
  private nextNoteTime: number = 0;
  private beatIndex: number = 0;
  private currentState: GameState | null = null;

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.25; // Overall volume
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public async init() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public playBGM(state: GameState) {
    if (this.currentState === state) return;
    this.currentState = state;
    this.beatIndex = 0;
    
    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.isPlaying = true;
      if (this.currentLoopId === null) {
        this.scheduler();
      }
    }
  }

  public stopBGM() {
    this.isPlaying = false;
    this.currentState = null;
    // We don't clear scheduler immediately to allow tail sounds, 
    // but the scheduler loop checks isPlaying.
  }

  // --- Sound Effects ---

  public playJump() {
    this.playTone(N.C4, 'square', 0.1, 0);
    this.playTone(N.E4, 'square', 0.1, 0.05);
  }

  public playCollect(type: 'SPEED' | 'DASH' | 'SHIELD' | 'TRAIL') {
    const now = this.ctx?.currentTime || 0;
    if (type === 'SHIELD') {
        this.playTone(N.C5, 'sine', 0.1, 0);
        this.playTone(N.E5, 'sine', 0.1, 0.1);
        this.playTone(N.G5, 'sine', 0.2, 0.2);
    } else {
        this.playTone(N.G4, 'triangle', 0.05, 0);
        this.playTone(N.C5, 'triangle', 0.05, 0.05);
    }
  }

  public playCrash() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.3);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + 0.3);
  }

  // --- Scheduler Logic ---

  private scheduler = () => {
    if (!this.isPlaying || !this.ctx) {
        this.currentLoopId = null;
        return;
    }

    // Schedule up to 100ms ahead
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
        this.scheduleBeat(this.beatIndex, this.nextNoteTime);
        this.advanceBeat();
    }

    this.currentLoopId = window.setTimeout(this.scheduler, 25);
  };

  private advanceBeat() {
    // 16th notes
    let bpm = 120;
    if (this.currentState === GameState.PLAYING) bpm = 150;
    if (this.currentState === GameState.GAME_OVER) bpm = 80;

    const secondsPerBeat = 60.0 / bpm;
    this.nextNoteTime += 0.25 * secondsPerBeat;
    this.beatIndex++;
  }

  private scheduleBeat(beat: number, time: number) {
    const bar = Math.floor(beat / 16);
    const step = beat % 16;

    if (this.currentState === GameState.MENU) {
        // Mysterious Arpeggios (C Minor)
        const sequence = [N.C3, N.Eb3, N.G3, N.C4, N.Eb4, N.G4, N.C5, N.G4];
        if (step % 2 === 0) {
            const note = sequence[(step / 2) % sequence.length];
            this.playTone(note, 'sine', 0.1, 0, time);
        }
        // Bass
        if (step === 0) this.playTone(N.C2, 'triangle', 0.5, 0, time);
    } 
    else if (this.currentState === GameState.PLAYING) {
        // High Energy (Square/Sawtooth)
        // Bass
        if (step === 0 || step === 8) this.playTone(N.C2, 'square', 0.1, 0, time);
        if (step === 4 || step === 12) this.playTone(N.G2, 'square', 0.1, 0, time);
        
        // Melody
        const melody = [
            N.C4, 0, N.C4, N.Eb4, N.F4, 0, N.G4, 0,
            N.Bb4, 0, N.G4, 0, N.F4, 0, N.Eb4, N.D4
        ];
        const note = melody[step];
        if (note) this.playTone(note, 'sawtooth', 0.1, 0, time);
        
        // Hi-hat noise simulation (very high tone short decay)
        if (step % 2 === 0) {
            this.playNoise(0.01, time);
        }
    } 
    else if (this.currentState === GameState.GAME_OVER) {
        // Slow sad steps
        if (step === 0) this.playTone(N.C3, 'triangle', 0.5, 0, time);
        if (step === 8) this.playTone(N.B2, 'triangle', 0.5, 0, time);
    }
  }

  // --- Low Level Synths ---

  private playTone(freq: number, type: OscillatorType, duration: number, delay: number = 0, absoluteTime?: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = absoluteTime || (this.ctx.currentTime + delay);
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.value = freq;
    osc.type = type;
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + duration);
  }

  private playNoise(duration: number, time: number) {
    if (!this.ctx || !this.masterGain) return;
    // Simple noise buffer can be expensive to generate real-time, 
    // so we simulate with high freq random tones or just skip for simplicity in this demo.
    // Let's use a short high freq 'tick'
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(3000, time);
    osc.type = 'square';
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.05);
  }
}

export const audioService = new AudioService();
