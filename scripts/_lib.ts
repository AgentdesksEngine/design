import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function loadDotenv(file = '.env') {
  const full = path.resolve(file);
  if (!existsSync(full)) return;
  for (const raw of readFileSync(full, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] ??= value;
  }
}
