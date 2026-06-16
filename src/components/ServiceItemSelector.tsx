import type { ServiceCategory, ServiceItem, TransactionItem } from '../types';
import { activeOptions } from '../services/configService';
import { MoneyInput } from './MoneyInput';

interface ServiceItemSelectorProps {
  categories: ServiceCategory[];
  items: ServiceItem[];
  value: TransactionItem;
  onChange: (value: TransactionItem) => void;
  onRemove?: () => void;
}

export function ServiceItemSelector({ categories, items, value, onChange, onRemove }: ServiceItemSelectorProps) {
  const categoryOptions = activeOptions(categories);
  const itemOptions = activeOptions(items).filter((item) => item.categoryId === value.categoryId);
  const selectedCategory = categories.find((category) => category._id === value.categoryId);

  return (
    <div className="service-item-box">
      <div className="field-group">
        <span className="field-label">一级项目</span>
        <div className="chip-grid">
          {categoryOptions.map((category) => (
            <button
              key={category._id}
              type="button"
              className={value.categoryId === category._id ? 'chip is-selected' : 'chip'}
              onClick={() =>
                onChange({
                  categoryId: category._id ?? '',
                  categoryName: category.name,
                  itemId: '',
                  itemName: '',
                  amount: value.amount,
                  note: value.note
                })
              }
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      {selectedCategory ? (
        <div className="field-group">
          <span className="field-label">子项目</span>
          <div className="chip-grid">
            {itemOptions.map((item) => (
              <button
                key={item._id}
                type="button"
                className={value.itemId === item._id ? 'chip is-selected' : 'chip'}
                onClick={() =>
                  onChange({
                    ...value,
                    itemId: item._id,
                    itemName: item.name,
                    amount: item.defaultPrice || value.amount || 0
                  })
                }
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <MoneyInput value={value.amount || ''} onChange={(amount) => onChange({ ...value, amount })} />
      <label className="field">
        <span>项目备注（选填）</span>
        <input value={value.note ?? ''} maxLength={80} onChange={(event) => onChange({ ...value, note: event.target.value })} />
      </label>
      {onRemove ? (
        <button type="button" className="button button--ghost danger-text" onClick={onRemove}>
          删除这个项目
        </button>
      ) : null}
    </div>
  );
}
