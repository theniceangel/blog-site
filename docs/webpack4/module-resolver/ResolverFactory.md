# ResolverFactory

顾名思义，它是 Resolver 的工厂函数，当然在这个函数内部，还做了额外的很多工作。先来看下模块结构。

:::details lib/ResolverFactory.js
```js
exports.createResolver = function(options) {
  //// OPTIONS ////

  // 模块解析的路径，可以是相对路径或者绝对路径
  // 如果是相当路径，是基于调用方的文件路径不断地向上迭代，比如配置 "node_modules"
  // 调用方是 index.js，文件内容是 `import 'a.js'`，
  // 那么解析 `a.js` 的路径就是 ['./node_modules', '../node_modules', ...]
  let modules = options.modules || ["node_modules"];

  // 描述性文件的名称，默认是 "package.json"
  const descriptionFiles = options.descriptionFiles || ["package.json"];

  // 供 resolver 调用的插件
  const plugins = (options.plugins && options.plugins.slice()) || [];

  // package.json 的入口字段，引入模块的时候，默认是找到这个字段配置的文件名
  let mainFields = options.mainFields || ["main"];

  // 别名字段，详细的看 https://github.com/defunctzombie/package-browser-field-spec
  const aliasFields = options.aliasFields || [];

  // 文件夹的默认入口文件，当你 import './a' 的时候，会尝试找到 a 文件夹下面的 mainFiles
  const mainFiles = options.mainFiles || ["index"];

  // 文件的后缀名
  let extensions = options.extensions || [".js", ".json", ".node"];

  // 必须使用 extension
  const enforceExtension = options.enforceExtension || false;

  // 模块的后缀
  let moduleExtensions = options.moduleExtensions || [];

  // 必须使用 moduleExtensions
  const enforceModuleExtension = options.enforceModuleExtension || false;

  // 别名
  let alias = options.alias || [];

  // 是否基于软链的位置进行解析
  const symlinks =
    typeof options.symlinks !== "undefined" ? options.symlinks : true;

  // Resolve to a context instead of a file
  const resolveToContext = options.resolveToContext || false;

  // A list of root paths
  const roots = options.roots || [];

  // 忽略 错误
  const ignoreRootsErrors = options.ignoreRootsErrors || false;

  // Prefer to resolve server-relative urls as absolute paths before falling back to resolve in roots
  const preferAbsolute = options.preferAbsolute || false;

  const restrictions = options.restrictions || [];

  // 缓存解析成功的路径
  let unsafeCache = options.unsafeCache || false;

  // 使用 unsafeCache 对象的时候，key 时候要包含 context
  const cacheWithContext =
    typeof options.cacheWithContext !== "undefined"
      ? options.cacheWithContext
      : true;

  // Enable concord description file instructions
  const enableConcord = options.concord || false;

  // A function which decides whether a request should be cached or not.
  // an object is passed with `path` and `request` properties.
  const cachePredicate =
    options.cachePredicate ||
    function() {
      return true;
    };

  // The file system which should be used
  const fileSystem = options.fileSystem;

  // 使用同步方法的 fileSystem
  const useSyncFileSystemCalls = options.useSyncFileSystemCalls;

  // 传入自定义的 resolver
  let resolver = options.resolver;

  //// options processing ////

  if (!resolver) {
    resolver = new Resolver(
      useSyncFileSystemCalls
        ? new SyncAsyncFileSystemDecorator(fileSystem)
        : fileSystem
    );
  }

  extensions = [].concat(extensions);
  moduleExtensions = [].concat(moduleExtensions);

  modules = mergeFilteredToArray([].concat(modules), item => {
    return !isAbsolutePath(item);
  });

  mainFields = mainFields.map(item => {
    if (typeof item === "string" || Array.isArray(item)) {
      item = {
        name: item,
        forceRelative: true
      };
    }
    return item;
  });

  if (typeof alias === "object" && !Array.isArray(alias)) {
    alias = Object.keys(alias).map(key => {
      let onlyModule = false;
      let obj = alias[key];
      if (/\$$/.test(key)) {
        onlyModule = true;
        key = key.substr(0, key.length - 1);
      }
      if (typeof obj === "string") {
        obj = {
          alias: obj
        };
      }
      obj = Object.assign(
        {
          name: key,
          onlyModule: onlyModule
        },
        obj
      );
      return obj;
    });
  }

  if (unsafeCache && typeof unsafeCache !== "object") {
    unsafeCache = {};
  }

  //// pipeline ////

  resolver.ensureHook("resolve");
  resolver.ensureHook("parsedResolve");
  resolver.ensureHook("describedResolve");
  resolver.ensureHook("rawModule");
  resolver.ensureHook("module");
  resolver.ensureHook("relative");
  resolver.ensureHook("describedRelative");
  resolver.ensureHook("directory");
  resolver.ensureHook("existingDirectory");
  resolver.ensureHook("undescribedRawFile");
  resolver.ensureHook("rawFile");
  resolver.ensureHook("file");
  resolver.ensureHook("existingFile");
  resolver.ensureHook("resolved");

  // resolve
  if (unsafeCache) {
    plugins.push(
      new UnsafeCachePlugin(
        "resolve",
        cachePredicate,
        unsafeCache,
        cacheWithContext,
        "new-resolve"
      )
    );
    plugins.push(new ParsePlugin("new-resolve", "parsed-resolve"));
  } else {
    plugins.push(new ParsePlugin("resolve", "parsed-resolve"));
  }

  // parsed-resolve
  plugins.push(
    new DescriptionFilePlugin(
      "parsed-resolve",
      descriptionFiles,
      "described-resolve"
    )
  );
  plugins.push(new NextPlugin("after-parsed-resolve", "described-resolve"));

  // described-resolve
  if (alias.length > 0)
    plugins.push(new AliasPlugin("described-resolve", alias, "resolve"));
  if (enableConcord) {
    plugins.push(new ConcordModulesPlugin("described-resolve", {}, "resolve"));
  }
  aliasFields.forEach(item => {
    plugins.push(new AliasFieldPlugin("described-resolve", item, "resolve"));
  });
  plugins.push(new ModuleKindPlugin("after-described-resolve", "raw-module"));
  if (preferAbsolute) {
    plugins.push(new JoinRequestPlugin("after-described-resolve", "relative"));
  }
  roots.forEach(root => {
    plugins.push(
      new RootPlugin(
        "after-described-resolve",
        root,
        "relative",
        ignoreRootsErrors
      )
    );
  });
  if (!preferAbsolute) {
    plugins.push(new JoinRequestPlugin("after-described-resolve", "relative"));
  }

  // raw-module
  moduleExtensions.forEach(item => {
    plugins.push(new ModuleAppendPlugin("raw-module", item, "module"));
  });
  if (!enforceModuleExtension)
    plugins.push(new TryNextPlugin("raw-module", null, "module"));

  // module
  modules.forEach(item => {
    if (Array.isArray(item))
      plugins.push(
        new ModulesInHierachicDirectoriesPlugin("module", item, "resolve")
      );
    else plugins.push(new ModulesInRootPlugin("module", item, "resolve"));
  });

  // relative
  plugins.push(
    new DescriptionFilePlugin(
      "relative",
      descriptionFiles,
      "described-relative"
    )
  );
  plugins.push(new NextPlugin("after-relative", "described-relative"));

  // described-relative
  plugins.push(new FileKindPlugin("described-relative", "raw-file"));
  plugins.push(
    new TryNextPlugin("described-relative", "as directory", "directory")
  );

  // directory
  plugins.push(new DirectoryExistsPlugin("directory", "existing-directory"));

  if (resolveToContext) {
    // existing-directory
    plugins.push(new NextPlugin("existing-directory", "resolved"));
  } else {
    // existing-directory
    if (enableConcord) {
      plugins.push(new ConcordMainPlugin("existing-directory", {}, "resolve"));
    }
    mainFields.forEach(item => {
      plugins.push(new MainFieldPlugin("existing-directory", item, "resolve"));
    });
    mainFiles.forEach(item => {
      plugins.push(
        new UseFilePlugin("existing-directory", item, "undescribed-raw-file")
      );
    });

    // undescribed-raw-file
    plugins.push(
      new DescriptionFilePlugin(
        "undescribed-raw-file",
        descriptionFiles,
        "raw-file"
      )
    );
    plugins.push(new NextPlugin("after-undescribed-raw-file", "raw-file"));

    // raw-file
    if (!enforceExtension) {
      plugins.push(new TryNextPlugin("raw-file", "no extension", "file"));
    }
    if (enableConcord) {
      plugins.push(new ConcordExtensionsPlugin("raw-file", {}, "file"));
    }
    extensions.forEach(item => {
      plugins.push(new AppendPlugin("raw-file", item, "file"));
    });

    // file
    if (alias.length > 0)
      plugins.push(new AliasPlugin("file", alias, "resolve"));
    if (enableConcord) {
      plugins.push(new ConcordModulesPlugin("file", {}, "resolve"));
    }
    aliasFields.forEach(item => {
      plugins.push(new AliasFieldPlugin("file", item, "resolve"));
    });
    if (symlinks) plugins.push(new SymlinkPlugin("file", "relative"));
    plugins.push(new FileExistsPlugin("file", "existing-file"));

    // existing-file
    plugins.push(new NextPlugin("existing-file", "resolved"));
  }

  // resolved
  if (restrictions.length > 0) {
    plugins.push(new RestrictionsPlugin(resolver.hooks.resolved, restrictions));
  }
  plugins.push(new ResultPlugin(resolver.hooks.resolved));

  //// RESOLVER ////

  plugins.forEach(plugin => {
    plugin.apply(resolver);
  });

  return resolver;
};
```
:::

