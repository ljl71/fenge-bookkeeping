interface MoneyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  id?: string;
  label?: string;
}

export function MoneyInput({ value, onChange, id, label = '金额' }: MoneyInputProps) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={value}
        placeholder="0"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
