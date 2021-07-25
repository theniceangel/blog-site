# 处理 innerPlugins

webpack 执行内部插件的时机是在 `webpack.js` 执行完 `afterEnvironment` hook 之后，调用 `webpackOptionsApply.process` 的时候。

:::details webpack.js
```js
// ... 省略其他
// WatchIgnorePlugin 使用了 afterEnvironment hook
compiler.hooks.afterEnvironment.call();
// 接着执行 webpack 内部的 plugins
compiler.options = new WebpackOptionsApply().process(options, compiler);
```
:::

## WebpackOptionsApply

```js
class WebpackOptionsApply extends OptionsApply {
  process(options, compiler) {
    // ... 根据 options 调用所有 innerPlugins
  }
}
```

process 是调用 webpack 内部插件的入口，利用 Tapable hooks 的能力“钩入” webpack 内部构建流程。

## apply innerPlugins

webpack 内部插件非常多，因为 webpack options 的配置项非常多，手动划分几个步骤，逐步研究：

### 第一步：compiler 准备工作

:::details
```js
let ExternalsPlugin;
// output.path 挂载到 compiler 上
compiler.outputPath = options.output.path;
// records 允许将每次打包的构建信息写入到磁盘
compiler.recordsInputPath = options.recordsInputPath || options.recordsPath;
compiler.recordsOutputPath = options.recordsOutputPath || options.recordsPath;
// compiler 可以配置名称，一般用于 webpack.config.js 返回数组配置对象
compiler.name = options.name;

compiler.dependencies = options.dependencies;
```
:::

### 第二步：options.target

因为 js 可以运行在浏览器，也能运行在服务端，webpack 支持多种类型的打包，这里先研究 `'web'`，也就是说产物运行在浏览器的环境下。

```js
let JsonpTemplatePlugin;
let FetchCompileWasmTemplatePlugin;
let NodeSourcePlugin;

switch (options.target) {
  case "web":
    JsonpTemplatePlugin = require("./web/JsonpTemplatePlugin");
    FetchCompileWasmTemplatePlugin = require("./web/FetchCompileWasmTemplatePlugin");
    NodeSourcePlugin = require("./node/NodeSourcePlugin");
    new JsonpTemplatePlugin().apply(compiler);
    new FetchCompileWasmTemplatePlugin({
      mangleImports: options.optimization.mangleWasmImports
    }).apply(compiler);
    new FunctionModulePlugin().apply(compiler);
    new NodeSourcePlugin(options.node).apply(compiler);
    new LoaderTargetPlugin(options.target).apply(compiler);
    break;
}
```

- **JsonpTemplatePlugin**

    插件位于 `lib/web/JsonpTemplatePlugin.js`，

    :::details JsonpTemplatePlugin.js
    ```js
    const JsonpMainTemplatePlugin = require("./JsonpMainTemplatePlugin");
    const JsonpChunkTemplatePlugin = require("./JsonpChunkTemplatePlugin");
    const JsonpHotUpdateChunkTemplatePlugin = require("./JsonpHotUpdateChunkTemplatePlugin");

    class JsonpTemplatePlugin {
      apply(compiler) {
        compiler.hooks.thisCompilation.tap("JsonpTemplatePlugin", compilation => {
          // 用于 runtime chunk 生成代码
          new JsonpMainTemplatePlugin().apply(compilation.mainTemplate);
          // 用于非 runtime chunk 生成代码
          new JsonpChunkTemplatePlugin().apply(compilation.chunkTemplate);
          // 用于开启 hmr
          new JsonpHotUpdateChunkTemplatePlugin().apply(
            compilation.hotUpdateChunkTemplate
          );
        });
      }
    }
    ```
    :::

    JsonpTemplatePlugin 只是对 `JsonpMainTemplatePlugin`、`JsonpChunkTemplatePlugin`、`JsonpHotUpdateChunkTemplatePlugin` 这三个插件进行了聚合。

    // TODO 应该有一篇文章分析这三个 plugin 的具体逻辑。

- **FetchCompileWasmTemplatePlugin**

    因为对 wasm 不了解，直接跳过。

- **FunctionModulePlugin**

    插件位于 `lib/FunctionModulePlugin.js`。

    :::details lib/FunctionModulePlugin.js
    ```js
    const FunctionModuleTemplatePlugin = require("./FunctionModuleTemplatePlugin");

    class FunctionModulePlugin {
      apply(compiler) {
        compiler.hooks.compilation.tap("FunctionModulePlugin", compilation => {
          new FunctionModuleTemplatePlugin().apply(
            compilation.moduleTemplates.javascript
          );
        });
      }
    }
    ```
    :::

    // TODO 应该有一篇文章分析 plugin 的具体逻辑。

