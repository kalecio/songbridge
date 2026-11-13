# Songbridge website

The landing page is in Brazilian Portuguese and is independent of the Tauri app.
It uses static HTML and CSS, locally hosted Inter fonts, and the original logo,
with no external services or client-side JavaScript.

## Visual identity

The original logo combines a bridge, waves, and audio bars in blue and white.
The site extends this visual language with electric blue, lavender, and the
backgrounds from the app's Midnight theme. The preview is a static screenshot
of the app's actual components rendered with a sample library. The website build
is independent of the app. Described features follow the app's README.

## Development and deployment

- `npm run website:dev`: run a local preview.
- `npm run website:build`: copy the site to `dist-website/`, separate from the desktop `dist/`.
- `npm run website:deploy`: build and deploy using the Wrangler Cloudflare session.
- `npx wrangler login`: authenticate locally when needed.

The site is published to the Cloudflare Pages project `songbridge-website`, with
the `main` production branch and the custom domain `songbridge.kalec.io`.
The domain association and DNS are configured once in Cloudflare Pages; deploying
the files does not require Workers or DNS permissions.

The `.github/workflows/website.yml` workflow deploys changes to the website
directory on the `main` branch, or can be run manually from that branch. It uses
the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` GitHub repository secrets.
The token only needs **Account / Cloudflare Pages / Edit**, scoped to the account
that owns the project. Never add a token to the repository.

Downloads are pinned to public version 0.6.0, which was verified when the site
was created. Update the links and version number in `index.html` when publishing
a new release. Links to other formats and release notes point to the latest
release.

Domain setup: https://developers.cloudflare.com/pages/configuration/custom-domains/
