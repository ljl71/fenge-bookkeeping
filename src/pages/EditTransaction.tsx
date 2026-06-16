import { useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Customer, Transaction, TransactionItem } from '../types';
import { CustomerPicker } from '../components/CustomerPicker';
import { EmptyState } from '../components/EmptyState';
import { MoneyInput } from '../components/MoneyInput';
import { PageHeader } from '../components/PageHeader';
import { ServiceItemSelector } from '../components/ServiceItemSelector';
import { activeOptions } from '../services/configService';
import { findOrCreateCustomer } from '../services/customerService';
import { updateTransaction } from '../services/transactionService';
import { formatMoney } from '../utils/money';

const emptyItem = (): TransactionItem => ({ categoryId: '', categoryName: '', amount: 0, note: '' });

export function EditTransaction() {
  const { data, routeState, refreshData, navigate, setToast } = useApp();
  const original = data.transactions.find((row) => row._id === routeState.params?.id);
  const [draft, setDraft] = useState<Transaction | null>(original ? structuredClone(original) : null);
  const paymentOptions = activeOptions(data.paymentMethods);
  const totalAmount = useMemo(() => {
    if (!draft) return 0;
    if (draft.type === 'expense') return draft.totalAmount;
    return (draft.items ?? []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [draft]);

  if (!draft) {
    return (
      <div className="page">
        <PageHeader title="编辑流水" action={<BackButton />} />
        <EmptyState title="没有找到流水" text="可能已被删除，请返回查询页。" />
      </div>
    );
  }

  function pickCustomer(customer: Customer) {
    setDraft((current) =>
      current
        ? {
            ...current,
            customerId: customer._id,
            customerName: customer.name,
            customerPhone: customer.phone
          }
        : current
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    try {
      let next = { ...draft, totalAmount };
      const payment = data.paymentMethods.find((method) => method._id === next.paymentMethodId);
      if (!payment) throw new Error('请选择支付方式');
      next.paymentMethodName = payment.name;

      if (next.type === 'income') {
        const validItems = (next.items ?? []).filter((item) => item.categoryId && item.amount > 0);
        if (!next.customerName?.trim()) throw new Error('请填写顾客姓名');
        if (!validItems.length) throw new Error('请至少保留一个消费项目');
        const customer = await findOrCreateCustomer(next.storeId, {
          name: next.customerName,
          phone: next.customerPhone
        });
        next = {
          ...next,
          customerId: customer._id,
          customerName: customer.name,
          customerPhone: customer.phone,
          items: validItems,
          totalAmount: validItems.reduce((sum, item) => sum + item.amount, 0)
        };
      } else {
        const category = data.expenseCategories.find((row) => row._id === next.expenseCategoryId);
        if (!category) throw new Error('请选择支出类别');
        if (next.totalAmount <= 0) throw new Error('金额必须大于 0');
        next.expenseCategoryName = category.name;
      }

      await updateTransaction(next);
      await refreshData();
      setToast({ kind: 'success', message: '流水已保存' });
      navigate('query');
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '保存失败，请检查网络后重试' });
    }
  }

  return (
    <div className="page">
      <PageHeader title="编辑流水" subtitle={draft.type === 'income' ? '修改收入记录' : '修改支出记录'} action={<BackButton />} />
      <form className="stack" onSubmit={submit}>
        {draft.type === 'income' ? (
          <>
            <CustomerPicker
              customers={data.customers}
              name={draft.customerName ?? ''}
              phone={draft.customerPhone ?? ''}
              onNameChange={(value) => setDraft({ ...draft, customerName: value, customerId: '' })}
              onPhoneChange={(value) => setDraft({ ...draft, customerPhone: value })}
              onPick={pickCustomer}
            />
            <section className="panel">
              <div className="panel-title-row">
                <h2>项目</h2>
                <strong>{formatMoney(totalAmount)}</strong>
              </div>
              {(draft.items?.length ? draft.items : [emptyItem()]).map((item, index) => (
                <ServiceItemSelector
                  key={index}
                  categories={data.serviceCategories}
                  items={data.serviceItems}
                  value={item}
                  onChange={(next) => {
                    const items = draft.items?.length ? [...draft.items] : [emptyItem()];
                    items[index] = next;
                    setDraft({ ...draft, items });
                  }}
                  onRemove={
                    (draft.items ?? []).length > 1
                      ? () => setDraft({ ...draft, items: (draft.items ?? []).filter((_, rowIndex) => rowIndex !== index) })
                      : undefined
                  }
                />
              ))}
              <button type="button" className="button button--ghost button--block" onClick={() => setDraft({ ...draft, items: [...(draft.items ?? []), emptyItem()] })}>
                添加项目
              </button>
            </section>
          </>
        ) : (
          <section className="panel">
            <div className="field-group">
              <span className="field-label">支出类别</span>
              <div className="chip-grid">
                {activeOptions(data.expenseCategories).map((category) => (
                  <button
                    key={category._id}
                    type="button"
                    className={draft.expenseCategoryId === category._id ? 'chip is-selected' : 'chip'}
                    onClick={() => setDraft({ ...draft, expenseCategoryId: category._id, expenseCategoryName: category.name })}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            <MoneyInput value={draft.totalAmount || ''} onChange={(value) => setDraft({ ...draft, totalAmount: value })} label="支出金额" />
          </section>
        )}
        <section className="panel">
          <label className="field">
            <span>支付方式</span>
            <select value={draft.paymentMethodId ?? ''} onChange={(event) => setDraft({ ...draft, paymentMethodId: event.target.value })}>
              <option value="">请选择</option>
              {paymentOptions.map((method) => (
                <option key={method._id} value={method._id}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>日期</span>
            <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
          </label>
          <label className="field">
            <span>备注</span>
            <textarea value={draft.note ?? ''} maxLength={200} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
          </label>
        </section>
        <button type="submit" className="button button--primary button--block">
          <Save size={22} />
          保存修改
        </button>
      </form>
    </div>
  );
}

function BackButton() {
  const { navigate } = useApp();
  return (
    <button type="button" className="button button--ghost" onClick={() => navigate('query')}>
      <ArrowLeft size={18} />
      返回
    </button>
  );
}
