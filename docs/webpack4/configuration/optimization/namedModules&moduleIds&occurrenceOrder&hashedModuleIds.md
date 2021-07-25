# namedModules, moduleIds, occurrenceOrder, hashedModuleIds

## 配置项

这几个配置项相互影响，moduleIds 为主，其他为辅，因为配置这些只是为了确定 moduleIds。它的逻辑如下：

```js
/* WebpackOptionsApply.js */

// 默认值为 undefined
let moduleIds = options.optimization.moduleIds;
if (moduleIds === undefined) {
  // 开启 occurrenceOrder 配置，生产环境为 true
  if (options.optimization.occurrenceOrder) {
    moduleIds = "size";
  }
  // 开启 namedModules 配置，开发环境为 true
  if (options.optimization.namedModules) {
    moduleIds = "named";
  }
  // 默认值为 false，并且官方文档也没提及
  if (options.optimization.hashedModuleIds) {
    moduleIds = "hashed";
  }
  // fallback 方案
  if (moduleIds === undefined) {
    moduleIds = "natural";
  }
}
if (moduleIds) {
  const NamedModulesPlugin = require("./NamedModulesPlugin");
  const HashedModuleIdsPlugin = require("./HashedModuleIdsPlugin");
  const OccurrenceModuleOrderPlugin = require("./optimize/OccurrenceModuleOrderPlugin");
  switch (moduleIds) {
    case "natural":
      break;
    case "named":
      new NamedModulesPlugin().apply(compiler);
      break;
    case "hashed":
      new HashedModuleIdsPlugin().apply(compiler);
      break;
    case "size":
      new OccurrenceModuleOrderPlugin({
        prioritiseInitial: true
      }).apply(compiler);
      break;
    case "total-size":
      new OccurrenceModuleOrderPlugin({
        prioritiseInitial: false
      }).apply(compiler);
      break;
    default:
      throw new Error(
        `webpack bug: moduleIds: ${moduleIds} is not implemented`
      );
  }
}
```

不同的值使用了不同的插件：

| moduleIds | Plugins | 作用 |
| :-----| -----: | -----: |
| `'natural'` | 无 | |
| `'named'` | `NamedModulesPlugin` | 模块相对于 context 的请求路径作为 id |
| `'hashed'` | `HashedModuleIdsPlugin` | 模块相对于 context 的请求路径哈希处理过后作为 id|
| `'size'` | `OccurrenceModuleOrderPlugin` | 出|
| `'total-size'` | `OccurrenceModuleOrderPlugin` | 出 |

具体看下各个插件的逻辑：

## NamedModulesPlugin

```js
class NamedModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("NamedModulesPlugin", compilation => {
			compilation.hooks.beforeModuleIds.tap("NamedModulesPlugin", modules => {
				// ... handle
			});
		});
	}
}
```

beforeModuleIds hook 触发的时机是在调用 compilation.seal 的时候。

```js
class Compilation {
  seal () {
    // ...

    // 走进 OccurrenceModuleOrderPlugin
    this.hooks.optimizeModuleOrder.call(this.modules);
    this.hooks.advancedOptimizeModuleOrder.call(this.modules);
    // 走进 NamedModulesPlugin, HashedModuleIdsPlugin
    this.hooks.beforeModuleIds.call(this.modules);
    this.hooks.moduleIds.call(this.modules);
    // 每个 module 生成 id
    this.applyModuleIds();

    // ...
  }
}
```

