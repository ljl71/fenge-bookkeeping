import { useState } from 'react';
import { ArrowLeft, Edit3, Save, Trash2 } from 'lucide-react';
import { useApp } from '../AppContext';
import type { ExpenseCategory, PaymentMethod, ServiceCategory, ServiceItem } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import {
  saveExpenseCategory,
  savePaymentMethod,
  saveServiceCategory,
  saveServiceItem,
  softDeleteConfig,
  toggleConfig
} from '../services/configService';

type DeleteTarget =
  | { collection: 'serviceCategories'; row: ServiceCategory }
  | { collection: 'serviceItems'; row: ServiceItem }
  | { collection: 'expenseCategories'; row: ExpenseCategory }
  | { collection: 'paymentMethods'; row: PaymentMethod };

export function ProjectManagement() {
  const { session, data, refreshData, navigate, setToast } = useApp();
  const [serviceCategory, setServiceCategory] = useState<Partial<ServiceCategory>>({ name: '', sortOrder: 99, active: true });
  const [serviceItem, setServiceItem] = useState<Partial<ServiceItem>>({ name: '', categoryId: '', defaultPrice: 0, sortOrder: 99, active: true });
  const [expenseCategory, setExpenseCategory] = useState<Partial<ExpenseCategory>>({ name: '', sortOrder: 99, active: true });
  const [paymentMethod, setPaymentMethod] = useState<Partial<PaymentMethod>>({ name: '', sortOrder: 99, active: true });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      await refreshData();
      setToast({ kind: 'success', message: success });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '操作失败' });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await run(() => softDeleteConfig(deleteTarget.collection, deleteTarget.row as never), '已删除');
    setDeleteTarget(null);
  }

  return (
    <div className="page">
      <PageHeader
        title="项目管理"
        subtitle="停用项目不会影响历史流水。"
        action={
          <button type="button" className="button button--ghost" onClick={() => navigate('settings')}>
            <ArrowLeft size={18} />
            返回
          </button>
        }
      />
      <ConfigSection title="收入一级项目">
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              async () => {
                await saveServiceCategory(session.storeId, { ...serviceCategory, name: serviceCategory.name ?? '' });
                setServiceCategory({ name: '', sortOrder: 99, active: true });
              },
              '一级项目已保存'
            );
          }}
        >
          <input placeholder="名称" value={serviceCategory.name ?? ''} onChange={(event) => setServiceCategory({ ...serviceCategory, name: event.target.value })} />
          <input
            type="number"
            placeholder="排序"
            value={serviceCategory.sortOrder ?? 99}
            onChange={(event) => setServiceCategory({ ...serviceCategory, sortOrder: Number(event.target.value) })}
          />
          <button type="submit" className="button button--primary">
            <Save size={18} />
            保存
          </button>
        </form>
        <ConfigList
          rows={data.serviceCategories}
          onEdit={setServiceCategory}
          onToggle={(row) => run(() => toggleConfig('serviceCategories', row), row.active ? '已停用' : '已启用')}
          onDelete={(row) => setDeleteTarget({ collection: 'serviceCategories', row })}
        />
      </ConfigSection>

      <ConfigSection title="收入子项目">
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            const category = data.serviceCategories.find((row) => row._id === serviceItem.categoryId);
            run(
              async () => {
                await saveServiceItem(session.storeId, {
                  ...serviceItem,
                  name: serviceItem.name ?? '',
                  categoryId: category?._id ?? '',
                  categoryName: category?.name ?? ''
                });
                setServiceItem({ name: '', categoryId: '', defaultPrice: 0, sortOrder: 99, active: true });
              },
              '子项目已保存'
            );
          }}
        >
          <select value={serviceItem.categoryId ?? ''} onChange={(event) => setServiceItem({ ...serviceItem, categoryId: event.target.value })}>
            <option value="">选择一级项目</option>
            {data.serviceCategories
              .filter((row) => !row.deletedAt)
              .map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
          </select>
          <input placeholder="子项目名称" value={serviceItem.name ?? ''} onChange={(event) => setServiceItem({ ...serviceItem, name: event.target.value })} />
          <input
            type="number"
            inputMode="decimal"
            placeholder="默认价格"
            value={serviceItem.defaultPrice ?? 0}
            onChange={(event) => setServiceItem({ ...serviceItem, defaultPrice: Number(event.target.value) })}
          />
          <input
            type="number"
            placeholder="排序"
            value={serviceItem.sortOrder ?? 99}
            onChange={(event) => setServiceItem({ ...serviceItem, sortOrder: Number(event.target.value) })}
          />
          <button type="submit" className="button button--primary">
            <Save size={18} />
            保存
          </button>
        </form>
        <ConfigList
          rows={data.serviceItems}
          renderName={(row) => `${row.categoryName} / ${row.name}${row.defaultPrice ? ` · ¥${row.defaultPrice}` : ''}`}
          onEdit={setServiceItem}
          onToggle={(row) => run(() => toggleConfig('serviceItems', row), row.active ? '已停用' : '已启用')}
          onDelete={(row) => setDeleteTarget({ collection: 'serviceItems', row })}
        />
      </ConfigSection>

      <ConfigSection title="支出类别">
        <SimpleConfigForm value={expenseCategory} onChange={setExpenseCategory} onSubmit={() => run(async () => {
          await saveExpenseCategory(session.storeId, { ...expenseCategory, name: expenseCategory.name ?? '' });
          setExpenseCategory({ name: '', sortOrder: 99, active: true });
        }, '支出类别已保存')} />
        <ConfigList
          rows={data.expenseCategories}
          onEdit={setExpenseCategory}
          onToggle={(row) => run(() => toggleConfig('expenseCategories', row), row.active ? '已停用' : '已启用')}
          onDelete={(row) => setDeleteTarget({ collection: 'expenseCategories', row })}
        />
      </ConfigSection>

      <ConfigSection title="支付方式">
        <SimpleConfigForm value={paymentMethod} onChange={setPaymentMethod} onSubmit={() => run(async () => {
          await savePaymentMethod(session.storeId, { ...paymentMethod, name: paymentMethod.name ?? '' });
          setPaymentMethod({ name: '', sortOrder: 99, active: true });
        }, '支付方式已保存')} />
        <ConfigList
          rows={data.paymentMethods}
          onEdit={setPaymentMethod}
          onToggle={(row) => run(() => toggleConfig('paymentMethods', row), row.active ? '已停用' : '已启用')}
          onDelete={(row) => setDeleteTarget({ collection: 'paymentMethods', row })}
        />
      </ConfigSection>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除配置"
        message="删除后新记账不会再显示它，历史流水仍保留原名称。确定删除吗？"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="stack">{children}</div>
    </section>
  );
}

