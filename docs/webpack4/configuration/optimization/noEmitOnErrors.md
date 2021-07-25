# noEmitOnErrors

noEmitOnErrors 配置项决定是否开启 NoEmitOnErrorsPlugin插件，它的作用是构建过程中如果出现了 error，决定是否跳过输出静态资源的步骤，`production` 环境下才会开启插件。

```js
class NoEmitOnErrorsPlugin {
	apply(compiler) {
		compiler.hooks.shouldEmit.tap("NoEmitOnErrorsPlugin", compilation => {
      // 这次构建出现 error
			if (compilation.getStats().hasErrors()) return false;
		});
		compiler.hooks.compilation.tap("NoEmitOnErrorsPlugin", compilation => {
			compilation.hooks.shouldRecord.tap("NoEmitOnErrorsPlugin", () => {
				if (compilation.getStats().hasErrors()) return false;
			});
		});
	}
}
```

compiler 的 shouldEmit 的触发时机在** webpack 编译结束之后，输出静态资源之前**，代码如下：

```js
class Compiler {
  run (callback) {
    // ...
    const onCompiled = (err, compilation) => {
      // ...

      // 根据 shouldEmit hook 的返回值决定是否阻止输出静态资源
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

      // 输出静态资源
			this.emitAssets(compilation, err => {
				// ...
			});
		};
  }
}
```

compilation 的 shouldRecord 触发时机是调用 seal 方法的时候。

```js
class Compilation {
  seal () {
    // ...
    const shouldRecord = this.hooks.shouldRecord.call() !== false;
    // ...
    if (shouldRecord) {
      // 将 modules 以及 chunks 信息记录在 compiler 上
      this.hooks.recordModules.call(this.modules, this.records);
      this.hooks.recordChunks.call(this.chunks, this.records);
    }
    // ...
    if (shouldRecord) {
      // 将 hash 信息记录在 compiler 上
      this.hooks.recordHash.call(this.records);
    }
    // ...
    if (shouldRecord) {
      // 预留好 record hook，HotModuleReplacementPlugin 会消费该钩子
      // 目的是为了记录前后文件修改造成的 compiler 重新构建而生成的 hash 值
      // 对比前后两次 hash 值就能得到哪些 modules 发生变化，然后将改变的 modules 组合成 hotUpdateChunk
      // 运行时就能加载 hotUpdateChunk 进行热更新
      this.hooks.record.call(this, this.records);
    }
  }
}
```

由于每次发生变化，都是重新生成 compilation，但 compiler 始终是相同的实例，所以把很多有用的信息存入内存，也就是 compiler.records 对象。

在开发环境下，是不会用到该插件。