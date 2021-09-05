# 编译进行时

## compiler.compile(onCompiled)

```js
class Compiler extends Tapable {
  compile(callback) {
    // 第一步
    const params = this.newCompilationParams();
    // 第二步
    this.hooks.beforeCompile.callAsync(params, err => {
      if (err) return callback(err);

      this.hooks.compile.call(params);

      // 第三步
      const compilation = this.newCompilation(params);
      // 第四步
      this.hooks.make.callAsync(compilation, err => {
        if (err) return callback(err);
        // 第五步：TODO
        compilation.finish(err => {
          if (err) return callback(err);

          compilation.seal(err => {
            if (err) return callback(err);

            this.hooks.afterCompile.callAsync(compilation, err => {
              if (err) return callback(err);

              return callback(null, compilation);
            });
          });
        });
      });
    });
  }
}
```

第一步调用 `this.newCompilationParams` 生成 normalModuleFactory、contextModuleFactory 实例。

## this.newCompilationParams()

```js
class Compiler extends Tapable {
  newCompilationParams() {
    const params = {
      normalModuleFactory: this.createNormalModuleFactory(),
      contextModuleFactory: this.createContextModuleFactory(),
      compilationDependencies: new Set() // TODO
    };
    return params;
  }
}
```

- **`createNormalModuleFactory`**

  ```js
  class Compiler extends Tapable {
    createNormalModuleFactory() {
      const normalModuleFactory = new NormalModuleFactory(
        this.options.context, // 运行 webpack 构建的上下文路径
        this.resolverFactory, // ResolverFactory 实例
        this.options.module || {} // webpack 关于 module 的配置
      );
      // 触发 normalModuleFactory hook
      this.hooks.normalModuleFactory.call(normalModuleFactory);
      return normalModuleFactory;
    }
  }
  ```

  normalModuleFactory 在 webpack 的一次构建中扮演着特别重要的角色，它是一个工厂实例，作用是为了生成 normalModule，在 webpack 的生态里面，绝大部分的模块都是 normalModule。

- **`createContextModuleFactory`**

  ```js
  class Compiler extends Tapable {
    createContextModuleFactory() {
      const contextModuleFactory = new ContextModuleFactory(this.resolverFactory);
      // 触发 contextModuleFactory hook
      this.hooks.contextModuleFactory.call(contextModuleFactory);
      return contextModuleFactory;
    }
  }
  ```

  contextModuleFactory 在 webpack 的一次构建中扮演着特别重要的角色，它是一个工厂函数，生成的 module 都是 contextModule。

  // TODO ContextModule 的详解。


第一步生成的 params 在后面生成 compilation 的时候会用到，第二步执行 beforeCompile 与 compile hook。

## beforeCompile hook 与 compile hook

beforeCompile hook 是 AsyncSeriesHook 类型。暂未发现有插件钩入这个 hook，这个 hook 的入参就是第一步生成的 `params`。

compile hook 是 SyncHook 类型。暂未发现有插件钩入这个 hook，这个 hook 的入参也是第一步生成的 `params`。

接着就是第三步——**生成 compilation**。

## this.newCompilation(params)

```js
class Compiler extends Tapable {
  createCompilation() {
    return new Compilation(this);
  }

  newCompilation(params) {
    // 生成 compilation
    const compilation = this.createCompilation();
    // 文件的时间戳
    compilation.fileTimestamps = this.fileTimestamps;
    // TODO
    compilation.contextTimestamps = this.contextTimestamps;
    // compiler 的名称
    compilation.name = this.name;
    // 将 compiler的 records 赋值给 compilation
    compilation.records = this.records;
    compilation.compilationDependencies = params.compilationDependencies;
    // 触发 thisCompilation hook
    this.hooks.thisCompilation.call(compilation, params);
    // 触发 compilation hook
    this.hooks.compilation.call(compilation, params);
    return compilation;
  }
}
```

**compilation 代表一次构建，而 compiler 可以通过接口多次调用 compile 来生成多个 compilation 实例，在 watch 模式下，每次修改文件都会重复构建。**

- **`1. hooks.thisCompilation`**

钩入这个 hook 的插件有 [JsonpTemplatePlugin](../internal-plugins/jsonpChunkTemplate/JsonpTemplatePlugin.md)，FetchCompileWasmTemplatePlugin(略过)，[WarnNoModeSetPlugin](../configuration/mode.md)，[SplitChunksPlugin](../configuration/optimization/splitChunks.md)

