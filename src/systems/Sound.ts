/**
 * Sound System - Web Audio API Implementation
 *
 * This system generates authentic Pac-Man sounds using the Web Audio API.
 * Rather than loading audio files, we synthesize sounds programmatically
 * to recreate the distinctive 8-bit arcade audio.
 *
 * ## Why Synthesize?
 *
 * 1. **No loading time**: Sounds are generated instantly
 * 2. **Small bundle size**: No audio files to download
 * 3. **Authentic feel**: Matches the original's synthesized sounds
 * 4. **Dynamic control**: Can adjust pitch/volume in real-time
 *
 * ## Sound Design
 *
 * Original Pac-Man used a Namco WSG (Waveform Sound Generator) chip.
 * We approximate this using Web Audio oscillators and gain envelopes.
 *
 * Key sounds:
 * - **Waka-waka**: Alternating tones for pellet eating
 * - **Ghost siren**: Rising/falling tone based on ghost proximity
 * - **Power pellet alarm**: Rapid pulsing tone
 * - **Ghost eaten**: Ascending scale
 * - **Death**: Descending warble
 * - **Intro**: The famous starting jingle
 *
 * @module Sound
 */

import { SoundType } from '../types';

/**
 * Sound effect configuration
 */
interface SoundConfig {
  /** Frequency in Hz (or array for multi-tone) */
  frequency: number | number[];
  /** Duration in seconds */
  duration: number;
  /** Wave type */
  type: OscillatorType;
  /** Volume (0-1) */
  volume: number;
  /** Optional volume envelope */
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

/**
 * Sound System Class
 *
 * Manages all game audio using Web Audio API for synthesized retro sounds.
 */
export class Sound {
  /** localStorage key for mute preference */
  static readonly STORAGE_KEY = 'pacman-sound-muted';

  /** The Web Audio context - heart of all audio processing */
  private context: AudioContext | null = null;

  /** Master gain node for global volume control */
  private masterGain: GainNode | null = null;

  /** Currently playing siren oscillator (looping) */
  private sirenOscillator: OscillatorNode | null = null;

  /** Currently playing fright sound */
  private frightSound: OscillatorNode | null = null;

  /** Global mute state */
  private muted: boolean = false;

  /** Which waka tone to play next (alternates) */
  private wakaToggle: boolean = false;

  /** Sound enabled flag */
  private enabled: boolean = true;

  /** Handler for M key shortcut (stored for removal) */
  private muteShortcutHandler: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Sound configurations for each sound type
   *
   * These values are tuned to approximate the original arcade sounds.
   * Frequencies and durations were determined through audio analysis
   * of the original game recordings.
   */
  private sounds: Record<string, SoundConfig> = {
    // Pellet eating - alternates between two tones
    [SoundType.MUNCH_1]: {
      frequency: 261.63, // C4
      duration: 0.08,
      type: 'square',
      volume: 0.3,
    },
    [SoundType.MUNCH_2]: {
      frequency: 293.66, // D4
      duration: 0.08,
      type: 'square',
      volume: 0.3,
    },

    // Ghost eaten - ascending chirp
    [SoundType.EAT_GHOST]: {
      frequency: [200, 400, 600, 800, 1000],
      duration: 0.5,
      type: 'square',
      volume: 0.4,
    },

    // Fruit eaten - pleasant ding
    [SoundType.EAT_FRUIT]: {
      frequency: 880,
      duration: 0.15,
      type: 'sine',
      volume: 0.3,
      envelope: {
        attack: 0.01,
        decay: 0.05,
        sustain: 0.7,
        release: 0.1,
      },
    },

    // Fruit appears - sparkle sound
    [SoundType.FRUIT_APPEAR]: {
      frequency: [440, 550, 660],
      duration: 0.3,
      type: 'sine',
      volume: 0.25,
    },

    // Pac-Man death - descending warble
    [SoundType.DEATH]: {
      frequency: [500, 450, 400, 350, 300, 250, 200, 150, 100],
      duration: 1.5,
      type: 'square',
      volume: 0.4,
    },

    // Extra life awarded
    [SoundType.EXTRA_LIFE]: {
      frequency: [523.25, 659.25, 783.99, 1046.50], // C5, E5, G5, C6
      duration: 0.6,
      type: 'square',
      volume: 0.4,
    },

    // Level complete fanfare
    [SoundType.LEVEL_COMPLETE]: {
      frequency: [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50], // C5 to C6 scale
      duration: 1.0,
      type: 'square',
      volume: 0.35,
    },

    // Victory fanfare (game won)
    [SoundType.VICTORY]: {
      frequency: [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98], // C5, E5, G5, C6, E6, G6
      duration: 1.5,
      type: 'square',
      volume: 0.4,
    },
  };

