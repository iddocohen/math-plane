// Structure adapted from math-soccer src/app/App.tsx.
/**
 * The app shell: the start screen (StartScreen.tsx), the round with the Phaser canvas (RoundScene.ts) under a React
 * overlay (RoundOverlay.tsx), the pause screen and the round end over the round, and the Hangar, parent and transfer
 * screens (stand-ins in Placeholders.tsx until their tasks build them).
 *
 * A round is one RoundController with the rules of its mode (modeRules.ts). The app saves the round after every event,
 * so a refresh continues it; adds each earned star to the Hangar at once; records each finished task; and saves the
 * personal bests when the round ends (not when the child leaves it).
 *
 * Phaser loads in its own chunk when the first round starts, so the start screen shows quickly. One game serves every
 * round (createGame.ts).
 *
 * Test hooks (contracts/screens.md): `?start=treffer|bauenMalen` is what Enter starts on the start screen, `?seed=`
 * fixes the round seed, `?speed=N` makes play time run N times as fast (`window.mathPlaneSpeed` changes it while the
 * page runs), and `?test=1` fills `data-answer`.
 *
 * Pause and home: the pause button or Escape pauses the round with "Pause"; the home button pauses it and asks "Runde
 * beenden?". "Zum Start" leaves the round without a round end. The Hangar icon opens the Hangar over the round and
 * pauses it; closing the Hangar continues the round unless the child paused it.
 *
 * The gear does nothing yet: the parent gate (T059) makes it open the parent menu after a 2-second hold.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { assetUrl, fontReady } from '../assets';
import { createSfx } from '../audio/sfx';
import { createSpeaker } from '../audio/speaker';
import { RoundController, type RoundSummary } from '../core/round/RoundController';
import type { ModeRules } from '../core/round/rules';
import type { StoredRound } from '../core/storage/schemas';
import { localStorageKeyValue } from '../core/storage/keyValue';
import { currentLevel, levelDef, levelRange } from '../core/tasks/levels';
import { saveCodeFromHash } from '../core/transfer/transfer';
import { MODES, type Mode } from '../core/types';
import type { GameHandle } from '../game/createGame';
import type { SceneKey } from '../game/taskViews';
import { resetMessage, t } from '../i18n';
import type { KeyAction, KeyScreen } from './keyboard';
import { rulesFor } from './modeRules';
import { noFocus } from './noFocus';
import { PauseScreen } from './PauseScreen';
import { createPersistence, type DataKind, type Persistence } from './persistence';
import { HangarScreen, ParentScreen, TransferScreen, type ParentView } from './Placeholders';
import { createPlayClock, playSpeed, seedFromUrl, speedFromUrl, testFromUrl } from './playClock';
import { RoundEnd } from './RoundEnd';
import { RoundOverlay } from './RoundOverlay';
import { bannerText, messageAfter } from './roundText';
import { StartScreen, type ModeButton } from './StartScreen';
import { swUpdate } from './swUpdate';
import { useRoundState } from './useController';
import { applyRoundAction, useKeyboard } from './useKeyboard';
import { useNumberPadShown } from './useScreen';

/** Loads the game chunk and waits for Fredoka, so the scene's text uses it. */
async function loadGame(): Promise<typeof import('../game/createGame')> {
  const [game] = await Promise.all([import('../game/createGame'), fontReady()]);
  return game;
}

/** The `start` query parameter when it names a mode, or undefined. */
export function startFromUrl(search: string): Mode | undefined {
  const raw = new URLSearchParams(search).get('start');
  return MODES.find((m) => m === raw);
}

