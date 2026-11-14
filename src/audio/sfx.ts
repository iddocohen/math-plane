// Adapted from math-soccer src/audio/sfx.ts: the Mathe-Flieger sounds, synthesized after the prototype's `SND`
// (specs/001-math-plane/prototype/index.html), no crowd; one quiet music loop.
/**
 * The game's sounds (FR-043, research R13): `propeller`, `whistle`, `hit`, `miss`, `crate`, `puff`, `cheer`, `coin`,
 * `fanfare`, `tap` (a button), `levelUp` and `roundEnd`; and the background music.
 *
 * - Every sound is synthesized with the Web Audio API, after the prototype: the propeller is its `whoosh`, the bomb
 *   whistle its `drop`, the hit its `boom`, the miss its `soft`, the crate its `thud`, the puff its `puff` and the cheer
 *   its `cheer`. `coin` and `fanfare` are math-soccer's synthesized stand-ins.
 * - Sounds with a bundled file play that file once it is decoded, with `clips`. `BUNDLED` holds `coin.mp3`, `fanfare.mp3`
 *   and math-soccer's confetti `pop.mp3` for the hit, and three CC0 recordings: `propeller.mp3` (freesound 741363,
 *   Mish7913), `whistle.mp3` (freesound 506313, Daleonfire) and `crate.mp3` (Kenney "Impact Sounds",
 *   `impactWood_heavy_000.ogg`), and Kenney's `tap.mp3` ("Interface Sounds"), `levelup.mp3` and `roundend.mp3`
 *   ("Music Jingles"). A file that is missing or cannot be decoded keeps the synthesized
 *   sound, and so does every sound until decoding has finished. New CC0 recordings join `BUNDLED` once their license
 *   is checked (FR-043, FR-058).
 * - Every sound follows "Geräusche" (`sound.effects`), read on each sound so a change applies at once.
 * - The jingles (`levelUp`, `roundEnd`) share one channel: a jingle asked for while another still plays is skipped,
 *   so a level up just before the round end does not play two jingles over each other. A jingle lasts as long as its
 *   decoded file, or as its synthesized notes.
 * - No sound is sad or punishing (FR-041): the miss is two soft, low tones.
 * - Browsers start audio suspended. iPad Safari resumes it only inside a user gesture that counts as one: a key press,
 *   a click, or the end of a touch. installUnlock listens to keydown, pointerup, touchend and click for the whole
 *   session. While the context is not running, each of these calls `resume()` synchronously in the handler and plays
 *   a one-sample silent buffer, so the gesture is not lost to an `await`. Until the context runs, every sound is
 *   skipped silently.
 * - Every voice peaks at MAX_GAIN or lower.
 * - Music (`setMusic`): one CC0 loop (`music.mp3`) at MUSIC_GAIN, well below MAX_GAIN. It plays only while the app
 *   wants it (musicWanted: "Musik" on, round not paused, page not hidden) and the context runs, so never before the
 *   unlock gesture. The file loads the first time it is wanted. It has no synthesized stand-in: when the file fails,
 *   the music stays silent, and the next `setMusic(true)` tries the file again. A stopped loop goes on from where it
 *   stopped. When the context starts running by itself (an iOS interruption ends), the music starts again.
 */

/** The part of AudioContext this module uses; tests pass a stand-in. */
export type AudioContextLike = Pick<
  AudioContext,
  | 'state'
  | 'currentTime'
  | 'sampleRate'
  | 'destination'
  | 'resume'
  | 'createGain'
  | 'createOscillator'
  | 'createBuffer'
  | 'createBufferSource'
  | 'createBiquadFilter'
  | 'decodeAudioData'
> & {
  /** Used for `statechange` when present. */
  addEventListener?(type: 'statechange', listener: () => void): void;
};

export const SOUND_NAMES = ['propeller', 'whistle', 'hit', 'miss', 'crate', 'puff', 'cheer', 'coin', 'fanfare', 'tap', 'levelUp', 'roundEnd'] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

/** The sounds with a bundled file in public/assets, by file name (README asset table). */
export const BUNDLED: Partial<Record<SoundName, string>> = {
  propeller: 'propeller.mp3',
  whistle: 'whistle.mp3',
  hit: 'pop.mp3',
  crate: 'crate.mp3',
  coin: 'coin.mp3',
  fanfare: 'fanfare.mp3',
  tap: 'tap.mp3',
  levelUp: 'levelup.mp3',
  roundEnd: 'roundend.mp3',
};

