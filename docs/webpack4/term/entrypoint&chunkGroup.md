# chunkGroup、entrypoint

[[toc]]

## chunkGroup

根据 webpack 作者 [webpack 4: Code Splitting, chunk graph and the splitChunks optimization](https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366) 文章的描述，chunkGroup 的出现是为了解决以前 `CommonsChunkPlugin` 留下来的坑，以前 chunks 之间的联系都是通过父子关系来描述，这种关系很难阐释清除 `splitting chunk` 的关系，而 chunkGroup 的引入就是为了解决这种关系，entrypoint 或者 code splitting 都会生成对应的 chunkGoup 实例，如果使用了 [runtimeChunk](../configuration/optimization/runtimeChunk.md) 或者 [splitChunks](../configuration/optimization/splitChunks.md) 配置衍生出来的 chunk，就会连同原先的 chunk 保存在的chunkGroup 中，AggressiveSplittingPlugin 插件生成的 chunks 也是类似的原理。示意图如下：

<img :src="$withBase('/assets/chunkgroup-runtime.png')" width="600" />

以上的场景就是通过 runtimeChunk 配置，生成了一个 runtime chunk，它与 index chunk 都被保存在 webpack 内部 chunkGroup(其实是 entrypoint) 的 chunks 属性里面。

再看一个 splitChunks 的场景，示意图如下：

<img :src="$withBase('/assets/chunkgroup-splitchunks.png')" width="600" />

这个场景内部的 common chunk 就是由 index chunk 分离出来的，他们也是保存在 entrypoint 的 chunks 属性里面。

chunkGroup 类如下：