/** Remembers that a save during play failed, so the start screen can say so (as math-soccer). */
function createSaveWatch() {
  let failed = false;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const fn of listeners) fn();
  };
  return {
    report(result: { ok: boolean }): void {
      if (result.ok || failed) return;
      failed = true;
      notify();
    },
    failed: () => failed,
    dismiss(): void {
      failed = false;
      notify();
    },
    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** The lines of the start screen note about data reset on load, one per reason with the kinds it concerns. */
function resetNoteLines(reasons: ReturnType<Persistence['resetReasons']>): string[] {
  const lines: string[] = [];
  for (const reason of ['invalid', 'newer', 'unavailable'] as const) {
    const kinds: DataKind[] = reasons.filter((r) => r.reason === reason).map((r) => r.kind);
    if (kinds.length === 0) continue;
    const names = kinds.map((k) => t().parent.dataNames[k]).join(', ');
    lines.push(`${resetMessage(reason)} ${t().storage.kinds(names)}`);
  }
  return lines;
}

function createApp() {
  const search = window.location.search;
  const persistence = createPersistence(localStorageKeyValue());
  const saves = createSaveWatch();
  const speedParam = speedFromUrl(search);
  const speed = () => playSpeed(speedParam);
  const clock = createPlayClock(speed);
  const sfx = createSfx({ sound: () => persistence.settings().sound, clips: assetUrl });
  const speaker = createSpeaker();
  return {
    persistence,
    saves,
    speed,
    clock,
    sfx,
    speaker,
    seed: seedFromUrl(search),
    test: testFromUrl(search),
    enterStart: startFromUrl(search),
  };
}

/** One round: its controller and the rules it runs with. */
interface Round {
  mode: Mode;
  controller: RoundController;
  rules: ModeRules;
}

/** The stand-in for the parent gate (T059): a gear that does nothing yet. */
function Gear() {
  return (
    <button type="button" className="icon-button gear" data-testid="gear" aria-label={t().start.gear} {...noFocus}>
      <span aria-hidden="true">⚙</span>
    </button>
  );
}

/** The element that holds the game's canvas for the whole session; it fills the round screen's `.game-parent`. */
function newGameHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.className = 'game-host';
  return host;
}

