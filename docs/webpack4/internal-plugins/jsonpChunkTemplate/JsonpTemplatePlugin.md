# JsonpTemplatePlugin

:::details lib/web/JsonpTemplatePlugin.js
```js
const JsonpMainTemplatePlugin = require("./JsonpMainTemplatePlugin");
const JsonpChunkTemplatePlugin = require("./JsonpChunkTemplatePlugin");
const JsonpHotUpdateChunkTemplatePlugin = require("./JsonpHotUpdateChunkTemplatePlugin");

class JsonpTemplatePlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("JsonpTemplatePlugin", compilation => {
      // 给带有 runtime 代码的 chunk 来生成代码
      new JsonpMainTemplatePlugin().apply(compilation.mainTemplate);
      // 给不包含 runtime 代码的 chunk 来生成代码
      new JsonpChunkTemplatePlugin().apply(compilation.chunkTemplate);
      // 给 hmr 更新后的 chunk 来生成代码
      new JsonpHotUpdateChunkTemplatePlugin().apply(
        compilation.hotUpdateChunkTemplate
      );
    });
  }
}
```
:::

JsonpTemplatePlugin 只是对 `JsonpMainTemplatePlugin`、`JsonpChunkTemplatePlugin`、`JsonpHotUpdateChunkTemplatePlugin` 这三个插件进行了聚合。

- **`JsonpMainTemplatePlugin`**

  // TODO

- **`JsonpChunkTemplatePlugin`**

  // TODO

- **`JsonpHotUpdateChunkTemplatePlugin`**

  // TODO
