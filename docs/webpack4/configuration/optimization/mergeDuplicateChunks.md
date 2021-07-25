# mergeDuplicateChunks

mergeDuplicateChunks 配置项用来告诉 webpack 合并含有相同 modules 的 chunks，默认开启。内部使用的插件是 MergeDuplicateChunksPlugin。

```js
class MergeDuplicateChunksPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap(
      "MergeDuplicateChunksPlugin",
      compilation => {
        compilation.hooks.optimizeChunksBasic.tap(
          "MergeDuplicateChunksPlugin",
          chunks => {
            // ... handle
          }
        );
      }
    );
  }
}
```

optimizeChunksBasic hook 触发的时期是 compilation.seal 阶段。handle 的逻辑如下：

```js
const notDuplicates = new Set();

// 遍历所有的 chunks
for (const chunk of chunks) {
  
  let possibleDuplicates;
  // 遍历当前 chunk 中所有的 module
  for (const module of chunk.modulesIterable) {
    if (possibleDuplicates === undefined) {
      // 找到含有当前 module 的 chunks
      // 这样仅仅校验 chunks 之间的 modules 数量是否相同，不代表 chunks 真的含有相同的 modules
      for (const dup of module.chunksIterable) {
        if (
          dup !== chunk &&
          chunk.getNumberOfModules() === dup.getNumberOfModules() &&
          !notDuplicates.has(dup)
        ) {
          // delay allocating the new Set until here, reduce memory pressure
          if (possibleDuplicates === undefined) {
            possibleDuplicates = new Set();
          }
          possibleDuplicates.add(dup);
        }
      }
      // 如果上述条件都不满足，说明两个 chunk 不能 merge
      if (possibleDuplicates === undefined) break;
    } else {
      // 校验"疑似可 merge" 的 chunk 是否含有 当前 chunk 的所有 modules
      for (const dup of possibleDuplicates) {
        if (!dup.containsModule(module)) {
          possibleDuplicates.delete(dup);
        }
      }
      if (possibleDuplicates.size === 0) break;
    }
  }

  if (
    possibleDuplicates !== undefined &&
    possibleDuplicates.size > 0
  ) {
    // 开始 merge 当前 chunk 以及可能重复的 chunks
    for (const otherChunk of possibleDuplicates) {
      // 他们必须同是或者同不是 runtime chunk
      if (otherChunk.hasRuntime() !== chunk.hasRuntime()) continue;
      // 判断是否可以 merge
      if (chunk.integrate(otherChunk, "duplicate")) {
        // merge 成功之后，可以直接移除 otherChunk
        chunks.splice(chunks.indexOf(otherChunk), 1);
      }
    }
  }

  // 标记当前 chunk 无法 merge
  notDuplicates.add(chunk);
}
```

上述的逻辑也很简单，就是遍历所有 chunks，根据他们引用的 modules，又因为 modules 存了所有引用自身的 chunks，这样三层遍历就能找出，最后面就是判断两个 chunk 是否能 merge。

```js
class Chunk {
  // 判断 chunk 是否是 runtimeChunk
  // runtimeChunk 的特点就是在生成代码的时候，带有 webpack runtime bootstrap code
  hasRuntime() {
    for (const chunkGroup of this._groups) {
      if (
        chunkGroup.isInitial() &&
        chunkGroup instanceof Entrypoint &&
        chunkGroup.getRuntimeChunk() === this
      ) {
        return true;
      }
    }
    return false;
  }

  // 当前 chunk 是否属于 chunkGroup
  isInGroup(chunkGroup) {
    return this._groups.has(chunkGroup);
  }

  // 判断当前 chunk 是否能与 otherChunk 合并
  canBeIntegrated(otherChunk) {
    // 如果其中之一是通过 RuntimeChunkPlugin 分离出来的 runtime chunk，则不允许 integrate
    if (this.preventIntegration || otherChunk.preventIntegration) {
      return false;
    }

    // 判断 a(runtime chunk) 与 b(非 runtime chunk) 是否允许 integrate
    const isAvailable = (a, b) => {
      // 获取所有含有 b 的 chunkGroup
      const queue = new Set(b.groupsIterable);
      for (const chunkGroup of queue) {
        // 如果 a 与 b 作为兄弟节点，也就是含有共同的 chunkGroup
        if (a.isInGroup(chunkGroup)) continue;
        // 如果 b 属于 entrypoint 的 chunk，则不允许 integate
        if (chunkGroup.isInitial()) return false;
        for (const parent of chunkGroup.parentsIterable) {
          queue.add(parent);
        }
      }
      return true;
    };

    const selfHasRuntime = this.hasRuntime();
    const otherChunkHasRuntime = otherChunk.hasRuntime();

    // 二者其中之一是 runtime chunk
    if (selfHasRuntime !== otherChunkHasRuntime) {
      if (selfHasRuntime) {
        return isAvailable(this, otherChunk);
      } else if (otherChunkHasRuntime) {
        return isAvailable(otherChunk, this);
      } else { // 会走到这里？大写的疑问句！
        return false;
      }
    }

    // 如果是两个 chunk 含有 entry module，则不允许
    if (this.hasEntryModule() || otherChunk.hasEntryModule()) {
      return false;
    }

    return true;
  }
  
  integrate(otherChunk, reason) {
    // 如果不能合并
    if (!this.canBeIntegrated(otherChunk)) {
      return false;
    }

    // 决定合并后的 chunk name
    if (this.name && otherChunk.name) {
      if (this.hasEntryModule() === otherChunk.hasEntryModule()) {
        if (this.name.length !== otherChunk.name.length) {
          this.name =
            this.name.length < otherChunk.name.length
              ? this.name
              : otherChunk.name;
        } else {
          this.name = this.name < otherChunk.name ? this.name : otherChunk.name;
        }
      } else if (otherChunk.hasEntryModule()) {
        this.name = otherChunk.name;
      }
    } else if (otherChunk.name) {
      this.name = otherChunk.name;
    }

    // 将 otherChunk 内的 modules 都放进自己的兜里～
    for (const module of Array.from(otherChunk._modules)) {
      otherChunk.moveModule(module, this);
    }
    otherChunk._modules.clear();
    
    // 如果 otherChunk 含有 entryModule，那也丢过来
    if (otherChunk.entryModule) {
      this.entryModule = otherChunk.entryModule;
    }

    // 连接 chunk 与 otherChunk 的 chunkGroup
    // 所以 integated chunk 的 _groups 既包含自己的，也包含 otherChunk 的 chunkGroup
    for (const chunkGroup of otherChunk._groups) {
      chunkGroup.replaceChunk(otherChunk, this);
      this.addGroup(chunkGroup);
    }
    otherChunk._groups.clear();

    return true;
  }
}
```

以下的例子就能让两个重复的 chunk 合并。

```js
// index.js
import './a'
import('./b.js') // async block1


// a.js
import('./b.js') // async block2

// b.js
export default 'b'
```

运行 webpack 打包，上述的 async block1 和 async block2 就会进行 merge，如果想要在编译的时候就把他们识别成一个 chunk，那必须借助 "magic comments"，比如都改成以下的形式。

```js
// index.js
import './a'
import(/* webpackChunkName: "b" */'./b.js') // async block b

// a.js
import(/* webpackChunkName: "b" */'./b.js') // async block b
```