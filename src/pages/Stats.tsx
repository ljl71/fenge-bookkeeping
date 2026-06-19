import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../AppContext';
import type { DatePreset, Role, StoreUser, Transaction } from '../types';
import { DateRangePicker } from '../components/DateRangePicker';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { roleText } from '../constants/defaults';
import { getDateRange, sortByDateDesc } from '../utils/date';
import { isPurchaseExpense, purchaseItemName } from '../utils/expense';
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
  const [bookkeeperFilter, setBookkeeperFilter] = useState('all');
  const bookkeeperOptions = useMemo(() => makeBookkeeperOptions(data.storeUsers), [data.storeUsers]);

  const rangeRows = useMemo(
    () => inDateRange(data.transactions, startDate, endDate).filter((row) => matchesBookkeeper(row, bookkeeperFilter, data.storeUsers)),
    [data.transactions, startDate, endDate, bookkeeperFilter, data.storeUsers]
  );
  const incomeRows = useMemo(() => rangeRows.filter((row) => row.type === 'income'), [rangeRows]);
  const purchaseRows = useMemo(() => rangeRows.filter(isPurchaseExpense), [rangeRows]);
  const stats = summarize(rangeRows);
  const categoryRows = incomeRows.flatMap((row) =>
    row.type === 'income'
      ? (row.items ?? []).map((item) => ({ ...row, totalAmount: item.amount, statKey: item.categoryName }))
      : []
  ) as Array<Transaction & { statKey: string }>;
  const itemRows = incomeRows.flatMap((row) =>
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
  const purchaseItemRows = purchaseRows.flatMap((row) =>
    (row.items?.length ? row.items : [{ itemName: row.expenseCategoryName, amount: row.totalAmount }]).map((item) => ({
      ...row,
      totalAmount: item.amount,
      statKey: purchaseItemName(item)
    }))
  ) as Array<Transaction & { statKey: string }>;
  const byPurchaseItem = groupAmount(purchaseItemRows, (row) => row.statKey);
  const byPayment = groupAmount(rangeRows, (row) => row.paymentMethodName);
  const customerRank = data.customers
    .map((customer) => ({ customer, stats: customerStats(customer, incomeRows) }))
    .filter((row) => row.stats.count > 0)
    .sort((a, b) => b.stats.total - a.stats.total)
    .slice(0, 10);
  const recentCustomers = sortByDateDesc(incomeRows).reduce<
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
        <label className="field">
          <span>记账人</span>
          <select value={bookkeeperFilter} onChange={(event) => setBookkeeperFilter(event.target.value)}>
            {bookkeeperOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>
      <div className="query-stat-strip stats-stat-strip">
        <span>
          总收入<strong>{formatMoney(stats.income)}</strong>
        </span>
        <span>
          总支出<strong>{formatMoney(stats.expense)}</strong>
        </span>
        <span>
          净收入<strong>{formatMoney(stats.net)}</strong>
        </span>
        <span>
          顾客数<strong>{stats.customerCount} 位</strong>
        </span>
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
                  收 {formatMoney(row.income)} · 支 {formatMoney(row.expense)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
      <section className="panel">
        <h2>按进货货品统计支出</h2>
        {byPurchaseItem.length ? (
          <div className="table-list">
            {byPurchaseItem.map((row) => (
              <div key={row.name}>
                <span>{row.name}</span>
                <strong>{formatMoney(row.expense)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无进货支出" />
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

function makeBookkeeperOptions(users: StoreUser[]) {
  const liveUsers = users
    .filter((user) => !user.deletedAt)
    .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner') || a.displayName.localeCompare(b.displayName, 'zh-CN'));
  const coveredLegacyRoles = new Set<Role>();
  const options = [{ value: 'all', label: '全部' }];
  liveUsers.forEach((user) => {
    if (user.legacyRole) coveredLegacyRoles.add(user.legacyRole);
    options.push({
      value: `user:${user._id ?? user.username}`,
      label: `${user.displayName}${user.role === 'employee' ? '（员工）' : ''}`
    });
  });
  (['mom', 'dad', 'unknown'] as Role[]).forEach((role) => {
    if (!coveredLegacyRoles.has(role)) options.push({ value: `legacy:${role}`, label: roleText[role] });
  });
  return options;
}

function matchesBookkeeper(row: Transaction, filter: string, users: StoreUser[]) {
  if (filter === 'all') return true;
  if (filter.startsWith('legacy:')) return row.createdBy === filter.slice('legacy:'.length);
  if (filter.startsWith('user:')) {
    const userId = filter.slice('user:'.length);
    if (row.createdByUserId === userId) return true;
    const user = users.find((item) => (item._id ?? item.username) === userId);
    return Boolean(!row.createdByUserId && user?.legacyRole && row.createdBy === user.legacyRole);
  }
  return row.createdByUserId === filter;
}
