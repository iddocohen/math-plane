import { describe, expect, it } from 'vitest';
import { emptyRecords, recordKey, submitResult } from './records';

describe('personal bests (research R16)', () => {
  it('keys "Treffer" by bombs and "Bauen und Malen" by tasks', () => {
    expect(recordKey('treffer', 10)).toBe('treffer:10');
    expect(recordKey('bauenMalen', 5)).toBe('bauenMalen:5');
  });

  it('keeps the highest result per key', () => {
    let r = emptyRecords();
    let out = submitResult(r, 'treffer:10', 6);
    expect(out).toMatchObject({ newRecord: true, best: 6 });
    r = out.records;
    out = submitResult(r, 'treffer:10', 4);
    expect(out).toEqual({ records: r, newRecord: false, best: 6 });
    out = submitResult(r, 'treffer:10', 6);
    expect(out.newRecord).toBe(false);
    out = submitResult(r, 'treffer:10', 8);
    expect(out.records.best).toEqual({ 'treffer:10': 8 });
  });

  it('keeps rounds of other lengths apart, and a round with 0 is never a record', () => {
    const r = submitResult(emptyRecords(), 'treffer:10', 6).records;
    expect(submitResult(r, 'treffer:15', 3)).toMatchObject({ newRecord: true, best: 3 });
    expect(submitResult(emptyRecords(), 'bauenMalen:5', 0)).toMatchObject({ newRecord: false, best: null });
  });

  it('does not change the records it was given', () => {
    const r = emptyRecords();
    submitResult(r, 'bauenMalen:5', 4);
    expect(r.best).toEqual({});
  });
});