- **NodeSourcePlugin**

    插件位于 `lib/node/NodeSourcePlugin.js`，主要是为了在浏览器侧为 node 的一些 API 添加 polyfill。

    详细的解读，请👇[node 配置项](../configuration/node/)。

- **LoaderTargetPlugin**

    插件位于 `lib/LoaderTargetPlugin.js`

    :::details lib/LoaderTargetPlugin.js
    ```js
    class LoaderTargetPlugin {
      constructor(target) {
        this.target = target;
      }

      apply(compiler) {
        compiler.hooks.compilation.tap("LoaderTargetPlugin", compilation => {
          compilation.hooks.normalModuleLoader.tap(
            "LoaderTargetPlugin",
            loaderContext => {
              loaderContext.target = this.target;
            }
          );
        });
      }
    }
    ```
    :::

    插件是为了给 loader 的上下文中加入当前打包的环境，像 vue-loader 就会利用该信息，判断当前打包的产物是用于 `ssr` 还是 `web`。

### 第三步：options.output.library 与 options.output.libraryTarget

```js
if (options.output.library || options.output.libraryTarget !== "var") {
  const LibraryTemplatePlugin = require("./LibraryTemplatePlugin");
  new LibraryTemplatePlugin(
    options.output.library,
    options.output.libraryTarget,
    options.output.umdNamedDefine,
    options.output.auxiliaryComment || "",
    options.output.libraryExport
  ).apply(compiler);
}
```

详细的分析，请👇[library&libraryTarget 配置项](../configuration/output/library&libraryTarget.md)。

### 第四步：options.externals

```js
if (options.externals) {
  ExternalsPlugin = require("./ExternalsPlugin");
  new ExternalsPlugin(
    options.output.libraryTarget,
    options.externals
  ).apply(compiler);
}
```

详细的分析，请👇[externals 配置项](../configuration/externals/)。

### 第五步：options.devtool

```js
let noSources;
let legacy;
let modern;
let comment;
if (
  options.devtool &&
  (options.devtool.includes("sourcemap") ||
    options.devtool.includes("source-map"))
) {
  const hidden = options.devtool.includes("hidden");
  const inline = options.devtool.includes("inline");
  const evalWrapped = options.devtool.includes("eval");
  const cheap = options.devtool.includes("cheap");
  const moduleMaps = options.devtool.includes("module");
  noSources = options.devtool.includes("nosources");
  legacy = options.devtool.includes("@");
  modern = options.devtool.includes("#");
  comment =
    legacy && modern
      ? "\n/*\n//@ source" +
        "MappingURL=[url]\n//# source" +
        "MappingURL=[url]\n*/"
      : legacy
      ? "\n/*\n//@ source" + "MappingURL=[url]\n*/"
      : modern
      ? "\n//# source" + "MappingURL=[url]"
      : null;
  const Plugin = evalWrapped
    ? EvalSourceMapDevToolPlugin
    : SourceMapDevToolPlugin;
  new Plugin({
    filename: inline ? null : options.output.sourceMapFilename,
    moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
    fallbackModuleFilenameTemplate:
      options.output.devtoolFallbackModuleFilenameTemplate,
    append: hidden ? false : comment,
    module: moduleMaps ? true : cheap ? false : true,
    columns: cheap ? false : true,
    lineToLine: options.output.devtoolLineToLine,
    noSources: noSources,
    namespace: options.output.devtoolNamespace
  }).apply(compiler);
} else if (options.devtool && options.devtool.includes("eval")) {
  legacy = options.devtool.includes("@");
  modern = options.devtool.includes("#");
  comment =
    legacy && modern
      ? "\n//@ sourceURL=[url]\n//# sourceURL=[url]"
      : legacy
      ? "\n//@ sourceURL=[url]"
      : modern
      ? "\n//# sourceURL=[url]"
      : null;
  new EvalDevToolModulePlugin({
    sourceUrlComment: comment,
    moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
    namespace: options.output.devtoolNamespace
  }).apply(compiler);
}
```

详细的分析，请👇[devtool 配置项](../configuration/devtool/)。

### 第六步：一些不受 options 控制的插件

```js
new JavascriptModulesPlugin().apply(compiler);
new JsonModulesPlugin().apply(compiler);
new WebAssemblyModulesPlugin({
  mangleImports: options.optimization.mangleWasmImports
}).apply(compiler);
// 解析 webpack 入口模块
new EntryOptionPlugin().apply(compiler);
compiler.hooks.entryOption.call(options.context, options.entry);
```

### 第七步：跟 JS 模块规范有关的插件

