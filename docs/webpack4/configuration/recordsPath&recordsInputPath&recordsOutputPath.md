# recordsPath, recordsInputPath, recordsOutputPath

## recordsPath

使用该配置来告诉 webpack 生成包含 webpack modules、chunks 信息的 JSON 文件，这对于多次构建非常有用，使用如下：

```js
// webpack.config.js
module.exports = {
  //...
  recordsPath: path.join(__dirname, 'records.json')
};

```

## recordsPath 底层实现

在 `webpack.js` 里有这么一段逻辑：

```js
// webpack.js
compiler.options = new WebpackOptionsApply().process(options, compiler)

// WebpackOptionsApply
class WebpackOptionsApply extends OptionsApply {
  process(options, compiler) {
    // ... 解析 recordsPath
    compiler.recordsInputPath = options.recordsInputPath || options.recordsPath;
    compiler.recordsOutputPath =
      options.recordsOutputPath || options.recordsPath;
  }
}
```

这样 compiler 实例上就有 `recordsInputPath`、`recordsOutputPath` 三个属性了，默认值都是 `options.recordsPath`，在执行 `compiler.run` 的时候，会调用 `compiler.readRecords` 来获取上一次构建的信息，接着才开始调用 `compile` 方法进行构建。代码如下：

```js
class Compiler {
  constructor() {
    this.records = {}
  }
  run(callback) {
    // ...
    const onCompiled = (err, compilation) => {
      // ...
    };

    this.hooks.beforeRun.callAsync(this, err => {
      // ...
      this.hooks.run.callAsync(this, err => {
        // ...
        this.readRecords(err => {
          // ...
          this.compile(onCompiled);
        });
      });
    });
  }
  // 读取记录
  readRecords(callback) {
    // 如果没有设置 recordsPath 或者 recordsInputPath
    if (!this.recordsInputPath) {
      this.records = {};
      return callback();
    }
    this.inputFileSystem.stat(this.recordsInputPath, err => {
      // 如果当前 JSON 文件还未生成
      if (err) return callback();

      this.inputFileSystem.readFile(this.recordsInputPath, (err, content) => {
        if (err) return callback(err);

        try {
          // 已经存在了 JSON 文件，获取内容
          this.records = parseJson(content.toString("utf-8"));
        } catch (e) {
          e.message = "Cannot parse records: " + e.message;
          return callback(e);
        }

        return callback();
      });
    });
  }
}
```

`readRecords` 执行过后，会通过 `recordsInputPath`，获取上一次构建信息，并且存到 `this.records` 上面，在 compiler 实例化 compilation 的时候，会将 records 赋值给 compilation。

```js
class Compiler {
  newCompilation(params) {
    const compilation = this.createCompilation();
    // ...
    compilation.records = this.records;
    // ...
    return compilation;
  }
}
```

真正用到 `compilation.records` 的时机是在调用 `compilation.seal` 的时候。

```js
class Compilation {
  seal() {
    // ...
    const shouldRecord = this.hooks.shouldRecord.call() !== false;
    // 获取上一次构建记录中所有 modules 的信息
    this.hooks.reviveModules.call(this.modules, this.records);

    // ...
    // 获取上一次构建记录中所有 chunks 的信息
    this.hooks.reviveChunks.call(this.chunks, this.records);

    // ...
    // 缓存这一次构建的记录
    if (shouldRecord) {
      this.hooks.recordModules.call(this.modules, this.records);
      this.hooks.recordChunks.call(this.chunks, this.records);
    }
  }
}
```

首先通过 `reviveModules` 与 `reviveChunks` hooks 获取上一次构建记录，再通过 `recordModules` 与 `recordChunks` hooks 存储这一次构建记录。这四个 hooks 都会走进 RecordIdsPlugin 插件逻辑的内部，下面就是重中之重的 RecordIdsPlugin 分析。

## RecordIdsPlugin

