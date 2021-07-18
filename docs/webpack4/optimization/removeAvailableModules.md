# removeAvailableModules

removeAvailableModules 配置用来优化 chunks，如果 chunks 的 modules 已经在 父 chunks 加载过了，那么可以将这些 modules 从 chunks 移除。在生产环境下默认开启该配置，相当于使用了 RemoveParentModulesPlugin 插件。

## 源码

```js
class RemoveParentModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("RemoveParentModulesPlugin", compilation => {
			const handler = (chunks, chunkGroups) => {
        // ...
			};
			compilation.hooks.optimizeChunksBasic.tap(
				"RemoveParentModulesPlugin",
				handler
			);
			compilation.hooks.optimizeExtractedChunksBasic.tap(
				"RemoveParentModulesPlugin",
				handler
			);
		});
	}
}
```

optimizeChunksBasic 和 optimizeExtractedChunksBasic 是在 compilation.seal 阶段触发，handler 的逻辑分为以下几步：

- **步骤一：从 entrypoint 出发**

    ```js
    const queue = new Queue();
    const availableModulesMap = new WeakMap();

    // 从 entrypoints 出发，entrypoints 是一种特殊的 chunkGroup
    for (const chunkGroup of compilation.entrypoints.values()) {
      availableModulesMap.set(chunkGroup, new Set());
      // 找到子 chunkGroup
      // 比如在入口文件模块里面，import('./a.js')，
      // 相当于于创建一个 async chunk 以及 对应的 chunkGroup，chunkGroup 是 entrypoint 的 子节点
      for (const child of chunkGroup.childrenIterable) {
        queue.enqueue(child);
      }
    }
    ```

    // TODO 补充一个 entrypoints 的概念

    因为 entrypoint 是根节点，所以从它们出发，先仅仅找出第一层节点，进行入队操作。
  
- **步骤二：遍历 chunkGroups，记录每个 chunkGroup 可利用的 modules，存入 availableModulesMap**

    ```js
    while (queue.length > 0) {
      // 出队当前 chunkGroup
      const chunkGroup = queue.dequeue();
      // 获取当前 chunkGroup 能够直接使用的 modules
      let availableModules = availableModulesMap.get(chunkGroup);
      let changed = false;
      // 遍历所有父 chunkGroups
      for (const parent of chunkGroup.parentsIterable) {
        const availableModulesInParent = availableModulesMap.get(parent);
        if (availableModulesInParent !== undefined) {
          // availableModulesMap 内还未有当前 chunkGroup 的信息
          if (availableModules === undefined) {
            // 父 chunkGroups 可以直接拿过来使用的 modules
            availableModules = new Set(availableModulesInParent);
            for (const chunk of parent.chunks) {
              // 父 chunkGroups 自己包含的 modules
              for (const m of chunk.modulesIterable) {
                // 以上的 modules 都可以被当前 chunkGroup 使用
                availableModules.add(m);
              }
            }
            availableModulesMap.set(chunkGroup, availableModules);
            changed = true;
          } else { 
            // availableModulesMap 已经有了当前 chunkGroup 的信息，什么情况下会出现呢？（标记点一）
            for (const m of availableModules) {
              // 判断当前 chunkGroup 可用的 modules 是否在另外一个父 chunkGroup 全部找得到。
              // 举个例子 chunkGroup 有 parentChunkGroup1 和 parentChunkGroup2
              // 由 parentChunkGroup1 计算而来的 availableModules 含有 m1 和 m2
              // 如果 parentChunkGroup2 不包含 m1 和 m2 
              // 或者 parentChunkGroup2.availableModules 不包含 m1 和 m2
              // 那么就不能将当前 chunkGroup 的 m1 和 m2 移除
              if (
                !parent.containsModule(m) &&
                !availableModulesInParent.has(m)
              ) {
                availableModules.delete(m);
                changed = true;
              }
            }
          }
        }
      }
      // 如果当前 chunkGroup 可用的模块发生了变化
      // 入队所有子 chunkGroup
      if (changed) {
        for (const child of chunkGroup.childrenIterable) {
          queue.enqueue(child);
        }
      }
    }
    ```

    上面的逻辑其实是一个**深度遍历**，从 entrypoint 的第一个子 chunkGroup 开始，统计每个 chunkGroup 的祖先节点加载过的 modules，并且记录在 availableModulesMap 这样的 WeakMap 结构里面。

    回到上面的注释问题**标记点一**，出现这种情况的原因无非是同一个 chunkGroup 被遍历了多次，换句话说，就是有多个 parentChunkGroup，比如以下的场景：

    ```js
    // entry.js
    import(/* webpackChunkName: "shared" */'./shared.js')
    import(/* webpackChunkName: "moduleB" */'./moduleB.js')

    // moduleB.js
    import(/* webpackChunkName: "shared" */'./shared.js')
    module.exports = 'moduleB'

    // shared.js
    module.exports = 'shared'

    // webpack.config.js
    module.exports = {
      context: __dirname,
      entry: './entry.js',
      output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].js"
      },
      optimization: {
        minimize: false
      }
    }
    ```

    入口文件包含 shared 和 moduleB chunkGroup，同时 moduleB 也包含 shared chunkGroup，经过 webpack buildGraph 之后，shared 的父 chunkGroup 就是 [entrypoint, moduleBChunkGroup]。

    为了找到 moduleB chunkGroup 可移除的 modules，无非就是找到既在 entrypoint 又在 moduleBChunkGroup 加载过的 modules。

