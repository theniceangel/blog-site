# mode

mode 决定 webpack 需要使用哪些内置的 plugins。它的枚举值如下：

| 枚举值 | 作用 |
| :-----| -----: |
| `'production'` | 设置 `process.env.NODE_ENV` 为 `production`，同时开启 `options.optimization` 的若干选项 |
| `'development'` | 设置 `process.env.NODE_ENV` 为 `development` |
| `'none'` | 一般不设置 |

如果没有设置 `mode` 值，效果与 `'production'` 一致，并且利用 WarnNoModeSetPlugin 给出一个 warning。

## WarnNoModeSetPlugin

```js
class NoModeWarning extends WebpackError {
  constructor(modules) {
    super();

    this.name = "NoModeWarning";
    this.message =
      "configuration\n" +
      "The 'mode' option has not been set, webpack will fallback to 'production' for this value. " +
      "Set 'mode' option to 'development' or 'production' to enable defaults for each environment.\n" +
      "You can also set it to 'none' to disable any default behavior. " +
      "Learn more: https://webpack.js.org/configuration/mode/";

    Error.captureStackTrace(this, this.constructor);
  }
};

class WarnNoModeSetPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("WarnNoModeSetPlugin", compilation => {
      compilation.warnings.push(new NoModeWarning());
    });
  }
}
```

WarnNoModeSetPlugin 插件的实例化是在[执行 innerPlugins
](../webpack-process/inner-plugins.md#第八步-options-mode) 的时候，而 thisCompilation hook 的触发时机是在调用 `compiler.compile` 的时候，这个时候刚生成 compilation，会往 compilation 存入一个 warning，在构建完成之后会将这条 warning 显示出来。