:::details
```js
class ChunkGroup {
  /**
   * Creates an instance of ChunkGroup.
   * @param {ChunkGroupOptions=} options chunk group options passed to chunkGroup
   */
  constructor(options) {
    if (typeof options === "string") {
      options = { name: options };
    } else if (!options) {
      options = { name: undefined };
    }
    /** @type {number} */
    this.groupDebugId = debugId++;
    this.options = options;
    /** @type {SortableSet<ChunkGroup>} */
    this._children = new SortableSet(undefined, sortById);
    this._parents = new SortableSet(undefined, sortById);
    this._blocks = new SortableSet();
    /** @type {Chunk[]} */
    this.chunks = [];
    /** @type {OriginRecord[]} */
    this.origins = [];
    /** Indices in top-down order */
    /** @private @type {Map<Module, number>} */
    this._moduleIndices = new Map();
    /** Indices in bottom-up order */
    /** @private @type {Map<Module, number>} */
    this._moduleIndices2 = new Map();
  }

  /**
   * when a new chunk is added to a chunkGroup, addingOptions will occur.
   * @param {ChunkGroupOptions} options the chunkGroup options passed to addOptions
   * @returns {void}
   */
  addOptions(options) {
    for (const key of Object.keys(options)) {
      if (this.options[key] === undefined) {
        this.options[key] = options[key];
      } else if (this.options[key] !== options[key]) {
        if (key.endsWith("Order")) {
          this.options[key] = Math.max(this.options[key], options[key]);
        } else {
          throw new Error(
            `ChunkGroup.addOptions: No option merge strategy for ${key}`
          );
        }
      }
    }
  }

  /**
   * returns the name of current ChunkGroup
   * @returns {string|undefined} returns the ChunkGroup name
   */
  get name() {
    return this.options.name;
  }

  /**
   * sets a new name for current ChunkGroup
   * @param {string} value the new name for ChunkGroup
   * @returns {void}
   */
  set name(value) {
    this.options.name = value;
  }

  /**
   * get a uniqueId for ChunkGroup, made up of its member Chunk debugId's
   * @returns {string} a unique concatenation of chunk debugId's
   */
  get debugId() {
    return Array.from(this.chunks, x => x.debugId).join("+");
  }

  /**
   * get a unique id for ChunkGroup, made up of its member Chunk id's
   * @returns {string} a unique concatenation of chunk ids
   */
  get id() {
    return Array.from(this.chunks, x => x.id).join("+");
  }

  /**
   * Performs an unshift of a specific chunk
   * @param {Chunk} chunk chunk being unshifted
   * @returns {boolean} returns true if attempted chunk shift is accepted
   */
  unshiftChunk(chunk) {
    const oldIdx = this.chunks.indexOf(chunk);
    if (oldIdx > 0) {
      this.chunks.splice(oldIdx, 1);
      this.chunks.unshift(chunk);
    } else if (oldIdx < 0) {
      this.chunks.unshift(chunk);
      return true;
    }
    return false;
  }

  /**
   * inserts a chunk before another existing chunk in group
   * @param {Chunk} chunk Chunk being inserted
   * @param {Chunk} before Placeholder/target chunk marking new chunk insertion point
   * @returns {boolean} return true if insertion was successful
   */
  insertChunk(chunk, before) {
    const oldIdx = this.chunks.indexOf(chunk);
    const idx = this.chunks.indexOf(before);
    if (idx < 0) {
      throw new Error("before chunk not found");
    }
    if (oldIdx >= 0 && oldIdx > idx) {
      this.chunks.splice(oldIdx, 1);
      this.chunks.splice(idx, 0, chunk);
    } else if (oldIdx < 0) {
      this.chunks.splice(idx, 0, chunk);
      return true;
    }
    return false;
  }

  /**
   * add a chunk into ChunkGroup. Is pushed on or prepended
   * @param {Chunk} chunk chunk being pushed into ChunkGroupS
   * @returns {boolean} returns true if chunk addition was successful.
   */
  pushChunk(chunk) {
    const oldIdx = this.chunks.indexOf(chunk);
    if (oldIdx >= 0) {
      return false;
    }
    this.chunks.push(chunk);
    return true;
  }

  /**
   * @param {Chunk} oldChunk chunk to be replaced
   * @param {Chunk} newChunk New chunk that will be replaced with
   * @returns {boolean} returns true if the replacement was successful
   */
  replaceChunk(oldChunk, newChunk) {
    const oldIdx = this.chunks.indexOf(oldChunk);
    if (oldIdx < 0) return false;
    const newIdx = this.chunks.indexOf(newChunk);
    if (newIdx < 0) {
      this.chunks[oldIdx] = newChunk;
      return true;
    }
    if (newIdx < oldIdx) {
      this.chunks.splice(oldIdx, 1);
      return true;
    } else if (newIdx !== oldIdx) {
      this.chunks[oldIdx] = newChunk;
      this.chunks.splice(newIdx, 1);
      return true;
    }
  }

  removeChunk(chunk) {
    const idx = this.chunks.indexOf(chunk);
    if (idx >= 0) {
      this.chunks.splice(idx, 1);
      return true;
    }
    return false;
  }

  isInitial() {
    return false;
  }

  addChild(chunk) {
    if (this._children.has(chunk)) {
      return false;
    }
    this._children.add(chunk);
    return true;
  }

  getChildren() {
    return this._children.getFromCache(getArray);
  }

  getNumberOfChildren() {
    return this._children.size;
  }

  get childrenIterable() {
    return this._children;
  }

  removeChild(chunk) {
    if (!this._children.has(chunk)) {
      return false;
    }

    this._children.delete(chunk);
    chunk.removeParent(this);
    return true;
  }

  addParent(parentChunk) {
    if (!this._parents.has(parentChunk)) {
      this._parents.add(parentChunk);
      return true;
    }
    return false;
  }

  getParents() {
    return this._parents.getFromCache(getArray);
  }

  setParents(newParents) {
    this._parents.clear();
    for (const p of newParents) {
      this._parents.add(p);
    }
  }

  getNumberOfParents() {
    return this._parents.size;
  }

  hasParent(parent) {
    return this._parents.has(parent);
  }

  get parentsIterable() {
    return this._parents;
  }

  removeParent(chunk) {
    if (this._parents.delete(chunk)) {
      chunk.removeChunk(this);
      return true;
    }
    return false;
  }

  /**
   * @returns {Array} - an array containing the blocks
   */
  getBlocks() {
    return this._blocks.getFromCache(getArray);
  }

  getNumberOfBlocks() {
    return this._blocks.size;
  }

  hasBlock(block) {
    return this._blocks.has(block);
  }

  get blocksIterable() {
    return this._blocks;
  }

  addBlock(block) {
    if (!this._blocks.has(block)) {
      this._blocks.add(block);
      return true;
    }
    return false;
  }

  addOrigin(module, loc, request) {
    this.origins.push({
      module,
      loc,
      request
    });
  }

  containsModule(module) {
    for (const chunk of this.chunks) {
      if (chunk.containsModule(module)) return true;
    }
    return false;
  }

  getFiles() {
    const files = new Set();

    for (const chunk of this.chunks) {
      for (const file of chunk.files) {
        files.add(file);
      }
    }

    return Array.from(files);
  }

  /**
   * @param {string=} reason reason for removing ChunkGroup
   * @returns {void}
   */
  remove(reason) {
    // cleanup parents
    for (const parentChunkGroup of this._parents) {
      // remove this chunk from its parents
      parentChunkGroup._children.delete(this);

      // cleanup "sub chunks"
      for (const chunkGroup of this._children) {
        /**
         * remove this chunk as "intermediary" and connect
         * it "sub chunks" and parents directly
         */
        // add parent to each "sub chunk"
        chunkGroup.addParent(parentChunkGroup);
        // add "sub chunk" to parent
        parentChunkGroup.addChild(chunkGroup);
      }
    }

    /**
     * we need to iterate again over the children
     * to remove this from the child's parents.
     * This can not be done in the above loop
     * as it is not guaranteed that `this._parents` contains anything.
     */
    for (const chunkGroup of this._children) {
      // remove this as parent of every "sub chunk"
      chunkGroup._parents.delete(this);
    }

    // cleanup blocks
    for (const block of this._blocks) {
      block.chunkGroup = null;
    }

    // remove chunks
    for (const chunk of this.chunks) {
      chunk.removeGroup(this);
    }
  }

  sortItems() {
    this.origins.sort(sortOrigin);
    this._parents.sort();
    this._children.sort();
  }

  /**
   * Sorting predicate which allows current ChunkGroup to be compared against another.
   * Sorting values are based off of number of chunks in ChunkGroup.
   *
   * @param {ChunkGroup} otherGroup the chunkGroup to compare this against
   * @returns {-1|0|1} sort position for comparison
   */
  compareTo(otherGroup) {
    if (this.chunks.length > otherGroup.chunks.length) return -1;
    if (this.chunks.length < otherGroup.chunks.length) return 1;
    const a = this.chunks[Symbol.iterator]();
    const b = otherGroup.chunks[Symbol.iterator]();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const aItem = a.next();
      const bItem = b.next();
      if (aItem.done) return 0;
      const cmp = aItem.value.compareTo(bItem.value);
      if (cmp !== 0) return cmp;
    }
  }

  getChildrenByOrders() {
    const lists = new Map();
    for (const childGroup of this._children) {
      // TODO webpack 5 remove this check for options
      if (typeof childGroup.options === "object") {
        for (const key of Object.keys(childGroup.options)) {
          if (key.endsWith("Order")) {
            const name = key.substr(0, key.length - "Order".length);
            let list = lists.get(name);
            if (list === undefined) {
              lists.set(name, (list = []));
            }
            list.push({
              order: childGroup.options[key],
              group: childGroup
            });
          }
        }
      }
    }
    const result = Object.create(null);
    for (const [name, list] of lists) {
      list.sort((a, b) => {
        const cmp = b.order - a.order;
        if (cmp !== 0) return cmp;
        // TODO webpack 5 remove this check of compareTo
        if (a.group.compareTo) {
          return a.group.compareTo(b.group);
        }
        return 0;
      });
      result[name] = list.map(i => i.group);
    }
    return result;
  }

  /**
   * Sets the top-down index of a module in this ChunkGroup
   * @param {Module} module module for which the index should be set
   * @param {number} index the index of the module
   * @returns {void}
   */
  setModuleIndex(module, index) {
    this._moduleIndices.set(module, index);
  }

  /**
   * Gets the top-down index of a module in this ChunkGroup
   * @param {Module} module the module
   * @returns {number} index
   */
  getModuleIndex(module) {
    return this._moduleIndices.get(module);
  }

  /**
   * Sets the bottom-up index of a module in this ChunkGroup
   * @param {Module} module module for which the index should be set
   * @param {number} index the index of the module
   * @returns {void}
   */
  setModuleIndex2(module, index) {
    this._moduleIndices2.set(module, index);
  }

  /**
   * Gets the bottom-up index of a module in this ChunkGroup
   * @param {Module} module the module
   * @returns {number} index
   */
  getModuleIndex2(module) {
    return this._moduleIndices2.get(module);
  }

  checkConstraints() {
    const chunk = this;
    for (const child of chunk._children) {
      if (!child._parents.has(chunk)) {
        throw new Error(
          `checkConstraints: child missing parent ${chunk.debugId} -> ${child.debugId}`
        );
      }
    }
    for (const parentChunk of chunk._parents) {
      if (!parentChunk._children.has(chunk)) {
        throw new Error(
          `checkConstraints: parent missing child ${parentChunk.debugId} <- ${chunk.debugId}`
        );
      }
    }
  }
}
```
:::