- **步骤三：利用 availableModulesMap 信息，移除 chunks 中不必要包含的 modules**

    ```js
    // 找到所有包含这个 module 的 chunk
    const getParentChunksWithModule = (currentChunk, module) => {
      const chunks = [];
      const stack = new Set(currentChunk.parentsIterable);

      for (const chunk of stack) {
        if (chunk.containsModule(module)) {
          chunks.push(chunk);
        } else {
          for (const parent of chunk.parentsIterable) {
            stack.add(parent);
          }
        }
      }

      return chunks;
    };

    // 遍历全部 chunks
    for (const chunk of chunks) {
      // 找出 chunks 可以移除的 modules
      const availableModulesSets = Array.from(
        chunk.groupsIterable,
        chunkGroup => availableModulesMap.get(chunkGroup)
      );
      if (availableModulesSets.some(s => s === undefined)) continue;

      //  剔除重复的 module
      const availableModules =
        availableModulesSets.length === 1
          ? availableModulesSets[0]
          : intersect(availableModulesSets);
      const numberOfModules = chunk.getNumberOfModules();
      const toRemove = new Set();
      
      // 添加待删除项，numberOfModules 与 availableModules.size 的目的是
      // 为了取更小的值遍历来覆盖所有的 case
      if (numberOfModules < availableModules.size) {
        for (const m of chunk.modulesIterable) {
          if (availableModules.has(m)) {
            toRemove.add(m);
          }
        }
      } else {
        for (const m of availableModules) {
          if (chunk.containsModule(m)) {
            toRemove.add(m);
          }
        }
      }
      // 移除 module
      for (const module of toRemove) {
        module.rewriteChunkInReasons(
          chunk,
          // 找到所有含有待移除的 module 的父 chunks
          getParentChunksWithModule(chunk, module)
        );
        // 将 module 从 chunk 中移除
        chunk.removeModule(module);
      }
    }
    ```

## 栗子

  <img :src="$withBase('/assets/removeAvailableModules.png')" height="700" />

通过上面这个 case 大概捋了一下源码的逻辑，不过很奇怪的是，找了很多场景，都走不到进源码 toRemove 的场景，因为在 webpack buildChunkGraph 的时候，如果父子 chunkGroup 引用同一个 module，module 会直接放父 chunkGroup 的 chunk 中，也就是说 webpack 内部已经做了这一层的优化，就好比上面的 case，chunkGroupB 是 chunkGroupA 的子元素，它们共同引用了 common module，但是在实际 buildChunkGraph 的时候，common module 只会放在 chunkGroupA 的 chunk 里面，而不会放到 chunkGroupB 的 chunk 里面

那什么场景下需要 RemoveParentModulesPlugin 的呢？先标记个 TODO 项吧。