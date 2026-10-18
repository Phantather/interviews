import type { TranslationKey } from '../i18n/ru';
import type { Answer, Screen } from './types';

export type ValidationError = {
  messageKey: TranslationKey;
  params?: Record<string, string | number>;
  /** id строк таблицы, оставшихся без ответа */
  missingRows?: string[];
};

/** id строки внутри табличных вопросов — для подсветки и прокрутки. */
export function rowId(screenId: string, itemKey: string): string {
  return `row-${screenId}-${itemKey.replace(/\./g, '-')}`;
}

export function validate(screen: Screen, answer: Answer = {}): ValidationError | null {
  switch (screen.type) {
    case 'consent':
      return answer.value ? null : { messageKey: 'error.single' };

    case 'single': {
      if (!answer.value) return { messageKey: 'error.single' };
      const chosen = screen.options.find((o) => o.key === answer.value);
      if (chosen?.other && !(answer.other ?? '').trim()) return { messageKey: 'error.other' };
      return null;
    }

    case 'multi': {
      const values = answer.values ?? [];
      if (values.length === 0) return { messageKey: 'error.multi' };
      const needsOther = screen.options.some((o) => o.other && values.includes(o.key));
      if (needsOther && !(answer.other ?? '').trim()) return { messageKey: 'error.other' };
      return null;
    }

    case 'number': {
      if (answer.dontKnow) return null;
      const raw = (answer.value ?? '').replace(',', '.').trim();
      if (!raw) {
        return { messageKey: screen.allowDontKnow ? 'error.numberOrDk' : 'error.number' };
      }
      const num = Number(raw);
      const bad =
        !Number.isFinite(num) ||
        num < screen.min ||
        num > screen.max ||
        (screen.integer && !Number.isInteger(num));
      if (bad) {
        return {
          messageKey: screen.rangeErrorKey ?? 'error.numberRange',
          params: { min: screen.min, max: screen.max },
        };
      }
      return null;
    }

    case 'meal':
      if (!answer.skip && !(answer.what ?? '').trim()) return { messageKey: 'error.meal' };
      return null;

    case 'foodYesNo': {
      const missing = screen.group.items
        .filter((item) => !answer.foods?.[item]?.ate)
        .map((item) => rowId(screen.id, item));
      return missing.length ? { messageKey: 'error.food', missingRows: missing } : null;
    }

    case 'foodFrequency': {
      const missing = screen.group.items
        .filter((item) => !answer.freq?.[item])
        .map((item) => rowId(screen.id, item));
      return missing.length ? { messageKey: 'error.freq', missingRows: missing } : null;
    }

    case 'measures': {
      const missing = screen.items
        .filter((item) => !answer.measures?.[item])
        .map((item) => rowId(screen.id, item));
      return missing.length ? { messageKey: 'error.measures', missingRows: missing } : null;
    }

    case 'submit':
      return null;
  }
}
