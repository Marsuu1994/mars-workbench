/**
 * Finds types declared more than once with the same shape (AGENTS.md › Coding
 * Conventions › General, DRY). It reads shapes through the type checker, not
 * the source text, so an import alias, an `extends` or a `Pick` can't hide a
 * repeat, and two types that only share a name stay apart. The command
 * (`npm run check:duplicate-types`) is scripts/checkDuplicateTypes.ts.
 */
import {relative} from 'node:path';
import ts from 'typescript';

/** One member is too little to call two types the same shape. */
const MIN_MEMBERS = 2;

/** A component's props belong to that component: two components may take the same ones. */
const COMPONENT_PROPS = /Props$/;

/** Member types are compared by their full name, so two `TaskType`s from different modules differ. */
const COMPARE_FLAGS =
  ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseFullyQualifiedType;
const DISPLAY_FLAGS = ts.TypeFormatFlags.NoTruncation;

type TypeDeclaration = ts.InterfaceDeclaration | ts.TypeAliasDeclaration;

/** Where a type is declared. */
export interface DeclaredType {
  name: string;
  /** Relative to the root the check ran from */
  file: string;
  line: number;
}

/** One shape and every declaration of it. */
export interface DuplicateShape {
  /** The shape's members in name order, as a reader writes them: `frequency: number` */
  members: string[];
  declarations: DeclaredType[];
}

/** An import the program couldn't resolve. */
export interface UnresolvedImport {
  file: string;
  line: number;
  /** The module as the import names it: `@/generated/prisma/client` */
  module: string;
}

export interface DuplicateTypesResult {
  /** How many declarations were compared */
  checkedCount: number;
  duplicates: DuplicateShape[];
}

export interface DuplicateTypesOptions {
  /** Paths in the result are relative to it */
  root: string;
  /** Whether a file's declarations are compared, by its path relative to the root */
  isChecked: (file: string) => boolean;
}

/** A declaration with its shape worked out. */
interface ShapedType extends DeclaredType {
  type: ts.Type;
  /** Written out member by member, not derived from another type */
  isHandWritten: boolean;
  /** The shape as one string, to group by */
  shape: string;
  members: string[];
}

const isTypeDeclaration = (node: ts.Node): node is TypeDeclaration =>
  ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);

/** An interface, or an alias of an object literal: `type Point = {x: number; y: number}`. */
const isHandWritten = (declaration: TypeDeclaration) =>
  ts.isInterfaceDeclaration(declaration) ||
  ts.isTypeLiteralNode(declaration.type);

/** A type with named members: not a union, an array, a tuple or a function. */
const isObjectShape = (type: ts.Type, checker: ts.TypeChecker) =>
  (type.flags & ts.TypeFlags.Object) !== 0 &&
  !checker.isArrayType(type) &&
  !checker.isTupleType(type) &&
  type.getCallSignatures().length === 0 &&
  type.getConstructSignatures().length === 0;

/**
 * Every member of a type, inherited ones included, in name order: once to
 * compare (full type names) and once to show (the names a reader writes).
 */
function listMembers(
  type: ts.Type,
  declaration: TypeDeclaration,
  checker: ts.TypeChecker,
) {
  const properties = checker.getPropertiesOfType(type).map(property => ({
    label: `${property.name}${property.flags & ts.SymbolFlags.Optional ? '?' : ''}`,
    type: checker.getTypeOfSymbolAtLocation(property, declaration),
  }));
  const indexes = checker.getIndexInfosOfType(type).map(index => ({
    label: `[${checker.typeToString(index.keyType)}]`,
    type: index.type,
  }));
  const members = [...properties, ...indexes].sort((first, second) =>
    first.label.localeCompare(second.label),
  );
  const describe = (flags: ts.TypeFormatFlags) =>
    members.map(
      member =>
        `${member.label}: ${checker.typeToString(member.type, undefined, flags)}`,
    );
  return {
    propertyCount: properties.length,
    compared: describe(COMPARE_FLAGS),
    shown: describe(DISPLAY_FLAGS),
  };
}

