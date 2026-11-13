import { appendFile, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
if (!version) throw new Error('package.json is missing a version');

const tag = `songbridge-v${version}`;
const token = process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
if (!token || !repository) throw new Error('GitHub release metadata is unavailable');

const existingResponse = await fetch(
  `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`,
  {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'songbridge-release-workflow',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  },
);

if (existingResponse.ok) {
  const existingRelease = await existingResponse.json();
  if (!existingRelease.draft) {
    throw new Error(`Release ${tag} is already published; refusing to replace its assets`);
  }
} else if (existingResponse.status !== 404) {
  throw new Error(`Could not check release ${tag}: ${existingResponse.status} ${existingResponse.statusText}`);
}

const changelog = await readFile('CHANGELOG.md', 'utf8');
const sections = changelog.split(/(?=^## \[)/m);
const releaseSection = sections.find((section) => section.startsWith(`## [${version}]`));
if (!releaseSection) throw new Error(`CHANGELOG.md has no section for ${version}`);

const body = releaseSection.replace(/^## \[[^\]]+\][^\n]*\r?\n/, '').trim();
if (!body) throw new Error(`CHANGELOG.md section for ${version} is empty`);

const delimiter = `SONGBRIDGE_RELEASE_${randomUUID()}`;
await appendFile(
  process.env.GITHUB_OUTPUT,
  `prerelease=${String(version.includes('-'))}\nbody<<${delimiter}\n${body}\n${delimiter}\n`,
);
