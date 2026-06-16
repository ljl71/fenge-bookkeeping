import { ArrowLeft } from 'lucide-react';
import { useApp } from '../AppContext';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { TransactionCard } from '../components/TransactionCard';
import { SummaryCard } from '../components/SummaryCard';
import { customerStats } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { maskPhone } from '../utils/phone';

export function CustomerDetail() {
  const { data, routeState, navigate } = useApp();
  const customer = data.customers.find((row) => row._id === routeState.params?.id);
  if (!customer) {
    return (
      <div className="page">
        <PageHeader
          title="顾客详情"
          action={
            <button type="button" className="button button--ghost" onClick={() => navigate('customers')}>
              <ArrowLeft size={18} />
              返回
            </button>
          }
        />
        <EmptyState title="没有找到顾客" text="可能已被删除，请返回顾客列表查看。" />
      </div>
    );
  }

  const stats = customerStats(customer, data.transactions);

  return (
    <div className="page">
      <PageHeader
        title={customer.name}
        subtitle={`${maskPhone(customer.phone)} ${customer.note ? `· ${customer.note}` : ''}`}
        action={
          <button type="button" className="button button--ghost" onClick={() => navigate('customers')}>
            <ArrowLeft size={18} />
            返回
          </button>
        }
      />
      <div className="summary-grid">
        <SummaryCard label="累计消费" value={formatMoney(stats.total)} tone="income" />
        <SummaryCard label="消费次数" value={`${stats.count} 次`} />
        <SummaryCard label="最近到店" value={stats.lastDate ?? '暂无'} />
        <SummaryCard
          label="常做项目"
          value={stats.favoriteItems.length ? stats.favoriteItems.map(([name]) => name).join('、') : '暂无'}
        />
      </div>
      <section>
        <h2 className="section-title">消费记录</h2>
        {stats.rows.length ? (
          <div className="stack">
            {stats.rows.map((transaction) => (
              <TransactionCard key={transaction._id} transaction={transaction} onEdit={() => navigate('editTransaction', { id: transaction._id ?? '' })} />
            ))}
          </div>
        ) : (
          <EmptyState title="暂无消费记录" text="这个顾客还没有收入流水。" />
        )}
      </section>
    </div>
  );
}
