import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateManifest } from './validate-designs';

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'design-gallery-'));
  mkdirSync(path.join(dir, 'v1'));
  writeFileSync(path.join(dir, 'v1/index.html'), '<html></html>');
  writeFileSync(path.join(dir, 'v1/thumbnail.svg'), '<svg />');
  return dir;
}

it('accepts a valid committed design manifest', () => {
  const dir = fixture();
  expect(() =>
    validateManifest(
      {
        slug: 'sample-design',
        title: 'Sample',
        description: 'Example',
        tags: ['CRM'],
        defaultVersion: 'v1',
        versions: [{ version: 'v1', entry: 'v1/index.html', thumbnail: 'v1/thumbnail.svg' }],
      },
      dir,
    ),
  ).not.toThrow();
});

it('rejects paths that leave the design folder', () => {
  const dir = fixture();
  expect(() =>
    validateManifest(
      {
        slug: 'sample-design',
        title: 'Sample',
        description: 'Example',
        tags: [],
        versions: [{ version: 'v1', entry: '../secret.html', thumbnail: 'v1/thumbnail.svg' }],
      },
      dir,
    ),
  ).toThrow(/cannot leave/);
});
