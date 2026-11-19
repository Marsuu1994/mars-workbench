/**
 * Spec coverage as pure text checks, so it can be tested without touching
 * files: which items a spec v2 doc has (design/specs/README.md), which IDs
 * each test's title names, what's wrong between the two, and the list of
 * every item with the tests holding it. The command (`npm run check:spec`)
 * is scripts/checkSpec.ts.
 */

/** An item's ID: `<AREA>-n` (`COL-2`), or `A`, `R` or `J` and a number. */
const ID = String.raw`(?:[A-Z]+-\d+|[ARJ]\d+)`;

/** An item's marker, read only where it belongs: before the ID (`*(pending)* **BL-8**`). */
const MARKER = String.raw`\*\((pending|removing|bug)\)\*`;

/** A list item that starts with a bold ID, its marker before it: `- **COL-2** …`, `- *(pending)* **J5 A week's work - desktop** …`. */
const LIST_ITEM_ID = new RegExp(
  String.raw`^\s*-\s+(?:${MARKER}\s+)?\*\*(${ID})\b`,
);

/** A table row whose first cell is an ID, its marker before it: `| A4 | Pull to Todo | …`, `| *(pending)* A8 | …`. */
const TABLE_ROW_ID = new RegExp(
  String.raw`^\|\s*(?:${MARKER}\s+)?(${ID})\s*\|`,
);

/** The IDs at the start of a test's title: `CARD-2 R4 a Done card …`. */
const TITLE_IDS = new RegExp(String.raw`^(?:${ID}\s+)+`);

/**
 * A test call and its title: `it(`, `it.fails(`, `test(`, `test.step(`, …
 * The title is the first argument, a string literal in any quotes.
 */
