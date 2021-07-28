# EnsureChunkConditionsPlugin

EnsureChunkConditionsPlugin 在 `lib/WebpackOptionsApply.js` 会调用，目的是**为了将 externalModule 提升至 initial chunk**。

要想理解上面这句话，首先得对 [chunk 术语篇](../../term/chunk.md) 里面的概念有一定的了解。**什么是“提升”呢**，这个后面会有一个场景，先来看下 EnsureChunkConditionsPlugin 的实现。

## 类结构

```js
class EnsureChunkConditionsPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap(
      "EnsureChunkConditionsPlugin",
      compilation => {
        const handler = chunks => {
          // ... 省略具体逻辑
        };
        compilation.hooks.optimizeChunksBasic.tap(
          "EnsureChunkConditionsPlugin",
          handler
        );
        compilation.hooks.optimizeExtractedChunksBasic.tap(
          "EnsureChunkConditionsPlugin",
          handler
        );
      }
    );
  }
}
```

optimizeChunksBasic 和 optimizeExtractedChunksBasic hooks 的触发时机是在 compilation.seal 阶段，下面来看具体的逻辑。

## handler

```js
const handler =  chunks => {
  // 变量没用到，应该是作者的疏忽，不影响逻辑
  let changed = false;
  // 遍历所有 module
  for (const module of compilation.modules) {
    // 找出所有 externalModule
    if (!module.chunkCondition) continue;
    const sourceChunks = new Set();
    const chunkGroups = new Set();
    // 找出所有含有 externalModule 的 chunk 以及 chunkGroup
    for (const chunk of module.chunksIterable) {
      if (!module.chunkCondition(chunk)) {
        sourceChunks.add(chunk);
        for (const group of chunk.groupsIterable) {
          chunkGroups.add(group);
        }
      }
    }
    // 如果没有 externalModule，直接退出
    if (sourceChunks.size === 0) continue;
    const targetChunks = new Set();
    // 根据父子关系，找出所有可以放置 externalModule 的 chunk
    chunkGroupLoop: for (const chunkGroup of chunkGroups) {
      for (const chunk of chunkGroup.chunks) {
        // chunk 必须含有 entryModule 才能含有 externalModule
        if (module.chunkCondition(chunk)) {
          targetChunks.add(chunk);
          continue chunkGroupLoop;
        }
      }
      // 如果冒泡到 entrypoint 都没找到合适的 chunk
      if (chunkGroup.isInitial()) {
        throw new Error(
          "Cannot fullfil chunk condition of " + module.identifier()
        );
      }
      // 将所有的 parentChunkGroups 放进 chunkGroups，等待下一次遍历
      for (const group of chunkGroup.parentsIterable) {
        chunkGroups.add(group);
      }
    }

    // 断开原来 chunk 与 externalModule 的连接
    for (const sourceChunk of sourceChunks) {
      GraphHelpers.disconnectChunkAndModule(sourceChunk, module);
    }
    // 建立新 chunk 与 externalModule 的连接
    for (const targetChunk of targetChunks) {
      GraphHelpers.connectChunkAndModule(targetChunk, module);
    }
  }
  if (changed) return true;
}
```

以上的逻辑很简单，就是利用 webpack 的 chunkGraph 结构，遍历所有的 modules，找出 externalModules，并且将它提升到**含有 entryModule 的 chunk**，也就是说 externalModules 可能不会伴随着原有的 chunks 写入 js 文件。

> 什么是 entryModule，可以看[这一篇](../../term/module.md)。

## demo

下面是一个例子，来解释这个插件的作用。

:::details webpack.config.js
```js
var path = require("path");

module.exports = {
  mode: "production",
  context: __dirname,
  entry: {
    index: "./index.js"
  },
  optimization: {
    minimize: false
  },
  target: "web",
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].js",
    pathinfo: true
  },
  externals: ["external"],
  stats: {
    assets: false,
    optimizationBailout: true
  }
};
```
:::

::: details index.js
```js
import(/* webpackChunkName: "async" */"./async");
```
:::

::: details async.js
```js
import { y } from "external";
console.log(y)
```
:::

运行 webpack 打包命令之后，会在 dist 目录下面产出 `async.js` 和 `index.js`。你会惊讶的发现上述的 external module 没有打包到 `async.js`，而是在 `index.js` 里面。

:::details dist/index.js
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
/******/ 		1: 0
/******/ 	};
/******/
/******/
/******/
/******/ 	// script path function
/******/ 	function jsonpScriptSrc(chunkId) {
/******/ 		return __webpack_require__.p + "" + ({"0":"async"}[chunkId]||chunkId) + ".js"
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
/******/ 	__webpack_require__.p = "";
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
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__.e(/*! import() | async */ 0).then(__webpack_require__.bind(null, /*! ./async */ 1));


/***/ }),
/* 1 */,
/* 2 */
/*!***************************!*\
  !*** external "external" ***!
  \***************************/
/*! no static exports found */
/*! exports used: y */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

module.exports = external;

/***/ })
/******/ ]);
```
:::

`index.js` 是手动通过 script 引入到 html 的，尽管 external module 是在 async chunk 才引入的，但是通过 EnsureChunkConditionsPlugin 处理之后，就放到了 index chunk。

总体上来看 EnsureChunkConditionsPlugin 就是为了解决 external module 的问题，因为如果多个 async chunk 引入相同的 external module，还不如直接把 external module 提升至 initial chunk，减少其他 async chunk 的文件的体积。