chunks 属性保存了所有的 chunk，不管你是通过什么手段生成的 chunk，它们共享同一个 chunkGroup 或者 entrypoint。

## entrypoint

什么是 entrypoint 呢？其实它是一种特殊的 ChunkGroup 实例。先来看一下 Entrypoint 的类结构。

```js
class Entrypoint extends ChunkGroup {
  /**
   * Creates an instance of Entrypoint.
   * @param {string} name the name of the entrypoint
   */
  constructor(name) {
    super(name);
    /** @type {Chunk=} */
    this.runtimeChunk = undefined;
  }

  /**
   * isInitial will always return true for Entrypoint ChunkGroup.
   * @returns {true} returns true as all entrypoints are initial ChunkGroups
   */
  isInitial() {
    return true;
  }

  /**
   * Sets the runtimeChunk for an entrypoint.
   * @param {Chunk} chunk the chunk being set as the runtime chunk.
   * @returns {void}
   */
  setRuntimeChunk(chunk) {
    this.runtimeChunk = chunk;
  }

  /**
   * Fetches the chunk reference containing the webpack bootstrap code
   * @returns {Chunk} returns the runtime chunk or first chunk in `this.chunks`
   */
  getRuntimeChunk() {
    return this.runtimeChunk || this.chunks[0];
  }

  /**
   * @param {Chunk} oldChunk chunk to be replaced
   * @param {Chunk} newChunk New chunk that will be replaced with
   * @returns {boolean} returns true if the replacement was successful
   */
  replaceChunk(oldChunk, newChunk) {
    if (this.runtimeChunk === oldChunk) this.runtimeChunk = newChunk;
    return super.replaceChunk(oldChunk, newChunk);
  }
}
```

entrypoint 的生成受 webpack entry 配置的影响，如果是对象，那么会生成多个 entrypoints 和对应的 initial chunks，默认情况下 entrypoint 的 runtimeChunk 属性值就是这个对应的 initial chunk，因此 initial chunk 在生成代码的时候就会带有 [webpack boopstrap code](./chunk.md#runtime-chunk)

isInitial 方法对于 Entrypoint 也是非常的关键，这个属性决定了是否要手动的在 html 文件通过 script 引入对应的 js 文件，这些 js 文件都是 Entrypoint 包含的 chunks 生成的，理解这一点，对你理解 [splitChunks](../configuration/optimization/splitChunks.md) 配置非常关键。

**总而言之，webpack 内部 chunkGroups 的数量取决于代码分割的次数和 entry 配置**

