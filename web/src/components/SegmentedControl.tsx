import s from './SegmentedControl.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A radio group: one of several mutually exclusive choices, which is what this is —
 *  tablist would promise tab panels that do not exist. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" className={s.group}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={`${s.option} ${on ? s.on : ''}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
