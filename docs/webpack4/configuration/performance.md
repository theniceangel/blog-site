# performance

performance 告诉 webpack 如何通知你哪些静态资源以及 entrypoints 的体积超过对应配置项。

## 配置

```js
module.exports = {
  //...
  performance: {
    hints: 'warning', // false | 'error',
    // 包含 entrypoints 与 其他 initial chunks 的体积
    maxEntrypointSize: 250000,
    // 静态资源体积最大的阈值
    maxAssetSize: 100000,
    assetFilter: function(assetFilename) {
      // 只计算 js 文件，不计算图片等其他静态资源
      return assetFilename.endsWith('.js');
      
      // 除去 sourcemap 文件
      // return !(/\.map$/.test(assetFilename));
    }
  }
};
```

- **hints**

    可以配置为 `false` 或者 `'warning'`, `'error'`，后两者在构建之后，会在命令行输出对应的 warning 或者 error。

- **maxEntrypointSize**

    单位是字节，一般情况下 entrypoint 文件就是由入口模块解析而打包出来的文件，比如下面的 `bundle.js`

    ```js
    // webpack.config.js
    module.exports = {
      entry: {
        index: './index.js' // 打包出来的 index.js 就是 entrypoint
      },
      output: {
        filename: "bundle.js"
      }
    }
    ```

    还有一种场景就是由 entrypoint 包含的其他 initial chunk 生成的 js，比如使用 splitChunks 配置生成的 chunk，这样 entrypointSize 就包含两个文件，举个例子：

    ```js
    // webpack.config.js
    var path = require("path");
    module.exports = {
      context: __dirname,
      entry: {
        index: './index.js'
      },
      output: {
        filename: "[name].js",
        path: path.join(__dirname, "dist")
      },
      optimization: {
        splitChunks: {
          cacheGroups: {
            vendors: { // 把 react 打包到另外一个 initial chunk
              name: "vendors",
              chunks: "initial",
              minSize: 100
            }
          }
        }
      },
    };

    // index.js
    import 'react'
    ```

    运行打包命令之后，在 dist 目录下面生成 `index.js` 以及 `vendors.js`，在计算 entrypointSize 的时候就是两者 size 之和。

- **maxAssetSize**

    静态资源的大小，包括 js，图片，字体等等。

- **assetFilter**

    用来选中指定静态资源的函数，其他的资源在计算体积的时候会被忽略。

webpack 内部使用 SizeLimitsPlugin 来实现上述的功能，具体看看 SizeLimitsPlugin 的逻辑。

## SizeLimitsPlugin

```js
// lib/performance/SizeLimitsPlugin.js

class SizeLimitsPlugin {
  constructor(options) {
    this.hints = options.hints;
    this.maxAssetSize = options.maxAssetSize;
    this.maxEntrypointSize = options.maxEntrypointSize;
    this.assetFilter = options.assetFilter;
  }

  apply(compiler) {
    const entrypointSizeLimit = this.maxEntrypointSize;
    const assetSizeLimit = this.maxAssetSize;
    const hints = this.hints;
    const assetFilter =
      this.assetFilter || ((name, source, info) => !info.development);

    compiler.hooks.afterEmit.tap("SizeLimitsPlugin", compilation => {
      // ... handler
    });
  }
};

```

compiler afterEmit hook 的触发时机是在静态资源写入到磁盘之后，这个时候可以对所有的静态资源的体积做分析了。

## handler

```js
// handler
const warnings = [];

// 计算 entrypoint 包含的 chunks 中对应的文件体积总和
const getEntrypointSize = entrypoint =>
  entrypoint.getFiles().reduce((currentSize, file) => {
    const asset = compilation.getAsset(file);
    // 文件需要被 assetFilter 处理一遍
    if (
      asset &&
      assetFilter(asset.name, asset.source, asset.info) &&
      asset.source
    ) {
      return currentSize + (asset.info.size || asset.source.size());
    }

    return currentSize;
  }, 0);

const assetsOverSizeLimit = [];
// 遍历所有的静态资源
for (const { name, source, info } of compilation.getAssets()) {
  // 过滤不符合预期的资源
  if (!assetFilter(name, source, info) || !source) {
    continue;
  }

  const size = info.size || source.size();
  if (size > assetSizeLimit) {
    assetsOverSizeLimit.push({
      name,
      size
    });
    (source).isOverSizeLimit = true;
  }
}

const fileFilter = name => {
  const asset = compilation.getAsset(name);
  return asset && assetFilter(asset.name, asset.source, asset.info);
};

const entrypointsOverLimit = [];
// 遍历所有 entrypoints，找出包含的 chunks 里面所有的文件
for (const [name, entry] of compilation.entrypoints) {
  const size = getEntrypointSize(entry);

  if (size > entrypointSizeLimit) {
    entrypointsOverLimit.push({
      name: name,
      size: size,
      files: entry.getFiles().filter(fileFilter)
    });
    (entry).isOverSizeLimit = true;
  }
}

// hints 为 truth
if (hints) {
  if (assetsOverSizeLimit.length > 0) {
    warnings.push(
      new AssetsOverSizeLimitWarning(assetsOverSizeLimit, assetSizeLimit)
    );
  }
  if (entrypointsOverLimit.length > 0) {
    warnings.push(
      new EntrypointsOverSizeLimitWarning(
        entrypointsOverLimit,
        entrypointSizeLimit
      )
    );
  }

  if (warnings.length > 0) {
    const hasAsyncChunks =
      compilation.chunks.filter(chunk => !chunk.canBeInitial()).length >
      0;

    // 如果项目没有做 code-splitting，那就提示用户做代码分割
    if (!hasAsyncChunks) {
      warnings.push(new NoAsyncChunksWarning());
    }

    // 决定 webpack 以 error 还是 warning 的方式提示用户
    if (hints === "error") {
      compilation.errors.push(...warnings);
    } else {
      compilation.warnings.push(...warnings);
    }
  }
}
```

理解 SizeLimitsPlugin 的关键在于 maxEntrypointSize 的配置，因为它不止包含 entrypoint 对应的文件，还包含由 splitChunks 分离出来的额外的 initial chunk，因为当你加载 entrypoint 对应的 js 的时候，必须加载这个 initial chunk，所以体积得累加计算。