// Adapted from math-soccer src/i18n/de.ts: the structure is kept, the texts are Mathe-Flieger's.
/**
 * German translation table. Source of truth for message keys: another language adds a file of type `Messages` with
 * the same shape. Texts follow contracts/screens.md, spec.md and the help sentences of research R15. Child-facing
 * sections (see CHILD_SECTIONS in index.ts) never contain a word from `forbiddenWords` (FR-041), and outside the
 * help sentences no child text is longer than 8 words (FR-040).
 */

/** The 5 levels of each mode (FR-028). */
type LevelNames = Record<1 | 2 | 3 | 4 | 5, string>;

/** "1 Stern" or "n Sterne". */
function starCount(n: number): string {
  return n === 1 ? '1 Stern' : `${n} Sterne`;
}

/** "1 Aufgabe" or "n Aufgaben". */
function taskCount(n: number): string {
  return n === 1 ? '1 Aufgabe' : `${n} Aufgaben`;
}

/** "1 Bombe" or "n Bomben". */
function bombCount(n: number): string {
  return n === 1 ? '1 Bombe' : `${n} Bomben`;
}

/** Minutes and seconds, "5:40". */
function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const s = total % 60;
  return `${Math.floor(total / 60)}:${s < 10 ? '0' : ''}${s}`;
}

/** The sides of a building, as the child reads them in a sentence: "von rechts" (prototype `VIEWS`). */
const fromSide = { vorn: 'von vorn', oben: 'von oben', rechts: 'von rechts', links: 'von links' } as const;

