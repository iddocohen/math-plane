// Adapted from math-soccer src/audio/sfx.test.ts: the Mathe-Flieger sounds, one switch, no crowd and no loops.
import { describe, expect, it } from 'vitest';
import { BUNDLED, createSfx, MAX_GAIN, SOUND_NAMES, type AudioContextLike, type SoundName, type SoundSwitches } from './sfx';

/** Minimal Web Audio stand-in that records started sources and gain values. */
function fakeContext(decode: (data: ArrayBuffer) => Promise<AudioBuffer> = () => Promise.reject(new Error('no decoder'))) {
  const started: Array<{ kind: 'osc' | 'noise'; at: number; type?: string; buffer?: unknown }> = [];
  const gains: number[] = [];
  const silent: number[] = [];
  let state: AudioContextState = 'suspended';
  const param = (log: number[]) => ({
    value: 0,
    setValueAtTime(v: number) {
      log.push(v);
      return this;
    },
    linearRampToValueAtTime(v: number) {
      log.push(v);
      return this;
    },
    exponentialRampToValueAtTime(v: number) {
      log.push(v);
      return this;
    },
  });
  const node = () => ({ connect: (n: unknown) => n, disconnect() {} });
  const ctx = {
    get state() {
      return state;
    },
    currentTime: 0,
    sampleRate: 8000,
    destination: node(),
    resume: async () => {
      state = 'running';
    },
    createGain: () => ({ ...node(), gain: param(gains) }),
    createOscillator: () => {
      const o = { ...node(), type: 'sine', frequency: param([]), start: (at: number) => started.push({ kind: 'osc', at, type: o.type }), stop() {} };
      return o;
    },
    createBuffer: (_c: number, length: number) => ({ length, getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => {
      const src = {
        ...node(),
        buffer: null as unknown,
        // The one-sample silent buffer of the unlock is counted apart from the sounds.
        start: (at: number) => ((src.buffer as { length?: number } | null)?.length === 1 ? silent.push(at) : started.push({ kind: 'noise', at, buffer: src.buffer })),
        stop() {},
      };
      return src;
    },
    decodeAudioData: decode,
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param([]), Q: param([]) }),
  };
  return { ctx: ctx as unknown as AudioContextLike, started, gains, silent };
}

/**
 * A context that behaves like iPad Safari: `resume()` runs it only when called during a gesture (`gesture` dispatches an
 * event with the flag set, as a browser does); outside one the promise stays pending. `interrupt` puts it back into
 * "interrupted", as a phone call or a hidden tab does.
 */
function tabletContext() {
  const f = fakeContext();
  let state: string = 'suspended';
  let inGesture = false;
  const resumes: boolean[] = [];
  Object.defineProperty(f.ctx, 'state', { get: () => state });
  Object.defineProperty(f.ctx, 'resume', {
    value: () => {
      resumes.push(inGesture);
      if (!inGesture) return new Promise<void>(() => {});
      state = 'running';
      return Promise.resolve();
    },
  });
  const gesture = (target: EventTarget, type: string) => {
    inGesture = true;
    target.dispatchEvent(new Event(type));
    inGesture = false;
  };
  return { ...f, resumes, gesture, interrupt: () => (state = 'interrupted') };
}

function setupTablet(options: { fetchClip?: (url: string) => Promise<ArrayBuffer> } = {}) {
  const f = tabletContext();
  const sfx = createSfx({
    sound: () => ({ effects: true }),
    createContext: () => f.ctx,
    clips: options.fetchClip ? (file) => `/assets/${file}` : undefined,
    fetchClip: options.fetchClip,
  });
  const target = new EventTarget();
  const remove = sfx.installUnlock(target);
  return { f, sfx, target, remove, gesture: f.gesture, interrupt: f.interrupt };
}

function setup(sound: Partial<SoundSwitches> = {}) {
  const f = fakeContext();
  const switches: SoundSwitches = { effects: true, ...sound };
  const sfx = createSfx({ sound: () => switches, createContext: () => f.ctx });
  return { f, sfx, switches };
}

/** Oscillators and noise sources each synthesized sound starts, after the prototype's `SND`. */
const SHAPES: Record<SoundName, { osc: number; noise: number }> = {
  propeller: { osc: 0, noise: 1 },
  whistle: { osc: 1, noise: 0 },
  hit: { osc: 4, noise: 1 },
  miss: { osc: 2, noise: 0 },
  crate: { osc: 1, noise: 0 },
  puff: { osc: 0, noise: 1 },
  cheer: { osc: 4, noise: 0 },
  coin: { osc: 2, noise: 0 },
  fanfare: { osc: 4, noise: 0 },
};

