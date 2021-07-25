# 处理 options

webpack 的 options 非常多，因为它支持的功能太多了，不过对 options 做的好的地方是对他们进行了归类，比如 `output`、`optimization`、`module` 等等，webpack 内部还有 json schema 用来校验用户传入的配置项是否符合规范，如果不传入 options，webpack 内部会有 default options。

## validate userOptions

webpack 校验 userOptions 的逻辑是在 `webpack.js` 的 validateSchema 函数里面，它使用的是 [ajv](https://github.com/ajv-validator/ajv) 来验证 userOptions 是否 ok。options 的 schema 描述文件就是 `schemas/WebpackOptions.json`。

```js
const validateSchema = (schema, options) => {
  if (Array.isArray(options)) {
    const errors = options.map(options => validateObject(schema, options));
    errors.forEach((list, idx) => {
      const applyPrefix = err => {
        err.dataPath = `[${idx}]${err.dataPath}`;
        if (err.children) {
          err.children.forEach(applyPrefix);
        }
      };
      list.forEach(applyPrefix);
    });
    return errors.reduce((arr, items) => {
      return arr.concat(items);
    }, []);
  } else {
    return validateObject(schema, options);
  }
};
```

## default options

在 `WebpackOptionsDefaulter.js` 中可以找到所有默认选项：

:::details WebpackOptionsDefaulter.js
```js
class WebpackOptionsDefaulter extends OptionsDefaulter {
  constructor() {
    super();

    this.set("entry", "./src");

    this.set("devtool", "make", options => /* ... */);
    this.set("cache", "make", options => /* ... */);

    this.set("context", process.cwd());
    this.set("target", "web");

    this.set("module", "call", value => /* ... */);
    this.set("module.unknownContextRequest", ".");
    this.set("module.unknownContextRegExp", false);
    this.set("module.unknownContextRecursive", true);
    this.set("module.unknownContextCritical", true);
    this.set("module.exprContextRequest", ".");
    this.set("module.exprContextRegExp", false);
    this.set("module.exprContextRecursive", true);
    this.set("module.exprContextCritical", true);
    this.set("module.wrappedContextRegExp", /.*/);
    this.set("module.wrappedContextRecursive", true);
    this.set("module.wrappedContextCritical", false);
    this.set("module.strictExportPresence", false);
    this.set("module.strictThisContextOnImports", false);
    this.set("module.unsafeCache", "make", options => /* ... */);
    this.set("module.rules", []);
    this.set("module.defaultRules", "make", options => /* ... */);

    this.set("output", "call", (value, options) => /* ... */);

    this.set("output.filename", "[name].js");
    this.set("output.chunkFilename", "make", options => /* ... */);
    this.set("output.webassemblyModuleFilename", "[modulehash].module.wasm");
    this.set("output.library", "");
    this.set("output.hotUpdateFunction", "make", options => /* ... */);
    this.set("output.jsonpFunction", "make", options => /* ... */);
    this.set("output.chunkCallbackName", "make", options => /* ... */);
    this.set("output.globalObject", "make", options => /* ... */);
    this.set("output.devtoolNamespace", "make", options => /* ... */);
    this.set("output.libraryTarget", "var");
    this.set("output.path", path.join(process.cwd(), "dist"));
    this.set(
      "output.pathinfo",
      "make",
      options => /* ... */
    );
    this.set("output.sourceMapFilename", "[file].map[query]");
    this.set("output.hotUpdateChunkFilename", "[id].[hash].hot-update.js");
    this.set("output.hotUpdateMainFilename", "[hash].hot-update.json");
    this.set("output.crossOriginLoading", false);
    this.set("output.jsonpScriptType", false);
    this.set("output.chunkLoadTimeout", 120000);
    this.set("output.hashFunction", "md4");
    this.set("output.hashDigest", "hex");
    this.set("output.hashDigestLength", 20);
    this.set("output.devtoolLineToLine", false);
    this.set("output.strictModuleExceptionHandling", false);

    this.set("node", "call", value => /* ... */);
    this.set("node.console", false);
    this.set("node.process", true);
    this.set("node.global", true);
    this.set("node.Buffer", true);
    this.set("node.setImmediate", true);
    this.set("node.__filename", "mock");
    this.set("node.__dirname", "mock");

    this.set("performance", "call", /* ... */);
    this.set("performance.maxAssetSize", 250000);
    this.set("performance.maxEntrypointSize", 250000);
    this.set("performance.hints", "make", options => /* ... */);

    this.set("optimization", "call", value => Object.assign({}, value));
    this.set(
      "optimization.removeAvailableModules",
      "make",
      options => /* ... */
    );
    this.set("optimization.removeEmptyChunks", true);
    this.set("optimization.mergeDuplicateChunks", true);
    this.set("optimization.flagIncludedChunks", "make", options => /* ... */);
    this.set("optimization.occurrenceOrder", "make", options => /* ... */);
    this.set("optimization.sideEffects", "make", options => /* ... */);
    this.set("optimization.providedExports", true);
    this.set("optimization.usedExports", "make", options => /* ... */);
    this.set("optimization.concatenateModules", "make", options => /* ... */);
    this.set("optimization.splitChunks", {});
    this.set("optimization.splitChunks.hidePathInfo", "make", options => /* ... */);
    this.set("optimization.splitChunks.chunks", "async");
    this.set("optimization.splitChunks.minSize", "make", options => /* ... */);
    this.set("optimization.splitChunks.minChunks", 1);
    this.set("optimization.splitChunks.maxAsyncRequests", "make", options => /* ... */);
    this.set("optimization.splitChunks.automaticNameDelimiter", "~");
    this.set("optimization.splitChunks.automaticNameMaxLength", 109);
    this.set("optimization.splitChunks.maxInitialRequests", "make", options => /* ... */;
    this.set("optimization.splitChunks.name", true);
    this.set("optimization.splitChunks.cacheGroups", {});
    this.set("optimization.splitChunks.cacheGroups.default", {
      automaticNamePrefix: "",
      reuseExistingChunk: true,
      minChunks: 2,
      priority: -20
    });
    this.set("optimization.splitChunks.cacheGroups.vendors", {
      automaticNamePrefix: "vendors",
      test: /[\\/]node_modules[\\/]/,
      priority: -10
    });
    this.set("optimization.runtimeChunk", "call", value => /* ... */);
    this.set("optimization.noEmitOnErrors", "make", options => /* ... */);
    this.set("optimization.checkWasmTypes", "make", options => /* ... */);
    this.set("optimization.mangleWasmImports", false);
    this.set(
      "optimization.namedModules",
      "make",
      options => /* ... */
    );
    this.set("optimization.hashedModuleIds", false);
    this.set(
      "optimization.namedChunks",
      "make",
      options => /* ... */
    );
    this.set(
      "optimization.portableRecords",
      "make",
      options => /* ... */);
    this.set("optimization.minimize", "make", options => /* ... */);
    this.set("optimization.minimizer", "make", options => /* ... */);
    this.set("optimization.nodeEnv", "make", options => /* ... */);

    this.set("resolve", "call", value => /* ... */);
    this.set("resolve.unsafeCache", true);
    this.set("resolve.modules", ["node_modules"]);
    this.set("resolve.extensions", [".wasm", ".mjs", ".js", ".json"]);
    this.set("resolve.mainFiles", ["index"]);
    this.set("resolve.aliasFields", "make", options => /* ... */);
    this.set("resolve.mainFields", "make", options => /* ... */);
    this.set("resolve.cacheWithContext", "make", options => /* ... */);
    this.set(
      "resolve.preferAbsolute",
      "make",
      options => /* ... */
    );
    this.set(
      "resolve.ignoreRootsErrors",
      "make",
      options => /* ... */
    );
    this.set("resolve.roots", "make", options => [options.context]);

    this.set("resolveLoader", "call", value => Object.assign({}, value));
    this.set("resolveLoader.unsafeCache", true);
    this.set("resolveLoader.mainFields", ["loader", "main"]);
    this.set("resolveLoader.extensions", [".js", ".json"]);
    this.set("resolveLoader.mainFiles", ["index"]);
    this.set("resolveLoader.cacheWithContext", "make", options => { /* ... */ });

    this.set("infrastructureLogging", "call", value => /* ... */);
    this.set("infrastructureLogging.level", "info");
    this.set("infrastructureLogging.debug", false);
  }
}
```
:::

省略了部分代码，所有的默认配置项都是通过调用 `set` 方法，它的第二个参数可能是 `'call'` 或者 `'make'`，这两个枚举值有什么作用呢，得继续看 `OptionsDefaulter.js`。代码如下：

:::details OptionsDefaulter.js
```js
class OptionsDefaulter {
  constructor() {
    this.defaults = {};
    this.config = {};
  }
  set(name, config, def) {
    // 如果 config 是  'make' | 'call'
    if (def !== undefined) {
      // 记录当前配置项的 def，可能是函数，也可能是其他值
      this.defaults[name] = def;
      // 记录当前配置项的类型
      this.config[name] = config;
    } else {
      this.defaults[name] = config;
      delete this.config[name];
    }
  }
}
```
:::

set 方法只是往 `config` 和 `defaults` 存储对应的相信，接下来就是调用 `webpackOptionsDefaulter.process(options)` 进行 userOptions 与 defaultOptions 合并的过程。下面来看下 process 的逻辑。

## process options

:::details OptionsDefaulter.js
```js
// 根据字符串路径获取嵌套的 value
const getProperty = (obj, path) => {
  let name = path.split(".");
  for (let i = 0; i < name.length - 1; i++) {
    obj = obj[name[i]];
    if (typeof obj !== "object" || !obj || Array.isArray(obj)) return;
  }
  return obj[name.pop()];
};

// 根据字符串路径设置嵌套的 value
const setProperty = (obj, path, value) => {
  let name = path.split(".");
  for (let i = 0; i < name.length - 1; i++) {
    if (typeof obj[name[i]] !== "object" && obj[name[i]] !== undefined) return;
    if (Array.isArray(obj[name[i]])) return;
    if (!obj[name[i]]) obj[name[i]] = {};
    obj = obj[name[i]];
  }
  obj[name.pop()] = value;
};

class OptionsDefaulter {
  process(options) {
    options = Object.assign({}, options);
    for (let name in this.defaults) {
      switch (this.config[name]) {
        case undefined:
          if (getProperty(options, name) === undefined) {
            setProperty(options, name, this.defaults[name]);
          }
          break;
        case "call":
          setProperty(
            options,
            name,
            this.defaults[name].call(this, getProperty(options, name), options)
          );
          break;
        case "make":
          if (getProperty(options, name) === undefined) {
            setProperty(options, name, this.defaults[name].call(this, options));
          }
          break;
        case "append": {
          let oldValue = getProperty(options, name);
          if (!Array.isArray(oldValue)) {
            oldValue = [];
          }
          oldValue.push(...this.defaults[name]);
          setProperty(options, name, oldValue);
          break;
        }
        default:
          throw new Error(
            "OptionsDefaulter cannot process " + this.config[name]
          );
      }
    }
    return options;
  }
}
```
:::

process 的处理过程中分为以下几种类型处理：

1. **undefined**

    ```js
    // 如果 userOptions 不存在这个配置项，用默认的
    case undefined:
      if (getProperty(options, name) === undefined) {
        setProperty(options, name, this.defaults[name]);
      }
      break;
    ```

2. **'call'**

    ```js
    // 取出调用 this.set(name, 'call', callHandler) 的 callHandler
    // 调用 callHandler 并且传入 userOptions 的配置项和 userOptions
    case "call":
      setProperty(
        options,
        name,
        this.defaults[name].call(this, getProperty(options, name), options)
      );
      break;
    ```

3. **'make'**

    ```js
    // 如果 userOptions 的配置项不存在，
    // 那么取出调用 this.set(name, 'make', makeHandler) 的 makeHandler
    // 调用 makeHandler 并且传入 userOptions
    case "make":
      if (getProperty(options, name) === undefined) {
        setProperty(options, name, this.defaults[name].call(this, options));
      }
      break;
    ```

4. **'append'**

    ```js
    // 将 userOptions 与 defaultOptions 的配置项合并到同一个数组
    case "append": {
      let oldValue = getProperty(options, name);
      if (!Array.isArray(oldValue)) {
        oldValue = [];
      }
      oldValue.push(...this.defaults[name]);
      setProperty(options, name, oldValue);
      break;
    }
    ```

    该配置项似乎在 `WebpackOptionsDefaulter.js` 中没有用过，不知道为啥？

经历过 process 处理得到的 options 会传给 Compiler 类，开始进入核心的流程。