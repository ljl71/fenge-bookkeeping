# loginStore 云函数

这个云函数用于服务端校验店铺 PIN，避免前端直接读取 `stores.pinHash`。

部署前请在 CloudBase 控制台或 CloudBase CLI 中进入本目录安装依赖：

```bash
npm install
```

然后部署函数名：

```text
loginStore
```

前端会通过 `app.callFunction({ name: 'loginStore', data: { storeId, pin } })` 调用。
