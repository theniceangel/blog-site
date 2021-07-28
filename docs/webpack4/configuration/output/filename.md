# filename

该选项决定了每一个输出的 js 文件名称。它的配置有多种形式，比如

```js
module.exports = {
  //...
  output: {
    filename: 'bundle.js' // 不适合多个 entry
    filename: '[name].bundle.js' // 使用 entry 的 name
    filename: '[id].bundle.js' // 使用 chunk id
    filename: '[hash].bundle.js' // 使用每次构建的 hash
    filename: '[chunkhash].bundle.js' // 使用基于 chunk 内容生成的 hash
    filename: '[contenthash].bundle.js' // 使用基于提取的内容生成的 hash, 比如 ExtractTextWebpackPlugin
    // 提供一个返回 filename 的函数
    filename: (chunkData) => {
      return chunkData.chunk.name === 'main' ? '[name].js': '[name]/[name].js';
    },
    // 提供一个路径也可以
    filename: 'js/[name]/bundle.js'
  }
};
```

webpack 内部利用 [TemplatedPathPlugin](../internal-plugins/TemplatedPathPlugin.md#assetpath) 实现上述的占位符变量功能。 