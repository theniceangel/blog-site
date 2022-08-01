# SyncHook

SyncHook 的执行机制与 0.x 版本里面的 applyPlugins 一模一样。代码如下：

:::details SyncHook.js
```js
const Hook = require("./Hook");
const HookCodeFactory = require("./HookCodeFactory");

class SyncHookCodeFactory extends HookCodeFactory {
  content({ onError, onDone, rethrowIfPossible }) {
    return this.callTapsSeries({
      onError: (i, err) => onError(err),
      onDone,
      rethrowIfPossible
    });
  }
}

const factory = new SyncHookCodeFactory();
class SyncHook extends Hook {
  tapAsync() {
    throw new Error("tapAsync is not supported on a SyncHook");
  }

  tapPromise() {
    throw new Error("tapPromise is not supported on a SyncHook");
  }

  compile(options) {
    factory.setup(this, options);
    return factory.create(options);
  }
}
```
:::

SyncHook 不支持 `tapAsync` 与 `tapPromise`，只能通过 tap 来添加 synchronous function，例如：

```js
const syncHook = new SyncHook(['arg1', 'arg2'])

syncHook.tap('minus', (arg1, arg2) => {
  console.log(arg1 - arg2) // 打印1， 2
})

syncHook.tap('plus', (arg1, arg2) => {
  console.log(arg1 + arg2) // 打印1， 2
})
// 执行
syncHook.call(1, 2)
```

## `call`

在调用 call 的时候，最终执行的就是：

```js
class Hook {
  _createCall () {
    return this.compile({
      taps: this.taps,
      interceptors: this.interceptors,
      args: this._args,
      type: type
    });
  }
}
```

也就是子类的 compile 方法：

```js
class SyncHook extends Hook {
  compile(options) {
    factory.setup(this, options);
    return factory.create(options);
  }
}
```