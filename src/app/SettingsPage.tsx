// Structure adapted from math-soccer src/app/SettingsPage.tsx: the Mathe-Flieger groups, the same form helpers and
// data group.
/**
 * Settings page for parents (FR-051, FR-053, FR-054, contracts/screens.md "Settings").
 *
 * The fields of data-model "Settings", grouped as Stufen, Themen, Gebäude, Runde, Ton, Bedienung, Hangar and Daten.
 * "Stufen" holds, per mode, "Stufe am Anfang" and "Schwerste Stufe" (each option names its level) and the adaptive
 * switch. The two levels stay in order: a start level above the hardest level moves the hardest level up with it, and a
 * hardest level below the start level moves the start level down. The form is checked with `validateSettings` on every
 * change; errors appear next to their fields and "Speichern" stays disabled while any error exists. Saving writes
 * through persistence.ts and hands the settings to the app, which applies them when the page closes (FR-054).
 *
 * The data group (FR-053, as math-soccer): "Daten sichern" downloads the export file, "Daten laden" reads one, and
 * "QR-Code" shows a QR code and "Link kopieren" for the saved data of this browser. The link is built again after
 * "Speichern" and after "Daten laden".
 *
 * "Kopie wiederherstellen" shows when a kept copy of damaged data is readable by this version; restoring reloads the
 * page, so every screen uses the restored data. The header shows the build's version and date.
 */
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { BOMBS_MAX, BOMBS_MIN, MAX_PLANS, MAX_STACKS, TASKS_MAX, TASKS_MIN, type MaxPlan, type MaxStack } from '../core/settings/defaults';
import type { LevelRange, Settings } from '../core/settings/schema';
import { validateSettings } from '../core/settings/validate';
import { levelDef } from '../core/tasks/levels';
import { qrMatrix, qrPath, type QrMatrix } from '../core/transfer/qr';
import { encodeTransfer, type EncodedTransfer } from '../core/transfer/transfer';
import { LEVELS, MODES, SIDES, TASK_KINDS, type Level, type Mode } from '../core/types';
import { t } from '../i18n';
import { BUILD_DATE, BUILD_VERSION } from './buildInfo';
import type { Persistence } from './persistence';

/** "Stufe 1: Körper" to "Stufe 5: Alle Seiten" for the level selects of `mode`. */
function levelOptionsOf(mode: Mode): Array<{ value: string; label: string }> {
  return LEVELS.map((l) => ({ value: String(l), label: t().levels.label(l, levelDef(mode, l).name) }));
}

/**
 * The range after the parent picked `level` as `which`: the other end moves along when the two would cross, so the
 * start level is never above the hardest level.
 */
export function orderedRange(range: LevelRange, which: keyof LevelRange, level: Level): LevelRange {
  if (which === 'start') return { start: level, hardest: level > range.hardest ? level : range.hardest };
  return { start: level < range.start ? level : range.start, hardest: level };
}

interface Props {
  persistence: Persistence;
  onSaved: (settings: Settings) => void;
  onClose: () => void;
  now?: () => Date;
  /** After "Kopie wiederherstellen": the page reloads, so every screen uses the restored data. */
  onRestored?: () => void;
}

type Notice = { kind: 'ok' | 'warn'; text: string } | null;

/** A whole number from an input's text; NaN for empty or other text. */
function parseWhole(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

/** Errors by field path, from `validateSettings`. */
function collectErrors(s: Settings): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const e of validateSettings(s)) out.set(e.path, [...(out.get(e.path) ?? []), t().settingsErrors[e.key]]);
  return out;
}

