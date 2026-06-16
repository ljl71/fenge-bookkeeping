import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { useApp } from '../AppContext';
import { MoneyInput } from '../components/MoneyInput';
import { activeOptions } from '../services/configService';
import { createTransaction } from '../services/transactionService';
import { todayString } from '../utils/date';

export function AddExpense() {
  const { session, data, refreshData, navigate, setToast } = useApp();
  const defaultPayment = useMemo(
    () => activeOptions(data.paymentMethods).find((method) => method.name === '微信') ?? activeOptions(data.paymentMethods)[0],
    [data.paymentMethods]
  );
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentMethodId, setPaymentMethodId] = useState(defaultPayment?._id ?? '');
  const [date, setDate] = useState(todayString());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (amount <= 0) throw new Error('支出金额必须大于 0');
      const category = data.expenseCategories.find((row) => row._id === expenseCategoryId);
      if (!category) throw new Error('请选择支出类别');
      const selectedPaymentId = paymentMethodId || defaultPayment?._id;
      const payment = data.paymentMethods.find((method) => method._id === selectedPaymentId);
      if (!payment) throw new Error('请选择支付方式');
      await createTransaction({
        storeId: session.storeId,
        type: 'expense',
        items: [],
        expenseCategoryId: category._id,
        expenseCategoryName: category.name,
        totalAmount: amount,
        paymentMethodId: payment._id,
        paymentMethodName: payment.name,
        date,
        note,
        createdBy: session.role,
        deletedAt: null
      });
      await refreshData();
      setToast({ kind: 'success', message: '支出保存成功' });
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
        <div className="field-group">
          <span className="field-label">支出类别</span>
          <div className="chip-grid">
            {activeOptions(data.expenseCategories).map((category) => (
              <button
                key={category._id}
                type="button"
                className={expenseCategoryId === category._id ? 'chip is-selected' : 'chip'}
                onClick={() => setExpenseCategoryId(category._id ?? '')}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        <MoneyInput value={amount || ''} onChange={setAmount} label="支出金额" />
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
        {saving ? '正在保存...' : '保存支出'}
      </button>
    </form>
  );
}
