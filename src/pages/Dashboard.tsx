import { MinusCircle, PlusCircle, RefreshCw, Search, UsersRound } from 'lucide-react';
import { useApp } from '../AppContext';
import { accountRoleText } from '../constants/defaults';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { TransactionCard } from '../components/TransactionCard';
import { formatMoney } from '../utils/money';
import { getDateRange, sortByDateDesc } from '../utils/date';
import { inDateRange, summarize } from '../utils/stats';

export function Dashboard() {
  const { session, data, refreshData, loading, stale, navigate } = useApp();
  const employee = session.role === 'employee';
  const todayRange = getDateRange('today');
  const monthRange = getDateRange('month');
  const todayRows = inDateRange(data.transactions, todayRange.startDate, todayRange.endDate);
  const monthRows = inDateRange(data.transactions, monthRange.startDate, monthRange.endDate);
  const todayStats = summarize(todayRows);
  const monthStats = summarize(monthRows);
  const monthLedger = sortByDateDesc(monthRows);
  const employeeTodayStats = summarize(todayRows.filter((row) => row.createdByRole === 'employee'));

  return (
    <div className="page">
      <PageHeader
        title="芬格美业记账本"
        subtitle={`${session.storeName} · ${session.displayName}（${accountRoleText[session.role]}）`}
        action={
          <button type="button" className="button button--ghost" onClick={refreshData} disabled={loading}>
            <RefreshCw size={18} />
            刷新数据
          </button>
        }
      />
      {stale ? <div className="notice">当前可能不是最新数据，请检查网络后刷新。</div> : null}
      {session.fallbackLogin ? <div className="notice">当前使用旧 PIN 兼容登录，建议到设置页初始化店主账号。</div> : null}
      <section className={employee ? 'quick-actions quick-actions--employee' : 'quick-actions'}>
        <button type="button" className="button button--primary" onClick={() => navigate('bookkeeping', { tab: 'income' })}>
          <PlusCircle size={22} />
          {employee ? '记一笔收入' : '记一笔收入'}
        </button>
        {!employee ? (
          <button type="button" className="button button--secondary" onClick={() => navigate('bookkeeping', { tab: 'expense' })}>
            <MinusCircle size={22} />
            记一笔支出
          </button>
        ) : null}
        <button type="button" className="button button--ghost" onClick={() => navigate('query')}>
          <Search size={20} />
          查询流水
        </button>
        {employee ? (
          <button type="button" className="button button--ghost" onClick={() => navigate('customers')}>
            <UsersRound size={20} />
            查看顾客
          </button>
        ) : null}
        {!employee ? (
          <button type="button" className="button button--ghost" onClick={() => navigate('customers')}>
            <UsersRound size={20} />
            查看顾客
          </button>
        ) : null}
      </section>
      <section>
        <h2 className="section-title">{employee ? '我的今日记账' : '今天'}</h2>
        <div className="dashboard-stat-strip">
          <span>
            收入<strong>{formatMoney(todayStats.income)}</strong>
          </span>
          {employee ? (
            <>
              <span>
                笔数<strong>{todayStats.incomeCount} 笔</strong>
              </span>
              <span>
                本月收入<strong>{formatMoney(monthStats.income)}</strong>
              </span>
              <span>
                本月笔数<strong>{monthStats.incomeCount} 笔</strong>
              </span>
            </>
          ) : (
            <>
              <span>
                支出<strong>{formatMoney(todayStats.expense)}</strong>
              </span>
              <span>
                净额<strong>{formatMoney(todayStats.net)}</strong>
              </span>
              <span>
                流水<strong>{todayStats.total} 笔</strong>
              </span>
            </>
          )}
        </div>
      </section>
      {!employee ? (
        <section>
          <h2 className="section-title">今日员工记账</h2>
          <div className="dashboard-stat-strip dashboard-stat-strip--two">
            <span>
              员工收入<strong>{formatMoney(employeeTodayStats.income)}</strong>
            </span>
            <span>
              员工笔数<strong>{employeeTodayStats.incomeCount} 笔</strong>
            </span>
          </div>
        </section>
      ) : null}
      <section>
        <h2 className="section-title">{employee ? '我的本月流水' : '本月'}</h2>
        <div className="dashboard-stat-strip">
          <span>
            收入<strong>{formatMoney(monthStats.income)}</strong>
          </span>
          {employee ? (
            <>
              <span>
                笔数<strong>{monthStats.incomeCount} 笔</strong>
              </span>
              <span>
                客单价<strong>{formatMoney(monthStats.averageTicket)}</strong>
              </span>
              <span>
                顾客<strong>{monthStats.customerCount} 位</strong>
              </span>
            </>
          ) : (
            <>
              <span>
                支出<strong>{formatMoney(monthStats.expense)}</strong>
              </span>
              <span>
                净额<strong>{formatMoney(monthStats.net)}</strong>
              </span>
              <span>
                流水<strong>{monthStats.total} 笔</strong>
              </span>
            </>
          )}
        </div>
      </section>
      <section>
        <div className="section-title-row">
          <h2 className="section-title">本月流水</h2>
          <span>共 {monthLedger.length} 条</span>
        </div>
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
