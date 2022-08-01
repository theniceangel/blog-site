# tapable-1.x

由于 0.x 版本当插件注册过多的时候，很容易造成函数栈溢出，因此 1.x 主要通过 compile 的手段来解决这个问题，并且在此之上扩展了 `interception`、`context` 等能力，不过这些是细枝末节，最重要的还是理解 compile。

1.x 版本，引入了 Hook 的概念，每个 Hook 都可以被 tapped（钩入）自己的 functions 来实现业务逻辑，functions 内部怎么被执行是与 Hook 的类型相关：

- `basic`: 名字不含有下面三种名称的钩子都是 basic，这种钩子仅仅连续调用 tapped functions 而已。
- `Waterfall`: 与 `basic` 类似，不过上一个 tapped function 的返回值会传递给下一个 function。
- `Bail`: Bail hook 允许**尽早返回**，只要任意的 tapped function 有返回值，会停止后续所有 function 的执行。
- `Loop`: 直到某一个 tapped function 返回非 undefined 的值，否则会循环执行所有的 tapped function。

另外，hooks 也支持`同步(synchronous)或者异步(asynchronous)`的方式执行，它们的 class 名称都包含了 `Sync`、`AsyncSeries`、`AsyncParallel`:

- `Sync`: sync hook 只能 tap synchronous function（通过 `myHook.tap()`)
- `AsyncSeries`: asyncSeries hook 可以 tap synchronous function, callback-based 与 promise-based function （通过 `myHook.tap(), myHook.tapAsync() 与 myHook.tapPromise()`)，它们是以**串行**的方式执行。
- `AsyncParallel`: asyncParallel hook 可以 tap synchronous function, callback-based 与 promise-based function （通过 `myHook.tap(), myHook.tapAsync() 与 myHook.tapPromise()`)，它们是以**并行**的方式执行。

每个 hook 的功能从它的名称上就可以推断出来，AsyncSeriesWaterfallHook 串行执行异步函数，将每个异步函数的返回值传递给下一个函数。

下面逐一介绍所有的 Hook，先了解下最基本的 Hook 的功能，它是其他类型 Hook 的超类。

## Hook

:::details Hook.js
```js
class Hook {
  constructor(args) {
    if (!Array.isArray(args)) args = [];
    this._args = args;
    this.taps = [];
    this.interceptors = [];
    this.call = this._call;
    this.promise = this._promise;
    this.callAsync = this._callAsync;
    this._x = undefined;
  }

  compile(options) {
    throw new Error("Abstract: should be overriden");
  }

  _createCall(type) {
    return this.compile({
      taps: this.taps,
      interceptors: this.interceptors,
      args: this._args,
      type: type
    });
  }

  tap(options, fn) {
    if (typeof options === "string") options = { name: options };
    if (typeof options !== "object" || options === null)
      throw new Error(
        "Invalid arguments to tap(options: Object, fn: function)"
      );
    options = Object.assign({ type: "sync", fn: fn }, options);
    if (typeof options.name !== "string" || options.name === "")
      throw new Error("Missing name for tap");
    options = this._runRegisterInterceptors(options);
    this._insert(options);
  }

  tapAsync(options, fn) {
    if (typeof options === "string") options = { name: options };
    if (typeof options !== "object" || options === null)
      throw new Error(
        "Invalid arguments to tapAsync(options: Object, fn: function)"
      );
    options = Object.assign({ type: "async", fn: fn }, options);
    if (typeof options.name !== "string" || options.name === "")
      throw new Error("Missing name for tapAsync");
    options = this._runRegisterInterceptors(options);
    this._insert(options);
  }

  tapPromise(options, fn) {
    if (typeof options === "string") options = { name: options };
    if (typeof options !== "object" || options === null)
      throw new Error(
        "Invalid arguments to tapPromise(options: Object, fn: function)"
      );
    options = Object.assign({ type: "promise", fn: fn }, options);
    if (typeof options.name !== "string" || options.name === "")
      throw new Error("Missing name for tapPromise");
    options = this._runRegisterInterceptors(options);
    this._insert(options);
  }

  _runRegisterInterceptors(options) {
    for (const interceptor of this.interceptors) {
      if (interceptor.register) {
        const newOptions = interceptor.register(options);
        if (newOptions !== undefined) options = newOptions;
      }
    }
    return options;
  }

  withOptions(options) {
    const mergeOptions = opt =>
      Object.assign({}, options, typeof opt === "string" ? { name: opt } : opt);

    // Prevent creating endless prototype chains
    options = Object.assign({}, options, this._withOptions);
    const base = this._withOptionsBase || this;
    const newHook = Object.create(base);

    (newHook.tapAsync = (opt, fn) => base.tapAsync(mergeOptions(opt), fn)),
      (newHook.tap = (opt, fn) => base.tap(mergeOptions(opt), fn));
    newHook.tapPromise = (opt, fn) => base.tapPromise(mergeOptions(opt), fn);
    newHook._withOptions = options;
    newHook._withOptionsBase = base;
    return newHook;
  }

  isUsed() {
    return this.taps.length > 0 || this.interceptors.length > 0;
  }

  intercept(interceptor) {
    this._resetCompilation();
    this.interceptors.push(Object.assign({}, interceptor));
    if (interceptor.register) {
      for (let i = 0; i < this.taps.length; i++)
        this.taps[i] = interceptor.register(this.taps[i]);
    }
  }

  _resetCompilation() {
    this.call = this._call;
    this.callAsync = this._callAsync;
    this.promise = this._promise;
  }

  _insert(item) {
    this._resetCompilation();
    let before;
    if (typeof item.before === "string") before = new Set([item.before]);
    else if (Array.isArray(item.before)) {
      before = new Set(item.before);
    }
    let stage = 0;
    if (typeof item.stage === "number") stage = item.stage;
    let i = this.taps.length;
    while (i > 0) {
      i--;
      const x = this.taps[i];
      this.taps[i + 1] = x;
      const xStage = x.stage || 0;
      if (before) {
        if (before.has(x.name)) {
          before.delete(x.name);
          continue;
        }
        if (before.size > 0) {
          continue;
        }
      }
      if (xStage > stage) {
        continue;
      }
      i++;
      break;
    }
    this.taps[i] = item;
  }
}

function createCompileDelegate(name, type) {
  return function lazyCompileHook(...args) {
    this[name] = this._createCall(type);
    return this[name](...args);
  };
}

Object.defineProperties(Hook.prototype, {
  _call: {
    value: createCompileDelegate("call", "sync"),
    configurable: true,
    writable: true
  },
  _promise: {
    value: createCompileDelegate("promise", "promise"),
    configurable: true,
    writable: true
  },
  _callAsync: {
    value: createCompileDelegate("callAsync", "async"),
    configurable: true,
    writable: true
  }
});
```
:::

