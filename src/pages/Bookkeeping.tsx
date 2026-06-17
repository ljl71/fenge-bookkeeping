import { PageHeader } from '../components/PageHeader';
import { AddIncome } from './AddIncome';

export function Bookkeeping() {
  return (
    <div className="page">
      <PageHeader title="记账" subtitle="记录顾客做的项目收入，金额会自动汇总。" />
      <AddIncome />
    </div>
  );
}
