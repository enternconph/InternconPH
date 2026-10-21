// Web Audio API Synthesizer for pleasant real-time notification chime
let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Plays a short, modern notification chime
 * Tone 1: 880Hz (A5) for 180ms
 * Tone 2: 1318.5Hz (E6) for 450ms with smooth exponential decay
 */
export const playNotificationChime = (volume = 0.3) => {
  try {
    // Check if user has sound disabled in localStorage or preferences
    const soundEnabled = localStorage.getItem('interncon_sound_enabled');
    if (soundEnabled === 'false' || soundEnabled === '0') {
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    // Note 1: 880Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Note 2: 1318.51Hz (E6) starting slightly offset (+80ms)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.6, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.48);
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
  }
};

/**
 * Explicit test chime (bypasses soundEnabled check so user can audition before enabling)
 */
export const testNotificationChime = (volume = 0.35) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    // Note 1: 880Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Note 2: 1318.51Hz
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.6, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.48);
  } catch (err) {
    console.warn('Test chime playback failed:', err);
  }
};

/**
 * Plays an attention-grabbing alarm / alert chime when required fields are missing.
 * Uses Web Audio API oscillator synthesis with a dual-tone warning chime.
 * Tone 1: 523.25Hz (C5) + 659.25Hz (E5) alert pulse
 * Tone 2: 440.00Hz (A4) warning resolution with gentle decay
 */
export const playMissingFieldsAlarm = (volume = 0.45) => {
  try {
    const soundEnabled = localStorage.getItem('interncon_sound_enabled');
    if (soundEnabled === 'false' || soundEnabled === '0') {
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    // Pulse 1: 587.33Hz (D5) - Rapid warning chirp
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Pulse 2: 440Hz (A4) - Warning tone following immediately
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.65, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn('Missing fields alarm playback failed:', err);
  }
};

/**
 * Plays a distinct high-energy ascending arpeggio when an intern times-in or times-out successfully.
 * Tone: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
 */
export const playAttendanceSuccessChime = (volume = 0.4) => {
  try {
    const soundEnabled = localStorage.getItem('interncon_sound_enabled');
    if (soundEnabled === 'false' || soundEnabled === '0') return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    const notes = [
      { freq: 523.25, time: 0, dur: 0.12 },
      { freq: 659.25, time: 0.08, dur: 0.12 },
      { freq: 783.99, time: 0.16, dur: 0.14 },
      { freq: 1046.50, time: 0.24, dur: 0.35 }
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.setValueAtTime(0.5, now + time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + time);
      osc.stop(now + time + dur + 0.02);
    });
  } catch (err) {
    console.warn('Attendance success chime failed:', err);
  }
};

/**
 * Plays a low double-buzz alert when an attendance scan fails (expired QR, unauthorized, etc.)
 */
export const playAttendanceErrorChime = (volume = 0.45) => {
  try {
    const soundEnabled = localStorage.getItem('interncon_sound_enabled');
    if (soundEnabled === 'false' || soundEnabled === '0') return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    const buzzes = [
      { freq: 220, time: 0, dur: 0.15 },
      { freq: 196, time: 0.18, dur: 0.25 }
    ];

    buzzes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.4, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + time);
      osc.stop(now + time + dur + 0.02);
    });
  } catch (err) {
    console.warn('Attendance error chime failed:', err);
  }
};
