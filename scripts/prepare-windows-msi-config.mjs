import { readFile, writeFile } from 'node:fs/promises';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version ?? '');
if (!match) throw new Error(`Invalid application version: ${version}`);

const [, majorText, minorText, patchText, prerelease] = match;
const [major, minor, patch] = [majorText, minorText, patchText].map(Number);
if (major > 255 || minor > 255 || patch > 65_535) {
  throw new Error(`Version ${version} exceeds the Windows MSI version limits`);
}

const prereleaseNumber = prerelease?.match(/(?:^|\.)(\d+)$/)?.[1];
const build = prerelease
  ? Number(prereleaseNumber ?? 1)
  : 65_535;
if (build > 65_535 || (prerelease && build === 65_535)) {
  throw new Error(`Version ${version} cannot be represented as a Windows MSI version`);
}

const config = {
  bundle: {
    windows: {
      wix: {
        version: `${major}.${minor}.${patch}.${build}`,
      },
    },
  },
};
await writeFile('src-tauri/tauri.windows.conf.json', `${JSON.stringify(config, null, 2)}\n`);
