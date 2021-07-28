# chunkFilename

该选项决定了非入口 js 文件的名称，它的配置与 [filename](./filename.md) 相同，而且默认情况下，如果 `filename` 不是函数，就直接取 filename 的值，否则默认值就是 `"[id].js"`，可以在 `WebpackOptionsDefaulter.js` 找到相关逻辑。

```js
class WebpackOptionsDefaulter extends OptionsDefaulter {
  this.set("output.chunkFilename", "make", options => {
    const filename = options.output.filename;
    if (typeof filename !== "function") {
      const hasName = filename.includes("[name]");
      const hasId = filename.includes("[id]");
      const hasChunkHash = filename.includes("[chunkhash]");
      // Anything changing depending on chunk is fine
      if (hasChunkHash || hasName || hasId) return filename;
      // Elsewise prefix "[id]." in front of the basename to make it changing
      return filename.replace(/(^|\/)([^/]*(?:\?|$))/, "$1[id].$2");
    }
    return "[id].js";
  });
}
```

具体的实现逻辑请👇[TemplatedPathPlugin](../internal-plugins/TemplatedPathPlugin.md#assetpath)。