```js
class RecordIdsPlugin {
  constructor(options) {
    this.options = options || {};
  }

  apply(compiler) {
    const portableIds = this.options.portableIds;
    compiler.hooks.compilation.tap("RecordIdsPlugin", compilation => {
      compilation.hooks.recordModules.tap(
        "RecordIdsPlugin",
        (modules, records) => {
          // ... recordModulesHandler
        }
      );
      compilation.hooks.reviveModules.tap(
        "RecordIdsPlugin",
        (modules, records) => {
          // ... reviveModulesHandler
        }
      );

      compilation.hooks.recordChunks.tap(
        "RecordIdsPlugin",
        (chunks, records) => {
          // ... recordChunksHandler
        }
      );
      compilation.hooks.reviveChunks.tap(
        "RecordIdsPlugin",
        (chunks, records) => {
          if (!records.chunks) return;
          const usedIds = new Set();
          if (records.chunks.byName) {
            for (const chunk of chunks) {
              if (chunk.id !== null) continue;
              if (!chunk.name) continue;
              const id = records.chunks.byName[chunk.name];
              if (id === undefined) continue;
              if (usedIds.has(id)) continue;
              usedIds.add(id);
              chunk.id = id;
            }
          }
          if (records.chunks.bySource) {
            for (const chunk of chunks) {
              const sources = getChunkSources(chunk);
              for (const source of sources) {
                const id = records.chunks.bySource[source];
                if (id === undefined) continue;
                if (usedIds.has(id)) continue;
                usedIds.add(id);
                chunk.id = id;
                break;
              }
            }
          }
          if (Array.isArray(records.chunks.usedIds)) {
            compilation.usedChunkIds = new Set(records.chunks.usedIds);
          }
        }
      );
    });
  }
}
```

插件内部可以分为 `recordModulesHandler`、`reviveModulesHandler`、`recordChunksHandler`、`reviveChunksHandler` 这四个函数，下面一一分析：

- **recordModulesHandler**

    ```js
    /* recordModulesHandler */

    // 创建对应的默认值
    /**
     * {
     *   modules: {
     *     byIdentifier: {},
     *     usedIds: {}
     *   }
     * }
     */
    if (!records.modules) records.modules = {};
    if (!records.modules.byIdentifier) records.modules.byIdentifier = {};
    if (!records.modules.usedIds) records.modules.usedIds = {};
    for (const module of modules) {
      // 如果 module id 不是数字
      if (typeof module.id !== "number") continue;
      // 如果 portableIds 为 true，identifier 则是相对路径，否则是绝对路径
      const identifier = portableIds
        ? identifierUtils.makePathsRelative(
            compiler.context,
            module.identifier(),
            compilation.cache
          )
        : module.identifier();
      
      // 处理 id
      records.modules.byIdentifier[identifier] = module.id;
      records.modules.usedIds[module.id] = module.id;
    }
    ```

- **reviveModulesHandler**

    ```js
    /* reviveModulesHandler */

    if (!records.modules) return;
    // 获取上一次的 byIdentifier 记录的 moduleId 
    if (records.modules.byIdentifier) {
      const usedIds = new Set();
      for (const module of modules) {
        // module id 已经存在，直接跳过
        if (module.id !== null) continue;
        const identifier = portableIds
          ? identifierUtils.makePathsRelative(
              compiler.context,
              module.identifier(),
              compilation.cache
            )
          : module.identifier();
        const id = records.modules.byIdentifier[identifier];
        if (id === undefined) continue;
        if (usedIds.has(id)) continue;
        usedIds.add(id);
        // 分配 module id
        module.id = id;
      }
    }
    // records.modules.usedIds 为数组？貌似没有这种场景
    // 从 recordModulesHandler 的逻辑来看， usedIds 是一个对象
    // 有上面的逻辑足够了，这段代码没有也不会影响整体逻辑
    if (Array.isArray(records.modules.usedIds)) {
      compilation.usedModuleIds = new Set(records.modules.usedIds);
    }
    ```