export function App() {
  const [parts] = useState(createApp);
  const { persistence, saves, clock, sfx, speaker } = parts;
  const [settings, setSettings] = useState(() => persistence.settings());
  const [stars, setStars] = useState(() => persistence.hangar().stars);
  const [round, setRound] = useState<Round | null>(null);
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pauseKind, setPauseKind] = useState<'pause' | 'quit' | null>(null);
  const [overlay, setOverlay] = useState<'hangar' | 'parent' | 'transfer' | null>(() => (saveCodeFromHash(window.location.hash) ? 'transfer' : null));
  const [parentView, setParentView] = useState<ParentView>('menu');
  const [resetLines, setResetLines] = useState(() => resetNoteLines(persistence.resetReasons()));
  const saveFailed = useSyncExternalStore(saves.subscribe, saves.failed);
  const updateWaiting = useSyncExternalStore(swUpdate.subscribe, swUpdate.waiting);
  const numberPad = useNumberPadShown(settings.numberPad);
  const gameRef = useRef<GameHandle | null>(null);
  const [host] = useState(newGameHost);
  const parentRef = useRef<HTMLDivElement | null>(null);

  /** Creates a round of `mode`, continuing `stored` when it fits. */
  const makeRound = useCallback(
    (mode: Mode, stored: StoredRound | null = null): Round => {
      const rules = rulesFor(mode);
      const s = persistence.settings();
      const controller = new RoundController({
        rules,
        settings: s,
        progress: persistence.progress(),
        records: persistence.records(),
        seed: parts.seed ?? Math.floor(Math.random() * 2 ** 31),
        now: clock.now,
        stored,
      });
      controller.subscribe((e) => {
        if (e.type === 'starsAwarded') {
          saves.report(persistence.awardStars(e.n));
          setStars(persistence.hangar().stars);
        } else if (e.type === 'attemptRecorded') {
          saves.report(persistence.recordAttempt(e.record, s));
        } else if (e.type === 'roundEnded') {
          if (!e.summary.quit) saves.report(persistence.saveRecords(e.summary.records));
          setSummary(e.summary);
        } else if (e.type === 'bombLanded') {
          if (e.hit) sfx.hit();
          else sfx.miss();
        } else if (e.type === 'checked') {
          if (e.right) sfx.cheer();
          else sfx.miss();
        } else if (e.type === 'passStarted') {
          sfx.propeller();
        }
        const text = messageAfter(e, controller.state().task);
        if (text !== undefined) setMessage(text);
        saves.report(persistence.saveRound(controller.toStored()));
      });
      return { mode, controller, rules };
    },
    [clock, parts.seed, persistence, saves, sfx],
  );

  const startRound = useCallback(
    (mode: Mode) => {
      speaker.prime();
      void sfx.unlock();
      setSettings(persistence.settings());
      setSummary(null);
      setMessage(null);
      setPauseKind(null);
      const next = makeRound(mode);
      saves.report(persistence.saveRound(next.controller.toStored()));
      setRound(next);
    },
    [makeRound, persistence, saves, sfx, speaker],
  );

  // A round stored before a refresh continues; one that no longer fits the settings is dropped. A new version that
  // reloaded the page from "Nochmal" starts the round it asked for.
  useLayoutEffect(() => {
    const stored = persistence.round();
    if (stored) {
      const restored = makeRound(stored.mode, stored);
      if (restored.controller.restored) {
        setRound(restored);
        return;
      }
      persistence.saveRound(null);
    }
    const intent = swUpdate.takeResumeIntent();
    if (intent) startRound(intent.start);
    // Runs once on load.
  }, []);

  const goStart = useCallback(() => {
    round?.controller.quit();
    persistence.saveRound(null);
    setRound(null);
    setSummary(null);
    setPauseKind(null);
    setMessage(null);
    setStars(persistence.hangar().stars);
  }, [persistence, round]);

  // The game: loaded with the first round, then one scene per round; asleep while no round shows.
  useEffect(() => {
    const parent = parentRef.current;
    if (round === null || parent === null) {
      gameRef.current?.leave();
      return;
    }
    if (host.parentElement !== parent) parent.appendChild(host);
    if (gameRef.current) {
      gameRef.current.enter(round.controller);
      return;
    }
    let cancelled = false;
    void loadGame().then(({ createGame }) => {
      if (cancelled || gameRef.current) return;
      gameRef.current = createGame(host, round.controller, { speed: parts.speed, sound: (name) => sfx.play(name) });
    });
    return () => {
      cancelled = true;
    };
  }, [round, host, parts.speed, sfx]);

  useEffect(() => () => gameRef.current?.destroy(), []);

  // Play time stops while the page is hidden; a hidden page also pauses the bombs in the air.
  useEffect(() => {
    if (round === null) return;
    const onVisibility = () => round.controller.setHidden(document.visibilityState === 'hidden');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [round]);

  const onSceneKey = useCallback((k: SceneKey) => {
    gameRef.current?.key(k);
  }, []);

  // "Fertig" goes through the scene, which holds it while crates still fall (RoundScene `done`).
  const onDone = useCallback(() => {
    if (!round) return;
    if (gameRef.current) gameRef.current.done();
    else round.controller.done();
  }, [round]);

  const openHangar = useCallback(() => {
    if (round && round.controller.state().phase !== 'ended') round.controller.pause();
    setOverlay('hangar');
  }, [round]);

  const closeOverlay = useCallback(() => {
    setOverlay(null);
    if (window.location.hash.startsWith('#save=')) history.replaceState(null, '', window.location.pathname + window.location.search);
    if (round && pauseKind === null) round.controller.resume();
  }, [round, pauseKind]);

  const again = useCallback(() => {
    if (!round) return;
    if (updateWaiting && swUpdate.applyNow({ start: round.mode }, () => startRound(round.mode))) return;
    startRound(round.mode);
  }, [round, startRound, updateWaiting]);

  const pause = useCallback(
    (kind: 'pause' | 'quit') => {
      if (!round || round.controller.state().phase === 'ended') return;
      round.controller.pause();
      setPauseKind(kind);
    },
    [round],
  );

  const resume = useCallback(() => {
    setPauseKind(null);
    round?.controller.resume();
  }, [round]);

  const modes: ModeButton[] = useMemo(
    () =>
      MODES.map((mode) => {
        if (levelRange(mode, settings).length === 0) return { mode, level: null };
        const level = currentLevel(mode, persistence.progress().levels[mode], settings);
        return { mode, level: t().levels.label(level, levelDef(mode, level).name) };
      }),
    // `round` is listed so the level shown moves after each round, when the start screen shows again.
    [settings, persistence, round],
  );

  const ended = round !== null && summary !== null && !summary.quit;
  const keyScreen: KeyScreen | null =
    overlay === 'hangar' ? 'hangar' : overlay !== null ? null : round === null ? 'start' : ended ? 'roundEnd' : pauseKind !== null ? 'paused' : 'round';

  const onAction = useCallback(
    (action: KeyAction) => {
      if (action.type === 'start') startRound(action.mode);
      else if (action.type === 'hangar') openHangar();
      else if (action.type === 'back') closeOverlay();
      else if (action.type === 'again') again();
      else if (action.type === 'pause') pause('pause');
      else if (action.type === 'resume') resume();
      else if (action.type === 'done') onDone();
      else if (round) applyRoundAction(round.controller, onSceneKey, action);
    },
    [again, closeOverlay, onDone, onSceneKey, openHangar, pause, resume, round, startRound],
  );

  useKeyboard({
    screen: keyScreen,
    onAction,
    hangar: settings.hangar,
    enterStart: parts.enterStart,
    canStart: Object.fromEntries(modes.map((m) => [m.mode, m.level !== null])),
  });

  // The update rule needs to know what shows (swUpdate.ts).
  useEffect(() => {
    swUpdate.report({ screen: overlay === 'hangar' ? 'hangar' : round === null ? 'start' : 'round', parentOpen: overlay === 'parent', transferOpen: overlay === 'transfer' });
  }, [overlay, round]);

  const notices = [
    ...(resetLines.length > 0 ? [{ id: 'reset', lines: resetLines, onDismiss: () => setResetLines([]) }] : []),
    ...(saveFailed ? [{ id: 'save', lines: [t().storage.saveFailed], onDismiss: saves.dismiss }] : []),
  ];

  return (
    <div className="app" lang="de">
      {round === null ? (
        <StartScreen
          modes={modes}
          onStart={startRound}
          gear={<Gear />}
          hangar={settings.hangar ? { stars, onOpen: openHangar } : null}
          notices={notices}
        />
      ) : (
        <RoundScreen
          round={round}
          parentRef={parentRef}
          message={message}
          test={parts.test}
          numberPad={numberPad}
          showClock={settings.showClock}
          onHangar={settings.hangar ? openHangar : null}
          onPause={() => pause('pause')}
          onHome={() => pause('quit')}
          onDone={onDone}
          onSceneKey={onSceneKey}
        />
      )}
      {round !== null && pauseKind !== null && overlay === null && <PauseScreen kind={pauseKind} onResume={resume} onHome={goStart} />}
      {ended && overlay === null && (
        <RoundEnd
          mode={summary.mode}
          hits={summary.hits}
          bombs={summary.bombsTotal}
          tasksDone={summary.tasksDone}
          record={settings.showRecords ? { newRecord: summary.newRecord, best: summary.best } : null}
          stars={settings.hangar ? summary.stars : null}
          elapsedMs={settings.showClock ? summary.elapsedMs : null}
          cheer={summary.hits + summary.tasksDone}
          updateWaiting={updateWaiting}
          onAgain={again}
          onBack={goStart}
        />
      )}
      {overlay === 'hangar' && <HangarScreen stars={stars} onBack={closeOverlay} />}
      {overlay === 'parent' && (
        <ParentScreen
          view={parentView}
          onOpen={setParentView}
          onBack={() => {
            setParentView('menu');
            closeOverlay();
          }}
        />
      )}
      {overlay === 'transfer' && <TransferScreen onBack={closeOverlay} />}
    </div>
  );
}

interface RoundScreenProps {
  round: Round;
  parentRef: RefObject<HTMLDivElement | null>;
  message: string | null;
  test: boolean;
  numberPad: boolean;
  showClock: boolean;
  onHangar: (() => void) | null;
  onPause: () => void;
  onHome: () => void;
  onDone: () => void;
  onSceneKey: (k: SceneKey) => void;
}

/** The round: the canvas under the overlay. Its own component, so a new state re-renders only the round. */
function RoundScreen({ round, parentRef, message, test, numberPad, showClock, onHangar, onPause, onHome, onDone, onSceneKey }: RoundScreenProps) {
  const state = useRoundState(round.controller);
  return (
    <main className="round">
      <div className="game-parent" ref={parentRef} />
      <RoundOverlay
        controller={round.controller}
        state={state}
        rules={round.rules}
        banner={bannerText(state.task)}
        message={message}
        test={test}
        numberPad={numberPad}
        showClock={showClock}
        onHangar={onHangar}
        onPause={onPause}
        onHome={onHome}
        onDone={onDone}
        onSceneKey={onSceneKey}
        gear={<Gear />}
      />
    </main>
  );
}
