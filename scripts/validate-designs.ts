import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { DesignManifest } from '../shared/types';

const versionSchema = z.object({
  version: z.string().regex(/^v[1-9]\d*$/, 'versions must look like v1, v2, v3'),
  title: z.string().optional(),
  notes: z.string().optional(),
  entry: z.string(),
  thumbnail: z.string(),
  createdAt: z.string().datetime().optional(),
});

const manifestSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case'),
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  owner: z.string().optional(),
  defaultVersion: z.string().optional(),
  versions: z.array(versionSchema).min(1),
});

function assertSafeRelative(filePath: string, label: string) {
  if (path.isAbsolute(filePath)) throw new Error(`${label} must be relative: ${filePath}`);
  const normalized = path.normalize(filePath);
  if (normalized.startsWith('..') || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`${label} cannot leave the design folder: ${filePath}`);
  }
  if (normalized !== filePath.split('/').join(path.sep)) {
    throw new Error(`${label} should use plain relative paths: ${filePath}`);
  }
}

function versionNumber(version: string) {
  return Number(version.slice(1));
}

export function validateManifest(raw: unknown, designDir: string): DesignManifest {
  const manifest = manifestSchema.parse(raw);
  const seen = new Set<string>();
  for (const version of manifest.versions) {
    if (seen.has(version.version)) throw new Error(`${manifest.slug}: duplicate version ${version.version}`);
    seen.add(version.version);
    assertSafeRelative(version.entry, `${manifest.slug}/${version.version} entry`);
    assertSafeRelative(version.thumbnail, `${manifest.slug}/${version.version} thumbnail`);
    const entry = path.join(designDir, version.entry);
    const thumbnail = path.join(designDir, version.thumbnail);
    if (!existsSync(entry)) throw new Error(`${manifest.slug}/${version.version}: missing entry ${version.entry}`);
    if (!existsSync(thumbnail)) throw new Error(`${manifest.slug}/${version.version}: missing thumbnail ${version.thumbnail}`);
    if (path.basename(entry).toLowerCase() !== 'index.html') {
      throw new Error(`${manifest.slug}/${version.version}: entry must be an index.html file`);
    }
  }
  const ordered = [...manifest.versions].sort((a, b) => versionNumber(a.version) - versionNumber(b.version));
  if (ordered.map((v) => v.version).join(',') !== manifest.versions.map((v) => v.version).join(',')) {
    throw new Error(`${manifest.slug}: versions must be ordered v1, v2, v3`);
  }
  if (manifest.defaultVersion && !seen.has(manifest.defaultVersion)) {
    throw new Error(`${manifest.slug}: defaultVersion ${manifest.defaultVersion} is not in versions`);
  }
  return manifest;
}

export function loadCatalog(root = path.resolve('catalog')): DesignManifest[] {
  if (!existsSync(root)) return [];
  const manifests: DesignManifest[] = [];
  const slugs = new Set<string>();
  for (const entry of readdirSync(root).sort()) {
    const designDir = path.join(root, entry);
    if (!statSync(designDir).isDirectory()) continue;
    const manifestPath = path.join(designDir, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = validateManifest(JSON.parse(readFileSync(manifestPath, 'utf8')), designDir);
    if (manifest.slug !== entry) throw new Error(`${entry}: manifest slug must match folder name`);
    if (slugs.has(manifest.slug)) throw new Error(`duplicate design slug ${manifest.slug}`);
    slugs.add(manifest.slug);
    manifests.push(manifest);
  }
  return manifests;
}

function syncPublicPrototypes(catalogRoot: string, publicRoot: string, manifests: DesignManifest[]) {
  rmSync(publicRoot, { recursive: true, force: true });
  mkdirSync(publicRoot, { recursive: true });
  for (const manifest of manifests) {
    const source = path.join(catalogRoot, manifest.slug);
    const target = path.join(publicRoot, manifest.slug);
    cpSync(source, target, {
      recursive: true,
      filter: (src) => path.basename(src) !== 'manifest.json',
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const catalogRoot = path.resolve('catalog');
  const manifests = loadCatalog(catalogRoot);
  if (!manifests.length) throw new Error('No design manifests found under catalog/');
  syncPublicPrototypes(catalogRoot, path.resolve('public/prototypes'), manifests);
  writeFileSync(
    path.resolve('shared/catalog.generated.ts'),
    `import type { DesignManifest } from './types';\n\nexport const catalog: DesignManifest[] = ${JSON.stringify(manifests, null, 2)};\n`,
  );
  console.log(`Validated ${manifests.length} designs and synced public/prototypes.`);
}
