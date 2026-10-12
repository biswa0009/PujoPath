/**
 * Web Audio API synthesizer for traditional Kolkata Durga Puja Dhak rhythm
 * Generates an authentic rhythmic Dhak pattern (Kash / Kanshi gong + Dhak drum beat)
 * Zero dependencies, works offline in any browser.
 */

class DhakSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: number | null = null;
  private listeners: Set<(playing: boolean) => void> = new Set();

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a single Dhak strike (deep resonant membrane strike)
  private playDhakDrum(time: number, accent = false) {
    if (!this.ctx) return;

    // Drum body oscillator (pitch drop from ~160Hz to ~65Hz)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const startFreq = accent ? 180 : 140;
    const endFreq = accent ? 70 : 60;

    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.12);

    const volume = accent ? 0.8 : 0.55;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (accent ? 0.35 : 0.22));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.4);

    // Add noise snap for stick hit
    const bufferSize = this.ctx.sampleRate * 0.04;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(accent ? 0.3 : 0.15, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.05);
  }

  // Play a Kanshi bell strike (metallic high-pitch chime)
  private playKanshi(time: number) {
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2480, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3720, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.26);
    osc2.stop(time + 0.26);
  }

  // Authentic 8-beat traditional Dhaki bol pattern
  // [Dha - Tin - Tin - Ta | Dha - Dha - Tin - Ta]
  private scheduleLoop() {
    if (!this.ctx) return;
    const tempo = 132; // BPM
    const beatSec = 60 / tempo / 2; // 16th notes
    const now = this.ctx.currentTime + 0.05;

    const pattern = [
      { beat: 0, drum: true, accent: true, kanshi: true },
      { beat: 1, drum: false, accent: false, kanshi: false },
      { beat: 2, drum: true, accent: false, kanshi: true },
      { beat: 3, drum: true, accent: false, kanshi: false },
      { beat: 4, drum: true, accent: true, kanshi: true },
      { beat: 5, drum: true, accent: false, kanshi: false },
      { beat: 6, drum: true, accent: false, kanshi: true },
      { beat: 7, drum: true, accent: true, kanshi: true },
    ];

    pattern.forEach(({ beat, drum, accent, kanshi }) => {
      const strikeTime = now + beat * beatSec;
      if (drum) this.playDhakDrum(strikeTime, accent);
      if (kanshi) this.playKanshi(strikeTime);
    });
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start() {
    this.initContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.scheduleLoop();

    // Loop every 8 sixteenth notes
    const loopDurationMs = (60 / 132 / 2) * 8 * 1000;
    this.intervalId = window.setInterval(() => {
      if (this.isPlaying) {
        this.scheduleLoop();
      }
    }, loopDurationMs);

    this.notify();
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.notify();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public subscribe(cb: (playing: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.isPlaying);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isPlaying));
  }
}

export const dhakPlayer = new DhakSynthesizer();
