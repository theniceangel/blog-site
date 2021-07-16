# removeEmptyChunks

RemoveEmptyChunksPlugin 的作用是用来去除 empty chunks，否则你会发现打包出了若干没有任何代码的文件，什么时候会产出 empty chunk 呢？

## 核心逻辑

```js
class RemoveEmptyChunksPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("RemoveEmptyChunksPlugin", compilation => {
			const handler = chunks => {
				// ...
			};
			compilation.hooks.optimizeChunksBasic.tap(
				"RemoveEmptyChunksPlugin",
				handler
			);
			compilation.hooks.optimizeChunksAdvanced.tap(
				"RemoveEmptyChunksPlugin",
				handler
			);
			compilation.hooks.optimizeExtractedChunksBasic.tap(
				"RemoveEmptyChunksPlugin",
				handler
			);
			compilation.hooks.optimizeExtractedChunksAdvanced.tap(
				"RemoveEmptyChunksPlugin",
				handler
			);
		});
	}
}
```

插件利用的是 compilation 上的 `optimizeChunksBasic`、`optimizeChunksAdvanced`、`optimizeExtractedChunksBasic`、`optimizeExtractedChunksAdvanced` 四个钩子，它们都是在 compilation.seal 阶段才会触发，这几个钩子的回调函数内部都会生成 newChunk，所以得多次触发 handler 内部的移除逻辑。

## handler

```js
const handler = chunks => {
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (
      chunk.isEmpty() &&
      !chunk.hasRuntime() &&
      !chunk.hasEntryModule()
    ) {
      chunk.remove("empty");
      chunks.splice(i, 1);
    }
  }
};

class Chunk {
	hasEntryModule() {
		return !!this.entryModule;
	}
}
```

handler 内部遍历所有的 chunks，移除 chunk 的条件必须同时满足以下三个：

1. chunk 没有含有任何的 module；

2. chunk 不能是含有 webpack 的 runtime bootstrap code，[什么是 runtime code](./runtimeChunk.md)，这种 chunk 自然不能移除；

3. chunk 不能含有 entry module，

> 要想完全理解为什么，建议先阅读 [splitChunks]('./splitChunks.md) 和 [runtimeChunk]('./runtimeChunk.md)。

对于第三点很疑惑，既然 chunk 都是空的，为啥还能包含 entry module 呢？首先来看 Chunk 的结构。

```js
class Chunk {
	// webpack 配置的入口模块
	/** @type {Module=} */
	this.entryModule = undefined;
	// 当前 chunk 的所有 modules 依赖，包含了 entryModule
	// 也就是从入口模块递归解析而来的所有模块(前提是不使用 splitChunksPlugin 等插件)
	/** @private @type {SortableSet<Module>} */
	this._modules = new SortableSet(undefined, sortByIdentifier);

	isEmpty() {
		return this._modules.size === 0;
	}
}
```

但是如果使用了 splitChunksPlugin，是可以做到去除 this._modules 的 entryModule，但是不会清空 chunk.entryModule，因为在 chunk 生成代码过程是严重依赖 chunk.entryModule。比如下面这个场景：

::: details index.js
```js
console.log('index.js')
```
:::

::: details webpack.config.js
```js
module.exports = {
	mode: "production",
	context: __dirname,
	entry: './index.js',
	devtool: false,
	optimization: {
		minimize: false,
		runtimeChunk: 'single', // 必不可少
		splitChunks: { 
			minSize: 1,
			cacheGroups: {
				default: { // 必不可少
					minChunks: 1,
						priority: 10,
						reuseExistingChunk: true,
						chunks: 'initial',
				}
			}
		}
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	}
};
```
:::

webpack 打包后会生成 `main.js`、`default~main.js`、`runtime.js`，其中对应生成 `main.js` 的 main chunk 原本是如下的结构：

```js
chunk._modules = [index.js 模块]
chunk.entryModule = index.js 模块
```

但是由于 splitChunks.cacheGroups 的 default 分组原因，会把 index.js 模块抽离到 `default~main.js` 对应的 chunk，所以 main.chunk 就变成了如下的结构：

```js
chunk._modules = []
chunk.entryModule = index.js 模块
```

而且本来 main.chunk 是 runtime Chunk，由于配置了 runtime: 'single'，它就被降级了，`runtime.js` 变成了 runtime chunk 打出来的包，因此如果 RemoveEmptyChunksPlugin 没有如下的判断，会导致 `main.js` 被忽略

```js
if (!chunk.hasEntryModule()) {
	//..
}
```

为什么 `main.js` 不能被移除呢，
**其实是因为 runtime.js 要连接 main.js**，
在 `main.js` 里面有这么一段代码：

```js
// main.js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[],[[0,2,0]]]);
```

push 的数组参数的第三个元素 [0, 2, 0]，是要被 `runtime.js` 的 `webpackJsonpCallback` 消费的，因为这个是程序的启动入口，而 `main.js` 的代码生成，也就是 [0, 2, 0] 必须依赖 mainChunk.entryModule 信息，代表着 runtime.js 的程序入口。