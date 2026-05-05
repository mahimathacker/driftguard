import { createHash } from 'node:crypto';

export function snippetId(filePath: string, source: string): string {
  const digest = createHash('sha256').update(source).digest('hex').slice(0, 12);
  return `${filePath}#${digest}`;
}

export function fileContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
