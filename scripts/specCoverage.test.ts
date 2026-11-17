import {describe, expect, it} from 'vitest';
import {
  findSpecProblems,
  formatSpecList,
  formatSpecTable,
  listSpecItems,
  parseSpecItems,
  parseTestTitles,
  type ListedItem,
} from './specCoverage';

const SPEC_PATH = 'design/flows/board.md';

const SPEC = `# Board

- **COL-1** Two columns.
- **COL-2** Todo is sorted:
  - by kind: one-offs first
- **COL-3** *(removing)* Done runs latest first; replaced by COL-4.
- **COL-4** *(pending)* Done runs by kind.
- **BL-8** *(pending)* A pile per group.
- **ST-2 Returning user** — *(bug)* The recap leaves out steps.

| ID | Action | Where |
| --- | --- | --- |
| A1 | Start a plan | the empty board's button |

- **J1 New user** — ST-1 → A1.
`;

const spec = {path: SPEC_PATH, markdown: SPEC};

/**
 * A test call in a sample source. Written through this, the samples never
 * read as real test calls, so check:spec doesn't take this file's text for
 * tests that name spec IDs.
 */
const call = (method: string, title: string, quote = "'") =>
  `${method}(${quote}${title}${quote}, () => {});`;

/** A test file holding the spec, with these test calls. */
const testFile = (calls: string, path = 'src/board.test.tsx') => ({
  path,
  source: `// Spec: ${SPEC_PATH}\nimport {it} from 'vitest';\n${calls}`,
});

/** Calls that hold every non-pending item above. */
const HOLDING_EVERY_ITEM = [
  call('it', 'COL-1 COL-2 shows two sorted columns'),
  call('it', 'COL-3 runs Done latest first'),
  call('it.fails', 'ST-2 recaps every kind'),
  call('test', 'J1 a new user starts a plan'),
  call('test.step', 'A1 start a plan'),
].join('\n');

describe('parseSpecItems', () => {
  it('reads the IDs of list items and table rows, with their markers', () => {
    expect(parseSpecItems(SPEC)).toEqual([
      {id: 'COL-1', pending: false, removing: false, bug: false},
      {id: 'COL-2', pending: false, removing: false, bug: false},
      {id: 'COL-3', pending: false, removing: true, bug: false},
      {id: 'COL-4', pending: true, removing: false, bug: false},
      {id: 'BL-8', pending: true, removing: false, bug: false},
      {id: 'ST-2', pending: false, removing: false, bug: true},
      {id: 'A1', pending: false, removing: false, bug: false},
      {id: 'J1', pending: false, removing: false, bug: false},
    ]);
  });
});

describe('parseTestTitles', () => {
  it('reads the IDs at the start of each title, in any quotes and across lines', () => {
    const source = [
      call('it', 'CARD-2 R4 a Done card is dimmed', '"'),
      // A title on its own line, in backticks
      call('it', 'MV-4 a refused move goes back', '`').replace('(', '(\n  '),
      call('it.fails', 'ST-2 recaps every kind'),
      call('it', 'sorts without an ID'),
      call('it.skip', 'COL-3 skipped, so it holds nothing'),
    ].join('\n');
    expect(parseTestTitles(source)).toEqual([
      {
        title: 'CARD-2 R4 a Done card is dimmed',
        ids: ['CARD-2', 'R4'],
        fails: false,
      },
      {title: 'MV-4 a refused move goes back', ids: ['MV-4'], fails: false},
      {title: 'ST-2 recaps every kind', ids: ['ST-2'], fails: true},
    ]);
  });
});

