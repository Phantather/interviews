import { useI18n, type TranslationKey } from '../i18n';
import { FREQ_OPTIONS, SOURCE_OPTIONS, YES_NO } from '../survey/config';
import type { Answer, OptionDef, Screen } from '../survey/types';
import { rowId, type ValidationError } from '../survey/validate';
import { OptionList } from './OptionList';
import { Pills } from './Pills';

const CONSENT_OPTIONS: OptionDef[] = [{ key: 'consent.yes' }, { key: 'consent.no' }];

type Props = {
  screen: Screen;
  answer: Answer;
  update: (updater: (prev: Answer) => Answer) => void;
  error: ValidationError | null;
  /** вызывается после выбора одиночного ответа (кроме «Другое») */
  onAnswered: () => void;
};

export function QuestionScreen({ screen, answer, update, error, onAnswered }: Props) {
  const { t } = useI18n();
  const missing = new Set(error?.missingRows ?? []);

  const head = (partKey?: TranslationKey, sub?: string) => (
    <>
      {partKey ? (
        <div className="part">
          {t(partKey)}
          {sub ? ` · ${sub}` : ''}
        </div>
      ) : null}
      {screen.titleKey ? <h1 id="question-title">{t(screen.titleKey)}</h1> : null}
      {screen.hintKey ? <p className="hint">{t(screen.hintKey)}</p> : null}
    </>
  );

  const partKey = screen.part ? (`part.${screen.part}` as TranslationKey) : undefined;

  const body = () => {
    switch (screen.type) {
      case 'consent':
        return (
          <>
            <div className="part">{t('consent.part')}</div>
            <h1 id="question-title">{t('consent.title')}</h1>
            <p className="hint">{t('consent.hint')}</p>
            <OptionList
              name="consent"
              options={CONSENT_OPTIONS}
              selected={answer.value ? [answer.value] : []}
              onSelect={(values) => {
                update((prev) => ({ ...prev, value: values[0] }));
                onAnswered();
              }}
              onOtherChange={() => undefined}
            />
          </>
        );

      case 'single': {
        const options = screen.options;
        return (
          <>
            {head(partKey)}
            <OptionList
              name={screen.id}
              options={options}
              selected={answer.value ? [answer.value] : []}
              otherText={answer.other}
              onSelect={(values) => {
                const key = values[0];
                update((prev) => ({ ...prev, value: key }));
                if (!options.find((o) => o.key === key)?.other) onAnswered();
              }}
              onOtherChange={(text) => update((prev) => ({ ...prev, other: text }))}
            />
          </>
        );
      }

      case 'multi':
        return (
          <>
            {head(partKey)}
            <OptionList
              name={screen.id}
              options={screen.options}
              multi
              selected={answer.values ?? []}
              otherText={answer.other}
              onSelect={(values) => update((prev) => ({ ...prev, values }))}
              onOtherChange={(text) => update((prev) => ({ ...prev, other: text }))}
            />
          </>
        );

      case 'number':
        return (
          <>
            {head(partKey)}
            <div className="numrow">
              <input
                type="text"
                inputMode={screen.integer ? 'numeric' : 'decimal'}
                autoComplete="off"
                aria-labelledby="question-title"
                disabled={Boolean(answer.dontKnow)}
                value={answer.value ?? ''}
                onChange={(event) => update((prev) => ({ ...prev, value: event.target.value }))}
              />
              <span className="unit">{t(screen.unitKey)}</span>
            </div>
            {screen.allowDontKnow ? (
              <div className="options" style={{ marginTop: 16 }}>
                <label className="option option--check" htmlFor={`${screen.id}-dk`}>
                  <input
                    type="checkbox"
                    id={`${screen.id}-dk`}
                    checked={Boolean(answer.dontKnow)}
                    onChange={(event) =>
                      update((prev) => ({
                        ...prev,
                        dontKnow: event.target.checked,
                        value: event.target.checked ? '' : prev.value,
                      }))
                    }
                  />
                  <span className="option__mark" aria-hidden="true" />
                  <span>{t('common.dontKnow')}</span>
                </label>
              </div>
            ) : null}
          </>
        );

      case 'meal': {
        const skipKey: TranslationKey = screen.meal === 'snacks' ? 'meal.skipSnacks' : 'meal.skip';
        return (
          <>
            {head(partKey, t('meal.sub', { i: screen.index }))}
            <div className="options">
              <label className="option option--check" htmlFor={`${screen.id}-skip`}>
                <input
                  type="checkbox"
                  id={`${screen.id}-skip`}
                  checked={Boolean(answer.skip)}
                  onChange={(event) => update((prev) => ({ ...prev, skip: event.target.checked }))}
                />
                <span className="option__mark" aria-hidden="true" />
                <span>{t(skipKey)}</span>
              </label>
            </div>
            {!answer.skip ? (
              <>
                <div className="field">
                  <label htmlFor={`${screen.id}-what`}>{t('field.what')}</label>
                </div>
                <textarea
                  id={`${screen.id}-what`}
                  placeholder={t('field.whatPlaceholder')}
                  value={answer.what ?? ''}
                  onChange={(event) => update((prev) => ({ ...prev, what: event.target.value }))}
                />
                <div className="field">
                  <label htmlFor={`${screen.id}-qty`}>{t('field.qty')}</label>
                </div>
                <input
                  type="text"
                  id={`${screen.id}-qty`}
                  placeholder={t('field.qtyPlaceholder')}
                  value={answer.qty ?? ''}
                  onChange={(event) => update((prev) => ({ ...prev, qty: event.target.value }))}
                />
                <div className="field">{t('field.source')}</div>
                <Pills
                  name={`${screen.id}-source`}
                  options={SOURCE_OPTIONS}
                  value={answer.source}
                  onChange={(value) => update((prev) => ({ ...prev, source: value }))}
                  label={t('field.source')}
                />
              </>
            ) : null}
          </>
        );
      }

      case 'foodYesNo':
        return (
          <>
            {head(partKey, t(screen.group.titleKey))}
            {screen.group.items.map((item) => {
              const id = rowId(screen.id, item);
              const row = answer.foods?.[item] ?? {};
              return (
                <div key={item} id={id} className={missing.has(id) ? 'row row--missing' : 'row'}>
                  <div className="row__name">{t(item)}</div>
                  <Pills
                    name={`${screen.id}-${item}`}
                    options={YES_NO}
                    value={row.ate}
                    onChange={(value) =>
                      update((prev) => ({
                        ...prev,
                        foods: {
                          ...prev.foods,
                          [item]:
                            value === 'common.yes'
                              ? { ...prev.foods?.[item], ate: value }
                              : { ate: value },
                        },
                      }))
                    }
                    label={t(item)}
                  />
                  {row.ate === 'common.yes' ? (
                    <div className="row__more">
                      <input
                        type="text"
                        placeholder={t('field.qty')}
                        aria-label={`${t('field.qty')}: ${t(item)}`}
                        value={row.qty ?? ''}
                        onChange={(event) =>
                          update((prev) => ({
                            ...prev,
                            foods: {
                              ...prev.foods,
                              [item]: { ...prev.foods?.[item], qty: event.target.value },
                            },
                          }))
                        }
                      />
                      <Pills
                        name={`${screen.id}-${item}-source`}
                        options={SOURCE_OPTIONS}
                        value={row.source}
                        onChange={(value) =>
                          update((prev) => ({
                            ...prev,
                            foods: {
                              ...prev.foods,
                              [item]: { ...prev.foods?.[item], source: value },
                            },
                          }))
                        }
                        label={`${t('field.source')}: ${t(item)}`}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </>
        );

      case 'foodFrequency':
        return (
          <>
            {head(partKey, t(screen.group.titleKey))}
            {screen.group.items.map((item) => {
              const id = rowId(screen.id, item);
              return (
                <div key={item} id={id} className={missing.has(id) ? 'row row--missing' : 'row'}>
                  <div className="row__name">{t(item)}</div>
                  <Pills
                    name={`${screen.id}-${item}`}
                    options={FREQ_OPTIONS}
                    value={answer.freq?.[item]}
                    onChange={(value) =>
                      update((prev) => ({ ...prev, freq: { ...prev.freq, [item]: value } }))
                    }
                    grid
                    label={t(item)}
                  />
                </div>
              );
            })}
          </>
        );

      case 'measures':
        return (
          <>
            {head(partKey)}
            {screen.items.map((item) => {
              const id = rowId(screen.id, item);
              return (
                <div key={item} id={id} className={missing.has(id) ? 'row row--missing' : 'row'}>
                  <div className="row__name">{t(item)}</div>
                  <Pills
                    name={`${screen.id}-${item}`}
                    options={YES_NO}
                    value={answer.measures?.[item]}
                    onChange={(value) =>
                      update((prev) => ({ ...prev, measures: { ...prev.measures, [item]: value } }))
                    }
                    label={t(item)}
                  />
                </div>
              );
            })}
            <div className="field">
              <label htmlFor={`${screen.id}-other`}>{t('q22.other')}</label>
            </div>
            <input
              type="text"
              id={`${screen.id}-other`}
              value={answer.other ?? ''}
              onChange={(event) => update((prev) => ({ ...prev, other: event.target.value }))}
            />
          </>
        );

      case 'submit':
        return (
          <>
            <div className="part">{t('submit.part')}</div>
            <h1 id="question-title">{t('submit.title')}</h1>
            <p className="hint">{t('submit.hint')}</p>
          </>
        );
    }
  };

  return (
    <>
      {body()}
      <div className="error" role="alert">
        {error ? t(error.messageKey, error.params) : ''}
      </div>
    </>
  );
}
