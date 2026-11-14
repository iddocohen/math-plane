/**
 * One round of either mode (data-model.md "Round", contracts/core-api.md, research R2, R9, R18). The controller owns
 * the round state and decides every outcome; views only animate and call the methods below. Mode-specific steps go
 * through the rules object (core/round/rules.ts).
 *
 * Phases:
 * - `aim`: the child answers. In "Treffer" a tap on a slot drops a bomb (`pass`); in "Bauen und Malen" inputs change
 *   the task state and "Fertig" checks it.
 * - `pass`: the bomb falls; taps are ignored (FR-008). The view calls `landBomb()` when the bomb lands. If it has not
 *   after `PASS_MS + FALLBACK_MS` of play time, `tick()` lands it (R18).
 * - `feedback`: after a miss; `next()` goes back to `aim`, or ends the round after the last bomb.
 * - `check`: after a wrong "Fertig", with the marks shown; the next input or "Fertig" goes on.
 * - `celebrate`: the task is solved; `next()` starts the next task or ends the round.
 * - `paused`: `resume()` returns to the phase before. `ended`: the round is over.
 *
 * Help (FR-033, FR-034): `help()` opens the next step; after `AUTO_HELP_AFTER` misses each further miss opens the next
 * step by itself. A task is solved alone only when the first try was right with no help (FR-035).
 *
 * Time: play time runs only while the round is neither paused nor ended and the page is visible (`setHidden`).
 * `now()` is injected and must count milliseconds; the attempt's `at` is `new Date(now())`.
 *
 * Settings (FR-054): `applySettings` takes new settings at once; settings that shape tasks apply from the next task,
 * and the round keeps its number of bombs or tasks.
 *
 * Storage: `toStored()` is the round to save after each event (null once it ended); a controller made with a stored
 * round that still fits the settings continues it (`restored`).
 */
import { levelRaised, recordAttempt } from '../progress/adaptive';
import { outcomeOf } from '../progress/outcome';
import { recordKey, submitResult } from '../records/records';
import { starsFor } from '../rewards/hangar';
import { createRng, deriveSeed, type Rng } from '../rng';
import type { Settings } from '../settings/schema';
import { emptyRecords, type AttemptRecord, type Progress, type Records, type StoredRound } from '../storage/schemas';
import { currentLevel, levelDef, levelRange, pickContent, type Content } from '../tasks/levels';
import type { Level, Mode, TaskKind } from '../types';
import type { BauenMalenInput, CratesChanged, ModeRules, TaskBase } from './rules';

export type Phase = 'aim' | 'pass' | 'feedback' | 'check' | 'celebrate' | 'paused' | 'ended';

/** How long a pass takes across the scene (research R9). */
export const PASS_MS = 2400;
/** Extra play time before the controller lands a bomb the view did not land (research R18). */
export const FALLBACK_MS = 1000;
/** Help step 1 opens by itself after this many misses on one task (FR-034). */
export const AUTO_HELP_AFTER = 2;
export const MAX_HELP_STEP = 3;

/** The bomb of the current pass, or of the last landing. */
export interface BombResult {
  slot: number;
  choice: number;
  hit: boolean;
}

export interface RoundState<T extends TaskBase = TaskBase, S = unknown> {
  mode: Mode;
  phase: Phase;
  /** The phase to return to after a pause. */
  pausedFrom: Phase | null;
  hidden: boolean;
  bombsTotal: number;
  bombsLeft: number;
  hits: number;
  tasksTotal: number;
  tasksDone: number;
  solvedAlone: number;
  /** Stars earned in this round. */
  stars: number;
  /** The mode's current level. */
  level: Level;
  task: T;
  taskState: S;
  /** How many tasks the round has started, counting the current one. */
  taskIndex: number;
  misses: number;
  helpStep: number;
  /** Marks after a wrong "Fertig" (FR-009), ids from the rules. */
  marked: string[];
  /** The bomb in the air during `pass`, else the last bomb that landed on this task. */
  lastBomb: BombResult | null;
  elapsedMs: number;
}

