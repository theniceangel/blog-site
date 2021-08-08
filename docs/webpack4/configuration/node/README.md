# node

node 的配置项决定了是否需要给 nodejs 的核心模块做一层 polyfill，因此在浏览器的环境下，也能安全使用这些 API。

它可以配置为 `false`，表示不做任何处理，也可以配置成如下对象：

```js
module.exports = {
  //...
  node: {
    // 使用 NodeStuffPlugin
    __filename: 'mock',
    __dirname: 'mock',

    // 使用 NodeSourcePlugin
    console: false, // 浏览器有 console，所以不必处理
    global: true,
    process: true,
    Buffer: true,
    setImmediate: true
    fs: 'empty',
    dns: 'mock'
    url: true
    // ... 省略其他的 node core libs 配置
  }
};
```

node 的选项值可以配置为以下的值：

- **true**: 提供 polyfill

- **'mock'**: 提供 mock 功能函数，详细的见 [node-libs-browser](../../third-dependencies/node-libs-browser.md) mock 模块

- **'empty'**: 提供一个空对象

- **false**: 什么都不做

::: warning
并不是所有的模块都支持如上四个配置项，对于不需要引入的 node 中的对象，比如 process, setImmediate，这些就不能配置为 `'empty'`，对于 `fs` 就可以配置为 `'empty'`，但是不能配置为 `'mock'`，因为 [node-libs-browser](../../third-dependencies/node-libs-browser.md) 不支持。
:::

## NodeStuffPlugin

webpack 内部使用 NodeStuffPlugin 来对代码中 `__filename` 以及 `__dirname` 做处理。

- **`node.__filename`**

| 值 | 描述 |
| :-----| -----: |
| `true` | 文件相对于 [context](../context.md) 选项的路径 |
| `false` | 不处理 |
| `mock` | 替换成常量 `'/index.js'` |

- **`node.__dirname`**

| 值 | 描述 |
| :-----| -----: |
| `true` | 当前文件所在文件夹相对于 [context](../context.md) 选项的路径 |
| `false` | 不处理 |
| `mock` | 替换成常量 `'/'` |

详细的分析[请👇 NodeStuffPlugin](../../internal-plugins/NodeStuffPlugin.md)

## NodeSourcePlugin

webpack 内部使用 NodeSourcePlugin 来对代码中 node 的一些模块和对象进行 polyfill。

- **`node.console`**

因为浏览器有了 console 的实现，所以一般配置为 `false`

- **`node.process`**

默认值为 `true`，可以配置成 `'mock'`

- **`node.global`**

默认值为 `true`

- **`node.Buffer`**

默认值为 `true`，可以配置成 `'mock'`

- **`node.setImmediate`**

默认值为 `true`，可以配置成 `'mock'` | `'empty'`

还可以设置其他的配置项，比如 `node.fs`、`node.dns`，所有的 polyfills 都是来自于 [node-libs-browser](../../third-dependencies/node-libs-browser.md)。

详细的分析[请👇 NodeSourcePlugin](../../internal-plugins/NodeSourcePlugin.md)