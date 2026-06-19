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

1. 登录腾讯云 CloudBase 控制台，创建一个 CloudBase 环境。
2. 记录环境 ID，例如 `cloud1-xxxxx`。
3. 在项目根目录创建 `.env`：

```bash
VITE_CLOUDBASE_ENV_ID=cloud1-xxxxx
VITE_APP_DEMO_MODE=false
```

不要提交 `.env`、`.env.local`、CloudBase 管理密钥、secret key、云函数密钥、明文 PIN 或任何账号密码。

## 数据库集合

在 CloudBase 云数据库中创建以下集合：

- `stores`
- `storeUsers`
- `sessions`
- `customers`
- `serviceCategories`
- `serviceItems`
- `expenseCategories`
- `paymentMethods`
- `transactions`

安全要求：

- `stores` 集合不允许前端直接读取 `pinHash`。
- `storeUsers` 集合不允许普通员工读取 `pinHash`。
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

- 接收 `storeId`、`username` 和 `pin`
- 服务端查询 `stores`
- 优先查询 `storeUsers`，使用 `SHA-256(fenge-bookkeeping-user:${storeId}:${username}:${pin})` 校验账号 PIN
- 如果 `storeUsers` 尚未初始化，允许空账号或 `boss` / `owner` / `mom` / `dad` 使用旧 `stores.pinHash` 兼容登录
- 校验店铺是否存在、是否停用
- 登录成功后返回 `storeId`、`storeName`、`userId`、`username`、`displayName`、`role`、`legacyRole`、`loginToken`、`createdAt`、`expiresAt`
- 登录成功后尝试写入 `sessions` 集合，保存 `tokenHash`、`storeId`、`userId`、`role`、`createdAt`、`expiresAt`、`revokedAt`

当前 `loginToken` 已写入 `sessions` 设计，但业务数据读写仍主要走前端 CloudBase SDK。业务数据安全仍然依赖 CloudBase 数据库安全规则和所有查询携带 `storeId`。如果后续要做更严格的安全校验，需要在每次云函数或数据库代理调用时校验 token、过期时间、店铺和角色权限。

部署步骤：

```bash
cd cloudfunctions/loginStore
npm install
```

然后在 CloudBase 控制台或 CloudBase CLI 中部署函数名：

```text
loginStore
```

部署后请确认前端匿名登录或对应访问方式有调用该云函数的权限。

## 初始店铺账号

第一版没有公开注册页。请在 CloudBase 数据库 `stores` 集合手动新增店铺：

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

生成 `pinHash` 的方式：

```js
async function hashPin(pin) {
  const bytes = new TextEncoder().encode(`fenge-bookkeeping:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
hashPin('你的PIN').then(console.log);
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
- 员工记收入时，如果填写了 11 位手机号，会新增或更新总顾客档案；未填写手机号时只保存本笔流水里的顾客姓名，避免按同名顾客误合并。
- 员工看不到支出/进货入口，不能进入项目管理、备份导入导出、全店统计和员工管理页面。
- 员工可以进入基础设置页，用于查看当前账号、刷新数据、导出自己的可见收入流水、退出登录切换账号。
- 老流水只有 `createdBy`、没有 `createdByUserId` 时视为店主历史数据，店主可见，员工不可见。

## 初始化默认配置

店主登录后进入“设置”，点击“检查并初始化默认配置”。系统会避免重复插入，并补齐：

- 收入一级项目：睫毛、美甲、洗脸、护肤、产品、办卡/充值、其他
- 睫毛子项目：9号、10号、11号
- 支出类别固定为：进货；进货内部按货品名称区分，例如面膜套装、护肤套装等
- 支付方式：微信、支付宝、现金、其他

## 部署到 CloudBase 静态网站托管

1. 执行 `npm run build`。
2. 将 `dist/` 上传到 CloudBase 静态网站托管。
3. 使用 CloudBase 分配的访问地址或绑定自定义域名。
4. 妈妈和爸爸两台手机访问同一地址，分别使用 `storeId + 账号 + PIN` 登录后即可看到同一份云端账本。

CloudBase 免费环境可能需要关注续费、额度和资源限制。不要开启不必要的按量付费能力。

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
