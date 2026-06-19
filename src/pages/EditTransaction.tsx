import { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
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
import { PURCHASE_EXPENSE_CATEGORY_ID, PURCHASE_EXPENSE_CATEGORY_NAME } from '../utils/expense';
import { formatMoney, sumMoney } from '../utils/money';
import { normalizePhone } from '../utils/phone';
import { canEditTransaction } from '../utils/permissions';

const emptyItem = (): TransactionItem => ({ categoryId: '', categoryName: '', amount: 0, note: '' });
const emptyPurchaseItem = (): TransactionItem => ({
  categoryId: PURCHASE_EXPENSE_CATEGORY_ID,
  categoryName: PURCHASE_EXPENSE_CATEGORY_NAME,
  itemName: '',
  amount: 0,
  note: ''
});

export function EditTransaction() {
  const { session, data, routeState, refreshData, navigate, setToast } = useApp();
  const original = data.transactions.find((row) => row._id === routeState.params?.id);
  const [draft, setDraft] = useState<Transaction | null>(original ? structuredClone(original) : null);
  const paymentOptions = activeOptions(data.paymentMethods);
  const totalAmount = useMemo(() => {
    if (!draft) return 0;
    if (draft.type === 'expense') return sumMoney(expenseDraftItems(draft).map((item) => item.amount));
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

  if (original && !canEditTransaction(session, original)) {
    return (
      <div className="page">
        <PageHeader title="编辑流水" action={<BackButton />} />
        <EmptyState title="当前账号无权限编辑这条流水" text="请返回查询页查看自己的流水。" />
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
      let next = { ...draft, storeId: session.storeId, totalAmount };
      const payment = data.paymentMethods.find((method) => method._id === next.paymentMethodId);
      if (!payment) throw new Error('请选择支付方式');
      next.paymentMethodName = payment.name;

      if (next.type === 'income') {
        const validItems = (next.items ?? []).filter((item) => item.categoryId && item.amount > 0);
        const cleanedPhone = normalizePhone(next.customerPhone);
        if (!next.customerName?.trim()) throw new Error('请填写顾客姓名');
        if (cleanedPhone && cleanedPhone.length !== 11) throw new Error('请填写 11 位顾客手机号');
        if (!validItems.length) throw new Error('请至少保留一个消费项目');
        const customer = cleanedPhone
          ? await findOrCreateCustomer(session.storeId, {
              name: next.customerName,
              phone: cleanedPhone
            })
          : null;
        next = {
          ...next,
          customerId: customer?._id,
          customerName: customer?.name ?? next.customerName.trim(),
          customerPhone: customer?.phone ?? cleanedPhone,
          items: validItems,
          totalAmount: sumMoney(validItems.map((item) => item.amount))
        };
      } else {
        const validItems = expenseDraftItems(next).filter((item) => item.itemName?.trim() || item.amount > 0);
        if (!validItems.length) throw new Error('请至少保留一个进货货品');
        next = {
          ...next,
          expenseCategoryId: next.expenseCategoryId || PURCHASE_EXPENSE_CATEGORY_ID,
          expenseCategoryName: PURCHASE_EXPENSE_CATEGORY_NAME,
          items: validItems,
          totalAmount: sumMoney(validItems.map((item) => item.amount))
        };
      }

      await updateTransaction(next, session);
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
            <div className="panel-title-row">
              <h2>进货明细</h2>
              <strong>{formatMoney(totalAmount)}</strong>
            </div>
            <div className="stack">
              {expenseDraftItems(draft).map((item, index) => (
                <PurchaseItemBox
                  key={index}
                  value={item}
                  onChange={(next) => {
                    const items = expenseDraftItems(draft);
                    items[index] = next;
                    setDraft({ ...draft, items });
                  }}
                  onRemove={
                    expenseDraftItems(draft).length > 1
                      ? () => setDraft({ ...draft, items: expenseDraftItems(draft).filter((_, rowIndex) => rowIndex !== index) })
                      : undefined
                  }
                />
              ))}
            </div>
            <button
              type="button"
              className="button button--ghost button--block"
              onClick={() => setDraft({ ...draft, items: [...expenseDraftItems(draft), emptyPurchaseItem()] })}
            >
              <Plus size={18} />
              添加货品
            </button>
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

function expenseDraftItems(transaction: Transaction): TransactionItem[] {
  if (transaction.items?.length) {
    return transaction.items.map((item) => ({
      ...item,
      categoryId: PURCHASE_EXPENSE_CATEGORY_ID,
      categoryName: PURCHASE_EXPENSE_CATEGORY_NAME
    }));
  }
  return [
    {
      ...emptyPurchaseItem(),
      itemName: transaction.expenseCategoryName === PURCHASE_EXPENSE_CATEGORY_NAME ? PURCHASE_EXPENSE_CATEGORY_NAME : '',
      amount: transaction.totalAmount || 0
    }
  ];
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

function BackButton() {
  const { navigate } = useApp();
  return (
    <button type="button" className="button button--ghost" onClick={() => navigate('query')}>
      <ArrowLeft size={18} />
      返回
    </button>
  );
}