- **第一步：解析 options**

    options 来源于 webpack config 的 resolve 配置或者 resolverLoader 配置，主要是看生成的 resolver 到底是为了解析哪种类型路径。

    ```js
    module.exports = {
      //...
      // 用来解析 module 的路径
      resolve: {
        alias: {
          Utilities: path.resolve(__dirname, 'src/utilities/'),
          Templates: path.resolve(__dirname, 'src/templates/')
        }
      },
      // 用来解析 loader 的路径
      resolveLoader: {
        moduleExtensions: ['-loader']
      }
    };
    ```

- **第二步：ensure 必备的 hooks，形成 pipeline**

- **第三步：准备好所有的 plugins，并逐一调用 apply**

最后就是返回 `resolver` 实例，这些都是前期准备工作，如果想要启动真正的解析路径，需要调用 `resolver.resolve` 方法，这个时机是当 webpack 解析 normal module 的路径和 loader 模块路径的时候。

```js
// NormalModuleFactory.js
asyncLib.parallel(
  [
    // 解析当前模块的 loader 信息
    callback =>
      this.resolveRequestArray(
        contextInfo,
        context,
        elements,
        loaderResolver,
        callback
      ),
    // 解析当前模块的路径信息
    callback => {
      if (resource === "" || resource[0] === "?") {
        return callback(null, {
          resource
        });
      }
      normalResolver.resolve(
        contextInfo,
        context,
        resource,
        {},
        (err, resource, resourceResolveData) => {
          if (err) return callback(err);
          callback(null, {
            resourceResolveData,
            resource
          });
        }
      );
    }
  ],
  (err, results) => {
    // ...
  })
```

想要清楚 [resolver](./Resolver.md) 的原理，就得清楚上述第三步的 plugins 的源码。

## Plugins

Resolver 的 plugin 与 webpack 的 plugin 类似，都具有一定的范式，首先他得实现 apply 接口，接受的参数是 resolver 实例，并且钩入 `source hook`，而且通过 `resolver.doResolve` 方法将流程转交给 `target hook`，`resolver.doResolve` 内部会调用 `target hook` 的 `callAsync` 来逐步执行插件中 `tapAsync` 方法注入的函数。

```js
module.exports = class MyPlugin {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("ParsePlugin", (request, resolveContext, callback) => {
        const parsed = resolver.parse(request.request);
        const obj = Object.assign({}, request, parsed);
        if (request.query && !parsed.query) {
          obj.query = request.query;
        }
        if (parsed && resolveContext.log) {
          if (parsed.module) resolveContext.log("Parsed request is a module");
          if (parsed.directory)
            resolveContext.log("Parsed request is a directory");
        }
        resolver.doResolve(target, obj, null, resolveContext, callback);
      });
  }
};
```

`target` 以及 `source` hook 在 createResolver 已经枚举好了，它形成了一个 pipeline，从 `resolve` 钩子开始到 `resolved` 钩子结束，当然这个过程并不是从一而终的，pipeline 之间存在**反复跳跃**的过程，对于 `describedResolve` hook，可能又会流转回 `resolve` hook，相当于开启一轮新的 resolve 过程，这种情况在引入一个 npm 包的时候会遇到，比如 `import vue from 'Vue'`。再比如配置了 webpack 的 `resolve.alias`，也会在解析的过程中流转回 `resolve` hook。

```js
// 出发点
resolver.ensureHook("resolve");
resolver.ensureHook("parsedResolve");
resolver.ensureHook("describedResolve");
resolver.ensureHook("rawModule");
resolver.ensureHook("module");
resolver.ensureHook("relative");
resolver.ensureHook("describedRelative");
resolver.ensureHook("directory");
resolver.ensureHook("existingDirectory");
resolver.ensureHook("undescribedRawFile");
resolver.ensureHook("rawFile");
resolver.ensureHook("file");
resolver.ensureHook("existingFile");
// 结束点
resolver.ensureHook("resolved");
```

首先要弄清楚一个概念：通过 `resolver.ensureHook` 得到的 hook 都属于 `AsyncSeriesBailHook` 类型。这种 hook 具有以下的特点：

- **1.异步执行**

- **2.只要前一个 tapAsync 函数调用 callback 的第二个参数是 undefined，就会接着执行下一个 tapAsync 函数，否则跳过后续所有的 tapAsync 函数**

比如：

```js
let resolveHook = new AsyncSeriesBailHook()
resolveHook.tapAsync('async1', (callback) => {
  setTimeout(() => {
    callback()
  }, 1000);
})

resolveHook.tapAsync('async2', (callback) => {
  console.log('async2')
  setTimeout(() => {
    callback()
  }, 2000);
})

resolveHook.callAsync((err) => {
  console.log('callAsyncCallback 触发了')
})
```

:::tip
姑且将 tapAsync 函数的第二个参数称为 tapAsyncCallback，tapAsyncCallback 接收 callback 作为它的参数，调用 callback 时候传递的参数，决定了是走进下一个 tapAsyncCallback，还是直接走进 callAsync 函数的第一个 callAsyncCallback 函数。
:::

由于调用 `async1 tapAsyncCallback` 的 callback 没有传入参数，过了1秒，会接着走进 `async2 tapAsyncCallback`，再过了 2s 走到 `callAsyncCallback` 的内部，打印 `'callAsyncCallback 触发了'`。如果改成下面这种：

```js
let resolveHook = new AsyncSeriesBailHook()
resolveHook.tapAsync('async1', (callback) => {
  setTimeout(() => {
    callback(null, '1')
  }, 1000);
})

resolveHook.tapAsync('async2', (callback) => {
  console.log('async2')
  setTimeout(() => {
    callback()
  }, 2000);
})

resolveHook.callAsync((err, res) => {
  console.log(res) // 过了 1s 后，打印 '1'，会跳过 async2
  console.log('callAsyncCallback 触发了')
})
```

由于调用 `async1 tapAsyncCallback` 的 callback 第二个参数不是 undefined，所以会跳过 `async2 tapAsyncCallback`，这也就是 `'AsyncSeriesBailHook'` 中的 `'Bail'` 的精髓所在，它的意思表示**保险的**，只要有一个返回值，就会跳过后续所有的 tapAsyncCallback。

下面具体根据 pipeline 上的各种 hooks 来了解 Resolver。

## resolver.hooks.resolve

钩入 resolve hook 的插件有两个，分别是 UnsafeCachePlugin 和 ParsePlugin 插件，当然 UnsafeCachePlugin 插件的使用取决于 `options.unsafeCache`。如果使用了它，会 ensure 出一个新的 hook，叫做 `newResolve`，否则就直接使用 ParsePlugin 钩入 resolve hook。

```js
// resolve
if (unsafeCache) {
  plugins.push(
    new UnsafeCachePlugin(
      "resolve",
      cachePredicate,
      unsafeCache,
      cacheWithContext,
      "new-resolve"
    )
  );
  plugins.push(new ParsePlugin("new-resolve", "parsed-resolve"));
} else {
  plugins.push(new ParsePlugin("resolve", "parsed-resolve"));
}
```

看看 UnsafeCachePlugin 插件的逻辑。

### UnsafeCachePlugin

::: details UnsafeCachePlugin.js
```js
function getCacheId(request, withContext) {
  return JSON.stringify({
    context: withContext ? request.context : "",
    path: request.path,
    query: request.query,
    request: request.request
  });
}

module.exports = class UnsafeCachePlugin {
  constructor(source, filterPredicate, cache, withContext, target) {
    this.source = source;
    this.filterPredicate = filterPredicate;
    this.withContext = withContext;
    this.cache = cache || {};
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // 'resolve'
      .tapAsync("UnsafeCachePlugin", (request, resolveContext, callback) => {
        // 是否命中白名单（默认缓存所有请求）
        if (!this.filterPredicate(request)) return callback();
        // 获取缓存 id
        const cacheId = getCacheId(request, this.withContext);
        const cacheEntry = this.cache[cacheId];
        // 如果命中，跳过后续所有的流程
        if (cacheEntry) {
          return callback(null, cacheEntry);
        }
        // 如果没有命中，将流程推向 'newResolve' 钩子
        resolver.doResolve(
          target, // 'newResolve'
          request,
          null, // message
          resolveContext,
          (err, result) => {
            if (err) return callback(err);
            if (result) return callback(null, (this.cache[cacheId] = result));
            callback();
          }
        );
      });
  }
};
```
:::

UnsafeCachePlugin 的作用是缓存以前解析过的请求，如果没有命中缓存，通过 `resolver.doResolve` 将流程推向 `'newResolve'` 钩子，触发这个钩子会走进 ParsePlugin 插件内部。**同时要注意 'UnsafeCachePlugin' 的 tapAsyncCallback 的 callback 被包裹进 resolver.doResolve 的最后一个匿名函数参数里面了，开始了漫长的套娃过程**，走完 `resolved` hook 的时候拿到最后的 result 之后会缓存在 `this.cache`。

