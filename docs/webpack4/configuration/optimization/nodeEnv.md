# nodeEnv

nodeEnv 配置项是为了让 webpack 替换到 bundle 里面的 `process.env.NODE_ENV`，它的逻辑如下：

```js
if (options.optimization.nodeEnv) {
  const DefinePlugin = require("./DefinePlugin");
  new DefinePlugin({
    "process.env.NODE_ENV": JSON.stringify(options.optimization.nodeEnv)
  }).apply(compiler);
}
```

内部使用的是 DefinePlugin，在编译的时候能够替换指定的代码，它的值取决于 mode，逻辑如下：

```js
// WebpackOptionsDefaulter
this.set("optimization.nodeEnv", "make", options => {
  // 优先取 webpack.config.js, 默认值是 "production"
  return options.mode || "production";
});
```

举个例子，假如你的入口模块 index.js 有这么一段代码：

```js
const isProduction = process.env.NODE_ENV === 'production'
```

经过 webpack 打包之后，输出的代码就变成如下：

```js
const isProduction = 'production' === 'production'
``