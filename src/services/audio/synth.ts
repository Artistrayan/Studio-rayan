/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Web Audio API Sound Synthesizer & SFX Maker (sfxr / bfxr inspired)
// 100% real Web Audio synthesis - zero external audio files needed

export interface SynthParams {
  waveform: 'square' | 'sawtooth' | 'triangle' | 'sine' | 'noise';
  baseFreq: number; // Hz (20 - 2000)
  freqSlide: number; // -1000 to +1000
  attack: number; // seconds
  sustain: number; // seconds
  decay: number; // seconds
  volume: number; // 0.0 to 1.0
  pitchJump: number; // semitones (-12 to +24)
  pitchJumpTime: number; // seconds
  vibratoSpeed: number; // Hz (0 - 30)
  vibratoDepth: number; // Hz (0 - 50)
  lowPassCutoff: number; // Hz (100 - 8000)
  echoDelay: number; // seconds (0 to 0.5)
  echoFeedback: number; // 0 to 0.8
}

export const SFX_PRESETS: Record<string, Partial<SynthParams>> = {
  laser: {
    waveform: 'sawtooth',
    baseFreq: 880,
    freqSlide: -720,
    attack: 0.01,
    sustain: 0.05,
    decay: 0.12,
    volume: 0.6,
    lowPassCutoff: 3000
  },
  explosion: {
    waveform: 'noise',
    baseFreq: 180,
    freqSlide: -120,
    attack: 0.02,
    sustain: 0.1,
    decay: 0.45,
    volume: 0.8,
    lowPassCutoff: 900
  },
  jump: {
    waveform: 'triangle',
    baseFreq: 160,
    freqSlide: 480,
    attack: 0.01,
    sustain: 0.06,
    decay: 0.14,
    volume: 0.6
  },
  coin: {
    waveform: 'sine',
    baseFreq: 987,
    freqSlide: 0,
    pitchJump: 5,
    pitchJumpTime: 0.08,
    attack: 0.01,
    sustain: 0.08,
    decay: 0.28,
    volume: 0.6
  },
  win: {
    waveform: 'square',
    baseFreq: 523,
    freqSlide: 260,
    pitchJump: 12,
    pitchJumpTime: 0.12,
    attack: 0.02,
    sustain: 0.2,
    decay: 0.45,
    volume: 0.7,
    echoDelay: 0.12,
    echoFeedback: 0.4
  },
  lose: {
    waveform: 'sawtooth',
    baseFreq: 440,
    freqSlide: -280,
    attack: 0.02,
    sustain: 0.15,
    decay: 0.4,
    volume: 0.65,
    lowPassCutoff: 800
  },
  engine: {
    waveform: 'sawtooth',
    baseFreq: 75,
    freqSlide: 15,
    vibratoSpeed: 14,
    vibratoDepth: 18,
    attack: 0.05,
    sustain: 0.35,
    decay: 0.15,
    volume: 0.55,
    lowPassCutoff: 500
  }
};

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMelodyPlaying: boolean = false;
  private melodyTimeout: any = null;

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play custom synthesized sound from detailed parameters
  public playCustomSound(params: SynthParams) {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const totalDuration = params.attack + params.sustain + params.decay + (params.echoDelay > 0 ? 0.3 : 0);

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(params.volume, now + Math.max(0.005, params.attack));
    masterGain.gain.setValueAtTime(params.volume, now + params.attack + params.sustain);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + params.attack + params.sustain + params.decay);

    // Lowpass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.max(100, params.lowPassCutoff || 4000), now);

    // Delay & Echo feedback
    if (params.echoDelay > 0.01) {
      const delay = ctx.createDelay();
      delay.delayTime.setValueAtTime(params.echoDelay, now);
      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(params.echoFeedback || 0.3, now);

      masterGain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(ctx.destination);
    }

    masterGain.connect(filter);
    filter.connect(ctx.destination);

    if (params.waveform === 'noise') {
      // Noise synthesis
      const bufferSize = Math.max(256, Math.floor(ctx.sampleRate * totalDuration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.connect(masterGain);
      noiseSource.start(now);
      noiseSource.stop(now + totalDuration + 0.1);
    } else {
      // Oscillator synthesis
      const osc = ctx.createOscillator();
      osc.type = params.waveform;

      const startFreq = Math.max(20, params.baseFreq);
      osc.frequency.setValueAtTime(startFreq, now);

      if (params.pitchJump && params.pitchJumpTime > 0) {
        const jumpedFreq = startFreq * Math.pow(2, params.pitchJump / 12);
        osc.frequency.setValueAtTime(jumpedFreq, now + params.pitchJumpTime);
      }

      if (params.freqSlide !== 0) {
        const endFreq = Math.max(20, startFreq + params.freqSlide);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + params.attack + params.sustain + params.decay);
      }

      // Vibrato
      if (params.vibratoSpeed > 0 && params.vibratoDepth > 0) {
        const vibratoOsc = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibratoOsc.frequency.setValueAtTime(params.vibratoSpeed, now);
        vibratoGain.gain.setValueAtTime(params.vibratoDepth, now);
        vibratoOsc.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibratoOsc.start(now);
        vibratoOsc.stop(now + totalDuration + 0.1);
      }

      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + totalDuration + 0.1);
    }
  }

  // Play standard presets directly
  public playPreset(name: keyof typeof SFX_PRESETS) {
    const base: SynthParams = {
      waveform: 'triangle',
      baseFreq: 440,
      freqSlide: 0,
      attack: 0.01,
      sustain: 0.1,
      decay: 0.2,
      volume: 0.6,
      pitchJump: 0,
      pitchJumpTime: 0,
      vibratoSpeed: 0,
      vibratoDepth: 0,
      lowPassCutoff: 4000,
      echoDelay: 0,
      echoFeedback: 0
    };
    const preset = SFX_PRESETS[name] || {};
    this.playCustomSound({ ...base, ...preset });
  }

  // 8-bit Chiptune Background Melody Sequencer
  public playChiptuneMelody(notes: { note: number; duration: number }[], tempoBpm: number = 135) {
    this.stopChiptuneMelody();
    this.isMelodyPlaying = true;
    const ctx = this.getContext();
    const beatDuration = 60 / tempoBpm;

    let stepIndex = 0;
    const playNext = () => {
      if (!this.isMelodyPlaying) return;
      const step = notes[stepIndex];
      if (step.note > 0) {
        // Frequency from MIDI note: 440 * 2^((note-69)/12)
        const freq = 440 * Math.pow(2, (step.note - 69) / 12);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const dur = step.duration * beatDuration;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur * 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
      }

      stepIndex = (stepIndex + 1) % notes.length;
      this.melodyTimeout = setTimeout(playNext, step.duration * beatDuration * 1000);
    };

    playNext();
  }

  public stopChiptuneMelody() {
    this.isMelodyPlaying = false;
    if (this.melodyTimeout) {
      clearTimeout(this.melodyTimeout);
      this.melodyTimeout = null;
    }
  }

  public isMelodyActive(): boolean {
    return this.isMelodyPlaying;
  }

  // Quick Action SFX
  public playJump() { this.playPreset('jump'); }
  public playLaser() { this.playPreset('laser'); }
  public playCoin() { this.playPreset('coin'); }
  public playExplosion() { this.playPreset('explosion'); }
  public playWin() { this.playPreset('win'); }
  public playLose() { this.playPreset('lose'); }
  public playEngine() { this.playPreset('engine'); }

  // Generate WAV Blob for 100% offline audio file export
  public generateWavBlob(params: SynthParams): Blob {
    const sampleRate = 44100;
    const totalDuration = Math.max(0.1, params.attack + params.sustain + params.decay + (params.echoDelay > 0 ? 0.3 : 0));
    const numSamples = Math.floor(sampleRate * totalDuration);
    const audioData = new Float32Array(numSamples);

    let curFreq = params.baseFreq;
    const freqEnd = Math.max(20, params.baseFreq + params.freqSlide);
    let phase = 0;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;

      // ADSR Envelope
      let amp = 0;
      if (t < params.attack) {
        amp = (t / Math.max(0.005, params.attack)) * params.volume;
      } else if (t < params.attack + params.sustain) {
        amp = params.volume;
      } else {
        const decayTime = t - params.attack - params.sustain;
        amp = Math.max(0, params.volume * (1 - decayTime / Math.max(0.01, params.decay)));
      }

      // Pitch calculation
      const progress = Math.min(1, t / totalDuration);
      curFreq = params.baseFreq + (freqEnd - params.baseFreq) * progress;
      if (params.pitchJump && t >= params.pitchJumpTime && params.pitchJumpTime > 0) {
        curFreq = curFreq * Math.pow(2, params.pitchJump / 12);
      }

      // Vibrato
      if (params.vibratoSpeed > 0 && params.vibratoDepth > 0) {
        curFreq += Math.sin(2 * Math.PI * params.vibratoSpeed * t) * params.vibratoDepth;
      }

      // Generate waveform
      let sample = 0;
      phase += (2 * Math.PI * curFreq) / sampleRate;

      if (params.waveform === 'sine') {
        sample = Math.sin(phase);
      } else if (params.waveform === 'square') {
        sample = Math.sin(phase) >= 0 ? 1 : -1;
      } else if (params.waveform === 'sawtooth') {
        sample = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
      } else if (params.waveform === 'triangle') {
        sample = 2 * Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) - 1;
      } else if (params.waveform === 'noise') {
        sample = Math.random() * 2 - 1;
      }

      audioData[i] = sample * amp;
    }

    // Convert Float32Array to 16-bit PCM WAV
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  public playHit() { this.playExplosion(); }
  public playSynthSequence() { this.playPowerup(); }

  public playPowerup() {
    this.playWin();
  }
}

export const soundSynth = new SoundSynthesizer();
