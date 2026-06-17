import { BarChart3, Boxes, Download, LogOut, RefreshCw, RotateCcw } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/PageHeader';
import { roleText } from '../constants/defaults';
import { isDemoMode } from '../cloudbase/app';
import { localDatabase } from '../services/localDatabase';
import { ensureDefaultConfig } from '../services/initService';

export function Settings() {
  const { session, refreshData, navigate, logout, setToast } = useApp();

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

  return (
    <div className="page">
      <PageHeader title="设置" subtitle={`${session.storeName} · ${roleText[session.role]}`} />
      {isDemoMode ? <div className="notice">当前是本地演示模式。正式部署后请在 `.env` 配置 CloudBase envId。</div> : null}
      <section className="settings-list">
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
        <button type="button" onClick={refreshData}>
          <RefreshCw size={22} />
          <span>刷新数据</span>
        </button>
        <button type="button" onClick={initDefaults}>
          <RotateCcw size={22} />
          <span>检查并初始化默认配置</span>
        </button>
        {isDemoMode ? (
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
