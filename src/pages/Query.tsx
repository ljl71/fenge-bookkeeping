import { useMemo, useRef, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, RotateCcw, Search } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Customer, DatePreset, QueryFilters, Role, StoreUser, Transaction } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DateRangePicker } from '../components/DateRangePicker';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { TransactionCard } from '../components/TransactionCard';
import { roleText } from '../constants/defaults';
import { uniqueActiveOptions } from '../services/configService';
import { filterTransactions, softDeleteTransaction } from '../services/transactionService';
import { getDateRange } from '../utils/date';
import { makeFengeWorkbook } from '../utils/excel';
import { downloadBlob, downloadText, transactionsToCsv } from '../utils/exportCsv';
import { formatMoney } from '../utils/money';
import { canDeleteTransaction, canEditTransaction, isOwner } from '../utils/permissions';
import { summarize } from '../utils/stats';

interface BookkeeperOption {
  value: string;
  label: string;
  createdBy: QueryFilters['createdBy'];
}

function defaultFilters(employee = false): QueryFilters {
  const range = getDateRange('month');
  return {
    type: employee ? 'income' : 'all',
    preset: 'month',
    startDate: range.startDate,
    endDate: range.endDate,
    keyword: '',
    categoryId: '',
    paymentMethodId: '',
    createdBy: 'all',
    createdByUserId: 'all'
  };
}

