# loginStore 云函数

这个云函数用于服务端校验店铺 PIN，避免前端直接读取 `stores.pinHash`。员工账号仍作为兼容能力保留，但第一版正式部署可以只使用 `storeId + PIN`。

## 安装依赖

在本目录执行：

```bash
npm install
```

## 部署

在 CloudBase 控制台选择环境 `fenge-bookkeeping-d9d0izd4250984`，新建或上传函数：

- 函数名：`loginStore`
- 入口：`index.main`
- 运行环境：Node.js
- 上传目录：`cloudfunctions/loginStore`

## 调用参数

店主主路径：

```js
app.callFunction({
  name: 'loginStore',
  data: { storeId, pin }
});
```

兼容员工账号：

```js
app.callFunction({
  name: 'loginStore',
  data: { storeId, username, pin }
});
```

## 校验逻辑

1. 校验 `storeId` 和 `pin`，去掉首尾空格。
2. 查询 `stores`，要求 `storeId` 匹配且 `active !== false`。
3. 如果填写了 `username` 且 `storeUsers` 存在该账号，按 `SHA-256(fenge-bookkeeping-user:${storeId}:${username}:${pin})` 校验员工 PIN。
4. 否则按 `SHA-256(fenge-bookkeeping:${pin})` 校验 `stores.pinHash`。
5. 成功返回 `success`、`storeId`、`storeName`、`loginToken`、`createdAt`、`expiresAt`，不会返回 `pinHash`。
6. 如果存在 `sessions` 集合，会尝试写入登录 token hash；写入失败不影响登录。

## 控制台测试 event

```json
{
  "storeId": "fenge",
  "pin": "123456"
}
```

`123456` 只是示例，正式使用请换成自己的 PIN。
