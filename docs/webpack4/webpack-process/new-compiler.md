# 处理 compiler

经过 [options 的处理](./handle-options.md)之后，接着开始实例化 Compiler。

## new Compiler

::: details webpack.js
```js
let compiler;
  if (Array.isArray(options)) {
    compiler = new MultiCompiler(
      Array.from(options).map(options => webpack(options))
    );
  } else if (typeof options === "object") {
    options = new WebpackOptionsDefaulter().process(options);

    compiler = new Compiler(options.context);
    compiler.options = options;
    // ... 先省略其他逻辑
  }
```
:::

webpack 支持传入一个数组来开启多个 compiler，不过暂时先看单个 compiler 的构建过程。

:::details Compiler.js
```js
class Compiler extends Tapable {
  constructor(context) {
    super();
    this.hooks = {
      shouldEmit: new SyncBailHook(["compilation"]),
      done: new AsyncSeriesHook(["stats"]),
      additionalPass: new AsyncSeriesHook([]),
      beforeRun: new AsyncSeriesHook(["compiler"]),
      run: new AsyncSeriesHook(["compiler"]),
      emit: new AsyncSeriesHook(["compilation"]),
      assetEmitted: new AsyncSeriesHook(["file", "content"]),
      afterEmit: new AsyncSeriesHook(["compilation"]),
      thisCompilation: new SyncHook(["compilation", "params"]),
      compilation: new SyncHook(["compilation", "params"]),
      normalModuleFactory: new SyncHook(["normalModuleFactory"]),
      contextModuleFactory: new SyncHook(["contextModulefactory"]),
      beforeCompile: new AsyncSeriesHook(["params"]),
      compile: new SyncHook(["params"]),
      make: new AsyncParallelHook(["compilation"]),
      afterCompile: new AsyncSeriesHook(["compilation"]),
      watchRun: new AsyncSeriesHook(["compiler"]),
      failed: new SyncHook(["error"]),
      invalid: new SyncHook(["filename", "changeTime"]),
      watchClose: new SyncHook([]),
      infrastructureLog: new SyncBailHook(["origin", "type", "args"]),
      environment: new SyncHook([]),
      afterEnvironment: new SyncHook([]),
      afterPlugins: new SyncHook(["compiler"]),
      afterResolvers: new SyncHook(["compiler"]),
      entryOption: new SyncBailHook(["context", "entry"])
    };
    this.hooks.infrastructurelog = this.hooks.infrastructureLog;

    // 兼容 webpack 3
    this._pluginCompat.tap("Compiler", options => {
      switch (options.name) {
        case "additional-pass":
        case "before-run":
        case "run":
        case "emit":
        case "after-emit":
        case "before-compile":
        case "make":
        case "after-compile":
        case "watch-run":
          options.async = true;
          break;
      }
    });

    this.name = undefined;
    this.parentCompilation = undefined;
    this.outputPath = "";

    this.outputFileSystem = null;
    this.inputFileSystem = null;

    this.recordsInputPath = null;
    this.recordsOutputPath = null;
    this.records = {};
    this.removedFiles = new Set();
    this.fileTimestamps = new Map();
    this.contextTimestamps = new Map();
    this.resolverFactory = new ResolverFactory();

    this.infrastructureLogger = undefined;

    // 兼容 webpack 3
    this.resolvers = {
      normal: {
        plugins: util.deprecate((hook, fn) => {
          this.resolverFactory.plugin("resolver normal", resolver => {
            resolver.plugin(hook, fn);
          });
        }, "webpack: Using compiler.resolvers.normal is deprecated.\n" + 'Use compiler.resolverFactory.plugin("resolver normal", resolver => {\n  resolver.plugin(/* … */);\n}); instead.'),
        apply: util.deprecate((...args) => {
          this.resolverFactory.plugin("resolver normal", resolver => {
            resolver.apply(...args);
          });
        }, "webpack: Using compiler.resolvers.normal is deprecated.\n" + 'Use compiler.resolverFactory.plugin("resolver normal", resolver => {\n  resolver.apply(/* … */);\n}); instead.')
      },
      loader: {
        plugins: util.deprecate((hook, fn) => {
          this.resolverFactory.plugin("resolver loader", resolver => {
            resolver.plugin(hook, fn);
          });
        }, "webpack: Using compiler.resolvers.loader is deprecated.\n" + 'Use compiler.resolverFactory.plugin("resolver loader", resolver => {\n  resolver.plugin(/* … */);\n}); instead.'),
        apply: util.deprecate((...args) => {
          this.resolverFactory.plugin("resolver loader", resolver => {
            resolver.apply(...args);
          });
        }, "webpack: Using compiler.resolvers.loader is deprecated.\n" + 'Use compiler.resolverFactory.plugin("resolver loader", resolver => {\n  resolver.apply(/* … */);\n}); instead.')
      },
      context: {
        plugins: util.deprecate((hook, fn) => {
          this.resolverFactory.plugin("resolver context", resolver => {
            resolver.plugin(hook, fn);
          });
        }, "webpack: Using compiler.resolvers.context is deprecated.\n" + 'Use compiler.resolverFactory.plugin("resolver context", resolver => {\n  resolver.plugin(/* … */);\n}); instead.'),
        apply: util.deprecate((...args) => {
          this.resolverFactory.plugin("resolver context", resolver => {
            resolver.apply(...args);
          });
        }, "webpack: Using compiler.resolvers.context is deprecated.\n" + 'Use compiler.resolverFactory.plugin("resolver context", resolver => {\n  resolver.apply(/* … */);\n}); instead.')
      }
    };

    this.options = ({});

    this.context = context;

    this.requestShortener = new RequestShortener(context);
    this.running = false;
    this.watchMode = false;
    this._assetEmittingSourceCache = new WeakMap();
    this._assetEmittingWrittenFiles = new Map();
  }
}
```
:::