export function Query() {
  const { session, data, navigate, refreshData, setToast } = useApp();
  const owner = isOwner(session);
  const employee = session.role === 'employee';
  const formRef = useRef<HTMLFormElement>(null);
  const [draftFilters, setDraftFilters] = useState<QueryFilters>(() => defaultFilters(session.role === 'employee'));
  const [appliedFilters, setAppliedFilters] = useState<QueryFilters>(() => defaultFilters(session.role === 'employee'));
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const bookkeeperOptions = useMemo(() => makeBookkeeperOptions(data.storeUsers), [data.storeUsers]);
  const rows = useMemo(
    () => filterTransactions(data.transactions, appliedFilters, data.customers, session),
    [data.transactions, data.customers, appliedFilters, session]
  );
  const involvedCustomers = useMemo(() => customersForRows(rows, data.customers), [rows, data.customers]);
  const stats = summarize(rows);

  function updateDraftFilters(next: QueryFilters) {
    setDraftFilters(next);
    setAppliedFilters(next);
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
    const next = form ? filtersFromForm(form, draftFilters, bookkeeperOptions) : draftFilters;
    setDraftFilters(next);
    setAppliedFilters(next);
    setExportOpen(false);
  }

  function resetFilters() {
    const next = defaultFilters(session.role === 'employee');
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
    if (rows.some((row) => row.type === 'expense')) {
      setToast({ kind: 'error', message: 'Excel 模板只支持收入流水；当前结果含支出，请改用 CSV/JSON 或筛选收入后导出' });
      return;
    }
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
      await softDeleteTransaction(deleteTarget, session);
      await refreshData();
      setDeleteTarget(null);
      setToast({ kind: 'success', message: '流水已删除' });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '删除失败' });
    }
  }

  return (
    <div className="page">
      <PageHeader title="查询" subtitle={owner ? '按日期、类型、顾客、货品或项目查询流水。' : '只显示我自己记录的收入流水。'} />
      <form ref={formRef} className={`panel query-filter-panel${employee ? ' query-filter-panel--employee' : ''}`} onSubmit={submitQuery}>
        <DateRangePicker
          preset={draftFilters.preset}
          startDate={draftFilters.startDate}
          endDate={draftFilters.endDate}
          onPresetChange={setPreset}
          onStartChange={(startDate) => updateDraftFilters({ ...draftFilters, startDate, preset: 'custom' })}
          onEndChange={(endDate) => updateDraftFilters({ ...draftFilters, endDate, preset: 'custom' })}
        />
        <div className="query-filter-compact">
          <div className={`query-filter-row ${owner ? 'query-filter-row--main' : 'query-filter-row--employee-main'}`}>
            {owner ? (
              <label className="field">
                <span>流水类型</span>
                <select
                  name="type"
                  value={draftFilters.type}
                  onChange={(event) => {
                    const type = event.target.value as QueryFilters['type'];
                    updateDraftFilters({ ...draftFilters, type, categoryId: type === 'expense' ? '' : draftFilters.categoryId });
                  }}
                >
                  <option value="all">全部</option>
                  <option value="income">收入</option>
                  <option value="expense">支出</option>
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>{owner ? '顾客姓名 / 手机号 / 货品 / 备注' : '顾客姓名 / 手机号 / 备注'}</span>
              <input
                name="keyword"
                value={draftFilters.keyword}
                onChange={(event) => updateDraftFilters({ ...draftFilters, keyword: event.currentTarget.value })}
              />
            </label>
          </div>
          <div className={`query-filter-row ${owner ? 'query-filter-row--secondary' : 'query-filter-row--employee-secondary'}`}>
            <label className="field">
              <span>收入一级项目</span>
              <select name="categoryId" value={draftFilters.categoryId} onChange={(event) => updateDraftFilters({ ...draftFilters, categoryId: event.target.value })}>
                <option value="">全部</option>
                {uniqueActiveOptions(data.serviceCategories).map((category) => (
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
                {uniqueActiveOptions(data.paymentMethods).map((method) => (
                  <option key={method._id} value={method._id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </label>
            {owner ? (
              <label className="field">
                <span>记账人</span>
                <select
                  name="createdByUserId"
                  value={draftFilters.createdByUserId}
                  onChange={(event) => {
                    const value = event.target.value;
                    const option = bookkeeperOptions.find((item) => item.value === value);
                    updateDraftFilters({ ...draftFilters, createdByUserId: value, createdBy: option?.createdBy ?? 'all' });
                  }}
                >
                  {bookkeeperOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
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
            流水<strong>{stats.total} 笔</strong>
          </span>
          <span>
            收入<strong>{formatMoney(stats.income)}</strong>
          </span>
          {owner ? (
            <>
              <span>
                支出<strong>{formatMoney(stats.expense)}</strong>
              </span>
              <span>
                净额<strong>{formatMoney(stats.net)}</strong>
              </span>
            </>
          ) : (
            <>
              <span>
                我的笔数<strong>{stats.incomeCount} 笔</strong>
              </span>
              <span>
                客单价<strong>{formatMoney(stats.averageTicket)}</strong>
              </span>
            </>
          )}
        </div>
      </section>
      <section>
        <div className="section-title-row">
          <h2 className="section-title">查询明细</h2>
          <span>共 {rows.length} 条</span>
        </div>
        {rows.length ? (
          <div className="scroll-panel query-ledger-scroll">
            {rows.map((transaction) => (
              <TransactionCard
                key={transaction._id}
                transaction={transaction}
                onEdit={canEditTransaction(session, transaction) ? () => navigate('editTransaction', { id: transaction._id ?? '' }) : undefined}
                onDelete={canDeleteTransaction(session, transaction) ? () => setDeleteTarget(transaction) : undefined}
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
      return Boolean(
        customer.name &&
          row.customerName &&
          !customer.phone &&
          !row.customerPhone &&
          customer.name === row.customerName
      );
    });
  });
}

function filtersFromForm(form: HTMLFormElement, fallback: QueryFilters, bookkeeperOptions: BookkeeperOption[]): QueryFilters {
  const values = new FormData(form);
  const type = parseTransactionType(values.get('type'), fallback.type);
  const createdByUserId = String(values.get('createdByUserId') ?? fallback.createdByUserId);
  const option = bookkeeperOptions.find((item) => item.value === createdByUserId);
  return {
    ...fallback,
    type,
    keyword: String(values.get('keyword') ?? fallback.keyword),
    categoryId: type === 'expense' ? '' : String(values.get('categoryId') ?? fallback.categoryId),
    paymentMethodId: String(values.get('paymentMethodId') ?? fallback.paymentMethodId),
    createdByUserId,
    createdBy: option?.createdBy ?? parseCreatedByFromUserFilter(createdByUserId, fallback.createdBy)
  };
}

function parseTransactionType(value: FormDataEntryValue | null, fallback: QueryFilters['type']): QueryFilters['type'] {
  if (value === 'all' || value === 'income' || value === 'expense') return value;
  return fallback;
}

function parseCreatedBy(value: FormDataEntryValue | null, fallback: QueryFilters['createdBy']): QueryFilters['createdBy'] {
  if (value === 'mom' || value === 'dad' || value === 'unknown' || value === 'all') return value;
  return fallback;
}

function parseCreatedByFromUserFilter(value: string, fallback: QueryFilters['createdBy']): QueryFilters['createdBy'] {
  if (!value.startsWith('legacy:')) return fallback;
  return parseCreatedBy(value.slice('legacy:'.length), fallback);
}

function makeBookkeeperOptions(users: StoreUser[]): BookkeeperOption[] {
  const liveUsers = users
    .filter((user) => !user.deletedAt)
    .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner') || a.displayName.localeCompare(b.displayName, 'zh-CN'));
  const options: BookkeeperOption[] = [{ value: 'all', label: '全部', createdBy: 'all' }];
  const coveredLegacyRoles = new Set<Role>();

  liveUsers.forEach((user) => {
    if (user.legacyRole) coveredLegacyRoles.add(user.legacyRole);
    options.push({
      value: `user:${user._id ?? user.username}`,
      label: `${user.displayName}${user.role === 'employee' ? '（员工）' : ''}`,
      createdBy: user.legacyRole ?? 'all'
    });
  });

  (['mom', 'dad', 'unknown'] as Role[]).forEach((role) => {
    if (!coveredLegacyRoles.has(role)) {
      options.push({ value: `legacy:${role}`, label: roleText[role], createdBy: role });
    }
  });

  return options;
}