  /**
   * Initialize the sound system
   *
   * Audio context must be created after user interaction (browser policy).
   * Call this on first user click/keypress.
   */
  init(): void {
    if (this.context) return; // Already initialized

    try {
      // Create audio context (with webkit prefix for Safari)
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.context = new AudioContextClass();

      // Create master gain node
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.masterGain.gain.value = 0.5; // Default volume

      console.log('Sound system initialized');
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.enabled = false;
    }
  }

  /**
   * Play a sound effect
   *
   * @param type - The type of sound to play
   */
  play(type: SoundType): void {
    if (!this.enabled || !this.context || !this.masterGain || this.muted) return;

    // Resume context if suspended (required by some browsers)
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    const config = this.sounds[type];
    if (!config) {
      console.warn(`Unknown sound type: ${type}`);
      return;
    }

    if (Array.isArray(config.frequency)) {
      // Multi-frequency sound (arpeggio)
      this.playArpeggio(config.frequency, config.duration, config.type, config.volume);
    } else {
      // Single frequency
      this.playTone(config.frequency, config.duration, config.type, config.volume, config.envelope);
    }
  }

  /**
   * Play the waka-waka sound (alternating tones)
   *
   * This is the iconic pellet-eating sound. We alternate between
   * two tones to create the "waka-waka" rhythm.
   */
  playWaka(): void {
    if (!this.enabled || !this.context || !this.masterGain || this.muted) return;

    const type = this.wakaToggle ? SoundType.MUNCH_1 : SoundType.MUNCH_2;
    this.wakaToggle = !this.wakaToggle;

    this.play(type);
  }

