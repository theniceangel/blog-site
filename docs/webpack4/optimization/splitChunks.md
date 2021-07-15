# splitChunks

webpack 优化 chunk 的最重要一步是 splitChunksPlugin，对于开发者，可以通过该插件来决定输出的 chunk 的大小，以及被多个 chunk 重复依赖的 modules 应该怎么被打包。自己在之前做一个多页打包的项目优化的时候，也是使用了该配置，当时用的一知半解，翻了网上的一些文章，很少有写的特别好，特别全的分析，刚好有时间自己可以从头到尾研究一番。

大多数人对于 splitChunks 的配置一头雾水，其一是 webpack 的 dependencyGraph 很复杂，还有一个原因是官方文档实在是不能吐槽之再吐槽了，下面会从源码的角度分析配置项的作用，方便开发者随心所欲地控制 chunks 的输出。

## 核心思想

插件的核心原理是**通过 splitChunks 的 cacheGroups 来决定哪些 chunks 需要被额外输出，chunks 由 modules 来组成，而 modules 是否满足加入 cacheGroups 的某个分组的条件取决于 splitChunks 的其他若干配置项**。

因此，我们要抓住的脉络是**哪些 module 丢进了 cacheGroups 的分组对象中，最后伴随着 chunk 写入 js 文件**。

捋清上述的思路之后，对于 splitChunksPlugin 的源码理解会事半功倍，这里为什么配置项为啥叫 `cacheGroups`，大概的原因是分离出来的 chunk 希望能够被**长期缓存**(long term cache)，所以有一个 cache 的字眼。

## 源码

### 默认配置项

splitChunks 的默认配置项如下：

::: details 点击展开

```js
module.exports = {
  //...
  optimization: {
    splitChunks: {
      chunks: 'async',
      minSize: 30000,
      maxSize: 0,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      automaticNameDelimiter: '~',
      automaticNameMaxLength: 30,
      name: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```
:::

下面分别解释一下各个配置项的作用。

  - **chunks**

    默认值为 `"async"`，还可以配置为 `"initial" | "all" | Function `，这个配置项是什么意思呢？很多人不解，举个例子。

    ```js
    // entry.js  // webpack 打包入口
    import("./dynamic.js")
    import './moduleA'

    // dynamic.js
    import './moduleB'
    ```

    在上面这个例子里面，`moduleA` 属于 `initial chunk`，`moduleB` 属于 `async chunk`，如果 cacheGroups 下面的分组配置的是 `async`，说明 moduleA 满足 chunks 的分组条件，接着继续验证是否满足其他的分组条件。`all` 的话表示不论 module 来自哪里，都可以被分组，当然 webpack 还提供 Function 配置来做更精细的 chunk 判断。

    ```js
    splitChunks: {
      chunks (chunk) {
        // 如果 module 来自于名为 'excluded' chunk，那么不允许加入该分组
        return chunk.name !== 'excluded';
      }
    }
    ```

  - **minSize**

    默认值为 `30000`，验证当前 cacheGroups 分组的文件大小，最小必须满足 30000 bytes。

  - **maxSize**

    默认值为 `0`，表示不验证当前 cacheGroups 分组的文件大小，如果分组的大小超过 maxSize，webpack 内部会采用一种叫 `deterministic grouping` 的算法，对 chunks 里面的 modules 做重新的分割。由于 module 已经是不可再分割的最小单元，所以最后打包的 chunk 的体积可能违背 maxSize 和 minSize。

  - **minChunks**

    默认值为 `1`，当前 module 至少被一个 chunk 引用，才满足加入对应 cacheGroups 分组的条件。

  - **maxInitialRequests**

    默认值为 `3`，为了加载 entrypoint 时，允许的最大并行请求数量。这个配置项非常难理解，如果不对源码特别熟悉的话，永远不懂它到底是啥意思，这也是我吐槽官方文档写的烂的原因。举个例子：

    ```js
    // 假设 entry.js 作为 webpack 打包的入口，并且引入模块 A 和 模块 B 如下
    // maxInitialRequests 配置为 2, 分组名称为 default

    // entry.js
    import './moduleA'
    import './moduleB'

    // moduleA 与 moduleB 都属于 entrypoint 里的 chunk 的模块
    // 判断 moduleA 是否要放入分组 default
    // 当前加载 entrypoint 只需要一个请求，因此 moduleA 可以放入分组 default
    // 这个时候 entrypoint 需要额外并行引入 default chunk 了，因为 moduleA 是它的前置依赖。
    // 这个时候总的请求数量为 2。
    // 接着判断 moduleB 是否要放入分组 default
    // 由于 maxInitialRequests 为 2 ，moduleB 无法加入 default 分组
    // 最后 moduleA 随着 default chunk 输出， moduleB 随着 entrypoint 输出
    ```

  - **maxAsyncRequests**

    默认值为 `5`，加载按需模块的时候，最大的并行请求数量，原理与上述的类似。

    ```js
    // 假设 entry.js 作为 webpack 打包的入口，按需异步加载引入模块 A
    // 异步模块 A 里面引入 模块 B
    // maxAsyncRequests 配置为 2, 分组名称为 default

    // entry.js
    import(/* webpackChunkName: "asyncChunk" */'./moduleA')


    // moduleA.js
    import './moduleB'
    
    // 判断 moduleB 是否要放入分组 default
    // 当前异步加载 moduleA 只需要一个请求，而 maxAsyncRequests 为 2，因此 moduleB 可以放入分组 default
    // 这个时候 webpack 打出来的 entry 伪代码类似如下
    Promise.all([__webpack_require__.e('asyncChunk'), __webpack_require__.e('default')]).then(()=> {
      // ....
    })
    // 如果 maxAsyncRequests 修改为 1，那么 moduleB 就不可以放入分组 default
    ```

    这个案例其实也很好理解，moduleA 是异步加载的 chunk 的模块，moduleB 是由异步 chunk 分离出来的 default chunk 的模块，因此必须两个 chunk 都加载好，才能执行 entry 里面的代码。
  
  - **automaticNameDelimiter**

    决定生成的 chunk 文件的名字的分隔符，比如(`"vendors~main.js"`)。
  
  - **automaticNameMaxLength**

    决定生成的 chunk 文件的名字长度，名字太长会抛出 `ENAMETOOLONG ERROR`。

  - **name**

    配置生成的 chunk 的名称。
  
  - **cacheGroups.{cacheGroup}.priority**

    决定当前分组的优先级，优先级越高的分组，优先生成 chunk。
  
  - **cacheGroups.{cacheGroup}.reuseExistingChunk**

    生成分组对象对应的 chunk 时，是否能复用已有的 chunk。满足该条件非常的苛刻，这个场景后面会提到。

  - **cacheGroups.{cacheGroup}.enforce**

    忽略 minSize, minChunks, maxAsyncRequests 和 maxInitialRequests 这些配置项，但是不能忽略一些其他配置项的影响，比如 chunks，就算配置了 enforce 为 true，假如 module 所属的 chunk 为 async 的话，你也无法将该 module 划分到类型为 initial chunk 的 cacheGroups 分组里面去。这个跟官网的 `always create chunks for this cache group` 这句话有一点出入，再次说明官方文档有多不靠谱。

  - **cacheGroups.{cacheGroup}.test**

    决定哪些 modules 可以加入到该分组，如果忽略该配置，代表所有 modules 都可以加入该分组，它也可以是 string、正则，布尔值，甚至 Function，如果是一个正则的话，它会匹配 module 的名称，或者 module 所属的 chunk 名称，匹配上了就代表该 module 应该丢进分组，如果是字符串，它会判断 module 的绝对路径是否以该字符串开头或者 module 所属的 chunk 的名称是否以该字符串开头，例子如下：

    ```js
    // 伪代码如下：

    // test 为字符串
    let test = 'abc'
    if (module) {
      return module.nameForCondition() && module.nameForCondition().startsWith(test)
    }
    for(chunk of module.chunks) {
      return chunk.name && chunk.name.startsWith(test)
    }

    // test 为正则
    let test = /abc/
    if (module) {
      return module.nameForCondition() && test.test(module.nameForCondition())
    }
    for(chunk of module.chunks) {
      return chunk.name && test.test(chunk.name)
    }

    // test 是函数
    {
      vendors: {
        test(module, chunks) {
          //...
          return module.type === 'javascript/auto';
        }
      }
    }
    ```

  - **cacheGroups.{cacheGroup}.filename**

    使用类似于 webpack 的 `output.filename` 配置来定制化 chunk 的名称，这个只针对 initial chunk，因为对于 async chunk 来说，所有的模块编译已经完成了，而 async chunk 又是运行时的代码，无法再去修改了。

