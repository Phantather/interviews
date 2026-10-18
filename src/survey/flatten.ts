import { ru } from '../i18n/ru';
import { SCREENS, isVisible } from './config';
import type { Answers, Screen } from './types';

export const NOT_APPLICABLE = 'Не применимо';
export const DONT_KNOW = 'Не знаю';
export const NOT_EATEN = 'Не ел(а)';

export type Pair = [column: string, value: string];

/**
 * Русское значение варианта для таблицы. Берётся по ключу из русского словаря,
 * поэтому не зависит от языка интерфейса. Пометка «(укажите)» в таблицу не идёт.
 */
export function sheetLabel(key: string): string {
  const text = (ru as Record<string, string>)[key];
  if (!text) return key;
  return text.replace(/\s*\(укажите\)$/u, '');
}

function withOther(key: string, other: string | undefined, isOther: boolean): string {
  const label = sheetLabel(key);
  return isOther ? `${label}: ${(other ?? '').trim()}` : label;
}

function formatNumber(value: string | undefined): string {
  return (value ?? '').trim().replace('.', ',');
}

/** Столбцы одного приёма пищи: «10. Завтрак: что ели» и т. д. */
export function mealColumns(meal: string): [string, string, string] {
  const prefix = `10. ${sheetLabel(`meal.${meal}`)}`;
  return [`${prefix}: что ели`, `${prefix}: количество`, `${prefix}: где приготовлено`];
}

/**
 * Собирает анкету в список пар [название столбца, значение].
 * Порядок столбцов всегда одинаковый, пропущенные по логике вопросы
 * записываются как «Не применимо».
 */
export function flatten(answers: Answers, screens: Screen[] = SCREENS): Pair[] {
  const out: Pair[] = [];
  const put = (column: string, value: string | undefined) => out.push([column, value ?? '']);

  for (const screen of screens) {
    const answer = answers[screen.id] ?? {};
    const shown = isVisible(screen, answers);

    switch (screen.type) {
      case 'single': {
        if (!shown) {
          put(screen.column, NOT_APPLICABLE);
          break;
        }
        const chosen = screen.options.find((o) => o.key === answer.value);
        put(screen.column, chosen ? withOther(chosen.key, answer.other, Boolean(chosen.other)) : '');
        break;
      }

      case 'multi': {
        if (!shown) {
          put(screen.column, NOT_APPLICABLE);
          break;
        }
        const values = answer.values ?? [];
        const text = screen.options
          .filter((o) => values.includes(o.key))
          .map((o) => withOther(o.key, answer.other, Boolean(o.other)))
          .join('; ');
        put(screen.column, text);
        break;
      }

      case 'number': {
        if (!shown) {
          put(screen.column, NOT_APPLICABLE);
          break;
        }
        put(screen.column, answer.dontKnow ? DONT_KNOW : formatNumber(answer.value));
        break;
      }

      case 'meal': {
        const [whatCol, qtyCol, sourceCol] = mealColumns(screen.meal);
        if (!shown) {
          put(whatCol, NOT_APPLICABLE);
          put(qtyCol, NOT_APPLICABLE);
          put(sourceCol, NOT_APPLICABLE);
          break;
        }
        put(whatCol, answer.skip ? NOT_EATEN : (answer.what ?? '').trim());
        put(qtyCol, answer.skip ? '' : (answer.qty ?? '').trim());
        put(sourceCol, answer.skip ? '' : answer.source ? sheetLabel(answer.source) : '');
        break;
      }

      case 'foodYesNo': {
        for (const item of screen.group.items) {
          const name = sheetLabel(item);
          const row = answer.foods?.[item] ?? {};
          if (!shown) {
            put(`11. ${name}: ели вчера`, NOT_APPLICABLE);
            put(`11. ${name}: количество`, NOT_APPLICABLE);
            put(`11. ${name}: где приготовлено`, NOT_APPLICABLE);
            continue;
          }
          const ate = row.ate ? sheetLabel(row.ate) : '';
          put(`11. ${name}: ели вчера`, ate);
          put(`11. ${name}: количество`, row.ate === 'common.yes' ? (row.qty ?? '').trim() : '');
          put(
            `11. ${name}: где приготовлено`,
            row.ate === 'common.yes' && row.source ? sheetLabel(row.source) : '',
          );
        }
        break;
      }

      case 'foodFrequency': {
        for (const item of screen.group.items) {
          const name = sheetLabel(item);
          const value = answer.freq?.[item];
          put(`12. ${name}`, !shown ? NOT_APPLICABLE : value ? sheetLabel(value) : '');
        }
        break;
      }

      case 'measures': {
        for (const item of screen.items) {
          const value = answer.measures?.[item];
          put(`22. ${sheetLabel(item)}`, !shown ? NOT_APPLICABLE : value ? sheetLabel(value) : '');
        }
        put('22. Другая мера', !shown ? NOT_APPLICABLE : (answer.other ?? '').trim());
        break;
      }

      case 'consent':
      case 'submit':
        break;
    }
  }

  return out;
}

/** Полный список столбцов ответов в правильном порядке (для шапки и тестов). */
export function answerColumns(): string[] {
  const columns: string[] = [];
  for (const screen of SCREENS) {
    switch (screen.type) {
      case 'single':
      case 'multi':
      case 'number':
        columns.push(screen.column);
        break;
      case 'meal':
        columns.push(...mealColumns(screen.meal));
        break;
      case 'foodYesNo':
        for (const item of screen.group.items) {
          const name = sheetLabel(item);
          columns.push(
            `11. ${name}: ели вчера`,
            `11. ${name}: количество`,
            `11. ${name}: где приготовлено`,
          );
        }
        break;
      case 'foodFrequency':
        for (const item of screen.group.items) columns.push(`12. ${sheetLabel(item)}`);
        break;
      case 'measures':
        for (const item of screen.items) columns.push(`22. ${sheetLabel(item)}`);
        columns.push('22. Другая мера');
        break;
      default:
        break;
    }
  }
  return columns;
}
