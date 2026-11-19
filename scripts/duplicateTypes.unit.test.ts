import ts from 'typescript';
import {describe, expect, it} from 'vitest';
import {
  findDuplicateTypes,
  findUnresolvedImports,
  formatDuplicateTypes,
  type DuplicateTypesOptions,
} from './duplicateTypes';

const ROOT = '/repo';

const COMPILER_OPTIONS: ts.CompilerOptions = {
  strict: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2017,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  // `Pick` and `Omit` without the DOM's types, which take seconds to read
  lib: ['lib.es2017.d.ts'],
};

/** The standard library's files, parsed once for every program below. */
const libraryFileByName = new Map<string, ts.SourceFile | undefined>();

/**
 * A program over files that exist only here, by their path under the root.
 * The standard library still comes from disk, so `Pick` and `Omit` resolve.
 */
const programOf = (sourceByFile: Record<string, string>) => {
  const sourceByPath = new Map(
    Object.entries(sourceByFile).map(([file, source]) => [
      `${ROOT}/${file}`,
      source,
    ]),
  );
  const host = ts.createCompilerHost(COMPILER_OPTIONS);
  const readFromDisk = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const source = sourceByPath.get(fileName);
    if (source !== undefined) {
      return ts.createSourceFile(fileName, source, languageVersion, true);
    }
    if (!libraryFileByName.has(fileName)) {
      libraryFileByName.set(
        fileName,
        readFromDisk(fileName, languageVersion, ...rest),
      );
    }
    return libraryFileByName.get(fileName);
  };
  host.fileExists = fileName =>
    sourceByPath.has(fileName) || ts.sys.fileExists(fileName);
  // Imports between these files resolve only through folders that exist
  host.directoryExists = directory =>
    [...sourceByPath.keys()].some(path => path.startsWith(`${directory}/`)) ||
    ts.sys.directoryExists(directory);
  host.readFile = fileName =>
    sourceByPath.get(fileName) ?? ts.sys.readFile(fileName);
  return ts.createProgram([...sourceByPath.keys()], COMPILER_OPTIONS, host);
};

const OPTIONS: DuplicateTypesOptions = {
  root: ROOT,
  isChecked: file => file.startsWith('src/'),
};

const findIn = (sourceByFile: Record<string, string>) =>
  findDuplicateTypes(programOf(sourceByFile), OPTIONS);

/** Each repeated shape as the names declaring it, in the order reported. */
const namesOf = (sourceByFile: Record<string, string>) =>
  findIn(sourceByFile).duplicates.map(({declarations}) =>
    declarations.map(({name}) => name),
  );

