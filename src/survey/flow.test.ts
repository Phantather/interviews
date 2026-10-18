import { describe, expect, it } from 'vitest';
import { SCREENS, isVisible, nextIndex, prevIndex, visibleScreens } from './config';
import { validate } from './validate';
import type { Answers } from './types';

const indexOf = (id: string) => SCREENS.findIndex((screen) => screen.id === id);
const idAfter = (id: string, answers: Answers) => SCREENS[nextIndex(indexOf(id), answers)].id;
const idBefore = (id: string, answers: Answers) => SCREENS[prevIndex(indexOf(id), answers)].id;

describe('переходы между вопросами', () => {
  it('16 → 17, если избыток соли считают вредным', () => {
    expect(idAfter('q16', { q16: { value: 'common.yes' } })).toBe('q17');
    expect(idAfter('q16', { q16: { value: 'common.dontKnow' } })).toBe('q17');
  });

  it('16 → 18 при ответе «Нет»', () => {
    const answers: Answers = { q16: { value: 'common.no' } };
    expect(idAfter('q16', answers)).toBe('q18');
    expect(isVisible(SCREENS[indexOf('q17')], answers)).toBe(false);
    expect(idBefore('q18', answers)).toBe('q16');
  });

  it('21 → 22 только при ответе «Да»', () => {
    expect(idAfter('q21', { q21: { value: 'common.yes' } })).toBe('q22');
  });

  it('21 → 23 при «Нет» и «Не знаю»', () => {
    for (const value of ['common.no', 'common.dontKnow']) {
      const answers: Answers = { q21: { value } };
      expect(idAfter('q21', answers)).toBe('q23');
      expect(isVisible(SCREENS[indexOf('q22')], answers)).toBe(false);
    }
  });

  it('последний экран — отправка, после него переходов нет', () => {
    expect(SCREENS[SCREENS.length - 1].id).toBe('submit');
    expect(nextIndex(SCREENS.length - 1, {})).toBe(-1);
    expect(prevIndex(0, {})).toBe(-1);
  });

  it('полный путь длиннее короткого ровно на два экрана', () => {
    const full = visibleScreens({ q16: { value: 'common.yes' }, q21: { value: 'common.yes' } });
    const short = visibleScreens({ q16: { value: 'common.no' }, q21: { value: 'common.no' } });
    expect(full.length - short.length).toBe(2);
  });

  it('в анкете ровно 24 пронумерованных вопроса', () => {
    const numbers = new Set(
      SCREENS.map((screen) => screen.num).filter((num): num is number => typeof num === 'number'),
    );
    expect(numbers.size).toBe(24);
    expect(Math.max(...numbers)).toBe(24);
  });
});

describe('проверка ответов', () => {
  it('требует выбрать вариант и заполнить «Другое»', () => {
    const q3 = SCREENS[indexOf('q3')];
    expect(validate(q3, {})?.messageKey).toBe('error.single');
    expect(validate(q3, { value: 'q3.other' })?.messageKey).toBe('error.other');
    expect(validate(q3, { value: 'q3.other', other: 'Казашка' })).toBeNull();
  });

  it('проверяет диапазон возраста', () => {
    const q2 = SCREENS[indexOf('q2')];
    expect(validate(q2, { value: '17' })?.messageKey).toBe('error.age');
    expect(validate(q2, { value: '42,5' })?.messageKey).toBe('error.age');
    expect(validate(q2, { value: '42' })).toBeNull();
  });

  it('в числовых вопросах принимает «Не знаю» и дробные числа', () => {
    const q15 = SCREENS[indexOf('q15')];
    expect(validate(q15, {})?.messageKey).toBe('error.numberOrDk');
    expect(validate(q15, { dontKnow: true })).toBeNull();
    expect(validate(q15, { value: '1,5' })).toBeNull();
    expect(validate(q15, { value: '31' })?.messageKey).toBe('error.numberRange');
  });

  it('подсвечивает незаполненные строки таблиц', () => {
    const q12 = SCREENS[indexOf('q12_dairy')];
    const problem = validate(q12, { freq: { 'food.kurut': 'freq.never' } });
    expect(problem?.messageKey).toBe('error.freq');
    expect(problem?.missingRows).toEqual(['row-q12_dairy-food-chalap', 'row-q12_dairy-food-kymyz']);
  });

  it('приём пищи: без текста нужен флажок «не ел(а)»', () => {
    const meal = SCREENS[indexOf('q10_breakfast')];
    expect(validate(meal, {})?.messageKey).toBe('error.meal');
    expect(validate(meal, { skip: true })).toBeNull();
    expect(validate(meal, { what: 'чай' })).toBeNull();
  });
});
