import type { TranslationKey } from '../i18n/ru';
import type { Answers, FoodGroup, MealId, OptionDef, Screen } from './types';

export const TOTAL_QUESTIONS = 24;

const opt = (key: TranslationKey, extra?: Omit<OptionDef, 'key'>): OptionDef => ({ key, ...extra });

/** Шкалы, которые повторяются в нескольких вопросах. */
export const YES_NO: TranslationKey[] = ['common.yes', 'common.no'];

export const SOURCE_OPTIONS: TranslationKey[] = ['source.home', 'source.bought', 'source.both'];

export const FREQ_OPTIONS: TranslationKey[] = [
  'freq.daily',
  'freq.week36',
  'freq.week12',
  'freq.month13',
  'freq.monthRare',
  'freq.never',
];

const OFTEN_OPTIONS: OptionDef[] = [
  opt('often.always'),
  opt('often.often'),
  opt('often.sometimes'),
  opt('often.rarely'),
  opt('often.never'),
  opt('often.dontKnow'),
];

const YES_NO_DK: OptionDef[] = [opt('common.yes'), opt('common.no'), opt('common.dontKnow')];

export const MEALS: MealId[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export const MEASURES: TranslationKey[] = [
  'measure.processed',
  'measure.labels',
  'measure.lowSalt',
  'measure.spices',
  'measure.eatingOut',
  'measure.addingSalt',
];

export const FOOD_GROUPS: FoodGroup[] = [
  {
    id: 'processed',
    titleKey: 'group.processed',
    items: [
      'food.snacks',
      'food.canned',
      'food.noodles',
      'food.sausage',
      'food.mayonnaise',
      'food.fastfood',
    ],
  },
  {
    id: 'dairy',
    titleKey: 'group.dairy',
    items: ['food.kurut', 'food.chalap', 'food.kymyz'],
  },
  {
    id: 'meat',
    titleKey: 'group.meat',
    items: [
      'food.chuchuk',
      'food.beshbarmak',
      'food.shorpo',
      'food.lagman',
      'food.manty',
      'food.ashlyamfu',
    ],
  },
  {
    id: 'pickles',
    titleKey: 'group.pickles',
    items: ['food.sauerkraut', 'food.tomatoes', 'food.cucumbers', 'food.carrotSalad'],
  },
];

/**
 * Все экраны анкеты в порядке показа. Переходы описаны условием `when`,
 * а не ветвлениями в компонентах.
 */
export const SCREENS: Screen[] = [
  { id: 'consent', type: 'consent' },

  // ---------- Часть I. Общая информация ----------
  {
    id: 'q1',
    num: 1,
    part: 1,
    type: 'single',
    column: '1. Пол',
    titleKey: 'q1.title',
    options: [opt('q1.male'), opt('q1.female')],
  },
  {
    id: 'q2',
    num: 2,
    part: 1,
    type: 'number',
    column: '2. Возраст',
    titleKey: 'q2.title',
    unitKey: 'q2.unit',
    min: 18,
    max: 100,
    integer: true,
    rangeErrorKey: 'error.age',
  },
  {
    id: 'q3',
    num: 3,
    part: 1,
    type: 'single',
    column: '3. Национальность',
    titleKey: 'q3.title',
    options: [opt('q3.kyrgyz'), opt('q3.uzbek'), opt('q3.russian'), opt('q3.other', { other: true })],
  },
  {
    id: 'q4',
    num: 4,
    part: 1,
    type: 'single',
    column: '4. Образование',
    titleKey: 'q4.title',
    options: [
      opt('q4.primary'),
      opt('q4.secondary'),
      opt('q4.vocational'),
      opt('q4.bachelor'),
      opt('q4.master'),
    ],
  },
  {
    id: 'q5',
    num: 5,
    part: 1,
    type: 'single',
    column: '5. Род занятий',
    titleKey: 'q5.title',
    options: [
      opt('q5.officeWork'),
      opt('q5.manualWork'),
      opt('q5.business'),
      opt('q5.temporary'),
      opt('q5.unemployed'),
      opt('q5.homemaker'),
      opt('q5.retired'),
      opt('q5.student'),
    ],
  },
  {
    id: 'q6',
    num: 6,
    part: 1,
    type: 'single',
    column: '6. Доход на члена семьи, сом',
    titleKey: 'q6.title',
    options: [
      opt('q6.lt5000'),
      opt('q6.r5000'),
      opt('q6.r10001'),
      opt('q6.r20001'),
      opt('q6.gt30000'),
      opt('q6.refuse'),
    ],
  },
  {
    id: 'q7',
    num: 7,
    part: 1,
    type: 'multi',
    column: '7. Диагнозы',
    titleKey: 'q7.title',
    hintKey: 'common.multiHint',
    options: [
      opt('q7.hypertension'),
      opt('q7.diabetes'),
      opt('q7.kidney'),
      opt('q7.heart'),
      opt('q7.stomach'),
      opt('q7.osteoporosis'),
      opt('q7.other', { other: true }),
      opt('q7.none', { exclusive: true }),
      opt('q7.dontKnow', { exclusive: true }),
    ],
  },
  {
    id: 'q8',
    num: 8,
    part: 1,
    type: 'single',
    column: '8. Лекарства от давления',
    titleKey: 'q8.title',
    options: YES_NO_DK,
  },

  // ---------- Часть II. Питание за прошедшие сутки ----------
  {
    id: 'q9',
    num: 9,
    part: 2,
    type: 'single',
    column: '9. Обычный день',
    titleKey: 'q9.title',
    options: [
      opt('q9.usual'),
      opt('q9.holiday'),
      opt('q9.illness'),
      opt('q9.fasting'),
      opt('q9.other', { other: true }),
    ],
  },
  ...MEALS.map(
    (meal, index): Screen => ({
      id: `q10_${meal}`,
      num: 10,
      part: 2,
      type: 'meal',
      meal,
      index: index + 1,
      titleKey: `meal.${meal}.title` as TranslationKey,
      hintKey: meal === 'breakfast' ? ('meal.breakfast.hint' as TranslationKey) : undefined,
    }),
  ),
  ...FOOD_GROUPS.map(
    (group): Screen => ({
      id: `q11_${group.id}`,
      num: 11,
      part: 2,
      type: 'foodYesNo',
      group,
      titleKey: 'q11.title',
    }),
  ),

  // ---------- Часть III. Частота употребления продуктов ----------
  ...FOOD_GROUPS.map(
    (group): Screen => ({
      id: `q12_${group.id}`,
      num: 12,
      part: 3,
      type: 'foodFrequency',
      group,
      titleKey: 'q12.title',
    }),
  ),

  // ---------- Часть IV. Добавление соли и оценка её потребления ----------
  {
    id: 'q13',
    num: 13,
    part: 4,
    type: 'single',
    column: '13. Досаливание за столом',
    titleKey: 'q13.title',
    options: OFTEN_OPTIONS,
  },
  {
    id: 'q14',
    num: 14,
    part: 4,
    type: 'single',
    column: '14. Соль при готовке',
    titleKey: 'q14.title',
    options: OFTEN_OPTIONS,
  },
  {
    id: 'q15',
    num: 15,
    part: 4,
    type: 'number',
    column: '15. Соль вчера, ч. л.',
    titleKey: 'q15.title',
    hintKey: 'q15.hint',
    unitKey: 'unit.teaspoons',
    min: 0,
    max: 30,
    allowDontKnow: true,
  },

  // ---------- Часть V. Знания о соли и связанных заболеваниях ----------
  {
    id: 'q16',
    num: 16,
    part: 5,
    type: 'single',
    column: '16. Избыток соли вреден',
    titleKey: 'q16.title',
    options: YES_NO_DK,
  },
  {
    id: 'q17',
    num: 17,
    part: 5,
    type: 'multi',
    column: '17. Последствия избытка соли',
    titleKey: 'q17.title',
    hintKey: 'common.multiHint',
    options: [
      opt('q17.pressure'),
      opt('q17.kidney'),
      opt('q17.heart'),
      opt('q17.cancer'),
      opt('q17.osteoporosis'),
      opt('q17.other', { other: true }),
      opt('q17.dontKnow', { exclusive: true }),
    ],
    // при ответе «Нет» на вопрос 16 вопрос 17 пропускается
    when: (answers: Answers) => answers.q16?.value !== 'common.no',
  },
  {
    id: 'q18',
    num: 18,
    part: 5,
    type: 'number',
    column: '18. Допустимое количество, ч. л.',
    titleKey: 'q18.title',
    hintKey: 'q18.hint',
    unitKey: 'unit.teaspoons',
    min: 0,
    max: 30,
    allowDontKnow: true,
  },

  // ---------- Часть VI. Самооценка и отношение к проблеме ----------
  {
    id: 'q19',
    num: 19,
    part: 6,
    type: 'single',
    column: '19. Самооценка потребления',
    titleKey: 'q19.title',
    options: [
      opt('q19.tooMuch'),
      opt('q19.much'),
      opt('q19.normal'),
      opt('q19.little'),
      opt('q19.tooLittle'),
      opt('q19.dontKnow'),
    ],
  },
  {
    id: 'q20',
    num: 20,
    part: 6,
    type: 'single',
    column: '20. Важность снижения',
    titleKey: 'q20.title',
    options: [
      opt('q20.veryImportant'),
      opt('q20.somewhat'),
      opt('q20.notImportant'),
      opt('q20.dontKnow'),
    ],
  },

  // ---------- Часть VII. Контроль потребления соли ----------
  {
    id: 'q21',
    num: 21,
    part: 7,
    type: 'single',
    column: '21. Контролирует потребление',
    titleKey: 'q21.title',
    options: YES_NO_DK,
  },
  {
    id: 'q22',
    num: 22,
    part: 7,
    type: 'measures',
    titleKey: 'q22.title',
    hintKey: 'common.rowHint',
    items: MEASURES,
    // вопрос 22 показывается только при ответе «Да» на вопрос 21
    when: (answers: Answers) => answers.q21?.value === 'common.yes',
  },

  // ---------- Часть VIII. Источники информации ----------
  {
    id: 'q23',
    num: 23,
    part: 8,
    type: 'single',
    column: '23. Рекомендации врача',
    titleKey: 'q23.title',
    options: [opt('q23.yes'), opt('q23.no'), opt('q23.dontRemember')],
  },
  {
    id: 'q24',
    num: 24,
    part: 8,
    type: 'multi',
    column: '24. Источники информации',
    titleKey: 'q24.title',
    hintKey: 'common.multiHint',
    options: [
      opt('q24.doctor'),
      opt('q24.tv'),
      opt('q24.internet'),
      opt('q24.family'),
      opt('q24.press'),
      opt('q24.other', { other: true }),
      opt('q24.none', { exclusive: true }),
    ],
  },

  { id: 'submit', type: 'submit' },
];

export function isVisible(screen: Screen, answers: Answers): boolean {
  return !screen.when || screen.when(answers);
}

export function visibleScreens(answers: Answers): Screen[] {
  return SCREENS.filter((screen) => isVisible(screen, answers));
}

/** Следующий видимый экран после `index`; -1, если дальше ничего нет. */
export function nextIndex(index: number, answers: Answers): number {
  for (let i = index + 1; i < SCREENS.length; i += 1) {
    if (isVisible(SCREENS[i], answers)) return i;
  }
  return -1;
}

/** Предыдущий видимый экран перед `index`; -1, если это первый экран. */
export function prevIndex(index: number, answers: Answers): number {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (isVisible(SCREENS[i], answers)) return i;
  }
  return -1;
}