/** The local date as YYYY-MM-DD, the day the parent sees on the device. */
function today(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** iOS Safari may cancel a download whose address is revoked at once; a minute is long enough to start it. */
const REVOKE_AFTER_MS = 60_000;

export function SettingsPage({ persistence, onSaved, onClose, now = () => new Date(), onRestored = () => window.location.reload() }: Props) {
  const m = t();
  const [backups] = useState(() => persistence.backups());
  const [restoreFailed, setRestoreFailed] = useState<'failed' | 'partial' | null>(null);
  const restore = () => {
    const r = persistence.restoreBackups();
    if (r.ok) onRestored();
    else setRestoreFailed(r.partial ? 'partial' : 'failed');
  };
  const S = m.settings;
  const L = S.labels;
  const O = S.options;
  const [draft, setDraft] = useState<Settings>(() => structuredClone(persistence.settings()));
  const [notice, setNotice] = useState<Notice>(null);
  const [dataNotice, setDataNotice] = useState<Notice>(null);
  const [showQr, setShowQr] = useState(false);
  // Counts saves and imports, so the transfer link is built again from the saved data.
  const [savedCount, setSavedCount] = useState(0);

  const errors = collectErrors(draft);
  const valid = errors.size === 0;
  const errorsAt = (path: string) => errors.get(path) ?? [];

  const update = (next: Settings) => {
    setDraft(next);
    setNotice(null);
  };
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => update({ ...draft, [key]: value });
  const setLevel = (mode: Mode, which: keyof LevelRange, level: Level) =>
    set('levels', { ...draft.levels, [mode]: orderedRange(draft.levels[mode], which, level) });
  const setBuildings = <K extends keyof Settings['buildings']>(key: K, value: Settings['buildings'][K]) => set('buildings', { ...draft.buildings, [key]: value });

  const save = () => {
    if (!valid) return;
    const r = persistence.saveSettings(draft);
    onSaved(structuredClone(draft));
    setSavedCount((n) => n + 1);
    setNotice(r.ok ? { kind: 'ok', text: S.saved } : { kind: 'warn', text: S.saveFailed });
  };

  const exportFile = () => {
    try {
      const text = persistence.exportText(now());
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `mathe-flieger-${today(now())}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
    } catch {
      setDataNotice({ kind: 'warn', text: S.data.exportFailed });
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setDataNotice({ kind: 'warn', text: S.data.readFailed });
      return;
    }
    const r = persistence.importText(text);
    if (!r.ok) {
      setDataNotice({ kind: 'warn', text: S.data.importFailed[r.reason] });
      return;
    }
    setDraft(structuredClone(r.settings));
    setNotice(null);
    onSaved(structuredClone(r.settings));
    setSavedCount((n) => n + 1);
    setDataNotice({ kind: 'ok', text: S.data.imported });
  };

  return (
    <div className="settings-page" role="dialog" aria-modal="true" aria-label={S.title} data-testid="settings-page" lang="de">
      <header className="settings-header">
        <h2>{S.title}</h2>
        <div className="settings-actions">
          <button type="button" className="primary" onClick={save} disabled={!valid}>
            {S.save}
          </button>
          <button type="button" onClick={onClose}>
            {m.parent.close}
          </button>
        </div>
        <p className="build-version" data-testid="build-version">
          {S.version(BUILD_VERSION, BUILD_DATE)}
        </p>
      </header>

      <div className="settings-notices" role="status" aria-live="polite">
        {!valid && <p className="notice warn">{S.checkFields}</p>}
        {notice && <p className={`notice ${notice.kind}`}>{notice.text}</p>}
        {backups.length > 0 && (
          <div className="notice" data-testid="backup-notice">
            <p>{m.parent.backupFound(backups.map((kind) => m.parent.dataNames[kind]).join(', '))}</p>
            <button type="button" onClick={restore}>
              {m.parent.restoreBackup}
            </button>
          </div>
        )}
        {restoreFailed && <p className="notice warn">{restoreFailed === 'partial' ? m.parent.savePartial : m.parent.restoreFailed}</p>}
      </div>

      <div className="settings-groups">
        <Group title={S.groups.levels} errors={MODES.flatMap((mode) => errorsAt(`levels.${mode}`))}>
          {MODES.map((mode) => (
            <div key={mode} className="settings-subgroup" role="group" aria-label={m.progressPage.modes[mode]} data-mode={mode}>
              <p className="field-label">{m.progressPage.modes[mode]}</p>
              <Select
                label={L.startLevel}
                value={String(draft.levels[mode].start)}
                options={levelOptionsOf(mode)}
                onChange={(v) => setLevel(mode, 'start', Number(v) as Level)}
              />
              <Select
                label={L.hardestLevel}
                value={String(draft.levels[mode].hardest)}
                options={levelOptionsOf(mode)}
                onChange={(v) => setLevel(mode, 'hardest', Number(v) as Level)}
              />
            </div>
          ))}
          <Check label={L.adaptive} checked={draft.adaptive} onChange={(v) => set('adaptive', v)} />
        </Group>

        <Group title={S.groups.topics}>
          {TASK_KINDS.map((kind) => (
            <Check key={kind} label={m.kinds[kind]} checked={draft.kinds[kind]} onChange={(v) => set('kinds', { ...draft.kinds, [kind]: v })} />
          ))}
        </Group>

        <Group title={S.groups.buildings} errors={errorsAt('buildings.sides')}>
          <Select
            label={L.maxPlan}
            value={String(draft.buildings.maxPlan)}
            options={MAX_PLANS.map((n) => ({ value: String(n), label: O.maxPlan[n] }))}
            onChange={(v) => setBuildings('maxPlan', Number(v) as MaxPlan)}
          />
          <Select
            label={L.maxStack}
            value={String(draft.buildings.maxStack)}
            options={MAX_STACKS.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(v) => setBuildings('maxStack', Number(v) as MaxStack)}
          />
          <p className="field-label">{L.sides}</p>
          {SIDES.map((side) => (
            <Check
              key={side}
              label={m.names.sides[side]}
              checked={draft.buildings.sides[side]}
              onChange={(v) => setBuildings('sides', { ...draft.buildings.sides, [side]: v })}
            />
          ))}
          <Check label={L.roundPieces} checked={draft.buildings.mixedPieces} onChange={(v) => setBuildings('mixedPieces', v)} />
        </Group>

        <Group title={S.groups.round}>
          <NumberInput
            label={L.bombs}
            value={draft.round.bombs}
            min={BOMBS_MIN}
            max={BOMBS_MAX}
            errors={errorsAt('round.bombs')}
            onChange={(n) => set('round', { ...draft.round, bombs: n })}
          />
          <NumberInput
            label={L.tasks}
            value={draft.round.tasks}
            min={TASKS_MIN}
            max={TASKS_MAX}
            errors={errorsAt('round.tasks')}
            onChange={(n) => set('round', { ...draft.round, tasks: n })}
          />
        </Group>

        <Group title={S.groups.sound}>
          <Check label={L.soundEffects} checked={draft.sound.effects} onChange={(v) => set('sound', { ...draft.sound, effects: v })} />
          <Check label={L.soundMusic} checked={draft.sound.music} onChange={(v) => set('sound', { ...draft.sound, music: v })} />
          <Check label={L.soundSpeech} checked={draft.sound.speech} onChange={(v) => set('sound', { ...draft.sound, speech: v })} />
        </Group>

        <Group title={S.groups.controls}>
          <Select
            label={L.numberPad}
            value={draft.numberPad}
            options={(['auto', 'always', 'never'] as const).map((value) => ({ value, label: O.numberPad[value] }))}
            onChange={(v) => set('numberPad', v)}
          />
          <Check label={L.showClock} checked={draft.showClock} onChange={(v) => set('showClock', v)} />
          <Check label={L.showRecords} checked={draft.showRecords} onChange={(v) => set('showRecords', v)} />
          <Check label={L.pointAfterFullHelp} checked={draft.pointAfterFullHelp} onChange={(v) => set('pointAfterFullHelp', v)} />
        </Group>

        <Group title={S.groups.hangar}>
          <Check label={L.hangar} checked={draft.hangar} onChange={(v) => set('hangar', v)} />
        </Group>

        <Group title={S.groups.data}>
          <p className="hint">{S.data.exportHint}</p>
          <div className="data-buttons">
            <button type="button" onClick={exportFile}>
              {S.data.export}
            </button>
            <label className="file-button">
              {S.data.import}
              <input
                type="file"
                accept="application/json,.json"
                data-testid="import-file"
                onChange={(e) => {
                  const input = e.currentTarget;
                  void importFile(input.files?.[0]).finally(() => {
                    input.value = '';
                  });
                }}
              />
            </label>
            <button type="button" aria-expanded={showQr} onClick={() => setShowQr((v) => !v)}>
              {S.data.qr}
            </button>
          </div>
          <div role="status" aria-live="polite">
            {dataNotice && <p className={`notice ${dataNotice.kind}`}>{dataNotice.text}</p>}
          </div>
          {showQr && <TransferGroup persistence={persistence} savedCount={savedCount} />}
        </Group>
      </div>
    </div>
  );
}

/** The link for the saved data; when the browser's compression fails, the uncompressed link. Rejects when both fail. */
async function buildTransfer(persistence: Persistence): Promise<EncodedTransfer> {
  try {
    return await encodeTransfer(persistence.saveData(), window.location.href);
  } catch {
    return encodeTransfer(persistence.saveData(), window.location.href, { codec: null });
  }
}

/** "Spielstand übertragen" (FR-053, as math-soccer): a QR code of the transfer link and "Link kopieren". */
function TransferGroup({ persistence, savedCount }: { persistence: Persistence; savedCount: number }) {
  const T = t().transfer;
  const [transfer, setTransfer] = useState<EncodedTransfer | null>(null);
  const [buildFailed, setBuildFailed] = useState(false);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    let live = true;
    buildTransfer(persistence).then(
      (r) => {
        if (!live) return;
        setTransfer(r);
        setBuildFailed(false);
      },
      () => {
        if (!live) return;
        setTransfer(null);
        setBuildFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [persistence, savedCount]);
  const qr = useMemo(() => (transfer?.fits ? qrMatrix(transfer.link) : null), [transfer]);

  const copyLink = async () => {
    if (!transfer) return;
    try {
      await navigator.clipboard.writeText(transfer.link);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <div className="transfer" data-testid="transfer" data-transfer-link={transfer?.link}>
      <h3>{T.title}</h3>
      <p className="hint">{T.hint}</p>
      {qr && <QrSvg qr={qr} label={T.qrLabel} />}
      {buildFailed && <p className="notice warn">{T.buildFailed}</p>}
      {transfer && !transfer.fits && <p className="notice warn">{T.tooLarge}</p>}
      {transfer?.fits && transfer.windowLength < 10 && <p className="notice">{T.trimmed}</p>}
      <button type="button" onClick={() => void copyLink()} disabled={!transfer}>
        {T.copy}
      </button>
      <div role="status" aria-live="polite">
        {copy === 'copied' && <p className="notice ok">{T.copied}</p>}
        {copy === 'failed' && <p className="notice warn">{T.copyFailed}</p>}
      </div>
      {copy === 'failed' && transfer && (
        <p className="transfer-link-text" data-testid="transfer-link-text">
          {transfer.link}
        </p>
      )}
    </div>
  );
}

/** A QR code with its white quiet zone (the matrix includes it), drawn with one square per dark module. */
function QrSvg({ qr, label }: { qr: QrMatrix; label: string }) {
  return (
    <svg className="transfer-qr" data-testid="transfer-qr" viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      <rect width={qr.size} height={qr.size} fill="#fff" />
      <path d={qrPath(qr)} fill="#000" />
    </svg>
  );
}

/** A settings group with its errors at the end. */
function Group({ title, errors = [], children }: { title: string; errors?: string[]; children: ReactNode }) {
  return (
    <fieldset className="settings-group">
      <legend>{title}</legend>
      {children}
      <Errors errors={errors} />
    </fieldset>
  );
}

function Errors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="field-errors">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="field check-field">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

function Select<V extends string>({ label, value, options, onChange }: { label: string; value: V; options: Array<{ value: V; label: string }>; onChange: (v: V) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.currentTarget.value as V)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * A whole-number field. It keeps the typed text, so an empty or partial entry stays visible while the parent types,
 * and reports NaN for text that is not a number. A value changed from outside replaces the text.
 */
function NumberInput({
  label,
  value,
  min,
  max,
  errors = [],
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  errors?: string[];
  onChange: (n: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(() => String(value));
  const [seen, setSeen] = useState(value);
  if (!Object.is(value, seen)) {
    setSeen(value);
    if (!Object.is(parseWhole(text), value) && !Number.isNaN(value)) setText(String(value));
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        step={1}
        min={min}
        max={max}
        value={text}
        aria-invalid={errors.length > 0 || undefined}
        onChange={(e) => {
          const next = e.currentTarget.value;
          setText(next);
          setSeen(parseWhole(next));
          onChange(parseWhole(next));
        }}
      />
      <Errors errors={errors} />
    </div>
  );
}