- **recordChunksHandler**

    ```js
    /* recordChunksHandler */

    // makePathsRelative 就是为了将绝对路径转化成相对路径
    // 比如 module.identifier() 是 '/Users/webpack-demo/index.js'
    // compiler.context 是 '/Users/webpack-demo/'
    // 处理过后是 'index.js'
    const getModuleIdentifier = module => {
      if (portableIds) {
        return identifierUtils.makePathsRelative(
          compiler.context,
          module.identifier(),
          compilation.cache
        );
      }
      return module.identifier();
    };

    const getChunkSources = chunk => {
      const sources = [];
      for (const chunkGroup of chunk.groupsIterable) {
        const index = chunkGroup.chunks.indexOf(chunk);
        // 如果是具名的 chunkGroup，就记录 chunkGroup 的信息
        if (chunkGroup.name) {
          sources.push(`${index} ${chunkGroup.name}`);
        } else {
          // 如果是匿名的 chunkGroup，就记录对应的 origin
          // 比如 import('./a.js')，会生成一个匿名的 chunkGroup，其中 a.js 模块就是它的 origin
          for (const origin of chunkGroup.origins) {
            if (origin.module) {
              if (origin.request) {
                sources.push(
                  `${index} ${getModuleIdentifier(origin.module)} ${
                    origin.request
                  }`
                );
              } else if (typeof origin.loc === "string") {
                sources.push(
                  `${index} ${getModuleIdentifier(origin.module)} ${
                    origin.loc
                  }`
                );
              } else if (
                origin.loc &&
                typeof origin.loc === "object" &&
                origin.loc.start
              ) {
                sources.push(
                  `${index} ${getModuleIdentifier(
                    origin.module
                  )} ${JSON.stringify(origin.loc.start)}`
                );
              }
            }
          }
        }
      }
      return sources;
    };

    // 创建对应的默认值
    /**
     * {
     *   chunks: {
     *     byName: {},
     *     bySource: {}
     *     usedIds: []
     *   }
     * }
     */
    if (!records.chunks) records.chunks = {};
    if (!records.chunks.byName) records.chunks.byName = {};
    if (!records.chunks.bySource) records.chunks.bySource = {};
    const usedIds = new Set();
    for (const chunk of chunks) {
      // 如果 chunk id 不是数字
      if (typeof chunk.id !== "number") continue;
      // name 与 id 的映射
      const name = chunk.name;
      if (name) records.chunks.byName[name] = chunk.id;
      // source 与 id 的映射
      const sources = getChunkSources(chunk);
      for (const source of sources) {
        records.chunks.bySource[source] = chunk.id;
      }
      // 存下已经用过的 chunk id
      usedIds.add(chunk.id);
    }
    records.chunks.usedIds = Array.from(usedIds).sort();
    ```

- **reviveChunksHandler**

    ```js
    /* reviveChunksHandler */

    if (!records.chunks) return;
    const usedIds = new Set();
    // 通过 name 获取上一次的 id
    if (records.chunks.byName) {
      for (const chunk of chunks) {
        if (chunk.id !== null) continue;
        if (!chunk.name) continue;
        const id = records.chunks.byName[chunk.name];
        if (id === undefined) continue;
        if (usedIds.has(id)) continue;
        usedIds.add(id);
        chunk.id = id;
      }
    }
    // 通过 source 获取上一次的 id
    if (records.chunks.bySource) {
      for (const chunk of chunks) {
        const sources = getChunkSources(chunk);
        for (const source of sources) {
          const id = records.chunks.bySource[source];
          if (id === undefined) continue;
          if (usedIds.has(id)) continue;
          usedIds.add(id);
          chunk.id = id;
          break;
        }
      }
    }
    // 记录所有已经用过的 chunkId
    if (Array.isArray(records.chunks.usedIds)) {
      compilation.usedChunkIds = new Set(records.chunks.usedIds);
    }
    ```

