/**
 * The words the round overlay shows: the banner of a task (contracts/screens.md, prototype `banner`) and the message
 * line after an event (contracts/screens.md "Feedback contract"). Pure, so the texts have unit tests.
 *
 * The banner reads what the task carries: a target solid or shape (`target`) for "Körper finden" and "Formen finden",
 * the side for view tasks. A task without what its banner needs shows the kind's name. The message line names a hit,
 * what a missed bomb hit ("Das ist die Kugel.", core/tasks/check.ts), a right or almost right "Fertig" and a level up.
 */
import type { RoundEvent } from '../core/round/RoundController';
import type { TaskBase } from '../core/round/rules';
import { checkBomb } from '../core/tasks/check';
import { isTrefferTask } from '../core/tasks/types';
import { FLAT_SHAPES, SOLIDS, type FlatShape, type Solid } from '../core/types';
import { t } from '../i18n';

function targetOf(task: TaskBase): Solid | FlatShape | null {
  const target = (task as TaskBase & { target?: unknown }).target;
  return SOLIDS.includes(target as Solid) || FLAT_SHAPES.includes(target as FlatShape) ? (target as Solid | FlatShape) : null;
}

export function bannerText(task: TaskBase): string {
  const text = t();
  const side = task.side;
  switch (task.kind) {
    case 'koerper':
    case 'formen': {
      const target = targetOf(task);
      if (target === null) return text.kinds[task.kind];
      const name = task.kind === 'koerper' ? text.names.solids[target as Solid] : text.names.shapes[target as FlatShape];
      return text.tasks.hitThe(name.acc);
    }
    case 'bauplanFinden':
      return text.tasks.bauplanFinden;
    case 'bauen':
      return text.tasks.bauen;
    case 'ansichtFinden':
      return side ? text.tasks.ansichtFinden(side) : text.kinds.ansichtFinden;
    case 'malen':
      return side ? text.tasks.malen(side) : text.kinds.malen;
    case 'maleAn':
      return side ? text.tasks.maleAn(side) : text.kinds.maleAn;
  }
}

/**
 * The message line after `e` for `task`, or undefined when the event does not change it; null clears it. `pick`
 * chooses one of several lines (a random index below its argument).
 */
export function messageAfter(e: RoundEvent, task: TaskBase, pick: (n: number) => number = (n) => Math.floor(Math.random() * n)): string | null | undefined {
  const text = t().feedback;
  switch (e.type) {
    case 'taskStarted':
      return null;
    case 'bombLanded':
      if (e.hit) return text.hit[pick(text.hit.length)]!;
      return (isTrefferTask(task) && checkBomb(task, e.choice).named) || text.nextPass;
    case 'checked':
      if (!e.right) return text.almost;
      if (task.kind === 'bauen') return text.built;
      if (task.kind === 'malen' && task.side) return text.viewRight(task.side);
      return text.painted;
    case 'levelUp':
      return text.levelUp(e.name);
    default:
      return undefined;
  }
}