export interface RoundSummary {
  mode: Mode;
  /** True when the child left the round; bests are then not compared. */
  quit: boolean;
  hits: number;
  bombsTotal: number;
  tasksDone: number;
  tasksTotal: number;
  solvedAlone: number;
  stars: number;
  elapsedMs: number;
  newRecord: boolean;
  /** The best for this mode and round length after the round, or null when there is none. */
  best: number | null;
  /** The records after the round, to save. */
  records: Records;
}

export type RoundEvent<T extends TaskBase = TaskBase> =
  | { type: 'taskStarted'; task: T }
  | { type: 'phaseChanged'; phase: Phase }
  | { type: 'passStarted'; slot: number }
  | { type: 'bombLanded'; hit: boolean; slot: number; choice: number }
  | { type: 'slotsShuffled'; slots: number[] }
  | CratesChanged
  | { type: 'checked'; right: boolean; marked: string[] }
  | { type: 'helpOpened'; step: number; auto: boolean }
  | { type: 'attemptRecorded'; record: AttemptRecord; progress: Progress }
  | { type: 'levelUp'; level: Level; name: string }
  | { type: 'starsAwarded'; n: number }
  | { type: 'roundEnded'; summary: RoundSummary };

export interface RoundOptions<T extends TaskBase, S> {
  rules: ModeRules<T, S>;
  settings: Settings;
  progress: Progress;
  records?: Records;
  seed: number;
  /** Milliseconds; defaults to `Date.now`. */
  now?: () => number;
  /** A saved round to continue; ignored when it no longer fits the mode or the settings. */
  stored?: StoredRound | null;
}

/** Where a task's random numbers come from: the content pick, the task itself, and the reshuffle after each miss. */
const STREAM = { content: 0, task: 1, miss: 2 } as const;

export class RoundController<T extends TaskBase = TaskBase, S = unknown> {
  readonly mode: Mode;
  /** True when the controller continues a stored round. */
  readonly restored: boolean;
  private readonly rules: ModeRules<T, S>;
  private readonly seed: number;
  private readonly now: () => number;
  private settings: Settings;
  private progress: Progress;
  private records: Records;
  private readonly listeners = new Set<(e: RoundEvent<T>) => void>();

  private phase: Phase = 'aim';
  private pausedFrom: Phase | null = null;
  private hidden = false;
  private bombsTotal = 0;
  private bombsLeft = 0;
  private hits = 0;
  private tasksTotal = 0;
  private tasksDone = 0;
  private solvedAlone = 0;
  private stars = 0;
  private taskIndex = 0;
  private previousKind: TaskKind | null = null;
  private content!: Content;
  private task!: T;
  private taskState!: S;
  private solved = false;
  private misses = 0;
  private helpStep = 0;
  private marked: string[] = [];
  private lastBomb: BombResult | null = null;
  /** Play time at which the fallback lands the bomb in the air. */
  private passDeadline = 0;
  private taskStartMs = 0;
  private elapsedBefore = 0;
  private runningSince: number | null = null;

  constructor(opts: RoundOptions<T, S>) {
    this.rules = opts.rules;
    this.mode = opts.rules.mode;
    this.settings = opts.settings;
    this.progress = opts.progress;
    this.records = opts.records ?? emptyRecords();
    this.seed = opts.seed;
    this.now = opts.now ?? Date.now;
    this.restored = opts.stored ? this.restore(opts.stored) : false;
    if (!this.restored) this.startFresh();
  }

  // ---- reading -------------------------------------------------------------------------------------------------

  state(): RoundState<T, S> {
    return {
      mode: this.mode,
      phase: this.phase,
      pausedFrom: this.pausedFrom,
      hidden: this.hidden,
      bombsTotal: this.bombsTotal,
      bombsLeft: this.bombsLeft,
      hits: this.hits,
      tasksTotal: this.tasksTotal,
      tasksDone: this.tasksDone,
      solvedAlone: this.solvedAlone,
      stars: this.stars,
      level: this.level(),
      task: this.task,
      taskState: this.taskState,
      taskIndex: this.taskIndex,
      misses: this.misses,
      helpStep: this.helpStep,
      marked: [...this.marked],
      lastBomb: this.lastBomb,
      elapsedMs: this.elapsed(),
    };
  }

