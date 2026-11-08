import { URL } from 'node:url';
import { log } from 'node:console';
import { cp, mkdir, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('dist-website/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('website/', root), output, { recursive: true, filter: (source) => !source.endsWith('README.md') });
log('Website built in dist-website/');
