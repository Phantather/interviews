import { LANG_LABELS, LANGS, useI18n, type Lang } from '../i18n';
import { THEME_CHOICES, type ThemeChoice } from '../theme';
import { RidgeProgress } from './RidgeProgress';

const THEME_ICONS: Record<ThemeChoice, JSX.Element> = {
  light: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24">
      <path d="M21 13.2A9 9 0 1 1 10.8 3a7 7 0 0 0 10.2 10.2z" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24">
      <path d="M3 4h18v12H3z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

type Props = {
  fraction: number;
  counter: string;
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
};

export function Header({ fraction, counter, theme, onThemeChange }: Props) {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__row">
          <div className="header__title">{t('app.title')}</div>
          <div className="header__controls">
            <div className="switch" role="group" aria-label={t('a11y.lang')}>
              {LANGS.map((item: Lang) => (
                <button
                  key={item}
                  type="button"
                  className="switch__btn"
                  aria-pressed={lang === item}
                  onClick={() => setLang(item)}
                >
                  {LANG_LABELS[item]}
                </button>
              ))}
            </div>
            <div className="switch" role="group" aria-label={t('a11y.theme')}>
              {THEME_CHOICES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="switch__btn"
                  aria-pressed={theme === item}
                  aria-label={t(`theme.${item}` as const)}
                  title={t(`theme.${item}` as const)}
                  onClick={() => onThemeChange(item)}
                >
                  {THEME_ICONS[item]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <span className="header__count" aria-live="polite">
          {counter}
        </span>
        <RidgeProgress fraction={fraction} />
      </div>
    </header>
  );
}
