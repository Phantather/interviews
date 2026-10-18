import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ru, type Dictionary, type TranslationKey } from './ru';
import { ky } from './ky';

export type Lang = 'ru' | 'ky';
export type { TranslationKey, Dictionary };

export const LANGS: Lang[] = ['ru', 'ky'];
export const LANG_STORAGE_KEY = 'naryn-lang';

export const dictionaries: Record<Lang, Dictionary> = { ru, ky };

function isLang(value: unknown): value is Lang {
  return value === 'ru' || value === 'ky';
}

/** Приоритет: ?lang= в адресе (для QR-кодов) → localStorage → русский. */
export function detectLang(): Lang {
  if (typeof window === 'undefined') return 'ru';
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* приватный режим */
  }
  return 'ru';
}

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: TranslationKey, params?: Record<string, string | number>): string {
  const text = dictionaries[lang][key] ?? ru[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

type I18nValue = { lang: Lang; setLang: (lang: Lang) => void; t: Translate };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectLang());

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* приватный режим */
    }
  }, []);

  const t = useCallback<Translate>((key, params) => translate(lang, key, params), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