```js
new CompatibilityPlugin().apply(compiler);
new HarmonyModulesPlugin(options.module).apply(compiler);
if (options.amd !== false) {
  const AMDPlugin = require("./dependencies/AMDPlugin");
  const RequireJsStuffPlugin = require("./RequireJsStuffPlugin");
  new AMDPlugin(options.module, options.amd || {}).apply(compiler);
  new RequireJsStuffPlugin().apply(compiler);
}
new CommonJsPlugin(options.module).apply(compiler);
new LoaderPlugin().apply(compiler);
if (options.node !== false) {
  const NodeStuffPlugin = require("./NodeStuffPlugin");
  new NodeStuffPlugin(options.node).apply(compiler);
}
new CommonJsStuffPlugin().apply(compiler);
new APIPlugin().apply(compiler);
new ConstPlugin().apply(compiler);
new UseStrictPlugin().apply(compiler);
new RequireIncludePlugin().apply(compiler);
new RequireEnsurePlugin().apply(compiler);
new RequireContextPlugin(
  options.resolve.modules,
  options.resolve.extensions,
  options.resolve.mainFiles
).apply(compiler);
new ImportPlugin(options.module).apply(compiler);
new SystemPlugin(options.module).apply(compiler);
```

### 第八步：options.mode

```js
if (typeof options.mode !== "string") {
  const WarnNoModeSetPlugin = require("./WarnNoModeSetPlugin");
  new WarnNoModeSetPlugin().apply(compiler);
}
```

详细的分析，请👇[mode 配置项](../configuration/mode.md)。

### 第九步：options.optimization

```js
const EnsureChunkConditionsPlugin = require("./optimize/EnsureChunkConditionsPlugin");
new EnsureChunkConditionsPlugin().apply(compiler);
if (options.optimization.removeAvailableModules) {
  const RemoveParentModulesPlugin = require("./optimize/RemoveParentModulesPlugin");
  new RemoveParentModulesPlugin().apply(compiler);
}
if (options.optimization.removeEmptyChunks) {
  const RemoveEmptyChunksPlugin = require("./optimize/RemoveEmptyChunksPlugin");
  new RemoveEmptyChunksPlugin().apply(compiler);
}
if (options.optimization.mergeDuplicateChunks) {
  const MergeDuplicateChunksPlugin = require("./optimize/MergeDuplicateChunksPlugin");
  new MergeDuplicateChunksPlugin().apply(compiler);
}
if (options.optimization.flagIncludedChunks) {
  const FlagIncludedChunksPlugin = require("./optimize/FlagIncludedChunksPlugin");
  new FlagIncludedChunksPlugin().apply(compiler);
}
if (options.optimization.sideEffects) {
  const SideEffectsFlagPlugin = require("./optimize/SideEffectsFlagPlugin");
  new SideEffectsFlagPlugin().apply(compiler);
}
if (options.optimization.providedExports) {
  const FlagDependencyExportsPlugin = require("./FlagDependencyExportsPlugin");
  new FlagDependencyExportsPlugin().apply(compiler);
}
if (options.optimization.usedExports) {
  const FlagDependencyUsagePlugin = require("./FlagDependencyUsagePlugin");
  new FlagDependencyUsagePlugin().apply(compiler);
}
if (options.optimization.concatenateModules) {
  const ModuleConcatenationPlugin = require("./optimize/ModuleConcatenationPlugin");
  new ModuleConcatenationPlugin().apply(compiler);
}
if (options.optimization.splitChunks) {
  const SplitChunksPlugin = require("./optimize/SplitChunksPlugin");
  new SplitChunksPlugin(options.optimization.splitChunks).apply(compiler);
}
if (options.optimization.runtimeChunk) {
  const RuntimeChunkPlugin = require("./optimize/RuntimeChunkPlugin");
  new RuntimeChunkPlugin(options.optimization.runtimeChunk).apply(compiler);
}
if (options.optimization.noEmitOnErrors) {
  const NoEmitOnErrorsPlugin = require("./NoEmitOnErrorsPlugin");
  new NoEmitOnErrorsPlugin().apply(compiler);
}
if (options.optimization.checkWasmTypes) {
  const WasmFinalizeExportsPlugin = require("./wasm/WasmFinalizeExportsPlugin");
  new WasmFinalizeExportsPlugin().apply(compiler);
}
let moduleIds = options.optimization.moduleIds;
if (moduleIds === undefined) {
  // TODO webpack 5 remove all these options
  if (options.optimization.occurrenceOrder) {
    moduleIds = "size";
  }
  if (options.optimization.namedModules) {
    moduleIds = "named";
  }
  if (options.optimization.hashedModuleIds) {
    moduleIds = "hashed";
  }
  if (moduleIds === undefined) {
    moduleIds = "natural";
  }
}
if (moduleIds) {
  const NamedModulesPlugin = require("./NamedModulesPlugin");
  const HashedModuleIdsPlugin = require("./HashedModuleIdsPlugin");
  const OccurrenceModuleOrderPlugin = require("./optimize/OccurrenceModuleOrderPlugin");
  switch (moduleIds) {
    case "natural":
      break;
    case "named":
      new NamedModulesPlugin().apply(compiler);
      break;
    case "hashed":
      new HashedModuleIdsPlugin().apply(compiler);
      break;
    case "size":
      new OccurrenceModuleOrderPlugin({
        prioritiseInitial: true
      }).apply(compiler);
      break;
    case "total-size":
      new OccurrenceModuleOrderPlugin({
        prioritiseInitial: false
      }).apply(compiler);
      break;
    default:
      throw new Error(
        `webpack bug: moduleIds: ${moduleIds} is not implemented`
      );
  }
}
let chunkIds = options.optimization.chunkIds;
if (chunkIds === undefined) {
  if (options.optimization.occurrenceOrder) {
    chunkIds = "total-size";
  }
  if (options.optimization.namedChunks) {
    chunkIds = "named";
  }
  if (chunkIds === undefined) {
    chunkIds = "natural";
  }
}
if (chunkIds) {
  const NaturalChunkOrderPlugin = require("./optimize/NaturalChunkOrderPlugin");
  const NamedChunksPlugin = require("./NamedChunksPlugin");
  const OccurrenceChunkOrderPlugin = require("./optimize/OccurrenceChunkOrderPlugin");
  switch (chunkIds) {
    case "natural":
      new NaturalChunkOrderPlugin().apply(compiler);
      break;
    case "named":
      new OccurrenceChunkOrderPlugin({
        prioritiseInitial: false
      }).apply(compiler);
      new NamedChunksPlugin().apply(compiler);
      break;
    case "size":
      new OccurrenceChunkOrderPlugin({
        prioritiseInitial: true
      }).apply(compiler);
      break;
    case "total-size":
      new OccurrenceChunkOrderPlugin({
        prioritiseInitial: false
      }).apply(compiler);
      break;
    default:
      throw new Error(
        `webpack bug: chunkIds: ${chunkIds} is not implemented`
      );
  }
}
if (options.optimization.nodeEnv) {
  const DefinePlugin = require("./DefinePlugin");
  new DefinePlugin({
    "process.env.NODE_ENV": JSON.stringify(options.optimization.nodeEnv)
  }).apply(compiler);
}
if (options.optimization.minimize) {
  for (const minimizer of options.optimization.minimizer) {
    if (typeof minimizer === "function") {
      minimizer.call(compiler, compiler);
    } else {
      minimizer.apply(compiler);
    }
  }
}

new TemplatedPathPlugin().apply(compiler);

new RecordIdsPlugin({
  portableIds: options.optimization.portableRecords
}).apply(compiler);

new WarnCaseSensitiveModulesPlugin().apply(compiler);
```