cacheGroups 含有默认的 `vendors` 和 `default` 两个分组，换句话来说，只要 module 满足其所有的分组条件，module 就会被丢到对应的分组里面，最后面根据 `priority` 或者其他的一些**优先级条件**来决定 module 是伴随哪个分组输出到对应的 chunk。

注意到 splitChunks top-level 级别的选项配置，从 `chunks` 到 `name`，这些配置项会被**合并**到 `cacheGroups` 下面对应的分组对象上去，类似于 `cacheGroups` 的**全局配置**的概念，其中 `test`、`priority`、`reuseExistingChunk`、`enforce` 属于**局部配置**，只能在 cacheGroups 下面配置。

好，对默认配置有一个全新的面貌之后，直接进入源码部分。

### 一. 初始化

```js
class SplitChunksPlugin {
  constructor(options) {
    this.options = SplitChunksPlugin.normalizeOptions(options);
  }

  static normalizeOptions(options = {}) {
    return {
      chunksFilter: SplitChunksPlugin.normalizeChunksFilter(
        options.chunks || "all"
      ),
      minSize: options.minSize || 0,
      enforceSizeThreshold: options.enforceSizeThreshold || 0,
      maxSize: options.maxSize || 0,
      minChunks: options.minChunks || 1,
      maxAsyncRequests: options.maxAsyncRequests || 1,
      maxInitialRequests: options.maxInitialRequests || 1,
      hidePathInfo: options.hidePathInfo || false,
      filename: options.filename || undefined,
      getCacheGroups: SplitChunksPlugin.normalizeCacheGroups({
        cacheGroups: options.cacheGroups,
        name: options.name,
        automaticNameDelimiter: options.automaticNameDelimiter,
        automaticNameMaxLength: options.automaticNameMaxLength
      }),
      automaticNameDelimiter: options.automaticNameDelimiter,
      automaticNameMaxLength: options.automaticNameMaxLength || 109,
      fallbackCacheGroup: SplitChunksPlugin.normalizeFallbackCacheGroup(
        options.fallbackCacheGroup || {},
        options
      )
    };
  }
}
```

构造函数里面很简单，就是对传入的 options 做一次 normalize，并且传给 this.options，方便后续的 `cacheGroups` 的分组对象使用。以下三个属性，都被 normalize 过了。

- **chunksFilter**

  用来校验 module 所属的 chunk 类型，若通过，则进行下一项的校验。

- **getCacheGroups**

  将用户传入的 optimization.splitChunks.cacheGroups 做一次处理，因为 webpack 允许多样化的 cacheGroups 的配置，最终返回值为函数，方便后续调用。对应的函数体如下：

  ```js
  static normalizeCacheGroups({
		cacheGroups,
		name,
		automaticNameDelimiter,
		automaticNameMaxLength
	}) {
    // 第一种：函数
		if (typeof cacheGroups === "function") {
			// TODO webpack 5 remove this
			if (cacheGroups.length !== 1) {
				return module => cacheGroups(module, module.getChunks());
			}
			return cacheGroups;
    }
    // 第二种：对象
		if (cacheGroups && typeof cacheGroups === "object") {
			const fn = module => {
				let results;
				for (const key of Object.keys(cacheGroups)) {
					let option = cacheGroups[key];
					if (option === false) continue;
					if (option instanceof RegExp || typeof option === "string") {
						option = {
							test: option
						};
					}
					if (typeof option === "function") {
						let result = option(module);
						if (result) {
							if (results === undefined) results = [];
							for (const r of Array.isArray(result) ? result : [result]) {
								const result = Object.assign({ key }, r);
								if (result.name) result.getName = () => result.name;
								if (result.chunks) {
									result.chunksFilter = SplitChunksPlugin.normalizeChunksFilter(
										result.chunks
									);
								}
								results.push(result);
							}
						}
					} else if (SplitChunksPlugin.checkTest(option.test, module)) {
						if (results === undefined) results = [];
						results.push({
							key: key,
							priority: option.priority,
							getName:
								SplitChunksPlugin.normalizeName({
									name: option.name || name,
									automaticNameDelimiter:
										typeof option.automaticNameDelimiter === "string"
											? option.automaticNameDelimiter
											: automaticNameDelimiter,
									automaticNamePrefix: option.automaticNamePrefix,
									automaticNameMaxLength:
										option.automaticNameMaxLength || automaticNameMaxLength
								}) || (() => {}),
							chunksFilter: SplitChunksPlugin.normalizeChunksFilter(
								option.chunks
							),
							enforce: option.enforce,
							minSize: option.minSize,
							enforceSizeThreshold: option.enforceSizeThreshold,
							maxSize: option.maxSize,
							minChunks: option.minChunks,
							maxAsyncRequests: option.maxAsyncRequests,
							maxInitialRequests: option.maxInitialRequests,
							filename: option.filename,
							reuseExistingChunk: option.reuseExistingChunk
						});
					}
				}
				return results;
			};
			return fn;
    }
    // 第三种：默认 fallback
		const fn = () => {};
		return fn;
	}
  ```

  处理过程有三种：

  1. cacheGroups 是**函数**，根据形参的个数，来决定返回包裹后的 cacheGroups 还是配置的 cacheGroups；

  2. cacheGroups 是**对象**，返回一个函数，当调用函数的时候，会循环所有的 key-value 键值对，处理逻辑如下：

  ```js
  // 1. option 为 false 来禁用 webpack 默认 cacheGroups 分组
  module.exports = {
    //...
    optimization: {
      splitChunks: {
        cacheGroups: {
          default: false,
          vendors: false
        }
      }
    }
  };

  // 2. option 为正则或者字符串
  {
    cacheGroups: {
      common: 'common-',
    }
    // 变成
    cacheGroups: {
      common: {
        test: 'common-'
      }
    }
  }

  // 3. option 为函数，官方文档并没有提及到，再次吐槽一下官方文档
  {
    cacheGroups: {
      common () {
        return ({
          name: 'abc',
          chunks: 'initial'
        })
      },
    }
  }

  // 4. 根据 option.test 来返回 cacheGroups 分组结果
  static checkTest(test, module) {
		if (test === undefined) return true;
		if (typeof test === "function") {
			if (test.length !== 1) {
				return test(module, module.getChunks());
			}
			return test(module);
		}
		if (typeof test === "boolean") return test;
		if (typeof test === "string") {
			if (
				module.nameForCondition &&
				module.nameForCondition().startsWith(test)
			) {
				return true;
			}
			for (const chunk of module.chunksIterable) {
				if (chunk.name && chunk.name.startsWith(test)) {
					return true;
				}
			}
			return false;
		}
		if (test instanceof RegExp) {
			if (module.nameForCondition && test.test(module.nameForCondition())) {
				return true;
			}
			for (const chunk of module.chunksIterable) {
				if (chunk.name && test.test(chunk.name)) {
					return true;
				}
			}
			return false;
		}
		return false;
  }
  
  // 4.1 test不存在，代表所有 module 都能加入这个分组
  // 4.2 module 能否加入这个分组取决于 test 的布尔值
  // 4.3 test 为字符串或者正则，校验 module 的路径名称以及含有 module 的 chunks 的名称，满足任意条件即可
  ```

  3. 返回一个空函数

  getCacheGroups 的作用就是**获取对应 module 命中了哪个 cacheGroup 分组**，当然同一个 module 可以命中多个分组，后续会有优先级的判断。


