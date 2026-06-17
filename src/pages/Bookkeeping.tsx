import { PageHeader } from '../components/PageHeader';
import { useApp } from '../AppContext';
import { AddExpense } from './AddExpense';
import { AddIncome } from './AddIncome';

export function Bookkeeping() {
  const { routeState, navigate } = useApp();
  const tab = routeState.params?.tab === 'expense' ? 'expense' : 'income';

  return (
    <div className="page">
      <PageHeader title="记账" subtitle={tab === 'income' ? '记录顾客做的项目收入，金额会自动汇总。' : '记录进货支出，按不同货品分别汇总。'} />
      <section className="panel">
        <div className="segmented segmented--two">
          <button type="button" className={tab === 'income' ? 'is-selected' : ''} onClick={() => navigate('bookkeeping', { tab: 'income' })}>
            收入
          </button>
          <button type="button" className={tab === 'expense' ? 'is-selected' : ''} onClick={() => navigate('bookkeeping', { tab: 'expense' })}>
            支出
          </button>
        </div>
      </section>
      {tab === 'income' ? <AddIncome /> : <AddExpense />}
    </div>
  );
}