### 第十步：options.performance

```js
if (options.performance) {
  const SizeLimitsPlugin = require("./performance/SizeLimitsPlugin");
  new SizeLimitsPlugin(options.performance).apply(compiler);
}
```

详细的分析，请👇[performance 配置项](../configuration/performance.md)。

## 最后一步

```js
compiler.hooks.afterPlugins.call(compiler);
if (!compiler.inputFileSystem) {
  throw new Error("No input filesystem provided");
}
compiler.resolverFactory.hooks.resolveOptions
  .for("normal")
  .tap("WebpackOptionsApply", resolveOptions => {
    return Object.assign(
      {
        fileSystem: compiler.inputFileSystem
      },
      cachedCleverMerge(options.resolve, resolveOptions)
    );
  });
compiler.resolverFactory.hooks.resolveOptions
  .for("context")
  .tap("WebpackOptionsApply", resolveOptions => {
    return Object.assign(
      {
        fileSystem: compiler.inputFileSystem,
        resolveToContext: true
      },
      cachedCleverMerge(options.resolve, resolveOptions)
    );
  });
compiler.resolverFactory.hooks.resolveOptions
  .for("loader")
  .tap("WebpackOptionsApply", resolveOptions => {
    return Object.assign(
      {
        fileSystem: compiler.inputFileSystem
      },
      cachedCleverMerge(options.resolveLoader, resolveOptions)
    );
  });
compiler.hooks.afterResolvers.call(compiler);
```

## 总结

综上可以看出 webpack 内置的插件非常非常多，不过对于我们这个例子，很多 options 没有命中，所以不会那么复杂，上面也有针对配置项级别的分析，可以让你更好的去理解 webpack。

在执行完 `webpackOptionsApply.process` 之后，所有的插件都已经利用 hooks 钩入了 webpack 构建流程当中，是时候启动 compiler 进行构建来激活所有插件的逻辑。