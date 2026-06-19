import { useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useApp } from '../AppContext';
import { AddExpense } from './AddExpense';
import { AddIncome } from './AddIncome';
import { canCreateExpense } from '../utils/permissions';

export function Bookkeeping() {
  const { session, routeState, navigate, setToast } = useApp();
  const canExpense = canCreateExpense(session);
  const requestedExpense = routeState.params?.tab === 'expense';
  const tab = requestedExpense && canExpense ? 'expense' : 'income';

  useEffect(() => {
    if (requestedExpense && !canExpense) {
      setToast({ kind: 'info', message: '当前账号不能记录支出' });
      navigate('bookkeeping', { tab: 'income' });
    }
  }, [requestedExpense, canExpense, navigate, setToast]);

  return (
    <div className="page">
      <PageHeader
        title="记账"
        subtitle={session.role === 'employee' ? '记录自己的收入流水。' : tab === 'income' ? '记录顾客做的项目收入，金额会自动汇总。' : '记录进货支出，按不同货品分别汇总。'}
      />
      <section className="panel">
        <div className={canExpense ? 'segmented segmented--two' : 'segmented segmented--one'}>
          <button type="button" className={tab === 'income' ? 'is-selected' : ''} onClick={() => navigate('bookkeeping', { tab: 'income' })}>
            收入
          </button>
          {canExpense ? (
            <button type="button" className={tab === 'expense' ? 'is-selected' : ''} onClick={() => navigate('bookkeeping', { tab: 'expense' })}>
              支出
            </button>
          ) : null}
        </div>
      </section>
      {tab === 'income' ? <AddIncome /> : <AddExpense />}
    </div>
  );
}
