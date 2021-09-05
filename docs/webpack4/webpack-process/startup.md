# 准备工作

要想完全了解 webpack 的构建全流程，可以先从一个简单的例子出发，然后再根据 webpack 的每个配置项，逐个击破。

先准备好如下文件：

:::details webpack.config.js
```js
module.exports = {
  context: __dirname,
  entry: './index.js',
  output: {
    filename: "[name].js"
  }
};
```
:::

:::details index.js(webpack 入口文件)
```js
import A from './a'
console.log(A)
```
:::

:::details a.js
```js
export default 'a'
```
:::