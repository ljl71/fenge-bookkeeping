import type { Customer } from '../types';
import { maskPhone, normalizePhone, phoneMatches } from '../utils/phone';

interface CustomerPickerProps {
  customers: Customer[];
  name: string;
  phone: string;
  note?: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onNoteChange?: (value: string) => void;
  onPick: (customer: Customer) => void;
}

export function CustomerPicker({
  customers,
  name,
  phone,
  note,
  onNameChange,
  onPhoneChange,
  onNoteChange,
  onPick
}: CustomerPickerProps) {
  const matches = getCustomerMatches(customers, name, phone);
  return (
    <div className="panel">
      <label className="field">
        <span>顾客姓名</span>
        <input value={name} placeholder="例如 王姐" onChange={(event) => onNameChange(event.target.value)} />
      </label>
      <label className="field">
        <span>手机号</span>
        <input
          value={phone}
          inputMode="numeric"
          placeholder="11 位手机号"
          required
          onChange={(event) => onPhoneChange(event.target.value)}
        />
      </label>
      {onNoteChange ? (
        <label className="field">
          <span>顾客备注（选填）</span>
          <textarea value={note ?? ''} maxLength={200} onChange={(event) => onNoteChange(event.target.value)} />
        </label>
      ) : null}
      {matches.length ? (
        <div className="picker-list">
          {matches.map((customer) => (
            <button key={customer._id} type="button" onClick={() => onPick(customer)}>
              <strong>{customer.name}</strong>
              <span>{maskPhone(customer.phone)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getCustomerMatches(customers: Customer[], name: string, phone: string): Customer[] {
  const nameKeyword = name.trim().toLowerCase();
  const phoneKeyword = normalizePhone(phone);
  if (!nameKeyword && !phoneKeyword) return [];

  const hasExactMatch = customers.some((customer) => {
    return customer.name.trim().toLowerCase() === nameKeyword && normalizePhone(customer.phone) === phoneKeyword;
  });
  if (hasExactMatch) return [];

  return customers
    .filter((customer) => {
      if (customer.deletedAt) return false;
      const nameMatch = Boolean(nameKeyword && customer.name.toLowerCase().includes(nameKeyword));
      const noteMatch = Boolean(nameKeyword && (customer.note ?? '').toLowerCase().includes(nameKeyword));
      const phoneMatch = Boolean(phoneKeyword && phoneMatches(customer.phone, phoneKeyword));
      return nameMatch || noteMatch || phoneMatch;
    })
    .slice(0, 5);
}
