# removeEmptyChunks

RemoveEmptyChunksPlugin 的作用是用来去除 empty chunks，什么时候会产出 empty chunk 呢？

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

对于第三点很疑惑，既然 chunk 都是空的，为啥还能包含 entry module 呢？很疑惑，目前并未找到这种 case。