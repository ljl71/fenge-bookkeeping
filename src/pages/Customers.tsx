import { useMemo, useState } from 'react';
import { Edit3, Plus, Save, Search, X } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Customer } from '../types';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { filterCustomers, saveCustomer } from '../services/customerService';
import { customerStats } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { maskPhone } from '../utils/phone';

const blankCustomer = { name: '', phone: '', note: '' };
type CustomerDraft = Partial<Customer> & { name: string; phone: string };

export function Customers() {
  const { session, data, refreshData, navigate, setToast } = useApp();
  const [draftKeyword, setDraftKeyword] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<CustomerDraft | null>(null);
  const rows = useMemo(() => filterCustomers(data.customers, keyword), [data.customers, keyword]);

  function searchCustomers(event: React.FormEvent) {
    event.preventDefault();
    setKeyword(draftKeyword);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    try {
      await saveCustomer(session.storeId, editing);
      await refreshData();
      setEditing(null);
      setToast({ kind: 'success', message: '顾客保存成功' });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '保存失败' });
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="顾客"
        action={
          <button type="button" className="button button--ghost" onClick={() => setEditing(blankCustomer)}>
            <Plus size={18} />
            新增
          </button>
        }
      />
      <form className="panel" onSubmit={searchCustomers}>
        <label className="field">
          <span>搜索顾客</span>
          <div className="search-row">
            <input
              value={draftKeyword}
              placeholder="输入姓名、手机号或后四位"
              onChange={(event) => {
                setDraftKeyword(event.target.value);
                setKeyword(event.target.value);
              }}
            />
            <button type="submit" className="button button--secondary">
              <Search size={18} />
              搜索
            </button>
          </div>
        </label>
      </form>
      {editing ? (
        <form className="panel" onSubmit={submit}>
          <div className="panel-title-row">
            <h2>{editing._id ? '编辑顾客信息' : '新增顾客'}</h2>
            <button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="关闭编辑" title="关闭">
              <X size={18} />
            </button>
          </div>
          <label className="field">
            <span>姓名</span>
            <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
          </label>
          <label className="field">
            <span>手机号</span>
            <input
              inputMode="numeric"
              placeholder="11 位手机号"
              value={editing.phone ?? ''}
              onChange={(event) => setEditing({ ...editing, phone: event.target.value })}
            />
          </label>
          <label className="field">
            <span>备注（选填）</span>
            <textarea value={editing.note ?? ''} maxLength={200} onChange={(event) => setEditing({ ...editing, note: event.target.value })} />
          </label>
          <button type="submit" className="button button--primary button--block">
            <Save size={20} />
            保存顾客
          </button>
        </form>
      ) : null}
      <section className="stack">
        {rows.length ? (
          rows.map((customer) => {
            const stats = customerStats(customer, data.transactions);
            return (
              <article key={customer._id} className="customer-card">
                <button type="button" className="customer-card__main" onClick={() => navigate('customerDetail', { id: customer._id ?? '' })}>
                  <strong>{customer.name}</strong>
                  <span>{maskPhone(customer.phone)}</span>
                  <small>
                    累计 {formatMoney(stats.total)} · {stats.count} 次 · 最近 {stats.lastDate ?? '暂无'}
                  </small>
                </button>
                <div className="icon-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setEditing({ ...customer, name: customer.name, phone: customer.phone ?? '' })}
                    aria-label="编辑顾客"
                    title="编辑"
                  >
                    <Edit3 size={18} />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState title="没有找到相关顾客" text="换个关键词试试，或直接新增顾客。" />
        )}
      </section>
    </div>
  );
}
