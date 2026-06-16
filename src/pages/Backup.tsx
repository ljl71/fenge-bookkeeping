import { ArrowLeft, Download } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/PageHeader';
import { customersToCsv, downloadText, transactionsToCsv } from '../utils/exportCsv';

export function Backup() {
  const { data, session, navigate } = useApp();
  const liveTransactions = data.transactions.filter((row) => !row.deletedAt);
  const liveCustomers = data.customers.filter((row) => !row.deletedAt);
  const config = {
    serviceCategories: data.serviceCategories,
    serviceItems: data.serviceItems,
    expenseCategories: data.expenseCategories,
    paymentMethods: data.paymentMethods
  };
  const allData = {
    storeId: session.storeId,
    exportedAt: new Date().toISOString(),
    ...data
  };

  return (
    <div className="page">
      <PageHeader
        title="备份导出"
        subtitle="建议每月导出一次 CSV 或 JSON。"
        action={
          <button type="button" className="button button--ghost" onClick={() => navigate('settings')}>
            <ArrowLeft size={18} />
            返回
          </button>
        }
      />
      <div className="notice">导出是下载当前云端已读取的数据。第一版不做导入覆盖，避免误操作。</div>
      <section className="settings-list">
        <button
          type="button"
          onClick={() => downloadText('fenge-transactions.csv', transactionsToCsv(liveTransactions), 'text/csv;charset=utf-8')}
        >
          <Download size={22} />
          <span>导出全部流水 CSV</span>
        </button>
        <button type="button" onClick={() => downloadText('fenge-customers.csv', customersToCsv(liveCustomers), 'text/csv;charset=utf-8')}>
          <Download size={22} />
          <span>导出顾客 CSV</span>
        </button>
        <button type="button" onClick={() => downloadText('fenge-all-data.json', JSON.stringify(allData, null, 2), 'application/json;charset=utf-8')}>
          <Download size={22} />
          <span>导出全部数据 JSON</span>
        </button>
        <button type="button" onClick={() => downloadText('fenge-config.json', JSON.stringify(config, null, 2), 'application/json;charset=utf-8')}>
          <Download size={22} />
          <span>导出项目配置 JSON</span>
        </button>
      </section>
    </div>
  );
}
