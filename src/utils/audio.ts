import { useGameStore } from "../store/gameStore";

export type SoundType =
  | "shoot"
  | "shotgunBlast"
  | "weaponSwitch"
  | "hit"
  | "headshot"
  | "reload"
  | "footstep"
  | "death"
  | "jump"
  | "land"
  | "slide"
  | "scope"
  | "unscope"
  | "click"
  | "hover";

let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

// Procedural sound generators
const generators: Record<
  SoundType,
  (ctx: AudioContext, dest: AudioNode) => void
> = {
  shoot: (ctx, dest) => {
    // Suppressed / softer shot to avoid headaches
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    const noiseSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 1200;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);

    osc.connect(gain);
    gain.connect(dest);

    osc.start();
    noise.start();
    osc.stop(ctx.currentTime + 0.15);
  },
  shotgunBlast: (ctx, dest) => {
    // Punchier / lower than the sniper shot - layered noise + low boom
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);

    const noiseSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 900;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);

    osc.connect(gain);
    gain.connect(dest);

    osc.start();
    noise.start();
    osc.stop(ctx.currentTime + 0.22);
  },
  weaponSwitch: (ctx, dest) => {
    // Two quick mechanical clacks (pump-action style)
    [0, 0.07].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";

      osc.frequency.setValueAtTime(220, ctx.currentTime + t);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + t + 0.04);

      gain.gain.setValueAtTime(0.06, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.05);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.05);
    });
  },
  hit: (ctx, dest) => {
    // Soft marker 'tick'
    const noiseSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2500;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start();
  },
  headshot: (ctx, dest) => {
    // Very soft pleasant chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  },
  reload: (ctx, dest) => {
    // Soft cloth/gear rustle
    const noiseSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0, ctx.currentTime + 0.25);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start();
  },
  footstep: (ctx, dest) => {
    // Noise source for crunch
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start();
    noise.stop(ctx.currentTime + 0.1);
  },
  death: (ctx, dest) => {
    // Soft deep bass drop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  },
  jump: (ctx, dest) => {
    // Soft cloth swoosh
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400; // very low rustle

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start();
  },
  land: (ctx, dest) => {
    // Soft thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    osc.frequency.setValueAtTime(60, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  },
  slide: (ctx, dest) => {
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start();
    noise.stop(ctx.currentTime + 0.6);
  },
  scope: (ctx, dest) => {
    // Very subtle low frequency mechanical click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";

    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  },
  unscope: (ctx, dest) => {
    // Same but reversed tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";

    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  },
  click: (ctx, dest) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  },
  hover: (ctx, dest) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.005, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  },
};

export const playSound = (type: SoundType) => {
  try {
    const ctx = getAudioContext();
    if (generators[type]) {
      const settings = useGameStore.getState().settings;
      const masterVol = settings.masterVolume ?? 1.0;
      let specificVol = 1.0;

      if (["click", "hover"].includes(type)) {
        specificVol = settings.uiVolume ?? 1.0;
      }

      const volume = masterVol * specificVol;
      const masterGain = ctx.createGain();
      masterGain.gain.value = volume * 3.0; // Make all audios louder globally
      masterGain.connect(ctx.destination);
      generators[type](ctx, masterGain);
    }
  } catch (e) {
    console.error("Error playing sound:", e);
  }
};
