import enUS from './locales/en-US';

export type TranslationKey = keyof typeof enUS;
export type Locale = 'en-US' | 'es-ES' | 'pt-BR';
