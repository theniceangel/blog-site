# SingleEntryPlugin

SingleEntryPlugin 是在 webpack 经常使用到的插件，因为对于单页应用来说，入口只有一个文件。

:::details lib/SingleEntryPlugin.js
```js
class SingleEntryPlugin {
  constructor(context, entry, name) {
    this.context = context;
    this.entry = entry;
    this.name = name;
  }
  apply(compiler) {
    compiler.hooks.compilation.tap(
      "SingleEntryPlugin",
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(
          SingleEntryDependency,
          normalModuleFactory
        );
      }
    );

    compiler.hooks.make.tapAsync(
      "SingleEntryPlugin",
      (compilation, callback) => {
        const { entry, name, context } = this;

        const dep = SingleEntryPlugin.createDependency(entry, name);
        compilation.addEntry(context, dep, name, callback);
      }
    );
  }

  static createDependency(entry, name) {
    const dep = new SingleEntryDependency(entry);
    dep.loc = { name };
    return dep;
  }
}
```
:::

## compiler.hooks.make

SingleEntryPlugin 钩入了 compiler 的 make hook，它会调用 `SingleEntryPlugin.createDependency` 来生成 SingleEntryDependency，最后调用 compilation.addEntry 来添加入口模块。

## compiler.hooks.compilation

compilation.dependencyFactories 存放 SingleEntryDependency 与 normalModuleFactory 关系映射。什么是 [Dependency](../../term/dependency&moduleFactory.md)，可以点进去看看。