// TODO 补一篇 Tapable 的文章分析

Compiler 继承 Tapable 类，上面放了许多 hooks，不过先不要陷入进去，要不然容易头晕，实例化 Compiler 的时候传入了 `context`，它代表 Compiler 的工作路径，默认为**运行 wenpack 命令所在的路径**，用户也可以手动指定，这个路径**非常关键**，后期经常使用。

## 调用 userPlugins, innerPlugins

接着开始启动 Compiler，先执行用户传入的 plugins，再执行 webpack 内部的 plugins。这个顺序也很重要，**可能影响 webpack 某些插件的逻辑**，这个跟 Tapable Hooks 的种类有关系。

::: details webpack.js
```js
// ... 省略其他
new NodeEnvironmentPlugin({
  infrastructureLogging: options.infrastructureLogging
}).apply(compiler);
// 先执行 options.plugins
if (options.plugins && Array.isArray(options.plugins)) {
  for (const plugin of options.plugins) {
    if (typeof plugin === "function") {
      plugin.call(compiler, compiler);
    } else {
      plugin.apply(compiler);
    }
  }
}

compiler.hooks.environment.call();
// WatchIgnorePlugin 使用了 afterEnvironment hook
compiler.hooks.afterEnvironment.call();
// 接着执行 webpack 内部的 plugins
compiler.options = new WebpackOptionsApply().process(options, compiler);
```
:::

先看下 `NodeEnvironmentPlugin` 的功能，主要是给 compiler 赋能一些 Node 有关的能力，

```js
class NodeEnvironmentPlugin {
  constructor(options) {
    this.options = options || {};
  }

  apply(compiler) {
    // 创建 infrastructureLogger
    compiler.infrastructureLogger = createConsoleLogger(
      Object.assign(
        {
          level: "info",
          debug: false,
          console: nodeConsole
        },
        this.options.infrastructureLogging
      )
    );
    // 提供关于文件系统的实例
    compiler.inputFileSystem = new CachedInputFileSystem(
      new NodeJsInputFileSystem(),
      60000
    );
    const inputFileSystem = compiler.inputFileSystem;
    compiler.outputFileSystem = new NodeOutputFileSystem();
    compiler.watchFileSystem = new NodeWatchFileSystem(
      compiler.inputFileSystem
    );
    // watch 模式下，每次重新构建都销毁 inputFileSystem 内部的数据
    compiler.hooks.beforeRun.tap("NodeEnvironmentPlugin", compiler => {
      if (compiler.inputFileSystem === inputFileSystem) inputFileSystem.purge();
    });
  }
}
```

想要了解 `compiler.infrastructureLogger` 的细节，可以看 [infrastructureLogging 配置项](../configuration/infrastructureLogging.md) 这篇文章。

// TODO webpack FileSystem 分析

接下来执行用户传入的 plugins，关于 plugin 的详细介绍可以看[这篇](../configuration/plugins/startup.md)，再接着走进 wepack 处理 [inner-plugins](./inner-plugins.md) 的逻辑，webpack 内部的插件非常多，不同的 target，不同的 mode 使用的插件也不尽相同。