import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Customer, TransactionItem } from '../types';
import { CustomerPicker } from '../components/CustomerPicker';
import { ServiceItemSelector } from '../components/ServiceItemSelector';
import { activeOptions } from '../services/configService';
import { findOrCreateCustomer } from '../services/customerService';
import { createTransaction } from '../services/transactionService';
import { todayString } from '../utils/date';
import { formatMoney, sumMoney } from '../utils/money';
import { normalizePhone } from '../utils/phone';

const emptyItem = (): TransactionItem => ({
  categoryId: '',
  categoryName: '',
  itemId: '',
  itemName: '',
  amount: 0,
  note: ''
});

export function AddIncome() {
  const { session, data, refreshData, navigate, setToast } = useApp();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [items, setItems] = useState<TransactionItem[]>([emptyItem()]);
  const defaultPayment = useMemo(
    () => activeOptions(data.paymentMethods).find((method) => method.name === '微信') ?? activeOptions(data.paymentMethods)[0],
    [data.paymentMethods]
  );
  const [paymentMethodId, setPaymentMethodId] = useState(defaultPayment?._id ?? '');
  const [date, setDate] = useState(todayString());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const validItems = items.filter((item) => item.categoryId && item.amount > 0);
  const totalAmount = sumMoney(validItems.map((item) => item.amount));

  function pickCustomer(customer: Customer) {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone ?? '');
    setCustomerNote(customer.note ?? '');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (!customerName.trim()) throw new Error('请填写顾客姓名');
      const cleanedPhone = normalizePhone(customerPhone);
      if (cleanedPhone && cleanedPhone.length !== 11) throw new Error('请填写 11 位顾客手机号');
      if (items.some((item) => !item.categoryId && item.amount > 0)) throw new Error('有项目已填写金额但未选择一级项目');
      if (!validItems.length) throw new Error('请至少添加一个消费项目');
      if (totalAmount <= 0) throw new Error('金额必须大于 0');
      const selectedPaymentId = paymentMethodId || defaultPayment?._id;
      const payment = data.paymentMethods.find((method) => method._id === selectedPaymentId);
      if (!payment) throw new Error('请选择支付方式');
      const customer = cleanedPhone
        ? await findOrCreateCustomer(session.storeId, { name: customerName, phone: cleanedPhone, note: customerNote })
        : null;
      await createTransaction({
        storeId: session.storeId,
        type: 'income',
        customerId: customer?._id,
        customerName: customer?.name ?? customerName.trim(),
        customerPhone: customer?.phone ?? cleanedPhone,
        items: validItems,
        totalAmount,
        paymentMethodId: payment._id,
        paymentMethodName: payment.name,
        date,
        note,
        deletedAt: null
      }, session);
      await refreshData();
      setToast({ kind: 'success', message: '收入保存成功' });
      navigate('dashboard');
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '保存失败，请检查网络后重试' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <CustomerPicker
        customers={data.customers}
        name={customerName}
        phone={customerPhone}
        note={customerNote}
        onNameChange={(value) => {
          setCustomerName(value);
        }}
        onPhoneChange={(value) => {
          setCustomerPhone(value);
        }}
        onNoteChange={setCustomerNote}
        onPick={pickCustomer}
      />
      <section className="panel">
        <div className="panel-title-row">
          <h2>消费项目</h2>
          <strong>{formatMoney(totalAmount)}</strong>
        </div>
        <div className="stack">
          {items.map((item, index) => (
            <ServiceItemSelector
              key={index}
              categories={data.serviceCategories}
              items={data.serviceItems}
              value={item}
              onChange={(next) => setItems(items.map((row, rowIndex) => (rowIndex === index ? next : row)))}
              onRemove={items.length > 1 ? () => setItems(items.filter((_, rowIndex) => rowIndex !== index)) : undefined}
            />
          ))}
        </div>
        <button type="button" className="button button--ghost button--block" onClick={() => setItems([...items, emptyItem()])}>
          添加项目
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
          <span>整单备注（选填）</span>
          <textarea value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
        </label>
      </section>
      <button type="submit" className="button button--primary button--block" disabled={saving}>
        <Save size={22} />
        {saving ? '正在保存...' : '保存收入'}
      </button>
    </form>
  );
}
