import { ensureCloudbaseAuth, getCloudbaseApp, isDemoMode } from './app';

export interface LoginStoreFunctionResult {
  success?: boolean;
  storeId?: string;
  storeName?: string;
  loginToken?: string;
  sessionToken?: string;
  createdAt?: string;
  expiresAt?: string;
  message?: string;
  code?: string;
}

export async function callLoginStoreFunction(storeId: string, pin: string): Promise<LoginStoreFunctionResult> {
  if (isDemoMode) {
    throw new Error('演示模式不调用 CloudBase 云函数');
  }

  const app = getCloudbaseApp();
  if (!app) throw new Error('CloudBase 未配置，无法登录');
  await ensureCloudbaseAuth();

  const result = await app.callFunction({
    name: 'loginStore',
    data: { storeId, pin }
  });

  const payload = result?.result ?? result;
  return payload as LoginStoreFunctionResult;
}