/** The declarations of one file that have a shape to compare. */
function collectShapedTypes(
  sourceFile: ts.SourceFile,
  file: string,
  checker: ts.TypeChecker,
): ShapedType[] {
  const shapedTypes: ShapedType[] = [];
  const visit = (node: ts.Node) => {
    ts.forEachChild(node, visit);
    if (!isTypeDeclaration(node)) return;
    // A generic's shape depends on its arguments
    if (node.typeParameters) return;
    const name = node.name.text;
    if (COMPONENT_PROPS.test(name)) return;
    const type = checker.getTypeAtLocation(node.name);
    if (!isObjectShape(type, checker)) return;
    const {propertyCount, compared, shown} = listMembers(type, node, checker);
    if (propertyCount < MIN_MEMBERS) return;
    shapedTypes.push({
      name,
      file,
      line:
        sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line + 1,
      type,
      isHandWritten: isHandWritten(node),
      shape: compared.join('; '),
      members: shown,
    });
  };
  visit(sourceFile);
  return shapedTypes;
}

/**
 * The imports of the checked files that resolve to nothing. A type behind one
 * reads as the name it was imported under, not as what it is, so a repeat
 * that uses it would go unseen: the command stops on these instead of passing.
 */
export function findUnresolvedImports(
  program: ts.Program,
  {root, isChecked}: DuplicateTypesOptions,
): UnresolvedImport[] {
  const checker = program.getTypeChecker();
  return program.getSourceFiles().flatMap(sourceFile => {
    const file = relative(root, sourceFile.fileName);
    if (sourceFile.isDeclarationFile || !isChecked(file)) return [];
    return sourceFile.statements
      .filter(ts.isImportDeclaration)
      .filter(
        ({importClause, moduleSpecifier}) =>
          // A bare `import './globals.css'` brings in no types
          importClause !== undefined &&
          ts.isStringLiteral(moduleSpecifier) &&
          checker.getSymbolAtLocation(moduleSpecifier) === undefined,
      )
      .map(({moduleSpecifier}) => ({
        file,
        line:
          sourceFile.getLineAndCharacterOfPosition(moduleSpecifier.getStart())
            .line + 1,
        module: moduleSpecifier.getText(sourceFile).slice(1, -1),
      }));
  });
}

const compareDeclarations = (first: DeclaredType, second: DeclaredType) =>
  first.file.localeCompare(second.file) || first.line - second.line;

/**
 * The shapes declared more than once in the checked files. A shape counts
 * when at least one of its declarations is hand-written: two types each
 * derived from their own source (two zod schemas, two `Pick`s) may agree
 * today and part tomorrow. An alias of a type (`type Line = PlanLine`) is
 * that type, not a second declaration of it.
 */
export function findDuplicateTypes(
  program: ts.Program,
  {root, isChecked}: DuplicateTypesOptions,
): DuplicateTypesResult {
  const checker = program.getTypeChecker();
  const shapedTypes = program.getSourceFiles().flatMap(sourceFile => {
    const file = relative(root, sourceFile.fileName);
    return sourceFile.isDeclarationFile || !isChecked(file)
      ? []
      : collectShapedTypes(sourceFile, file, checker);
  });

  const typesByShape = new Map<string, ShapedType[]>();
  for (const shapedType of shapedTypes) {
    typesByShape.set(shapedType.shape, [
      ...(typesByShape.get(shapedType.shape) ?? []),
      shapedType,
    ]);
  }

  const duplicates = [...typesByShape.values()]
    .filter(
      sameShape =>
        new Set(sameShape.map(({type}) => type)).size > 1 &&
        sameShape.some(shapedType => shapedType.isHandWritten),
    )
    .map(sameShape => ({
      members: sameShape[0].members,
      declarations: sameShape
        .map(({name, file, line}) => ({name, file, line}))
        .sort(compareDeclarations),
    }))
    .sort((first, second) =>
      compareDeclarations(first.declarations[0], second.declarations[0]),
    );

  return {checkedCount: shapedTypes.length, duplicates};
}

/** The report the command prints: each shape, then where it is declared. */
export function formatDuplicateTypes(duplicates: DuplicateShape[]): string {
  const blocks = duplicates.map(({members, declarations}) =>
    [
      `{${members.join('; ')}}`,
      ...declarations.map(({name, file, line}) => `  ${file}:${line}  ${name}`),
    ].join('\n'),
  );
  return [
    `${duplicates.length === 1 ? 'A shape is' : `${duplicates.length} shapes are`} declared more than once (AGENTS.md › Coding Conventions › General, DRY):`,
    ...blocks,
    'Keep one declaration and import it, or derive the others from it (Pick, Omit, extends).',
  ].join('\n\n');
}
