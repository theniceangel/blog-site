# flagIncludedChunks

flagIncludedChunks 配置专门用来标记作为子集的 chunks，因为当他们的父 chunks 加载完成了，它们就没必要加载了，在 production 环境下，该配置会开启，使用的是 FlagIncludedChunksPlugin 插件。

## FlagIncludedChunksPlugin

```js
class FlagIncludedChunksPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("FlagIncludedChunksPlugin", compilation => {
			compilation.hooks.optimizeChunkIds.tap(
				"FlagIncludedChunksPlugin",
				(chunks) => {
					// ... handle
				}
			);
		});
	}
}
```

optimizeChunkIds hook 的触发时机是在 compilation.seal 阶段，下面来看具体的逻辑：

## handle

```js
// 第一步：给每个 module 分配对应的二进制，不同的 module 分配的值可能相同
const moduleBits = new WeakMap();
const modulesCount = compilation.modules.length;

const modulo = 1 / Math.pow(1 / modulesCount, 1 / 31);
const modulos = Array.from(
  { length: 31 },
  (x, i) => Math.pow(modulo, i) | 0
);

let i = 0;
for (const module of compilation.modules) {
  let bit = 30;
  while (i % modulos[bit] !== 0) {
    bit--;
  }
  // 对 1 的二进制位进行左移 bit 位
  moduleBits.set(module, 1 << bit);
  i++;
}

// 第二步：计算每个 chunk 的二进制值，它们是由所有的 moduleBit 按位或计算而来
const chunkModulesHash = new WeakMap();
for (const chunk of chunks) {
  let hash = 0;
  for (const module of chunk.modulesIterable) {
    hash |= moduleBits.get(module);
  }
  chunkModulesHash.set(chunk, hash);
}

// 第三步：遍历所有的 chunks，判断两个 chunk 是否有包含关系
for (const chunkA of chunks) {
  // 当前 chunk 的 bitsvalue
  const chunkAHash = chunkModulesHash.get(chunkA);
  // 当前 chunk 的模块数量
  const chunkAModulesCount = chunkA.getNumberOfModules();
  if (chunkAModulesCount === 0) continue;
  let bestModule = undefined;
  // 从当前 chunk 中找到最优 module 来做切入点
  // 最优 module 的特点是它被其他 chunk 引用的次数最少
  for (const module of chunkA.modulesIterable) {
    if (
      bestModule === undefined ||
      bestModule.getNumberOfChunks() > module.getNumberOfChunks()
    )
      bestModule = module;
  }
  // 内循环：遍历依赖当前 chunk 的最优 module 的所有 chunks
  loopB: for (const chunkB of bestModule.chunksIterable) {
    // 剔除自身 chunk，进行下一次 loopB
    if (chunkA === chunkB) continue;

    const chunkBModulesCount = chunkB.getNumberOfModules();

    // 如果是一个 empty chunk，进行下一次 loopB
    if (chunkBModulesCount === 0) continue;

    // 如果 chunkA 的模块数量比 chunkB 的模块数量多，进行下一次 loopB
    if (chunkAModulesCount > chunkBModulesCount) continue;

    // is chunkA in chunkB?

    // 进行按位与的操作
    const chunkBHash = chunkModulesHash.get(chunkB);
    // 如果 chunkA 与 chunkB 内的 chunkModulesHash 不相同，进行下一次 loopB
    if ((chunkBHash & chunkAHash) !== chunkAHash) continue;

    // 因为不同的 module 可能有相同的 moduleBit，
    // 还是得具体判断 chunkB 是否包含 chunkA 所有的模块
    for (const m of chunkA.modulesIterable) {
      if (!chunkB.containsModule(m)) continue loopB;
    }
    // chunkA 是 chunkB 的子集
    // 在 chunkB 生成代码的时候，会带有 chunkA 的 id
    // 这样做的好处是如果加载了 chunkB，再加载 chunkA 的时候，就不用额外的请求 chunkA 对应的 js 文件。
    chunkB.ids.push(chunkA.id);
  }
}
```

上述的逻辑分为三步，第一步没看懂为什么要这么设计 module 的 bit，后续的逻辑倒是情理之中。

上面还涉及到 bitmasks 以及**按位与** `&`、**按位或** `|`、**左移** `<<` 的操作。