export const de = {
  appName: 'Mathe-Flieger',

  /** Start screen (contracts/screens.md "Start"). */
  start: {
    treffer: 'Treffer',
    bauenMalen: 'Bauen und Malen',
    hangar: 'Hangar',
    stars: (n: number) => `★ ${n}`,
    starsLabel: starCount,
    fullscreen: 'Vollbild',
    gear: 'Für Eltern',
    parentHint: 'Für Eltern: Zahnrad gedrückt halten',
    /** Spoken once on the start tap, so tablet browsers allow speech later. */
    greeting: "Los geht's!",
    /** A mode whose every allowed task kind is off (`data-mode-state="empty"`). */
    modeEmpty: 'Hier ist gerade alles ausgeschaltet.',
    /** Closes a notice on the start screen. */
    dismiss: 'OK',
  },

  /** Round overlay (contracts/screens.md "Round"). */
  round: {
    help: 'Hilfe',
    done: 'Fertig',
    pause: 'Pause',
    paused: 'Pause. Weiter mit Enter.',
    resume: 'Weiter',
    /** The home button and the pause screen's way back to the start screen. */
    home: 'Zum Start',
    /** The question after the home button (FR-038). */
    quitAsk: 'Runde beenden?',
    fullscreen: 'Vollbild',
    gear: 'Für Eltern',
    hangar: 'Hangar',
    /** The bomb bay in "Treffer" (FR-015). */
    bombsLeft: (n: number) => `${bombCount(n)} übrig`,
    /** The task counter in "Bauen und Malen": "Aufgabe 2 von 5". */
    taskOf: (n: number, total: number) => `Aufgabe ${n} von ${total}`,
    speaker: 'Vorlesen',
    numberPad: { label: 'Zahlenfeld', delete: 'Löschen' },
    /** The color row of "Male an" (`data-testid="palette"`). */
    palette: 'Farben',
    /** The eye beside the building in "Malen" (FR-022). */
    standHere: 'Hier stehst du',
    flyHere: 'Hier fliegst du',
    /** Marks under the paint grid and on plans (FR-005, FR-022). */
    bottom: 'unten',
    front: 'vorn',
    /** The card with the finished building in "Bauen" (FR-021). */
    target: 'So soll es aussehen',
    /** The card with the plan of the building hit in "Bauplan finden" (FR-018). */
    hitCard: 'Getroffen',
    /** The card with the plan to find in "Bauplan finden" (prototype `card(..., 'Bauplan')`). */
    planCard: 'Bauplan',
    /** The card with the paint grid in "Malen" and "Male an" (prototype `drawMalen`): "Ansicht von rechts". */
    viewCard: (side: keyof typeof fromSide) => `Ansicht ${fromSide[side]}`,
    /** The name of a color in the color row of "Male an", for screen readers. */
    colorNames: { '#e0413a': 'Rot', '#2f7fd1': 'Blau', '#f2c230': 'Gelb', '#3fa34d': 'Grün', '#ef7d22': 'Orange' } as Readonly<Record<string, string>>,
  },

  /** Names of solids and flat shapes (prototype `SOLIDS` and `SHAPES`): with the accusative and nominative article. */
  names: {
    solids: {
      wuerfel: { acc: 'den Würfel', nom: 'der Würfel' },
      quader: { acc: 'den Quader', nom: 'der Quader' },
      zylinder: { acc: 'den Zylinder', nom: 'der Zylinder' },
      kugel: { acc: 'die Kugel', nom: 'die Kugel' },
      pyramide: { acc: 'die Pyramide', nom: 'die Pyramide' },
    },
    shapes: {
      kreis: { acc: 'den Kreis', nom: 'der Kreis' },
      dreieck: { acc: 'das Dreieck', nom: 'das Dreieck' },
      quadrat: { acc: 'das Quadrat', nom: 'das Quadrat' },
      rechteck: { acc: 'das Rechteck', nom: 'das Rechteck' },
    },
    /** The side alone, as on the progress page and the eye: "rechts". */
    sides: { vorn: 'vorn', oben: 'oben', rechts: 'rechts', links: 'links' },
    fromSide,
  },

  /** The banner of each task kind (contracts/screens.md, prototype `banner`). */
  tasks: {
    /** "Triff den Zylinder!" for Körper finden and Formen finden; takes the accusative name. */
    hitThe: (acc: string) => `Triff ${acc}!`,
    bauplanFinden: 'Triff das Gebäude zu diesem Bauplan!',
    ansichtFinden: (side: keyof typeof fromSide) => `Welche Ansicht siehst du ${fromSide[side]}?`,
    bauen: 'Baue das Gebäude nach. Schreib den Bauplan!',
    malen: (side: keyof typeof fromSide) => `Male das Gebäude ${fromSide[side]}.`,
    maleAn: (side: keyof typeof fromSide) => `Male die Ansicht ${fromSide[side]} an.`,
  },

  /** The task kinds, as the progress page and the settings name them (FR-028). */
  kinds: {
    koerper: 'Körper finden',
    formen: 'Formen finden',
    bauplanFinden: 'Bauplan finden',
    ansichtFinden: 'Ansicht finden',
    bauen: 'Bauen',
    malen: 'Malen',
    maleAn: 'Male an',
  },

  /** Feedback lines (contracts/screens.md "Feedback contract"). */
  feedback: {
    /** A hit; the round picks one of these. */
    hit: ['Treffer!', 'Volltreffer!', 'Super gezielt!'],
    /** A miss names what was hit: "Das ist die Kugel." Takes the nominative name. */
    missNamed: (nom: string) => `Das ist ${nom}.`,
    /** A view card that shows another side: "Das ist die Ansicht von links." */
    missView: (side: keyof typeof fromSide) => `Das ist die Ansicht ${fromSide[side]}.`,
    /** A view card that shows no side of the building (mirrored or changed). */
    missViewOther: 'Das ist eine andere Ansicht.',
    /** A building with another plan; the "Getroffen" card shows its plan. */
    missPlan: 'Dieses Gebäude hat einen anderen Bauplan.',
    /** After a miss, the plane comes back. */
    nextPass: 'Noch ein Anflug!',
    built: 'Super gebaut!',
    viewRight: (side: keyof typeof fromSide) => `Genau so sieht es ${fromSide[side]} aus!`,
    painted: 'Schön angemalt!',
    /** A wrong "Fertig": the marked places need another look. */
    almost: 'Fast! Schau dir die markierten Stellen an.',
    /** A task that raised the level (FR-030). */
    levelUp: (name: string) => `Neue Stufe: ${name}!`,
  },

  /** The levels of each mode (FR-028), easiest first. */
  levels: {
    names: {
      treffer: { 1: 'Körper', 2: 'Formen', 3: 'Baupläne finden', 4: 'Ansichten vorn und oben', 5: 'Alle Seiten' } satisfies LevelNames,
      bauenMalen: { 1: 'Kleine Baupläne', 2: 'Große Baupläne', 3: 'Vorn und oben', 4: 'Rechts und links', 5: 'Male an' } satisfies LevelNames,
    },
    /** "Stufe 2: Formen". */
    label: (level: number, name: string) => `Stufe ${level}: ${name}`,
  },

  /**
   * Help sentences (research R15, FR-033). Step 1 is a hint in words, step 2 a pointer, step 3 the answer. These are
   * the only child texts allowed to be longer than 8 words.
   */
  help: {
    /** Step 1 for Körper finden, per solid (prototype `SOLIDS`). */
    solids: {
      wuerfel: 'Der Würfel hat 6 gleich große Quadrate als Flächen.',
      quader: 'Der Quader ist lang wie ein Ziegelstein.',
      zylinder: 'Der Zylinder ist rund wie eine Dose. Oben hat er einen Kreis.',
      kugel: 'Die Kugel ist ganz rund wie ein Ball.',
      pyramide: 'Die Pyramide hat oben eine Spitze und Dreiecke an den Seiten.',
    },
    /** Step 1 for Formen finden, per shape (prototype `SHAPES`). */
    shapes: {
      kreis: 'Der Kreis ist rund und hat keine Ecken.',
      dreieck: 'Das Dreieck hat 3 Ecken und 3 Seiten.',
      quadrat: 'Das Quadrat hat 4 gleich lange Seiten.',
      rechteck: 'Das Rechteck hat 2 lange und 2 kurze Seiten.',
    },
    /** Step 1 for Bauplan finden. */
    bauplanFinden: 'Such im Bauplan die größte Zahl. Dort steht der höchste Turm.',
    /** Step 1 for Bauen. */
    bauen: 'Zähle in jedem Turm die Würfel von unten nach oben. Vorn ist im Bauplan unten.',
    /** Step 1 for Ansicht finden, Malen and Male an, per side asked (prototype `hints`). */
    sides: {
      vorn: 'Stell dir vor, du stehst vorn. In jeder Spalte siehst du nur den höchsten Turm.',
      oben: 'Du fliegst darüber. Jeder Turm ist von oben ein Quadrat, egal wie hoch.',
      rechts: 'Geh in Gedanken nach rechts. Vorn ist jetzt links von dir.',
      links: 'Geh in Gedanken nach links. Vorn ist jetzt rechts von dir.',
    },
    /** Step 1 for Male an, added to the side sentence. */
    maleAn: 'Jedes Teil hat seine eigene Farbe. Schau auf das Gebäude.',
    /** Step 2: the right target blinks ("Treffer"). */
    pointerBlink: 'Schau, wo es blinkt.',
    /** Step 2 in Bauen: one wrong plan square shows its number. */
    pointerCubes: (n: number) => (n === 1 ? 'Hier steht 1 Würfel.' : `Hier stehen ${n} Würfel.`),
    /** Step 2 in Malen: the view appears faintly in the grid. */
    pointerView: 'So sieht es aus. Male es nach.',
    /** Step 2 in Male an: the right color shows on one outline. */
    pointerColor: 'Hier siehst du eine Farbe. Male weiter.',
    /** Step 3: the answer is shown, and the child places it. */
    answerTarget: 'Der Pfeil zeigt auf die Antwort.',
    answerPlan: 'Hier ist der ganze Bauplan.',
    answerView: 'Hier ist die ganze Ansicht. Male sie nach.',
    answerColors: 'Hier sind alle Farben. Male sie an.',
  },

  /** Round end (contracts/screens.md "Round end", FR-037). Never "verloren". */
  roundEnd: {
    /** "8 Treffer mit 10 Bomben". */
    hitsSummary: (hits: number, bombs: number) => `${hits} Treffer mit ${bombCount(bombs)}`,
    /** "5 Aufgaben geschafft". */
    tasksSummary: (n: number) => `${taskCount(n)} geschafft`,
    /** Encouraging lines; the round end picks one. */
    cheer: ['Super geflogen!', 'Toll gemacht!', 'Du wirst immer besser!'],
    newRecord: 'Neuer Rekord!',
    record: (n: number) => `Dein Rekord: ${n}`,
    /** The time of the round when "Uhr zeigen" is on. */
    time: (ms: number) => `Zeit: ${clock(ms)}`,
    stars: (n: number) => `+${starCount(n)}`,
    /** A new version waits. */
    updateWaiting: 'Neue Version, startet gleich',
    again: 'Nochmal',
    back: 'Zurück',
  },

  /** The Hangar (contracts/screens.md "Hangar", FR-045). Item names come with the item list. */
  hangar: {
    title: 'Hangar',
    groups: { color: 'Farbe', tail: 'Heckbild', smoke: 'Rauch', bomb: 'Bomben', hat: 'Mütze' },
    stillNeeded: (n: number) => `noch ${starCount(n)}`,
    buy: (price: number) => `Kaufen für ${starCount(price)}`,
    choose: 'Nehmen',
    chosen: 'Gewählt',
    back: 'Zurück',
  },

  /** Notices on the start screen about stored data (FR-052). Written for the parent, so they may be longer. */
  storage: {
    reset: {
      invalid:
        'Gespeicherte Daten waren beschädigt und wurden zurückgesetzt. Eine Kopie ist aufbewahrt: Eltern holen sie in den Einstellungen mit „Kopie wiederherstellen“ zurück.',
      newer: 'Gespeicherte Daten stammen von einer neueren Version. Sie bleiben als Kopie im Browser und werden hier nicht verwendet.',
      unavailable: 'Der Browser kann gerade nichts speichern.',
    },
    /** Names the kinds of data a reset note is about. */
    kinds: (names: string) => `Betrifft: ${names}.`,
    /** Saving stars, progress or bests failed during play (`data-testid="start-notice-save"`). */
    saveFailed: 'Speichern klappt gerade nicht. Neue Sterne und Fortschritte gelten nur, bis der Browser geschlossen wird.',
  },

  /** Parent gate menu (contracts/screens.md "Parent gate"). */
  parent: {
    title: 'Für Eltern',
    settings: 'Einstellungen',
    progress: 'Fortschritt',
    back: 'Zurück',
    close: 'Schließen',
    /** A kept copy of data that an earlier version could not read, and this version can. */
    backupFound: (names: string) =>
      `Im Browser liegt eine Kopie älterer Daten (${names}). Wiederherstellen ersetzt die aktuellen Daten durch diese Kopie.`,
    restoreBackup: 'Kopie wiederherstellen',
    restoreFailed: 'Die Kopie konnte nicht gespeichert werden. Es wurde nichts geändert.',
    savePartial: 'Ein Teil wurde gespeichert, der Rest nicht. Bitte die Daten prüfen oder eine Sicherung laden.',
    /** The kinds of stored data (research R11), for the notice on the settings page. */
    dataNames: { settings: 'Einstellungen', progress: 'Fortschritt', records: 'Rekorde', hangar: 'Sterne und Hangar', round: 'Laufende Runde' },
    holdHint: 'Zahnrad 2 Sekunden gedrückt halten',
  },

  /** Settings page (contracts/screens.md "Settings"; FR-051; data-model "Settings"). */
  settings: {
    title: 'Einstellungen',
    save: 'Speichern',
    saved: 'Gespeichert. Die Einstellungen gelten ab der nächsten Aufgabe.',
    saveFailed: 'Speichern hat nicht geklappt. Die Einstellungen gelten nur, bis der Browser geschlossen wird.',
    checkFields: 'Bitte die markierten Felder prüfen.',
    version: (version: string, date: string) => `Version ${version} vom ${date}`,
    groups: {
      levels: 'Stufen',
      topics: 'Themen',
      buildings: 'Gebäude',
      round: 'Runde',
      sound: 'Ton',
      controls: 'Bedienung',
      hangar: 'Hangar',
      data: 'Daten',
    },
    labels: {
      startLevel: 'Stufe am Anfang',
      hardestLevel: 'Schwerste Stufe',
      adaptive: 'Passt sich dem Kind an',
      maxPlan: 'Größter Bauplan',
      maxStack: 'Höchster Turm',
      sides: 'Seiten',
      roundPieces: 'Zylinder und Kugeln in Gebäuden',
      bombs: 'Bomben pro Runde',
      tasks: 'Aufgaben pro Runde',
      soundEffects: 'Geräusche',
      soundSpeech: 'Vorlesen',
      numberPad: 'Zahlenfeld',
      showClock: 'Uhr zeigen',
      showRecords: 'Rekorde zeigen',
      pointAfterFullHelp: 'Punkt nach voller Hilfe',
      hangar: 'Hangar und Sterne',
    },
    options: {
      maxPlan: { 2: '2 × 2', 3: '3 × 3' },
      numberPad: { auto: 'automatisch', always: 'immer', never: 'nie' },
    },
    data: {
      export: 'Daten sichern',
      import: 'Daten laden',
      qr: 'QR-Code',
      exportHint: 'Speichert Einstellungen, Fortschritt, Rekorde, Sterne und Hangar in einer Datei.',
      imported: 'Daten geladen. Die Einstellungen gelten ab der nächsten Aufgabe.',
      importFailed: {
        notJson: 'Diese Datei ist keine Sicherung von Mathe-Flieger.',
        wrongApp: 'Diese Datei ist keine Sicherung von Mathe-Flieger.',
        invalidSettings: 'Die Einstellungen in dieser Datei sind ungültig. Es wurde nichts geändert.',
        invalidProgress: 'Der Fortschritt in dieser Datei ist ungültig. Es wurde nichts geändert.',
        invalidRecords: 'Die Rekorde in dieser Datei sind ungültig. Es wurde nichts geändert.',
        invalidHangar: 'Die Sterne in dieser Datei sind ungültig. Es wurde nichts geändert.',
        storeFailed: 'Der Browser konnte die Daten nicht speichern. Es wurde nichts geändert.',
        storePartial: 'Ein Teil wurde gespeichert, der Rest nicht. Bitte die Daten prüfen oder eine Sicherung laden.',
      },
      readFailed: 'Die Datei konnte nicht gelesen werden.',
      exportFailed: 'Die Sicherung konnte nicht heruntergeladen werden.',
    },
  },

  /** Messages for settings that break a rule (data-model "Settings" cross-field rules). */
  settingsErrors: {
    notInteger: 'Bitte ganze Zahlen eingeben.',
    levelOrder: 'Die Stufe am Anfang darf nicht schwerer sein als die schwerste Stufe.',
    noSide: 'Mindestens eine Seite muss an sein.',
    bombs: 'Eine Runde hat 5 bis 20 Bomben.',
    tasks: 'Eine Runde hat 3 bis 10 Aufgaben.',
  },

  /** Progress page (contracts/screens.md "Progress", FR-048). */
  progressPage: {
    title: 'Fortschritt',
    modes: { treffer: 'Treffer', bauenMalen: 'Bauen und Malen' },
    columns: {
      level: 'Stufe',
      kind: 'Aufgabe',
      side: 'Seite',
      attempts: 'Versuche',
      alone: 'allein',
      withHelp: 'mit Hilfe',
      mastered: 'gemeistert',
    },
    masteredYes: 'ja',
    masteredNo: 'noch nicht',
    /** The current level of a mode. */
    currentLevel: (label: string) => `Stufe jetzt: ${label}`,
    bests: 'Rekorde',
    bestHits: (hits: number, bombs: number) => `${hits} Treffer mit ${bombCount(bombs)}`,
    bestTasks: (n: number, total: number) => `${n} von ${taskCount(total)} allein`,
    noBests: 'Noch keine Rekorde.',
    empty: 'Noch keine Versuche.',
    reset: 'Fortschritt zurücksetzen',
    resetConfirm: 'Fortschritt wirklich zurücksetzen? Die Sterne bleiben.',
    resetYes: 'Ja, zurücksetzen',
    resetNo: 'Abbrechen',
    resetDone: 'Fortschritt zurückgesetzt. Die Sterne sind geblieben.',
    resetFailed: 'Zurücksetzen hat nicht geklappt.',
    /** Clears progress, personal bests, stars and the Hangar; the settings stay. */
    resetAll: 'Alles zurücksetzen',
    resetAllConfirm:
      'Fortschritt, Rekorde, Sterne und Hangar löschen? Die Einstellungen bleiben. Wer den Spielstand behalten will, sichert ihn vorher in den Einstellungen.',
    resetAllYes: 'Ja, alles löschen',
    resetAllDone: 'Alles wurde zurückgesetzt.',
    resetAllFailed: 'Zurücksetzen hat nicht geklappt. Es wurde nichts geändert.',
    resetAllPartial: 'Ein Teil wurde gespeichert, der Rest nicht. Bitte die Daten prüfen oder eine Sicherung laden.',
    close: 'Schließen',
  },

  /** Transfer dialog, as math-soccer (contracts/screens.md "Transfer dialog"). */
  transfer: {
    title: 'Spielstand übertragen',
    hint: 'Mit der Kamera des anderen Geräts scannen oder den Link dort öffnen.',
    qrLabel: 'QR-Code mit dem Spielstand',
    copy: 'Link kopieren',
    copied: 'Link kopiert.',
    copyFailed: 'Kopieren hat nicht geklappt. Bitte diesen Link kopieren:',
    tooLarge: 'Der Spielstand ist zu groß für einen QR-Code. Bitte den Link kopieren.',
    trimmed: 'Der Spielstand wurde für den QR-Code gekürzt: die ältesten Versuche fehlen.',
    buildFailed: 'Der Link konnte nicht erstellt werden.',
    summary: (stars: number, treffer: number, bauenMalen: number) => `${starCount(stars)}, Stufe ${treffer} und ${bauenMalen}`,
    holdHint: '„Übernehmen“ 2 Sekunden gedrückt halten.',
    saveFailed: 'Speichern hat nicht geklappt. Es wurde nichts geändert.',
    savePartial: 'Ein Teil wurde gespeichert, der Rest nicht. Bitte die Daten prüfen oder eine Sicherung laden.',
    receiveTitle: 'Spielstand übernehmen?',
    receiveHint: 'Der Spielstand aus dem Link ersetzt den Spielstand in diesem Browser.',
    accept: 'Übernehmen',
    decline: 'Abbrechen',
    invalid: 'Dieser Link enthält keinen gültigen Spielstand.',
    close: 'Schließen',
  },
};
