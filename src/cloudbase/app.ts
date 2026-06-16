import cloudbase from '@cloudbase/js-sdk';

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID as string | undefined;
const explicitDemo = import.meta.env.VITE_APP_DEMO_MODE === 'true';

export const isDemoMode = explicitDemo || !envId || envId === 'your-cloudbase-env-id';

let cloudbaseApp: any;

export function getCloudbaseApp() {
  if (isDemoMode) return null;
  if (!cloudbaseApp) {
    cloudbaseApp = cloudbase.init({ env: envId ?? '' });
  }
  return cloudbaseApp;
}

export async function ensureCloudbaseAuth() {
  const app = getCloudbaseApp();
  if (!app) return;
  const auth = app.auth({ persistence: 'local' });
  try {
    if (auth.hasLoginState?.()) return;
    if (auth.getLoginState?.()) return;
  } catch {
    // Continue to anonymous sign-in below.
  }

  if (auth.signInAnonymously) {
    await auth.signInAnonymously();
    return;
  }

  if (auth.anonymousAuthProvider) {
    await auth.anonymousAuthProvider().signIn();
    return;
  }

  throw new Error('CloudBase 匿名登录不可用，请检查 @cloudbase/js-sdk 版本');
}
