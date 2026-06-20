# 芬格美业记账本

`fenge-bookkeeping` 是给“芬格美业”这类家庭夫妻小店使用的手机端云同步记账本。它不是公开商业 SaaS，也不是多店铺企业后台；第一版重点是稳定、简单、大字、大按钮、好记账、好查询、好统计、数据以云端为准。

## 技术栈

- Vite + React + TypeScript
- PWA，可添加到手机桌面
- 腾讯云 CloudBase Web SDK：`@cloudbase/js-sdk`
- CloudBase 云数据库
- CloudBase 云函数：`loginStore`
- CloudBase 静态网站托管

## 本地启动

```bash
npm install
npm run dev
```

检查和打包：

```bash
npm run check
npm run build
npm run preview
```

没有配置 CloudBase envId 时，项目会进入本地演示模式。演示模式默认账号：

- 店铺 ID：`fenge`
- 店主账号：`mom` / `dad`
- 员工账号：`xiaowang`
- PIN：`123456`

演示模式只方便本地试用，不能作为真实主数据源。正式使用必须配置 CloudBase。

## CloudBase 环境

当前正式环境：

- 环境名称：`fenge-bookkeeping`
- 环境 ID：`fenge-bookkeeping-d9d0izd4250984`
- 地域：上海
- 套餐：免费体验版

本地开发或正式构建前，在项目根目录创建 `.env`：

```bash
VITE_CLOUDBASE_ENV_ID=fenge-bookkeeping-d9d0izd4250984
VITE_APP_DEMO_MODE=false
```

`VITE_CLOUDBASE_ENV_ID` 有值且 `VITE_APP_DEMO_MODE` 不是 `true` 时，前端会走 CloudBase；没有配置 envId、envId 仍是占位值，或 `VITE_APP_DEMO_MODE=true` 时才走本地演示模式。

不要提交 `.env`、`.env.local`、CloudBase 管理密钥、secret key、云函数密钥、明文 PIN 或任何账号密码。

## 数据库集合

在 CloudBase 云数据库中至少创建以下集合：

- `stores`
- `customers`
- `serviceCategories`
- `serviceItems`
- `expenseCategories`
- `paymentMethods`
- `transactions`

如果后续要使用员工账号管理或记录登录 token，也可以额外创建：

- `storeUsers`
- `sessions`

安全要求：

- `stores` 集合不允许前端直接读取 `pinHash`。
- 如果创建 `storeUsers`，它不允许普通员工读取 `pinHash`。
- `customers`、`transactions`、`serviceCategories`、`serviceItems`、`expenseCategories`、`paymentMethods` 必须按 `storeId` 隔离。
- 员工账号不应拥有全店 `transactions`、`customers`、`storeUsers` 的直接读取权限。
- 前端所有查询、新增、更新、软删除都必须携带当前登录店铺的 `storeId`。
- 匿名登录或 Web 端访问权限不要给过大，不能开放全库读写。
- 数据库规则需要明确限制只能访问当前店铺范围内的数据；不要因为是家庭工具就把集合设成完全公开。
- 当前员工权限主要在前端和登录云函数层实现，适合家庭小店内部工具，不是强安全多租户 SaaS。后续更严格版本建议把 `transactions` 查询、新增、编辑、删除都迁到云函数，由云函数校验 `sessionToken`、`userId`、`role` 后访问数据库。

## loginStore 云函数

前端登录不再直接查询 `stores.pinHash`，而是调用 CloudBase 云函数：

```text
cloudfunctions/loginStore
```

云函数做的事情：

- 接收 `storeId`、`pin`，也兼容可选的 `username`
- 服务端查询 `stores` 集合，不把 `pinHash` 返回给前端
- 店铺不存在、`active === false`、PIN 错误时返回 `{ success: false, message }`
- 店主主路径：使用 `SHA-256(fenge-bookkeeping:${pin})` 比对 `stores.pinHash`
- 如果填写了员工账号且 `storeUsers` 中存在该账号，则使用 `SHA-256(fenge-bookkeeping-user:${storeId}:${username}:${pin})` 比对员工 PIN
- 登录成功后返回 `success`、`storeId`、`storeName`、`loginToken`、`createdAt`、`expiresAt`，并兼容返回 `userId`、`username`、`displayName`、`role`、`legacyRole`
- 如果存在 `sessions` 集合，会尝试保存 `tokenHash`、`storeId`、`userId`、`role`、`createdAt`、`expiresAt`、`revokedAt`；保存失败不影响登录

