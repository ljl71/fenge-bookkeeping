# 芬格美业记账本

`fenge-bookkeeping` 是给“芬格美业”这类家庭夫妻小店使用的手机端云同步记账本。它不是公开商业 SaaS，也不提供多租户企业后台能力；第一版目标是稳定、简单、大字、大按钮、好记账、好查询、好统计。

## 技术栈

- Vite + React + TypeScript
- PWA，可添加到手机桌面
- 腾讯云 CloudBase Web SDK：`@cloudbase/js-sdk`
- CloudBase 云数据库
- CloudBase 静态网站托管

## 本地运行

```bash
npm install
npm run dev
```

打包：

```bash
npm run build
```

本地预览：

```bash
npm run preview
```

没有配置 CloudBase envId 时，项目会进入本地演示模式。演示模式默认账号：

- 店铺 ID：`fenge`
- PIN：`123456`

演示模式只方便本地试用，不能作为真实主数据源。正式使用必须配置 CloudBase。

## 配置 CloudBase

1. 登录腾讯云 CloudBase 控制台，创建一个 CloudBase 环境。
2. 记录环境 ID，例如 `cloud1-xxxxx`。
3. 在项目根目录创建 `.env`：

```bash
VITE_CLOUDBASE_ENV_ID=cloud1-xxxxx
VITE_APP_DEMO_MODE=false
```

4. 在 CloudBase 数据库中创建集合：

- `stores`
- `customers`
- `serviceCategories`
- `serviceItems`
- `expenseCategories`
- `paymentMethods`
- `transactions`

数据库安全规则必须按 `storeId` 隔离数据，不能允许任意读取其他店铺数据。这个项目是家庭内部工具，不建议开放成公开注册系统。

## 创建初始店铺账号

第一版没有公开注册页。请在 CloudBase 数据库的 `stores` 集合里手动新增店铺：

```json
{
  "storeId": "fenge",
  "name": "芬格美业",
  "pinHash": "把 PIN 做 SHA-256 后的字符串",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z",
  "active": true
}
```

PIN 不要明文写入数据库。可以临时在浏览器控制台生成 SHA-256：

```js
async function hashPin(pin) {
  const bytes = new TextEncoder().encode(`fenge-bookkeeping:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
hashPin('你的PIN').then(console.log);
```

登录后，在“设置”里点击“检查并初始化默认配置”，会补齐默认收入项目、支出类别和支付方式，且避免重复插入。

默认配置包括：

- 收入一级项目：睫毛、美甲、洗脸、护肤、产品、办卡/充值、其他
- 睫毛子项目：9号、10号、11号
- 支出类别：材料、进货、房租、水电、工资、杂费、其他
- 支付方式：微信、支付宝、现金、其他

## 部署到 CloudBase 静态网站托管

1. 执行 `npm run build`。
2. 将 `dist/` 目录上传到 CloudBase 静态网站托管。
3. 使用 CloudBase 分配的访问地址或绑定自定义域名。
4. 妈妈和爸爸两台手机访问同一个地址，登录同一个 `storeId` 和 PIN 后即可看到同一份云端账本。

CloudBase 免费环境可能需要关注续费或资源限制，不要开启不必要的按量付费能力。

## 手机添加到桌面

iPhone Safari：

1. 用 Safari 打开部署后的网页地址。
2. 点击底部分享按钮。
3. 选择“添加到主屏幕”。
4. 名称可保留“芬格记账”。

鸿蒙手机浏览器：

1. 打开部署后的网页地址。
2. 点击浏览器菜单。
3. 选择“添加到桌面”或“添加快捷方式”。
4. 从桌面图标进入即可像 App 一样使用。

PWA 本质仍是网页应用，不是原生 App。网络异常时可能无法保存新账目；新增、编辑、删除必须联网成功后才算保存成功。

## 数据同步和备份

- CloudBase 云数据库是主数据源。
- 打开首页、查询、顾客、统计页面时会拉取最新数据。
- 新增、编辑、删除成功后会重新刷新数据。
- 第一版不做实时同步，爸爸或妈妈记账后，另一台手机点击“刷新数据”即可看到最新内容。
- 本地缓存只用于显示上次读取的数据，不作为真实主数据库。
- 建议定期进入“设置 > 备份导出”导出 CSV/JSON，避免误操作或账号问题带来数据风险。

备份页支持：

- 导出全部流水 CSV
- 导出顾客 CSV
- 导出全部数据 JSON
- 导出项目配置 JSON

查询页也支持导出当前筛选结果 CSV。

## 第一版不做

- 会员余额
- 次卡核销
- 预约管理
- 库存管理
- 员工权限系统
- 扫码支付对接
- 自动读取微信/支付宝账单
- AI 识别票据
- 复杂财务报表
- 多店铺商业 SaaS

后续如果要加会员、次卡、预约、库存等功能，可以继续沿用现有 `customers`、`transactions` 和配置项服务结构扩展。