beforeModuleIds 和 moduleIds 这两个 hook 很关键，因为你可以改变 modules 的顺序或者其他信息，来影响接下来 module id 生成的过程，接着看一下插件内部具体的逻辑，分为以下关键的两步：

  1. **步骤一：尝试给所有模块分配 id**

      ```js
      // handle

      const namedModules = new Map();
      // 可以指定上下文路径，一般为项目的根目录
      const context = this.options.context || compiler.options.context;

      for (const module of modules) {
        if (module.id === null && module.libIdent) {
          // module 的相对路径会作为 id
          module.id = module.libIdent({ context });
        }

        // 存储已经分配过 id 的 module
        if (module.id !== null) {
          const namedModule = namedModules.get(module.id);
          if (namedModule !== undefined) {
            namedModule.push(module);
          } else {
            // 什么情况下多个 module 的 libIdent 返回值一样，但是属于不同的 module 呢？很奇怪！
            namedModules.set(module.id, [module]);
          }
        }
      }

      // NormalModule.js
      class NormalModule {
        constructor() {
          // 模块在用户系统上的绝对路径，包含模块的 query
          // 模块的 query 指的是 './a?x=1' 后面的 '?x=1'
          this.userRequest = ''
        }
        // 获取模块相对路径（相对于 context），举个例子
        // userRequest 为 "/Users/webpack-demo/index.js"
        // context 为 "/Users/webpack-demo/"
        // 那么 contextify 之后就变成了 './index.js'
        libIdent(options) {
          return contextify(options.context, this.userRequest);
        }
      }
      ```

      回到上述的奇怪点，什么情况下，modules 之间的 userRequest 一模一样，但是他们又确确实实是不同的 module 呢。这个就要回到神奇的 Loader 机制了，因为 Loader 是可以针对同一个模块请求，返回不同的内容，比如：

      ```js
      /** a,b 模块共同引用了 c，但是利用 loader 又修改了 c 模块的返回值
       ** 
       **
       **
       **/
      // a.js
      module.exports = require("./c");

      // b.js
      module.exports = require("./c");

      // webpack.config.js
      module.exports = {
        mode: "development",
        context: __dirname,
        entry: ["./a", "./b"],
        module: {
          rules: [
            {
              test: /c\.js/,
              issuer: /a\.js/,
              loader: "./loader-a"
            },
            {
              test: /c\.js/,
              issuer: /b\.js/,
              loader: "./loader-b"
            }
          ]
        },
        devtool: false,
        performance: {
          hints: false
        },
        optimization: {
          minimize: false,
        },
        output: {
          path: path.join(__dirname, "dist"),
          filename: "[name].js"
        }
      };

      // loader-a.js
      module.exports = function(src) {
        return `module.exports = 1;`
      };

      // loader-b.js
      module.exports = function(src) {
        return `module.exports = 1;`
      };
      ```

      经过 webpack 打包之后，你会发现模块 a 与模块 b 的共同依赖模块 c，是不一样的，换句话来说就是由一个文件，衍生出多个 module，因为在对比 module 是否相同的时候，不仅仅是取决于模块在用户系统的绝对路径，还取决于 module 是否被不同的 loaders 处理过。判断不同的 modules 实例是否相同，modules.request 起了决定性因素，因为它包含了 loader 的信息。

      ```js
      class NormalModule {
        // 拼接了 loaders 请求, 比如 '/Users/webpack-demo/loader-a.js!/Users/webpack-demo/c.js'
        this.request = request;
        // 当前模块在用户系统的绝对路径，包含 query，比如 '/Users/webpack-demo/c.js'
        this.userRequest = userRequest;
        // 代码中引入该模块的方式，比如 import './c.js'，那么就是 './c.js'
        this.rawRequest = rawRequest;
      }
      ```

  2. **步骤二：对可能因为 loader 而衍生出来的多个 module 进行哈希**

      ```js
      for (const namedModule of namedModules.values()) {
        if (namedModule.length > 1) {
          for (const module of namedModule) {
            const requestShortener = new RequestShortener(context);
            module.id = `${module.id}?${getHash(
              requestShortener.shorten(module.identifier())
            )}`;
          }
        }
      }

      // RequestShortener.shorten 只是把 module.request 的请求缩短
      // 比如之前可能是这样的：'/Users/webpack-demo/loader-a.js!/Users/webpack-demo/c.js'
      // shorten 过后就变成 './loader-a.js!./c.js'，前面代表 loader 的相对路径，后面是模块的相对路径

      // getHash 根据字符串 md4 哈希，取前四个字符
      const getHash = str => {
        const hash = createHash("md4");
        hash.update(str);
        const digest = (hash.digest("hex"));
        return digest.substr(0, 4);
      };
      ```
    