当前 `loginToken` 第一版主要是前端本地登录态；业务数据读写仍主要走前端 CloudBase SDK。业务数据安全仍然依赖 CloudBase 数据库安全规则和所有查询携带 `storeId`。如果后续要做更严格的安全校验，需要在每次云函数或数据库代理调用时校验 token、过期时间、店铺和角色权限。

部署步骤：

```bash
cd cloudfunctions/loginStore
npm install
```

然后在 CloudBase 控制台或 CloudBase CLI 中部署函数名：

```text
loginStore
```

函数入口使用默认 `index.main`。部署后请确认前端匿名登录或对应访问方式有调用该云函数的权限。

控制台测试 event 示例：

```json
{
  "storeId": "fenge",
  "pin": "123456"
}
```

`123456` 只是示例，正式 PIN 请自己设置。

## 初始店铺账号

第一版没有公开注册页。请在 CloudBase 数据库 `stores` 集合手动新增店铺：

```json
{
  "storeId": "fenge",
  "name": "芬格美业",
  "pinHash": "用 scripts/generate-pin-hash.mjs 生成的 hash",
  "active": true,
  "createdAt": "2026-06-19T00:00:00.000Z",
  "updatedAt": "2026-06-19T00:00:00.000Z"
}
```

生成 `pinHash` 的方式：

```bash
node scripts/generate-pin-hash.mjs 你的PIN
```

PIN 不要明文保存到数据库，也不要写入前端代码。

新增 `storeUsers` 集合后，推荐初始化店主账号：

```json
{
  "storeId": "fenge",
  "username": "mom",
  "displayName": "妈妈",
  "role": "owner",
  "legacyRole": "mom",
  "pinHash": "使用新规则 hash 后的值",
  "active": true,
  "createdAt": "2026-06-19T00:00:00.000Z",
  "updatedAt": "2026-06-19T00:00:00.000Z",
  "deletedAt": null
}
```

```json
{
  "storeId": "fenge",
  "username": "dad",
  "displayName": "爸爸",
  "role": "owner",
  "legacyRole": "dad",
  "pinHash": "使用新规则 hash 后的值",
  "active": true,
  "createdAt": "2026-06-19T00:00:00.000Z",
  "updatedAt": "2026-06-19T00:00:00.000Z",
  "deletedAt": null
}
```

员工账号示例：

```json
{
  "storeId": "fenge",
  "username": "xiaowang",
  "displayName": "小王",
  "role": "employee",
  "pinHash": "使用新规则 hash 后的值",
  "active": true,
  "createdAt": "2026-06-19T00:00:00.000Z",
  "updatedAt": "2026-06-19T00:00:00.000Z",
  "deletedAt": null
}
```

生成店内账号 PIN hash：

```js
async function hashStoreUserPin(storeId, username, pin) {
  const text = `fenge-bookkeeping-user:${storeId}:${username}:${pin}`;
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
hashStoreUserPin('fenge', 'mom', '你的PIN').then(console.log);
```

`sessions` 集合记录示例：

```json
{
  "tokenHash": "登录 token hash",
  "storeId": "fenge",
  "userId": "storeUsers 文档 _id",
  "role": "owner",
  "createdAt": "2026-06-19T00:00:00.000Z",
  "expiresAt": "2026-06-26T00:00:00.000Z",
  "revokedAt": null
}
```

员工权限边界：

- 店主账号可以查看、查询、统计、导出全店流水，也可以管理员工。
- 员工账号只能新增收入流水，只能查看、编辑、删除自己创建的收入流水。
- 员工可以进入顾客页，但只显示自己可见收入流水关联到的顾客；顾客详情里的消费统计和消费记录也只基于该员工自己的可见流水。
- 员工记收入时必须填写 11 位手机号，系统会按手机号新增或更新总顾客档案，避免按同名顾客误合并。
- 员工看不到支出/进货入口，不能进入项目管理、备份导入导出、全店统计和员工管理页面。
- 员工可以进入基础设置页，用于查看当前账号、刷新数据、导出自己的可见收入流水、退出登录切换账号。
- 老流水只有 `createdBy`、没有 `createdByUserId` 时视为店主历史数据，店主可见，员工不可见。

