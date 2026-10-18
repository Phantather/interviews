import { describe, expect, it } from 'vitest';
import { SCREENS } from './config';
import { answerColumns, flatten } from './flatten';
import type { Answers } from './types';

function fullAnswers(overrides: Answers = {}): Answers {
  const answers: Answers = {
    consent: { value: 'consent.yes' },
    q1: { value: 'q1.male' },
    q2: { value: '42' },
    q3: { value: 'q3.kyrgyz' },
    q4: { value: 'q4.bachelor' },
    q5: { value: 'q5.officeWork' },
    q6: { value: 'q6.r10001' },
    q7: { values: ['q7.hypertension', 'q7.kidney'] },
    q8: { value: 'common.no' },
    q9: { value: 'q9.usual' },
    q13: { value: 'often.sometimes' },
    q14: { value: 'often.often' },
    q15: { value: '1,5' },
    q16: { value: 'common.yes' },
    q17: { values: ['q17.pressure'] },
    q18: { dontKnow: true },
    q19: { value: 'q19.normal' },
    q20: { value: 'q20.veryImportant' },
    q21: { value: 'common.yes' },
    q22: {
      measures: {
        'measure.processed': 'common.yes',
        'measure.labels': 'common.no',
        'measure.lowSalt': 'common.no',
        'measure.spices': 'common.yes',
        'measure.eatingOut': 'common.no',
        'measure.addingSalt': 'common.yes',
      },
      other: 'пью больше воды',
    },
    q23: { value: 'q23.yes' },
    q24: { values: ['q24.doctor', 'q24.internet'] },
  };

  for (const screen of SCREENS) {
    if (screen.type === 'meal') {
      answers[screen.id] = { what: 'чай, лепёшка', qty: '1 стакан', source: 'source.home' };
    }
    if (screen.type === 'foodYesNo') {
      answers[screen.id] = {
        foods: Object.fromEntries(
          screen.group.items.map((item) => [item, { ate: 'common.no' }]),
        ),
      };
    }
    if (screen.type === 'foodFrequency') {
      answers[screen.id] = {
        freq: Object.fromEntries(screen.group.items.map((item) => [item, 'freq.week12'])),
      };
    }
  }

  return { ...answers, ...overrides };
}

function asMap(answers: Answers): Map<string, string> {
  return new Map(flatten(answers));
}

describe('flatten', () => {
  it('всегда отдаёт все столбцы в одном и том же порядке', () => {
    const columns = flatten(fullAnswers()).map(([column]) => column);
    expect(columns).toEqual(answerColumns());
    expect(new Set(columns).size).toBe(columns.length);

    const other = flatten(fullAnswers({ q16: { value: 'common.no' } })).map(([column]) => column);
    expect(other).toEqual(columns);
  });

  it('пишет значения по-русски независимо от языка интерфейса', () => {
    const map = asMap(fullAnswers());
    expect(map.get('1. Пол')).toBe('Мужской');
    expect(map.get('3. Национальность')).toBe('Кыргыз/кыргызка');
    expect(map.get('13. Досаливание за столом')).toBe('Иногда');
    expect(map.get('12. Бешбармак')).toBe('1–2 раза в неделю');
  });

  it('несколько ответов соединяет через «; »', () => {
    expect(asMap(fullAnswers()).get('7. Диагнозы')).toBe(
      'Артериальная гипертония; Заболевания почек',
    );
  });

  it('«Другое» записывает вместе с текстом и без пометки «(укажите)»', () => {
    const map = asMap(fullAnswers({ q3: { value: 'q3.other', other: 'Казашка' } }));
    expect(map.get('3. Национальность')).toBe('Другая: Казашка');

    const multi = asMap(
      fullAnswers({ q24: { values: ['q24.tv', 'q24.other'], other: 'мечеть' } }),
    );
    expect(multi.get('24. Источники информации')).toBe('Телевидение / радио; Другое: мечеть');
  });

  it('числа отдаёт с запятой, «Не знаю» — словами', () => {
    const map = asMap(fullAnswers({ q15: { value: '2.5' } }));
    expect(map.get('15. Соль вчера, ч. л.')).toBe('2,5');
    expect(map.get('18. Допустимое количество, ч. л.')).toBe('Не знаю');
    expect(map.get('2. Возраст')).toBe('42');
  });

  it('пропущенные по логике вопросы помечает «Не применимо»', () => {
    const skipped = asMap(fullAnswers({ q16: { value: 'common.no' }, q17: {} }));
    expect(skipped.get('17. Последствия избытка соли')).toBe('Не применимо');

    const noMeasures = asMap(fullAnswers({ q21: { value: 'common.no' }, q22: {} }));
    expect(noMeasures.get('22. Избегаю питания вне дома')).toBe('Не применимо');
    expect(noMeasures.get('22. Другая мера')).toBe('Не применимо');
  });

  it('приём пищи: «Не ел(а)» очищает количество и способ приготовления', () => {
    const map = asMap(fullAnswers({ q10_lunch: { skip: true, what: 'лишнее', qty: '2' } }));
    expect(map.get('10. Обед: что ели')).toBe('Не ел(а)');
    expect(map.get('10. Обед: количество')).toBe('');
    expect(map.get('10. Обед: где приготовлено')).toBe('');
    expect(map.get('10. Завтрак: что ели')).toBe('чай, лепёшка');
    expect(map.get('10. Завтрак: где приготовлено')).toBe('Домашнее');
  });

  it('продукты за вчера: при «Да» сохраняет количество и место приготовления', () => {
    const map = asMap(
      fullAnswers({
        q11_processed: {
          foods: {
            'food.snacks': { ate: 'common.yes', qty: '1 пачка', source: 'source.bought' },
            'food.canned': { ate: 'common.no', qty: 'лишнее', source: 'source.home' },
          },
        },
      }),
    );
    expect(map.get('11. Упакованные снеки (чипсы, сухарики): ели вчера')).toBe('Да');
    expect(map.get('11. Упакованные снеки (чипсы, сухарики): количество')).toBe('1 пачка');
    expect(map.get('11. Упакованные снеки (чипсы, сухарики): где приготовлено')).toBe('Покупное');
    expect(map.get('11. Консервы: ели вчера')).toBe('Нет');
    expect(map.get('11. Консервы: количество')).toBe('');
  });

  it('меры контроля пишет по каждой строке', () => {
    const map = asMap(fullAnswers());
    expect(map.get('22. Ограничиваю потребление обработанных продуктов')).toBe('Да');
    expect(map.get('22. Смотрю на содержание соли/натрия на этикетках')).toBe('Нет');
    expect(map.get('22. Другая мера')).toBe('пью больше воды');
  });
});