/** The music loop in public/assets (README asset table). */
export const MUSIC_FILE = 'music.mp3';

export const MAX_GAIN = 0.35;
/** The music's level: a fifth of MAX_GAIN, so it stays behind every sound. */
export const MUSIC_GAIN = 0.07;
/** Seconds the music takes to fade in, and to fade out when it stops. */
const MUSIC_FADE_IN = 1.2;
const MUSIC_FADE_OUT = 0.25;

/** What the music depends on. */
export interface MusicState {
  /** "Musik" (`sound.music`). */
  on: boolean;
  /** A round is paused (pause screen, Hangar or parent screens over it). */
  paused: boolean;
  /** The page is hidden. */
  hidden: boolean;
}

/** True when the music should play: "Musik" on, no paused round, and the page in view. */
export function musicWanted(s: MusicState): boolean {
  return s.on && !s.paused && !s.hidden;
}
const SILENT = 0.001;

/** The sound settings this module reads (settings.sound). */
export interface SoundSwitches {
  effects: boolean;
}

export interface SfxOptions {
  /** Read on every sound, so a changed setting applies at once. */
  sound: () => SoundSwitches;
  /** Defaults to `new AudioContext()`. */
  createContext?: () => AudioContextLike;
  /** The URL of a bundled file name; without it every sound is synthesized. */
  clips?: (file: string) => string;
  /** Defaults to `fetch`; tests pass a stand-in. */
  fetchClip?: (url: string) => Promise<ArrayBuffer>;
}

export type Sfx = Record<SoundName, () => void> & {
  /** Plays a sound by name. */
  play(name: SoundName): void;
  /**
   * Creates the audio context and, while it is not running, calls `resume()` and plays a silent buffer at once; starts
   * the music when the resume settles, and decodes the bundled files once meanwhile. Call it synchronously from a user
   * gesture. Resolves when both end.
   */
  unlock(): Promise<void>;
  /**
   * Unlocks on every key press, click or end of a touch on `target` while the context is not running, and when the page
   * comes back into view; returns a function that removes the listeners.
   */
  installUnlock(target?: EventTarget): () => void;
  /** Plays the music loop while `on` (see musicWanted), once the context runs; stops it at once when false. */
  setMusic(on: boolean): void;
};

/** The sounds that share the jingle channel. */
const JINGLES: ReadonlySet<SoundName> = new Set<SoundName>(['levelUp', 'roundEnd']);