这四个函数两两搭配使用，目的就是为了记录构建流程中产生的 moduleId 以及 chunkId，所有的信息都存在 `compilation.records` 对象上面，它也就是 `compiler.records` 的引用，在输出完 webpack 的 静态资源之后，会调用 `compiler.emitRecords`，存储这次构建的信息。

```js
class Compiler {
  emitRecords(callback) {
    if (!this.recordsOutputPath) return callback();
    const idx1 = this.recordsOutputPath.lastIndexOf("/");
    const idx2 = this.recordsOutputPath.lastIndexOf("\\");
    let recordsOutputPathDirectory = null;
    // 获取 recordsJSON 文件的目录
    if (idx1 > idx2) {
      recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx1);
    } else if (idx1 < idx2) {
      recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx2);
    }

    // 创建对应 JSON 文件
    const writeFile = () => {
      this.outputFileSystem.writeFile(
        this.recordsOutputPath,
        JSON.stringify(this.records, undefined, 2),
        callback
      );
    };

    // 如果目录存在，则直接写入内容
    if (!recordsOutputPathDirectory) {
      return writeFile();
    }
    // 否则递归创建路径，再写入内容
    this.outputFileSystem.mkdirp(recordsOutputPathDirectory, err => {
      if (err) return callback(err);
      writeFile();
    });
  }
}
```

## recordsInputPath, recordsOutputPath

上面的代码逻辑每次构建都是覆盖修改同一份文件，无法知道两次构建之间发生了哪些变化。但是你可以搭配使用 `recordsInputPath` 、`recordsOutputPath` 来记录前后两次构建的信息，

```js
const path = require('path');

module.exports = {
  //...
  recordsInputPath: path.join(__dirname, 'records.json'), // 包含前一次构建的信息
  recordsOutputPath: path.join(__dirname, 'newRecords.json'), // 包含这次构建的信息
};
```

**以上的行为只能消费一次**，除非你手动的把 `newRecords.json` 文件的内容拷贝至 `records.json`，这才能进行下一次的比对，因此绝大部分情况下只用配置 `recordsPath` 就可以。

从 RecordIdsPlugin 的实现来看，不管有没有配置 recordsPath, recordsInputPath, 以及 recordsOutputPath 等等，webpack 内部都会通过 `compiler.records` 来记录这次构建的 chunkId 以及 moduleId 信息，只不过有了这些配置可以控制是否写入磁盘，来对比多次构建之间有哪些异同之处。

## demo

下面以一个生动活泼的例子来看看生成的 JSON 文件是怎样的。

:::details webpack.config.js
```js
const path = require('path')

module.exports = {
	context: __dirname,
	entry: {
    index: './index.js'
  },
	output: {
		filename: "[name].js"
  },
  recordsPath: path.join(__dirname, 'records.json')
};
```
:::

::: details index.js
```js
console.log('index module')
```
:::

运行 webpack 命令之后，因为第一次没有 recordsPath 的 json 文件，所以 `reviveModulesHandler`、`reviveChunksHandler` 两个 hooks 的逻辑只是给 `compiler.records` 设置默认值，最后生成的 `records.json` 文件内容如下：

```json
{
  "modules": {
    "byIdentifier": {
      "index.js": 0
    },
    "usedIds": {
      "0": 0
    }
  },
  "chunks": {
    "byName": {
      "index": 0
    },
    "bySource": {
      "0 index": 0
    },
    "usedIds": [
      0
    ]
  }
}
```

下次再运行 webpack 打包命令，就可以消费上述的 JSON 文件，这样可以保证在多次运行打包命令之间，模块 id 和 chunk id 是稳定的，不会受到其他影响而变化。这种影响包括**新增 module，导致其他的 module id 发生变化，而引起所有的 chunks 变化**，这个问题在早期的 commonChunksPlugins 出现过。