### 二. 钩入 compilation.hooks.optimizeChunksAdvanced

```js
compilation.hooks.optimizeChunksAdvanced.tap(
  "SplitChunksPlugin",
  chunks => {
    // ...
  })
```

optimizeChunksAdvanced hook 触发的时机是在调用 compilation.seal() 内部，seal 是一个非常重要的节点，这个阶段 webpack 已经根据配置的 entry 顺藤摸瓜，解析完所有的 modules，在 seal 内部会有各种各样的优化，同时也触发了各种各样优化的钩子，按照顺序大致分为以下的种类。

```js
// 第一步 触发 compilation.hooks.seal

// 第二步 触发关于优化 Dependencies 的所有钩子
optimizeDependenciesBasic -> optimizeDependencies -> optimizeDependenciesAdvanced -> afterOptimizeDependencies

// 第三步 先根据 entrypoints(webpack 所有的入口都会对应各自的 entrypoints) 生成对应的 chunks, chunkGroups 等等，接着调用 buildChunkGraph() 来构建 webpack 的 graph，这一步是最复杂的，其中 modules, chunks, chunkGroups 之间会形成 “图” 结构

// 第四步 触发关于优化 Modules 的所有钩子
optimizeModulesBasic -> optimizeModules -> optimizeModulesAdvanced -> afterOptimizeModules

// 第五步 触发关于优化 Chunks 的所有钩子
optimizeChunksBasic -> optimizeChunks -> optimizeChunksAdvanced -> afterOptimizeChunks

// 后续的暂且不用关注...
```

从上面钩子的触发顺序来看，进入到 splitChunksPlugin 的时机是在构建 graph 结构之后，在这个时机，module 已经知道自己被哪些 chunk 依赖了，现在要做的事情就是从这些 chunk 里面，把 module 分离出来，组成若干个新 chunk，并且新老 chunk 要建立一定的联系，这样最后在将 chunk 转成 code 的时候才能知道 chunk 之间的依赖顺序，从而保证运行时的 js 不报错。下面来看看具体的逻辑：

### 三. compilation.hooks.optimizeChunksAdvanced 的 handler 剖析

handler 的主要的逻辑可以划分为以下几个部分：

1. **标记 splitChunks 在多次构建过程中只触发一次**

    ```js
    if (alreadyOptimized) return;
    alreadyOptimized = true;
    ```

    只有在 watch 的模式下，文件多次被修改，才会产生多次构建，进而多次触发 handler，最后被这个变量拦截。
    当然这个不是绝对的，如果你使用了 AggressiveSplittingPlugin 可以触发 unseal 操作，重置 alreadyOptimized 为 false。

    ```js
    compilation.hooks.unseal.tap("SplitChunksPlugin", () => {
      alreadyOptimized = false;
    });
    ```

    这个步骤不是我们关注的核心逻辑，继续往下。

2. **根据 module 的被引用的 chunk 和 被引用的 chunk 数量分组**

    ```js
    // 先分给 chunk 各自的序号
    const indexMap = new Map();
    let index = 1;
    for (const chunk of chunks) {
      indexMap.set(chunk, index++);
    }

    const getKey = chunks => {
      return Array.from(chunks, c => indexMap.get(c))
        .sort(compareNumbers)
        .join();
    };

    // 根据 module 与 chunks 的引用关系，记录在 chunkSetsInGraph
    // 比如 moduleA 被 chunk1 和 chunk2 同时引用的话，就是如下结构
    // { "1,2": [chunk1, chunk2] }
    // 这样做的目的是为了后期包含 moduleA 的 newChunk 的时候，建立 chunk1、chunk2 与 newChunk 的联系
    // 这样才能输出逻辑正确的 js 文件
    const chunkSetsInGraph = new Map();
    for (const module of compilation.modules) {
      const chunksKey = getKey(module.chunksIterable);
      if (!chunkSetsInGraph.has(chunksKey)) {
        chunkSetsInGraph.set(chunksKey, new Set(module.chunksIterable));
      }
    }

    // 根据 module 被 chunk 引用的数量分组，用来后期 cacheGroups.minChunks 的校验
    // 比如 moduleA 属于 chunk1，moduleB 属于 chunk2，结构如下
    // { "1" : [ [chunk1] ], "2" : [ [chunk2] ]}
    const chunkSetsByCount = new Map();
    for (const chunksSet of chunkSetsInGraph.values()) {
      const count = chunksSet.size;
      let array = chunkSetsByCount.get(count);
      if (array === undefined) {
        array = [];
        chunkSetsByCount.set(count, array);
      }
      array.push(chunksSet);
    }
    ```

    知道 module 被哪些 chunks 依赖之后，后期就能将 module 加入到满足条件的 cacheGroups 分组对象当中。