## `constructor`

  ```js
  class Hook {
    constructor(args) {
      // this.call 函数的形参名称
      if (!Array.isArray(args)) args = [];
      this._args = args;
      // 存放tapped function 信息，包括类型
      this.taps = [];
      // interceptors 配置信息
      this.interceptors = [];
      // 以下三个 api 都是决定 Hook 怎样被执行的
      this.call = this._call;
      this.promise = this._promise;
      this.callAsync = this._callAsync;
      // 在调用以上三个 api 的时候，就变成 tapped functions 数组
      this._x = undefined;
    }
  }
  ```

## `tap | tapAsync | tapPromise`

Hook 对外暴露三个 tap API, 不同类型的 Hook 会重写它们的实现，例如 SyncHook，它就没有 `tapAsync` 与 `tapPromise` 的实现，因为它只具备 synchronous 的能力，而对于 AsyncHook，它支持所有的 API，这是为什么呢？

:::tip 原因
异步任务的本质，是需要你返回一个 Promise，或者在 tapped function 内部手动调用传入的 next 函数来告知当前 tapped function 执行完毕了，这样内部就能够检查所有的 tapped functions 是否执行完毕(针对 AsyncParallelHook)或者将流程推向下一个 tapped function(针对 AsyncSeriesHook)，因此对于 AsyncHook，通过 tap 注册同步的 function 也可以。
:::