  /**
   * Play a single tone
   *
   * @param frequency - Frequency in Hz
   * @param duration - Duration in seconds
   * @param type - Oscillator waveform type
   * @param volume - Volume level (0-1)
   * @param envelope - Optional ADSR envelope
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    envelope?: SoundConfig['envelope']
  ): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // Create oscillator
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;

    // Create gain node for this sound
    const gainNode = this.context.createGain();

    if (envelope) {
      // Use ADSR envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + envelope.attack);
      gainNode.gain.linearRampToValueAtTime(volume * envelope.sustain, now + envelope.attack + envelope.decay);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
    } else {
      // Simple envelope (quick attack/release to avoid clicks)
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.linearRampToValueAtTime(volume, now + duration - 0.02);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
    }

    // Connect: oscillator -> gain -> master -> speakers
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Play
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Play an arpeggio (sequence of frequencies)
   *
   * @param frequencies - Array of frequencies to play in sequence
   * @param totalDuration - Total duration in seconds
   * @param type - Oscillator waveform type
   * @param volume - Volume level (0-1)
   */
  private playArpeggio(
    frequencies: number[],
    totalDuration: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (!this.context || !this.masterGain) return;

    const noteDuration = totalDuration / frequencies.length;

    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, noteDuration, type, volume);
      }, index * noteDuration * 1000);
    });
  }

  /**
   * Start the ghost siren (looping background sound)
   *
   * The siren pitch varies based on how many pellets remain:
   * - Fewer pellets = higher pitch = more urgency
   *
   * @param intensity - 0-1 value affecting pitch (higher = more pellets eaten)
   */
  startSiren(intensity: number = 0): void {
    if (!this.enabled || !this.context || !this.masterGain || this.muted) return;

    // Stop existing siren
    this.stopSiren();

    // Create oscillator for siren
    this.sirenOscillator = this.context.createOscillator();
    this.sirenOscillator.type = 'sawtooth';

    // Base frequency + intensity modifier
    // Original game had 4 siren levels based on pellets remaining
    const baseFreq = 100 + intensity * 200; // 100-300 Hz range
    this.sirenOscillator.frequency.value = baseFreq;

    // Create gain
    const gain = this.context.createGain();
    gain.gain.value = 0.15;

    // Create LFO for wobble effect
    const lfo = this.context.createOscillator();
    lfo.frequency.value = 2 + intensity * 2; // Wobble speed
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 20; // Wobble depth

    // Connect LFO to oscillator frequency
    lfo.connect(lfoGain);
    lfoGain.connect(this.sirenOscillator.frequency);

    // Connect main signal
    this.sirenOscillator.connect(gain);
    gain.connect(this.masterGain);

    // Start
    lfo.start();
    this.sirenOscillator.start();
  }

  /**
   * Stop the ghost siren
   */
  stopSiren(): void {
    if (this.sirenOscillator) {
      try {
        this.sirenOscillator.stop();
      } catch {
        // Already stopped
      }
      this.sirenOscillator = null;
    }
  }

  /**
   * Update siren intensity (call when pellets are eaten)
   *
   * @param intensity - 0-1 value (0 = start of level, 1 = almost done)
   */
  updateSirenIntensity(intensity: number): void {
    if (this.sirenOscillator && this.context) {
      const newFreq = 100 + intensity * 200;
      this.sirenOscillator.frequency.setValueAtTime(newFreq, this.context.currentTime);
    }
  }

  /**
   * Start the frightened mode sound (replaces siren)
   *
   * This is the warbling alarm sound when ghosts are blue.
   */
  startFrightSound(): void {
    if (!this.enabled || !this.context || !this.masterGain || this.muted) return;

    // Stop siren while frightened
    this.stopSiren();
    this.stopFrightSound();

    // Create oscillator
    this.frightSound = this.context.createOscillator();
    this.frightSound.type = 'square';
    this.frightSound.frequency.value = 200;

    // Create gain
    const gain = this.context.createGain();
    gain.gain.value = 0.2;

    // Create LFO for rapid wobble
    const lfo = this.context.createOscillator();
    lfo.frequency.value = 8; // Fast wobble
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 100;

    lfo.connect(lfoGain);
    lfoGain.connect(this.frightSound.frequency);

    this.frightSound.connect(gain);
    gain.connect(this.masterGain);

    lfo.start();
    this.frightSound.start();
  }

  /**
   * Stop the frightened mode sound
   */
  stopFrightSound(): void {
    if (this.frightSound) {
      try {
        this.frightSound.stop();
      } catch {
        // Already stopped
      }
      this.frightSound = null;
    }
  }

  /**
   * Play the game intro music
   *
   * The famous Pac-Man startup jingle.
   * This is a simplified approximation of the original.
   */
  playIntro(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.enabled || !this.context || this.muted) {
        resolve();
        return;
      }

      // Intro melody notes (approximation)
      const melody = [
        { note: 493.88, duration: 0.15 }, // B4
        { note: 493.88, duration: 0.15 },
        { note: 493.88, duration: 0.15 },
        { note: 493.88, duration: 0.15 },
        { note: 493.88, duration: 0.3 },
        { note: 659.25, duration: 0.15 }, // E5
        { note: 659.25, duration: 0.15 },
        { note: 659.25, duration: 0.15 },
        { note: 587.33, duration: 0.3 },  // D5
        { note: 523.25, duration: 0.3 },  // C5
        { note: 493.88, duration: 0.15 },
        { note: 523.25, duration: 0.15 },
        { note: 493.88, duration: 0.3 },
      ];

      let time = 0;
      melody.forEach(({ note, duration }) => {
        setTimeout(() => {
          this.playTone(note, duration, 'square', 0.3);
        }, time * 1000);
        time += duration;
      });

      // Resolve when done
      setTimeout(resolve, time * 1000 + 100);
    });
  }

  /**
   * Set master volume
   *
   * @param volume - Volume level (0-1)
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.masterGain?.gain.value ?? 0.5;
  }

  /**
   * Toggle mute state and save to localStorage
   */
  toggleMute(): boolean {
    this.muted = !this.muted;

    if (this.muted) {
      this.stopSiren();
      this.stopFrightSound();
    }

    this.saveMutePreference();
    return this.muted;
  }

  /**
   * Set mute state directly
   */
  setMuted(muted: boolean): void {
    this.muted = muted;

    if (this.muted) {
      this.stopSiren();
      this.stopFrightSound();
    }
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Save mute preference to localStorage
   */
  saveMutePreference(): void {
    try {
      localStorage.setItem(Sound.STORAGE_KEY, String(this.muted));
    } catch {
      // localStorage not available (e.g., private browsing)
    }
  }

  /**
   * Load mute preference from localStorage
   */
  loadMutePreference(): void {
    try {
      const saved = localStorage.getItem(Sound.STORAGE_KEY);
      if (saved === 'true') {
        this.muted = true;
      }
    } catch {
      // localStorage not available
    }
  }

  /**
   * Enable M key shortcut for mute toggle
   */
  enableMuteShortcut(): void {
    if (this.muteShortcutHandler) return; // Already enabled

    this.muteShortcutHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') {
        this.toggleMute();
      }
    };

    document.addEventListener('keydown', this.muteShortcutHandler);
  }

  /**
   * Disable M key shortcut
   */
  disableMuteShortcut(): void {
    if (this.muteShortcutHandler) {
      document.removeEventListener('keydown', this.muteShortcutHandler);
      this.muteShortcutHandler = null;
    }
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.stopSiren();
    this.stopFrightSound();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAll();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}
