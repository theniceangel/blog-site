# loader-runner

loader-runner 的作用是执行 loaders 任务，这个库是被 webpack 作者单独的分离出去了，webpack v4.46.0 使用的是 loader-runner v2.4.0 版本，下面具体分析对应的逻辑。

关于 [loader-runner](https://github.com/webpack/loader-runner/tree/v2.4.0)，作者只给出简单的文档。

```js
import { runLoaders } from "loader-runner";

runLoaders({
  resource: "/abs/path/to/file.txt?query",
  // String: Absolute path to the resource (optionally including query string)

  loaders: ["/abs/path/to/loader.js?query"],
  // String[]: Absolute paths to the loaders (optionally including query string)
  // {loader, options}[]: Absolute paths to the loaders with options object

  context: { minimize: true },
  // Additional loader context which is used as base context

  readResource: fs.readFile.bind(fs)
  // A function to read the resource
  // Must have signature function(path, function(err, buffer))

}, function(err, result) {
  // err: Error?

  // result.result: Buffer | String
  // The result

  // result.resourceBuffer: Buffer
  // The raw resource as Buffer (useful for SourceMaps)

  // result.cacheable: Bool
  // Is the result cacheable or do it require reexecution?

  // result.fileDependencies: String[]
  // An array of paths (files) on which the result depends on

  // result.contextDependencies: String[]
  // An array of paths (directories) on which the result depends on
})
```

## runLoaders

runLoaders 是 loader-runner 的入口。

:::details lib/LoaderRunner.js
```js
exports.runLoaders = function runLoaders(options, callback) {
  /* 第一步：解析 options */
  // 请求模块的绝对路径
  var resource = options.resource || "";
  // 模块命中的 loaders
  var loaders = options.loaders || [];
  // 模块的上下文对象，由 webpack 的 normalModule 提供
  var loaderContext = options.context || {};
  // fs.readFile
  var readResource = options.readResource || readFile;

  // 分割请求中的 query，第一个是绝对路径，第二个是 query
  var splittedResource = resource && splitQuery(resource);
  var resourcePath = splittedResource ? splittedResource[0] : undefined;
  var resourceQuery = splittedResource ? splittedResource[1] : undefined;
  //  请求路径的目录
  var contextDirectory = resourcePath ? dirname(resourcePath) : null;

  /* 第二步：处理 loaders 以及 loaderContext */
  var requestCacheable = true;
  var fileDependencies = [];
  var contextDependencies = [];

  // 处理 loaders
  loaders = loaders.map(createLoaderObject);

  // loaderContext 添加更多的信息
  loaderContext.context = contextDirectory;
  // 指针，是 pitch 和 normal 阶段最重要的属性！！
  loaderContext.loaderIndex = 0;
  // 当前模块命中的 loaders
  loaderContext.loaders = loaders;
  loaderContext.resourcePath = resourcePath;
  loaderContext.resourceQuery = resourceQuery;
  loaderContext.async = null;
  loaderContext.callback = null;
  loaderContext.cacheable = function cacheable(flag) {
    if(flag === false) {
      requestCacheable = false;
    }
  };
  loaderContext.dependency = loaderContext.addDependency = function addDependency(file) {
    fileDependencies.push(file);
  };
  loaderContext.addContextDependency = function addContextDependency(context) {
    contextDependencies.push(context);
  };
  loaderContext.getDependencies = function getDependencies() {
    return fileDependencies.slice();
  };
  loaderContext.getContextDependencies = function getContextDependencies() {
    return contextDependencies.slice();
  };
  loaderContext.clearDependencies = function clearDependencies() {
    fileDependencies.length = 0;
    contextDependencies.length = 0;
    requestCacheable = true;
  };
  // 以下的方法使用 defineProperty 形成闭包
  // 目的是为了在执行 loader 的过程中能够随时访问 loaderContext 最新的属性值

  // loaderContext.resource 带有 resourceQuery
  Object.defineProperty(loaderContext, "resource", {
    enumerable: true,
    get: function() {
      if(loaderContext.resourcePath === undefined)
        return undefined;
      return loaderContext.resourcePath + loaderContext.resourceQuery;
    },
    set: function(value) {
      var splittedResource = value && splitQuery(value);
      loaderContext.resourcePath = splittedResource ? splittedResource[0] : undefined;
      loaderContext.resourceQuery = splittedResource ? splittedResource[1] : undefined;
    }
  });
  // loaderContext.request 由 loaderContext.resource 拼接全部的 loaders 的 request 组成
  Object.defineProperty(loaderContext, "request", {
    enumerable: true,
    get: function() {
      return loaderContext.loaders.map(function(o) {
        return o.request;
      }).concat(loaderContext.resource || "").join("!");
    }
  });
  // loaderContext.remainingRequest 由 loaderContext.resource 拼接未执行的 loaders 的 request 组成
  Object.defineProperty(loaderContext, "remainingRequest", {
    enumerable: true,
    get: function() {
      if(loaderContext.loaderIndex >= loaderContext.loaders.length - 1 && !loaderContext.resource)
        return "";
      return loaderContext.loaders.slice(loaderContext.loaderIndex + 1).map(function(o) {
        return o.request;
      }).concat(loaderContext.resource || "").join("!");
    }
  });
  // loaderContext.remainingRequest 由 loaderContext.resource 拼接正在执行以及未执行的 loaders 的 request 组成
  Object.defineProperty(loaderContext, "currentRequest", {
    enumerable: true,
    get: function() {
      return loaderContext.loaders.slice(loaderContext.loaderIndex).map(function(o) {
        return o.request;
      }).concat(loaderContext.resource || "").join("!");
    }
  });
  // loaderContext.remainingRequest 由 loaderContext.resource 拼接已经执行过的 loaders 的 request 组成
  Object.defineProperty(loaderContext, "previousRequest", {
    enumerable: true,
    get: function() {
      return loaderContext.loaders.slice(0, loaderContext.loaderIndex).map(function(o) {
        return o.request;
      }).join("!");
    }
  });
  // loaderContext.query 代表当前 loader 的 options
  Object.defineProperty(loaderContext, "query", {
    enumerable: true,
    get: function() {
      var entry = loaderContext.loaders[loaderContext.loaderIndex];
      return entry.options && typeof entry.options === "object" ? entry.options : entry.query;
    }
  });
  // loaderContext.data 代表当前 loader 的 data
  Object.defineProperty(loaderContext, "data", {
    enumerable: true,
    get: function() {
      return loaderContext.loaders[loaderContext.loaderIndex].data;
    }
  });

  // 冻结 loaderContext
  if(Object.preventExtensions) {
    Object.preventExtensions(loaderContext);
  }

  /* 第三步：执行 loader 的 pitch 以及 normal */
  // 先执行 pitch 阶段
  var processOptions = {
    resourceBuffer: null,
    readResource: readResource
  };
  iteratePitchingLoaders(processOptions, loaderContext, function(err, result) {
    // 模块已经被所有 loaders 处理完成
    if(err) {
      return callback(err, {
        cacheable: requestCacheable,
        fileDependencies: fileDependencies,
        contextDependencies: contextDependencies
      });
    }
    callback(null, {
      result: result,
      resourceBuffer: processOptions.resourceBuffer,
      cacheable: requestCacheable,
      fileDependencies: fileDependencies,
      contextDependencies: contextDependencies
    });
  });
};

```
:::

runLoaders 主要分为以下三步。

  - **`1. 解析 options`**

  - **`2. 处理 loaders 以及 loaderContext`**

    createLoaderObject 给 loader 添加了很多信息。

    ```js
    function createLoaderObject(loader) {
      var obj = {
        path: null, // loader 的绝对路径
        query: null, // loader query
        options: null, // loader options
        ident: null, //  loader ident
        normal: null, '' // loader normal function
        pitch: null, // loader pitch function
        raw: null, // 表示 normal function 返回值是 Buffer，否则是 String，一般用于图片，字体
        data: null, // loader pitch 和 normal 阶段共享的数据
        pitchExecuted: false, // 标记 loader 是否经历过 pitch 阶段
        normalExecuted: false // 标记 loader 是否经历过 normal 阶段
      };
      Object.defineProperty(obj, "request", {
        enumerable: true,
        get: function() {
          return obj.path + obj.query;
        },
        set: function(value) {
          if(typeof value === "string") {
            var splittedRequest = splitQuery(value);
            obj.path = splittedRequest[0];
            obj.query = splittedRequest[1];
            obj.options = undefined;
            obj.ident = undefined;
          } else {
            if(!value.loader)
              throw new Error("request should be a string or object with loader and object (" + JSON.stringify(value) + ")");
            obj.path = value.loader;
            obj.options = value.options;
            obj.ident = value.ident;
            if(obj.options === null)
              obj.query = "";
            else if(obj.options === undefined)
              obj.query = "";
            else if(typeof obj.options === "string")
              obj.query = "?" + obj.options;
            else if(obj.ident)
              obj.query = "??" + obj.ident;
            else if(typeof obj.options === "object" && obj.options.ident)
              obj.query = "??" + obj.options.ident;
            else
              obj.query = "?" + JSON.stringify(obj.options);
          }
        }
      });
      // 触发 loader.request.setter
      obj.request = loader;
      if(Object.preventExtensions) {
        Object.preventExtensions(obj);
      }
      return obj;
    }
    ```

  - **`3. 执行 loader 的 pitch 以及 normal`**

    先执行 pitch phase。

    ```js
    function iteratePitchingLoaders(options, loaderContext, callback) {
      // 如果所有的 loader pitch 都执行完毕
      // 那么进入 processResource 阶段，因为要获取模块的文件内容
      if(loaderContext.loaderIndex >= loaderContext.loaders.length)
        return processResource(options, loaderContext, callback);

      // 当前 loader
      var currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];

      // 如果当前 loader 的 pitch 已经执行完毕
      // 指针向右移，开始执行下一个 loader 的 pitch
      if(currentLoaderObject.pitchExecuted) {
        loaderContext.loaderIndex++;
        return iteratePitchingLoaders(options, loaderContext, callback);
      }

      // 加载 loader 模块，拿到它的 raw、normal function、pitch function
      loadLoader(currentLoaderObject, function(err) {
        if(err) {
          loaderContext.cacheable(false);
          return callback(err);
        }
        var fn = currentLoaderObject.pitch;
        // 标记当前 loader 的 pitch 已经执行过了
        currentLoaderObject.pitchExecuted = true;
        // 如果不存在 pitch，继续处理下一个 loader
        if(!fn) return iteratePitchingLoaders(options, loaderContext, callback);
        // 执行 pitch 或者 normal 函数
        runSyncOrAsync(
          fn,
          loaderContext, [loaderContext.remainingRequest, loaderContext.previousRequest, currentLoaderObject.data = {}],
          function(err) {
            if(err) return callback(err);
            var args = Array.prototype.slice.call(arguments, 1);
            // 如果 pitch 函数有返回值
            // 返回前一个 loader，执行它的 normal 函数
            if(args.length > 0) {
              loaderContext.loaderIndex--;
              iterateNormalLoaders(options, loaderContext, args, callback);
            } else {
              // 接着执行下一个 loader 的 pitch
              iteratePitchingLoaders(options, loaderContext, callback);
            }
          }
        );
      });
    }
    ```

    在 pitch 过程中，执行顺序是根据的 loaders 的顺序，最关键的属性就是 `loaderContext.loaderIndex`，这个指针能确保 pitch 的执行顺序是**从左向右**。

    再来看 loadLoader 的实现，它位于 `loadLoader.js`，主要是获取 loader 的 pitch、normal、raw。

    ```js
    module.exports = function loadLoader(loader, callback) {
      // 如果当前环境存在 System 的实现
      if(typeof System === "object" && typeof System.import === "function") {
        System.import(loader.path).catch(callback).then(function(module) {
          loader.normal = typeof module === "function" ? module : module.default;
          loader.pitch = module.pitch;
          loader.raw = module.raw;
          if(typeof loader.normal !== "function" && typeof loader.pitch !== "function") {
            return callback(new LoaderLoadingError(
              "Module '" + loader.path + "' is not a loader (must have normal or pitch function)"
            ));
          }
          callback();
        });
      } else {
        try {
          // 尝试加载模块
          var module = require(loader.path);
        } catch(e) {
          // it is possible for node to choke on a require if the FD descriptor
          // limit has been reached. give it a chance to recover.
          if(e instanceof Error && e.code === "EMFILE") {
            var retry = loadLoader.bind(null, loader, callback);
            if(typeof setImmediate === "function") {
              // node >= 0.9.0
              return setImmediate(retry);
            } else {
              // node < 0.9.0
              return process.nextTick(retry);
            }
          }
          return callback(e);
        }
        if(typeof module !== "function" && typeof module !== "object") {
          return callback(new LoaderLoadingError(
            "Module '" + loader.path + "' is not a loader (export function or es6 module)"
          ));
        }
        // 设置 loader 的 normal、pitch、raw
        loader.normal = typeof module === "function" ? module : module.default;
        loader.pitch = module.pitch;
        loader.raw = module.raw;
        if(typeof loader.normal !== "function" && typeof loader.pitch !== "function") {
          return callback(new LoaderLoadingError(
            "Module '" + loader.path + "' is not a loader (must have normal or pitch function)"
          ));
        }
        callback();
      }
    };

    ```

    最核心的是 runSyncOrAsync，因为它内部的设计和复杂的状态，都是为了支持开发者在写 loader 的时候能够适合各种场景。

    ```js
    function runSyncOrAsync(fn, context, args, callback) {
      var isSync = true;
      var isDone = false;
      var isError = false; // internal error
      var reportedError = false;
      // loader normal function 可以调用 this.async 来获取 innerCallback
      // 一般用于 normal function 存在异步操作的场景
      context.async = function async() {
        // 防止调用 this.callback 之后，再调用 this.async
        if(isDone) {
          if(reportedError) return; // ignore
          throw new Error("async(): The callback was already called.");
        }
        isSync = false;
        return innerCallback;
      };
      // loader normal function 可以调用 this.callback 来获取 innerCallback
      // 一般用于 normal function 存在同步操作的场景
      var innerCallback = context.callback = function() {
        if(isDone) {
          if(reportedError) return; // ignore
          throw new Error("callback(): The callback was already called.");
        }
        isDone = true;
        isSync = false;
        try {
          callback.apply(null, arguments);
        } catch(e) {
          isError = true;
          throw e;
        }
      };
      try {
        // 执行 pitch 或者 normal
        // 它里面是否调用 this.callback 或者 this.async 影响后续的逻辑
        var result = (function LOADER_EXECUTION() {
          // pitch 或者 normal 的函数上下文是 loaderContext 对象
          return fn.apply(context, args);
        }());
        // 如果 pitch 或者 normal 没调用 this.callback 或者 this.async，说明必须拿 result
        if(isSync) {
          isDone = true;
          // 如果没有任何返回值，直接执行 runSyncOrAsync 的 callback
          if(result === undefined)
            return callback();
          // 如果返回的是一个 Promise，将 callback 包裹在 Promise 里面
          if(result && typeof result === "object" && typeof result.then === "function") {
            return result.then(function(r) {
              callback(null, r);
            }, callback);
          }
          // 否则拿到 result，调用 runSyncOrAsync 的 callback
          return callback(null, result);
        }
      } catch(e) {
        // 如果调用 runSyncOrAsync 的 callback 过程中出现错误
        if(isError) throw e;
        if(isDone) {
          // loader is already "done", so we cannot use the callback function
          // for better debugging we print the error on the console
          if(typeof e === "object" && e.stack) console.error(e.stack);
          else console.error(e);
          return;
        }
        // 如果是在执行 pitch 或者 normal 的时候出现错误
        isDone = true;
        reportedError = true;
        callback(e);
      }
    }
    ```

    先看 pitch 阶段的逻辑。入口是 `iteratePitchingLoaders` 函数，通过 `loaderContext.loaderIndex` 指针不断的按**从左向右的顺序**执行各个 loader 的 pitch 函数，如果某个 pitch 函数返回值不为空，那么会**中断后续 loaders 的 pitch 函数，只执行之前 loader 的 normal function**，**pitch 函数返回值会作为 normal function 的入参，不再需要获取模块的文件内容**，举个例子：

    ```bash
    # 如果 loaders 的配置为 ['a-loader', 'b-loader', 'c-loader']
    执行的顺序就是：
    |- a-loader `pitch`
      |- b-loader `pitch` returns value
    |- a-loader normal execution

    b-loader 的 normal 会被忽略，c-loader 的 pitch 以及 normal 都会被忽略
    ```

    如果所有的 pitch 函数都没有返回值，都会走到 processResource 函数。它的作用就是读取模块的文件内容。

    ```js
    function processResource(options, loaderContext, callback) {
      // 将指针设置成最大，从右向左执行 loaders 的 normal
      loaderContext.loaderIndex = loaderContext.loaders.length - 1;

      var resourcePath = loaderContext.resourcePath;
      if(resourcePath) {
        loaderContext.addDependency(resourcePath);
        // 读取模块的内容
        options.readResource(resourcePath, function(err, buffer) {
          if(err) return callback(err);
          options.resourceBuffer = buffer;
          // 开始 normal 阶段的处理
          iterateNormalLoaders(options, loaderContext, [buffer], callback);
        });
      } else {
        iterateNormalLoaders(options, loaderContext, [null], callback);
      }
    }
    ```

    processResource 标志着所有的 loaders 的 pitch 都已经执行完毕，接着进入 normal 阶段，它的顺序是**从右向左**。

    ```js
    function iterateNormalLoaders(options, loaderContext, args, callback) {
      // 所有 loaders 的 normal 函数都执行完成
      if(loaderContext.loaderIndex < 0)
        return callback(null, args);

      // 当前 loader 对象
      var currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];

      // 如果当前 loader 的 normal 函数调用过，接着调用下一个 loader 的 normal
      if(currentLoaderObject.normalExecuted) {
        loaderContext.loaderIndex--;
        return iterateNormalLoaders(options, loaderContext, args, callback);
      }

      // 当前 loader 的 normal 函数
      var fn = currentLoaderObject.normal;
      currentLoaderObject.normalExecuted = true;
      if(!fn) {
        // 如果当前 loader 不存在 normal 函数，接着调用下一个 loader
        return iterateNormalLoaders(options, loaderContext, args, callback);
      }

      // 是否将文件内容转换 Buffer 或者 String
      convertArgs(args, currentLoaderObject.raw);

      // 调用当前 loader 的 normal
      runSyncOrAsync(fn, loaderContext, args, function(err) {
        if(err) return callback(err);

        var args = Array.prototype.slice.call(arguments, 1);
        // 执行下一个 loader 的 normal
        iterateNormalLoaders(options, loaderContext, args, callback);
      });
    }
    ```

    runSyncOrAsync 函数在上文也分析过了，内部 `isDone`，`isSync`，`context.Async`，`context.callback` 等等属性都是为了应付各种 loader normal 的场景。比如：

      **Synchronous Loaders**

      ```js
      module.exports = function(content, map, meta) {
        return someSyncOperation(content);
      };
      ```

      可以直接返回转换过后的 content，runSyncOrAsync 内部会通过 LOADER_EXECUTION 自执行函数拿到返回值。

      ```js
      module.exports = function(content, map, meta) {
        this.callback(null, someSyncOperation(content), map, meta);
        return
      };
      ```

      也可以通过调用 `this.callback` 来返回 content 以及更多的参数，相当于调用 runSyncOrAsync 内部的 innerCallback 函数。

      **Asynchronous Loaders**

      对于普通的异步场景，需要调用 `this.async` 函数来获取 `callback` 函数，在调用 `this.async` 的时候已经暗示了此次操作是异步的

      ```js
      module.exports = function(content, map, meta) {
        var callback = this.async();
        someAsyncOperation(content, function(err, result) {
          if (err) return callback(err);
          callback(null, result, map, meta);
        });
      };
      ```

      也可以返回一个 Promise，让 runSyncOrAsync 内部自动获取 Promise.resolve 的值来执行后面的流程。

      ```js
      module.exports = function(content, map, meta) {
        return Promise.resolve(content)
      };
      ```