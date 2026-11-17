/**
 * Spec coverage as pure text checks, so it can be tested without touching
 * files: which items a spec v2 doc has (design/flows/README.md), which IDs
 * each test's title names, what's wrong between the two, and the list of
 * every item with the tests holding it. The command (`npm run check:spec`)
 * is scripts/checkSpec.ts.
 */

/** An item's ID: `<AREA>-n` (`COL-2`), or `A`, `R` or `J` and a number. */
const ID = String.raw`(?:[A-Z]+-\d+|[ARJ]\d+)`;

/** A list item that starts with a bold ID: `- **COL-2** …`, `- **J1 New user** …`. */
const LIST_ITEM_ID = new RegExp(String.raw`^\s*-\s+\*\*(${ID})\b`);

/** A table row whose first cell is an ID: `| A4 | Pull to Todo | …`. */
const TABLE_ROW_ID = new RegExp(String.raw`^\|\s*(${ID})\s*\|`);

/** The IDs at the start of a test's title: `CARD-2 R4 a Done card …`. */
const TITLE_IDS = new RegExp(String.raw`^(?:${ID}\s+)+`);

/**
 * A test call and its title: `it(`, `it.fails(`, `test(`, `test.step(`, …
 * The title is the first argument, a string literal in any quotes.
 */
const TEST_CALL =
  /\b(it|test)(?:\.(fails|skip|only|todo|step))?\s*\(\s*(['"`])((?:\\.|(?!\3)[^\\])*)\3/g;

/** A test file names the spec it holds: `// Spec: design/flows/board.md`. */
const SPEC_COMMENT = /^\/\/ Spec: (\S+)\s*$/gm;

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

/** Every item in a spec, in order, with its markers. */
export const parseSpecItems = (markdown: string): SpecItem[] =>
  markdown.split('\n').flatMap(line => {
    const id = (line.match(LIST_ITEM_ID) ?? line.match(TABLE_ROW_ID))?.[1];
    if (!id) return [];
    return [
      {
        id,
        pending: line.includes('*(pending)*'),
        removing: line.includes('*(removing)*'),
        bug: line.includes('*(bug)*'),
      },
    ];
  });

/**
 * The titles in a test file that hold something, with their IDs. A skipped
 * or to-do test holds nothing, and a title without IDs is left out.
 */
export const parseTestTitles = (source: string): TestTitle[] =>
  [...source.matchAll(TEST_CALL)].flatMap(([, , modifier, , title]) => {
    if (modifier === 'skip' || modifier === 'todo') return [];
    const ids = title.match(TITLE_IDS)?.[0].trim().split(/\s+/) ?? [];
    return ids.length > 0 ? [{title, ids, fails: modifier === 'fails'}] : [];
  });

/** The specs a test file says it holds. */
export const parseSpecComments = (source: string): string[] =>
  [...source.matchAll(SPEC_COMMENT)].map(([, path]) => path);

/**
 * Reads every spec's items and finds the tests holding each one. A problem
 * on the test side (a title naming an ID its spec doesn't have, a file that
 * doesn't say which spec it holds) is reported here, one sentence each.
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
    const titles = parseTestTitles(source);
    if (titles.length === 0) continue;
    const specPaths = parseSpecComments(source);
    if (specPaths.length === 0) {
      problems.push(
        `${path}: its titles name spec IDs, but it doesn't say which spec — add \`// Spec: design/flows/<page>.md\` at the top.`,
      );
      continue;
    }
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
 * an item no test holds, a bug no `it.fails` holds, a title naming an ID
 * its spec doesn't have (or one still pending), an ID used twice, and a test
 * file whose titles name IDs without saying which spec they're from.
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
