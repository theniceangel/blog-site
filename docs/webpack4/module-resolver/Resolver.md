# Resolver

Resolver 类是解析文件路径最核心的类，它的作用相当于调度中心，用来衔接不同插件的解析流程。

它位于 enhanced-resolve 文件夹的 `lib/Resolver.js`，结构如下：

:::details lib/Resolver.js
```js
class Resolver extends Tapable {
  constructor(fileSystem) {
    super();
    this.fileSystem = fileSystem;
    this.hooks = {
      resolveStep: withName("resolveStep", new SyncHook(["hook", "request"])),
      noResolve: withName("noResolve", new SyncHook(["request", "error"])),
      resolve: withName(
        "resolve",
        new AsyncSeriesBailHook(["request", "resolveContext"])
      ),
      result: new AsyncSeriesHook(["result", "resolveContext"])
    };
    // 兼容 webpack3
    this._pluginCompat.tap("Resolver: before/after", options => {
      if (/^before-/.test(options.name)) {
        options.name = options.name.substr(7);
        options.stage = -10;
      } else if (/^after-/.test(options.name)) {
        options.name = options.name.substr(6);
        options.stage = 10;
      }
    });
    this._pluginCompat.tap("Resolver: step hooks", options => {
      const name = options.name;
      const stepHook = !/^resolve(-s|S)tep$|^no(-r|R)esolve$/.test(name);
      if (stepHook) {
        options.async = true;
        this.ensureHook(name);
        const fn = options.fn;
        options.fn = (request, resolverContext, callback) => {
          const innerCallback = (err, result) => {
            if (err) return callback(err);
            if (result !== undefined) return callback(null, result);
            callback();
          };
          for (const key in resolverContext) {
            innerCallback[key] = resolverContext[key];
          }
          fn.call(this, request, innerCallback);
        };
      }
    });
  }

  // ...
}
```
:::

## hooks

Resolver 内置以下的 hooks。

- **`resolveStep`**：[SyncHook](../tapable/SyncHook.md)
- **`noResolve`**：[SyncHook](../tapable/SyncHook.md)
- **`resolve`**：[AsyncSeriesBailHook](../tapable/AsyncSeriesBailHook.md)
- **`result`**：[AsyncSeriesHook](../tapable/AsyncSeriesHook.md)

## 方法

- **ensureHook**

```js
class Resolver {
  // 确保实例上存在对应的 hooks，并且返回
  ensureHook(name) {
    if (typeof name !== "string") return name;
    name = toCamelCase(name);
    // 如果 name 包含 'before' 或者 'after'，就注册前置 tap 回调钩子函数
    if (/^before/.test(name)) {
      return this.ensureHook(
        name[6].toLowerCase() + name.substr(7)
      ).withOptions({
        stage: -10
      });
    }
    if (/^after/.test(name)) {
      return this.ensureHook(
        name[5].toLowerCase() + name.substr(6)
      ).withOptions({
        stage: 10
      });
    }
    const hook = this.hooks[name];
    if (!hook) {
      return (this.hooks[name] = withName(
        name,
        new AsyncSeriesBailHook(["request", "resolveContext"])
      ));
    }
    return hook;
  }
}
```

可以通过这个方法，往 resolver 上添加更多的 hooks，添加的 hooks 都是 `AsyncSeriesBailHook` 类型。

// TODO before 与 after 的解释，要与 tapable 的 stage 和 withOptions 一起

- **getHook**

```js
class Resolver {
  // 获取对应 hook，如果不存则就抛出异常
  getHook(name) {
    if (typeof name !== "string") return name;
    name = toCamelCase(name);
    if (/^before/.test(name)) {
      return this.getHook(name[6].toLowerCase() + name.substr(7)).withOptions({
        stage: -10
      });
    }
    if (/^after/.test(name)) {
      return this.getHook(name[5].toLowerCase() + name.substr(6)).withOptions({
        stage: 10
      });
    }
    const hook = this.hooks[name];
    if (!hook) {
      throw new Error(`Hook ${name} doesn't exist`);
    }
    return hook;
  }
}
```

- **parse**

```js
class Resolver {
  parse(identifier) {
		if (identifier === "") return null;
		const part = {
			request: "",
			query: "",
			module: false,
			directory: false,
			file: false
    };
    // 解析请求中是否带有 '?a=1' 这样的 query
		const idxQuery = identifier.indexOf("?");
		if (idxQuery === 0) {
			part.query = identifier;
		} else if (idxQuery > 0) {
			part.request = identifier.slice(0, idxQuery);
			part.query = identifier.slice(idxQuery);
		} else {
			part.request = identifier;
		}
		if (part.request) {
      // 判断模块请求，比如 import 'vue'，import 'vue/lib/xxx.js'
      part.module = this.isModule(part.request);
      // 判断目录请求，比如 import 'vue/lib/'
			part.directory = this.isDirectory(part.request);
			if (part.directory) {
				part.request = part.request.substr(0, part.request.length - 1);
			}
		}
		return part;
	}
}
```

对一个请求路径进行 parse。

- **isDirectory**

```js
const REGEXP_DIRECTORY = /[\\/]$/i;
class Resolver {
  // 请求的结尾不能含有 '/' 或者 '\'
  isDirectory(path) {
		return REGEXP_DIRECTORY.test(path);
	}
}
```

- **join**

```js
class Resolver {
  join(path, request) {
		let cacheEntry;
		let pathCache = memoizedJoin.get(path);
		if (typeof pathCache === "undefined") {
			memoizedJoin.set(path, (pathCache = new Map()));
		} else {
			cacheEntry = pathCache.get(request);
			if (typeof cacheEntry !== "undefined") return cacheEntry;
		}
		cacheEntry = memoryFsJoin(path, request);
		pathCache.set(request, cacheEntry);
		return cacheEntry;
	}
}
```

join 方法为了拼接 path 和 request，比如模块请求是 `./a.js`，而搜寻的 path 是 `/Users/webpack-demo/`，得到的全路径就是 `/Users/webpack-demo/a.js`。方法内部为了性能会做缓存。

- **resolveSync, resolve, doResolve**

```js
class Resolver {
  // 同步版本的 resolve
  resolveSync(context, path, request) {
    let err,
      result,
      sync = false;
    this.resolve(context, path, request, {}, (e, r) => {
      err = e;
      result = r;
      sync = true;
    });
    if (!sync)
      throw new Error(
        "Cannot 'resolveSync' because the fileSystem is not sync. Use 'resolve'!"
      );
    if (err) throw err;
    return result;
  }

