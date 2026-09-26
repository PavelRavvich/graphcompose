import ts from "typescript";
import { ScaffoldError } from "./errors.js";
import type { FileToWrite } from "./write.js";

type Decorator = "Agent" | "Workflow";

const decoratorCall = (
  source: ts.SourceFile,
  decorator: Decorator,
): ts.ObjectLiteralExpression | undefined => {
  let found: ts.ObjectLiteralExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (found !== undefined) return;
    if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
      const call = node.expression;
      const [options] = call.arguments;
      if (
        ts.isIdentifier(call.expression) &&
        call.expression.text === decorator &&
        options !== undefined &&
        ts.isObjectLiteralExpression(options)
      ) {
        found = options;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

const parse = (text: string, file: string): ts.SourceFile =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

/**
 * Adds `element` to the `property` array of the file's `@Agent({…})` / `@Workflow({…})` options (the
 * property is created when missing). An element already there → a clash; an unexpected shape → an error
 * naming the file — never a guess.
 */
export function addToArray(
  text: string,
  file: string,
  decorator: Decorator,
  property: string,
  element: string,
): string {
  const source = parse(text, file);
  const options = decoratorCall(source, decorator);
  if (options === undefined)
    throw new ScaffoldError(`${file}: no @${decorator}({ … }) found — add ${element} by hand`);
  const assignment = options.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === property,
  );
  if (assignment === undefined) {
    const last = options.properties.at(-1);
    const at = last === undefined ? options.getStart(source) + 1 : last.getEnd();
    return `${text.slice(0, at)}${last === undefined ? "" : ","}\n  ${property}: [${element}]${text.slice(at)}`;
  }
  const array = assignment.initializer;
  if (!ts.isArrayLiteralExpression(array)) {
    throw new ScaffoldError(
      `${file}: @${decorator}({ ${property} }) is not an array literal — add ${element} by hand`,
    );
  }
  if (
    array.elements.some(
      (e) => e.getText(source).replace(/\s+/g, " ") === element.replace(/\s+/g, " "),
    )
  ) {
    throw new ScaffoldError(`${file}: ${element} is already in ${property}`);
  }
  const lastElement = array.elements.at(-1);
  const at = lastElement === undefined ? array.getStart(source) + 1 : lastElement.getEnd();
  return `${text.slice(0, at)}${lastElement === undefined ? "" : ", "}${element}${text.slice(at)}`;
}

const importFrom = (source: ts.SourceFile, from: string): ts.NamedImports | undefined => {
  const declaration = source.statements
    .filter(ts.isImportDeclaration)
    .find((i) => ts.isStringLiteral(i.moduleSpecifier) && i.moduleSpecifier.text === from);
  const named = declaration?.importClause?.namedBindings;
  return named !== undefined && ts.isNamedImports(named) ? named : undefined;
};

/** Adds `import { name } from "from"` — into an existing import from the same module when there is one. */
export function addImport(text: string, file: string, name: string, from: string): string {
  const source = parse(text, file);
  const named = importFrom(source, from);
  if (named !== undefined) {
    if (named.elements.some((e) => e.name.text === name)) return text;
    const at = named.elements.at(-1)?.getEnd() ?? named.getStart(source) + 1;
    return `${text.slice(0, at)}, ${name}${text.slice(at)}`;
  }
  const at = source.statements.filter(ts.isImportDeclaration).at(-1)?.getEnd() ?? 0;
  const line = `import { ${name} } from "${from}";`;
  return at === 0 ? `${line}\n${text}` : `${text.slice(0, at)}\n${line}${text.slice(at)}`;
}

/** Wires a class into an agent or workflow file: the array entry and its import. */
export function wire(
  file: FileToWrite,
  decorator: "Agent" | "Workflow",
  property: string,
  element: string,
  name: string,
  from: string,
): FileToWrite {
  const added = addToArray(file.content, file.path, decorator, property, element);
  return { path: file.path, content: addImport(added, file.path, name, from) };
}