  subscribe(fn: (e: RoundEvent<T>) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** The round to save, or null once it ended. */
  toStored(): StoredRound | null {
    if (this.phase === 'ended') return null;
    return {
      version: 1,
      mode: this.mode,
      seed: this.seed,
      level: this.level(),
      elapsedMs: this.elapsed(),
      bombsTotal: this.bombsTotal,
      bombsLeft: this.bombsLeft,
      hits: this.hits,
      tasksTotal: this.tasksTotal,
      tasksDone: this.tasksDone,
      solvedAlone: this.solvedAlone,
      stars: this.stars,
      taskIndex: this.taskIndex,
      previousKind: this.previousKind,
      content: structuredClone(this.content),
      solved: this.solved,
      misses: this.misses,
      helpStep: this.helpStep,
      taskStartMs: this.taskStartMs,
      marked: [...this.marked],
      ruleState: structuredClone(this.taskState),
    };
  }

  // ---- "Treffer" -----------------------------------------------------------------------------------------------

  /** Drops a bomb on `slot`; ignored outside `aim`, in "Bauen und Malen", and on a slot without a choice. */
  tapChoice(slot: number): void {
    const rules = this.rules;
    if (rules.mode !== 'treffer' || this.phase !== 'aim' || this.bombsLeft <= 0) return;
    const choice = rules.choiceAt(this.task, this.taskState, slot);
    if (choice === null) return;
    this.lastBomb = { slot, choice, hit: rules.isHit(this.task, choice) };
    this.passDeadline = this.elapsed() + PASS_MS + FALLBACK_MS;
    this.setPhase('pass');
    this.emit({ type: 'passStarted', slot });
  }

  /** The view calls it when the bomb lands; the result was decided at the tap. */
  landBomb(): void {
    const rules = this.rules;
    const bomb = this.lastBomb;
    if (rules.mode !== 'treffer' || this.phase !== 'pass' || bomb === null) return;
    this.bombsLeft -= 1;
    this.emit({ type: 'bombLanded', hit: bomb.hit, slot: bomb.slot, choice: bomb.choice });
    if (bomb.hit) {
      this.solveTask();
      this.setPhase('celebrate');
      return;
    }
    this.misses += 1;
    this.taskState = rules.afterMiss(this.task, this.taskState, bomb.choice, this.rng(STREAM.miss, this.misses));
    this.emit({ type: 'slotsShuffled', slots: rules.slots(this.taskState) });
    this.autoHelp();
    this.setPhase('feedback');
  }

  /** Call regularly (each frame or a timer): lands a bomb the view did not land in time (research R18). */
  tick(): void {
    if (this.phase === 'pass' && this.elapsed() >= this.passDeadline) this.landBomb();
  }

  // ---- "Bauen und Malen" ---------------------------------------------------------------------------------------

  typeHeight(row: number, col: number, height: number): void {
    this.input({ type: 'typeHeight', row, col, height });
  }

  clearHeight(row: number, col: number): void {
    this.input({ type: 'clearHeight', row, col });
  }

  togglePaint(row: number, col: number): void {
    this.input({ type: 'togglePaint', row, col });
  }

  pickColor(color: string): void {
    this.input({ type: 'pickColor', color });
  }

  fillRegion(index: number): void {
    this.input({ type: 'fillRegion', index });
  }

  /** "Fertig": checks the task (FR-009). Wrong marks the cells or regions and counts a miss. */
  done(): void {
    const rules = this.rules;
    if (rules.mode !== 'bauenMalen' || (this.phase !== 'aim' && this.phase !== 'check')) return;
    const { right, marked } = rules.check(this.task, this.taskState);
    this.emit({ type: 'checked', right, marked: [...marked] });
    if (right) {
      this.marked = [];
      this.solveTask();
      this.setPhase('celebrate');
      return;
    }
    this.misses += 1;
    this.marked = [...marked];
    this.autoHelp();
    this.setPhase('check');
  }

  // ---- both modes ----------------------------------------------------------------------------------------------

  /** Opens the next help step (FR-033); help never costs stars or bombs. */
  help(): void {
    if (this.phase !== 'aim' && this.phase !== 'check' && this.phase !== 'feedback') return;
    if (this.helpStep >= MAX_HELP_STEP) return;
    this.helpStep += 1;
    this.emit({ type: 'helpOpened', step: this.helpStep, auto: false });
  }

  /** After `feedback` back to `aim`; after `celebrate` the next task. Either ends the round when it is over. */
  next(): void {
    if (this.phase === 'feedback') {
      if (this.over()) this.end(false);
      else this.setPhase('aim');
    } else if (this.phase === 'celebrate') {
      if (this.over()) this.end(false);
      else this.startTask();
    }
  }

  pause(): void {
    if (this.phase === 'paused' || this.phase === 'ended') return;
    this.pausedFrom = this.phase;
    this.setPhase('paused');
  }

  resume(): void {
    if (this.phase !== 'paused' || this.pausedFrom === null) return;
    const back = this.pausedFrom;
    this.pausedFrom = null;
    this.setPhase(back);
  }

  /** The page was hidden or shown again; play time stops while it is hidden. */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.syncClock();
  }