3. **遍历所有 modules，将 module 划分到对应的 cacheGroups 分组对象，最后存入 chunksInfoMap**

    在这个过程中，同一个 module 可能满足多个 cacheGroups 分组条件，这个没关系，后期会对 chunksInfoMap 做优先级的处理。

    ```js
    for (const module of compilation.modules) {
      // 3.1 ...
      // 3.2 ...
      // 3.3 ...
    }
    ```

    - 3.1 获取 module 匹配的 cacheGroups 分组

    ```js
    // getCacheGroups 来自于初始化阶段返回的函数
    let cacheGroups = this.options.getCacheGroups(module);
    if (!Array.isArray(cacheGroups) || cacheGroups.length === 0) {
      continue;
    }
    ```

    - 3.2 获取 module 可能被 chunks 引用的所有组合

    ```js
    const combinationsCache = new Map(); // Map<string, Set<Chunk>[]>
    const getCombinations = key => {
      const chunksSet = chunkSetsInGraph.get(key);
      var array = [chunksSet];
      if (chunksSet.size > 1) {
        for (const [count, setArray] of chunkSetsByCount) {
          // 遍历所有的子集
          if (count < chunksSet.size) {
            for (const set of setArray) {
              if (isSubset(chunksSet, set)) {
                array.push(set);
              }
            }
          }
        }
      }
      return array;
    };

    const chunksKey = getKey(module.chunksIterable);
    let combs = combinationsCache.get(chunksKey);
    if (combs === undefined) {
      combs = getCombinations(chunksKey);
      combinationsCache.set(chunksKey, combs);
    }
    ```

    getCombinations 内部有一个 for 循环特别难理解，为什么要加这么一段代码呢，得想清一些问题，举个例子

    ```markup
    1. 假如有三个 webpack 入口 entry1, entry2, entry3
    2. entry1 依赖了 module1, module2
    3. entry2 依赖了 module1, module2
    4. entry3 依赖了 module2

    如果 module2 的体积小于 cacheGroups 的 minSize 限制，会导致 module2 不能加入分组，
    然而如果 module2 + module1 的体积满足其他分组的 minSize，那么 module2 是可以加入到其他分组，因为 module2 可以作为三个 chunk 的共同依赖，也可以是 chunk1 和 chunk2 的共同依赖。

    换个角度来思考这个问题，module2 因为被三个 entry chunk 依赖，但是由于 minSize 的限制导致无法单独输出到一个 chunk
    但是 module1 和 module2 可以绑定在一起，作为 entry1 和 entry2 的共同依赖，输出到另外一个 chunk
    这也就是 isSubset 逻辑必不可少的原因
    ```

    - 3.3 根据 cacheGroups 配置决定 module 加入到哪些分组对象

    *第一步，cacheGroups 的配置项合并 splitChunks top-level 级别的“全局配置”，传给 addModuleToChunksInfoMap*

    ```js
    for (const cacheGroupSource of cacheGroups) {
      const minSize =
        cacheGroupSource.minSize !== undefined
          ? cacheGroupSource.minSize
          : cacheGroupSource.enforce
          ? 0
          : this.options.minSize;
      const enforceSizeThreshold =
        cacheGroupSource.enforceSizeThreshold !== undefined
          ? cacheGroupSource.enforceSizeThreshold
          : cacheGroupSource.enforce
          ? 0
          : this.options.enforceSizeThreshold;
      const cacheGroup = {
        key: cacheGroupSource.key,
        priority: cacheGroupSource.priority || 0,
        chunksFilter:
          cacheGroupSource.chunksFilter || this.options.chunksFilter,
        minSize,
        minSizeForMaxSize:
          cacheGroupSource.minSize !== undefined
            ? cacheGroupSource.minSize
            : this.options.minSize,
        enforceSizeThreshold,
        maxSize:
          cacheGroupSource.maxSize !== undefined
            ? cacheGroupSource.maxSize
            : cacheGroupSource.enforce
            ? 0
            : this.options.maxSize,
        minChunks:
          cacheGroupSource.minChunks !== undefined
            ? cacheGroupSource.minChunks
            : cacheGroupSource.enforce
            ? 1
            : this.options.minChunks,
        maxAsyncRequests:
          cacheGroupSource.maxAsyncRequests !== undefined
            ? cacheGroupSource.maxAsyncRequests
            : cacheGroupSource.enforce
            ? Infinity
            : this.options.maxAsyncRequests,
        maxInitialRequests:
          cacheGroupSource.maxInitialRequests !== undefined
            ? cacheGroupSource.maxInitialRequests
            : cacheGroupSource.enforce
            ? Infinity
            : this.options.maxInitialRequests,
        getName:
          cacheGroupSource.getName !== undefined
            ? cacheGroupSource.getName
            : this.options.getName,
        filename:
          cacheGroupSource.filename !== undefined
            ? cacheGroupSource.filename
            : this.options.filename,
        automaticNameDelimiter:
          cacheGroupSource.automaticNameDelimiter !== undefined
            ? cacheGroupSource.automaticNameDelimiter
            : this.options.automaticNameDelimiter,
        reuseExistingChunk: cacheGroupSource.reuseExistingChunk,
        _validateSize: minSize > 0,
        _conditionalEnforce: enforceSizeThreshold > 0
      };
    }
    ```

    *第二步：将所有的分组对象都加入到 chunksInfoMap*

    ```js
    // 遍历对该 module 引用的 chunks 的所有组合
    // 目的就是把 module 划分到符合条件的 cacheGroups 分组
    for (const chunkCombination of combs) {
      // 如果引用当前 module 的 chunks 数量小于 minChunks
      if (chunkCombination.size < cacheGroup.minChunks) continue;

      const {
        chunks: selectedChunks,
        key: selectedChunksKey
      } = getSelectedChunks(
        chunkCombination,
        cacheGroup.chunksFilter
      );

      addModuleToChunksInfoMap(
        cacheGroup,
        cacheGroupIndex,
        selectedChunks,
        selectedChunksKey,
        module
      );
    }

    // 根据 chunksSet 缓存，提升性能
    const getSelectedChunks = (chunks, chunkFilter) => {
      let entry = selectedChunksCacheByChunksSet.get(chunks);
      if (entry === undefined) {
        entry = new WeakMap();
        selectedChunksCacheByChunksSet.set(chunks, entry);
      }
      /** @type {SelectedChunksResult} */
      let entry2 = entry.get(chunkFilter);
      if (entry2 === undefined) {
        /** @type {Chunk[]} */
        const selectedChunks = [];
        for (const chunk of chunks) {
          if (chunkFilter(chunk)) selectedChunks.push(chunk);
        }
        entry2 = {
          chunks: selectedChunks,
          key: getKey(selectedChunks)
        };
        entry.set(chunkFilter, entry2);
      }
      return entry2;
    };

    ```

    getSelectedChunks 的作用就是缓存，防止重复获取已经取过的 chunks 组合，内部的  chunkFilter 就是过滤不符合条件的 chunk，举个例子，假如 module 被 initial 和 async chunk 同时依赖，而 cacheGroups 配置的又是 `'initial'`，那么 async chunk 就会被剔除，换句话来说，async chunk 自己就会打包一份 module 代码进去，而不是依赖由 module 组成的 newChunk。

    addModuleToChunksInfoMap 是整个插件中特别重要的一个环节，它缓存了所有的分组信息，每个分组信息之后对应一个 newChunk。

    ```js
    const chunksInfoMap = new Map();

    const addModuleToChunksInfoMap = (
      cacheGroup,
      cacheGroupIndex,
      selectedChunks,
      selectedChunksKey,
      module
    ) => {
      // 校验 minChunks 配置
      if (selectedChunks.length < cacheGroup.minChunks) return;
      // 获取 split chunk 的名称
      const name = cacheGroup.getName(
        module,
        selectedChunks,
        cacheGroup.key
      );
      const key =
        cacheGroup.key +
        (name ? ` name:${name}` : ` chunks:${selectedChunksKey}`);
      // 根据 cacheGroups 的分组对象配置，划分对应的分组
      // module 会丢进 modules， 引用该 module 的 chunk 会丢进 chunks
      // 记录该分组的 size
      let info = chunksInfoMap.get(key);
      if (info === undefined) {
        chunksInfoMap.set(
          key,
          (info = {
            modules: new SortableSet(undefined, sortByIdentifier),
            cacheGroup,
            cacheGroupIndex,
            name,
            size: 0,
            chunks: new Set(),
            reuseableChunks: new Set(),
            chunksKeys: new Set()
          })
        );
      }
      const oldSize = info.modules.size;
      info.modules.add(module);
      if (info.modules.size !== oldSize) {
        info.size += module.size();
      }
      const oldChunksKeysSize = info.chunksKeys.size;
      info.chunksKeys.add(selectedChunksKey);
      if (oldChunksKeysSize !== info.chunksKeys.size) {
        for (const chunk of selectedChunks) {
          info.chunks.add(chunk);
        }
      }
    };
    ```

    每一个 cacheGroups 分组的 info 数据结构如下：

    ```js
    (info = {
      modules: new SortableSet(undefined, sortByIdentifier),
      cacheGroup,
      cacheGroupIndex,
      name,
      size: 0,
      chunks: new Set(),
      reuseableChunks: new Set(),
      chunksKeys: new Set()
    })
    ```

    在 info 里面存放了满足该分组条件的 modules，以及引用了这些 modules 的 chunks，还记录这个即将生成的 newChunk 的 size 信息，当然也有可能因为 minSize 和 maxSize 限制导致这个 newChunk 无法生成，胎死腹中！

    ok，准备好所有分组信息之后，继续往下走～