  // 异步版本的 resolve，解析绝对路径的入口函数
  resolve(context, path, request, resolveContext, callback) {
    if (typeof callback !== "function") {
      callback = deprecatedResolveContextInCallback(resolveContext);
    }
    // END
    const obj = {
      context: context,
      path: path,
      request: request
    };

    const message = "resolve '" + request + "' in '" + path + "'";

    // 开始触发插件的逻辑，从 resolve hooks 开始
    return this.doResolve(
      this.hooks.resolve,
      obj,
      message,
      {
        missing: resolveContext.missing,
        stack: resolveContext.stack
      },
      (err, result) => {
        // 如果成功解析
        if (!err && result) {
          return callback(
            null,
            result.path === false ? false : result.path + (result.query || ""),
            result
          );
        }

        const localMissing = new Set();
        localMissing.push = item => deprecatedPushToMissing(localMissing, item);
        const log = [];

        // 如果解析出问题，那再重新解析一次，并且将错误 msg 都存入 log
        return this.doResolve(
          this.hooks.resolve,
          obj,
          message,
          {
            log: msg => {
              if (resolveContext.log) {
                resolveContext.log(msg);
              }
              log.push(msg);
            },
            missing: localMissing,
            stack: resolveContext.stack
          },
          (err, result) => {
            if (err) return callback(err);

            const error = new Error("Can't " + message);
            error.details = log.join("\n");
            error.missing = Array.from(localMissing);
            // 解析失败触发 noResolve hook
            this.hooks.noResolve.call(obj, error);
            return callback(error);
          }
        );
      }
    );
  }

  doResolve(hook, request, message, resolveContext, callback) {
    if (typeof callback !== "function") {
      callback = deprecatedResolveContextInCallback(resolveContext);
    }
    // 兼容 hook 传字符串的情况
    if (typeof hook === "string") {
      const name = toCamelCase(hook);
      hook = deprecatedHookAsString(this.hooks[name]);
      if (!hook) {
        throw new Error(`Hook "${name}" doesn't exist`);
      }
    }
    // END
    if (typeof callback !== "function")
      throw new Error("callback is not a function " + Array.from(arguments));
    if (!resolveContext)
      throw new Error(
        "resolveContext is not an object " + Array.from(arguments)
      );

    const stackLine =
      hook.name +
      ": (" +
      request.path +
      ") " +
      (request.request || "") +
      (request.query || "") +
      (request.directory ? " directory" : "") +
      (request.module ? " module" : "");

    let newStack;
    if (resolveContext.stack) {
      newStack = new Set(resolveContext.stack);
      if (resolveContext.stack.has(stackLine)) {
        const recursionError = new Error(
          "Recursion in resolving\nStack:\n  " +
            Array.from(newStack).join("\n  ")
        );
        recursionError.recursion = true;
        if (resolveContext.log)
          resolveContext.log("abort resolving because of recursion");
        return callback(recursionError);
      }
      newStack.add(stackLine);
    } else {
      newStack = new Set([stackLine]);
    }

    // 每次调用 doResolve 都会触发 resolveStep hook
    this.hooks.resolveStep.call(hook, request);

    if (hook.isUsed()) {
      const innerContext = createInnerContext(
        {
          log: resolveContext.log,
          missing: resolveContext.missing,
          stack: newStack
        },
        message
      );
      // 触发 target hook 的 taps 回调函数
      // 每一次都将 callback 包裹在匿名回调里面，形成层层包裹的效果，类似于套娃的过程
      // 执行最外层的匿名回调函数，会一层层剥开内部的结构，一层层调用 callback
      return hook.callAsync(request, innerContext, (err, result) => {
        if (err) return callback(err);
        if (result) return callback(null, result);
        callback();
      });
    } else {
      callback();
    }
  }
}
```

这几个方法是最核心的方法，一般是调用 `resolver.resolve` 异步方法来发起解析路径的流程。`resolveSync` 是同步方法，而 `resolver.doResolve` 是为了将执行流程推向下一个插件，并且记录解析路径时遇到的插件而形成的堆栈信息。用下面一张图来解释下大概的过程。

<img :src="$withBase('/assets/enhanced-resolve-callback.png')" />

在调用 `resolver.resolve` 的时候，其实就是对 callback 进行**套娃**的过程，等到调用最外层的 callback 的时候，就是不断**剥开娃娃**的过程，最后调用的就是最开始传递给 `resolver.resolver` 的 callback 函数，再一次回到 webpack 的构建流程。

在**套娃**的过程中就是各个插件对路径处理的过程，不断的给 resolve 函数里面的 `obj` 对象增加更多的数据，最后返回给 webpack。

## 总结

Resolver 只是起到 resolve 发起的作用，真正投入使用还是得使用很多插件，定制好一个 pipeline，最后开始解析路径，这些工作，都放到了 [ResolverFactory](./ResolverFactory.md)。