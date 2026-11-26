import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import enUS from './locales/en-US';
import esES from './locales/es-ES';
import ptBR from './locales/pt-BR';
import { Locale, TranslationKey } from './types';

const STORAGE_KEY = 'songbridge-locale';
const catalogs: Record<Locale, Record<TranslationKey, string>> = { 'en-US': enUS, 'es-ES': esES, 'pt-BR': ptBR };

const detectLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en-US';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && stored in catalogs) return stored as Locale;
  const browserLocale = window.navigator.language.toLowerCase();
  if (browserLocale.startsWith('pt')) return 'pt-BR';
  if (browserLocale.startsWith('es')) return 'es-ES';
  return 'en-US';
};

type Translator = (_key: TranslationKey, _values?: Record<string, string | number>) => string;
interface I18nContextValue {
  locale: Locale;
  setLocale: (_locale: Locale) => void;
  t: Translator;
  tc: (_key: string, _count: number, _values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en-US',
  setLocale: () => {},
  t: (key, values = {}) => enUS[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`)),
  tc: (key, count, values = {}) => {
    const category = new Intl.PluralRules('en-US').select(count);
    const pluralKey = `${key}.${category}` as TranslationKey;
    return enUS[pluralKey].replace(/\{(\w+)\}/g, (_, name: string) =>
      String(name === 'count' ? count : (values[name] ?? `{${name}}`)),
    );
  },
});

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(detectLocale);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const t: Translator = (key, values = {}) =>
      (catalogs[locale][key] ?? catalogs['en-US'][key]).replace(/\{(\w+)\}/g, (_, name: string) =>
        String(values[name] ?? `{${name}}`),
      );
    const tc: I18nContextValue['tc'] = (key, count, values = {}) => {
      const category = new Intl.PluralRules(locale).select(count);
      const pluralKey = `${key}.${category}` as TranslationKey;
      return t(pluralKey, { count, ...values });
    };
    return { locale, setLocale, t, tc };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  return useContext(I18nContext);
};
