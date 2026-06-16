import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { AddIncome } from './AddIncome';
import { AddExpense } from './AddExpense';
import { useApp } from '../AppContext';

export function Bookkeeping() {
  const { routeState } = useApp();
  const initialTab = routeState.params?.tab === 'expense' ? 'expense' : 'income';
  const [tab, setTab] = useState<'income' | 'expense'>(initialTab);

  return (
    <div className="page">
      <PageHeader title="记账" subtitle="收入和支出分开记，金额会自动汇总。" />
      <div className="segmented segmented--large sticky-segmented">
        <button type="button" className={tab === 'income' ? 'is-selected' : ''} onClick={() => setTab('income')}>
          记收入
        </button>
        <button type="button" className={tab === 'expense' ? 'is-selected' : ''} onClick={() => setTab('expense')}>
          记支出
        </button>
      </div>
      {tab === 'income' ? <AddIncome /> : <AddExpense />}
    </div>
  );
}
