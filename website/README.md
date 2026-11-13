# Songbridge website

The landing page is available in Brazilian Portuguese (`/`), English (`/en/`),
and Spanish (`/es/`). Each locale is a static HTML page, independent of the
Tauri app. The site uses static HTML and CSS, locally hosted Inter fonts, and
the original logo, with no external services or client-side JavaScript.

The header language selector links directly to each locale. Keep the page title,
description, canonical URL, `hreflang` alternates, and sitemap entries aligned
when adding or updating translations.

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
directory on the `main` branch, deploys again when a GitHub release is published,
or can be run manually from `main`. Release deployments check out `main` and
resolve the latest published release during the site build. The workflow uses the
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` GitHub repository secrets.
The token only needs **Account / Cloudflare Pages / Edit**, scoped to the account
that owns the project. Never add a token to the repository.

The website build reads the latest published Songbridge release from GitHub and
uses its version and uploaded assets to generate download links for all three
locales. Missing expected assets fail the build instead of publishing broken
download links. Release drafts are not shown; publishing a release triggers a
website deployment automatically.

Domain setup: https://developers.cloudflare.com/pages/configuration/custom-domains/