describe('findSpecProblems', () => {
  it('finds nothing when every item is held', () => {
    expect(findSpecProblems([spec], [testFile(HOLDING_EVERY_ITEM)])).toEqual(
      [],
    );
  });

  it('reports an item no test holds', () => {
    const calls = HOLDING_EVERY_ITEM.replace('COL-1 COL-2', 'COL-2');
    expect(findSpecProblems([spec], [testFile(calls)])).toEqual([
      `${SPEC_PATH}: no test holds COL-1 — name it at the start of the title of the test that checks it.`,
    ]);
  });

  it('reports an item being removed that no test holds: its test goes only with the item', () => {
    const calls = HOLDING_EVERY_ITEM.replace(
      call('it', 'COL-3 runs Done latest first'),
      '',
    );
    expect(findSpecProblems([spec], [testFile(calls)])).toEqual([
      `${SPEC_PATH}: no test holds COL-3 — name it at the start of the title of the test that checks it.`,
    ]);
  });

  it('reports a bug no it.fails holds', () => {
    const calls = HOLDING_EVERY_ITEM.replace('it.fails(', 'it(');
    expect(findSpecProblems([spec], [testFile(calls)])).toEqual([
      `${SPEC_PATH}: ST-2 is a known bug, but no \`it.fails\` holds it.`,
    ]);
  });

  it("reports a title naming an ID the spec doesn't have, or one still pending", () => {
    const calls = `${HOLDING_EVERY_ITEM}\n${call('it', 'COL-9 BL-8 not there yet')}`;
    expect(findSpecProblems([spec], [testFile(calls)])).toEqual([
      `src/board.test.tsx: a title names COL-9, which ${SPEC_PATH} doesn't have.`,
      `src/board.test.tsx: a title names BL-8, which is still pending in ${SPEC_PATH} — drop "(pending)" in the same change.`,
    ]);
  });

  it('reports an ID used twice in a spec', () => {
    const twice = {path: SPEC_PATH, markdown: `${SPEC}- **COL-1** Again.\n`};
    expect(findSpecProblems([twice], [testFile(HOLDING_EVERY_ITEM)])).toContain(
      `${SPEC_PATH}: COL-1 is used twice.`,
    );
  });

  it("reports a test file that names IDs without saying which spec they're from", () => {
    const unmarked = {
      path: 'src/other.test.ts',
      source: call('it', 'COL-1 shows two columns'),
    };
    expect(
      findSpecProblems([spec], [testFile(HOLDING_EVERY_ITEM), unmarked]),
    ).toEqual([
      "src/other.test.ts: its titles name spec IDs, but it doesn't say which spec — add `// Spec: design/flows/<page>.md` at the top.",
    ]);
  });

  it('reports a test file holding a legacy doc', () => {
    const legacy = {
      path: 'src/plan.test.ts',
      source: `// Spec: design/flows/plan.md\n${call('it', 'A1 opens')}`,
    };
    expect(
      findSpecProblems([spec], [testFile(HOLDING_EVERY_ITEM), legacy]),
    ).toEqual([
      "src/plan.test.ts: design/flows/plan.md isn't a spec v2 doc (a legacy doc has no IDs to hold).",
    ]);
  });
});

describe('listSpecItems', () => {
  it('lists every item in order, with where it stands and the tests holding it', () => {
    const calls = `${HOLDING_EVERY_ITEM}\n${call('it', 'COL-2 keeps its order')}`;
    expect(listSpecItems(spec, [testFile(calls)])).toEqual([
      {
        id: 'COL-1',
        state: 'held',
        heldBy: ['src/board.test.tsx › COL-1 COL-2 shows two sorted columns'],
      },
      {
        id: 'COL-2',
        state: 'held',
        heldBy: [
          'src/board.test.tsx › COL-1 COL-2 shows two sorted columns',
          'src/board.test.tsx › COL-2 keeps its order',
        ],
      },
      {
        id: 'COL-3',
        state: 'removing',
        heldBy: ['src/board.test.tsx › COL-3 runs Done latest first'],
      },
      {id: 'COL-4', state: 'pending', heldBy: []},
      {id: 'BL-8', state: 'pending', heldBy: []},
      {
        id: 'ST-2',
        state: 'bug',
        heldBy: ['src/board.test.tsx › ST-2 recaps every kind'],
      },
      {
        id: 'A1',
        state: 'held',
        heldBy: ['src/board.test.tsx › A1 start a plan'],
      },
      {
        id: 'J1',
        state: 'held',
        heldBy: ['src/board.test.tsx › J1 a new user starts a plan'],
      },
    ]);
  });

  it('marks an item without a marker or a test as not held', () => {
    const calls = HOLDING_EVERY_ITEM.replace('COL-1 COL-2', 'COL-2');
    expect(listSpecItems(spec, [testFile(calls)])[0]).toEqual({
      id: 'COL-1',
      state: 'not held',
      heldBy: [],
    });
  });
});

const LISTED: ListedItem[] = [
  {
    id: 'COL-1',
    state: 'held',
    heldBy: ['a.test.ts › COL-1 a | b', 'b.test.ts › COL-1 c'],
  },
  {id: 'BL-8', state: 'pending', heldBy: []},
];

describe('formatSpecList', () => {
  it('writes an item per line, each test holding it indented below', () => {
    expect(formatSpecList(SPEC_PATH, LISTED)).toBe(
      [
        SPEC_PATH,
        '',
        'COL-1   held',
        '  a.test.ts › COL-1 a | b',
        '  b.test.ts › COL-1 c',
        'BL-8    pending',
        '',
      ].join('\n'),
    );
  });
});

describe('formatSpecTable', () => {
  it("writes a Markdown table, a test per line, escaping a title's pipes", () => {
    expect(formatSpecTable(SPEC_PATH, LISTED)).toBe(
      [
        `### ${SPEC_PATH}`,
        '',
        '| ID | State | Held by |',
        '| --- | --- | --- |',
        String.raw`| COL-1 | held | a.test.ts › COL-1 a \| b<br>b.test.ts › COL-1 c |`,
        '| BL-8 | pending | — |',
        '',
      ].join('\n'),
    );
  });
});