  /** Leaves the round ("Zum Start"); no bests are compared. */
  quit(): void {
    if (this.phase === 'ended') return;
    this.end(true);
  }

  /** New settings (FR-054): task-shaping settings apply from the next task; the round keeps its length. */
  applySettings(s: Settings): void {
    this.settings = s;
  }

  // ---- inside --------------------------------------------------------------------------------------------------

  private level(): Level {
    return currentLevel(this.mode, this.progress.levels[this.mode], this.settings);
  }

  private elapsed(): number {
    return this.elapsedBefore + (this.runningSince === null ? 0 : this.now() - this.runningSince);
  }

  /** Starts or stops play time to match the phase and the page. */
  private syncClock(): void {
    const run = this.phase !== 'paused' && this.phase !== 'ended' && !this.hidden;
    if (run && this.runningSince === null) this.runningSince = this.now();
    else if (!run && this.runningSince !== null) {
      this.elapsedBefore += this.now() - this.runningSince;
      this.runningSince = null;
    }
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.syncClock();
    this.emit({ type: 'phaseChanged', phase });
  }

  private emit(e: RoundEvent<T>): void {
    for (const fn of [...this.listeners]) fn(e);
  }

  private rng(stream: number, extra = 0): Rng {
    return createRng(deriveSeed(this.seed, this.taskIndex, stream, extra));
  }

  private over(): boolean {
    return this.mode === 'treffer' ? this.bombsLeft <= 0 : this.tasksDone >= this.tasksTotal;
  }

  private startFresh(): void {
    this.bombsTotal = this.mode === 'treffer' ? this.settings.round.bombs : 0;
    this.bombsLeft = this.bombsTotal;
    this.tasksTotal = this.mode === 'bauenMalen' ? this.settings.round.tasks : 0;
    this.syncClock();
    this.startTask();
  }

  private startTask(): void {
    this.taskIndex += 1;
    const content = pickContent(this.mode, this.level(), this.settings, this.rng(STREAM.content), this.previousKind);
    const rng = this.rng(STREAM.task);
    this.content = content;
    this.task = this.makeTask(content, rng);
    this.taskState = this.rules.createState(this.task, rng);
    this.solved = false;
    this.misses = 0;
    this.helpStep = 0;
    this.marked = [];
    this.lastBomb = null;
    this.taskStartMs = this.elapsed();
    this.setPhase('aim');
    this.emit({ type: 'taskStarted', task: this.task });
  }

  private makeTask(content: Content, rng: Rng): T {
    const seed = deriveSeed(this.seed, this.taskIndex, STREAM.task);
    return this.rules.createTask({ content, settings: this.settings, rng, id: `${this.seed}-${this.taskIndex}`, seed });
  }

