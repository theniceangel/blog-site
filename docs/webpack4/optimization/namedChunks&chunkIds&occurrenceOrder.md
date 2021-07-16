# namedChunks, chunkIds, occurrenceOrder

## 配置项

这几个配置项相互影响，chunkIds 为主，namedChunks、occurrenceOrder 为辅，因为配置 namedChunks 和 occurrenceOrder 只是为了确定 chunkIds。它的逻辑如下：

```js
/* WebpackOptionsApply.js */

// 默认值为 undefined
let chunkIds = options.optimization.chunkIds;
if (chunkIds === undefined) {
  // 开启 occurrenceOrder 配置，生产环境为 true
  if (options.optimization.occurrenceOrder) {
    chunkIds = "total-size";
  }
  // 开启 namedChunks 配置，开发环境为 true
  if (options.optimization.namedChunks) {
    chunkIds = "named";
  }
  // fallback 为 'natural'
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
```

不同的值使用了不同的插件：

| chunkIds | Plugins | 作用 |
| :-----| -----: | -----: |
| `'natural'` | `NaturalChunkOrderPlugin` | 按照正常使用顺序给 chunk 分配 id |
| `'named'` | `OccurrenceChunkOrderPlugin` 与 `NamedChunksPlugin` | 给 chunk 分配易于调试的 id|
| `'size'` | `OccurrenceChunkOrderPlugin` | 出现在 initial chunk 次数最多的 chunk 最先分配 id |
| `'total-size'` | `OccurrenceChunkOrderPlugin` | 出现在 initial 或者 async chunk 中次数最多的 chunk 最先分配 id |

具体看下各个插件的逻辑：

## NaturalChunkOrderPlugin

```js
class NaturalChunkOrderPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("NaturalChunkOrderPlugin", compilation => {
			compilation.hooks.optimizeChunkOrder.tap(
				"NaturalChunkOrderPlugin",
				chunks => {
					// ...
				}
			);
		});
	}
}
```

optimizeChunkOrder hook 触发的时机是在调用 compilation.seal 的时候。

```js
class Compilation {
  seal () {
    // ...

    // 每个 module 生成 id
    this.hooks.beforeModuleIds.call(this.modules);
    this.hooks.moduleIds.call(this.modules);
    this.applyModuleIds();
    // ...

    // 走进 NaturalChunkOrderPlugin 内部
    this.hooks.optimizeChunkOrder.call(this.chunks);

    // 每个 chunk 生成 id
    this.hooks.beforeChunkIds.call(this.chunks);
    this.applyChunkIds();
  }
}
```

可以看到先生成了 module id，接着走到 NaturalChunkOrderPlugin 内部。

```js
chunks.sort((chunkA, chunkB) => {
  const a = chunkA.modulesIterable[Symbol.iterator]();
  const b = chunkB.modulesIterable[Symbol.iterator]();
  
  // 对比两个 chunk 内部的 moduleId，例如：
  // chunkA = [module1, module2, module3]
  // chunkB = [module4, module5, module6]
  // 1 与 4 对比，如果有结果，返回排序
  // 接着 2 与 3 对比，以此类推
  while (true) {
    const aItem = a.next();
    const bItem = b.next();
    if (aItem.done && bItem.done) return 0;
    if (aItem.done) return -1;
    if (bItem.done) return 1;
    const aModuleId = aItem.value.id;
    const bModuleId = bItem.value.id;
    if (aModuleId < bModuleId) return -1;
    if (aModuleId > bModuleId) return 1;
  }
});
```

如果 chunk 含有的 module 的 id 越小或者含有的 module 数量越少会排在前面，在调用 this.applyChunkIds 的时候，排在前面的 chunkId 会更小，因为它是一个自增的数字。

## OccurrenceChunkOrderPlugin