function SimpleConfigForm<T extends { name?: string; sortOrder?: number }>(
  props: {
    value: Partial<T>;
    onChange: (value: Partial<T>) => void;
    onSubmit: () => void;
  }
) {
  return (
    <form
      className="inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <input placeholder="名称" value={props.value.name ?? ''} onChange={(event) => props.onChange({ ...props.value, name: event.target.value } as Partial<T>)} />
      <input
        type="number"
        placeholder="排序"
        value={props.value.sortOrder ?? 99}
        onChange={(event) => props.onChange({ ...props.value, sortOrder: Number(event.target.value) } as Partial<T>)}
      />
      <button type="submit" className="button button--primary">
        <Save size={18} />
        保存
      </button>
    </form>
  );
}

function ConfigList<T extends { _id?: string; name: string; active: boolean; sortOrder: number; deletedAt?: string | null }>(props: {
  rows: T[];
  renderName?: (row: T) => string;
  onEdit: (row: T) => void;
  onToggle: (row: T) => void;
  onDelete: (row: T) => void;
}) {
  return (
    <div className="config-list">
      {props.rows
        .filter((row) => !row.deletedAt)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => (
          <div key={row._id}>
            <span>
              {props.renderName ? props.renderName(row) : row.name}
              {!row.active ? <em>停用</em> : null}
            </span>
            <div className="icon-actions">
              <button type="button" className="icon-button" onClick={() => props.onEdit(row)} aria-label="编辑" title="编辑">
                <Edit3 size={18} />
              </button>
              <button type="button" className="button button--ghost button--small" onClick={() => props.onToggle(row)}>
                {row.active ? '停用' : '启用'}
              </button>
              <button type="button" className="icon-button icon-button--danger" onClick={() => props.onDelete(row)} aria-label="删除" title="删除">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
