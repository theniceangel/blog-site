# 运行 compiler

既然 userPlugins 以及 innerPlugins 都已经执行完毕，所有的逻辑通过 hooks 勾入到 webpack 内部的各个流程，现在要做的事情，就是启动 webpack 的编译流程，对于**生产环境**，它的入口就是 `compiler.run`，compiler 是由 webpack 函数返回的，而对于**开发环境**，一般是开启 watch 模式，调用 `compiler.watch`。先关注**生产环境**，**开发环境**大同小异。

```js
// lib/webpack.js
const webpack = (options, callback) => {
  // ... 省略其他逻辑

  if (callback) {
    if (typeof callback !== "function") {
      throw new Error("Invalid argument: callback");
    }
    // 一般在开发环境会在 webpack.config.js 配置 watch
    if (
      options.watch === true ||
      (Array.isArray(options) && options.some(o => o.watch))
    ) {
      const watchOptions = Array.isArray(options)
        ? options.map(o => o.watchOptions || {})
        : options.watchOptions || {};
      return compiler.watch(watchOptions, callback);
    }
    // 自动运行编译流程
    compiler.run(callback);
  }
  return compiler;
};

const webpack = require('webpack')
// 调用 webpack 的时候，一般传入 callback
webpack({/* webpack 配置 */}, (err, stats) => {
  // 构建完成
})
// 也可以不传入 callback，自己拿到 compiler 再决定调用时机
const compiler = webpack({/* webpack 配置 */})
compiler.run((err, stats) => {
  // 构建完成
})
```

## compiler.run()

```js
class Compiler extends Tapable {
  run(callback) {
    // 确保不能连续两次调用 run
    if (this.running) return callback(new ConcurrentCompilationError());

    // 第三步：编译结束的出口
    const finalCallback = (err, stats) => {
      this.running = false;

      if (err) {
        this.hooks.failed.call(err);
      }

      if (callback !== undefined) return callback(err, stats);
    };

    // 记录编译开始的时间
    const startTime = Date.now();

    this.running = true;

    // 第二步：编译可能已经完成，准备把产物写入磁盘
    const onCompiled = (err, compilation) => {
      if (err) return finalCallback(err);

      if (this.hooks.shouldEmit.call(compilation) === false) {
        const stats = new Stats(compilation);
        stats.startTime = startTime;
        stats.endTime = Date.now();
        this.hooks.done.callAsync(stats, err => {
          if (err) return finalCallback(err);
          return finalCallback(null, stats);
        });
        return;
      }

      this.emitAssets(compilation, err => {
        if (err) return finalCallback(err);

        if (compilation.hooks.needAdditionalPass.call()) {
          compilation.needAdditionalPass = true;

          const stats = new Stats(compilation);
          stats.startTime = startTime;
          stats.endTime = Date.now();
          this.hooks.done.callAsync(stats, err => {
            if (err) return finalCallback(err);

            this.hooks.additionalPass.callAsync(err => {
              if (err) return finalCallback(err);
              this.compile(onCompiled);
            });
          });
          return;
        }

        this.emitRecords(err => {
          if (err) return finalCallback(err);

          const stats = new Stats(compilation);
          stats.startTime = startTime;
          stats.endTime = Date.now();
          this.hooks.done.callAsync(stats, err => {
            if (err) return finalCallback(err);
            return finalCallback(null, stats);
          });
        });
      });
    };

    // 第一步：编译的入口
    this.hooks.beforeRun.callAsync(this, err => {
      // 发生错误，直接跳到编译的出口
      if (err) return finalCallback(err);

      this.hooks.run.callAsync(this, err => {
        // 发生错误，直接跳到编译的出口
        if (err) return finalCallback(err);

        this.readRecords(err => {
          // 发生错误，直接跳到编译的出口
          if (err) return finalCallback(err);
          // 开始编译
          this.compile(onCompiled);
        });
      });
    });
  }
}
```

compiler.run 分为以下三个步骤：

- **`1. 编译的入口`**

  目的是根据 webpack 配置的 entry 入口，解析所有的 modules，chunks 以及 chunkGroups，形成 dependenciesGraph，最后把生成的代码或者资源（字体，图片等等）放在内存，这个过程是最复杂、最核心的一步。

- **`2. 资源的写入`**

  将上一步内存中的数据都写入磁盘，生成对应的文件。

- **`3. 编译的出口`**

  所有的文件都已经输出至磁盘，调用开发者传入的 callback，并且将 stats 传入，stats 包含了**一次构建过程中所有有用的数据**，内部的结构非常复杂。

下一章就是 [编译的入口](./before-compile.md)。