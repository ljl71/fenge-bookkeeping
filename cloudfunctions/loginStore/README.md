# loginStore 云函数

这个云函数用于服务端校验店铺账号和 PIN，避免前端直接读取 `stores.pinHash` 或 `storeUsers.pinHash`。

部署前请在 CloudBase 控制台或 CloudBase CLI 中进入本目录安装依赖：

```bash
npm install
```

然后部署函数名：

```text
loginStore
```

前端会通过下面的方式调用：

```js
app.callFunction({
  name: 'loginStore',
  data: { storeId, username, pin }
});
```

校验顺序：

1. 查询 `stores` 确认店铺存在且启用。
2. 优先查询 `storeUsers`，按 `SHA-256(fenge-bookkeeping-user:${storeId}:${username}:${pin})` 校验账号 PIN。
3. 如果 `storeUsers` 尚未初始化，允许空账号或 `boss` / `owner` / `mom` / `dad` 使用旧 `stores.pinHash` 兼容登录。
4. 登录成功后返回完整 session 字段，并尝试写入 `sessions` 集合。