> doResolve 的过程可以👇[这里](./Resolver.md)

由于没有命中缓存，将 `newResolve` hook 丢给 `resolver.doResolve`，调用 `newResolve` hook 的 callAsync。

## resolver.hooks.newResolve

钩入 newResolve hook 的插件只有 ParsePlugin。

### ParsePlugin

:::details ParsePlugin.js
```js
module.exports = class ParsePlugin {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // newResolve
      .tapAsync("ParsePlugin", (request, resolveContext, callback) => {
        // 对 request 进行 parse，解析出 request, query 等信息
        const parsed = resolver.parse(request.request);
        const obj = Object.assign({}, request, parsed);
        if (request.query && !parsed.query) {
          obj.query = request.query;
        }
        if (parsed && resolveContext.log) {
          if (parsed.module) resolveContext.log("Parsed request is a module");
          if (parsed.directory)
            resolveContext.log("Parsed request is a directory");
        }
        // parsedResolve
        resolver.doResolve(target, obj, null, resolveContext, callback);
      });
  }
};
```
:::

ParsePlugin 既可以钩入 `resolve` hook，也可以钩入 `newResolve` hook，它的作用是对模块的请求路径进行解析，并且把解析后的信息挂载到 obj 上，将流程推向 `parsedResolve` hook。

## resolver.hooks.parsedResolve

钩入 `parsedResolve` hook 的插件包括 DescriptionFilePlugin 与 NextPlugin。

### DescriptionFilePlugin

:::details DescriptionFilePlugin.js
```js
module.exports = class DescriptionFilePlugin {
  constructor(source, filenames, target) {
    this.source = source;
    // 指定描述性文件的名称，默认是 ['package.json']
    this.filenames = [].concat(filenames);
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // parsedResolve
      .tapAsync(
        "DescriptionFilePlugin",
        (request, resolveContext, callback) => {
          const directory = request.path;
          DescriptionFileUtils.loadDescriptionFile(
            resolver,
            directory,
            this.filenames,
            resolveContext,
            (err, result) => {
              // 如果发生错误，直接执行 parsedResolve 的 callAsyncCallback
              if (err) return callback(err);
              if (!result) {
                if (resolveContext.missing) {
                  this.filenames.forEach(filename => {
                    resolveContext.missing.add(
                      resolver.join(directory, filename)
                    );
                  });
                }
                if (resolveContext.log)
                  resolveContext.log("No description file found");
                // 从 directory 开始向上遍历用户的文件系统都没有找到 package.json， 
                // 走进 parsedResolve 钩子的下一个 tapAsyncCallback，也就是 NextPlugin 插件内部
                return callback();
              }
              // 如果解析到了 package.json，将流程推向 describedResolve 钩子
              const relativePath =
                "." +
                request.path
                  .substr(result.directory.length)
                  .replace(/\\/g, "/");
              const obj = Object.assign({}, request, {
                descriptionFilePath: result.path,
                descriptionFileData: result.content,
                descriptionFileRoot: result.directory,
                relativePath: relativePath
              });
              resolver.doResolve( // describedResolve
                target,
                obj,
                "using description file: " +
                  result.path +
                  " (relative path: " +
                  relativePath +
                  ")",
                resolveContext,
                (err, result) => {
                  if (err) return callback(err);
                  // 不用走到 parsedResolve 钩子的下一个 tapAsyncCallback，也就是 NextPlugin 插件内部
                  if (result === undefined) return callback(null, null);
                  // 同样也是跳过 parsedResolve 的下一个 tapAsyncCallback
                  callback(null, result);
                }
              );
            }
          );
        }
      );
  }
};
```
:::

DescriptionFilePlugin 的作用是找到距离 `request.path` 最近的 package.json 文件。

DescriptionFilePlugin 与 NextPlugin 都是钩入 parsedResolve 钩子，下面这段代码，就会跳过 NextPlugin 的 tapAsyncCallback。

```js
// 第二个参数 null，会导致 parsedResolve hook 跳过 NextPlugin 的处理
if (result === undefined) return callback(null, null);
callback(null, result);
```

### NextPlugin

:::details
```js
module.exports = class NextPlugin {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // parsedResolve
      .tapAsync("NextPlugin", (request, resolveContext, callback) => {
        // describedResolve
        resolver.doResolve(target, request, null, resolveContext, callback);
      });
  }
};
```
:::

NextPlugin 很万精油，它的作用就是用来将流程推向任意的 `target` hook，这个取决于实例化 NextPlugin 的时候传入的 source 以及 target。而对于现阶段，它就是用来将流程推向 `describedResolve` hook，因为 DescriptionFilePlugin 没有找到 package.json，但是解析路径的任务还没有完成，所以需要用到 NextPlugin。

无论是 DescriptionFilePlugin 还是 NextPlugin，都会将流程推向 `describedResolve` hook

## resolver.hooks.describedResolve

钩入 describedResolve hook 的插件有很多，有些插件的开启也是因为 options 的配置决定的，包括有 AliasPlugin、ConcordModulesPlugin、AliasFieldPlugin、ModuleKindPlugin、JoinRequestPlugin、RootPlugin。

### AliasPlugin

AliasPlugin 的启用由 `options.alias` 控制，对于 webpack 来说，需要在 webpack.config.js 配置 `resolve.alias`。

:::details AliasPlugin.js
```js
module.exports = class AliasPlugin {
  constructor(source, options, target) {
    this.source = source;
    this.options = Array.isArray(options) ? options : [options];
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // describedResolve
      .tapAsync("AliasPlugin", (request, resolveContext, callback) => {
        const innerRequest = request.request || request.path;
        if (!innerRequest) return callback();
        for (const item of this.options) {
          // 判断 innerRequest 是否与 webpack config 的 resolve.alias 匹配
          if (
            innerRequest === item.name ||
            (!item.onlyModule && startsWith(innerRequest, item.name + "/"))
          ) {
            if (
              innerRequest !== item.alias &&
              !startsWith(innerRequest, item.alias + "/")
            ) {
              const newRequestStr =
                item.alias + innerRequest.substr(item.name.length);
              const obj = Object.assign({}, request, {
                request: newRequestStr
              });
              // 根据 newRequestStr 从 resolve 钩子发起新一轮的路径解析
              return resolver.doResolve(
                target, // resolve
                obj,
                "aliased with mapping '" +
                  item.name +
                  "': '" +
                  item.alias +
                  "' to '" +
                  newRequestStr +
                  "'",
                resolveContext,
                (err, result) => {
                  if (err) return callback(err);

                  // Don't allow other aliasing or raw request
                  if (result === undefined) return callback(null, null);
                  callback(null, result);
                }
              );
            }
          }
        }
        return callback();
      });
  }
};

```
:::

AliasPlugin 的作用是用其他的模块替换原始的请求模块，这是一个非常有用的功能，比如：

```js
// index.js
// vue 模块会被替换成 /path/to/myVue.js 模块
import Vue from 'vue'

// webpack.config.js
module.exports = {
  //...
  resolve: {
    alias: {
      // $ 代表精准匹配，必须以 vue 结尾
      vue$: '/path/to/myVue.js'
    }
  }
};
```

从上面的代码可以看出，如果请求与 `resolve.alias` 命中了，就回到解析路径的起点——resolve 钩子进行新一轮的路径解析，因为请求路径已经被替换了，成功解析出路径之后就跳过 ConcordModulesPlugin、AliasFieldPlugin 等等插件，如果没有命中，就执行 `callback` 函数，就进入 describedResolve 钩子的第二个 tapAsyncCallback，也走进 ConcordModulesPlugin 插件。

### ConcordModulesPlugin

