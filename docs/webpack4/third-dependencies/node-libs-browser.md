# node-libs-browser

[node-libs-browser](https://github.com/webpack/node-libs-browser) 是 webpack 作者自己维护的一个库，为了在浏览器使用一些 node 核心模块。webpack v4.46.0 版本使用的是 2.2.1 版本的  

node-libs-browser 导出来的对象拥有以下的属性来与 node core libs 接口对齐，其中一些模块还提供了 mock 的功能，仅仅只是为了拉齐 node core libs 的 API，mock 函数并没有什么功能，以下是整体的对照

| lib name | browser implementation | mock implementation |
|:--------:|:----------------------:|:-------------------:|
| assert | [defunctzombie/commonjs-assert](https://github.com/defunctzombie/commonjs-assert) | --- |
| buffer | [feross/buffer](https://github.com/feross/buffer) | [buffer.js](https://github.com/webpack/node-libs-browser/blob/master/mock/buffer.js) |
| child_process | --- | --- |
| cluster | --- | --- |
| console | [Raynos/console-browserify](https://github.com/Raynos/console-browserify) | [console.js](https://github.com/webpack/node-libs-browser/blob/master/mock/console.js) |
| constants | [juliangruber/constants-browserify](https://github.com/juliangruber/constants-browserify) | --- |
| crypto | [crypto-browserify/crypto-browserify](https://github.com/crypto-browserify/crypto-browserify) | --- |
| dgram | --- | --- |
| dns | --- | [dns.js](https://github.com/webpack/node-libs-browser/blob/master/mock/dns.js) |
| domain | [bevry/domain-browser](https://github.com/bevry/domain-browser) | --- |
| events | [Gozala/events](https://github.com/Gozala/events) | --- |
| fs | --- | --- |
| http | [jhiesey/stream-http](https://github.com/jhiesey/stream-http) | --- |
| https | [substack/https-browserify](https://github.com/substack/https-browserify) | --- |
| module | --- | --- |
| net | --- | [net.js](https://github.com/webpack/node-libs-browser/blob/master/mock/net.js) |
| os | [CoderPuppy/os-browserify](https://github.com/CoderPuppy/os-browserify) | --- |
| path | [substack/path-browserify](https://github.com/substack/path-browserify) | --- |
| process | [shtylman/node-process](https://github.com/shtylman/node-process) | [process.js](https://github.com/webpack/node-libs-browser/blob/master/mock/process.js) |
| punycode | [bestiejs/punycode.js](https://github.com/bestiejs/punycode.js) | [punycode.js](https://github.com/webpack/node-libs-browser/blob/master/mock/punycode.js) |
| querystring | [mike-spainhower/querystring](https://github.com/mike-spainhower/querystring) | --- |
| readline | --- | --- |
| repl | --- | --- |
| stream | [substack/stream-browserify](https://github.com/substack/stream-browserify) | --- |
| string_decoder | [rvagg/string_decoder](https://github.com/rvagg/string_decoder) | --- |
| sys | [defunctzombie/node-util](https://github.com/defunctzombie/node-util) | --- |
| timers | [jryans/timers-browserify](https://github.com/jryans/timers-browserify) | --- | 
| tls | --- | [tls.js](https://github.com/webpack/node-libs-browser/blob/master/mock/tls.js) |
| tty | [substack/tty-browserify](https://github.com/substack/tty-browserify) | [tty.js](https://github.com/webpack/node-libs-browser/blob/master/mock/tty.js) |
| url | [defunctzombie/node-url](https://github.com/defunctzombie/node-url) | --- |
| util | [defunctzombie/node-util](https://github.com/defunctzombie/node-util) | --- |
| vm | [substack/vm-browserify](https://github.com/substack/vm-browserify) | --- |
| zlib | [devongovett/browserify-zlib](https://github.com/devongovett/browserify-zlib) | --- |

## 原理

node-libs-browser 模块只是暴露了其他浏览器侧模块的路径，并没有实际引用这些模块。来看它的 `index.js`

::: details index.js
```js
// 通过 require.resolve 得到的就是对应模块的绝对路径
exports.assert = require.resolve('assert/');
exports.buffer = require.resolve('buffer/');
exports.child_process	= null;
exports.cluster = null;
exports.console = require.resolve('console-browserify');
exports.constants = require.resolve('constants-browserify');
exports.crypto = require.resolve('crypto-browserify');
exports.dgram = null;
exports.dns = null;
exports.domain = require.resolve('domain-browser');
exports.events = require.resolve('events/');
exports.fs = null;
exports.http = require.resolve('stream-http');
exports.https	= require.resolve('https-browserify');
exports.module = null;
exports.net = null;
exports.os = require.resolve('os-browserify/browser.js');
exports.path = require.resolve('path-browserify');
exports.punycode = require.resolve('punycode/');
exports.process = require.resolve('process/browser.js');
exports.querystring = require.resolve('querystring-es3/');
exports.readline = null;
exports.repl = null;
exports.stream = require.resolve('stream-browserify');
exports._stream_duplex = require.resolve('readable-stream/duplex.js');
exports._stream_passthrough = require.resolve('readable-stream/passthrough.js');
exports._stream_readable = require.resolve('readable-stream/readable.js');
exports._stream_transform = require.resolve('readable-stream/transform.js');
exports._stream_writable = require.resolve('readable-stream/writable.js');
exports.string_decoder = require.resolve('string_decoder/');
exports.sys = require.resolve('util/util.js');
exports.timers = require.resolve('timers-browserify');
exports.tls = null;
exports.tty = require.resolve('tty-browserify');
exports.url = require.resolve('url/');
exports.util = require.resolve('util/util.js');
exports.vm = require.resolve('vm-browserify');
exports.zlib = require.resolve('browserify-zlib');
```
:::

可以看到暴露出去的都是对应 browser 实现的模块的路径，node-libs-browser 通过 package.json 来确保这些依赖被安装。

:::details package.json
```json
{
  "dependencies": {
    "assert": "^1.1.1",
    "browserify-zlib": "^0.2.0",
    "buffer": "^4.3.0",
    "console-browserify": "^1.1.0",
    "constants-browserify": "^1.0.0",
    "crypto-browserify": "^3.11.0",
    "domain-browser": "^1.1.1",
    "events": "^3.0.0",
    "https-browserify": "^1.0.0",
    "os-browserify": "^0.3.0",
    "path-browserify": "0.0.1",
    "process": "^0.11.10",
    "punycode": "^1.2.4",
    "querystring-es3": "^0.2.0",
    "readable-stream": "^2.3.3",
    "stream-browserify": "^2.0.1",
    "stream-http": "^2.7.2",
    "string_decoder": "^1.0.0",
    "timers-browserify": "^2.0.4",
    "tty-browserify": "0.0.0",
    "url": "^0.11.0",
    "util": "^0.11.0",
    "vm-browserify": "^1.0.1"
  }
}
```
:::

node-libs-browser 也提供了一些模块的 mock。他们都在 mock 目录下面。

```js
/mock
  |
  |-- buffer.js
  |-- console.js
  |-- dns.js
  |-- empty.js
  |-- net.js
  |-- process.js
  |-- punycode.js
  |-- tls.js
  |-- tty.js
```

这些 mock 模块也会被 webpack 的 NodeSourcePlugin 插件引用。