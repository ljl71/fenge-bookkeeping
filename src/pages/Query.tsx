import { useMemo, useRef, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Customer, DatePreset, QueryFilters, Transaction } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DateRangePicker } from '../components/DateRangePicker';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { TransactionCard } from '../components/TransactionCard';
import { roleText } from '../constants/defaults';
import { filterTransactions, softDeleteTransaction } from '../services/transactionService';
import { getDateRange } from '../utils/date';
import { makeFengeWorkbook } from '../utils/excel';
import { downloadBlob, downloadText, transactionsToCsv } from '../utils/exportCsv';
import { formatMoney } from '../utils/money';
import { summarize } from '../utils/stats';

function defaultFilters(): QueryFilters {
  const range = getDateRange('month');
  return {
    preset: 'month',
    startDate: range.startDate,
    endDate: range.endDate,
    keyword: '',
    categoryId: '',
    paymentMethodId: '',
    createdBy: 'all'
  };
}

export function Query() {
  const { data, navigate, refreshData, setToast } = useApp();
  const formRef = useRef<HTMLFormElement>(null);
  const [draftFilters, setDraftFilters] = useState<QueryFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<QueryFilters>(defaultFilters);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const rows = useMemo(
    () => filterTransactions(data.transactions, appliedFilters, data.customers),
    [data.transactions, data.customers, appliedFilters]
  );
  const involvedCustomers = useMemo(() => customersForRows(rows, data.customers), [rows, data.customers]);
  const stats = summarize(rows);

  function updateDraftFilters(next: QueryFilters) {
    setDraftFilters(next);
    setExportOpen(false);
  }

  function setPreset(preset: DatePreset) {
    const range = getDateRange(preset, draftFilters.startDate, draftFilters.endDate);
    updateDraftFilters({ ...draftFilters, preset, ...range });
  }

  function submitQuery(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    applyCurrentFilters(event?.currentTarget);
  }

  function applyCurrentFilters(formOverride?: HTMLFormElement) {
    const form = formOverride ?? formRef.current;
    const next = form ? filtersFromForm(form, draftFilters) : draftFilters;
    setDraftFilters(next);
    setAppliedFilters(next);
    setExportOpen(false);
  }

  function resetFilters() {
    const next = defaultFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
    setExportOpen(false);
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      filters: appliedFilters,
      transactions: rows
    };
    downloadText(`fenge-query-${appliedFilters.startDate}-${appliedFilters.endDate}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    setExportOpen(false);
    setToast({ kind: 'success', message: '已导出 JSON' });
  }

  function exportExcel() {
    downloadBlob(`fenge-query-${appliedFilters.startDate}-${appliedFilters.endDate}.xlsx`, makeFengeWorkbook(rows, involvedCustomers));
    setExportOpen(false);
    setToast({ kind: 'success', message: '已导出 Excel' });
  }

  function exportCsv() {
    downloadText(`fenge-query-${appliedFilters.startDate}-${appliedFilters.endDate}.csv`, transactionsToCsv(rows), 'text/csv;charset=utf-8');
    setExportOpen(false);
    setToast({ kind: 'success', message: '已导出 CSV' });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await softDeleteTransaction(deleteTarget);
      await refreshData();
      setDeleteTarget(null);
      setToast({ kind: 'success', message: '流水已删除' });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '删除失败' });
    }
  }

  return (
    <div className="page">
      <PageHeader title="查询" subtitle="按顾客姓名或手机号查收入流水。" />
      <form ref={formRef} className="panel query-filter-panel" onSubmit={submitQuery}>
        <DateRangePicker
          preset={draftFilters.preset}
          startDate={draftFilters.startDate}
          endDate={draftFilters.endDate}
          onPresetChange={setPreset}
          onStartChange={(startDate) => updateDraftFilters({ ...draftFilters, startDate, preset: 'custom' })}
          onEndChange={(endDate) => updateDraftFilters({ ...draftFilters, endDate, preset: 'custom' })}
        />
        <div className="query-filter-grid">
          <label className="field query-filter-grid__wide">
            <span>顾客姓名 / 手机号 / 后四位</span>
            <input
              name="keyword"
              value={draftFilters.keyword}
              onChange={(event) => updateDraftFilters({ ...draftFilters, keyword: event.currentTarget.value })}
            />
          </label>
          <label className="field">
            <span>一级项目</span>
            <select name="categoryId" value={draftFilters.categoryId} onChange={(event) => updateDraftFilters({ ...draftFilters, categoryId: event.target.value })}>
              <option value="">全部</option>
              {data.serviceCategories.filter((category) => !category.deletedAt).map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>支付方式</span>
            <select
              name="paymentMethodId"
              value={draftFilters.paymentMethodId}
              onChange={(event) => updateDraftFilters({ ...draftFilters, paymentMethodId: event.target.value })}
            >
              <option value="">全部</option>
              {data.paymentMethods.filter((method) => !method.deletedAt).map((method) => (
                <option key={method._id} value={method._id}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>记账人</span>
            <select
              name="createdBy"
              value={draftFilters.createdBy}
              onChange={(event) => updateDraftFilters({ ...draftFilters, createdBy: event.target.value as QueryFilters['createdBy'] })}
            >
              <option value="all">全部</option>
              <option value="mom">{roleText.mom}</option>
              <option value="dad">{roleText.dad}</option>
              <option value="unknown">{roleText.unknown}</option>
            </select>
          </label>
        </div>
        <div className="button-row query-actions">
          <button type="button" className="button button--ghost" onClick={resetFilters}>
            <RotateCcw size={18} />
            重置筛选
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setExportOpen((open) => !open)}
          >
            <Download size={18} />
            导出
          </button>
          <button type="submit" className="button button--primary">
            <Search size={18} />
            查询
          </button>
        </div>
        {exportOpen ? (
          <div className="export-menu">
            <button type="button" onClick={exportCsv}>
              <Download size={18} />
              导出 CSV
            </button>
            <button type="button" onClick={exportExcel}>
              <FileSpreadsheet size={18} />
              导出 Excel
            </button>
            <button type="button" onClick={exportJson}>
              <FileJson size={18} />
              导出 JSON
            </button>
          </div>
        ) : null}
      </form>
      <section>
        <h2 className="section-title">查询统计</h2>
        <div className="query-stat-strip">
          <span>
            收入笔数<strong>{stats.incomeCount} 笔</strong>
          </span>
          <span>
            总收入<strong>{formatMoney(stats.income)}</strong>
          </span>
          <span>
            顾客<strong>{stats.customerCount} 位</strong>
          </span>
          <span>
            客单价<strong>{formatMoney(stats.averageTicket)}</strong>
          </span>
        </div>
      </section>
      <section>
        <h2 className="section-title">查询明细</h2>
        {rows.length ? (
          <div className="stack">
            {rows.map((transaction) => (
              <TransactionCard
                key={transaction._id}
                transaction={transaction}
                onEdit={() => navigate('editTransaction', { id: transaction._id ?? '' })}
                onDelete={() => setDeleteTarget(transaction)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="没有找到相关记录" text="可以放宽日期或关键词后再查。" />
        )}
      </section>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除流水"
        message="删除后首页、查询和统计都不再显示这条记录。确定删除吗？"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function customersForRows(rows: Transaction[], customers: Customer[]) {
  return customers.filter((customer) => {
    if (customer.deletedAt) return false;
    return rows.some((row) => {
      if (customer._id && row.customerId === customer._id) return true;
      if (customer.phone && row.customerPhone && customer.phone === row.customerPhone) return true;
      return Boolean(customer.name && row.customerName && customer.name === row.customerName);
    });
  });
}

function filtersFromForm(form: HTMLFormElement, fallback: QueryFilters): QueryFilters {
  const values = new FormData(form);
  return {
    ...fallback,
    keyword: String(values.get('keyword') ?? fallback.keyword),
    categoryId: String(values.get('categoryId') ?? fallback.categoryId),
    paymentMethodId: String(values.get('paymentMethodId') ?? fallback.paymentMethodId),
    createdBy: parseCreatedBy(values.get('createdBy'), fallback.createdBy)
  };
}

function parseCreatedBy(value: FormDataEntryValue | null, fallback: QueryFilters['createdBy']): QueryFilters['createdBy'] {
  if (value === 'mom' || value === 'dad' || value === 'unknown' || value === 'all') return value;
  return fallback;
}
