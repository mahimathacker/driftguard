import {
  ts,
  Node,
  Scope,
  type ClassDeclaration,
  type ConstructorDeclaration,
  type EnumDeclaration,
  type FunctionDeclaration,
  type InterfaceDeclaration,
  type MethodDeclaration,
  type MethodSignature,
  type ParameterDeclaration,
  type PropertyDeclaration,
  type PropertySignature,
  type TypeAliasDeclaration,
  type VariableDeclaration,
} from 'ts-morph';
import type { SdkExport } from '../../snapshot/schema.js';

const TYPE_FLAGS =
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.NoTypeReduction;

export function serializeExport(decl: Node): SdkExport | null {
  if (Node.isFunctionDeclaration(decl)) {
    return { kind: 'function', signature: serializeFunction(decl) };
  }
  if (Node.isClassDeclaration(decl)) {
    return { kind: 'class', signature: serializeClass(decl) };
  }
  if (Node.isInterfaceDeclaration(decl)) {
    return { kind: 'interface', signature: serializeInterface(decl) };
  }
  if (Node.isTypeAliasDeclaration(decl)) {
    return { kind: 'typeAlias', signature: serializeTypeAlias(decl) };
  }
  if (Node.isEnumDeclaration(decl)) {
    return { kind: 'enum', signature: serializeEnum(decl) };
  }
  if (Node.isVariableDeclaration(decl)) {
    return { kind: 'variable', signature: serializeVariable(decl) };
  }
  if (Node.isModuleDeclaration(decl)) {
    return { kind: 'namespace', signature: decl.getName() };
  }
  return null;
}

function serializeFunction(fn: FunctionDeclaration): string {
  return callSignature(fn);
}

function serializeClass(cls: ClassDeclaration): string {
  const generics = typeParamsString(cls.getTypeParameters());

  const ctor = cls.getConstructors()[0];
  const ctorLine = ctor ? `constructor${callSignatureNoReturn(ctor)};` : null;

  const props = cls
    .getProperties()
    .filter(isPublic)
    .map(serializeProperty)
    .sort();

  const methods = cls
    .getMethods()
    .filter(isPublic)
    .map((m) => `${m.getName()}${callSignature(m)};`)
    .sort();

  const body = [ctorLine, ...props, ...methods].filter(Boolean).join('\n  ');
  return `class${generics} {\n  ${body}\n}`;
}

function serializeInterface(iface: InterfaceDeclaration): string {
  const generics = typeParamsString(iface.getTypeParameters());

  const props = iface
    .getProperties()
    .map(serializeProperty)
    .sort();

  const methods = iface
    .getMethods()
    .map((m) => `${m.getName()}${callSignature(m)};`)
    .sort();

  const body = [...props, ...methods].join('\n  ');
  return `interface${generics} {\n  ${body}\n}`;
}

function serializeTypeAlias(alias: TypeAliasDeclaration): string {
  const generics = typeParamsString(alias.getTypeParameters());
  const node = alias.getTypeNodeOrThrow();
  return `type${generics} = ${node.getText()}`;
}

function serializeEnum(en: EnumDeclaration): string {
  const constMod = en.isConstEnum() ? 'const ' : '';
  const members = en
    .getMembers()
    .map((m) => {
      const init = m.getInitializer()?.getText();
      return init ? `${m.getName()} = ${init}` : m.getName();
    })
    .sort();
  return `${constMod}enum {\n  ${members.join(',\n  ')}\n}`;
}

function serializeVariable(v: VariableDeclaration): string {
  return v.getType().getText(v, TYPE_FLAGS);
}

function serializeProperty(p: PropertyDeclaration | PropertySignature): string {
  const opt = p.hasQuestionToken() ? '?' : '';
  const readonly = p.isReadonly() ? 'readonly ' : '';
  const type = p.getType().getText(p, TYPE_FLAGS);
  return `${readonly}${p.getName()}${opt}: ${type};`;
}

function callSignature(
  fn: FunctionDeclaration | MethodDeclaration | MethodSignature,
): string {
  const generics = typeParamsString(fn.getTypeParameters());
  const params = fn.getParameters().map(serializeParameter).join(', ');
  const ret = fn.getReturnType().getText(fn, TYPE_FLAGS);
  return `${generics}(${params}): ${ret}`;
}

function callSignatureNoReturn(fn: ConstructorDeclaration): string {
  const params = fn.getParameters().map(serializeParameter).join(', ');
  return `(${params})`;
}

function serializeParameter(p: ParameterDeclaration): string {
  const rest = p.isRestParameter() ? '...' : '';
  const opt = p.hasQuestionToken() || p.isOptional() ? '?' : '';
  const type = p.getType().getText(p, TYPE_FLAGS);
  return `${rest}${p.getName()}${opt}: ${type}`;
}

function typeParamsString(params: { getText: () => string }[]): string {
  if (params.length === 0) return '';
  return `<${params.map((p) => p.getText()).join(', ')}>`;
}

function isPublic(member: { getScope: () => Scope }): boolean {
  const scope = member.getScope();
  return scope === Scope.Public;
}
