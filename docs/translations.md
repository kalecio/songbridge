# Translating Songbridge

Songbridge keeps its interface translations in `src/i18n/locales`. The English
catalog (`en-US.ts`) is the source of truth. Spanish (`es-ES.ts`) and Brazilian
Portuguese (`pt-BR.ts`) implement the same keys. The app detects the browser or
system language on first launch, falls back to English, and remembers the user's
choice in local storage.

## Add a language

1. Copy `src/i18n/locales/en-US.ts` to a new file named for the BCP 47 locale,
   such as `fr-FR.ts`.
2. Translate every value while preserving each key. Keep product names, file
   formats, URLs, and user supplied music metadata unchanged.
3. Import the new catalog in `src/i18n/I18nProvider.tsx` and add it to the
   `Locale` union in `src/i18n/types.ts` and the `catalogs` map.
4. Add a native language name to the locale selector in
   `src/Pages/Settings/Settings.tsx` and add its label to all catalogs.
5. Run `npm run build` and `npm run lint`, then open the app in that language
   and review long labels, dialogs, empty states, and keyboard navigation.

TypeScript requires translated catalogs to include every English key. This
keeps missing strings visible during review instead of silently shipping
partial translations.

## Translation conventions

- Use stable, descriptive keys grouped by feature, for example
  `playlist.searchSongs` or `settings.language`.
- When adding a key, add it to the English catalog and every available locale
  catalog in the same change.
- Use `{name}` placeholders for runtime values and preserve their names in all
  languages. Example: `playlist.deleteNamed` receives `{ name }`.
- For count-sensitive text, add `.one` and `.other` forms and use `tc()` from
  `useI18n()`. The app selects the correct form with `Intl.PluralRules` for the
  active language. Some languages need additional plural categories; expand the
  helper and catalogs when adding such a language.
- Keep punctuation, capitalization, and tone natural for the target locale;
  translations do not need to match English word-for-word.
- Do not translate album, artist, track, playlist, or theme names supplied by
  the user.

## How to contribute a translation

Open an issue or pull request naming the target locale. A translator can work
from the English catalog, preserve keys and placeholders, and note any strings
that need product context. Reviewers should check completeness, terminology
consistency, truncation at narrow window sizes, and plural behavior. Please
avoid editing generated build output; only change source catalogs and locale
registration.
