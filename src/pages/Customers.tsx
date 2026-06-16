import { useMemo, useState } from 'react';
import { Edit3, Plus, Save, Trash2 } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Customer } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { filterCustomers, saveCustomer, softDeleteCustomer } from '../services/customerService';
import { customerStats } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { maskPhone } from '../utils/phone';

const blankCustomer = { name: '', phone: '', note: '' };

export function Customers() {
  const { session, data, refreshData, navigate, setToast } = useApp();
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<Partial<Customer> & { name: string }>(blankCustomer);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const rows = useMemo(() => filterCustomers(data.customers, keyword), [data.customers, keyword]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await saveCustomer(session.storeId, editing);
      await refreshData();
      setEditing(blankCustomer);
      setToast({ kind: 'success', message: '顾客保存成功' });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '保存失败' });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await softDeleteCustomer(deleteTarget);
      await refreshData();
      setDeleteTarget(null);
      setToast({ kind: 'success', message: '顾客已删除' });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '删除失败' });
    }
  }

  return (
    <div className="page">
      <PageHeader title="顾客" subtitle="可按姓名、手机号和后四位搜索。" />
      <section className="panel">
        <label className="field">
          <span>搜索顾客</span>
          <input value={keyword} placeholder="输入姓名、手机号或后四位" onChange={(event) => setKeyword(event.target.value)} />
        </label>
      </section>
      <form className="panel" onSubmit={submit}>
        <div className="panel-title-row">
          <h2>{editing._id ? '编辑顾客' : '新增顾客'}</h2>
          <button type="button" className="button button--ghost" onClick={() => setEditing(blankCustomer)}>
            <Plus size={18} />
            新增
          </button>
        </div>
        <label className="field">
          <span>姓名</span>
          <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
        </label>
        <label className="field">
          <span>手机号（选填）</span>
          <input inputMode="numeric" value={editing.phone ?? ''} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} />
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
                  <button type="button" className="icon-button" onClick={() => setEditing(customer)} aria-label="编辑顾客" title="编辑">
                    <Edit3 size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--danger"
                    onClick={() => setDeleteTarget(customer)}
                    aria-label="删除顾客"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState title="没有找到相关顾客" text="换个关键词试试，或直接新增顾客。" />
        )}
      </section>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除顾客"
        message="删除后顾客列表不再显示，但历史流水仍会保留。确定删除吗？"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
