import { useState } from 'react';
import { ArrowLeft, KeyRound, Save, Trash2, UserPlus } from 'lucide-react';
import { useApp } from '../AppContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import type { StoreUser } from '../types';
import {
  createEmployee,
  disableEmployee,
  enableEmployee,
  resetEmployeePin,
  softDeleteEmployee,
  updateEmployee
} from '../services/storeUserService';

const emptyEmployee = {
  username: '',
  displayName: '',
  pin: '',
  active: true
};

export function EmployeeManagement() {
  const { session, data, navigate, refreshData, setToast } = useApp();
  const [draft, setDraft] = useState(emptyEmployee);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreUser | null>(null);
  const employees = data.storeUsers.filter((user) => user.role === 'employee' && !user.deletedAt);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      await refreshData();
      setToast({ kind: 'success', message: success });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '操作失败' });
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    await run(
      async () => {
        await createEmployee({ storeId: session.storeId, ...draft });
        setDraft(emptyEmployee);
      },
      '员工账号已新增'
    );
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await run(() => softDeleteEmployee(deleteTarget), '员工账号已删除');
    setDeleteTarget(null);
  }

  return (
    <div className="page">
      <PageHeader
        title="员工管理"
        subtitle="新增、停用或重置员工记账账号。"
        action={
          <button type="button" className="button button--ghost" onClick={() => navigate('settings')}>
            <ArrowLeft size={18} />
            返回
          </button>
        }
      />
      <form className="panel" onSubmit={submit}>
        <h2>新增员工</h2>
        <label className="field">
          <span>员工姓名</span>
          <input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
        </label>
        <label className="field">
          <span>登录账号</span>
          <input value={draft.username} placeholder="例如 xiaowang" onChange={(event) => setDraft({ ...draft, username: event.target.value })} />
        </label>
        <label className="field">
          <span>初始 PIN</span>
          <input type="password" inputMode="numeric" value={draft.pin} onChange={(event) => setDraft({ ...draft, pin: event.target.value })} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          <span>启用账号</span>
        </label>
        <button type="submit" className="button button--primary button--block" disabled={saving}>
          <UserPlus size={20} />
          {saving ? '正在新增...' : '新增员工'}
        </button>
      </form>
      <section className="stack">
        {employees.length ? (
          employees.map((employee) => (
            <EmployeeRow
              key={employee._id}
              employee={employee}
              onSaved={refreshData}
              onToast={setToast}
              onToggle={() => run(() => (employee.active ? disableEmployee(employee) : enableEmployee(employee)), employee.active ? '员工账号已停用' : '员工账号已启用')}
              onDelete={() => setDeleteTarget(employee)}
            />
          ))
        ) : (
          <div className="empty-state">
            <strong>还没有员工账号</strong>
            <p>可以先新增一个员工，再把账号和 PIN 告诉员工登录。</p>
          </div>
        )}
      </section>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除员工"
        message="删除后员工不能再登录，历史流水仍会保留给店主查看。确定删除吗？"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function EmployeeRow({
  employee,
  onSaved,
  onToast,
  onToggle,
  onDelete
}: {
  employee: StoreUser;
  onSaved: () => Promise<void>;
  onToast: (toast: { kind: 'success' | 'error' | 'info'; message: string } | null) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [displayName, setDisplayName] = useState(employee.displayName);
  const [newPin, setNewPin] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    try {
      await action();
      await onSaved();
      onToast({ kind: 'success', message: success });
      setNewPin('');
      setPinOpen(false);
    } catch (error) {
      onToast({ kind: 'error', message: error instanceof Error ? error.message : '操作失败' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="panel employee-card">
      <div className="panel-title-row">
        <div>
          <h2>{employee.displayName}</h2>
          <small>
            {employee.username} · {employee.active ? '启用中' : '已停用'}
          </small>
        </div>
        <button type="button" className={employee.active ? 'button button--ghost button--small danger-text' : 'button button--ghost button--small'} onClick={onToggle}>
          {employee.active ? '停用' : '启用'}
        </button>
      </div>
      <div className="inline-form employee-inline-form">
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        <button type="button" className="button button--primary" disabled={saving} onClick={() => run(() => updateEmployee(employee, { displayName, active: employee.active }), '员工姓名已保存')}>
          <Save size={18} />
          保存
        </button>
      </div>
      {pinOpen ? (
        <div className="inline-form employee-inline-form">
          <input type="password" inputMode="numeric" placeholder="新 PIN" value={newPin} onChange={(event) => setNewPin(event.target.value)} />
          <button type="button" className="button button--secondary" disabled={saving} onClick={() => run(() => resetEmployeePin(employee, newPin), '员工 PIN 已重置')}>
            <KeyRound size={18} />
            重置
          </button>
        </div>
      ) : null}
      <div className="button-row">
        <button type="button" className="button button--ghost" onClick={() => setPinOpen((open) => !open)}>
          <KeyRound size={18} />
          重置 PIN
        </button>
        <button type="button" className="button button--ghost danger-text" onClick={onDelete}>
          <Trash2 size={18} />
          删除
        </button>
      </div>
    </article>
  );
}