4. **剔除体积未达到 minSize 的分组**

    ```js
    for (const pair of chunksInfoMap) {
      const info = pair[1];
      if (
        info.cacheGroup._validateSize &&
        info.size < info.cacheGroup.minSize
      ) {
        chunksInfoMap.delete(pair[0]);
      }
    }
    ```

5. **根据优先级找出满足条件的 cacheGroups 分组**

    ```js
    while (chunksInfoMap.size > 0) {
      // 5.1 ...
      // 5.2 ...
      // 5.3 ...
      // 5.4 ...
    }
    ```

    - 5.1 找出优先级最高的分组

    compareEntries 会依据 cacheGroups 的 info 给分组对象排序，优先级如下：

    priority > chunksSize > info.size > cacheGroupIndex > modulesSize > moduleIdentifier

    一般来说我们都会配置 priority。

    ```js
    let bestEntryKey;
    let bestEntry;
    // 不断的对比优先级
    for (const pair of chunksInfoMap) {
      const key = pair[0];
      const info = pair[1];
      if (bestEntry === undefined) {
        bestEntry = info;
        bestEntryKey = key;
      } else if (compareEntries(bestEntry, info) < 0) {
        bestEntry = info;
        bestEntryKey = key;
      }
    }
    // 得到优先级最高的分组
    const item = bestEntry;
    chunksInfoMap.delete(bestEntryKey);

    const compareEntries = (a, b) => {
      // 1. by priority
      const diffPriority = a.cacheGroup.priority - b.cacheGroup.priority;
      if (diffPriority) return diffPriority;
      // 2. by number of chunks
      const diffCount = a.chunks.size - b.chunks.size;
      if (diffCount) return diffCount;
      // 3. by size reduction
      const aSizeReduce = a.size * (a.chunks.size - 1);
      const bSizeReduce = b.size * (b.chunks.size - 1);
      const diffSizeReduce = aSizeReduce - bSizeReduce;
      if (diffSizeReduce) return diffSizeReduce;
      // 4. by cache group index
      const indexDiff = b.cacheGroupIndex - a.cacheGroupIndex;
      if (indexDiff) return indexDiff;
      // 5. by number of modules (to be able to compare by identifier)
      const modulesA = a.modules;
      const modulesB = b.modules;
      const diff = modulesA.size - modulesB.size;
      if (diff) return diff;
      // 6. by module identifiers
      modulesA.sort();
      modulesB.sort();
      const aI = modulesA[Symbol.iterator]();
      const bI = modulesB[Symbol.iterator]();
      while (true) {
        const aItem = aI.next();
        const bItem = bI.next();
        if (aItem.done) return 0;
        const aModuleIdentifier = aItem.value.identifier();
        const bModuleIdentifier = bItem.value.identifier();
        if (aModuleIdentifier > bModuleIdentifier) return -1;
        if (aModuleIdentifier < bModuleIdentifier) return 1;
      }
    };
    ```

    - 5.2 找出优先级最高的分组，并且依据分组的 info 生成 newChunk
    
    *第一步：判断是否有可复用的 chunk*

    ```js
    let chunkName = item.name;
    let newChunk;
    let isReused = false;
    // 复用现有的 chunk，绝大部分情况不会走进内部逻辑
    // 因为触发的条件非常苛刻，下面会讲为什么
    if (item.cacheGroup.reuseExistingChunk) {
      outer: for (const chunk of item.chunks) {
        // 如果复用的 chunk 内部含有的模块数量和分组的模块数量不同，则不复用
        if (chunk.getNumberOfModules() !== item.modules.size) continue;
        // 如果复用的 chunk 是含有 entryModule，也就是我们配置的 webpack 入口模块，则不能拿来复用
        // 为什么呢？因为入口模块可能含有 webpack runtime bootstrap 代码，会导致复用的 chunk 无法集成现有的 entry chunk
        if (chunk.hasEntryModule()) continue;
        // 接着校验复用的 chunk 必须含有所有的分组的模块，因为上一步只是保证了数量一模一样
        // 综合来看就是必须有一个 asyncChunk，并且其中已有的 modules 与划分到 cacheGroups 分组里面的 modules 相同，这样才能保证复用 chunk 成功
        for (const module of item.modules) {
          if (!chunk.containsModule(module)) continue outer;
        }
        if (!newChunk || !newChunk.name) {
          newChunk = chunk;
        } else if (
          chunk.name &&
          chunk.name.length < newChunk.name.length
        ) {
          newChunk = chunk;
        } else if (
          chunk.name &&
          chunk.name.length === newChunk.name.length &&
          chunk.name < newChunk.name
        ) {
          newChunk = chunk;
        }
        chunkName = undefined;
        // 标记为复用 chunk
        isReused = true;
      }
    }

    // 过滤掉可能复用的 chunk
    const selectedChunks = Array.from(item.chunks).filter(chunk => {
      return (
        (!chunkName || chunk.name !== chunkName) && chunk !== newChunk
      );
    });
    ```

    什么场景下才会使得复用一个已有的 chunk 成功呢，这个与早期的 require.ensure 的用法有关，比如以下场景：

    ```js
    // entry.js webpack 入口模块
    require.ensure(
      [],
      function(require) {
        require("./a")
      },
      "a"
    );

    // a.js
    module.exports = "a";
    ```

    a 模块属于 async chunk，如果要将 a 模块分离出来并且 reuseExistingChunk 为 true 的情况下，由于 async chunk 没有含有 entryModule，那么分离出来的 chunk 会直接复用已有的 async chunk。这个场景目前来说非常少见了，我们一般都用动态的 import 语法，不会遇到这个情况。

    *第二步：校验即将分离出 newChunk 的 usedChunks 是否满足 maxInitialRequests 和 maxAsyncRequests*

    ```js
    const enforced =
      item.cacheGroup._conditionalEnforce &&
      item.size >= item.cacheGroup.enforceSizeThreshold;

    if (selectedChunks.length === 0) continue;

    const usedChunks = new Set(selectedChunks);

    // 如果 maxInitialRequests 和 maxAsyncRequests 都是有理数
    if (
      !enforced &&
      (Number.isFinite(item.cacheGroup.maxInitialRequests) ||
        Number.isFinite(item.cacheGroup.maxAsyncRequests))
    ) {
      for (const chunk of usedChunks) {
        // 根据 usedChunk 的类型，决定用哪一个配置项来校验
        // initial chunk 则校验 maxInitialRequests
        // async chunk 则校验 maxAsyncRequests
        const maxRequests = chunk.isOnlyInitial()
          ? item.cacheGroup.maxInitialRequests
          : chunk.canBeInitial()
          ? Math.min(
              item.cacheGroup.maxInitialRequests,
              item.cacheGroup.maxAsyncRequests
            )
          : item.cacheGroup.maxAsyncRequests;
        if (
          isFinite(maxRequests) &&
          getRequests(chunk) >= maxRequests
        ) {
          // 如果超过了对应的配置，那么剔除 chunk
          // 换句话来说 newChunk 将不会从这个 chunk 分离
          usedChunks.delete(chunk);
        }
      }
    }

    // 为了加载这个 chunk，造成的总下载量
    const getRequests = chunk => {
      let requests = 0;
      for (const chunkGroup of chunk.groupsIterable) {
        requests = Math.max(requests, chunkGroup.chunks.length);
      }
      return requests;
    };
    ```

    以上的 maxInitialRequests 和 maxAsyncRequests 配置可能让你很疑惑，要完全理解这个，要从 webpack 的运行时来理解。

    首先 splitChunks 的作用就是**从已有的 chunks 将 module 分离出去（**上述的 usedChunks**），形成一个 newChunk，usedChunks 再依赖 newChunk 的加载即可**。

    假如是一个 entryChunk 分离了 newChunk，这个 entryChunk 必定要等待 newChunk 加载完成，打出来的代码类似于如下：

    ```js
    (function(modules) { // webpackBootstrap 
      /******/ 	// add entry module to deferred list
      /******/ 	deferredModules.push(["newChunk"]);
      /******/ 	// run deferred modules when ready
      /******/ 	return checkDeferredModules();
    })({})
    ```

    也就是说，你得手动在 script 里面引入 newChunk 这个 js，entryChunk 才会执行内部逻辑，这也就是起名为 maxInitialRequests 的原因。

    假如是一个 asyncChunk 分离了 newChunk, 并且 asyncChunk 被 entryChunk 消费，那么 entryChunk 会利用两个 \_\_webpack_require\_\_.e 加载 asyncChunk 和 newChunk，并且等到全部的依赖加载完毕才执行内部逻辑，其实也很符合我们的预期，首先 asyncChunk 是异步请求的，现在 asyncChunk 内部分离了 module 组成了 newChunk，那么 entryChunk 作为消费者，必须等待两个 chunk 同时 ready，类似的代码如下

    ```js

    (function(modules) { // webpackBootstrap 
    })({
      "./entry.js": (function(module, __webpack_exports__, __webpack_require__) {
        // 保证两个 chunk 同时加载完毕 
        Promise.all([__webpack_require__.e("asyncChunk"), __webpack_require__.e("newChuk")])
      })
    })
    ```

    这两个 chunk 是代码运行时通过 script 加载的，所以起名为 maxAsyncRequests。

    好吧，想要理解这些配置，必须得对 webpack 有很大程度的掌握，所以说文档不好写啊～

    *第三步：检查是否有 chunks 被剔除，剔除了 chunks 会导致 newChunk 生成失败*

    ```js
    // 校验 chunk 是含有分组信息的 module，否则剔除 chunk，什么情况下会发生呢？
    // 首先同一个 module 是可以被多个 cacheGroups 分组归纳进去，并且有优先级
    // 假如 module 已经伴随着上一轮优先级更高的 newChunk 分割出去了，
    // 则不需要再生成含有 module 的 newChunk 了
    outer: for (const chunk of usedChunks) {
      for (const module of item.modules) {
        if (chunk.containsModule(module)) continue outer;
      }
      usedChunks.delete(chunk);
    }

    // 可能在第二步 或者 outer 这个逻辑里面剔除了 chunk
    if (usedChunks.size < selectedChunks.length) {
      // 再次校验 chunks 的数量是否符合 minChunks
      if (usedChunks.size >= item.cacheGroup.minChunks) {
        const chunksArr = Array.from(usedChunks);
        // 重新生成新的 cacheGroups 分组
        for (const module of item.modules) {
          addModuleToChunksInfoMap(
            item.cacheGroup,
            item.cacheGroupIndex,
            chunksArr,
            getKey(usedChunks),
            module
          );
        }
      }
      // 放弃这次 newChunk 的生成，进行下一轮 cacheGroups 分组的处理
      continue;
    }
    ```

    - 5.3 根据 cacheGroups 分组的 info 生成对应的 newChunk

    ```js
    // 首先生成 empty chunk
    if (!isReused) {
      newChunk = compilation.addChunk(chunkName);
    }
    
    // 建立 usedChunks 与即将分离的 newChunk 的联系
    for (const chunk of usedChunks) {
      // Add graph connections for splitted chunk
      chunk.split(newChunk);
    }

    // 记录 chunk 的生成原因
    newChunk.chunkReason = isReused
      ? "reused as split chunk"
      : "split chunk";
    if (item.cacheGroup.key) {
      newChunk.chunkReason += ` (cache group: ${item.cacheGroup.key})`;
    }
    // 如果新生成的 chunk 与入口 chunk 同名，那么移除入口 chunk，多个 entry 入口打包的时候才会遇见
    if (chunkName) {
      newChunk.chunkReason += ` (name: ${chunkName})`;
      const entrypoint = compilation.entrypoints.get(chunkName);
      if (entrypoint) {
        compilation.entrypoints.delete(chunkName);
        entrypoint.remove();
        newChunk.entryModule = undefined;
      }
    }
    // 覆盖 newChunk 的名称，此配置项只作用在 initial chunks 分离出来的 newChunk
    if (item.cacheGroup.filename) {
      if (!newChunk.isOnlyInitial()) {
        throw new Error(
          "SplitChunksPlugin: You are trying to set a filename for a chunk which is (also) loaded on demand. " +
            "The runtime can only handle loading of chunks which match the chunkFilename schema. " +
            "Using a custom filename would fail at runtime. " +
            `(cache group: ${item.cacheGroup.key})`
        );
      }
      newChunk.filenameTemplate = item.cacheGroup.filename;
    }
    // 如果是新生成的 chunk
    if (!isReused) {
      for (const module of item.modules) {
        if (typeof module.chunkCondition === "function") {
          // 如果 module 是 ExternalModule，并且 newChunk 是从 async chunk 分离出来的
          // 不需要把 module 丢进 newChunk
          if (!module.chunkCondition(newChunk)) continue;
        }
        // cacheGroups 分组 info 的 modules 全部丢进 newChunk
        GraphHelpers.connectChunkAndModule(newChunk, module);
        // 断开 module 与 原有 chunk 的连接，
        // 连接关系已经通过 chunk.split(newChunk) 建立了
        // 实际上 usedChunk 和 newChunk 作为兄弟节点，存放在 usedChunk 的 chunksGroup
        // 方便后期 render -> code 的转化
        for (const chunk of usedChunks) {
          chunk.removeModule(module);
          module.rewriteChunkInReasons(chunk, [newChunk]);
        }
      }
    } else {
      // 如果是复用已有的 chunk
      for (const module of item.modules) {
        for (const chunk of usedChunks) {
          chunk.removeModule(module);
          module.rewriteChunkInReasons(chunk, [newChunk]);
        }
      }
    }
    ```

    5.3 的代码逻辑主要是生成 newChunk，建立 modules 与 newChunk 的连接，并且断开 modules 与原先的 usedChunks 的连接，同时 newChunk 与 usedChunks 作为兄弟节点保存在 chunksGroup 里面，代表着 newChunk 是从 usedChunks 分离出来的。
    
    如果 usedChunk 的类型是 `'inital'`，那么在生成 webpack runtime bootstrap 的时候会有以下类似的代码：

    ```js
    deferredModules.push(["newChunk"]);
    // run deferred modules when ready
    return checkDeferredModules();
    ```

    如果 usedChunk 的类型是 `'async'`，那么消费这个 async chunk 的代码的生成形式如下：

    ```js
    // newChunk 是从 asyncChunk split 出来的
    Promise.all([__webpack_require__.e('./asyncChunk'), __webpack_require__.e('./newChunk')]).then((/* ... */))
    ```

    - 5.4 将该分组下面的 modules 从其他的分组中剔除，等待最后的 maxSize 校验

    ```js
    // 配置分组的最大体积限制
    if (item.cacheGroup.maxSize > 0) {
      const oldMaxSizeSettings = maxSizeQueueMap.get(newChunk);
      maxSizeQueueMap.set(newChunk, {
        minSize: Math.max(
          oldMaxSizeSettings ? oldMaxSizeSettings.minSize : 0,
          item.cacheGroup.minSizeForMaxSize
        ),
        maxSize: Math.min(
          oldMaxSizeSettings ? oldMaxSizeSettings.maxSize : Infinity,
          item.cacheGroup.maxSize
        ),
        automaticNameDelimiter: item.cacheGroup.automaticNameDelimiter,
        keys: oldMaxSizeSettings
          ? oldMaxSizeSettings.keys.concat(item.cacheGroup.key)
          : [item.cacheGroup.key]
      });
    }

    // 既然 module 已经跟着这一轮的 newChunk 输出了，
    // 后期所有的分组处理应该剔除当前 module
    for (const [key, info] of chunksInfoMap) {
      if (isOverlap(info.chunks, usedChunks)) {
        const oldSize = info.modules.size;
        for (const module of item.modules) {
          info.modules.delete(module);
        }
        if (info.modules.size !== oldSize) {
          if (info.modules.size === 0) {
            chunksInfoMap.delete(key);
            continue;
          }
          info.size = getModulesSize(info.modules);
          if (
            info.cacheGroup._validateSize &&
            info.size < info.cacheGroup.minSize
          ) {
            chunksInfoMap.delete(key);
          }
          if (info.modules.size === 0) {
            chunksInfoMap.delete(key);
          }
        }
      }
    }
    ```