describe('sfx (FR-043, research R13)', () => {
  it('plays nothing before the first key or tap unlocks audio', () => {
    const { f, sfx } = setup();
    for (const name of SOUND_NAMES) sfx[name]();
    expect(f.started).toEqual([]);
  });

  it.each(SOUND_NAMES)('synthesizes %s in the shape of the prototype sound', async (name) => {
    const { f, sfx } = setup();
    await sfx.unlock();
    sfx[name]();
    expect(f.started.filter((s) => s.kind === 'osc')).toHaveLength(SHAPES[name].osc);
    expect(f.started.filter((s) => s.kind === 'noise')).toHaveLength(SHAPES[name].noise);
  });

  it('plays the crate as a short square thud and the whistle as a falling sine, as the prototype', async () => {
    const { f, sfx } = setup();
    await sfx.unlock();
    sfx.crate();
    sfx.whistle();
    expect(f.started.map((s) => s.type)).toEqual(['square', 'sine']);
  });

  it('play(name) plays the same sound as its method', async () => {
    const a = setup();
    const b = setup();
    await a.sfx.unlock();
    await b.sfx.unlock();
    a.sfx.play('cheer');
    b.sfx.cheer();
    expect(a.f.started).toEqual(b.f.started);
  });

  it('"Geräusche" off silences every sound, and a change applies at once', async () => {
    const { f, sfx, switches } = setup({ effects: false });
    await sfx.unlock();
    for (const name of SOUND_NAMES) sfx[name]();
    expect(f.started).toEqual([]);
    switches.effects = true;
    sfx.puff();
    expect(f.started).toHaveLength(1);
  });

  it('never goes above MAX_GAIN', async () => {
    const { f, sfx } = setup();
    await sfx.unlock();
    for (const name of SOUND_NAMES) sfx[name]();
    expect(Math.max(...f.gains)).toBeLessThanOrEqual(MAX_GAIN);
  });

  it('installUnlock resumes audio on a key press', async () => {
    const { f, sfx } = setup();
    const target = new EventTarget();
    sfx.installUnlock(target);
    target.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    await Promise.resolve();
    sfx.crate();
    expect(f.started).toHaveLength(1);
  });

  describe('unlock on iPad (as math-soccer amendment 17)', () => {
    it('stays suspended until a gesture; the start of a touch is not one, its end resumes at once', () => {
      const t = setupTablet();
      t.gesture(t.target, 'pointerdown');
      t.sfx.crate();
      expect(t.f.resumes).toEqual([]);
      expect(t.f.started).toEqual([]);
      t.gesture(t.target, 'touchend');
      expect(t.f.resumes).toEqual([true]);
      expect(t.f.silent).toEqual([0]);
      t.sfx.crate();
      expect(t.f.started).toHaveLength(1);
    });

    it.each(['pointerup', 'click', 'keydown'])('resumes synchronously on %s', (type) => {
      const t = setupTablet();
      t.gesture(t.target, type);
      expect(t.f.resumes).toEqual([true]);
      t.sfx.cheer();
      expect(t.f.started.length).toBeGreaterThan(0);
    });

    it('a resume refused outside a gesture keeps the listeners, and the next tap unlocks', () => {
      const t = setupTablet();
      void t.sfx.unlock();
      expect(t.f.resumes).toEqual([false]);
      t.sfx.crate();
      expect(t.f.started).toEqual([]);
      t.gesture(t.target, 'touchend');
      expect(t.f.resumes).toEqual([false, true]);
      t.sfx.crate();
      expect(t.f.started).toHaveLength(1);
    });

    it('resumes before the files are decoded, and plays the synthesized sounds meanwhile', () => {
      const t = setupTablet({ fetchClip: () => new Promise<ArrayBuffer>(() => {}) });
      t.gesture(t.target, 'touchend');
      expect(t.f.resumes).toEqual([true]);
      t.sfx.coin();
      expect(t.f.started.map((s) => s.type)).toEqual(['square', 'square']);
    });

    it('resumes again on the next tap after an interruption, and calls resume only while not running', () => {
      const t = setupTablet();
      t.gesture(t.target, 'touchend');
      t.gesture(t.target, 'touchend');
      expect(t.f.resumes).toEqual([true]);
      t.interrupt();
      t.sfx.crate();
      expect(t.f.started).toEqual([]);
      t.gesture(t.target, 'touchend');
      expect(t.f.resumes).toEqual([true, true]);
      t.sfx.crate();
      expect(t.f.started).toHaveLength(1);
    });

    it('tries to resume when the page comes back into view, and the removed listeners do nothing', () => {
      const t = setupTablet();
      t.target.dispatchEvent(new Event('visibilitychange'));
      // Not created yet: nothing to resume before the first gesture.
      expect(t.f.resumes).toEqual([]);
      t.gesture(t.target, 'touchend');
      t.interrupt();
      t.gesture(t.target, 'visibilitychange');
      expect(t.f.resumes).toEqual([true, true]);
      t.interrupt();
      t.remove();
      t.gesture(t.target, 'touchend');
      expect(t.f.resumes).toEqual([true, true]);
    });
  });

  it('stays silent when Web Audio is missing', async () => {
    const sfx = createSfx({
      sound: () => ({ effects: true }),
      createContext: () => {
        throw new Error('no audio');
      },
    });
    await sfx.unlock();
    expect(() => sfx.hit()).not.toThrow();
  });

  describe('bundled files', () => {
    /** A decoded file stands in as an object that names it; the fetch returns the file name as bytes. */
    function setupClips(broken: string[] = []) {
      const f = fakeContext(async (data) => {
        const file = new TextDecoder().decode(data);
        if (broken.includes(file)) throw new Error(`cannot decode ${file}`);
        return { clip: file } as unknown as AudioBuffer;
      });
      const switches: SoundSwitches = { effects: true };
      const fetched: string[] = [];
      const sfx = createSfx({
        sound: () => switches,
        createContext: () => f.ctx,
        clips: (file) => `/assets/${file}`,
        fetchClip: async (url) => {
          fetched.push(url);
          return new TextEncoder().encode(url.slice('/assets/'.length)).buffer as ArrayBuffer;
        },
      });
      const clips = () => f.started.flatMap((s) => (s.buffer && typeof s.buffer === 'object' && 'clip' in s.buffer ? [(s.buffer as { clip: string }).clip] : []));
      return { f, sfx, switches, fetched, clips };
    }

    it('uses the files copied from math-soccer (coin, fanfare, the confetti pop for the hit) and the CC0 propeller, whistle and crate', () => {
      expect(BUNDLED).toEqual({
        propeller: 'propeller.mp3',
        whistle: 'whistle.mp3',
        hit: 'pop.mp3',
        crate: 'crate.mp3',
        coin: 'coin.mp3',
        fanfare: 'fanfare.mp3',
      });
    });

    it('fetches and decodes every bundled file once, after the first unlock', async () => {
      const { sfx, fetched } = setupClips();
      expect(fetched).toEqual([]);
      await sfx.unlock();
      await sfx.unlock();
      expect([...fetched].sort()).toEqual([
        '/assets/coin.mp3',
        '/assets/crate.mp3',
        '/assets/fanfare.mp3',
        '/assets/pop.mp3',
        '/assets/propeller.mp3',
        '/assets/whistle.mp3',
      ]);
    });

    it('plays the file instead of the synthesized sound, and synthesizes sounds without a file', async () => {
      const { f, sfx, clips } = setupClips();
      await sfx.unlock();
      sfx.coin();
      sfx.fanfare();
      sfx.hit();
      sfx.propeller();
      sfx.whistle();
      sfx.crate();
      expect(clips()).toEqual(['coin.mp3', 'fanfare.mp3', 'pop.mp3', 'propeller.mp3', 'whistle.mp3', 'crate.mp3']);
      expect(f.started.filter((s) => s.kind === 'osc')).toEqual([]);
      sfx.miss();
      expect(f.started.filter((s) => s.kind === 'osc')).toHaveLength(2);
    });

    it('"Geräusche" still gates every file', async () => {
      const { sfx, switches, clips } = setupClips();
      switches.effects = false;
      await sfx.unlock();
      sfx.coin();
      expect(clips()).toEqual([]);
    });

    it('falls back to the synthesized sound for a file that fails to decode, or when fetching fails', async () => {
      const { f, sfx, clips } = setupClips(['coin.mp3']);
      await sfx.unlock();
      sfx.coin();
      expect(clips()).toEqual([]);
      expect(f.started.filter((s) => s.kind === 'osc')).toHaveLength(2);
      const g = fakeContext();
      const offline = createSfx({ sound: () => ({ effects: true }), createContext: () => g.ctx, clips: (file) => file, fetchClip: () => Promise.reject(new Error('offline')) });
      await offline.unlock();
      offline.fanfare();
      expect(g.started.filter((s) => s.kind === 'osc')).toHaveLength(4);
    });
  });
});