- **`2. hooks.compilation`**

  钩入这个 hook 的插件非常非常多。下面娓娓道来。

  - **FunctionModulePlugin**

    详细的请👇[FunctionModulePlugin](../internal-plugins/FunctionModulePlugin.md)

  - **LoaderTargetPlugin**

    详细的请👇[LoaderTargetPlugin](../internal-plugins/LoaderTargetPlugin.md)

  - **JavascriptModulesPlugin**

    详细的请👇[JavascriptModulesPlugin](../internal-plugins/JavascriptModulesPlugin.md)

  - **JsonModulesPlugin**

    详细的请👇[JsonModulesPlugin](../internal-plugins/JsonModulesPlugin.md)

  - **WebAssemblyModulesPlugin**

    略过。

  - **SingleEntryPlugin**

    详细的请👇[SingleEntryPlugin](../internal-plugins/entry/SingleEntryPlugin.md)

  - **CompatibilityPlugin**

    详细的请👇[CompatibilityPlugin](../internal-plugins/CompatibilityPlugin.md)

  - **HarmonyModulesPlugin**

    详细的请👇[HarmonyModulesPlugin](../internal-plugins/HarmonyModulesPlugin.md)

  - **AMDPlugin**

    详细的请👇[AMDPlugin](../internal-plugins/AMDPlugin.md)

  - **RequireJsStuffPlugin**

    详细的请👇[RequireJsStuffPlugin](../internal-plugins/RequireJsStuffPlugin.md)

  - **CommonJsPlugin**

    详细的请👇[CommonJsPlugin](../internal-plugins/CommonJsPlugin.md)

  - **LoaderPlugin**

    详细的请👇[LoaderPlugin](../internal-plugins/LoaderPlugin.md)

  - **CommonJsStuffPlugin**

    详细的请👇[CommonJsStuffPlugin](../internal-plugins/CommonJsStuffPlugin.md)

  - **APIPlugin**

    详细的请👇[APIPlugin](../internal-plugins/APIPlugin.md)

  - **ConstPlugin**

    详细的请👇[ConstPlugin](../internal-plugins/ConstPlugin.md)

  - **UseStrictPlugin**

    详细的请👇[UseStrictPlugin](../internal-plugins/UseStrictPlugin.md)

  - **RequireIncludePlugin**

    详细的请👇[RequireIncludePlugin](../internal-plugins/RequireIncludePlugin.md)

  - **RequireEnsurePlugin**

    详细的请👇[RequireEnsurePlugin](../internal-plugins/RequireEnsurePlugin.md)

  - **RequireContextPlugin**

    详细的请👇[RequireContextPlugin](../internal-plugins/RequireContextPlugin.md)

  - **ImportPlugin**

    详细的请👇[ImportPlugin](../internal-plugins/ImportPlugin.md)

  - **SystemPlugin**

    详细的请👇[SystemPlugin](../internal-plugins/SystemPlugin.md)

  - **EnsureChunkConditionsPlugin**

    详细的请👇[EnsureChunkConditionsPlugin](../internal-plugins/EnsureChunkConditionsPlugin.md)

  - **RemoveParentModulesPlugin**

    详细的请👇[RemoveParentModulesPlugin](../configuration/optimization/removeAvailableModules.md)

  - **RemoveEmptyChunksPlugin**

    详细的请👇[RemoveEmptyChunksPlugin](../configuration/optimization/removeEmptyChunks.md)

  - **MergeDuplicateChunksPlugin**

    详细的请👇[MergeDuplicateChunksPlugin](../configuration/optimization/mergeDuplicateChunks.md)

  - **FlagIncludedChunksPlugin**

    详细的请👇[FlagIncludedChunksPlugin](../configuration/optimization/flagIncludedChunks.md)

  - **SideEffectsFlagPlugin**

    详细的请👇[SideEffectsFlagPlugin](../internal-plugins/SideEffectsFlagPlugin.md)

  - **FlagDependencyExportsPlugin**

    详细的请👇[FlagDependencyExportsPlugin](../internal-plugins/FlagDependencyExportsPlugin.md)

  - **FlagDependencyUsagePlugin**

    详细的请👇[FlagDependencyUsagePlugin](../internal-plugins/FlagDependencyUsagePlugin.md)

  - **ModuleConcatenationPlugin**

    详细的请👇[ModuleConcatenationPlugin](../internal-plugins/ModuleConcatenationPlugin.md)

  - **NoEmitOnErrorsPlugin**

    详细的请👇[NoEmitOnErrorsPlugin](../configuration/optimization/noEmitOnErrors.md)

  - **WasmFinalizeExportsPlugin**

    略过。

  - **OccurrenceOrderModuleIdsPlugin**

    详细的请👇[OccurrenceOrderModuleIdsPlugin](../configuration/optimization/namedModules&moduleIds&occurrenceOrder&hashedModuleIds.md)

  - **OccurrenceOrderChunkIdsPlugin**

    详细的请👇[OccurrenceOrderChunkIdsPlugin](../configuration/optimization/namedChunks&chunkIds&occurrenceOrder.md)

  - **DefinePlugin**

    详细的请👇[DefinePlugin](../internal-plugins/DefinePlugin.md)

  - **TemplatedPathPlugin**

    详细的请👇[TemplatedPathPlugin](./TemplatedPathPlugin.md)

  - **RecordIdsPlugin**

    详细的请👇[RecordIdsPlugin](../configuration/recordsPath&recordsInputPath&recordsOutputPath.md)

  - **WarnCaseSensitiveModulesPlugin**

    详细的请👇[WarnCaseSensitiveModulesPlugin](./WarnCaseSensitiveModulesPlugin.md)

**为什么要有 thisCompilation 与 compilation hook 呢，看起来合并成一个 hook 也不是不可以啊？**

在绝大多数情况下肯定是可以的，但是 webpack 的 Compiler 还有另外一种形态，那就是 [childCompiler](../internal-class/childCompiler.md)。childCompiler 不会复制 parentCompiler 上的 thisCompilation hook，也就是不会执行上述的 JsonpTemplatePlugin 等等插件。

第四步就是触发 make hook，这个 hook 代表构建过程从 entry 配置的文件开始，按照**深度遍历**的顺序逐个解析出所有模块。整个流程的分析可以查询 [模块解析](./compiling-modules.md)这一章节。