## 初始化默认配置

店主登录后进入“设置”，点击“检查并初始化默认配置”。系统会避免重复插入，并补齐：

- 收入一级项目：睫毛、美甲、洗脸、护肤、产品、办卡/充值、其他
- 睫毛子项目：9号、10号、11号
- 支出类别固定为：进货；进货内部按货品名称区分，例如面膜套装、护肤套装等
- 支付方式：微信、支付宝、现金、其他

## 正式部署到 CloudBase

下面按控制台可照做的顺序来。

### 1. 确认 CloudBase 环境

你已经创建：

- 环境名称：`fenge-bookkeeping`
- 环境 ID：`fenge-bookkeeping-d9d0izd4250984`
- 地域：上海
- 套餐：免费体验版

后续所有数据库、云函数、静态网站托管都选择这个环境。

### 2. 创建数据库集合

进入 CloudBase 控制台，选择环境 `fenge-bookkeeping-d9d0izd4250984`，在“数据库”里创建：

- `stores`
- `customers`
- `serviceCategories`
- `serviceItems`
- `expenseCategories`
- `paymentMethods`
- `transactions`

如果要使用员工管理，再创建：

- `storeUsers`
- `sessions`

### 3. 新增初始店铺数据

先在本地生成 PIN hash：

```bash
node scripts/generate-pin-hash.mjs 你的PIN
```

输出示例：