## HashedModuleIdsPlugin

```js
class HashedModuleIdsPlugin {
	constructor(options) {
		if (!options) options = {};

		validateOptions(schema, options, "Hashed Module Ids Plugin");
		this.options = Object.assign(
			{
				context: null,
				hashFunction: "md4",
				hashDigest: "base64",
				hashDigestLength: 4
			},
			options
		);
	}

	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap("HashedModuleIdsPlugin", compilation => {
			const usedIds = new Set();
			compilation.hooks.beforeModuleIds.tap(
				"HashedModuleIdsPlugin",
				modules => {
					// ... handle
				}
			);
		});
	}
}
```

HashedModuleIdsPlugin 可以通过 options 来定制化，走进这个插件的 hook 也是 beforeModuleIds，下面看看具体的逻辑。

```js
// handle
for (const module of modules) {
if (module.id === null && module.libIdent) {
  // module 的相对路径会作为 id
  const id = module.libIdent({
    context: this.options.context || compiler.options.context
  });

  // 生成 hash 函数。默认为 'md4'
  const hash = createHash(options.hashFunction);
  hash.update(id);
  // 得到哈希结果
  const hashId = (hash.digest(
    options.hashDigest
  ));
  // 截取对应长度的 hash 结果
  let len = options.hashDigestLength;
  // 如果遇到上述因为 loader 导致多个 modules 的问题，就不断的增加截取长度，防止重复
  // 这里的逻辑还是有缺陷的～下面会讲为什么。
  while (usedIds.has(hashId.substr(0, len))) len++;
  module.id = hashId.substr(0, len);
  // 记录已经分配过的 id
  usedIds.add(module.id);
}
}
```

可以看到后面那个 while 处理是为了解决 NamedModulesPlugin 中提及到的同一个文件，多个 module 的问题，不过这里逻辑也是有缺陷的，因为当你的 `options.hashDigestLength` 不小于 `hashId.length`，那么两个 module 的 id 就重复了，只不过这个插件是在 webpack 内部引用了，你没有机会通过 options 来触发这个 bug。不过官方也没有在文档里提及 `optimization.hashedModuleIds` 配置，不知道是有意还是漏了。

## OccurrenceModuleOrderPlugin

```js
class OccurrenceOrderModuleIdsPlugin {
	constructor(options = {}) {
    // 校验选项的合法性
		validateOptions(schema, options, "Occurrence Order Module Ids Plugin");
		this.options = options;
	}

	apply(compiler) {
    // 布尔值
		const prioritiseInitial = this.options.prioritiseInitial;
		compiler.hooks.compilation.tap(
			"OccurrenceOrderModuleIdsPlugin",
			compilation => {
				compilation.hooks.optimizeModuleOrder.tap(
					"OccurrenceOrderModuleIdsPlugin",
					modules => {
						// ... handle
					}
				);
			}
		);
	}
}
```

OccurrenceModuleOrderPlugin 的触发时机是在调用 compilation.seal 的时候，会触发 optimizeModuleOrder hook，不过它支持 prioritiseInitial 配置，当 moduleIds 配置为 `'total-size'` 的时候，prioritiseInitial 为 false，为 `'size'` 的时候，prioritiseInitial 为 true。

整体逻辑可以归为以下几个步骤：

