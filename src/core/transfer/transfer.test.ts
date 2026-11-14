// Adapted from math-soccer src/core/transfer/transfer.test.ts: the Hangar, the counters and the levels per mode.
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../settings/defaults';
import { emptyHangar, emptyProgress, emptyRecords } from '../storage/schemas';
import type { SaveData } from './transfer';
import {
  browserCodec,
  decodeTransfer,
  encodeTransfer,
  saveCodeFromHash,
  toTransfer,
  TRANSFER_MAX_CODE_LENGTH,
  transferLink,
  transferSummary,
} from './transfer';

const PAGE = 'https://iddocohen.github.io/math-plane/';

function saveData(): SaveData {
  const progress = emptyProgress();
  progress.levels = { treffer: 3, bauenMalen: 2 };
  progress.recent.treffer = ['alone', 'withHelp'];
  progress.counts['treffer:bauplanFinden:3'] = { alone: 4, withHelp: 1, window: ['alone', 'withHelp', 'alone'] };
  progress.counts['bauenMalen:malen:rechts'] = { alone: 0, withHelp: 2, window: ['withHelp', 'withHelp'] };
  progress.attempts.push({ mode: 'treffer', kind: 'bauplanFinden', level: 3, outcome: 'alone', helpStep: 0, misses: 0, ms: 4000, at: '2026-11-14T12:00:00.000Z' });
  const records = emptyRecords();
  records.best['treffer:10'] = 8;
  return {
    settings: { ...defaultSettings(), round: { bombs: 12, tasks: 6 } },
    progress,
    records,
    hangar: { ...emptyHangar(), stars: 31, owned: ['hat.cap'] },
  };
}

/** What a receiver gets: no attempt history and no recent outcomes. */
function expected(data: SaveData): SaveData {
  return { ...data, progress: { ...emptyProgress(), levels: data.progress.levels, counts: data.progress.counts } };
}

const base64url = (json: string) => btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('transfer links', () => {
  it('puts the code after #save= and replaces an old fragment', () => {
    expect(transferLink(`${PAGE}#old`, 'v1.abc')).toBe(`${PAGE}#save=v1.abc`);
    expect(saveCodeFromHash('#save=v1.abc')).toBe('v1.abc');
    expect(saveCodeFromHash('#other')).toBeNull();
  });

  it('round-trips settings, progress, records and Hangar, compressed and uncompressed, without the attempt history', async () => {
    for (const codec of [browserCodec(), null]) {
      const r = await encodeTransfer(saveData(), PAGE, { codec });
      expect(r.fits).toBe(true);
      expect(r.link.startsWith(`${PAGE}#save=v1.`)).toBe(true);
      const decoded = await decodeTransfer(r.code, { codec });
      expect(decoded).toEqual({ ok: true, data: expected(saveData()), summary: { stars: 31, treffer: 3, bauenMalen: 2 } });
    }
  });

  it('refuses a code without the Hangar or with a damaged one', async () => {
    const { hangar: _h, ...noHangar } = toTransfer(saveData());
    void _h;
    expect(await decodeTransfer(`v1.${base64url(JSON.stringify(noHangar))}`, { codec: null })).toEqual({ ok: false });
    const bad = { ...toTransfer(saveData()), hangar: { ...emptyHangar(), stars: -1 } };
    expect(await decodeTransfer(`v1.${base64url(JSON.stringify(bad))}`, { codec: null })).toEqual({ ok: false });
  });

  it('refuses a level outside 1 to 5 and a window with other letters', async () => {
    const t = toTransfer(saveData());
    const badLevel = { ...t, levels: { treffer: 9, bauenMalen: 1 } };
    expect(await decodeTransfer(`v1.${base64url(JSON.stringify(badLevel))}`, { codec: null })).toEqual({ ok: false });
    const badWindow = { ...t, counts: { 'treffer:koerper:1': [1, 0, 'ax'] } };
    expect(await decodeTransfer(`v1.${base64url(JSON.stringify(badWindow))}`, { codec: null })).toEqual({ ok: false });
  });

  it('cuts the mastery windows when the link would be too long, and says when it never fits', async () => {
    const r = await encodeTransfer(saveData(), PAGE, { codec: null, maxBytes: 1 });
    expect(r.fits).toBe(false);
    expect(r.windowLength).toBe(0);
    expect(toTransfer(saveData(), 1).counts['treffer:bauplanFinden:3']).toEqual([4, 1, 'a']);
  });

  it('refuses damaged, foreign, invalid and oversized codes', async () => {
    expect(await decodeTransfer('v3.abc', { codec: null })).toEqual({ ok: false });
    expect(await decodeTransfer('v2.abc', { codec: null })).toEqual({ ok: false });
    expect(await decodeTransfer('v1.***', { codec: null })).toEqual({ ok: false });
    expect(await decodeTransfer(`v1.${'A'.repeat(TRANSFER_MAX_CODE_LENGTH)}`, { codec: null })).toEqual({ ok: false });
    const bad = await encodeTransfer({ ...saveData(), settings: { ...defaultSettings(), round: { bombs: 0, tasks: 5 } } }, PAGE, { codec: null });
    expect(await decodeTransfer(bad.code, { codec: null })).toEqual({ ok: false });
  });

  it('summarizes the stars and the current level of each mode', () => {
    expect(transferSummary(saveData())).toEqual({ stars: 31, treffer: 3, bauenMalen: 2 });
  });
});