export function createSfx(options: SfxOptions): Sfx {
  const make = options.createContext ?? (() => new AudioContext());
  let ctx: AudioContextLike | null = null;
  let noise: AudioBuffer | null = null;
  const decoded = new Map<SoundName, AudioBuffer>();
  let loading: Promise<void> | null = null;
  const fetchClip =
    options.fetchClip ??
    (async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`sfx: ${url} answered ${response.status}`);
      return response.arrayBuffer();
    });

  /** Fetches and decodes one bundled file; null without `clips`, or when the file is missing or broken. */
  const loadBuffer = async (c: AudioContextLike, file: string): Promise<AudioBuffer | null> => {
    const url = options.clips;
    if (!url) return null;
    try {
      return await c.decodeAudioData(await fetchClip(url(file)));
    } catch {
      return null;
    }
  };

  /** Fetches and decodes every bundled file once; a file that fails stays out of `decoded`, so its synthesized sound plays. */
  const loadClips = (c: AudioContextLike): Promise<void> => {
    loading ??= Promise.all(
      (Object.entries(BUNDLED) as Array<[SoundName, string]>).map(async ([name, file]) => {
        const buffer = await loadBuffer(c, file);
        if (buffer) decoded.set(name, buffer);
      }),
    ).then(() => undefined);
    return loading;
  };

  /** The one gain node every clip plays through, at MAX_GAIN; made with the first clip of its context. */
  let clipGain: { context: AudioContextLike; node: ReturnType<AudioContextLike['createGain']> } | null = null;
  const clipOutput = (c: AudioContextLike) => {
    if (clipGain === null || clipGain.context !== c) {
      const node = c.createGain();
      node.gain.setValueAtTime(MAX_GAIN, c.currentTime);
      node.connect(c.destination);
      clipGain = { context: c, node };
    }
    return clipGain.node;
  };

  /** Plays a decoded clip at MAX_GAIN. */
  const playClip = (c: AudioContextLike, buffer: AudioBuffer) => {
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(clipOutput(c));
    src.start(c.currentTime);
  };

  const running = (): AudioContextLike | null => (ctx && ctx.state === 'running' ? ctx : null);

  const noiseBuffer = (c: AudioContextLike): AudioBuffer => {
    if (noise) return noise;
    const length = Math.floor(c.sampleRate * 1);
    const buf = c.createBuffer(1, length, c.sampleRate);
    const data = buf.getChannelData(0);
    // Fixed pseudo-random noise, so the sound is the same every time.
    let s = 12345;
    for (let i = 0; i < length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (s / 0x7fffffff) * 2 - 1;
    }
    noise = buf;
    return buf;
  };

  /**
   * The prototype's `tone`: an oscillator at `from`, gliding to `to` when given, fading out over `duration`, after
   * `delay` seconds.
   */
  const tone = (c: AudioContextLike, from: number, duration: number, type: OscillatorType, peak: number, to: number | null = null, delay = 0) => {
    const t = c.currentTime + delay;
    const g = c.createGain();
    g.gain.setValueAtTime(Math.min(peak, MAX_GAIN), t);
    g.gain.exponentialRampToValueAtTime(SILENT, t + duration);
    g.connect(c.destination);
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    if (to !== null) o.frequency.exponentialRampToValueAtTime(to, t + duration);
    o.connect(g);
    o.start(t);
    o.stop(t + duration + 0.02);
  };

  /** The prototype's `noise`: low-passed noise at `peak` that fades out over `duration`. */
  const hush = (c: AudioContextLike, duration: number, peak: number, frequency: number, delay = 0) => {
    const t = c.currentTime + delay;
    const g = c.createGain();
    g.gain.setValueAtTime(Math.min(peak, MAX_GAIN), t);
    g.gain.linearRampToValueAtTime(SILENT, t + duration);
    g.connect(c.destination);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(frequency, t);
    f.connect(g);
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    src.connect(f);
    src.start(t);
    src.stop(t + duration + 0.02);
  };

  /** Triangle notes `step` seconds apart, each `length` long; returns the seconds until the last one ends. */
  const melody = (c: AudioContextLike, notes: readonly number[], step: number, length: number): number => {
    notes.forEach((f, i) => tone(c, f, length, 'triangle', 0.14, null, i * step));
    return (notes.length - 1) * step + length;
  };

  /** The synthesized sounds, shaped after the prototype's `SND`; a jingle returns its length in seconds. */
  const SYNTH: Record<SoundName, (c: AudioContextLike) => number | void> = {
    propeller: (c) => hush(c, 0.6, 0.12, 900),
    whistle: (c) => tone(c, 900, 0.5, 'sine', 0.08, 300),
    hit: (c) => {
      tone(c, 150, 0.5, 'sine', 0.35, 40);
      hush(c, 0.45, 0.3, 700);
      [784, 988, 1175].forEach((f, i) => tone(c, f, 0.2, 'triangle', 0.1, null, 0.15 + i * 0.07));
    },
    miss: (c) => {
      tone(c, 392, 0.22, 'sine', 0.12);
      tone(c, 330, 0.3, 'sine', 0.12, null, 0.18);
    },
    crate: (c) => tone(c, 220, 0.12, 'square', 0.06, 110),
    puff: (c) => hush(c, 0.3, 0.12, 500),
    cheer: (c) => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, 0.28, 'triangle', 0.16, null, i * 0.09)),
    coin: (c) => {
      tone(c, 988, 0.08, 'square', 0.15);
      tone(c, 1319, 0.3, 'square', 0.15, null, 0.08);
    },
    fanfare: (c) => {
      // C, E, G and the high C, the last one held.
      [523, 659, 784].forEach((f, i) => tone(c, f, 0.16, 'triangle', 0.2, null, i * 0.14));
      tone(c, 1047, 0.6, 'triangle', 0.2, null, 0.42);
    },
    tap: (c) => tone(c, 880, 0.05, 'triangle', 0.05),
    levelUp: (c) => melody(c, [587, 659, 740, 784], 0.1, 0.18),
    roundEnd: (c) => melody(c, [523, 587, 659, 784, 880, 1047], 0.11, 0.2),
  };

  /** A one-sample silent sound: iOS Safari starts the context's output only once a sound starts inside a gesture. */
  const playSilence = (c: AudioContextLike) => {
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, c.sampleRate);
    src.connect(c.destination);
    src.start(0);
  };

  const unlock = (): Promise<void> => {
    let resumed: Promise<void> = Promise.resolve();
    try {
      if (!ctx) {
        const made = make();
        ctx = made;
        // The context can start running without a gesture, when an interruption ends: the music starts again then.
        made.addEventListener?.('statechange', () => {
          if (made.state === 'running') applyMusic();
        });
      }
      if (ctx.state !== 'running') {
        // Both calls run synchronously in the gesture's handler; awaiting anything first would lose the gesture.
        resumed = ctx.resume();
        playSilence(ctx);
      }
    } catch {
      // No Web Audio here: the game stays silent.
      ctx = null;
      return Promise.resolve();
    }
    const c = ctx;
    // The music starts once the resume settles; the sound files load meanwhile.
    const musicStarted = resumed
      .catch(() => {
        // Refused outside a gesture: the next key press or tap tries again.
      })
      .then(() => applyMusic());
    return Promise.all([musicStarted, loadClips(c)]).then(() => undefined);
  };

  // The music loop: wanted by the app, loaded once, started and stopped with short fades.
  let musicOn = false;
  let music: AudioBuffer | null = null;
  let musicLoad: Promise<void> | null = null;
  let voice: { src: AudioBufferSourceNode; gain: GainNode; startedAt: number; offset: number } | null = null;
  /** Seconds into the loop where it goes on next time. */
  let musicOffset = 0;

  const stopMusic = () => {
    if (!voice || !ctx) {
      voice = null;
      return;
    }
    const t = ctx.currentTime;
    const length = music?.duration ?? 0;
    musicOffset = length > 0 ? (voice.offset + t - voice.startedAt) % length : 0;
    // Fades out from the level it has now, also when it stops during the fade-in.
    const level = voice.gain.gain;
    level.cancelScheduledValues(t);
    level.setValueAtTime(level.value, t);
    level.linearRampToValueAtTime(SILENT, t + MUSIC_FADE_OUT);
    voice.src.stop(t + MUSIC_FADE_OUT + 0.02);
    voice = null;
  };

  const applyMusic = () => {
    const c = musicOn ? running() : null;
    if (!c) {
      stopMusic();
      return;
    }
    if (voice) return;
    if (!music) {
      // A missing or broken file keeps the music silent; the next call tries again.
      musicLoad ??= loadBuffer(c, MUSIC_FILE).then((buffer) => {
        if (!buffer) {
          musicLoad = null;
          return;
        }
        music = buffer;
        applyMusic();
      });
      return;
    }
    const t = c.currentTime;
    const gain = c.createGain();
    gain.gain.setValueAtTime(SILENT, t);
    gain.gain.linearRampToValueAtTime(MUSIC_GAIN, t + MUSIC_FADE_IN);
    gain.connect(c.destination);
    const src = c.createBufferSource();
    src.buffer = music;
    src.loop = true;
    src.connect(gain);
    src.start(t, musicOffset);
    voice = { src, gain, startedAt: t, offset: musicOffset };
  };

  /** When the jingle channel is free again, in context seconds. */
  let jingleEnds = 0;

  const play = (name: SoundName) => {
    const c = options.sound().effects ? running() : null;
    if (!c) return;
    const jingle = JINGLES.has(name);
    if (jingle && c.currentTime < jingleEnds) return;
    const clip = decoded.get(name);
    let seconds: number | void;
    if (clip) {
      playClip(c, clip);
      seconds = clip.duration;
    } else {
      seconds = SYNTH[name](c);
    }
    if (jingle) jingleEnds = c.currentTime + (seconds ?? 0);
  };

  const sounds = Object.fromEntries(SOUND_NAMES.map((name) => [name, () => play(name)])) as Record<SoundName, () => void>;

  return {
    ...sounds,
    play,
    unlock,
    installUnlock(target: EventTarget = globalThis) {
      // pointerdown is left out: on a touch screen it does not count as a gesture, so a resume there stays suspended.
      const gestures = ['keydown', 'pointerup', 'touchend', 'click'];
      const onGesture = () => {
        if (!ctx || ctx.state !== 'running') void unlock();
      };
      const onVisible = () => {
        const visibility = (target as Partial<Document>).visibilityState;
        if (ctx && ctx.state !== 'running' && (visibility === undefined || visibility === 'visible')) void unlock();
      };
      gestures.forEach((e) => target.addEventListener(e, onGesture));
      target.addEventListener('visibilitychange', onVisible);
      return () => {
        gestures.forEach((e) => target.removeEventListener(e, onGesture));
        target.removeEventListener('visibilitychange', onVisible);
      };
    },
    setMusic(on: boolean) {
      musicOn = on;
      applyMusic();
    },
  };
}