```js
class OccurrenceOrderChunkIdsPlugin {
	constructor(options = {}) {
    // 校验选项的合法性
		validateOptions(schema, options, "Occurrence Order Chunk Ids Plugin");
		this.options = options;
	}

	apply(compiler) {
    // 布尔值
		const prioritiseInitial = this.options.prioritiseInitial;
		compiler.hooks.compilation.tap(
			"OccurrenceOrderChunkIdsPlugin",
			compilation => {
				compilation.hooks.optimizeChunkOrder.tap(
					"OccurrenceOrderChunkIdsPlugin",
					chunks => {
						// ...
					}
				);
			}
		);
	}
}
```

OccurrenceChunkOrderPlugin 的触发时机与 NaturalChunkOrderPlugin 一致，不过它支持 prioritiseInitial 配置，当 chunkIds 配置为 `'named' | 'total-size'` 的时候，prioritiseInitial 为 false，为 `'size'` 的时候，prioritiseInitial 为 true。

```js
const occursInInitialChunksMap = new Map();
  const originalOrder = new Map();

  let i = 0;
  for (const c of chunks) {
    let occurs = 0;
    for (const chunkGroup of c.groupsIterable) {
      // 出现在 initial chunk 中的 chunk 会记录 occurs 变量
      for (const parent of chunkGroup.parentsIterable) {
        if (parent.isInitial()) occurs++;
      }
    }
    occursInInitialChunksMap.set(c, occurs);

    // 记录 chunks 的原始顺序
    originalOrder.set(c, i++);
  }

  chunks.sort((a, b) => {
    // 'named' | 'total-size' 为 false
    // 'size' 为 true
    if (prioritiseInitial) {
      const aEntryOccurs = occursInInitialChunksMap.get(a);
      const bEntryOccurs = occursInInitialChunksMap.get(b);
      if (aEntryOccurs > bEntryOccurs) return -1;
      if (aEntryOccurs < bEntryOccurs) return 1;
    }
    // 对比两个 chunk 被引用的次数
    const aOccurs = a.getNumberOfGroups();
    const bOccurs = b.getNumberOfGroups();
    if (aOccurs > bOccurs) return -1;
    if (aOccurs < bOccurs) return 1;
    // 如果两个 chunk 被引用的次数相同，那就按照 chunks 原有的顺序计算
    const orgA = originalOrder.get(a);
    const orgB = originalOrder.get(b);
    return orgA - orgB;
  });
```

// TODO 后期补充说明什么是 chunkGroup, entrypoint

prioritiseInitial 主要是用来对比两个 async chunk 被 initial chunk 引用的次数，什么是 async 与 initial chunk，举个例子：

```js
// index.js webpack 的入口文件
import(/* webpackChunkName: "a" */'./a.js)

// a.js
export default a = 1
```

webpack 打包后，会有两个文件，一个是 `bundle.js`，一个是 `a.js`，`bundle.js` 就是由 initial chunk 生成的，`a.js` 就是由上述 import 语法而生成的 async chunk，所以在对比 a 这个 async chunk 的时候，由于它的 occurs 数量更大，在 this.applyChunkIds 的处理过程中，优先被分配 id。

## NamedChunksPlugin

```js
class NamedChunksPlugin {
	static defaultNameResolver(chunk) {
		return chunk.name || null;
	}

	constructor(nameResolver) {
		this.nameResolver = nameResolver || NamedChunksPlugin.defaultNameResolver;
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("NamedChunksPlugin", compilation => {
			compilation.hooks.beforeChunkIds.tap("NamedChunksPlugin", chunks => {
				for (const chunk of chunks) {
					if (chunk.id === null) {
						chunk.id = this.nameResolver(chunk);
					}
				}
			});
		});
	}
}
```

webpack 内部使用 NamedChunksPlugin 是没有传 nameResolver，所以使用默认的 defaultNameResolver，说白了就是一个获取 chunk 名称的函数。

beforeChunkIds hook 触发的时机是上述的 optimizeChunkOrder hook 后一步，做的事情也很简单，就是将每个 chunk 的 id 都赋值成 name，后期调用 this.applyChunkIds 的时候，会跳过已经分配过 id 的 chunk。