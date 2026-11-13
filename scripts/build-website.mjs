import { URL } from 'node:url';
import { log } from 'node:console';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { get } from 'node:https';
const root = new URL('../', import.meta.url);
const output = new URL('dist-website/', root);

const repository = 'kalecio/songbridge';
const releaseResponse = await new Promise((resolve, reject) => {
  const request = get(`https://api.github.com/repos/${repository}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'songbridge-website-build',
    },
  }, (response) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => {
      body += chunk;
    });
    response.on('end', () => {
      resolve({ status: response.statusCode ?? 0, body });
    });
  });
  request.on('error', reject);
});

if (releaseResponse.status !== 200) {
  throw new Error(`Could not load the latest Songbridge release: HTTP ${releaseResponse.status}`);
}

const release = JSON.parse(releaseResponse.body);
const version = release.tag_name?.replace(/^songbridge-v/, '');
if (!version || version === release.tag_name) {
  throw new Error(`Unexpected Songbridge release tag: ${release.tag_name}`);
}

const assetNames = {
  'macos-arm64-dmg': `songbridge_${version}_aarch64.dmg`,
  'macos-x64-dmg': `songbridge_${version}_x64.dmg`,
  'windows-exe': `songbridge_${version}_x64-setup.exe`,
  'windows-msi': `songbridge_${version}_x64_en-US.msi`,
  'linux-deb-x64': `songbridge_${version}_amd64.deb`,
  'linux-deb-arm64': `songbridge_${version}_arm64.deb`,
  'linux-rpm-x64': `songbridge-${version}-1.x86_64.rpm`,
  'linux-rpm-arm64': `songbridge-${version}-1.aarch64.rpm`,
  'linux-appimage-x64': `songbridge_${version}_amd64.AppImage`,
  'linux-appimage-arm64': `songbridge_${version}_aarch64.AppImage`,
};
const releaseAssets = new Map(release.assets.map((asset) => [asset.name, asset.browser_download_url]));
const latestAssetUrls = new Map();

for (const [key, name] of Object.entries(assetNames)) {
  const url = releaseAssets.get(name);
  if (!url) {
    throw new Error(`The latest Songbridge release is missing the ${key} asset (${name})`);
  }
  latestAssetUrls.set(key, url);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('website/', root), output, { recursive: true, filter: (source) => !source.endsWith('README.md') });

for (const locale of ['index.html', 'en/index.html', 'es/index.html']) {
  const page = new URL(locale, output);
  let html = await readFile(page, 'utf8');
  let replacedAssets = 0;
  html = html.replace(/(<a\b[^>]*\bdata-release-asset="([^"]+)"[^>]*\bhref=")[^"]*(")/g, (match, prefix, key, suffix) => {
    const url = latestAssetUrls.get(key);
    if (!url) throw new Error(`Unknown release asset key "${key}" in ${locale}`);
    replacedAssets += 1;
    return `${prefix}${url}${suffix}`;
  });

  if (replacedAssets !== Object.keys(assetNames).length) {
    throw new Error(`Expected ${Object.keys(assetNames).length} download links in ${locale}, found ${replacedAssets}`);
  }

  const versionPattern = /(<span id="version">)[^<]*(<\/span>)/;
  if (!versionPattern.test(html)) throw new Error(`Could not find the version label in ${locale}`);
  html = html.replace(versionPattern, `$1${version}$2`);
  await writeFile(page, html);
}

log(`Website built for Songbridge v${version} in dist-website/`);
