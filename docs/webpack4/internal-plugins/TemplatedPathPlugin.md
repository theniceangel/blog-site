# TemplatedPathPlugin

webpack 使用一种 `'substitutions'` 的技术，支持 `output.filename`、`output.chunkFilename` 等配置，它可以使用如下的占位符来替换构建流程中对应的值。

| template | 作用 |
| ---- | ---- |
| [hash] | module id 的哈希值 |
| [contenthash] | 文件内容的哈希，比如图片 |
| [chunkhash] | chunk 内容的哈希值 |
| [name] | 模块名称 |
| [id] | module id |
| [query] | module 的 query，`'?'` 之后的值 |
| [function] | 返回 filename 的函数 |

## 类声明

```js
class TemplatedPathPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap("TemplatedPathPlugin", compilation => {
      const mainTemplate = compilation.mainTemplate;

      mainTemplate.hooks.assetPath.tap(
        "TemplatedPathPlugin",
        replacePathVariables
      );

      mainTemplate.hooks.globalHash.tap(
        "TemplatedPathPlugin",
        (chunk, paths) => {
          // ...
        }
      );

      mainTemplate.hooks.hashForChunk.tap(
        "TemplatedPathPlugin",
        (hash, chunk) => {
          // ...
        }
      );
    });
  }
}
```

TemplatedPathPlugin 内部含有许多正则，都是为了匹配占位符变量。

```js
// 全局匹配版本
const REGEXP_HASH = /\[hash(?::(\d+))?\]/gi, // 匹配 [hash] 或者 [hash:数字]
  REGEXP_CHUNKHASH = /\[chunkhash(?::(\d+))?\]/gi, // 匹配 [chunkhash] 或者 [chunkhash:数字]
  REGEXP_MODULEHASH = /\[modulehash(?::(\d+))?\]/gi, // 匹配 [modulehash] 或者 [modulehash:数字]
  REGEXP_CONTENTHASH = /\[contenthash(?::(\d+))?\]/gi, // 匹配 [contenthash] 或者 [contenthash:数字]
  REGEXP_NAME = /\[name\]/gi, // 匹配 [name]
  REGEXP_ID = /\[id\]/gi, // 匹配 [id]
  REGEXP_MODULEID = /\[moduleid\]/gi, // 匹配 [moduleid]
  REGEXP_FILE = /\[file\]/gi, // 匹配 [file]
  REGEXP_QUERY = /\[query\]/gi, // 匹配 [query]
  REGEXP_FILEBASE = /\[filebase\]/gi, // 匹配 [filebase]
  REGEXP_URL = /\[url\]/gi; // 匹配 [url]

// 非全局匹配版本
const REGEXP_HASH_FOR_TEST = new RegExp(REGEXP_HASH.source, "i"),
  REGEXP_CHUNKHASH_FOR_TEST = new RegExp(REGEXP_CHUNKHASH.source, "i"),
  REGEXP_CONTENTHASH_FOR_TEST = new RegExp(REGEXP_CONTENTHASH.source, "i"),
  REGEXP_NAME_FOR_TEST = new RegExp(REGEXP_NAME.source, "i");
```

插件的主要逻辑分为 `assetPath`、`globalHash`、`hashForChunk` 三个 hooks，下面分别看看这三个 hooks 的作用。

## assetPath

assetPath 是用了替换 `output.filename`、`output.path` 等配置内的占位符变量。它的调用路径如下：

```js
class Compilation {
  getPath(filename, data) {
    data = data || {};
    // 默认为 compilation.hash
    data.hash = data.hash || this.hash;
    // filename：带有占位符的模版字符串
    return this.mainTemplate.getAssetPath(filename, data);
  }
  getPathWithInfo(filename, data) {
    data = data || {};
    data.hash = data.hash || this.hash;
    return this.mainTemplate.getAssetPathWithInfo(filename, data);
  }
}

class MainTemplate {
  getPublicPath(options) {
    return this.hooks.assetPath.call(
      this.outputOptions.publicPath || "",
      options
    );
  }

  getAssetPath(path, options) {
    return this.hooks.assetPath.call(path, options);
  }

  getAssetPathWithInfo(path, options) {
    const assetInfo = {};
    const newPath = this.hooks.assetPath.call(path, options, assetInfo);
    return { path: newPath, info: assetInfo };
  }
}
```

先来看下 `replacePathVariables` 函数的逻辑。

