import { useEffect, useState } from 'react';

interface Props {
  id: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  hasError?: boolean;
}

export default function SelectOrOther({ id, value, options, onChange, onBlur, placeholder, hasError }: Props) {
  const isKnownValue = value === '' || options.includes(value);
  const [mode, setMode] = useState<'select' | 'other'>(isKnownValue ? 'select' : 'other');

  // Keep mode in sync if the value is changed from outside (e.g. edit mode load)
  useEffect(() => {
    setMode(value === '' || options.includes(value) ? 'select' : 'other');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value === '' || options.includes(value)]);

  if (mode === 'other') {
    return (
      <div className="select-or-other">
        <input
          id={id}
          className={hasError ? 'has-error-input' : ''}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            onChange('');
            setMode('select');
          }}
        >
          Choose from list instead
        </button>
      </div>
    );
  }

  return (
    <select
      id={id}
      className={hasError ? 'has-error-input' : ''}
      value={value}
      onChange={(e) => {
        if (e.target.value === '__other__') {
          setMode('other');
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
      onBlur={onBlur}
    >
      <option value="">Select…</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value="__other__">Other (type manually)</option>
    </select>
  );
}
