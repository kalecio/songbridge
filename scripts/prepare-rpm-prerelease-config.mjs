import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const rootDir = dirname(fileURLToPath(import.meta.url));
const configPath = join(rootDir, '../src-tauri/tauri.conf.json');
const rpmConfigPath = join(rootDir, '../src-tauri/tauri.rpm-prerelease.conf.json');
const { version } = JSON.parse(await readFile(configPath, 'utf8'));
const match = /^(\d+\.\d+\.\d+)-([0-9A-Za-z.-]+)(?:\+[0-9A-Za-z.-]+)?$/.exec(version);

if (!match) {
  throw new Error(`Expected a SemVer prerelease version, got ${version}`);
}

// RPM versions reject hyphens. Tilde sorts prereleases before the corresponding stable version.
const rpmVersion = `${match[1]}~${match[2].replaceAll('-', '.')}`;
await writeFile(rpmConfigPath, `${JSON.stringify({ version: rpmVersion }, null, 2)}\n`);
process.stdout.write(`Using RPM package version ${rpmVersion}; app version remains ${version}\n`);