```js
// 返回一个 replacer 函数
const getReplacer = (value, allowEmpty) => {
  // replacer 函数会将 value 替换成对应的字符串模版，比如 value 为 'index'
  // 比如 '[name].js' 替换成  'index.js'
  const fn = (match, ...args) => {
    const input = args[args.length - 1];
    if (value === null || value === undefined) {
      if (!allowEmpty) {
        throw new Error(
          `Path variable ${match} not implemented in this context: ${input}`
        );
      }
      return "";
    } else {
      return `${escapePathVariables(value)}`;
    }
  };
  return fn;
};

const escapePathVariables = value => {
  return typeof value === "string"
    ? value.replace(/\[(\\*[\w:]+\\*)\]/gi, "[\\$1\\]")
    : value;
};

// 返回一个闭包 fn
const withHashLength = (replacer, handlerFn, assetInfo) => {
  // 这个 fn 作为 string.replace 的第二个参数，主要是处理 '[hash:16]', '[chunkhash: 16]' 类似模版
  const fn = (match, hashLength, ...args) => {
    if (assetInfo) assetInfo.immutable = true;
    const length = hashLength && parseInt(hashLength, 10);
    if (length && handlerFn) {
      return handlerFn(length);
    }
    const hash = replacer(match, hashLength, ...args);
    return length ? hash.slice(0, length) : hash;
  };
  return fn;
};

const replacePathVariables = (path, data, assetInfo) => {
  const chunk = data.chunk;
  // 替换 [id]
  const chunkId = chunk && chunk.id;
  // 替换 [name]
  const chunkName = chunk && (chunk.name || chunk.id);
  // 替换 [chunkhash]
  const chunkHash = chunk && (chunk.renderedHash || chunk.hash);
  // 处理 [chunkhash:number] 后面的 number
  const chunkHashWithLength = chunk && chunk.hashWithLength;
  const contentHashType = data.contentHashType;
  // 替换 [contenthash]
  const contentHash =
    (chunk && chunk.contentHash && chunk.contentHash[contentHashType]) ||
    data.contentHash;
  // 处理 [contenthash:number] 后面的 number
  const contentHashWithLength =
    (chunk &&
      chunk.contentHashWithLength &&
      chunk.contentHashWithLength[contentHashType]) ||
    data.contentHashWithLength;
  const module = data.module;
  // 替换 [moduleid]
  const moduleId = module && module.id;
  // 替换 [modulehash]
  const moduleHash = module && (module.renderedHash || module.hash);
  // 处理 [modulehash:number] 后面的 number
  const moduleHashWithLength = module && module.hashWithLength;

  if (typeof path === "function") {
    path = path(data);
  }

  // TODO
  if (
    data.noChunkHash &&
    (REGEXP_CHUNKHASH_FOR_TEST.test(path) ||
      REGEXP_CONTENTHASH_FOR_TEST.test(path))
  ) {
    throw new Error(
      `Cannot use [chunkhash] or [contenthash] for chunk in '${path}' (use [hash] instead)`
    );
  }

  return (
    path
      .replace(
        REGEXP_HASH,
        withHashLength(getReplacer(data.hash), data.hashWithLength, assetInfo)
      )
      .replace(
        REGEXP_CHUNKHASH,
        withHashLength(getReplacer(chunkHash), chunkHashWithLength, assetInfo)
      )
      .replace(
        REGEXP_CONTENTHASH,
        withHashLength(
          getReplacer(contentHash),
          contentHashWithLength,
          assetInfo
        )
      )
      .replace(
        REGEXP_MODULEHASH,
        withHashLength(getReplacer(moduleHash), moduleHashWithLength, assetInfo)
      )
      .replace(REGEXP_ID, getReplacer(chunkId))
      .replace(REGEXP_MODULEID, getReplacer(moduleId))
      .replace(REGEXP_NAME, getReplacer(chunkName))
      .replace(REGEXP_FILE, getReplacer(data.filename))
      .replace(REGEXP_FILEBASE, getReplacer(data.basename))
      .replace(REGEXP_QUERY, getReplacer(data.query, true))
      .replace(REGEXP_URL, getReplacer(data.url))
      .replace(/\[\\(\\*[\w:]+\\*)\\\]/gi, "[$1]")
  );
};
```

## globalHash

globalHash hook 的触发时机是在 `compilation.mainTemplate.useChunkHash` 的时候：

```js{7,18,23}
class JavascriptModulesPlugin {
  compilation.mainTemplate.hooks.renderManifest.tap(
    "JavascriptModulesPlugin",
    (result, options) => {
      //...

      const useChunkHash = compilation.mainTemplate.useChunkHash(chunk);
      result.push({
        render: () =>
          compilation.mainTemplate.render(
            hash,
            chunk,
            moduleTemplates.javascript,
            dependencyTemplates
          ),
        filenameTemplate,
        pathOptions: {
          noChunkHash: !useChunkHash,
          contentHashType: "javascript",
          chunk
        },
        identifier: `chunk${chunk.id}`,
        hash: useChunkHash ? chunk.hash : fullHash
      });
      return result;
    }
  );
}

class MainTemplate {
  useChunkHash(chunk) {
    const paths = this.hooks.globalHashPaths.call([]);
    return !this.hooks.globalHash.call(chunk, paths);
  }
}

class TemplatedPathPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap("TemplatedPathPlugin", compilation => {
      const mainTemplate = compilation.mainTemplate;

      mainTemplate.hooks.globalHash.tap(
        "TemplatedPathPlugin",
        (chunk, paths) => {
          const outputOptions = mainTemplate.outputOptions;
          const publicPath = outputOptions.publicPath || "";
          const filename = outputOptions.filename || "";
          const chunkFilename =
            outputOptions.chunkFilename || outputOptions.filename;
          // publicPath 只能含有 [hash]，这个hash 是 compilation 上的 hash
          if (
            REGEXP_HASH_FOR_TEST.test(publicPath) ||
            // 以下的情况不会出现
            REGEXP_CHUNKHASH_FOR_TEST.test(publicPath) ||
            REGEXP_CONTENTHASH_FOR_TEST.test(publicPath) ||
            REGEXP_NAME_FOR_TEST.test(publicPath)
          )
            return true;
          // 如果 filename 含有 [hash]， mainTemplate.useChunkHash() 返回 false
          if (REGEXP_HASH_FOR_TEST.test(filename)) return true;
          // 如果 chunkFilename 含有 [hash]， mainTemplate.useChunkHash() 返回 false
          if (REGEXP_HASH_FOR_TEST.test(chunkFilename)) return true;
          // 如果 mainTemplate.hooks.globalHashPaths 返回的 path 含有 [hash]，
          // mainTemplate.useChunkHash() 返回 false
          if (REGEXP_HASH_FOR_TEST.test(paths.join("|"))) return true;
        }
      );
    });
  }
}
```

`pathOptions.noChunkHash` 用来判断 `filenameTemplate` 是否可以含有 `[chunkhash]`、`[contenthash]` 这样的占位符。`hash` 用于 `compilation.cache` 对象内部

## hashForChunk

// TODO