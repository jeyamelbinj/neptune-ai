let audioContext = null;

const getContext = () => {
  if (typeof window !== 'undefined') {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }
  return null;
};

// ==========================================
// 1. LIVING CREATURE VOICE PACK (Formant Synthesis)
// ==========================================
const playCreatureSound = (type) => {
  const ctx = getContext();
  if (!ctx) return;

  // Helper: Creates a vocal-like "vowel" sound using formants
  const playVowel = (baseFreq, duration, time = 0, vowel = 'u', volume = 0.15, slideTo = null) => {
    // Formant frequencies for different vowels (making it sound organic)
    const formants = {
      'a': [800, 1200, 2600], // "Ah"
      'o': [450, 800, 2600],  // "Oh"
      'u': [325, 700, 2500],  // "Oo" (Cutest, like a little ghost or pet)
      'e': [400, 1800, 2600]  // "Eh"
    };
    const f = formants[vowel] || formants['u'];

    const osc1 = ctx.createOscillator(); // Fundamental (pitch)
    const osc2 = ctx.createOscillator(); // Formant 1
    const osc3 = ctx.createOscillator(); // Formant 2
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    // Vibrato (LFO) to make it sound "alive"
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 5 + Math.random() * 2; // Natural vibrato speed
    lfoGain.gain.value = baseFreq * 0.015; // Subtle pitch wobble
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    // Setup oscillators
    osc1.type = 'sawtooth'; // Rich wave to carry the formants
    osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime + time);
    if (slideTo) {
      osc1.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + time + duration);
    }
    
    osc2.type = 'sine';
    osc2.frequency.value = f[0];
    osc3.type = 'sine';
    osc3.frequency.value = f[1];

    // Setup filter (softens the harshness of the sawtooth)
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;

    // Connect graph
    osc1.connect(filter);
    filter.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(ctx.destination);

    // Envelope (ADSR - smooth attack and decay)
    const startTime = ctx.currentTime + time;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.08); // Smooth attack
    gain.gain.setValueAtTime(volume, startTime + duration - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Fade out

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);
    lfo.start(startTime);
    
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    osc3.stop(startTime + duration);
    lfo.stop(startTime + duration);
  };

  switch (type) {
    case 'startup':
      // 1. Sleepy "Mmm..." (Low, soft "Oo")
      playVowel(220, 0.4, 0, 'o', 0.12);
      // 2. Waking up "Huh?" (Pitch slides up, questioning "Oo")
      playVowel(330, 0.25, 0.3, 'u', 0.15, 440);
      // 3. Happy "Hello!" (Bright "Ah" rising up)
      playVowel(523, 0.2, 0.6, 'a', 0.16, 659);
      // 4. Joyful giggle/chirp (Quick high "Ee")
      playVowel(880, 0.1, 0.85, 'e', 0.12, 1100);
      break;
    case 'tap':
      // Cute curious "Meep?" (Quick "Oo" sliding up)
      playVowel(400, 0.12, 0, 'u', 0.18, 550);
      break;
  }
};

// ==========================================
// 2. UI VOICE PACK (Chatbox Interactions)
// ==========================================
const playUISound = (type) => {
  const ctx = getContext();
  if (!ctx) return;

  const playBlip = (freq, duration, time = 0, waveType = 'sine', volume = 0.12) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = waveType;
    osc.frequency.value = freq;
    
    const startTime = ctx.currentTime + time;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  switch (type) {
    case 'send':
      // Crisp digital "click-swoosh"
      playBlip(880, 0.06, 0, 'square', 0.08);
      playBlip(440, 0.08, 0.04, 'sine', 0.12);
      break;
    case 'receive':
      // Soft digital notification bell
      playBlip(587.33, 0.12, 0, 'sine', 0.12); 
      playBlip(880, 0.2, 0.1, 'sine', 0.12);    
      break;
  }
};

// ==========================================
// 3. MAIN EXPORT
// ==========================================
export const playSound = (type) => {
  if (localStorage.getItem('sound_effects') !== 'true') return;

  try {
    const ctx = getContext();
    if (!ctx) return;

    if (type === 'startup' || type === 'tap') {
      playCreatureSound(type);
    } else {
      playUISound(type);
    }
  } catch (e) {
    console.error("Audio playback error:", e);
  }
};