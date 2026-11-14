import { readFile, writeFile } from 'node:fs/promises';

const configPath = new URL('../src-tauri/tauri.conf.json', import.meta.url);
const rpmConfigPath = new URL('../src-tauri/tauri.rpm-prerelease.conf.json', import.meta.url);
const { version } = JSON.parse(await readFile(configPath, 'utf8'));
const match = /^(\d+\.\d+\.\d+)-([0-9A-Za-z.-]+)(?:\+[0-9A-Za-z.-]+)?$/.exec(version);

if (!match) {
  throw new Error(`Expected a SemVer prerelease version, got ${version}`);
}

// RPM versions reject hyphens. Tilde sorts prereleases before the corresponding stable version.
const rpmVersion = `${match[1]}~${match[2].replaceAll('-', '.')}`;
await writeFile(rpmConfigPath, `${JSON.stringify({ version: rpmVersion }, null, 2)}\n`);
console.log(`Using RPM package version ${rpmVersion}; app version remains ${version}`);
