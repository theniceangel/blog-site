# childCompiler

childCompiler 并不是一个真正存在的类，它是 Compiler 的另一种形态。因为 Compiler 提供了一个 API 来生成 childCompiler。

```js
class Compiler extends Tapable {
  runAsChild(callback) {
    this.compile((err, compilation) => {
      if (err) return callback(err);

      this.parentCompilation.children.push(compilation);
      for (const { name, source, info } of compilation.getAssets()) {
        this.parentCompilation.emitAsset(name, source, info);
      }

      const entries = Array.from(
        compilation.entrypoints.values(),
        ep => ep.chunks
      ).reduce((array, chunks) => {
        return array.concat(chunks);
      }, []);

      return callback(null, entries, compilation);
    });
  }

  createChildCompiler(
    compilation,
    compilerName,
    compilerIndex,
    outputOptions,
    plugins
  ) {
    const childCompiler = new Compiler(this.context);
    if (Array.isArray(plugins)) {
      for (const plugin of plugins) {
        plugin.apply(childCompiler);
      }
    }
    // 如果黑名单的 hooks，不需要复刻至 childCompiler 上
    for (const name in this.hooks) {
      if (
        ![
          "make",
          "compile",
          "emit",
          "afterEmit",
          "invalid",
          "done",
          "thisCompilation"
        ].includes(name)
      ) {
        if (childCompiler.hooks[name]) {
          childCompiler.hooks[name].taps = this.hooks[name].taps.slice();
        }
      }
    }
    childCompiler.name = compilerName;
    childCompiler.outputPath = this.outputPath;
    childCompiler.inputFileSystem = this.inputFileSystem;
    childCompiler.outputFileSystem = null;
    childCompiler.resolverFactory = this.resolverFactory;
    childCompiler.fileTimestamps = this.fileTimestamps;
    childCompiler.contextTimestamps = this.contextTimestamps;

    const relativeCompilerName = makePathsRelative(this.context, compilerName);
    if (!this.records[relativeCompilerName]) {
      this.records[relativeCompilerName] = [];
    }
    if (this.records[relativeCompilerName][compilerIndex]) {
      childCompiler.records = this.records[relativeCompilerName][compilerIndex];
    } else {
      this.records[relativeCompilerName].push((childCompiler.records = {}));
    }

    childCompiler.options = Object.create(this.options);
    childCompiler.options.output = Object.create(childCompiler.options.output);
    for (const name in outputOptions) {
      childCompiler.options.output[name] = outputOptions[name];
    }
    childCompiler.parentCompilation = compilation;

    compilation.hooks.childCompiler.call(
      childCompiler,
      compilerName,
      compilerIndex
    );

    return childCompiler;
  }
}
```

childCompiler 生成的时候会复刻 parentCompiler 上所有 hooks，当然会排除黑名单的一些 hooks，比如 `['make', 'compile', 'emit', 'afterEmit', 'invalid', 'done', 'thisCompilation']` 运行的时候必须调用 `runAsChild`，而不是调用 `run` 来进行构建。