- **步骤一：遍历 modules，记录它出现在 initial chunk 的次数以及作为 entryModule 的次数**

    ```js
    const occursInInitialChunksMap = new Map();
    const occursInAllChunksMap = new Map();

    const initialChunkChunkMap = new Map();
    const entryCountMap = new Map();
    for (const m of modules) {
      let initial = 0;
      let entry = 0;
      for (const c of m.chunksIterable) {
        // 如果 module 属于 initial chunk
        if (c.canBeInitial()) initial++;
        // 如果 module 属于 chunk 的 entryModule，并不一定是 initial chunk
        // 也可能是由 initial chunk 降级的普通 chunk，比如使用了 `optimization.runtimeChunk`
        if (c.entryModule === m) entry++;
      }
      // 记录 module 作为不同身份的权重
      initialChunkChunkMap.set(m, initial);
      entryCountMap.set(m, entry);
    }
    ```

    内部 entryModule 的判断并不会要求 module 必须属于 initial chunk，因为可能存在一些特殊的场景。比如[这里的第 3 点涉及的场景](./removeEmptyChunks.html#handler)。

    什么是 initial chunk，什么是 entryModule，可以先阅读 [术语篇](../../term/module.md)。

- **步骤二：根据 prioritiseInitial 配置，计算 module 的权重，记录在 occursInInitialChunksMap**

    ```js
    const countOccursInEntry = (sum, r) => {
      if (!r.module) {
        return sum;
      }
      const count = initialChunkChunkMap.get(r.module);
      if (!count) {
        return sum;
      }
      return sum + count;
    };

    // optimization.moduleIds 配置为 'size' 的时候走进 if
    if (prioritiseInitial) {
      for (const m of modules) {
        // 如果 module 既属于 initial chunk，又是 initial chunk 的 entryModule，权重更大
        // 在大多数情况下，webpack 配置的 entry 模块就属于这种
        const result =
          m.reasons.reduce(countOccursInEntry, 0) +
          initialChunkChunkMap.get(m) +
          entryCountMap.get(m);
        occursInInitialChunksMap.set(m, result);
      }
    }
    ```

- **步骤三：计算 module 的原本权重（原本指的是 webpack 深度遍历解析 modules），记录在 originalOrder 和 occursInAllChunksMap**

    ```js
    // 为了计算 module 被引用的次数
    const countOccurs = (sum, r) => {
      if (!r.module) {
        return sum;
      }
      let factor = 1;
      if (typeof r.dependency.getNumberOfIdOccurrences === "function") {
        factor = r.dependency.getNumberOfIdOccurrences();
      }
      if (factor === 0) {
        return sum;
      }
      return sum + factor * r.module.getNumberOfChunks();
    };

    const originalOrder = new Map();
    let i = 0;
    for (const m of modules) {
      // module 被引用的次数越多，权重越大
      const result =
        m.reasons.reduce(countOccurs, 0) +
        m.getNumberOfChunks() +
        entryCountMap.get(m);
      occursInAllChunksMap.set(m, result);
      // modules 原本的顺序
      originalOrder.set(m, i++);
    }
    ```

- **步骤四：排序**

    ```js
    modules.sort((a, b) => {
      // optimization.moduleIds 配置为 'size' 的时候走进 if
      if (prioritiseInitial) {
        // 如果 module 即属于 initial chunk，并且还是它的 entryModule，排在最前面
        const aEntryOccurs = occursInInitialChunksMap.get(a);
        const bEntryOccurs = occursInInitialChunksMap.get(b);
        if (aEntryOccurs > bEntryOccurs) return -1;
        if (aEntryOccurs < bEntryOccurs) return 1;
      }
      // 被引用次数最多的 module 排在前面
      const aOccurs = occursInAllChunksMap.get(a);
      const bOccurs = occursInAllChunksMap.get(b);
      if (aOccurs > bOccurs) return -1;
      if (aOccurs < bOccurs) return 1;

      // 否则按照原始的 webpack 解析 module 顺序，越早解析的排在前面
      const orgA = originalOrder.get(a);
      const orgB = originalOrder.get(b);
      return orgA - orgB;
    });
    ```

    最后排序的规则还是特别清晰，正如上面注释描述。