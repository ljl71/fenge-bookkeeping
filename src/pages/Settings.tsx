import { BarChart3, Boxes, Download, FileSpreadsheet, FileText, LogOut, RefreshCw, RotateCcw, UsersRound } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/PageHeader';
import { accountRoleText } from '../constants/defaults';
import { isDemoMode } from '../cloudbase/app';
import { localDatabase } from '../services/localDatabase';
import { ensureDefaultConfig } from '../services/initService';
import { makeFengeWorkbook } from '../utils/excel';
import { downloadBlob, downloadText, transactionsToCsv } from '../utils/exportCsv';
import { isOwner } from '../utils/permissions';

export function Settings() {
  const { session, data, refreshData, navigate, logout, setToast } = useApp();
  const owner = isOwner(session);
  const ownIncomeRows = data.transactions.filter((row) => !row.deletedAt && row.type === 'income');

  async function initDefaults() {
    try {
      await ensureDefaultConfig(session.storeId);
      await refreshData();
      setToast({ kind: 'success', message: '默认项目和支付方式已检查完成' });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '初始化失败' });
    }
  }

  function resetDemo() {
    localDatabase.resetDemo();
    refreshData();
    setToast({ kind: 'success', message: '本地演示数据已重置' });
  }

  function exportMyExcel() {
    downloadBlob(`fenge-my-income-${session.username}.xlsx`, makeFengeWorkbook(ownIncomeRows, []));
    setToast({ kind: 'success', message: '已导出我的收入 Excel' });
  }

  function exportMyCsv() {
    downloadText(`fenge-my-income-${session.username}.csv`, transactionsToCsv(ownIncomeRows), 'text/csv;charset=utf-8');
    setToast({ kind: 'success', message: '已导出我的收入 CSV' });
  }

  return (
    <div className="page">
      <PageHeader title="设置" subtitle={`${session.storeName} · ${session.displayName}（${accountRoleText[session.role]}）`} />
      {isDemoMode ? <div className="notice">当前是本地演示模式。正式部署后请在 `.env` 配置 CloudBase envId。</div> : null}
      {!owner ? <div className="notice">员工账号只导出和刷新自己的可见收入流水，不包含全店数据。</div> : null}
      <section className="panel">
        <h2>当前账号</h2>
        <div className="table-list">
          <div>
            <span>显示名</span>
            <strong>{session.displayName}</strong>
          </div>
          <div>
            <span>登录账号</span>
            <strong>{session.username}</strong>
          </div>
          <div>
            <span>账号类型</span>
            <strong>{accountRoleText[session.role]}</strong>
          </div>
        </div>
      </section>
      <section className="settings-list">
        {owner ? (
          <>
            <button type="button" onClick={() => navigate('stats')}>
              <BarChart3 size={22} />
              <span>统计经营情况</span>
            </button>
            <button type="button" onClick={() => navigate('projects')}>
              <Boxes size={22} />
              <span>项目 / 支付方式管理</span>
            </button>
            <button type="button" onClick={() => navigate('backup')}>
              <Download size={22} />
              <span>备份导入导出</span>
            </button>
            <button type="button" onClick={() => navigate('employeeManagement')}>
              <UsersRound size={22} />
              <span>员工管理</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={exportMyExcel}>
              <FileSpreadsheet size={22} />
              <span>导出我的收入 Excel</span>
            </button>
            <button type="button" onClick={exportMyCsv}>
              <FileText size={22} />
              <span>导出我的收入 CSV</span>
            </button>
          </>
        )}
        <button type="button" onClick={refreshData}>
          <RefreshCw size={22} />
          <span>刷新数据</span>
        </button>
        {owner ? (
          <button type="button" onClick={initDefaults}>
            <RotateCcw size={22} />
            <span>检查并初始化默认配置</span>
          </button>
        ) : null}
        {owner && isDemoMode ? (
          <button type="button" onClick={resetDemo}>
            <RotateCcw size={22} />
            <span>重置本地演示数据</span>
          </button>
        ) : null}
        <button type="button" className="danger-text" onClick={logout}>
          <LogOut size={22} />
          <span>退出登录</span>
        </button>
      </section>
    </div>
  );
}
