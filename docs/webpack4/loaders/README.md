# Loaders

Loaders 是支撑起 webpack 架构的两大核心之一，它允许你对模块代码进行各种修改与转换，通过不同的 loaders 可以将文件从不同的语言转换成 js，也允许你在 js 的模块导入 CSS 文件。

## 使用 loaders

使用 loaders 是需要在 webpack.config.js 配置对应的 `module.rules`。

```js
module.exports = {
  module: {
    rules: [
      { test: /\.css$/, loader: 'css-loader', options: { modules: true } }, // css 文件都会被 css-loader 处理
      { test: /\.ts$/, use: 'ts-loader' } // ts 文件都会被 ts-loader 处理
    ]
  }
};
```

## loader 的运行机制

请👇[loader-runner](./loader-runner.md) 来了解 loader 的原理，以及什么是 `'pitch'` 与 `'normal'`。