```text
PIN: 你的PIN
pinHash: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

然后在 `stores` 集合新增一条记录：

```json
{
  "storeId": "fenge",
  "name": "芬格美业",
  "pinHash": "用 scripts/generate-pin-hash.mjs 生成的 hash",
  "active": true,
  "createdAt": "2026-06-19T00:00:00.000Z",
  "updatedAt": "2026-06-19T00:00:00.000Z"
}
```

`pinHash` 只能填 hash，不能填明文 PIN。

### 4. 部署 loginStore 云函数

在本地进入云函数目录并安装依赖：

```bash
cd cloudfunctions/loginStore
npm install
```

在 CloudBase 控制台中：

1. 选择环境 `fenge-bookkeeping-d9d0izd4250984`。
2. 进入“云函数”。
3. 新建或上传函数，函数名必须是 `loginStore`。
4. 上传 `cloudfunctions/loginStore` 目录内容。
5. 运行环境选择 Node.js。
6. 函数入口使用默认 `index.main`。
7. 部署完成后，确认匿名登录或 Web 端访问有调用该云函数的权限。

控制台测试 event：

```json
{
  "storeId": "fenge",
  "pin": "123456"
}
```

这里的 `123456` 只是示例。正式测试时请换成你真实设置的 PIN。成功时应返回：

```json
{
  "success": true,
  "storeId": "fenge",
  "storeName": "芬格美业",
  "loginToken": "...",
  "createdAt": "...",
  "expiresAt": "..."
}
```

### 5. 配置前端环境变量

在项目根目录创建本地 `.env`：

```bash
VITE_CLOUDBASE_ENV_ID=fenge-bookkeeping-d9d0izd4250984
VITE_APP_DEMO_MODE=false
```

不要提交 `.env`。

### 6. 检查并构建前端

```bash
npm run check
npm run build
```

构建产物在 `dist/`。

### 7. 部署静态网站

控制台方式：

1. 进入 CloudBase 控制台。
2. 选择环境 `fenge-bookkeeping-d9d0izd4250984`。
3. 进入“静态网站托管”。
4. 上传 `dist/` 目录里的全部文件。
5. 部署成功后复制访问地址，用手机浏览器打开。

CloudBase CLI 方式（可选）：

```bash
npm install -g @cloudbase/cli
tcb login
tcb hosting deploy ./dist -e fenge-bookkeeping-d9d0izd4250984
```

部署完成后，爸爸和妈妈的手机打开同一个访问地址，使用同一个 `storeId=fenge` 和同一个 PIN 登录，就会访问同一份云端账本。

CloudBase 免费体验版要关注额度、到期时间和资源限制。不要开启不必要的按量付费能力。

## 安全边界说明

这个项目是家庭小店内部工具，不是公开 SaaS。

- 不要公开真实 `.env`、CloudBase 密钥、PIN、`pinHash`、云函数密钥或任何账号密码。
- `stores` 集合不能让前端直接读取 `pinHash`。
- 当前第一版 `loginToken` 主要是前端本地登录态，不是完整云端鉴权系统。
- 如果数据库仍由前端 CloudBase SDK 直接读写，那么 `storeId` 隔离依赖数据库安全规则和前端约束，不能等同于严格多租户安全。
- 如果后续要更安全，应把 `customers`、`transactions`、配置项的增删改查也迁移到云函数代理，由服务端校验 `loginToken`、`storeId`、角色和过期时间。
- 当前版本只建议给自家父母小范围使用，不建议开放注册或给外部商家使用。

## PWA 添加到桌面

iPhone Safari：

1. 用 Safari 打开部署后的网页地址。
2. 点击底部分享按钮。
3. 选择“添加到主屏幕”。
4. 名称可保留“芬格记账”。

鸿蒙/安卓浏览器：

1. 打开部署后的网页地址。
2. 点击浏览器菜单。
3. 选择“添加到桌面”或“添加快捷方式”。
4. 从桌面图标进入即可像 App 一样使用。

PWA 本质仍是网页应用，不是原生 App。如果部署新版本后手机端还是旧页面，可以尝试刷新网页、关闭后重新打开、清除站点缓存，或删除桌面图标后重新添加。

## 数据同步、软删除和备份

- CloudBase 云数据库是主数据源。
- 打开首页、查询、顾客、统计页面时会拉取最新数据。
- 新增、编辑、删除成功后会重新刷新数据。
- 删除流水、顾客、项目配置都是软删除，不是物理删除。
- 网络异常时保存可能失败，不要重复乱点保存；失败后请检查网络并重试。
- 第一版不做实时同步，另一台手机可点击“刷新数据”查看最新账本。
- 本地缓存只用于显示上次读取的数据，不作为真实主数据库。
- 建议定期进入“设置 > 备份导入导出”导出 CSV/JSON/Excel，避免误操作或账号问题导致数据风险。

备份页支持：

- 导出收入与顾客 Excel
- 从 Excel 批量导入顾客和收入流水
- 导出全部流水 CSV
- 导出顾客 CSV
- 导出全部数据 JSON
- 导出项目配置 JSON

Excel 导入只追加数据，不覆盖、不删除已有数据。第一版只导入“顾客”和“收入流水”，收入流水要求填写日期、顾客姓名、一级项目和大于 0 的金额；一行会保存为一笔收入记录。

查询页也支持导出当前筛选结果 CSV/JSON/Excel；员工导出的结果只包含自己可见的收入流水。

## 第一版不做

- 会员余额
- 次卡核销
- 预约管理
- 库存管理
- 扫码支付对接
- 自动读取微信/支付宝账单
- AI 识别票据
- 复杂财务报表
- 多店铺商业 SaaS

后续如果要加会员、次卡、预约、库存等功能，可以继续沿用现有 `customers`、`transactions` 和配置项服务结构扩展。

## 上线前检查清单

- [ ] `.env` 已配置正确环境 ID
- [ ] `npm run check` 通过
- [ ] `npm run build` 通过
- [ ] CloudBase 已创建所有基础集合
- [ ] `stores` 已新增 `fenge` 店铺
- [ ] `pinHash` 不是明文 PIN
- [ ] `loginStore` 云函数测试通过
- [ ] `dist/` 已上传静态网站托管
- [ ] 手机上可以打开访问地址
- [ ] 爸爸/妈妈手机能登录同一个 `storeId`
- [ ] 登录后“检查并初始化默认配置”成功
- [ ] 新增一笔收入后另一台手机刷新能看到
- [ ] 备份导出功能可用
