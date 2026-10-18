import { useI18n } from '../i18n';
import type { OptionDef } from '../survey/types';

type Props = {
  name: string;
  options: OptionDef[];
  multi?: boolean;
  selected: string[];
  otherText?: string;
  onSelect: (values: string[]) => void;
  onOtherChange: (text: string) => void;
};

/** Крупные строки на всю ширину: весь блок кликабелен, внутри настоящий input. */
export function OptionList({
  name,
  options,
  multi,
  selected,
  otherText,
  onSelect,
  onOtherChange,
}: Props) {
  const { t } = useI18n();

  const toggle = (option: OptionDef) => {
    if (!multi) {
      onSelect([option.key]);
      return;
    }
    if (selected.includes(option.key)) {
      onSelect(selected.filter((key) => key !== option.key));
      return;
    }
    if (option.exclusive) {
      onSelect([option.key]);
      return;
    }
    const exclusiveKeys: string[] = options.filter((o) => o.exclusive).map((o) => o.key);
    onSelect([...selected.filter((key) => !exclusiveKeys.includes(key)), option.key]);
  };

  return (
    <div className="options" role={multi ? 'group' : 'radiogroup'} aria-labelledby="question-title">
      {options.map((option) => {
        const id = `${name}-${option.key.replace(/\./g, '-')}`;
        const checked = selected.includes(option.key);
        return (
          <div key={option.key}>
            <label className={multi ? 'option option--check' : 'option'} htmlFor={id}>
              <input
                type={multi ? 'checkbox' : 'radio'}
                id={id}
                name={name}
                checked={checked}
                onChange={() => toggle(option)}
              />
              <span className="option__mark" aria-hidden="true" />
              <span>{t(option.key)}</span>
            </label>
            {option.other && checked ? (
              <input
                type="text"
                className="other"
                style={{ marginTop: 8 }}
                placeholder={t('common.specify')}
                aria-label={t('common.specify')}
                value={otherText ?? ''}
                onChange={(event) => onOtherChange(event.target.value)}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
