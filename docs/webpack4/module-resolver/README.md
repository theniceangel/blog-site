# 引言

webpack 中路径的解析是非常关键的，因为在代码当中你可以使用如下的语法来引入 module。

```js
import foo from 'path/to/module';
// or
require('path/to/module');
```

对于 webpack，它怎么知道 `'path/to/module'` 路径对应的是哪个文件。

再比如 loaders 的配置：

```js
module.exports = {
  //...
  module: {
    rules: [
      {
        test: /\.css$/,
        oneOf: [
          {
            resourceQuery: /inline/, // foo.css?inline
            use: 'url-loader'
          },
          {
            resourceQuery: /external/, // foo.css?external
            use: 'file-loader'
          }
        ]
      }
    ]
  }
};
```

它怎么知道 `'url-loader'` 以及 `'file-loader'` 的路径是什么呢？

webpack 使用 [enhanced-resolve](https://github.com/webpack/enhanced-resolve) 来找到这些目标的绝对路径，webpack v4.46.0 使用的是 v4.5.0 版本的 enhanced-resolve。下面来具体分析 enhanced-resolve 底层的实现。