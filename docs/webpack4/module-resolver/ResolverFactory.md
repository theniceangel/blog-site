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

    options 来源于 webpack config 的 resolve 配置 或者 resolverLoader 配置，主要是看生成的 resolver 到底是为了解析哪种类型的路径。

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

- **第二步：ensure 必备的 hooks**

- **第三步：准备好所有的 plugins，并逐一调用 apply**

最后就是返回 `resolver` 实例，想要启动真正的解析路径的过程，需要调用 `resolver.resolve` 方法的时机，是当 webpack 解析 normal module 的路径和 loader 模块路径。

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

Resolver 的 plugin 与 webpack 的 plugin 类似，都具有一定的范式，首先他得实现 apply 接口，接受的参数是 resolver 实例，并且钩入 `source hook`，而且通过 `resolver.doResolve` 方法将流程转交给 `target hook`，`resolver.doResolve` 内部会调用 `target hook` 的 callAsync 来逐步执行插件中 `tapAsync` 方法注入的函数。

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

`target` 以及 `source` hook 在 createResolver 已经枚举好了，它形成了一个 pipeline，从 `'resolve'` 钩子开始到 `'resolved'` 钩子结束，当然这个过程并不是一成不变的，对于 `describedResolve` hook，可能又会流转回 `'resolve'` 钩子，相当于开启一轮新的 resolve 过程，这种情况在引入一个 npm 包的时候会遇到，比如 `import vue from 'Vue'`。

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

下面来看看内置的 Plugins 到底做了哪些工作？

## UnsafeCachePlugin

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
        // 是否命中白名单，默认缓存所有请求
        if (!this.filterPredicate(request)) return callback();
        // 获取缓存 id
        const cacheId = getCacheId(request, this.withContext);
        const cacheEntry = this.cache[cacheId];
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

UnsafeCachePlugin 位于 resolve 流程的起点，这个插件是通过 `unsafeCache` 配置项来注入的，默认是**不使用该插件**，插件的作用是缓存以前解析过的请求，如果没有命中缓存，通过 `resolver.doResolve` 将流程推向 `'newResolve'` 钩子，触发这个钩子会走进 ParsePlugin 插件内部。**同时要注意 'UnsafeCachePlugin' 的 tap 回调函数的第三个参数 callback 被包裹进 resolver.doResolve 的最后一个匿名函数参数里面了，开始了漫长的套娃过程**。

> doResolve 的过程可以👇[这里](./Resolver.md)

## ParsePlugin

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

ParsePlugin 的作用是对模块的请求路径进行解析，并且把解析后的信息挂载到 obj 上，将流程推向 `'parsedResolve'` 钩子，也就会走到 DescriptionFilePlugin 和 NextPlugin 插件内部。

## DescriptionFilePlugin

