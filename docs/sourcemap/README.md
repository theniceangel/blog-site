# sourcemap

sourcemap 是从已转换的代码映射到原始源的文件，能够帮助浏览器在调试转换的代码的时候，重现原始源。

文件格式以 `.map` 结尾，格式如下：

```json
{
  "version": 3, // 版本
  "file": "bundle.js", // 转换后的文件名称
  "sourceRoot": "", // source 的根路径，可选值，拼接 sources 字段的最前面
  "sources": [ // 源文件列表，可能存在多个
    "index.js"
  ],
  "sourcesContent": [ // 源文件的内容，可选值，如果上述的 source 找不到，会依赖这个字段
    "console.log(1);"
  ],
  "names": [], // mappings 使用到的 names 变量
  "mappings": ";;;CAAA,OAAO,CAAC,GAAG,CAAC,CAAC,CAAC;;;;;;" // 包含映射关系的加密后的数据
}
```

该例子通过 rollup 打包。

:::details bundle.js
```js
(function () {
	'use strict';

	console.log(1);

}());
//# sourceMappingURL=bundle.js.map

```
:::

## mappings

mappings 的规则如下：

- **通过 `;` 分割生成文件的每一行(line)**

- **通过 `,` 分割每一行的每个独立部分(segment)，比如以上的 `console`，`.`，`log` 等等**