6. **所有的 chunks 已经 ready，进行最后的 maxSize 的校验**

    这一步的话，可以配置 maxSize 配置，对 chunks 再进行更细粒度的拆分，不过我们无法做到精确的 minSize 和 maxSize 的控制，因为 module 已经是最小的可拆分单元，一旦 module 不可再拆分的话，打出来的 chunks 是可能违背 minSize 和 maxSize 的条件的。

    ```js
    // 对所有的 chunks 进行处理(包括已有和新生成的)
    for (const chunk of compilation.chunks.slice()) {
      // 6.1 ...
      // 6.2 ...
      // 6.3 ...
    }
    ```

    - 6.1 处理 maxSize 和 minSize

    ```js
    const { minSize, maxSize, automaticNameDelimiter, keys } =
        maxSizeQueueMap.get(chunk) || this.options.fallbackCacheGroup;
        // 如果不设置 maxSize 直接退出
    if (!maxSize) continue;
    // minxSize 和 maxSize 应该是一个合理的值，要不然会抛出一个 warning
    // 如果不合理， webpack 会进行强行的干预
    if (minSize > maxSize) {
      const warningKey = `${keys && keys.join()} ${minSize} ${maxSize}`;
      if (!incorrectMinMaxSizeSet.has(warningKey)) {
        incorrectMinMaxSizeSet.add(warningKey);
        compilation.warnings.push(
          new MinMaxSizeWarning(keys, minSize, maxSize)
        );
      }
    }
    ```

    - 6.2 对超过 maxSize 的 chunk 再进行分割，直到割无可割！

    ```js
    const results = deterministicGroupingForModules({
      maxSize: Math.max(minSize, maxSize),
      minSize,
      items: chunk.modulesIterable,
      getKey(module) {
        const ident = contextify(
          compilation.options.context,
          module.identifier()
        );
        const name = module.nameForCondition
          ? contextify(
              compilation.options.context,
              module.nameForCondition()
            )
          : ident.replace(/^.*!|\?[^?!]*$/g, "");
        const fullKey =
          name + automaticNameDelimiter + hashFilename(ident);
        return fullKey.replace(/[\\/?]/g, "_");
      },
      getSize(module) {
        return module.size();
      }
    });
    results.sort((a, b) => {
      if (a.key < b.key) return -1;
      if (a.key > b.key) return 1;
      return 0;
    });
    ```

    webpack 官方称这个算法是 `deterministic`，具体的原因也不知道，只能看看算法的实现。

    ```js
    class Node {
      constructor(item, key, size) {
        this.item = item;
        this.key = key;
        this.size = size;
      }
    }
    const similarity = (a, b) => {
      const l = Math.min(a.length, b.length);
      let dist = 0;
      for (let i = 0; i < l; i++) {
        const ca = a.charCodeAt(i);
        const cb = b.charCodeAt(i);
        dist += Math.max(0, 10 - Math.abs(ca - cb));
      }
      return dist;
    };

    class Group {
      constructor(nodes, similarities) {
        this.nodes = nodes;
        this.similarities = similarities;
        this.size = nodes.reduce((size, node) => size + node.size, 0);
        this.key = undefined;
      }
    }

    module.exports = ({ maxSize, minSize, items, getSize, getKey }) => {
      const result = [];

      // 将 module 转化成 Node 的类型，同时记录 key, size
      const nodes = Array.from(
        items,
        item => new Node(item, getKey(item), getSize(item))
      );

      const initialNodes = [];

      // 根据 key 来排序
      nodes.sort((a, b) => {
        if (a.key < b.key) return -1;
        if (a.key > b.key) return 1;
        return 0;
      });

      for (const node of nodes) {
        // 既然 module 已经比 maxSize 还大，我们无可奈何，直接作为新分组
        if (node.size >= maxSize) {
          result.push(new Group([node], []));
        } else {
          // 推入待处理的数组
          initialNodes.push(node);
        }
      }

      if (initialNodes.length > 0) {
        // 根据 module 的 key 来计算相邻 module 的相似度
        // 模块的路径名称和模块名称都会影响相似度
        const similarities = [];
        for (let i = 1; i < initialNodes.length; i++) {
          const a = initialNodes[i - 1];
          const b = initialNodes[i];
          similarities.push(similarity(a.key, b.key));
        }

        // 初始化一个 Group 对象，对象内部记录了所有 modules 的体积综合
        const initialGroup = new Group(initialNodes, similarities);

        // 如果当前 Group 的体积比 minSize 还小
        if (initialGroup.size < minSize) {
          // 直接找到最小体积的分组，然后把 module 全部塞进去，可能会违背 maxSize 的限制，不过已经无所谓了
          if (result.length > 0) {
            const smallestGroup = result.reduce((min, group) =>
              min.size > group.size ? group : min
            );
            for (const node of initialGroup.nodes) smallestGroup.nodes.push(node);
            smallestGroup.nodes.sort((a, b) => {
              if (a.key < b.key) return -1;
              if (a.key > b.key) return 1;
              return 0;
            });
          } else {
            // 如果目前没有最小体积的分组，虽然比 minSize 还小，我们依然无可奈何，强行将它输出成一个分组
            result.push(initialGroup);
          }
        } else {
          const queue = [initialGroup];

          while (queue.length) {
            const group = queue.pop();
            // 当前分组已经比 maxSize 还小，直接将它输出成一个分组
            if (group.size < maxSize) {
              result.push(group);
              continue;
            }

            // 从两端分别向中间靠近，找到它们的重叠区域
            let left = 0;
            let leftSize = 0;
            while (leftSize <= minSize) {
              leftSize += group.nodes[left].size;
              left++;
            }
            let right = group.nodes.length - 1;
            let rightSize = 0;
            while (rightSize <= minSize) {
              rightSize += group.nodes[right].size;
              right--;
            }

            // 如果产出交叉区域，直接将当前 group 作为一个分组
            if (left - 1 > right) {
              // can't split group while holding minSize
              // because minSize is preferred of maxSize we return
              // the group here even while it's too big
              // To avoid this make sure maxSize > minSize * 3
              result.push(group);
              continue;
            }
            // 如果未产生交叉区域，根据相似度最高的 similarity 作为分割点
            if (left <= right) {
              let best = left - 1;
              let bestSimilarity = group.similarities[best];
              for (let i = left; i <= right; i++) {
                const similarity = group.similarities[i];
                if (similarity < bestSimilarity) {
                  best = i;
                  bestSimilarity = similarity;
                }
              }
              left = best + 1;
              right = best;
            }

            // 先压右边区域，再压左边区域
            const rightNodes = [group.nodes[right + 1]];
            const rightSimilaries = [];
            for (let i = right + 2; i < group.nodes.length; i++) {
              rightSimilaries.push(group.similarities[i - 1]);
              rightNodes.push(group.nodes[i]);
            }
            queue.push(new Group(rightNodes, rightSimilaries));

            const leftNodes = [group.nodes[0]];
            const leftSimilaries = [];
            for (let i = 1; i < left; i++) {
              leftSimilaries.push(group.similarities[i - 1]);
              leftNodes.push(group.nodes[i]);
            }
            queue.push(new Group(leftNodes, leftSimilaries));
          }
        }
      }

      // 最后分组根据 key 排序
      result.sort((a, b) => {
        if (a.nodes[0].key < b.nodes[0].key) return -1;
        if (a.nodes[0].key > b.nodes[0].key) return 1;
        return 0;
      });

      // 重新给每个分组分配新的名称
      for (let i = 0; i < result.length; i++) {
        const group = result[i];
        const first = group.nodes[0];
        const last = group.nodes[group.nodes.length - 1];
        let name = getName(first.key, last.key);
        group.key = name;
      }

      // 返回结果
      return result.map(group => {
        return {
          key: group.key,
          items: group.nodes.map(node => node.item),
          size: group.size
        };
      });
    };

    ```

    其中最复杂的就是两端从中间前进的算法，根据 similarity 找到最好的分割点，在这之间，可能违背 minSize 和 maxSize 的配置，强行将某些 modules 输出成一个 chunk，不过我们也很少配置 maxSize，至于算法为什么这么写，我也百思不得其解，在我看来 similarity 的计算取决于 module 的名称和路径，感觉有点太随机了？

    - 6.3 重新生成新的细粒度的 chunk

    ```js
    for (let i = 0; i < results.length; i++) {
      const group = results[i];
      // 根据 hidePathInfo 决定是否对 chunkName 进行哈希
      const key = this.options.hidePathInfo
        ? hashFilename(group.key)
        : group.key;
      let name = chunk.name
        ? chunk.name + automaticNameDelimiter + key
        : null;
      if (name && name.length > 100) {
        name =
          name.slice(0, 100) +
          automaticNameDelimiter +
          hashFilename(name);
      }
      let newPart;
      // 将原本大体积的 chunk 分割成更细粒度的 chunk
      if (i !== results.length - 1) {
        newPart = compilation.addChunk(name);
        chunk.split(newPart);
        newPart.chunkReason = chunk.chunkReason;
        for (const module of group.items) {
          if (typeof module.chunkCondition === "function") {
            if (!module.chunkCondition(newPart)) continue;
          }
          GraphHelpers.connectChunkAndModule(newPart, module);
          chunk.removeModule(module);
          module.rewriteChunkInReasons(chunk, [newPart]);
        }
      } else {
        // 最后一个分割单元 chunk 直接复用大体积的 chunk
        newPart = chunk;
        chunk.name = name;
      }
    }
    ```

### 流程图

  梳理了一下流程图，大致如下：

  <img :src="$withBase('/assets/splitChunks_flowchart.png')" height="500" />

### 总结

  整体逻辑非常清晰，但前提是要对 webpack 有一定的了解，否则一头雾水。里面也用了 deterministicGrouping 的算法，从问题的本质来看是将一组总和超过 maxSize 的数字，进行二次分割，尽可能的使得子分组的大小接近 maxSize，当然 webpack 似乎考虑的更多，官方的原话如下：
  
  > The algorithm is deterministic and changes to the modules will only have local impact. So that it is usable when using long term caching and doesn't require records

  似乎跟 seal 阶段的 record* hooks 有关，不太确定，可能等到对 webpack 有一个全面的认知才能够猜得到作者的意图吧。