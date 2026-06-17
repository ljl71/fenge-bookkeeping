import { PlusCircle, RefreshCw, Search, UsersRound } from 'lucide-react';
import { useApp } from '../AppContext';
import { roleText } from '../constants/defaults';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { TransactionCard } from '../components/TransactionCard';
import { formatMoney } from '../utils/money';
import { getDateRange, sortByDateDesc } from '../utils/date';
import { inDateRange, summarize } from '../utils/stats';

export function Dashboard() {
  const { session, data, refreshData, loading, stale, navigate } = useApp();
  const todayRange = getDateRange('today');
  const monthRange = getDateRange('month');
  const todayRows = inDateRange(data.transactions, todayRange.startDate, todayRange.endDate).filter((row) => row.type === 'income');
  const monthRows = inDateRange(data.transactions, monthRange.startDate, monthRange.endDate).filter((row) => row.type === 'income');
  const todayStats = summarize(todayRows);
  const monthStats = summarize(monthRows);
  const monthLedger = sortByDateDesc(monthRows);

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
      <section className="quick-actions quick-actions--income">
        <button type="button" className="button button--primary" onClick={() => navigate('bookkeeping', { tab: 'income' })}>
          <PlusCircle size={22} />
          记一笔收入
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
        <div className="dashboard-stat-strip">
          <span>
            收入<strong>{formatMoney(todayStats.income)}</strong>
          </span>
          <span>
            顾客<strong>{todayStats.customerCount} 位</strong>
          </span>
          <span>
            流水<strong>{todayStats.incomeCount} 笔</strong>
          </span>
          <span>
            客单价<strong>{formatMoney(todayStats.averageTicket)}</strong>
          </span>
        </div>
      </section>
      <section>
        <h2 className="section-title">本月</h2>
        <div className="dashboard-stat-strip">
          <span>
            收入<strong>{formatMoney(monthStats.income)}</strong>
          </span>
          <span>
            顾客<strong>{monthStats.customerCount} 位</strong>
          </span>
          <span>
            流水<strong>{monthStats.incomeCount} 笔</strong>
          </span>
          <span>
            客单价<strong>{formatMoney(monthStats.averageTicket)}</strong>
          </span>
        </div>
      </section>
      <section>
        <h2 className="section-title">本月流水</h2>
        {monthLedger.length ? (
          <div className="scroll-panel dashboard-ledger-scroll">
            {monthLedger.map((transaction) => (
              <TransactionCard key={transaction._id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <EmptyState title="还没有流水" text="可以先记一笔收入。" />
        )}
      </section>
    </div>
  );
}
