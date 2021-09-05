# EntryOptionPlugin

EntryOptionPlugin 是为了分析 webpack 入口模块究竟是哪种类型。

:::details lib/EntryOptionPlugin.js
```js
const itemToPlugin = (context, item, name) => {
  if (Array.isArray(item)) {
    return new MultiEntryPlugin(context, item, name);
  }
  return new SingleEntryPlugin(context, item, name);
};

module.exports = class EntryOptionPlugin {
  apply(compiler) {
    compiler.hooks.entryOption.tap("EntryOptionPlugin", (context, entry) => {
      // context 是 webpack 运行的上下文路径
      // 如果 entry 的值是字符串，默认名称是 'main'
      if (typeof entry === "string" || Array.isArray(entry)) {
        itemToPlugin(context, entry, "main").apply(compiler);
      } else if (typeof entry === "object") {
        // 如果 entry 的值是对象，key 会作为名称
        for (const name of Object.keys(entry)) {
          itemToPlugin(context, entry[name], name).apply(compiler);
        }
      } else if (typeof entry === "function") {
        new DynamicEntryPlugin(context, entry).apply(compiler);
      }
      return true;
    });
  }
};
```
:::

触发 `compiler.hooks.entryOption` 钩子的时机在是调用 `webpackOptionsApply.process` 的时候。

```js
// 钩入 entryOption hook
new EntryOptionPlugin().apply(compiler);
// 触发 entryOption hook
compiler.hooks.entryOption.call(options.context, options.entry);
```

所以 EntryOptionPlugin 是根据用户配置的 entry 类型来决定使用以下哪种插件。

- **`SingleEntryPlugin`**：entry 的值是**字符串**

```js
// webpack.config.js
module.exports = {
  entry: './index.js'
}
```

详细请👇[SingleEntryPlugin](./SingleEntryPlugin.md)。

- **`MultiEntryPlugin`**：entry 的值是**数组**

```js
// webpack.config.js
module.exports = {
  entry: ['./index.js', './index2.js']
}
```

详细请👇[MultiEntryPlugin](./MultiEntryPlugin.md)。

- **`DynamicEntryPlugin`**：entry 的值是**函数**

```js
// webpack.config.js
module.exports = {
  entry: () => ['./a.js', './b.js'],
  entry: () => new Promise((resolve) => resolve(['./demo', './demo2']))
}
```

详细请👇[DynamicEntryPlugin](./DynamicEntryPlugin.md)。