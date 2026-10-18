import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { submitSurvey } from './api';
import { BottomBar } from './components/BottomBar';
import { Header } from './components/Header';
import { QuestionScreen } from './components/QuestionScreen';
import { useI18n, type TranslationKey } from './i18n';
import { useTheme, type ThemeChoice } from './theme';
import { SCREENS, TOTAL_QUESTIONS, nextIndex, prevIndex, visibleScreens } from './survey/config';
import { flatten } from './survey/flatten';
import { clearProgress, loadProgress, saveProgress, type SavedProgress } from './survey/storage';
import type { Answer } from './survey/types';
import { validate, type ValidationError } from './survey/validate';

type Stage = 'intro' | 'survey' | 'done' | 'declined';

const AUTO_ADVANCE_MS = 300;

function freshState(): SavedProgress {
  return { index: 0, answers: {}, history: [], startedAt: Date.now() };
}

export function App() {
  const { lang, t } = useI18n();
  const { theme, setTheme } = useTheme();

  const [stage, setStage] = useState<Stage>('intro');
  const [state, setState] = useState<SavedProgress>(freshState);
  const [error, setError] = useState<ValidationError | null>(null);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [surveyNumber, setSurveyNumber] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [saved, setSaved] = useState<SavedProgress | null>(() =>
    typeof window === 'undefined' ? null : loadProgress(),
  );

  // Автопереход срабатывает с задержкой, поэтому обработчикам нужно
  // актуальное состояние, а не то, что было на момент их создания.
  const stateRef = useRef(state);
  const autoTimer = useRef<number | null>(null);

  const clearAutoTimer = () => {
    if (autoTimer.current !== null) {
      window.clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
  };
  useEffect(() => clearAutoTimer, []);

  const apply = useCallback((next: SavedProgress, persist: boolean) => {
    stateRef.current = next;
    setState(next);
    if (persist) saveProgress(next);
  }, []);

  const screen = SCREENS[state.index];
  const answer: Answer = state.answers[screen?.id ?? ''] ?? {};

  const send = useCallback(
    async (current: SavedProgress) => {
      setSending(true);
      setSendFailed(false);
      const durationMin = Math.max(1, Math.round((Date.now() - current.startedAt) / 60000));
      try {
        const number = await submitSurvey({
          lang,
          durationMin,
          answers: flatten(current.answers),
          company: honeypot,
        });
        setSurveyNumber(number);
        clearProgress();
        setSaved(null);
        setStage('done');
      } catch {
        setSendFailed(true);
      } finally {
        setSending(false);
      }
    },
    [honeypot, lang],
  );

  const update = useCallback(
    (updater: (prev: Answer) => Answer) => {
      clearAutoTimer();
      setError(null);
      const current = stateRef.current;
      const id = SCREENS[current.index].id;
      apply(
        { ...current, answers: { ...current.answers, [id]: updater(current.answers[id] ?? {}) } },
        true,
      );
    },
    [apply],
  );

  const goNext = useCallback(() => {
    clearAutoTimer();
    const current = stateRef.current;
    const currentScreen = SCREENS[current.index];
    const currentAnswer = current.answers[currentScreen.id] ?? {};

    const problem = validate(currentScreen, currentAnswer);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);

    if (currentScreen.type === 'consent' && currentAnswer.value === 'consent.no') {
      clearProgress();
      setSaved(null);
      setStage('declined');
      return;
    }
    if (currentScreen.type === 'submit') {
      void send(current);
      return;
    }

    const target = nextIndex(current.index, current.answers);
    if (target === -1) return;
    apply({ ...current, index: target, history: [...current.history, current.index] }, true);
  }, [apply, send]);

  const goBack = useCallback(() => {
    clearAutoTimer();
    setError(null);
    const current = stateRef.current;
    const history = [...current.history];
    const target = history.length ? history.pop()! : prevIndex(current.index, current.answers);
    if (target < 0) return;
    apply({ ...current, index: target, history }, true);
  }, [apply]);

  const onAnswered = useCallback(() => {
    clearAutoTimer();
    autoTimer.current = window.setTimeout(goNext, AUTO_ADVANCE_MS);
  }, [goNext]);

  const startFresh = useCallback(() => {
    clearProgress();
    setSaved(null);
    setError(null);
    apply(freshState(), false);
  }, [apply]);

  /** Доля пройденного пути — ею заполняется силуэт горного хребта. */
  const fraction = useMemo(() => {
    if (stage === 'done') return 1;
    if (stage !== 'survey') return 0;
    const list = visibleScreens(state.answers);
    const position = list.findIndex((item) => item.id === screen?.id);
    return position <= 0 ? 0 : position / Math.max(1, list.length - 1);
  }, [stage, state.answers, screen?.id]);

  const counter =
    stage === 'survey' && screen?.num
      ? t('progress.question', { n: screen.num, total: TOTAL_QUESTIONS })
      : '';

  // прокрутка: наверх при смене экрана и к первой незаполненной строке при ошибке
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.index, stage]);

  useEffect(() => {
    const first = error?.missingRows?.[0];
    if (first) document.getElementById(first)?.scrollIntoView({ block: 'center' });
  }, [error]);

  if (stage === 'intro') {
    const canResume = Boolean(saved && saved.index > 0 && saved.index < SCREENS.length);
    return (
      <Shell
        fraction={0}
        counter=""
        theme={theme}
        onThemeChange={setTheme}
        bottom={
          <BottomBar
            backLabel={canResume ? t('nav.restart') : undefined}
            onBack={
              canResume
                ? () => {
                    startFresh();
                    setStage('survey');
                  }
                : undefined
            }
            nextLabel={canResume ? t('nav.continue') : t('nav.start')}
            onNext={() => {
              if (canResume && saved) apply(saved, false);
              setStage('survey');
            }}
          />
        }
      >
        <div className="end">
          <h1>{t('intro.title')}</h1>
          <p>{t('intro.text')}</p>
          <p className="hint">{t('intro.hint')}</p>
          {canResume ? <p>{t('intro.resume')}</p> : null}
        </div>
      </Shell>
    );
  }

  if (stage === 'done' || stage === 'declined') {
    const titleKey: TranslationKey = stage === 'done' ? 'done.title' : 'declined.title';
    const textKey: TranslationKey = stage === 'done' ? 'done.text' : 'declined.text';
    return (
      <Shell
        fraction={stage === 'done' ? 1 : 0}
        counter=""
        theme={theme}
        onThemeChange={setTheme}
        bottom={
          <BottomBar
            nextLabel={t('nav.new')}
            onNext={() => {
              setSurveyNumber('');
              setSendFailed(false);
              startFresh();
              setStage('intro');
            }}
          />
        }
      >
        <div className="end">
          <h1>{t(titleKey)}</h1>
          <p>{t(textKey)}</p>
          {stage === 'done' && surveyNumber ? (
            <p className="hint">{t('done.number', { n: surveyNumber })}</p>
          ) : null}
        </div>
      </Shell>
    );
  }

  const nextLabel = sending
    ? t('nav.sending')
    : screen.type === 'submit'
      ? t('nav.submit')
      : t('nav.next');

  return (
    <Shell
      fraction={fraction}
      counter={counter}
      theme={theme}
      onThemeChange={setTheme}
      bottom={
        <BottomBar
          backLabel={state.history.length ? t('nav.back') : undefined}
          onBack={state.history.length ? goBack : undefined}
          nextLabel={nextLabel}
          onNext={goNext}
          nextDisabled={sending}
        />
      }
    >
      <QuestionScreen
        screen={screen}
        answer={answer}
        update={update}
        error={error}
        onAnswered={onAnswered}
      />
      {sendFailed ? (
        <p className="error" role="alert">
          {t('error.send')}
        </p>
      ) : null}
      {/* поле-ловушка для ботов: человек его не видит и не может сфокусировать */}
      <input
        type="text"
        name="company"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
    </Shell>
  );
}

function Shell({
  fraction,
  counter,
  theme,
  onThemeChange,
  bottom,
  children,
}: {
  fraction: number;
  counter: string;
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  bottom: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Header fraction={fraction} counter={counter} theme={theme} onThemeChange={onThemeChange} />
      <main>{children}</main>
      {bottom}
    </>
  );
}
