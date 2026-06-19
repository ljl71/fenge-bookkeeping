import { useState } from 'react';
import { ArrowLeft, Edit3, Save, Trash2 } from 'lucide-react';
import { useApp } from '../AppContext';
import type { PaymentMethod, ServiceCategory, ServiceItem } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import {
  savePaymentMethod,
  saveServiceCategory,
  saveServiceItem,
  softDeleteConfig,
  toggleConfig,
  uniqueActiveOptions,
  uniqueConfigRows
} from '../services/configService';

type DeleteTarget =
  | { collection: 'serviceCategories'; row: ServiceCategory }
  | { collection: 'serviceItems'; row: ServiceItem }
  | { collection: 'paymentMethods'; row: PaymentMethod };

export function ProjectManagement() {
  const { session, data, refreshData, navigate, setToast } = useApp();
  const [serviceCategory, setServiceCategory] = useState<Partial<ServiceCategory>>({ name: '', sortOrder: 99, active: true });
  const [serviceItem, setServiceItem] = useState<Partial<ServiceItem>>({ name: '', categoryId: '', defaultPrice: 0, sortOrder: 99, active: true });
  const [paymentMethod, setPaymentMethod] = useState<Partial<PaymentMethod>>({ name: '', sortOrder: 99, active: true });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const categoryOptions = uniqueActiveOptions(data.serviceCategories);
  const serviceItemRows = serviceItem.categoryId
    ? data.serviceItems.filter((row) => row.categoryId === serviceItem.categoryId)
    : data.serviceItems;

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
          className="config-form config-form--category"
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
          <LabeledNumberInput
            label="序号"
            value={serviceCategory.sortOrder ?? 99}
            onChange={(value) => setServiceCategory({ ...serviceCategory, sortOrder: value })}
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
          className="config-form config-form--service-item"
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
            {categoryOptions.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
          </select>
          <input placeholder="子项目名称" value={serviceItem.name ?? ''} onChange={(event) => setServiceItem({ ...serviceItem, name: event.target.value })} />
          <LabeledNumberInput
            label="金额"
            inputMode="decimal"
            value={serviceItem.defaultPrice ?? 0}
            onChange={(value) => setServiceItem({ ...serviceItem, defaultPrice: value })}
          />
          <LabeledNumberInput
            label="序号"
            value={serviceItem.sortOrder ?? 99}
            onChange={(value) => setServiceItem({ ...serviceItem, sortOrder: value })}
          />
          <button type="submit" className="button button--primary">
            <Save size={18} />
            保存
          </button>
        </form>
        <ConfigList
          rows={serviceItemRows}
          getKey={(row) => `${row.categoryId || row.categoryName}:${normalizeListKey(row.name)}`}
          renderName={(row) => `${row.categoryName} / ${row.name}${row.defaultPrice ? ` · ¥${row.defaultPrice}` : ''}`}
          onEdit={setServiceItem}
          onToggle={(row) => run(() => toggleConfig('serviceItems', row), row.active ? '已停用' : '已启用')}
          onDelete={(row) => setDeleteTarget({ collection: 'serviceItems', row })}
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

function LabeledNumberInput(props: {
  label: string;
  value: number;
  inputMode?: 'decimal' | 'numeric';
  onChange: (value: number) => void;
}) {
  return (
    <label className="labeled-number-input">
      <span>{props.label}</span>
      <input
        type="number"
        inputMode={props.inputMode}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </label>
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
      className="config-form config-form--simple"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <input placeholder="名称" value={props.value.name ?? ''} onChange={(event) => props.onChange({ ...props.value, name: event.target.value } as Partial<T>)} />
      <LabeledNumberInput
        label="序号"
        value={props.value.sortOrder ?? 99}
        onChange={(value) => props.onChange({ ...props.value, sortOrder: value } as Partial<T>)}
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
  getKey?: (row: T) => string;
  renderName?: (row: T) => string;
  onEdit: (row: T) => void;
  onToggle: (row: T) => void;
  onDelete: (row: T) => void;
}) {
  return (
    <div className="config-list">
      {uniqueConfigRows(props.rows, props.getKey)
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

function normalizeListKey(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}
