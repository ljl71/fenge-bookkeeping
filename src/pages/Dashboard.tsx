import { PlusCircle, RefreshCw, Search, UsersRound } from 'lucide-react';
import { useApp } from '../AppContext';
import { roleText } from '../constants/defaults';
import { PageHeader } from '../components/PageHeader';
import { SummaryCard } from '../components/SummaryCard';
import { EmptyState } from '../components/EmptyState';
import { TransactionCard } from '../components/TransactionCard';
import { formatMoney } from '../utils/money';
import { getDateRange } from '../utils/date';
import { inDateRange, summarize } from '../utils/stats';

export function Dashboard() {
  const { session, data, refreshData, loading, stale, navigate } = useApp();
  const todayRange = getDateRange('today');
  const monthRange = getDateRange('month');
  const todayStats = summarize(inDateRange(data.transactions, todayRange.startDate, todayRange.endDate));
  const monthStats = summarize(inDateRange(data.transactions, monthRange.startDate, monthRange.endDate));
  const recent = data.transactions.filter((row) => !row.deletedAt).slice(0, 5);

  return (
    <div className="page">
      <PageHeader
        title="芬格美业记账本"
        subtitle={`当前使用者：${roleText[session.role]}`}
        action={
          <button type="button" className="button button--ghost" onClick={refreshData} disabled={loading}>
            <RefreshCw size={18} />
            刷新数据
          </button>
        }
      />
      {stale ? <div className="notice">当前可能不是最新数据，请检查网络后刷新。</div> : null}
      <section className="quick-actions">
        <button type="button" className="button button--primary" onClick={() => navigate('bookkeeping', { tab: 'income' })}>
          <PlusCircle size={22} />
          记一笔收入
        </button>
        <button type="button" className="button button--secondary" onClick={() => navigate('bookkeeping', { tab: 'expense' })}>
          <PlusCircle size={22} />
          记一笔支出
        </button>
        <button type="button" className="button button--ghost" onClick={() => navigate('query')}>
          <Search size={20} />
          查询流水
        </button>
        <button type="button" className="button button--ghost" onClick={() => navigate('customers')}>
          <UsersRound size={20} />
          查看顾客
        </button>
      </section>
      <section>
        <h2 className="section-title">今天</h2>
        <div className="summary-grid">
          <SummaryCard label="今日收入" value={formatMoney(todayStats.income)} tone="income" />
          <SummaryCard label="今日支出" value={formatMoney(todayStats.expense)} tone="expense" />
          <SummaryCard label="今日净收入" value={formatMoney(todayStats.net)} tone={todayStats.net >= 0 ? 'income' : 'expense'} />
          <SummaryCard label="今日流水" value={`${todayStats.total} 笔`} />
        </div>
      </section>
      <section>
        <h2 className="section-title">本月</h2>
        <div className="summary-grid">
          <SummaryCard label="本月收入" value={formatMoney(monthStats.income)} tone="income" />
          <SummaryCard label="本月支出" value={formatMoney(monthStats.expense)} tone="expense" />
          <SummaryCard label="本月净收入" value={formatMoney(monthStats.net)} tone={monthStats.net >= 0 ? 'income' : 'expense'} />
          <SummaryCard label="本月流水" value={`${monthStats.total} 笔`} />
        </div>
      </section>
      <section>
        <h2 className="section-title">最近 5 笔流水</h2>
        {recent.length ? (
          <div className="stack">
            {recent.map((transaction) => (
              <TransactionCard key={transaction._id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <EmptyState title="还没有流水" text="可以先记一笔收入或支出。" />
        )}
      </section>
    </div>
  );
}
