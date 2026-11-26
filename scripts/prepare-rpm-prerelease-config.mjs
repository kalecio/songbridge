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

// Keep Version SemVer-compatible and sort prereleases below the stable RPM
// release by setting the package release field to 0.<prerelease>.
const rpmRelease = `0.${match[2].replaceAll('-', '.')}`;
const rpmConfig = {
  version: match[1],
  bundle: {
    linux: {
      rpm: {
        release: rpmRelease,
      },
    },
  },
};

await writeFile(rpmConfigPath, `${JSON.stringify(rpmConfig, null, 2)}\n`);
process.stdout.write(
  `Using RPM version ${match[1]}-${rpmRelease}; app version remains ${version}\n`,
);
