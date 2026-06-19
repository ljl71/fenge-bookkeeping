import { useState } from 'react';
import { Store, UserRoundCheck } from 'lucide-react';
import type { AppSession } from '../types';
import { DEMO_PIN, DEMO_STORE_ID } from '../constants/defaults';
import { isDemoMode } from '../cloudbase/app';
import { loginStore } from '../services/storeService';

interface LoginProps {
  onLogin: (session: AppSession) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [storeId, setStoreId] = useState(DEMO_STORE_ID);
  const [username, setUsername] = useState('mom');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const session = await loginStore(storeId, username, pin);
      onLogin(session);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">
          <Store size={36} />
        </div>
        <h1>芬格美业记账本</h1>
        <p>手机端云同步记账，给家里小店用。</p>
        {isDemoMode ? (
          <div className="notice">
            当前是本地演示模式，默认店铺 ID：{DEMO_STORE_ID}，账号：mom / dad / xiaowang，PIN：{DEMO_PIN}。部署前请配置 CloudBase envId。
          </div>
        ) : null}
        <label className="field">
          <span>店铺 ID</span>
          <input value={storeId} autoComplete="username" onChange={(event) => setStoreId(event.target.value)} />
        </label>
        <label className="field">
          <span>账号</span>
          <input
            value={username}
            autoComplete="username"
            placeholder="例如 mom、dad、xiaowang"
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="field">
          <span>PIN</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            placeholder={isDemoMode ? DEMO_PIN : '请输入 PIN'}
            onChange={(event) => setPin(event.target.value)}
          />
        </label>
        <div className="notice">员工请使用店主分配的账号登录。</div>
        {message ? <div className="form-error">{message}</div> : null}
        <button type="submit" className="button button--primary button--block" disabled={saving}>
          <UserRoundCheck size={22} />
          {saving ? '正在登录...' : '进入账本'}
        </button>
      </form>
    </main>
  );
}
