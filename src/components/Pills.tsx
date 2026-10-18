import { useI18n, type TranslationKey } from '../i18n';

type Props = {
  name: string;
  options: TranslationKey[];
  value?: string;
  onChange: (value: string) => void;
  grid?: boolean;
  label?: string;
};

/** Ряд крупных кнопок-переключателей (настоящие radio внутри). */
export function Pills({ name, options, value, onChange, grid, label }: Props) {
  const { t } = useI18n();
  return (
    <div className={grid ? 'pills pills--grid' : 'pills'} role="radiogroup" aria-label={label}>
      {options.map((key) => {
        const id = `${name}-${key.replace(/\./g, '-')}`;
        return (
          <label className="pill" key={key} htmlFor={id}>
            <input
              type="radio"
              id={id}
              name={name}
              checked={value === key}
              onChange={() => onChange(key)}
            />
            <span>{t(key)}</span>
          </label>
        );
      })}
    </div>
  );
}