  /** Continues `s` when it fits the mode and the settings; false leaves the controller untouched. */
  private restore(s: StoredRound): boolean {
    if (s.mode !== this.mode || s.taskIndex < 1) return false;
    if (!this.settings.kinds[s.content.kind] || !levelRange(this.mode, this.settings).includes(s.content.level)) return false;
    if (s.bombsLeft > s.bombsTotal || s.tasksDone > s.tasksTotal) return false;
    this.taskIndex = s.taskIndex;
    let task: T;
    let state: S;
    try {
      const rng = this.rng(STREAM.task);
      task = this.makeTask(s.content, rng);
      state = this.rules.restoreState(task, s.ruleState) ?? this.rules.createState(task, rng);
    } catch {
      this.taskIndex = 0;
      return false;
    }
    this.content = s.content;
    this.task = task;
    this.taskState = state;
    this.bombsTotal = s.bombsTotal;
    this.bombsLeft = s.bombsLeft;
    this.hits = s.hits;
    this.tasksTotal = s.tasksTotal;
    this.tasksDone = s.tasksDone;
    this.solvedAlone = s.solvedAlone;
    this.stars = s.stars;
    this.previousKind = s.previousKind;
    this.solved = s.solved;
    this.misses = s.misses;
    this.helpStep = s.helpStep;
    this.marked = [...s.marked];
    this.taskStartMs = Math.min(s.taskStartMs, s.elapsedMs);
    this.elapsedBefore = s.elapsedMs;
    // A bomb in the air was not counted yet, so the child taps again. After the last miss only the end is left.
    this.phase = s.solved ? 'celebrate' : this.mode === 'treffer' && s.bombsLeft === 0 ? 'feedback' : s.marked.length > 0 ? 'check' : 'aim';
    this.syncClock();
    return true;
  }

  /** Opens the next help step by itself once the task has `AUTO_HELP_AFTER` misses (FR-034). */
  private autoHelp(): void {
    if (this.misses < AUTO_HELP_AFTER || this.helpStep >= MAX_HELP_STEP) return;
    this.helpStep += 1;
    this.emit({ type: 'helpOpened', step: this.helpStep, auto: true });
  }

  /** Records the solved task, its stars and a raised level. */
  private solveTask(): void {
    const task = this.task;
    const outcome = outcomeOf(this.misses === 0, this.helpStep);
    const record: AttemptRecord = {
      mode: this.mode,
      kind: task.kind,
      level: task.level,
      ...(task.side ? { side: task.side } : {}),
      outcome,
      helpStep: this.helpStep,
      misses: this.misses,
      ms: Math.max(0, this.elapsed() - this.taskStartMs),
      at: new Date(this.now()).toISOString(),
    };
    const before = this.progress;
    this.progress = recordAttempt(before, record, this.settings);
    this.emit({ type: 'attemptRecorded', record, progress: this.progress });
    const up = levelRaised(before, this.progress, this.mode, this.settings);
    if (up !== null) this.emit({ type: 'levelUp', level: up, name: levelDef(this.mode, up).name });
    const n = starsFor(task.kind, outcome, this.helpStep, this.settings);
    if (n > 0) {
      this.stars += n;
      this.emit({ type: 'starsAwarded', n });
    }
    if (this.mode === 'treffer') this.hits += 1;
    else {
      this.tasksDone += 1;
      if (outcome === 'alone') this.solvedAlone += 1;
    }
    this.solved = true;
    this.previousKind = task.kind;
  }

  private input(i: BauenMalenInput): void {
    const rules = this.rules;
    if (rules.mode !== 'bauenMalen' || (this.phase !== 'aim' && this.phase !== 'check')) return;
    const r = rules.apply(this.task, this.taskState, i);
    if (r === null) return;
    this.taskState = r.state;
    if (r.unmark?.length) this.marked = this.marked.filter((m) => !r.unmark!.includes(m));
    for (const e of r.events ?? []) this.emit(e);
    if (this.phase === 'check') this.setPhase('aim');
  }

  private end(quit: boolean): void {
    const total = this.mode === 'treffer' ? this.bombsTotal : this.tasksTotal;
    const result = this.mode === 'treffer' ? this.hits : this.solvedAlone;
    const key = recordKey(this.mode, total);
    const submitted = quit ? { records: this.records, newRecord: false, best: this.records.best[key] ?? null } : submitResult(this.records, key, result);
    this.records = submitted.records;
    this.setPhase('ended');
    this.emit({
      type: 'roundEnded',
      summary: {
        mode: this.mode,
        quit,
        hits: this.hits,
        bombsTotal: this.bombsTotal,
        tasksDone: this.tasksDone,
        tasksTotal: this.tasksTotal,
        solvedAlone: this.solvedAlone,
        stars: this.stars,
        elapsedMs: this.elapsed(),
        newRecord: submitted.newRecord,
        best: submitted.best,
        records: submitted.records,
      },
    });
  }
}