describe('findDuplicateTypes', () => {
  it('reports two types with the same members, whatever their order and whether interface or alias', () => {
    const {checkedCount, duplicates} = findIn({
      'src/plan.ts': `
        export interface PlanLine {
          templateId: string;
          frequency: number;
        }
        export interface Unrelated {
          templateId: string;
          title: string;
        }`,
      'src/form.ts': `
        type InitialLine = {
          frequency: number;
          templateId: string;
        };
        export const first = (lines: InitialLine[]) => lines[0];`,
    });

    expect(checkedCount).toBe(3);
    expect(duplicates).toEqual([
      {
        members: ['frequency: number', 'templateId: string'],
        declarations: [
          {name: 'InitialLine', file: 'src/form.ts', line: 2},
          {name: 'PlanLine', file: 'src/plan.ts', line: 2},
        ],
      },
    ]);
  });

  it('sees through an import alias, and keeps two types that only share a name apart', () => {
    const enums = `export type TaskType = 'DAILY' | 'WEEKLY';`;
    const otherEnums = `export type TaskType = 'DAILY' | 'WEEKLY' | 'AD_HOC';`;

    expect(
      namesOf({
        'src/enums.ts': enums,
        'src/line.ts': `
          import type {TaskType as TaskTypeEnum} from './enums';
          export interface PlanLine { type: TaskTypeEnum; frequency: number }`,
        'src/config.ts': `
          import type {TaskType} from './enums';
          export interface Config { type: TaskType; frequency: number }`,
      }),
    ).toEqual([['Config', 'PlanLine']]);

    expect(
      namesOf({
        'src/enums.ts': enums,
        'src/otherEnums.ts': otherEnums,
        'src/line.ts': `
          import type {TaskType} from './enums';
          export interface PlanLine { type: TaskType; frequency: number }`,
        'src/config.ts': `
          import type {TaskType} from './otherEnums';
          export interface Config { type: TaskType; frequency: number }`,
      }),
    ).toEqual([]);
  });

  it('counts the members a type inherits', () => {
    expect(
      namesOf({
        'src/steps.ts': `
          export interface StepPlacement { beforeStepId?: string }
          export interface StepMove extends StepPlacement { stepId: string }
          export interface MoveInput { stepId: string; beforeStepId?: string }
          export interface MoveRequired { stepId: string; beforeStepId: string }`,
      }),
    ).toEqual([['StepMove', 'MoveInput']]);
  });

  it('reports a hand-written type that repeats a derived one, but not two derived ones', () => {
    const board = `
      export interface BoardData {
        plan: string;
        projects: string[];
        tasks: string[];
      }`;

    expect(
      namesOf({
        'src/board.ts': board,
        'src/cards.ts': `
          import type {BoardData} from './board';
          export type CardInputs = Pick<BoardData, 'plan' | 'projects'>;`,
        'src/groups.ts': `export interface GroupInputs { plan: string; projects: string[] }`,
      }),
    ).toEqual([['CardInputs', 'GroupInputs']]);

    expect(
      namesOf({
        'src/board.ts': board,
        'src/cards.ts': `
          import type {BoardData} from './board';
          export type CardInputs = Pick<BoardData, 'plan' | 'projects'>;`,
        'src/groups.ts': `
          import type {BoardData} from './board';
          export type GroupInputs = Omit<BoardData, 'tasks'>;`,
      }),
    ).toEqual([]);
  });

  it("doesn't take an alias of a type for a second declaration of it", () => {
    expect(
      namesOf({
        'src/plan.ts': `
          export interface PlanLine { templateId: string; frequency: number }
          export type Line = PlanLine;`,
      }),
    ).toEqual([]);
  });

  it('leaves alone component props, one-member types, generics and files it was told to skip', () => {
    expect(
      namesOf({
        'src/panels.tsx': `
          interface DesktopBacklogProps { count: number; title: string }
          interface MobileBacklogProps { count: number; title: string }
          interface WithId { id: string }
          interface AlsoWithId { id: string }
          interface Page<Row> { rows: Row[]; nextCursor: string | null }
          interface Feed<Entry> { rows: Entry[]; nextCursor: string | null }
          export type Kept = [DesktopBacklogProps, MobileBacklogProps, WithId, AlsoWithId, Page<string>, Feed<string>];`,
        'src/plan.ts': `export interface PlanLine { templateId: string; frequency: number }`,
        'test/buildLine.ts': `export interface TestLine { templateId: string; frequency: number }`,
      }),
    ).toEqual([]);
  });
});

describe('findUnresolvedImports', () => {
  it("lists a checked file's imports that resolve to nothing, and no others", () => {
    const program = programOf({
      'src/enums.ts': `export type TaskType = 'DAILY' | 'WEEKLY';`,
      'src/line.ts': `
        import './styles.css';
        import type {TaskType} from './enums';
        import type {TaskSize} from './generated/client';
        export interface PlanLine { type: TaskType; size: TaskSize }`,
      'test/helper.ts': `import type {Missing} from './nowhere'; export type Kept = Missing;`,
    });

    expect(findUnresolvedImports(program, OPTIONS)).toEqual([
      {file: 'src/line.ts', line: 4, module: './generated/client'},
    ]);
  });
});

describe('formatDuplicateTypes', () => {
  it('prints each shape with where it is declared, then what to do', () => {
    expect(
      formatDuplicateTypes([
        {
          members: ['frequency: number', 'templateId: string'],
          declarations: [
            {name: 'InitialLine', file: 'src/form.ts', line: 2},
            {name: 'PlanLine', file: 'src/plan.ts', line: 7},
          ],
        },
      ]),
    ).toBe(
      [
        'A shape is declared more than once (AGENTS.md › Coding Conventions › General, DRY):',
        '{frequency: number; templateId: string}\n  src/form.ts:2  InitialLine\n  src/plan.ts:7  PlanLine',
        'Keep one declaration and import it, or derive the others from it (Pick, Omit, extends).',
      ].join('\n\n'),
    );
  });
});
