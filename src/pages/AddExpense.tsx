import { useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useApp } from '../AppContext';
import { MoneyInput } from '../components/MoneyInput';
import { activeOptions } from '../services/configService';
import { createTransaction } from '../services/transactionService';
import type { TransactionItem } from '../types';
import { todayString } from '../utils/date';
import { PURCHASE_EXPENSE_CATEGORY_ID, PURCHASE_EXPENSE_CATEGORY_NAME } from '../utils/expense';
import { formatMoney, sumMoney } from '../utils/money';

const emptyPurchaseItem = (): TransactionItem => ({
  categoryId: PURCHASE_EXPENSE_CATEGORY_ID,
  categoryName: PURCHASE_EXPENSE_CATEGORY_NAME,
  itemName: '',
  amount: 0,
  note: ''
});

export function AddExpense() {
  const { session, data, refreshData, navigate, setToast } = useApp();
  const defaultPayment = useMemo(
    () => activeOptions(data.paymentMethods).find((method) => method.name === '微信') ?? activeOptions(data.paymentMethods)[0],
    [data.paymentMethods]
  );
  const purchaseCategory = data.expenseCategories.find((row) => !row.deletedAt && row.name === PURCHASE_EXPENSE_CATEGORY_NAME);
  const [items, setItems] = useState<TransactionItem[]>([emptyPurchaseItem()]);
  const [paymentMethodId, setPaymentMethodId] = useState(defaultPayment?._id ?? '');
  const [date, setDate] = useState(todayString());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const totalAmount = sumMoney(items.map((item) => item.amount));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const validItems = items.filter((item) => item.itemName?.trim() || item.amount > 0);
      if (!validItems.length) throw new Error('请至少添加一个进货货品');
      if (totalAmount <= 0) throw new Error('进货金额必须大于 0');
      const selectedPaymentId = paymentMethodId || defaultPayment?._id;
      const payment = data.paymentMethods.find((method) => method._id === selectedPaymentId);
      if (!payment) throw new Error('请选择支付方式');
      await createTransaction({
        storeId: session.storeId,
        type: 'expense',
        items: validItems,
        expenseCategoryId: purchaseCategory?._id ?? PURCHASE_EXPENSE_CATEGORY_ID,
        expenseCategoryName: PURCHASE_EXPENSE_CATEGORY_NAME,
        totalAmount,
        paymentMethodId: payment._id,
        paymentMethodName: payment.name,
        date,
        note,
        deletedAt: null
      }, session);
      await refreshData();
      setToast({ kind: 'success', message: '进货支出保存成功' });
      navigate('dashboard');
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '保存失败，请检查网络后重试' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <section className="panel">
        <div className="panel-title-row">
          <h2>进货明细</h2>
          <strong>{formatMoney(totalAmount)}</strong>
        </div>
        <div className="stack">
          {items.map((item, index) => (
            <PurchaseItemBox
              key={index}
              value={item}
              onChange={(next) => setItems(items.map((row, rowIndex) => (rowIndex === index ? next : row)))}
              onRemove={items.length > 1 ? () => setItems(items.filter((_, rowIndex) => rowIndex !== index)) : undefined}
            />
          ))}
        </div>
        <button type="button" className="button button--ghost button--block" onClick={() => setItems([...items, emptyPurchaseItem()])}>
          <Plus size={18} />
          添加货品
        </button>
      </section>
      <section className="panel">
        <label className="field">
          <span>支付方式</span>
          <select value={paymentMethodId || defaultPayment?._id || ''} onChange={(event) => setPaymentMethodId(event.target.value)}>
            <option value="">请选择</option>
            {activeOptions(data.paymentMethods).map((method) => (
              <option key={method._id} value={method._id}>
                {method.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>日期</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="field">
          <span>备注（选填）</span>
          <textarea value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
        </label>
      </section>
      <button type="submit" className="button button--secondary button--block" disabled={saving}>
        <Save size={22} />
        {saving ? '正在保存...' : '保存进货'}
      </button>
    </form>
  );
}

function PurchaseItemBox({
  value,
  onChange,
  onRemove
}: {
  value: TransactionItem;
  onChange: (value: TransactionItem) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="service-item-box">
      <label className="field">
        <span>货品名称</span>
        <input
          value={value.itemName ?? ''}
          placeholder="例如 面膜套装、护肤套装"
          onChange={(event) =>
            onChange({
              ...value,
              categoryId: PURCHASE_EXPENSE_CATEGORY_ID,
              categoryName: PURCHASE_EXPENSE_CATEGORY_NAME,
              itemName: event.target.value
            })
          }
        />
      </label>
      <MoneyInput value={value.amount || ''} onChange={(amount) => onChange({ ...value, amount })} label="进货金额" />
      <label className="field">
        <span>货品备注（选填）</span>
        <input value={value.note ?? ''} maxLength={80} onChange={(event) => onChange({ ...value, note: event.target.value })} />
      </label>
      {onRemove ? (
        <button type="button" className="button button--ghost danger-text" onClick={onRemove}>
          <Trash2 size={18} />
          删除这个货品
        </button>
      ) : null}
    </div>
  );
}