```js
// 对 1 进行左移操作，比如 1 << 2，从 '001'，就变成二进制 '100'，同理类推
// 假设 chunkA 含有的 modules [m1, m2, m3], 对应的二进制 bit 是 ['1', '10', '11']
// 进行按位或操作，那么 chunkA 的 chunkAHash 是 '11'
// 假设 chunkB 含有的 modules [m1], 对应的二进制 bit 是 ['1']
// 进行按位或操作，那么 chunkB 的 chunkBHash 是 '1'
// 最后进行 chunkBHash & chunkAHash 操作，就是 '1' 了。
```

看了原理，那么来看一个真实的场景，到底这个插件有什么用途：

:::details webpack.config.js
```js
const path = require('path')

module.exports = {
	context: __dirname,
	entry: {
		entry: "./entry"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js",
		publicPath: './dist/',
	},
	optimization: {
		minimize: false,
	}
};
```
:::

:::details entry.js
```js
import(/* webpackChunkName: "async1" */"./async1").then(() => {
  require.ensure(["./a", "./b"], () => {
    console.log('async2')
  }, 'async2')
})
```
:::

:::details a 与 b.js 
```js
// a.js
export default 'a'

// b.js
export default 'b'
```
:::

运行 webpack 打包命令之后，在 dist 目录下生成了 `entry.js`、`async1.js`、`async2.js` 三个文件。

:::details dist/entry.js
```js
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		2: 0
/******/ 	};
/******/
/******/
/******/
/******/ 	// script path function
/******/ 	function jsonpScriptSrc(chunkId) {
/******/ 		return __webpack_require__.p + "" + ({"0":"async1","1":"async2"}[chunkId]||chunkId) + ".js"
/******/ 	}
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var promises = [];
/******/
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var script = document.createElement('script');
/******/ 				var onScriptComplete;
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = jsonpScriptSrc(chunkId);
/******/
/******/ 				// create error before stack unwound to get useful stacktrace later
/******/ 				var error = new Error();
/******/ 				onScriptComplete = function (event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 							error.name = 'ChunkLoadError';
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				document.head.appendChild(script);
/******/ 			}
/******/ 		}
/******/ 		return Promise.all(promises);
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "./dist/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__.e(/* import() | async1 */ 0).then(__webpack_require__.bind(null, 3)).then(() => {
  __webpack_require__.e(/* require.ensure | async2 */ 1).then((() => {
    console.log('async2')
  }).bind(null, __webpack_require__)).catch(__webpack_require__.oe)
})


/***/ })
/******/ ]);
```
:::

:::details dist/async1.js
```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0,1],[
/* 0 */,
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ('a');

/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ('b');

/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var _b__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);




/***/ })
]]);
```
:::

:::details dist/async2.js
```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */,
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ('a');

/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ('b');

/***/ })
]]);
```
:::

再在根目录下新建一个 index.html 测一测。

:::details index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <script src="./dist/entry.js"></script>
</head>
<body>
  
</body>
</html>
```
:::

打开这个页面，你会神奇的发现 entry.js 代码逻辑里面请求 async2.js 的意图好像没有发生，其实这也就是 FlagIncludedChunksPlugin 的功劳，首先如果 async1.js 加载了，async2.js 有必要加载么？因为 async1 含有 async2 所有的模块，所以在 async1 这个 chunk 生成代码的时候，它会遍历 chunk.ids，生成如下的代码：

```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0,1],/* 省略*/]);
```

其中的 `[0, 1]` 就是在 FlagIncludedChunksPlugin 内部生成的，`0` 代表 `async1.js`, `1` 代表 `async2.js`，当 async1.js 加载完了之后，执行 `window["webpackJsonp"].push` 其实是走进了 `dist/entry.js` 内部的 webpackJsonpCallback 函数，在这个函数内部会通过 installedChunks 记录 `async2` 这个 chunk 加载完成了。

**chunk 加载的目的只是为了把 modules 都存储到 entry.js 这个立即执行函数的 modules 对象上去**

由于 async1.js 已经加载完成，它包含了 async2.js 所有的模块，所以在执行 `__webpack_require__.e(/* require.ensure | async2 */ 1)` 的时候，发现 async2 这个 chunk 已经在 installedChunks 标记为加载完成的状态，因而不会再发送一个请求去加载 `async2.js`。