const TEST_CALL =
  /\b(it|test)(?:\.(fails|skip|only|todo|step))?\s*\(\s*(['"`])((?:\\.|(?!\3)[^\\])*)\3/g;

/** A test file names the spec it holds: `// Spec: design/specs/board.md`. */
const SPEC_COMMENT = /^\/\/ Spec: (\S+)\s*$/gm;

/** A block comment, or a line that is only a comment: a test call in either holds nothing. */
const COMMENT = /\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm;

/** A skipped block: every test inside is off, whatever its own call says. */
const SKIPPED_DESCRIBE = /\bdescribe\.skip\b/;

export interface SpecItem {
  id: string;
  /** Designed but not built: no test may hold it yet */
  pending: boolean;
  /** Built, but the design drops it: its test holds it until it's deleted */
  removing: boolean;
  /** A known bug: an `it.fails` holds it */
  bug: boolean;
}

export interface TestTitle {
  title: string;
  ids: string[];
  /** An `it.fails`: it holds a `(bug)` item */
  fails: boolean;
}

export interface TestFile {
  path: string;
  source: string;
}

export interface Spec {
  path: string;
  markdown: string;
}

/** How wide the terminal list's ID column is: the longest ID (`CARD-7`) and a gap. */
const ID_COLUMN_WIDTH = 8;

/** A test holding an item. */
interface Holder {
  path: string;
  title: string;
  fails: boolean;
}

/**
 * Where an item stands: the marker it carries, or, for an item without
 * one, whether a test holds it.
 */
type ItemState = 'held' | 'not held' | 'pending' | 'removing' | 'bug';

export interface ListedItem {
  id: string;
  state: ItemState;
  /** Each test holding it: `<file> › <title>` */
  heldBy: string[];
}

/** The list of specs still in the legacy format. */
export const LEGACY_LIST_PATH = 'design/specs/legacy.txt';

/** A heading, a list item or a table row: what a legacy doc may not gain. */
const ENTRY = /^(?:#{2,}\s|\s*(?:[-*]|\d+\.)\s|\|)/;

/** A spec by its file name (`plan.md`), as the legacy list names it. */
export interface FlowDoc {
  name: string;
  markdown: string;
}

export interface LegacyCheck {
  /** Every spec now */
  docs: FlowDoc[];
  /** The legacy list now */
  legacy: string[];
  /** Main where this branch left it */
  base: {
    /** Its legacy list; null before main has one */
    legacy: string[] | null;
    /** Its specs, by file name */
    markdownByName: Map<string, string>;
  };
}

/** The doc names on the legacy list; `#` starts a comment. */
export const parseLegacyList = (text: string): string[] =>
  text
    .split('\n')
    .map(line => line.replace(/#.*/, '').trim())
    .filter(Boolean);

/** How many headings, list items and table rows a doc has. */
export const countEntries = (markdown: string): number =>
  markdown.split('\n').filter(line => ENTRY.test(line)).length;

/**
 * What keeps the legacy list honest, one sentence each:
 * - a doc not on it must be written in spec v2, so it has IDs;
 * - a doc on it that has IDs, or no longer exists, leaves it;
 * - it only gets shorter than on main;
 * - a doc on it can be corrected, but not grown: no more headings or list
 *   items or table rows than on main.
 */
export const findLegacyProblems = ({
  docs,
  legacy,
  base,
}: LegacyCheck): string[] => {
  const problems: string[] = [];
  const legacyNames = new Set(legacy);
  const docByName = new Map(docs.map(doc => [doc.name, doc]));

  for (const {name, markdown} of docs) {
    const hasIds = parseSpecItems(markdown).length > 0;
    if (!legacyNames.has(name) && !hasIds) {
      problems.push(
        `design/specs/${name} has no IDs: a doc not on ${LEGACY_LIST_PATH} is written in spec v2 (design/specs/README.md › Spec v2).`,
      );
    }
    if (legacyNames.has(name) && hasIds) {
      problems.push(
        `design/specs/${name} has IDs, so it's spec v2 now: delete its line from ${LEGACY_LIST_PATH}.`,
      );
    }
  }

  for (const name of legacy) {
    const doc = docByName.get(name);
    if (!doc) {
      problems.push(
        `${LEGACY_LIST_PATH} lists ${name}, which doesn't exist: delete its line.`,
      );
      continue;
    }
    if (base.legacy && !base.legacy.includes(name)) {
      problems.push(
        `${LEGACY_LIST_PATH} lists ${name}, which main's list doesn't: the list only gets shorter, so write the doc in spec v2.`,
      );
    }
    const baseMarkdown = base.markdownByName.get(name);
    if (baseMarkdown === undefined) continue;
    const [before, after] = [
      countEntries(baseMarkdown),
      countEntries(doc.markdown),
    ];
    if (after > before) {
      problems.push(
        `design/specs/${name} has more headings, list items and table rows than on main (${before} → ${after}): a legacy doc can be corrected, but not grown. Migrate it to spec v2 first, as board.md was.`,
      );
    }
  }

  return problems;
};

/** Every item in a spec, in order, with its markers. */
export const parseSpecItems = (markdown: string): SpecItem[] =>
  markdown.split('\n').flatMap(line => {
    const match = line.match(LIST_ITEM_ID) ?? line.match(TABLE_ROW_ID);
    if (!match) return [];
    const [, marker, id] = match;
    return [
      {
        id,
        pending: marker === 'pending',
        removing: marker === 'removing',
        bug: marker === 'bug',
      },
    ];
  });

/**
 * The titles in a test file that hold something, with their IDs. A skipped,
 * to-do or commented-out test holds nothing, and a title without IDs is left
 * out.
 */
export const parseTestTitles = (source: string): TestTitle[] =>
  [...source.replace(COMMENT, '').matchAll(TEST_CALL)].flatMap(
    ([, , modifier, , title]) => {
      if (modifier === 'skip' || modifier === 'todo') return [];
      const ids = title.match(TITLE_IDS)?.[0].trim().split(/\s+/) ?? [];
      return ids.length > 0 ? [{title, ids, fails: modifier === 'fails'}] : [];
    },
  );

/** The specs a test file says it holds. */
export const parseSpecComments = (source: string): string[] =>
  [...source.matchAll(SPEC_COMMENT)].map(([, path]) => path);

/**
 * Reads every spec's items and finds the tests holding each one. Only a file
 * that names its spec (`// Spec: …`) is read, so an unrelated title such as
 * `UTF-8 input is decoded` is never taken for an ID. A problem on the test
 * side (a title naming an ID its spec doesn't have, a skipped block) is
 * reported here, one sentence each.
 */
const findHolders = (specs: Spec[], testFiles: TestFile[]) => {
  const problems: string[] = [];
  const itemsBySpec = new Map(
    specs.map(({path, markdown}) => [path, parseSpecItems(markdown)]),
  );
  /** Spec path → item ID → the tests holding it */
  const holdersBySpec = new Map(
    specs.map(({path}) => [path, new Map<string, Holder[]>()]),
  );

  for (const {path, source} of testFiles) {
    const specPaths = parseSpecComments(source);
    if (specPaths.length === 0) continue;
    if (SKIPPED_DESCRIBE.test(source.replace(COMMENT, ''))) {
      problems.push(
        `${path}: a describe.skip turns off every test inside it, which would still count as holding their IDs — skip or delete each test instead.`,
      );
    }
    const titles = parseTestTitles(source);
    const unknownSpec = specPaths.find(specPath => !itemsBySpec.has(specPath));
    if (unknownSpec) {
      problems.push(
        `${path}: ${unknownSpec} isn't a spec v2 doc (a legacy doc has no IDs to hold).`,
      );
      continue;
    }

    for (const {title, ids, fails} of titles) {
      for (const id of ids) {
        const owners = specPaths.filter(specPath =>
          itemsBySpec.get(specPath)?.some(item => item.id === id),
        );
        if (owners.length === 0) {
          problems.push(
            `${path}: a title names ${id}, which ${specPaths.join(' or ')} doesn't have.`,
          );
          continue;
        }
        if (owners.length > 1) {
          problems.push(
            `${path}: ${id} is in ${owners.join(' and ')}; split the file by spec.`,
          );
          continue;
        }
        const [owner] = owners;
        const holders = holdersBySpec.get(owner);
        holders?.set(id, [...(holders.get(id) ?? []), {path, title, fails}]);
      }
    }
  }

  return {problems, itemsBySpec, holdersBySpec};
};

/**
 * Everything wrong between the v2 specs and the tests, one sentence each:
 * an item no test holds, a bug no `it.fails` holds, an item that isn't a bug
 * held only by `it.fails`, a title naming an ID its spec doesn't have (or one
 * still pending), an ID used twice, and a skipped block in a test file.
 */
export const findSpecProblems = (
  specs: Spec[],
  testFiles: TestFile[],
): string[] => {
  const {problems, itemsBySpec, holdersBySpec} = findHolders(specs, testFiles);

  for (const [specPath, items] of itemsBySpec) {
    const seen = new Set<string>();
    const holders = holdersBySpec.get(specPath);
    for (const {id, pending, bug} of items) {
      if (seen.has(id)) problems.push(`${specPath}: ${id} is used twice.`);
      seen.add(id);
      const heldBy = holders?.get(id) ?? [];
      if (pending) {
        for (const {path} of heldBy) {
          problems.push(
            `${path}: a title names ${id}, which is still pending in ${specPath} — drop "(pending)" in the same change.`,
          );
        }
      } else if (heldBy.length === 0) {
        problems.push(
          `${specPath}: no test holds ${id} — name it at the start of the title of the test that checks it.`,
        );
      } else if (bug && !heldBy.some(holder => holder.fails)) {
        problems.push(
          `${specPath}: ${id} is a known bug, but no \`it.fails\` holds it.`,
        );
      } else if (!bug && heldBy.every(holder => holder.fails)) {
        problems.push(
          `${specPath}: only an \`it.fails\` holds ${id}, which checks that it doesn't work — mark it *(bug)*, or hold it with a test that passes.`,
        );
      }
    }
  }

  return problems;
};

const stateOf = (item: SpecItem, heldBy: Holder[]): ItemState => {
  if (item.pending) return 'pending';
  if (item.removing) return 'removing';
  if (item.bug) return 'bug';
  return heldBy.length > 0 ? 'held' : 'not held';
};

/** Every item in one spec, in order, with where it stands and the tests holding it. */
export const listSpecItems = (
  spec: Spec,
  testFiles: TestFile[],
): ListedItem[] => {
  const {itemsBySpec, holdersBySpec} = findHolders([spec], testFiles);
  const holders = holdersBySpec.get(spec.path);
  return (itemsBySpec.get(spec.path) ?? []).map(item => {
    const heldBy = holders?.get(item.id) ?? [];
    return {
      id: item.id,
      state: stateOf(item, heldBy),
      heldBy: heldBy.map(({path, title}) => `${path} › ${title}`),
    };
  });
};

/**
 * One spec's list for the terminal: an item per line with where it stands,
 * then each test holding it on its own indented line.
 */
export const formatSpecList = (specPath: string, items: ListedItem[]) =>
  [
    specPath,
    '',
    ...items.flatMap(({id, state, heldBy}) => [
      `${id.padEnd(ID_COLUMN_WIDTH)}${state}`,
      ...heldBy.map(holder => `  ${holder}`),
    ]),
    '',
  ].join('\n');

/**
 * One spec's list as a Markdown table, for CI's job summary: a cell's `|`
 * is escaped, and an item's tests are one per line within its cell.
 */
export const formatSpecTable = (specPath: string, items: ListedItem[]) => {
  const cell = (text: string) => text.replaceAll('|', String.raw`\|`);
  return [
    `### ${specPath}`,
    '',
    '| ID | State | Held by |',
    '| --- | --- | --- |',
    ...items.map(
      ({id, state, heldBy}) =>
        `| ${id} | ${state} | ${heldBy.map(cell).join('<br>') || '—'} |`,
    ),
    '',
  ].join('\n');
};