:::details DescriptionFilePlugin.js
```js
module.exports = class DescriptionFilePlugin {
  constructor(source, filenames, target) {
    this.source = source;
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
              // 如果发生错误，走进 'parsedResolve' 钩子的下一个 tapAsync 钩子函数去
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
                // 遍历完用户的整个文件系统都没有找到 package.json， 走进 parsedResolve 钩子的下一个 tapAsync 钩子函数去
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
                  // 不用走到 parsedResolve 钩子的下一个 tapAsync 钩子函数里面去了。
                  if (result === undefined) return callback(null, null);
                  // 同样也是跳过 parsedResolve 的下一个 tapAsync 钩子函数
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

DescriptionFilePlugin 与 NextPlugin 都是钩入 parsedResolve 钩子，而且它属于 `AsyncSeriesBailHook` 类型，所以对于 DescriptionFilePlugin 下面这段代码，就会跳过 NextPlugin 的 tapAsync 回调函数。

```js
// 第二个参数 null，会导致 parsedResolve hook 跳过 NextPlugin 的处理
if (result === undefined) return callback(null, null);
callback(null, result);
```

## NextPlugin

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

NextPlugin 的作用很简单，在这里就是用来将流程推向 `'describedResolve'` 钩子，因为 DescriptionFilePlugin 没有找到 package.json，所以需要将流程继续进行下去，当然也可以在 DescriptionFilePlugin 直接调用 `resolver.doResolve` 来将流程主动推向 `'describedResolve'` 钩子，为什么没这么做呢，我猜测的原因应该是**单一职责性**，DescriptionFilePlugin 就是为了来找到 package.json 的，而且抽象出 NextPlugin 就是用来进行流程的衔接。

触发 `'describedResolve'` 钩子的 callAsync，根据不同的配置可能走进 AliasPlugin、ConcordModulesPlugin、AliasFieldPlugin、ModuleKindPlugin、JoinRequestPlugin、RootPlugin 插件内部。

## AliasPlugin

AliasPlugin 的启用必须在 webpack.config.js 配置了 `resolve.alias`。

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
                target,
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

AliasPlugin 的作用是用任意其他的模块替换原始的请求模块，这是一个非常有用的功能，比如：

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

从上面的代码可以看出，如果请求与 `resolve.alias` 命中了，就回到解析路径的起点——resolve 钩子进行新一轮的路径解析，因为请求路径已经被替换了，成功解析出路径之后就跳过 ConcordModulesPlugin、AliasFieldPlugin 等等插件的 tapAsync 函数，因为他们都是使用 `describedResolve` 钩子，如果没有命中，就执行 `callback` 函数，就进入 describedResolve 钩子的第二个 tapAsync 函数，也就是 ConcordModulesPlugin 插件。

## ConcordModulesPlugin

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
        // 如果没有配置，那么接着执行 describedResolve 下一个 tapAsync 函数
        if (data === innerRequest) return callback();
        if (data === undefined) return callback();
        // 中断 describedResolve 的 tapAsync 函数调用
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

ConcordModulesPlugin 内部存在调用以下的代码，代表跳过 describedResolve 后续所有的 tapAsync 函数，相当于跳过 AliasFieldPlugin，ModuleKindPlugin，JoinRequestPlugin，RootPlugin 等插件的逻辑。

```js
// 跳过 describedResolve 后续所有的 tapAsync 函数
return callback(null, ignoreObj);
// 跳过 describedResolve 后续所有的 tapAsync 函数
return callback(null, null);
// 跳过 describedResolve 后续所有的 tapAsync 函数
callback(null, result);
```

否则的话，调用 `callback()` 会将走到 describedResolve 的下一个 tapAsync 函数内部，也就是 AliasFieldPlugin 内部。

## AliasFieldPlugin

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

这样 ResolverFactory 就会找到对应的 `request.descriptionFile`，也就是**距离请求模块最近的 `package.json`**，里面的 `browser` 字段可以配置为**字符串**或者**对象**，具体的解释可以看[这篇文章](https://github.com/defunctzombie/package-browser-field-spec)，配置为对象的时候，才会交给 AliasFieldPlugin 处理，配置为字符串的时候，会丢给 MainFieldPlugin 处理，这个时候得搭配 webpack 的 `resolve.mainFields` 字段才行，下文会提及。

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
        debugger
        if (!request.descriptionFileData) return callback();
        const innerRequest = getInnerRequest(resolver, request);
        if (!innerRequest) return callback();
        const fieldData = DescriptionFileUtils.getField(
          request.descriptionFileData,
          this.field
        );
        // 如果值不是一个对象，接着执行 describedResolve 下一个 tapAsync 函数
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
        // 接着执行 describedResolve 下一个 tapAsync 函数
        if (data === innerRequest) return callback();
        if (data === undefined) return callback();
        // 如果配置的请求为 false，中断 describedResolve 的 tapAsync 函数调用
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
// 跳过 describedResolve 后续所有的 tapAsync 函数
return callback(null, ignoreObj);
// 跳过 describedResolve 后续所有的 tapAsync 函数
return callback(null, null);
// 跳过 describedResolve 后续所有的 tapAsync 函数
callback(null, result);
```

否则的话，调用 `callback()` 会将走到 describedResolve 的下一个 tapAsync 函数内部，也就是 ModuleKindPlugin 内部。

## ModuleKindPlugin

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

            // 跳过 describedResolve 后续所有的 tapAsync 函数
            if (result === undefined) return callback(null, null);
            callback(null, result);
          }
        );
      });
  }
};
```
:::

ModuleKindPlugin 内部存在调用以下的代码，代表跳过 describedResolve 后续所有的 tapAsync 函数，就会跳过 JoinRequestPlugin，RootPlugin 等插件的逻辑

```js
// 跳过 describedResolve 后续所有的 tapAsync 函数
return callback(null, null);
// 跳过 describedResolve 后续所有的 tapAsync 函数
callback(null, result);
```

如果不是一个 module 类型的请求，调用 `callback()` 会将走到 describedResolve 的下一个 tapAsync 函数内部，也就是 JoinRequestPlugin 内部。

## JoinRequestPlugin

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

JoinRequestPlugin 主要是为了拼接 path 和 request，用到的是 [resolver](./Resolver.md) 的 join 方法，并且这个阶段会把 `request` 置空，接着将流程推向 relative hook，如果 relative 的流程走完了，会执行上述的 `callback`，如果 callback 的入参为空，会走到 describedResolve 的下一个 tapAsync 函数内部，也就是 RootPlugin 内部。

## RootPlugin

:::details RootPlugin.js
```js
class RootPlugin {
  /**
   * @param {string | ResolveStepHook} source source hook
   * @param {Array<string>} root roots
   * @param {string | ResolveStepHook} target target hook
   * @param {boolean=} ignoreErrors ignore error during resolving of root paths
   */
  constructor(source, root, target, ignoreErrors) {
    this.root = root;
    this.source = source;
    this.target = target;
    this._ignoreErrors = ignoreErrors;
  }

  /**
   * @param {Resolver} resolver the resolver
   * @returns {void}
   */
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

RootPlugin 尝试在配置的 root 路径里面找到对应的 request，不过 request 必须是绝对路径的请求，接着将流程推向 relative hook，如果 relative 的流程走完了，会执行上述的 `callback`，如果 callback 的入参为空，会走到调用 describedResolve hook 的 callAsync 的第二个回调函数，这个时候就回退到 parsedResolve hook 的 callAsync 的第二个回调函数，不断地解开**套娃**，直到调用 `resolver.resolve` 的回调函数，代表所有的数据都解析完成。