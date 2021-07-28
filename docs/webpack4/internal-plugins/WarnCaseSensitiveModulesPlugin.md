# WarnCaseSensitiveModulesPlugin

::: details lib/WarnCaseSensitiveModulesPlugin.js
```js
class CaseSensitiveModulesWarning extends WebpackError {
  constructor(modules) {
    const sortedModules = sortModules(modules);
    const modulesList = createModulesListMessage(sortedModules);
    super(`There are multiple modules with names that only differ in casing.
This can lead to unexpected behavior when compiling on a filesystem with other case-semantic.
Use equal casing. Compare these module identifiers:
${modulesList}`);

    this.name = "CaseSensitiveModulesWarning";
    this.origin = this.module = sortedModules[0];

    Error.captureStackTrace(this, this.constructor);
  }
}

class WarnCaseSensitiveModulesPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap(
      "WarnCaseSensitiveModulesPlugin",
      compilation => {
        compilation.hooks.seal.tap("WarnCaseSensitiveModulesPlugin", () => {
          const moduleWithoutCase = new Map();
          // 遍历所有 module
          for (const module of compilation.modules) {
            // 将所有 modules 的 request 全部转成小写
            const identifier = module.identifier().toLowerCase();
            const array = moduleWithoutCase.get(identifier);
            // 对 modules 进行分组
            if (array) {
              array.push(module);
            } else {
              moduleWithoutCase.set(identifier, [module]);
            }
          }
          // 找出所有路径大小写可能存在冲突的模块
          for (const pair of moduleWithoutCase) {
            const array = pair[1];
            if (array.length > 1) {
              compilation.warnings.push(new CaseSensitiveModulesWarning(array));
            }
          }
        });
      }
    );
  }
}
```
:::

seal hook 的触发时机是在调用 `compilation.seal` 的时候，这个时候所有的 modules 都已经生成完成了。如果找到可能路径出现大小写冲突的模块，直接往 `compilation.warnings` 放置 CaseSensitiveModulesWarning，最后在编译结束之后会在命令行打印出来。

这个插件是为了提示不同 filesystem 对文件的大小写不敏感，会造成模块解析错误的问题，详细的可以看 [issue](https://github.com/webpack/webpack/issues/6175)。