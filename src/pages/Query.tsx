import { useMemo, useState } from 'react';
import { Download, RotateCcw, Trash2 } from 'lucide-react';
import { useApp } from '../AppContext';
import type { DatePreset, QueryFilters, Transaction } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DateRangePicker } from '../components/DateRangePicker';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { SummaryCard } from '../components/SummaryCard';
import { TransactionCard } from '../components/TransactionCard';
import { roleText } from '../constants/defaults';
import { filterTransactions, softDeleteTransaction } from '../services/transactionService';
import { getDateRange } from '../utils/date';
import { downloadText, transactionsToCsv } from '../utils/exportCsv';
import { formatMoney } from '../utils/money';
import { summarize } from '../utils/stats';

function defaultFilters(): QueryFilters {
  const range = getDateRange('month');
  return {
    preset: 'month',
    startDate: range.startDate,
    endDate: range.endDate,
    keyword: '',
    type: 'all',
    categoryId: '',
    itemId: '',
    expenseCategoryId: '',
    paymentMethodId: '',
    noteKeyword: '',
    createdBy: 'all'
  };
}

export function Query() {
  const { data, navigate, refreshData, setToast } = useApp();
  const [filters, setFilters] = useState<QueryFilters>(defaultFilters);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const rows = useMemo(() => filterTransactions(data.transactions, filters), [data.transactions, filters]);
  const stats = summarize(rows);

  function setPreset(preset: DatePreset) {
    const range = getDateRange(preset, filters.startDate, filters.endDate);
    setFilters({ ...filters, preset, ...range });
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
      <PageHeader title="查询" subtitle="组合筛选流水，也可以导出当前结果。" />
      <section className="panel">
        <DateRangePicker
          preset={filters.preset}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onPresetChange={setPreset}
          onStartChange={(startDate) => setFilters({ ...filters, startDate, preset: 'custom' })}
          onEndChange={(endDate) => setFilters({ ...filters, endDate, preset: 'custom' })}
        />
        <label className="field">
          <span>姓名 / 手机号 / 后四位</span>
          <input value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} />
        </label>
        <div className="two-cols">
          <label className="field">
            <span>类型</span>
            <select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value as QueryFilters['type'] })}>
              <option value="all">全部</option>
              <option value="income">收入</option>
              <option value="expense">支出</option>
            </select>
          </label>
          <label className="field">
            <span>记账人</span>
            <select value={filters.createdBy} onChange={(event) => setFilters({ ...filters, createdBy: event.target.value as QueryFilters['createdBy'] })}>
              <option value="all">全部</option>
              <option value="mom">{roleText.mom}</option>
              <option value="dad">{roleText.dad}</option>
              <option value="unknown">{roleText.unknown}</option>
            </select>
          </label>
        </div>
        <div className="two-cols">
          <label className="field">
            <span>一级项目</span>
            <select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value, itemId: '' })}>
              <option value="">全部</option>
              {data.serviceCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>子项目</span>
            <select value={filters.itemId} onChange={(event) => setFilters({ ...filters, itemId: event.target.value })}>
              <option value="">全部</option>
              {data.serviceItems
                .filter((item) => !filters.categoryId || item.categoryId === filters.categoryId)
                .map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.categoryName}/{item.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="two-cols">
          <label className="field">
            <span>支出类别</span>
            <select value={filters.expenseCategoryId} onChange={(event) => setFilters({ ...filters, expenseCategoryId: event.target.value })}>
              <option value="">全部</option>
              {data.expenseCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>支付方式</span>
            <select value={filters.paymentMethodId} onChange={(event) => setFilters({ ...filters, paymentMethodId: event.target.value })}>
              <option value="">全部</option>
              {data.paymentMethods.map((method) => (
                <option key={method._id} value={method._id}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>备注关键词</span>
          <input value={filters.noteKeyword} onChange={(event) => setFilters({ ...filters, noteKeyword: event.target.value })} />
        </label>
        <div className="button-row">
          <button type="button" className="button button--ghost" onClick={() => setFilters(defaultFilters())}>
            <RotateCcw size={18} />
            重置筛选
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => downloadText(`fenge-query-${filters.startDate}-${filters.endDate}.csv`, transactionsToCsv(rows), 'text/csv;charset=utf-8')}
          >
            <Download size={18} />
            导出 CSV
          </button>
        </div>
      </section>
      <section>
        <h2 className="section-title">查询统计</h2>
        <div className="summary-grid">
          <SummaryCard label="记录总数" value={`${stats.total} 笔`} />
          <SummaryCard label="总收入" value={formatMoney(stats.income)} tone="income" />
          <SummaryCard label="总支出" value={formatMoney(stats.expense)} tone="expense" />
          <SummaryCard label="净收入" value={formatMoney(stats.net)} tone={stats.net >= 0 ? 'income' : 'expense'} />
          <SummaryCard label="收入笔数" value={`${stats.incomeCount} 笔`} />
          <SummaryCard label="支出笔数" value={`${stats.expenseCount} 笔`} />
          <SummaryCard label="涉及顾客" value={`${stats.customerCount} 位`} />
          <SummaryCard label="平均客单价" value={formatMoney(stats.averageTicket)} />
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
