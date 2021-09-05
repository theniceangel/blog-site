# 编译之前

编译的入口就是从 `beforeRun` hook。

```js
class Compiler extends Tapable {
  run(callback) {
    // ...省略其他代码
    this.hooks.beforeRun.callAsync(this, err => {
      // 如果 beforeRun 出现错误，直接退出 webpack 构建
      if (err) return finalCallback(err);

      this.hooks.run.callAsync(this, err => {
        // 如果 run 出现错误，直接退出 webpack 构建
        if (err) return finalCallback(err);

        this.readRecords(err => {
          if (err) return finalCallback(err);

          this.compile(onCompiled);
        });
      });
    });
  }
}
```

## beforeRun hook

beforeRun hook 是 AsyncSeriesHook 类型，钩入这个 hook 的插件有 NodeEnvironmentPlugin。

:::details lib/node/NodeEnvironmentPlugin.js
```js
class NodeEnvironmentPlugin {
  apply(compiler) {
    // ... 省略其他代码
    const inputFileSystem = compiler.inputFileSystem;
    compiler.hooks.beforeRun.tap("NodeEnvironmentPlugin", compiler => {
      // 如果前后两次构建用的是同一个 inputFileSystem，先销毁之前内存的数据
      // 一般在 watch 模式才会触发
      if (compiler.inputFileSystem === inputFileSystem) inputFileSystem.purge();
    });
  }
}
```
:::

## run hook

run hook 是 AsyncSeriesHook 类型，钩入这个 hook 的插件有 webpack-cli npm 包下面的 CLIPlugin，如果不是用 webpack 命令行工具就不会有这个插件，只不过我的 demo 是通过 webpack 命令行工具打包的。

:::details webpack-cli/lib/plugins/CLIPlugin.js
```js
class CLIPlugin {
  setupHelpfulOutput () {
    compiler.hooks.run.tap(pluginName, () => {
      // 获取 compiler 的 name
      const name = getCompilationName();

      logCompilation(`Compiler${name ? ` ${name}` : ""} starting... `);
      // 打印所用的 webpack.config.js 的路径
      if (configPath) {
        this.logger.log(
            `Compiler${name ? ` ${name}` : ""} is using config: '${configPath}'`,
        );
      }
    });
  }
}
```
:::

CLIPlugin 是为了在命令行打印一些日志给开发者，不过这些日志能否被开发者看到，取决于 webpack 中的 [infrastructureLogging 配置](../configuration/infrastructureLogging.md)。

## compiler.readRecords

```js
class Compiler extends Tapable {
  // 如果没有相关配置，直接执行 callback
  readRecords (callback) {
    if (!this.recordsInputPath) {
      this.records = {};
      return callback();
    }
  }
}
```

绝大部分情况都是直接走 callback，只有存在 `recordsPath、recordsInputPath、recordsOutputPath` 等配置的时候，才会走到这个逻辑，它们的作用，请看[这篇分析](../configuration/recordsPath&recordsInputPath&recordsOutputPath.md)。

最后调用 `this.compile` 接收 onCompiled 函数作为参数。