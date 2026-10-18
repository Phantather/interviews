import type { TranslationKey } from '../i18n/ru';

/** Ответ на один экран. Ключи вариантов — ключи словаря, не переведённый текст. */
export type Answer = {
  /** single / number: выбранный ключ варианта либо введённое число */
  value?: string;
  /** multi: выбранные ключи вариантов */
  values?: string[];
  /** текст для варианта «Другое» или свободное поле в мерах */
  other?: string;
  /** number: отмечено «Не знаю» */
  dontKnow?: boolean;
  /** meal: «Не ел(а) в это время» */
  skip?: boolean;
  /** meal */
  what?: string;
  qty?: string;
  source?: string;
  /** foodYesNo: ключ продукта → ответ */
  foods?: Record<string, { ate?: string; qty?: string; source?: string }>;
  /** foodFrequency: ключ продукта → ключ варианта частоты */
  freq?: Record<string, string>;
  /** measures: ключ меры → 'common.yes' | 'common.no' */
  measures?: Record<string, string>;
};

export type Answers = Record<string, Answer>;

export type OptionDef = {
  /** ключ словаря; он же определяет русское значение для таблицы */
  key: TranslationKey;
  /** показывает поле «Укажите», которое становится обязательным */
  other?: boolean;
  /** исключающий вариант: снимает остальные и снимается сам */
  exclusive?: boolean;
};

export type FoodGroup = {
  id: string;
  titleKey: TranslationKey;
  items: TranslationKey[];
};

export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

type Base = {
  id: string;
  /** номер вопроса в анкете (1–24); у служебных экранов его нет */
  num?: number;
  /** номер части (1–8) */
  part?: number;
  titleKey?: TranslationKey;
  hintKey?: TranslationKey;
  /** условие показа экрана; экраны без него показываются всегда */
  when?: (answers: Answers) => boolean;
};

export type Screen =
  | (Base & { type: 'consent' })
  | (Base & { type: 'submit' })
  | (Base & { type: 'single'; column: string; options: OptionDef[] })
  | (Base & { type: 'multi'; column: string; options: OptionDef[] })
  | (Base & {
      type: 'number';
      column: string;
      unitKey: TranslationKey;
      min: number;
      max: number;
      integer?: boolean;
      allowDontKnow?: boolean;
      /** своё сообщение об ошибке диапазона */
      rangeErrorKey?: TranslationKey;
    })
  | (Base & { type: 'meal'; meal: MealId; index: number })
  | (Base & { type: 'foodYesNo'; group: FoodGroup })
  | (Base & { type: 'foodFrequency'; group: FoodGroup })
  | (Base & { type: 'measures'; items: TranslationKey[] });

export type ScreenType = Screen['type'];