- `tap`

  ```ts
  interface Tap {
    name: string,
    type: string
    fn: Function,
    stage: number,
    context: boolean,
    before?: string | Array
  }
  tap(options, fn) {
    if (typeof options === "string") options = { name: options };
    if (typeof options !== "object" || options === null)
      throw new Error(
        "Invalid arguments to tap(options: Object, fn: function)"
      );
    options = Object.assign({ type: "sync", fn: fn }, options);
    if (typeof options.name !== "string" || options.name === "")
      throw new Error("Missing name for tap");
    options = this._runRegisterInterceptors(options);
    this._insert(options);
  }
  _runRegisterInterceptors(options) {
    for (const interceptor of this.interceptors) {
      if (interceptor.register) {
        const newOptions = interceptor.register(options);
        if (newOptions !== undefined) options = newOptions;
      }
    }
    return options;
  }
  ```

  tap 内部在执行 _runRegisterInterceptors 之前，都会把数据标准化成 Tap 类型，一般我们使用的时候，都是第一个传 string，第二个传 fn，比如：

  ```js
  // 常用方式
  myHook.tap('myHook', () => {
    console.log('myHook')
  })
  // 或者直接传 Tap 类型
  myHook.tap({
    name: 'myHook',
    fn: () => {
      console.log('myHook')
    }
  })
  ```

  _runRegisterInterceptors 提供了可以修改 tap 的机会，不过先要调用 intercept 来注入拦截器。

  ```ts
  intercept(interceptor) {
    this._resetCompilation();
    this.interceptors.push(Object.assign({}, interceptor));
    if (interceptor.register) {
      for (let i = 0; i < this.taps.length; i++)
        this.taps[i] = interceptor.register(this.taps[i]);
    }
  }

  myHook.intercept({
    register (tap) => {
      const newTap = tap
      return newTap
    }
  })
  ```

  最后调用 _insert 来得到最终的 tap，在这里，可以通过 `before` 与 `stage` 配置项来对 tapped function 进行重新排序，大大增强了 0.x 的能力。

  ```js
  _insert(item) {
    this._resetCompilation();
    let before;
    if (typeof item.before === "string") before = new Set([item.before]);
    else if (Array.isArray(item.before)) {
      before = new Set(item.before);
    }
    let stage = 0;
    if (typeof item.stage === "number") stage = item.stage;
    let i = this.taps.length;
    while (i > 0) {
      i--;
      const x = this.taps[i];
      this.taps[i + 1] = x;
      const xStage = x.stage || 0;
      if (before) {
        if (before.has(x.name)) {
          before.delete(x.name);
          continue;
        }
        if (before.size > 0) {
          continue;
        }
      }
      if (xStage > stage) {
        continue;
      }
      i++;
      break;
    }
    this.taps[i] = item;
  }
  ```

  `stage` 值越小，对应的 tapped function 优先级越高，`before` 可以让对应的 tapped function 插入到指定的 function 前一位执行。比如

  ```js
  myHook.tap({
    name: 'stage0',
    stage: 0,
    fn: () => { console.log(0) }
  })
  myHook.tap({
    name: 'stage-100',
    stage: -100,
    fn: () => { console.log(1) }
  })
  myHook.tap({
    name: 'before-stage-100',
    before: 'stage-100', // 插入到 stage-100 function 之前执行
    fn: () => { console.log(2) }
  })
  myHook.call() // 先打印2，再打印1，最后打印0
  ```
- `tapAsync | tapPromise`

  这两种类型的逻辑与上面的 tap 相似，只不过 type 分别是 `async` 与 `promise`，这个是用来标记 tapped function 的类型，因为这两种类型对 function 内部的实现是有一定的要求的，而且这两种类型的 function，不能通过 `call` 来调用，接下来了解以下怎么执行 Hook。

## `call | callAsync | promise`

  与 tap 类似，不同的 Hooks，对这三个方法有不同的实现。先来看 call 的实现。call 与 _call 是相同的引用。

  ```js
  function createCompileDelegate(name, type) {
    return function lazyCompileHook(...args) {
      this[name] = this._createCall(type);
      return this[name](...args);
    };
  }
  Object.defineProperties(Hook.prototype, {
    _call: {
      value: createCompileDelegate("call", "sync"),
      configurable: true,
      writable: true
    },
    _promise: {
      value: createCompileDelegate("promise", "promise"),
      configurable: true,
      writable: true
    },
    _callAsync: {
      value: createCompileDelegate("callAsync", "async"),
      configurable: true,
      writable: true
    }
  }
  ```

  执行 call，相当于执行 lazyCompileHook，只不过它是一个 closure，内部持有的 type 是 sync 类型，代表即将要 compile 一个 sync 类型的 call Function。

  ```js
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      interceptors: this.interceptors,
      args: this._args,
      type: type
    });
  }
  compile(options) {
    throw new Error("Abstract: should be overriden");
  }
  ```

  compile 是一个抽象方法，是需要子类去实现的。`promise` 与 `callAsync` 类似，下面不同的子 Hook 中会进行详细的介绍，再了解 compile 之前，先要了解 `HookCodeFactory` 的实现。

  ## HookCodeFactory
  [👇这里](./HookCodeFactory.md)

  ## SyncHook

  [👇这里](./SyncHook.md)