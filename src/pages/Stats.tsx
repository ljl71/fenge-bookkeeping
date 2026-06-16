import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../AppContext';
import type { DatePreset, Transaction } from '../types';
import { DateRangePicker } from '../components/DateRangePicker';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { SummaryCard } from '../components/SummaryCard';
import { getDateRange, sortByDateDesc } from '../utils/date';
import { itemsText } from '../utils/exportCsv';
import { formatMoney } from '../utils/money';
import { maskPhone } from '../utils/phone';
import { customerStats, groupAmount, inDateRange, summarize } from '../utils/stats';

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div className="bar-row">
      <div>
        <strong>{label}</strong>
        <span>{formatMoney(value)}</span>
      </div>
      <div className="bar-track">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function Stats() {
  const { data, navigate } = useApp();
  const initial = getDateRange('month');
  const [preset, setPreset] = useState<DatePreset>('month');
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);

  const rows = useMemo(() => inDateRange(data.transactions, startDate, endDate), [data.transactions, startDate, endDate]);
  const stats = summarize(rows);
  const categoryRows = rows.flatMap((row) =>
    row.type === 'income'
      ? (row.items ?? []).map((item) => ({ ...row, totalAmount: item.amount, statKey: item.categoryName }))
      : []
  ) as Array<Transaction & { statKey: string }>;
  const itemRows = rows.flatMap((row) =>
    row.type === 'income'
      ? (row.items ?? []).map((item) => ({
          ...row,
          totalAmount: item.amount,
          statKey: `${item.categoryName}${item.itemName ? `/${item.itemName}` : ''}`
        }))
      : []
  ) as Array<Transaction & { statKey: string }>;
  const byCategory = groupAmount(
    categoryRows,
    (row) => row.statKey
  );
  const byItem = groupAmount(
    itemRows,
    (row) => row.statKey
  );
  const byPayment = groupAmount(rows, (row) => row.paymentMethodName);
  const byExpense = groupAmount(rows.filter((row) => row.type === 'expense'), (row) => row.expenseCategoryName);
  const customerRank = data.customers
    .map((customer) => ({ customer, stats: customerStats(customer, rows) }))
    .filter((row) => row.stats.count > 0)
    .sort((a, b) => b.stats.total - a.stats.total)
    .slice(0, 10);
  const recentCustomers = sortByDateDesc(rows.filter((row) => row.type === 'income')).reduce<
    Array<{ transaction: Transaction; customerId: string }>
  >((result, transaction) => {
    const customer =
      data.customers.find((row) => row._id === transaction.customerId) ||
      data.customers.find((row) => row.name === transaction.customerName && row.phone === transaction.customerPhone);
    const customerId = customer?._id || transaction.customerId || '';
    const key = customerId || `${transaction.customerName || '未知'}-${transaction.customerPhone || ''}`;
    if (!key || result.some((row) => row.customerId === key)) return result;
    result.push({ transaction, customerId: key });
    return result;
  }, []).slice(0, 10);
  const maxCategory = Math.max(0, ...byCategory.map((row) => row.income));

  function changePreset(next: DatePreset) {
    const range = getDateRange(next, startDate, endDate);
    setPreset(next);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  return (
    <div className="page">
      <PageHeader
        title="统计"
        subtitle="看整体经营情况，不查单条流水。"
        action={
          <button type="button" className="button button--ghost" onClick={() => navigate('settings')}>
            <ArrowLeft size={18} />
            返回
          </button>
        }
      />
      <section className="panel">
        <DateRangePicker
          preset={preset}
          startDate={startDate}
          endDate={endDate}
          onPresetChange={changePreset}
          onStartChange={(value) => {
            setPreset('custom');
            setStartDate(value);
          }}
          onEndChange={(value) => {
            setPreset('custom');
            setEndDate(value);
          }}
        />
      </section>
      <div className="summary-grid">
        <SummaryCard label="总收入" value={formatMoney(stats.income)} tone="income" />
        <SummaryCard label="总支出" value={formatMoney(stats.expense)} tone="expense" />
        <SummaryCard label="净收入" value={formatMoney(stats.net)} tone={stats.net >= 0 ? 'income' : 'expense'} />
        <SummaryCard label="收入笔数" value={`${stats.incomeCount} 笔`} />
        <SummaryCard label="支出笔数" value={`${stats.expenseCount} 笔`} />
        <SummaryCard label="顾客数" value={`${stats.customerCount} 位`} />
        <SummaryCard label="平均客单价" value={formatMoney(stats.averageTicket)} />
      </div>
      <section className="panel">
        <h2>按一级项目统计收入</h2>
        {byCategory.length ? byCategory.map((row) => <BarRow key={row.name} label={row.name} value={row.income} max={maxCategory} />) : <EmptyState />}
      </section>
      <section className="panel">
        <h2>按子项目统计收入</h2>
        {byItem.length ? (
          <div className="table-list">
            {byItem.map((row) => (
              <div key={row.name}>
                <span>{row.name}</span>
                <strong>{formatMoney(row.income)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
      <section className="panel">
        <h2>按支付方式统计</h2>
        {byPayment.length ? (
          <div className="table-list">
            {byPayment.map((row) => (
              <div key={row.name}>
                <span>{row.name}</span>
                <strong>
                  收 {formatMoney(row.income)} / 支 {formatMoney(row.expense)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
      <section className="panel">
        <h2>按支出类别统计</h2>
        {byExpense.length ? (
          <div className="table-list">
            {byExpense.map((row) => (
              <div key={row.name}>
                <span>{row.name}</span>
                <strong>{formatMoney(row.expense)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
      <section className="panel">
        <h2>顾客消费排行榜</h2>
        {customerRank.length ? (
          <div className="table-list">
            {customerRank.map(({ customer, stats: customerTotal }, index) => (
              <div key={customer._id}>
                <span>
                  {index + 1}. {customer.name}
                </span>
                <strong>
                  {formatMoney(customerTotal.total)} · {customerTotal.count} 次
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无顾客消费排行" />
        )}
      </section>
      <section className="panel">
        <h2>最近消费顾客</h2>
        {recentCustomers.length ? (
          <div className="table-list recent-customer-list">
            {recentCustomers.map(({ transaction, customerId }) => {
              const customer = data.customers.find((row) => row._id === customerId);
              const targetId = customer?._id || transaction.customerId || '';
              return (
                <button
                  key={customerId}
                  type="button"
                  disabled={!targetId}
                  onClick={() => targetId && navigate('customerDetail', { id: targetId })}
                >
                  <span>
                    <strong>{transaction.customerName || customer?.name || '未知顾客'}</strong>
                    <small>
                      {maskPhone(transaction.customerPhone || customer?.phone)} · {transaction.date} · {itemsText(transaction)}
                    </small>
                  </span>
                  <strong>
                    {formatMoney(transaction.totalAmount)} · {transaction.paymentMethodName}
                  </strong>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState title="暂无最近消费顾客" text="当前时间范围内还没有收入流水。" />
        )}
      </section>
    </div>
  );
}