插件的开启，必须配置 webpack 的 `resolve.concord` 为 true，默认是不开启插件的。v4 官方文档没有提到它，你可以阅读 [什么是 concord 配置](https://github.com/webpack/concord) 这片文章来了解更多的详情。

:::details ConcordModulesPlugin.js
```js
module.exports = class ConcordModulesPlugin {
  constructor(source, options, target) {
    this.source = source;
    this.options = options;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // describedResolve
      .tapAsync("ConcordModulesPlugin", (request, resolveContext, callback) => {
        const innerRequest = getInnerRequest(resolver, request);
        if (!innerRequest) return callback();
        // 取出 package.json 里面的 concord 字段
        const concordField = DescriptionFileUtils.getField(
          request.descriptionFileData,
          "concord"
        );
        if (!concordField) return callback();
        // 取出 concord 字段 里面的 modules 字段
        const data = concord.matchModule(
          request.context,
          concordField,
          innerRequest
        );
        // 如果没有配置，那么接着执行 describedResolve 下一个 tapAsyncCallback
        if (data === innerRequest) return callback();
        if (data === undefined) return callback();
        // 跳过后续所有的 tapAsyncCallback，执行 describedResolve 的 callAsyncCallback
        if (data === false) {
          const ignoreObj = Object.assign({}, request, {
            path: false
          });
          return callback(null, ignoreObj);
        }
        const obj = Object.assign({}, request, {
          path: request.descriptionFileRoot,
          request: data
        });
        // 根据 data 从 resolve 钩子发起新一轮的路径解析
        resolver.doResolve(
          target, // resolve
          obj,
          "aliased from description file " +
            request.descriptionFilePath +
            " with mapping '" +
            innerRequest +
            "' to '" +
            data +
            "'",
          resolveContext,
          (err, result) => {
            if (err) return callback(err);

            // Don't allow other aliasing or raw request
            if (result === undefined) return callback(null, null);
            callback(null, result);
          }
        );
      });
  }
};
```
:::

ConcordModulesPlugin 内部存在调用以下的代码，代表跳过 describedResolve 后续所有的 tapAsync 函数，相当于跳过 AliasFieldPlugin，ModuleKindPlugin，JoinRequestPlugin，RootPlugin 等插件的逻辑，直接调用 describedResolve 的 callAsyncCallback 函数。

```js
// 跳过 describedResolve 后续所有的 tapAsyncCallback
return callback(null, ignoreObj);
return callback(null, null);
callback(null, result);
```

否则的话，调用 `callback()` 会将走到 describedResolve 的下一个 tapAsyncCallback，也就是 AliasFieldPlugin 内部。

### AliasFieldPlugin

插件的开启，必须配置 webpack 的 `resolve.aliasFields` 字段。比如：

```js
// webpack.config.js
module.exports = {
  //...
  resolve: {
    aliasFields: ['browser']
  }
};
```

ResolverFactory 会找到对应的 `request.descriptionFile`，也就是**距离请求模块最近的 `package.json`**。这个描述性文件的 `browser` 字段可以配置为**字符串**或者**对象**，具体的解释可以看[这篇文章](https://github.com/defunctzombie/package-browser-field-spec)，配置为对象的时候，才会交给 AliasFieldPlugin 处理，配置为字符串的时候，会丢给 MainFieldPlugin 处理，这个时候得搭配 webpack 的 `resolve.mainFields` 字段才行，下文会提及。

:::details AliasFieldPlugin.js
```js
module.exports = class AliasFieldPlugin {
  constructor(source, field, target) {
    this.source = source;
    this.field = field;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // describedResolve
      .tapAsync("AliasFieldPlugin", (request, resolveContext, callback) => {
        if (!request.descriptionFileData) return callback();
        const innerRequest = getInnerRequest(resolver, request);
        if (!innerRequest) return callback();
        const fieldData = DescriptionFileUtils.getField(
          request.descriptionFileData,
          this.field
        );
        // 如果值不是一个对象，接着执行 describedResolve 下一个 tapAsyncCallback
        if (typeof fieldData !== "object") {
          if (resolveContext.log)
            resolveContext.log(
              "Field '" +
                this.field +
                "' doesn't contain a valid alias configuration"
            );
          return callback();
        }
        const data1 = fieldData[innerRequest];
        const data2 = fieldData[innerRequest.replace(/^\.\//, "")];
        const data = typeof data1 !== "undefined" ? data1 : data2;
        // 接着执行 describedResolve 下一个 tapAsyncCallback
        if (data === innerRequest) return callback();
        if (data === undefined) return callback();
        // 如果配置的请求为 false，中断 describedResolve 的 tapAsyncCallback，直接调用 callAsyncCallback
        if (data === false) {
          const ignoreObj = Object.assign({}, request, {
            path: false
          });
          return callback(null, ignoreObj);
        }
        const obj = Object.assign({}, request, {
          path: request.descriptionFileRoot,
          request: data
        });
        // 根据 data 从 resolve 钩子发起新一轮的路径解析
        resolver.doResolve(
          target, // resolve
          obj,
          "aliased from description file " +
            request.descriptionFilePath +
            " with mapping '" +
            innerRequest +
            "' to '" +
            data +
            "'",
          resolveContext,
          (err, result) => {
            if (err) return callback(err);

            // Don't allow other aliasing or raw request
            if (result === undefined) return callback(null, null);
            callback(null, result);
          }
        );
      });
  }
};
```
:::

AliasFieldPlugin 内部存在调用以下的代码，代表跳过 describedResolve 后续所有的 tapAsync 函数，就会跳过 ModuleKindPlugin，JoinRequestPlugin，RootPlugin 等插件的逻辑。

```js
// 跳过 describedResolve 后续所有的 tapAsyncCallback
return callback(null, ignoreObj);
return callback(null, null);
callback(null, result);
```

否则的话，调用 `callback()` 会将走到 describedResolve 的下一个 tapAsync 函数内部，也就是 ModuleKindPlugin 内部。

### ModuleKindPlugin

:::details ModuleKindPlugin.js
```js
module.exports = class ModuleKindPlugin {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // describedResolve
      .tapAsync("ModuleKindPlugin", (request, resolveContext, callback) => {
        // 如果请求不是一个 module 类型，接着执行 describedResolve 下一个 tapAsync 函数
        // 满足 /^\.$|^\.[\\/]|^\.\.$|^\.\.[\\/]|^\/|^[A-Z]:[\\/]/i 的都不是 module 类型
        // 比如 import './a'，而 import 'vue/lib/xxx', import 'vue' 这样的都是 module 类型
        if (!request.module) return callback();
        const obj = Object.assign({}, request);
        delete obj.module;
        // 将流程推向 rawModule 钩子
        resolver.doResolve(
          target, // rawModule
          obj,
          "resolve as module",
          resolveContext,
          (err, result) => {
            if (err) return callback(err);

            // 跳过 describedResolve 后续所有的 tapAsyncCallback
            if (result === undefined) return callback(null, null);
            callback(null, result);
          }
        );
      });
  }
};
```
:::

ModuleKindPlugin 内部存在调用以下的代码，代表跳过 describedResolve 后续所有的 tapAsyncCallback，就会跳过 JoinRequestPlugin，RootPlugin 等插件的逻辑

```js
// 跳过 describedResolve 后续所有的 tapAsyncCallback
return callback(null, null);
callback(null, result);
```

如果不是一个 module 类型的请求，调用 `callback()` 会将走到 describedResolve 的下一个 tapAsync 函数内部，也就是 JoinRequestPlugin 内部。

### JoinRequestPlugin

:::details JoinRequestPlugin.js
```js
module.exports = class JoinRequestPlugin {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // describedResolve
      .tapAsync("JoinRequestPlugin", (request, resolveContext, callback) => {
        const obj = Object.assign({}, request, {
          path: resolver.join(request.path, request.request),
          relativePath:
            request.relativePath &&
            resolver.join(request.relativePath, request.request),
          request: undefined
        });
        // relative
        resolver.doResolve(target, obj, null, resolveContext, callback);
      });
  }
};
```
:::

JoinRequestPlugin 主要是为了拼接 path 和 request，用到的是 [resolver](./Resolver.md) 的 join 方法，并且这个阶段会把 `request` 置空，接着将流程推向 `relative` hook，如果 relative 的流程走完了，会执行上述的 `callback`，如果 callback 的入参为空，会走到 describedResolve 的下一个 tapAsync 函数内部，也就是 RootPlugin 内部。

### RootPlugin

:::details RootPlugin.js
```js
class RootPlugin {
  constructor(source, root, target, ignoreErrors) {
    this.root = root;
    this.source = source;
    this.target = target;
    this._ignoreErrors = ignoreErrors;
  }
  apply(resolver) {
    const target = resolver.ensureHook(this.target);

    resolver
      .getHook(this.source) // describedResolve
      .tapAsync("RootPlugin", (request, resolveContext, callback) => {
        const req = request.request;
        if (!req) return callback();
        // 当前的 request 必须是以 '/' 开头，代表绝对路径
        if (!req.startsWith("/")) return callback();
        // 以 root 拼接 path
        const path = resolver.join(this.root, req.slice(1));
        const obj = Object.assign(request, {
          path,
          relativePath: request.relativePath && path
        });
        // relative
        resolver.doResolve(
          target,
          obj,
          `root path ${this.root}`,
          resolveContext,
          this._ignoreErrors
            ? (err, result) => {
                if (err) {
                  if (resolveContext.log) {
                    resolveContext.log(
                      `Ignored fatal error while resolving root path:\n${err}`
                    );
                  }
                  return callback();
                }
                if (result) return callback(null, result);
                callback();
              }
            : callback
        );
      });
  }
}
```
:::

RootPlugin 尝试在配置的 root 路径里面找到对应的 request，不过 request 必须是绝对路径的请求，接着将流程推向 `relative` hook，如果 relative 的流程走完了，会执行上述的 `callback`，如果 callback 的入参为空，会走到调用 `describedResolve` hook 的 callAsyncCallback，这个时候就回退到 parsedResolve hook 的 callAsyncCallback，不断地解开**套娃**，直到调用 `resolver.resolve` 的回调函数，代表所有的数据都解析完成。

## resolver.hooks.rawModule

如果以上的 AliasPlugin，ConcordModulesPlugin，AliasFieldPlugin 都没有解析到路径，就会走到 ModuleKindPlugin，而上述也提及到了，只要你的请求是一个 module 类型，流程就会流转到 rawModule hook，什么是 module 类型的请求呢？比如：

```js
import Vue from 'vue'
import xxx from 'vue/dist/vue.js'
```

钩入 rawModule hook 的插件有 ModuleAppendPlugin 与 TryNextPlugin。

### ModuleAppendPlugin

:::details ModuleAppendPlugin.js
```js
module.exports = class ModuleAppendPlugin {
  constructor(source, appending, target) {
    this.source = source;
    this.appending = appending;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // rawModule
      .tapAsync("ModuleAppendPlugin", (request, resolveContext, callback) => {
        const i = request.request.indexOf("/"),
          j = request.request.indexOf("\\");
        const p = i < 0 ? j : j < 0 ? i : i < j ? i : j;
        let moduleName, remainingRequest;
        // 获取模块的名称
        if (p < 0) {
          moduleName = request.request;
          remainingRequest = "";
        } else {
          moduleName = request.request.substr(0, p);
          remainingRequest = request.request.substr(p);
        }
        // 目前没发现可能走到下面的场景，因为如果 moduleName 为 '.' 或者 '..'，
        // 早在 ModuleKindPlugin 就已经被拦截，不会走到这里
        if (moduleName === "." || moduleName === "..") return callback();
        // 拼接 moduleExtension
        const moduleFinalName = moduleName + this.appending;
        const obj = Object.assign({}, request, {
          request: moduleFinalName + remainingRequest
        });
        resolver.doResolve(
          target, // module
          obj,
          "module variation " + moduleFinalName,
          resolveContext,
          callback
        );
      });
  }
};
```
:::

ModuleAppendPlugin 的作用是用来拼接 moduleExtensions，在早期的 webpack 版本，loader 的配置可以忽略 `-loader`，从 webpack 2 开始，webpack 推荐使用全名，比如 `babel-loader`。

### TryNextPlugin

如果配置的 `options.enforceModuleExtension` 为 false，并且上述的 ModuleAppendPlugin tapAsyncCallback 内部的 callback 被调用的时候，没有任何参数时，会走到 TryNextPlugin 内部。

:::details TryNextPlugin.js
```js
module.exports = class TryNextPlugin {
  constructor(source, message, target) {
    this.source = source;
    this.message = message;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // rawModule
      .tapAsync("TryNextPlugin", (request, resolveContext, callback) => {
        resolver.doResolve(
          target, // module
          request,
          this.message,
          resolveContext,
          callback
        );
      });
  }
};
```
:::

TryNextPlugin 与 上述的 NextPlugin 的功能基本上一致，唯一不同之处在于 TryNextPlugin 多了一个 message 字段，最终都会流转到 module hook。

## resolver.hooks.module

钩入 module hook 的插件有 ModulesInHierachicDirectoriesPlugin 和 ModulesInRootPlugin。

### ModulesInHierachicDirectoriesPlugin

插件接受的参数的关联逻辑如下：

```js
// A list of directories to resolve modules from, can be absolute path or folder name
let modules = options.modules || ["node_modules"];

modules = mergeFilteredToArray([].concat(modules), item => {
  return !isAbsolutePath(item);
});

// 将绝对路径与相对路径分组，比如 ['/User/abc', 'node_modules', 'another_node_modules']
// 处理之后就变成 ['/User/abc', ['node_modules', 'another_node_modules']]
// 数组的第一个丢给 ModulesInRootPlugin，数组的第二个丢给 ModulesInHierachicDirectoriesPlugin
function mergeFilteredToArray(array, filter) {
  return array.reduce((array, item) => {
    if (filter(item)) {
      const lastElement = array[array.length - 1];
      if (Array.isArray(lastElement)) {
        lastElement.push(item);
      } else {
        array.push([item]);
      }
      return array;
    } else {
      array.push(item);
      return array;
    }
  }, []);
}

// 判断是windows 或者 linux macOS 的绝对路径
function isAbsolutePath(path) {
  return /^[A-Z]:|^\//.test(path);
}

modules.forEach(item => {
  if (Array.isArray(item))
    plugins.push(
      new ModulesInHierachicDirectoriesPlugin("module", item, "resolve")
    );
  else plugins.push(new ModulesInRootPlugin("module", item, "resolve"));
});
```

处理完数据之后，接下来具体分析 ModulesInHierachicDirectoriesPlugin 与 ModulesInRootPlugin 的细节。

:::details ModulesInHierachicDirectoriesPlugin.js
```js
module.exports = class ModulesInHierachicDirectoriesPlugin {
  constructor(source, directories, target) {
    this.source = source;
    this.directories = [].concat(directories); // 默认是 ['node_modules']
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync(
        "ModulesInHierachicDirectoriesPlugin",
        (request, resolveContext, callback) => {
          const fs = resolver.fileSystem;
          // 获取所有需要搜寻的目录，比如当前路径是 '/a/b/c'
          // 得到路径 ['/a/b/c/node_modules', '/a/b/node_modules', '/a/node_modules', '/node_modules']
          const addrs = getPaths(request.path)
            .paths.map(p => {
              return this.directories.map(d => resolver.join(p, d));
            })
            .reduce((array, p) => {
              array.push.apply(array, p);
              return array;
            }, []);
          // 遍历 addrs
          forEachBail(
            addrs,
            (addr, callback) => {
              fs.stat(addr, (err, stat) => {
                if (!err && stat && stat.isDirectory()) {
                  const obj = Object.assign({}, request, {
                    path: addr,
                    request: "./" + request.request
                  });
                  const message = "looking for modules in " + addr;
                  // 如果当前路径的存在，从 resolve 发起一轮新的路径解析
                  // 如果找到了对应的文件，会根据优先级，决定是否执行 tapAsyncCallback 的 callback
                  return resolver.doResolve(
                    target,
                    obj,
                    message,
                    resolveContext,
                    callback
                  );
                }
                if (resolveContext.log)
                  resolveContext.log(
                    addr + " doesn't exist or is not a directory"
                  );
                if (resolveContext.missing) resolveContext.missing.add(addr);
                return callback();
              });
            },
            callback
          );
        }
      );
  }
};

// 获取当前路径需要遍历的路径，比如路径 '/a/b/c'
// 得到路径 ['/a/b/c', '/a/b', '/a', '/']
function getPaths(path) {
  const parts = path.split(/(.*?[\\/]+)/);
  const paths = [path];
  const seqments = [parts[parts.length - 1]];
  let part = parts[parts.length - 1];
  path = path.substr(0, path.length - part.length - 1);
  for (let i = parts.length - 2; i > 2; i -= 2) {
    paths.push(path);
    part = parts[i];
    path = path.substr(0, path.length - part.length) || "/";
    seqments.push(part.substr(0, part.length - 1));
  }
  part = parts[1];
  seqments.push(part);
  paths.push(part);
  return {
    paths: paths,
    seqments: seqments
  };
};
```
:::

forEachBail 的功能是遍历所有的 addrs，其中内部的逻辑会保证路径的优先级，因为 `'/a/b/c/node_modules'` 的优先级比 `''/a/b/node_modules''`。它是怎么做到的呢？

```js
module.exports = function forEachBail(array, iterator, callback) {
  if (array.length === 0) return callback();
  // currentPos 默认为数组的最大值 
  let currentPos = array.length;
  let currentResult;
  let done = [];
  // 遍历数组
  for (let i = 0; i < array.length; i++) {
    const itCb = createIteratorCallback(i);
    // iterator 必须调用 itCb，并且它的入参决定了 callback 的调用时机
    iterator(array[i], itCb);
    if (currentPos === 0) break;
  }

  function createIteratorCallback(i) {
    // args 是调用上述 itCb 的入参
    return (...args) => {
      // 如果后续优先级低的数组元素调用了 itCb，直接忽略
      // 因为优先级高的数组元素已经返回了对应的值
      if (i >= currentPos) return; // ignore
      // 记录当前已经调用过 itCb 的数组元素
      done.push(i);
      // args 不为 0，代表当前的数组元素调用 itCb 传入了对应的数据
      if (args.length > 0) {
        // 标记当前数组元素
        currentPos = i + 1;
        // 找出优先级比当前数组元素还大的其他元素
        done = done.filter(item => {
          return item <= i;
        });
        // 更新结果
        currentResult = args;
      }
      // 如果当前的数组元素已经是优先级最高的元素，那么直接返回它对应的结果
      if (done.length === currentPos) {
        callback.apply(null, currentResult);
        // 设置为 0，是为了阻断后续所有的元素，因为会走到上述的 if(i >= currentPos) 逻辑
        currentPos = 0;
      }
    };
  }
};
```

### ModulesInRootPlugin

如果 `options.modules` 配置的是一个绝对路径，那么 ModulesInRootPlugin 会被使用。

```js
// webpack.config.js
module.exports = {
  //...
  resolve: {
    modules: [path.resolve(__dirname, 'src')]
  }
};
```

:::details ModulesInRootPlugin.js
```js
module.exports = class ModulesInRootPlugin {
  constructor(source, path, target) {
    this.source = source;
    this.path = path;
    this.target = target;
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // module
      .tapAsync("ModulesInRootPlugin", (request, resolveContext, callback) => {
        // 修改 path 以及 request
        const obj = Object.assign({}, request, {
          path: this.path, // 配置的绝对路径
          request: "./" + request.request
        });
        // 从 resolve 钩子重新发起一轮路径解析
        resolver.doResolve(
          target, // resolve
          obj,
          "looking for modules in " + this.path,
          resolveContext,
          callback
        );
      });
  }
};

```
:::

ModulesInRootPlugin 逻辑非常简单，因为它接收的 path 参数已经是一个绝对路径，所以只需要对 module 类型的请求前面拼接一个 `'.'`，将它变成一个相对路径，并且发起新一轮的 resolve 即能得到对应的结果。

至此 resolver.hooks.module 的分析就完成了，它代表了 **module 类型请求**的解析过程结束，但是在真实的环境下，往往存在很多相对路径的请求，比如 `import './a.js'`。所以我们把视角再折返回 JoinRequestPlugin，插件内部的 target hook 是 resolver.hooks.relative。

## resolver.hooks.relative

钩入 relative hook 的插件有 DescriptionFilePlugin 与 NextPlugin。

没错！相信你在之前的 parsedResolve hook 就看到了 DescriptionFilePlugin 的影子，在这里它被重复使用了，只不过 source 与 target hook 发生了变化。

:::details DescriptionFilePlugin.js
```js
module.exports = class DescriptionFilePlugin {
  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // relative
      .tapAsync(
        "DescriptionFilePlugin",
        (request, resolveContext, callback) => {
          const directory = request.path;
          DescriptionFileUtils.loadDescriptionFile(
            resolver,
            directory,
            this.filenames,
            resolveContext,
            (err, result) => {
              if (err) return callback(err);
              if (!result) {
                if (resolveContext.missing) {
                  this.filenames.forEach(filename => {
                    resolveContext.missing.add(
                      resolver.join(directory, filename)
                    );
                  });
                }
                if (resolveContext.log)
                  resolveContext.log("No description file found");
                // 如果没找到 description file，进入下一个 tapAsyncCallback，也就是 NextPlugin 内部
                return callback();
              }
              const relativePath =
                "." +
                request.path
                  .substr(result.directory.length)
                  .replace(/\\/g, "/");
              const obj = Object.assign({}, request, {
                descriptionFilePath: result.path,
                descriptionFileData: result.content,
                descriptionFileRoot: result.directory,
                relativePath: relativePath
              });
              resolver.doResolve(
                target, // describedRelative
                obj,
                "using description file: " +
                  result.path +
                  " (relative path: " +
                  relativePath +
                  ")",
                resolveContext,
                (err, result) => {
                  if (err) return callback(err);

                  // Don't allow other processing
                  if (result === undefined) return callback(null, null);
                  callback(null, result);
                }
              );
            }
          );
        }
      );
  }
};
```
:::

那么这次的 DescriptionFilePlugin 与上一次的 DescriptionFilePlugin 插件有什么区别呢？区别在于 `request` 对象。

```js
// 对于上一个 DescriptionFilePlugin
// 假如是这样的
request = {
  path: '/a/b/c',
  request: './main.js'
}

// 但是经过 JoinRequestPlugin 处理之后，request 上的 request 属性被干掉了，变成了
request = {
  path: '/a/b/c/main.js'
}

// 前后两次就导致了 relativePath 的值不一样，后一次的 relativePath 包含了 'main.js' 这一部分
```

如果没有找到 package.json，调用 `callback()` 的时候会走进 NextPlugin。

### NextPlugin

:::details NextPlugin.js
```js
module.exports = class NextPlugin {
  constructor(source, target) {
    this.source = source; // relative
    this.target = target; // describedRelative
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("NextPlugin", (request, resolveContext, callback) => {
        resolver.doResolve(target, request, null, resolveContext, callback);
      });
  }
};
```
:::

NextPlugin 只是用来将流程推向 describedRelative hook。

## resolver.hooks.describedRelative

钩入 describedRelative hook 的插件有 FileKindPlugin 与 TryNextPlugin。

:::details FileKindPlugin.js
```js
module.exports = class FileKindPlugin {
  constructor(source, target) {
    this.source = source; // describedRelative
    this.target = target; // rawFile
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("FileKindPlugin", (request, resolveContext, callback) => {
        // 判断请求是否是 directory 类型，在执行 ParsePlugin 的时候会鉴定
        // 比如 './a/module/' 就是 directory 类型
        if (request.directory) return callback(); // 走进 TryNextPlugin
        const obj = Object.assign({}, request);
        // 删除 directory 信息
        delete obj.directory;
        // 流程推向 rawFile hook
        resolver.doResolve(target, obj, null, resolveContext, callback);
      });
  }
};

```
:::

如果请求是 directory 类型，会走进 TryNextPlugin，如果不是，流程会推向 rawFile hook，我们先来看下 TryNextPlugin 分支。另外的分支可以看 [rawFile hook](./ResolverFactory.html#resolver-hooks-rawfile)。

### TryNextPlugin

:::details TryNextPlugin.js
```js
module.exports = class TryNextPlugin {
  constructor(source, message, target) {
    this.source = source; // describedRelative
    this.message = message;
    this.target = target; // directory
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("TryNextPlugin", (request, resolveContext, callback) => {
        resolver.doResolve(
          target,
          request,
          this.message,
          resolveContext,
          callback
        );
      });
  }
};
```
:::

TryNextPlugin 会将流程推向 directory hook。

## resolver.hooks.directory

钩入 directory hook 的插件有 DirectoryExistsPlugin。

### DirectoryExistsPlugin

:::details DirectoryExistsPlugin.js
```js
module.exports = class DirectoryExistsPlugin {
  constructor(source, target) {
    this.source = source; // directory
    this.target = target; // existingDirectory
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync(
        "DirectoryExistsPlugin",
        (request, resolveContext, callback) => {
          const fs = resolver.fileSystem;
          const directory = request.path;
          fs.stat(directory, (err, stat) => {
            // 如果出错，没有此目录或者此文件，则退回到 describedRelative 的 callAsyncCallback
            if (err || !stat) {
              if (resolveContext.missing) resolveContext.missing.add(directory);
              if (resolveContext.log)
                resolveContext.log(directory + " doesn't exist");
              return callback();
            }
            // 如果路径不是一个目录，则退回到 describedRelative 的 callAsyncCallback
            if (!stat.isDirectory()) {
              if (resolveContext.missing) resolveContext.missing.add(directory);
              if (resolveContext.log)
                resolveContext.log(directory + " is not a directory");
              return callback();
            }
            // 将流程推向 existingDirectory hook
            resolver.doResolve(
              target,
              request,
              "existing directory",
              resolveContext,
              callback
            );
          });
        }
      );
  }
};
```
:::

DirectoryExistsPlugin 用来判断当前解析的路径类型是否是 directory，如果不是，那么路径解析到此结束，接着退回到 describedRelative 的 callAsyncCallback，如果是，流程接着走到了 existingDirectory hook。

## resolver.hooks.existingDirectory

钩入 existingDirectory hook 的插件有 NextPlugin、ConcordMainPlugin、MainFieldPlugin、UseFilePlugin，不过 NextPlugin 与其他的插件互斥，配置了 resolveToContext 只会开启 NextPlugin，并且会直接将流程推向 resolved hook。我们姑且称这个配置为 **existingDirectory 分支1**，其他的称为 **existingDirectory 分支2**

```js
// 只需要解析到目录
const resolveToContext = options.resolveToContext || false;
```

### NextPlugin(existingDirectory 分支1)

:::details NextPlugin.js
```js
module.exports = class NextPlugin {
  constructor(source, target) {
    this.source = source; // existingDirectory
    this.target = target; // resolved
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("NextPlugin", (request, resolveContext, callback) => {
        resolver.doResolve(target, request, null, resolveContext, callback);
      });
  }
};
```
:::

流程推向 [resolved hook](./ResolverFactory.html#resolver-hooks-resolved) 之后，就走到了 RestrictionsPlugin 与 ResultPlugin，也就是调用 `resolver.resolve` 方法的出口，表示原始的请求路径已经有了结果。

existingDirectory 分支2说明 resolveToContext 为 false，钩入 existingDirectory hook 的插件包括 ConcordMainPlugin、MainFieldPlugin、UseFilePlugin。

### ConcordMainPlugin(existingDirectory 分支2)

配置了 concord 才会开启 ConcordMainPlugin 插件。

```js
// Enable concord description file instructions
const enableConcord = options.concord || false;
// package.json 要声明该字段
{
  "concord": {
    "main": "./correct.js"
  }
}
```

:::details ConcordMainPlugin.js
```js
module.exports = class ConcordMainPlugin {
  constructor(source, options, target) {
    this.source = source; // existingDirectory
    this.options = options;
    this.target = target; // resolve
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("ConcordMainPlugin", (request, resolveContext, callback) => {
        // 请求路径必须含有自己的 package.json
        // 比如 request.path 为 '/a/b'，那么 b 目录下必须得有 package.json
        if (request.path !== request.descriptionFileRoot) return callback();
        // 获取 concord 字段
        const concordField = DescriptionFileUtils.getField(
          request.descriptionFileData,
          "concord"
        );
        // 如果不存在，就执行下一个 tapAsyncCallback，也就是 MainFieldPlugin
        if (!concordField) return callback();
        // 获取 concord.main
        const mainModule = concord.getMain(request.context, concordField);
        // 如果不存在，就执行下一个 tapAsyncCallback，也就是 MainFieldPlugin
        if (!mainModule) return callback();
        // 从 resolve 钩子发起一轮新的路径解析
        const obj = Object.assign({}, request, {
          request: mainModule
        });
        const filename = path.basename(request.descriptionFilePath);
        return resolver.doResolve(
          target,
          obj,
          "use " + mainModule + " from " + filename,
          resolveContext,
          callback
        );
      });
  }
};
```
:::

### MainFieldPlugin(existingDirectory 分支2)

MainFieldPlugin 受 `options.mainFields` 配置影响。

```js
// 默认取 main 字段
let mainFields = options.mainFields || ["main"];
// 也可以取 browser 字段，比如 ['browser', 'main']
```

:::details MainFieldPlugin.js
```js
function MainFieldPlugin(source, options, target) {
  this.source = source; // existingDirectory
  this.options = options;
  this.target = target; // resolve
}
module.exports = MainFieldPlugin;

MainFieldPlugin.prototype.apply = function(resolver) {
  var target = this.target;
  var options = this.options;
  resolver.plugin(this.source, function mainField(request, callback) {
    // 引用的模块必须有自己的 package.json 文件
    if(request.path !== request.descriptionFileRoot) return callback();
    // package.json 的文件内容
    var content = request.descriptionFileData;
    var filename = path.basename(request.descriptionFilePath);
    var mainModule;
    // mainField 字段名称，数组或者字符串
    var field = options.name;
    if(Array.isArray(field)) {
      var current = content;
      for(var j = 0; j < field.length; j++) {
        if(current === null || typeof current !== "object") {
          current = null;
          break;
        }
        current = current[field[j]];
      }
      if(typeof current === "string") {
        mainModule = current;
      }
    } else {
      // 绝大部分情况都是字符串
      if(typeof content[field] === "string") {
        mainModule = content[field];
      }
    }
    if(!mainModule) return callback();
    // 修改请求，变成相对路径
    if(options.forceRelative && !/^\.\.?\//.test(mainModule))
      mainModule = "./" + mainModule;
    var obj = Object.assign({}, request, {
      request: mainModule
    });
    // 流程推向 resolve 钩子，发起新一轮的路径解析
    return resolver.doResolve(target, obj, "use " + mainModule + " from " + options.name + " in " + filename, callback);
  });
};
```
:::

MainFieldPlugin 就是找到引用模块的 package.json 里面的 mainFields 字段，来决定最终引入的文件。举个例子：

```js
import Vue from 'vue'
// 对于 vue 来说，会找到 node_modules 下 vue 目录下的 package.json 的 main 字段
```

如果 MainFieldPlugin 没有找到对应的 mainFields 就会执行下一个 tapAsyncCallback，也就是 UseFilePlugin 内部。

### UseFilePlugin(existingDirectory 分支2)

UseFilePlugin 受 `options.mainFiles` 配置影响。

```js
// 默认取目录下面的 index 文件
let mainFiles = options.mainFiles || ["index"];
```

:::details UseFilePlugin.js
```js
module.exports = class UseFilePlugin {
  constructor(source, filename, target) {
    this.source = source; // existingDirectory
    this.filename = filename;
    this.target = target; // undescribedRawFile
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("UseFilePlugin", (request, resolveContext, callback) => {
        // 拼接路径
        const filePath = resolver.join(request.path, this.filename);
        const obj = Object.assign({}, request, {
          path: filePath,
          relativePath:
            request.relativePath &&
            resolver.join(request.relativePath, this.filename)
        });
        // 流程转向 undescribedRawFile hook
        resolver.doResolve(
          target,
          obj,
          "using path: " + filePath,
          resolveContext,
          callback
        );
      });
  }
};
```
:::

UseFilePlugin 的作用是拼接 path 与 mainFiles 字段，比如请求是 `'./a/'`，自动寻找 `'./a/index.js'` 是否存在，流程转向 undescribedRawFile hook。

## resolver.hooks.undescribedRawFile

钩入 undescribedRawFile hook 的插件包括 DescriptionFilePlugin 和 NextPlugin。

### DescriptionFilePlugin

:::details DescriptionFilePlugin.js
```js
module.exports = class DescriptionFilePlugin {
  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source) // undescribedRawFile
      .tapAsync(
        "DescriptionFilePlugin",
        (request, resolveContext, callback) => {
          const directory = request.path;
          DescriptionFileUtils.loadDescriptionFile(
            resolver,
            directory,
            this.filenames,
            resolveContext,
            (err, result) => {
              if (err) return callback(err);
              if (!result) {
                if (resolveContext.missing) {
                  this.filenames.forEach(filename => {
                    resolveContext.missing.add(
                      resolver.join(directory, filename)
                    );
                  });
                }
                if (resolveContext.log)
                  resolveContext.log("No description file found");
                // 如果没找到 description file，进入下一个 tapAsyncCallback，也就是 NextPlugin 内部
                return callback();
              }
              // 由于 UseFilePlugin 修改了 request，所以需要更新 relativePath
              const relativePath =
                "." +
                request.path
                  .substr(result.directory.length)
                  .replace(/\\/g, "/");
              const obj = Object.assign({}, request, {
                descriptionFilePath: result.path,
                descriptionFileData: result.content,
                descriptionFileRoot: result.directory,
                relativePath: relativePath
              });
              // 流程转向 rawFile hook
              resolver.doResolve(
                target, // rawFile
                obj,
                "using description file: " +
                  result.path +
                  " (relative path: " +
                  relativePath +
                  ")",
                resolveContext,
                (err, result) => {
                  if (err) return callback(err);

                  // Don't allow other processing
                  if (result === undefined) return callback(null, null);
                  callback(null, result);
                }
              );
            }
          );
        }
      );
  }
};
```
:::

DescriptionFilePlugin 在这里又被重复使用了，是因为 UseFilePlugin 修改了 request.path，因此需要重新计算 relativePath 并且更新 descriptionFile 信息。如果没找到 descriptionFile 信息，就进入下一个 tapAsyncCallback 函数，也就是 NextPlugin 内部。

### NextPlugin

:::details NextPlugin.js
```js

module.exports = class NextPlugin {
  constructor(source, target) {
    this.source = source; // undescribedRawFile
    this.target = target; // rawFile
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("NextPlugin", (request, resolveContext, callback) => {
        resolver.doResolve(target, request, null, resolveContext, callback);
      });
  }
};
```
:::

NextPlugin 主要作用是将流程推向 rawFile hook。

## resolver.hooks.rawFile

钩入 rawFile hook 的插件包括 TryNextPlugin、ConcordExtensionsPlugin、AppendPlugin。

### TryNextPlugin

默认会使用这个插件。

```js
// Enforce that a extension from extensions must be used
const enforceExtension = options.enforceExtension || false;

// raw-file
if (!enforceExtension) {
  plugins.push(new TryNextPlugin("raw-file", "no extension", "file"));
}
```

**最好不要配置 enforceExtension 为 true，要不然会导致你的所有请求路径不能带有 extension**。

```js
// webpack.config.js
module.exports = {
  //...
  resolve: {
    enforceExtension: true
  }
};

// index.js
import './a.js' // 报错，找不到模块
import './a' // 不报错，找到 './a.js'

// 作者的意图就是希望所有的请求都不能带 extension，在查找路径的时候，默认会拼接 options.extension
```

:::details TryNextPlugin.js
```js
module.exports = class TryNextPlugin {
  constructor(source, message, target) {
    this.source = source; // rawFile
    this.message = message;
    this.target = target; // file
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("TryNextPlugin", (request, resolveContext, callback) => {
        // 流程转向 file hook，如果 调用 callback 的时候没有传入参数
        // 代表进入下一个 tapAsyncCallback，也就是 ConcordExtensionsPlugin 内部
        resolver.doResolve(
          target,
          request,
          this.message,
          resolveContext,
          callback
        );
      });
  }
};
```
:::

TryNextPlugin 的作用是将流程推向 file hook，也就是说先不带 extensions 去解析请求路径，看看请求路径是否存在，如果不存在，那就进入 ConcordExtensionsPlugin 内部。

### ConcordExtensionsPlugin

该插件的开启受 `options.concord ` 控制，而且必须要在引用模块的 package.json 声明对应的字段。

```js
// package.json
{
  "main": "./file",
  "concord": {
    "extensions": [ // 必须存在
      ".css",
      ".ts",
      ".js"
    ]
  }
}
```

:::details ConcordExtensionsPlugin.js
```js
module.exports = class ConcordExtensionsPlugin {
  constructor(source, options, target) {
    this.source = source; // rawFile
    this.options = options; // {}
    this.target = target; // file
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync(
        "ConcordExtensionsPlugin",
        (request, resolveContext, callback) => {
          // 从 package.json 取出 concord 字段
          const concordField = DescriptionFileUtils.getField(
            request.descriptionFileData,
            "concord"
          );
          // 如果不存在，进入下一个 tapAsyncCallback，也就是 AppendPlugin 内部
          if (!concordField) return callback();
          // 取出 concord.extensions 字段
          const extensions = concord.getExtensions(
            request.context,
            concordField
          );
          // 如果不存在，进入下一个 tapAsyncCallback，也就是 AppendPlugin 内部
          if (!extensions) return callback();
          forEachBail(
            extensions,
            (appending, callback) => {
              // 拼接 extension
              const obj = Object.assign({}, request, {
                path: request.path + appending,
                relativePath:
                  request.relativePath && request.relativePath + appending
              });
              // 将流程推向 file hook
              resolver.doResolve(
                target,
                obj,
                "concord extension: " + appending,
                resolveContext,
                callback
              );
            },
            (err, result) => {
              if (err) return callback(err);

              // 跳过后续所有的 tapAsyncCallback，也就是 AppendPlugin
              if (result === undefined) return callback(null, null);
              callback(null, result);
            }
          );
        }
      );
  }
};
```
:::

### AppendPlugin

插件受 `options.extensions` 控制，默认值是 `[".js", ".json", ".node"]`。

:::details AppendPlugin.js
```js
module.exports = class AppendPlugin {
  constructor(source, appending, target) {
    this.source = source; // rawFile
    this.appending = appending; // ".js" | ".json" | ".node"
    this.target = target; // file
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    resolver
      .getHook(this.source)
      .tapAsync("AppendPlugin", (request, resolveContext, callback) => {
        const obj = Object.assign({}, request, {
          path: request.path + this.appending, // 拼接 extension
          relativePath:
            request.relativePath && request.relativePath + this.appending
        });
        // 流程推向 file hook
        resolver.doResolve(
          target,
          obj,
          this.appending,
          resolveContext,
          callback
        );
      });
  }
};
```
:::

对于 TryNextPlugin、ConcordExtensionsPlugin、AppendPlugin 三个插件，流程都会推向 file hook。

## resolver.hooks.file

钩入 file hook 的插件有 AliasPlugin、ConcordModulesPlugin、AliasFieldPlugin、SymlinkPlugin、FileExistsPlugin。

与 [describedResolve](./ResolverFactory.html#resolver-hooks-describedresolve) 类似，都用到了 AliasPlugin、ConcordModulesPlugin、AliasFieldPlugin，原理是一致的，所以跳过。聚焦 SymlinkPlugin、FileExistsPlugin 这两个插件。

### SymlinkPlugin

插件的开启受 `options.symlinks` 控制，默认值为 ture，表示 symlinked 资源是被解析为它们真实路径，而不是它们链接的那个位置。如果你是通过 npm link 的方式，将自己本地的 package 软链到你项目的 node_modules，那么对于 Resolver 来说，它解析的路径是你本地的 package 的路径，而不是项目的 node_modules 下面的路径。

:::details SymlinkPlugin.js
```js
module.exports = class SymlinkPlugin {
  constructor(source, target) {
    this.source = source; // file
    this.target = target; // relative
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    const fs = resolver.fileSystem;
    resolver
      .getHook(this.source)
      .tapAsync("SymlinkPlugin", (request, resolveContext, callback) => {
        const pathsResult = getPaths(request.path);
        const pathSeqments = pathsResult.seqments;
        const paths = pathsResult.paths;

        let containsSymlink = false;
        // 遍历当前路径上可能存在符号链接的路径
        forEachBail.withIndex(
          paths,
          (path, idx, callback) => {
            fs.readlink(path, (err, result) => {
              if (!err && result) {
                pathSeqments[idx] = result;
                containsSymlink = true;
                // Shortcut when absolute symlink found
                if (/^(\/|[a-zA-Z]:($|\\))/.test(result))
                  return callback(null, idx);
              }
              callback();
            });
          },
          (err, idx) => {
            // 没有符号链接，进入下一个 tapAsyncCallback，也就是 FileExistsPlugin 内部
            if (!containsSymlink) return callback();
            const resultSeqments =
              typeof idx === "number"
                ? pathSeqments.slice(0, idx + 1)
                : pathSeqments.slice();
            // 拼接真实的路径
            const result = resultSeqments.reverse().reduce((a, b) => {
              return resolver.join(a, b);
            });
            const obj = Object.assign({}, request, {
              path: result
            });
            // 流程推向 relative
            resolver.doResolve(
              target,
              obj,
              "resolved symlink to " + result,
              resolveContext,
              callback
            );
          }
        );
      });
  }
};

```
:::

流程推向 relative hook，是为了重新得到 descriptionFile 这些信息。如果没有符号链接的话，就会走到 FileExistsPlugin。

### FileExistsPlugin

:::details FileExistsPlugin.js
```js
module.exports = class FileExistsPlugin {
  constructor(source, target) {
    this.source = source; // file
    this.target = target; // existingFile
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    const fs = resolver.fileSystem;
    resolver
      .getHook(this.source)
      .tapAsync("FileExistsPlugin", (request, resolveContext, callback) => {
        const file = request.path;
        fs.stat(file, (err, stat) => {
          // 路径不存在，说明解析文件路径失败
          if (err || !stat) {
            if (resolveContext.missing) resolveContext.missing.add(file);
            if (resolveContext.log) resolveContext.log(file + " doesn't exist");
            return callback();
          }
          // 路径是一个目录，而不是一个文件，说明解析文件路径失败
          if (!stat.isFile()) {
            if (resolveContext.missing) resolveContext.missing.add(file);
            if (resolveContext.log) resolveContext.log(file + " is not a file");
            return callback();
          }
          // 的确是文件路径，将流程转向 existingFile
          resolver.doResolve(
            target,
            request,
            "existing file: " + file,
            resolveContext,
            callback
          );
        });
      });
  }
};
```
:::

如果走到了 FileExistsPlugin 内部，接近了解析路径工作的尾声，如果解析的请求路径是一个文件路径，会将流程推向 existingFile hook。

## resolver.hooks.existingFile

钩入 existingFile hook 的只有 NextPlugin。

### NextPlugin

:::details NextPlugin.js
```js
module.exports = class NextPlugin {
  constructor(source, target) {
    this.source = source; // existingFile
    this.target = target; // resolved
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target);
    // 流程推向 resolved hook
    resolver
      .getHook(this.source)
      .tapAsync("NextPlugin", (request, resolveContext, callback) => {
        resolver.doResolve(target, request, null, resolveContext, callback);
      });
  }
};
```
:::

走到这里，再继续往前就是 resolved hook，基本到了路径解析的尾声了。

## resolver.hooks.resolved

### RestrictionsPlugin

:::details 
```js RestrictionsPlugin.js
const slashCode = "/".charCodeAt(0);
const backslashCode = "\\".charCodeAt(0);

const isInside = (path, parent) => {
  if (!path.startsWith(parent)) return false;
  if (path.length === parent.length) return true;
  const charCode = path.charCodeAt(parent.length);
  return charCode === slashCode || charCode === backslashCode;
};

module.exports = class RestrictionsPlugin {
  constructor(source, restrictions) {
    this.source = source; // resolved
    this.restrictions = restrictions; // [string, RegExp]
  }

  apply(resolver) {
    resolver
      .getHook(this.source)
      .tapAsync("RestrictionsPlugin", (request, resolveContext, callback) => {
        if (typeof request.path === "string") {
          const path = request.path;

          for (let i = 0; i < this.restrictions.length; i++) {
            const rule = this.restrictions[i];
            // rule 为字符串
            if (typeof rule === "string") {
              // rule 包含 path
              if (!isInside(path, rule)) {
                if (resolveContext.log) {
                  resolveContext.log(
                    `${path} is not inside of the restriction ${rule}`
                  );
                }
                // 跳过后续的 tapAsyncCallback，也就是 ResultPlugin
                // 返回结果为 null，表示没有解析到路径
                return callback(null, null);
              }
            } else if (!rule.test(path)) { // path 没有命中当前正则
              if (resolveContext.log) {
                resolveContext.log(
                  `${path} doesn't match the restriction ${rule}`
                );
              }
              // 跳过后续的 tapAsyncCallback，也就是 ResultPlugin，并且返回结果为 null
              return callback(null, null);
            }
          }
        }
        // 进入下一个 tapAsyncCallback，也就是 ResultPlugin 内部
        callback();
      });
  }
};
```
:::

RestrictionsPlugin 用来校验请求是否符合 restrictions 规则，如果符合规则，就会走进 ResultPlugin，这个函数是 `resolver.resolve` 的出口，表示路径解析已经有了结果。

### ResultPlugin

:::details ResultPlugin.js
```js
module.exports = class ResultPlugin {
  constructor(source) {
    this.source = source;
  }

  apply(resolver) {
    this.source.tapAsync(
      "ResultPlugin",
      (request, resolverContext, callback) => {
        const obj = Object.assign({}, request);
        if (resolverContext.log)
          resolverContext.log("reporting result " + obj.path);
        // 调用 resolver.hooks.result，并且调用 callback 传入 obj，开始不断的解开“套娃”
        resolver.hooks.result.callAsync(obj, resolverContext, err => {
          if (err) return callback(err);
          callback(null, obj);
        });
      }
    );
  }
};
```
:::

ResultPlugin 表示路径已经解析出来了。

## 流程图

因为 resolver 的 hooks 非常多，而且 hooks 之间可能会来回穿梭，所以理解 Resolver 的最好方法就是画图。

<img :src="$withBase('/assets/resolverFactory.png')" />

上面**绿色线条**，代表在解析路径的时候，可能需要重新返回 resolve hook，发起新一轮的路径解析。

对于 request 是 module 类型，逻辑与一般的路径解析有点差别。

对于配置 resolveToContext 的路径，在 existingDirectory hook 的阶段就直接跳到 resolved hook，结束了路径的解析工作。