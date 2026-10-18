import { describe, expect, it } from 'vitest';
import { ru } from './ru';
import { ky } from './ky';
import { translate } from './index';
import { SCREENS } from '../survey/config';
import { FOOD_GROUPS, MEASURES } from '../survey/config';

describe('словари', () => {
  it('кыргызский словарь содержит те же ключи, что и русский', () => {
    expect(Object.keys(ky).sort()).toEqual(Object.keys(ru).sort());
  });

  it('ни одно значение не пустое', () => {
    for (const [key, value] of Object.entries(ky)) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('подставляет параметры', () => {
    expect(translate('ru', 'progress.question', { n: 3, total: 24 })).toBe('Вопрос 3 из 24');
    expect(translate('ky', 'progress.question', { n: 3, total: 24 })).toContain('3');
  });

  it('в частях I–III нет слова «соль» ни на одном языке', () => {
    const forbidden = /сол[ьия]|солён|туз/iu;
    const partsIII = SCREENS.filter((screen) => screen.part != null && screen.part <= 3);
    const keys = new Set<string>();
    for (const screen of partsIII) {
      if (screen.titleKey) keys.add(screen.titleKey);
      if (screen.hintKey) keys.add(screen.hintKey);
      if (screen.type === 'single' || screen.type === 'multi') {
        for (const option of screen.options) keys.add(option.key);
      }
      if (screen.type === 'foodYesNo' || screen.type === 'foodFrequency') {
        keys.add(screen.group.titleKey);
        for (const item of screen.group.items) keys.add(item);
      }
    }
    for (const key of ['part.1', 'part.2', 'part.3', 'intro.text', 'consent.title']) keys.add(key);

    for (const key of keys) {
      expect(ru[key as keyof typeof ru], `ru: ${key}`).not.toMatch(forbidden);
      expect(ky[key as keyof typeof ky], `ky: ${key}`).not.toMatch(forbidden);
    }
  });

  it('все ключи продуктов и мер есть в обоих словарях', () => {
    const keys = [...FOOD_GROUPS.flatMap((group) => [group.titleKey, ...group.items]), ...MEASURES];
    for (const key of keys) {
      expect(ru[key]).toBeTruthy();
      expect(ky[key]).toBeTruthy();
    }
  });
});
