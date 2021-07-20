# chunk

webpack 输出资源都是以 chunk 为纬度，chunk 是由 [module](./module.md) 组成，chunk 的类型也分很多种，生成的代码也大有不同。

[[toc]]

## initial chunk

initial chunk 一般指的是由 [entryModule](./module.md#entrymodule) 解析出来的所有 modules 组成的 chunk，initial chunk 是取决于 webpack entry 的配置，举个例子：

```js
// webpack.config.js
module.exports = {
  // ...
  entry: ['./a.js', './b.js'] // 对应一个名称为 main 的 chunk，类型是 initial
  entry: './index.js', // 对应一个名称为 main 的 chunk，类型是 initial
  entry: { // 存在两个 initial chunk
    a: './a.js', // 名称为 a 的 chunk
    b: './b.js' // 名称为 b 的 chunk
  },
  // 动态入口取决于返回值
  entry: () => './index.js', // main chunk
  entry: () => ['./a.js', './b.js'] // a chunk, b chunk
}
```

可以看出 initial chunk 的生成是由入口 module 决定的，但是有没有其他的方式生成 initial chunk？

**通过 [splitChunks](../optimization/splitChunks.md) 配置也可以生成 initial chunk。**

换句话来说，**从 initial chunk 中分离出去的 modules 组成的 chunk，也是 initial chunk**，它们的特点是**需要自己手动通过 script 标签引入**，不过 HtmlWebpackPlugin 插件可以替你完成这些琐碎的任务，举个例子：

:::details webpack.config.js
```js
var path = require("path");

module.exports = {
	context: __dirname,
	entry: {
		index: "./index",
	},
	devtool: false,
	optimization: {
		minimize: false,
		splitChunks: {
			cacheGroups: { // 将 react 抽离出来
				vendors: {
					minChunks: 1,
					chunks: 'initial',
					minSize: 5000
				}
			}
		}
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	}
};
```
:::

::: details index.js
```js
import 'react'
```
:::

运行 webpack 打包命令之后，会在 dist 下面生成 `index.js` 与 `vendors-index.js` 两个文件，在 webpack 内部，他们分别对应 name 为 `index` 和 name 为 `vendors-index` 的 initial chunk。

vendors-index chunk 的由来是因为 index chunk 含有 react module，但是通过 `splitChunks`，我们将 react 分离出来了，形成了 vendors-index chunk。

## runtime chunk

runtime chunk 指的是生成含有 webpack bootstrap 代码的 js 文件的 chunk，什么是 webpack bootstrap 代码呢？以下的代码片段就是启动代码。

:::details webapck runtime boostrap 代码
```js
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
```
:::

所以 chunk 可能同时是 initial 和 runtime chunk，比如上述的 `index chunk` 就是这种类型，它既含有 webpack bootstrap code，也含有所有 modules，modules 作为实参传给 bootstrap 函数。

那么是否可以让 runtime chunk 变得更加 pure 一点么？[runtimeChunk](../optimization/runtimeChunk.md) 配置可以做到这点，原理就是 **modules 分离到另外的 chunk，单独把 bootstrap code 抽离至 runtime chunk**。

举个例子：

:::details webpack.config.js
```js
var path = require("path");

module.exports = {
	context: __dirname,
	entry: {
		index: "./index",
	},
	devtool: false,
	optimization: {
		minimize: false,
		runtimeChunk: 'single'
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	}
};
```
:::


:::details index.js
```js
console.log('index.js')
```
:::

运行 webpack 命令打包后，在 dist 目录下面生成了 `index.js` 和 `runtime.js`，其中 `runtime.js` 就是由 runtime chunk 生成的，代码如下：

:::details runtime.js
```js
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/ 		var executeModules = data[2];
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
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fulfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 			}
/******/ 			if(fulfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/
/******/ 		return result;
/******/ 	}
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
/******/ 	var deferredModules = [];
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
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// run deferred modules from other chunks
/******/ 	checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ([]);
```
:::

可以看到 `runtime.js` 仅仅包含 webpack runtime boostrap 代码，所有的 modules 都分离到 `index.js`。

:::details index.js
```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/***/ (function(module, exports) {

console.log('index.js')

/***/ })
],[[0,1]]]);
```
:::

## async chunk

async chunk 的由来是因为 code splitting，webpack 提供两种方式来创建 async chunk。

```js
// import 动态引入
import(/* webpackChunkName: "a" */'./a'); // 生成 a async chunk

// require.ensure 语法
require.ensure(['./a', function() {}, 'a']) // 生成 a async chunk
```

a async chunk 代表分割点就是 a 模块，chunk 包含了 a 模块，以及由 a 模块 深度遍历解析出来的所有 modules。举个例子：

:::details webpack.config.js
```js
var path = require("path");

module.exports = {
  mode: "development",
	context: __dirname,
	devtool: false,
	entry: {
		index: "./index",
	},
	optimization: {
		minimize: false
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	}
};
```
:::

::: details index.js
```js
import(/* webpackChunkName: "a" */'./a')
```
:::

::: details a.js
```js
import './b.js'
```
:::

::: details b.js
```js
export default 'It is b module'
```
:::

运行 webpack 打包命令之后，a async chunk 生成的文件 `a.js`  的代码如下，包含了模块 a 以及模块 b，async chunk 的特点就是 **webpack 运行时通过 script 加载 async chunk 对应的 js，不需要人为手动通过 script 引入**。

::: details dist/a.js
```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["a"],{

/***/ "./a.js":
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _b_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./b.js */ "./b.js");


/***/ }),

/***/ "./b.js":
/*!**************!*\
  !*** ./b.js ***!
  \**************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ('It is b module');

/***/ })

}]);
```
:::

与 initial chunk 类似，async chunk 也可以通过 [splitChunks](../optimization/splitChunks.md) 配置，从 async chunk 分离出来的 modules 组成的 newChunk 也属于 async 类型，姑且称之为**衍生品**，它的特点就是 **webpack 运行时会通过 script 加载所有的 async chunk 生成的 js，并且通过 Promise.all 等待所有文件加载完成**，对上述的例子做一点改造，修改 webpack.config.js 中的 cacheGroups 分组：

:::details webpack.config.js
```js
var path = require("path");

module.exports = {
	mode: "development",
	context: __dirname,
	devtool: false,
	entry: {
		index: "./index",
	},
	optimization: {
		minimize: false,
		splitChunks: {
			cacheGroups: {
				b: { // 将 module b 从 a async chunk 抽离至 b async chunk
					test: path.resolve(__dirname, "b"),
					name: "b",
					priority: 2,
					minSize: 30
				}
			}
		}
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	}
};
```
:::

运行 webpack 打包之后，在 dist 目录下面生成 `a.js`、`b.js`、`index.js`，其中 `b.js` 就是**衍生品** b async chunk 生成的 js，它的组成仅仅包含 b 模块。

:::details
```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["b"],{

/***/ "./b.js":
/*!**************!*\
  !*** ./b.js ***!
  \**************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ('It is b module');

/***/ })

}]);
```
:::

既然 b 模块被抽离了，所以 `a.js` 只包含了 a 模块，不再同时包含 a 与 b 模块。

:::details
```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["a"],{

/***/ "./a.js":
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _b_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./b.js */ "./b.js");


/***/ })

}]);
```
:::

那么对于 `index.js`，是怎么加载 `a.js`，`b.js` 的呢？

```js
/******/ (function(modules) { // webpackBootstrap
/******/ 	// ... 省略其他代码
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./index.js");
/******/ })
/******/ ({

/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

Promise.all(/*! import() | a */[__webpack_require__.e("b"), __webpack_require__.e("a")]).then(__webpack_require__.bind(null, /*! ./a */ "./a.js"))

/***/ })

/******/ });
```

`__webpack_require__.e` 内部会通过 script 动态加载额外的 js。

## 关于 chunk 的类

1. **Chunk**

    :::details Chunk.js
    ```js
    /**
		 * A Chunk is a unit of encapsulation for Modules.
		* Chunks are "rendered" into bundles that get emitted when the build completes.
		*/
		class Chunk {
			/**
			* @param {string=} name of chunk being created, is optional (for subclasses)
			*/
			constructor(name) {
				/** @type {number | null} */
				this.id = null;
				/** @type {number[] | null} */
				this.ids = null;
				/** @type {number} */
				this.debugId = debugId++;
				/** @type {string} */
				this.name = name;
				/** @type {boolean} */
				this.preventIntegration = false;
				/** @type {Module=} */
				this.entryModule = undefined;
				/** @private @type {SortableSet<Module>} */
				this._modules = new SortableSet(undefined, sortByIdentifier);
				/** @type {string?} */
				this.filenameTemplate = undefined;
				/** @private @type {SortableSet<ChunkGroup>} */
				this._groups = new SortableSet(undefined, sortChunkGroupById);
				/** @type {string[]} */
				this.files = [];
				/** @type {boolean} */
				this.rendered = false;
				/** @type {string=} */
				this.hash = undefined;
				/** @type {Object} */
				this.contentHash = Object.create(null);
				/** @type {string=} */
				this.renderedHash = undefined;
				/** @type {string=} */
				this.chunkReason = undefined;
				/** @type {boolean} */
				this.extraAsync = false;
				this.removedModules = undefined;
			}

			/**
			* @deprecated Chunk.entry has been deprecated. Please use .hasRuntime() instead
			* @returns {never} Throws an error trying to access this property
			*/
			get entry() {
				throw new Error(ERR_CHUNK_ENTRY);
			}

			/**
			* @deprecated .entry has been deprecated. Please use .hasRuntime() instead
			* @param {never} data The data that was attempting to be set
			* @returns {never} Throws an error trying to access this property
			*/
			set entry(data) {
				throw new Error(ERR_CHUNK_ENTRY);
			}

			/**
			* @deprecated Chunk.initial was removed. Use canBeInitial/isOnlyInitial()
			* @returns {never} Throws an error trying to access this property
			*/
			get initial() {
				throw new Error(ERR_CHUNK_INITIAL);
			}

			/**
			* @deprecated Chunk.initial was removed. Use canBeInitial/isOnlyInitial()
			* @param {never} data The data attempting to be set
			* @returns {never} Throws an error trying to access this property
			*/
			set initial(data) {
				throw new Error(ERR_CHUNK_INITIAL);
			}

			/**
			* @returns {boolean} whether or not the Chunk will have a runtime
			*/
			hasRuntime() {
				for (const chunkGroup of this._groups) {
					if (
						chunkGroup.isInitial() &&
						chunkGroup instanceof Entrypoint &&
						chunkGroup.getRuntimeChunk() === this
					) {
						return true;
					}
				}
				return false;
			}

			/**
			* @returns {boolean} whether or not this chunk can be an initial chunk
			*/
			canBeInitial() {
				for (const chunkGroup of this._groups) {
					if (chunkGroup.isInitial()) return true;
				}
				return false;
			}

			/**
			* @returns {boolean} whether this chunk can only be an initial chunk
			*/
			isOnlyInitial() {
				if (this._groups.size <= 0) return false;
				for (const chunkGroup of this._groups) {
					if (!chunkGroup.isInitial()) return false;
				}
				return true;
			}

			/**
			* @returns {boolean} if this chunk contains the entry module
			*/
			hasEntryModule() {
				return !!this.entryModule;
			}

			/**
			* @param {Module} module the module that will be added to this chunk.
			* @returns {boolean} returns true if the chunk doesn't have the module and it was added
			*/
			addModule(module) {
				if (!this._modules.has(module)) {
					this._modules.add(module);
					return true;
				}
				return false;
			}

			/**
			* @param {Module} module the module that will be removed from this chunk
			* @returns {boolean} returns true if chunk exists and is successfully deleted
			*/
			removeModule(module) {
				if (this._modules.delete(module)) {
					module.removeChunk(this);
					return true;
				}
				return false;
			}

			/**
			* @param {Module[]} modules the new modules to be set
			* @returns {void} set new modules to this chunk and return nothing
			*/
			setModules(modules) {
				this._modules = new SortableSet(modules, sortByIdentifier);
			}

			/**
			* @returns {number} the amount of modules in chunk
			*/
			getNumberOfModules() {
				return this._modules.size;
			}

			/**
			* @returns {SortableSet} return the modules SortableSet for this chunk
			*/
			get modulesIterable() {
				return this._modules;
			}

			/**
			* @param {ChunkGroup} chunkGroup the chunkGroup the chunk is being added
			* @returns {boolean} returns true if chunk is not apart of chunkGroup and is added successfully
			*/
			addGroup(chunkGroup) {
				if (this._groups.has(chunkGroup)) return false;
				this._groups.add(chunkGroup);
				return true;
			}

			/**
			* @param {ChunkGroup} chunkGroup the chunkGroup the chunk is being removed from
			* @returns {boolean} returns true if chunk does exist in chunkGroup and is removed
			*/
			removeGroup(chunkGroup) {
				if (!this._groups.has(chunkGroup)) return false;
				this._groups.delete(chunkGroup);
				return true;
			}

			/**
			* @param {ChunkGroup} chunkGroup the chunkGroup to check
			* @returns {boolean} returns true if chunk has chunkGroup reference and exists in chunkGroup
			*/
			isInGroup(chunkGroup) {
				return this._groups.has(chunkGroup);
			}

			/**
			* @returns {number} the amount of groups said chunk is in
			*/
			getNumberOfGroups() {
				return this._groups.size;
			}

			/**
			* @returns {SortableSet<ChunkGroup>} the chunkGroups that said chunk is referenced in
			*/
			get groupsIterable() {
				return this._groups;
			}

			/**
			* @param {Chunk} otherChunk the chunk to compare itself with
			* @returns {-1|0|1} this is a comparitor function like sort and returns -1, 0, or 1 based on sort order
			*/
			compareTo(otherChunk) {
				if (this.name && !otherChunk.name) return -1;
				if (!this.name && otherChunk.name) return 1;
				if (this.name < otherChunk.name) return -1;
				if (this.name > otherChunk.name) return 1;
				if (this._modules.size > otherChunk._modules.size) return -1;
				if (this._modules.size < otherChunk._modules.size) return 1;
				this._modules.sort();
				otherChunk._modules.sort();
				const a = this._modules[Symbol.iterator]();
				const b = otherChunk._modules[Symbol.iterator]();
				// eslint-disable-next-line no-constant-condition
				while (true) {
					const aItem = a.next();
					if (aItem.done) return 0;
					const bItem = b.next();
					const aModuleIdentifier = aItem.value.identifier();
					const bModuleIdentifier = bItem.value.identifier();
					if (aModuleIdentifier < bModuleIdentifier) return -1;
					if (aModuleIdentifier > bModuleIdentifier) return 1;
				}
			}

			/**
			* @param {Module} module Module to check
			* @returns {boolean} returns true if module does exist in this chunk
			*/
			containsModule(module) {
				return this._modules.has(module);
			}

			/**
			* @returns {Module[]} an array of modules (do not modify)
			*/
			getModules() {
				return this._modules.getFromCache(getArray);
			}

			getModulesIdent() {
				return this._modules.getFromUnorderedCache(getModulesIdent);
			}

			/**
			* @param {string=} reason reason why chunk is removed
			* @returns {void}
			*/
			remove(reason) {
				// cleanup modules
				// Array.from is used here to create a clone, because removeChunk modifies this._modules
				for (const module of Array.from(this._modules)) {
					module.removeChunk(this);
				}
				for (const chunkGroup of this._groups) {
					chunkGroup.removeChunk(this);
				}
			}

			/**
			*
			* @param {Module} module module to move
			* @param {Chunk} otherChunk other chunk to move it to
			* @returns {void}
			*/
			moveModule(module, otherChunk) {
				GraphHelpers.disconnectChunkAndModule(this, module);
				GraphHelpers.connectChunkAndModule(otherChunk, module);
				module.rewriteChunkInReasons(this, [otherChunk]);
			}

			/**
			*
			* @param {Chunk} otherChunk the chunk to integrate with
			* @param {string} reason reason why the module is being integrated
			* @returns {boolean} returns true or false if integration succeeds or fails
			*/
			integrate(otherChunk, reason) {
				if (!this.canBeIntegrated(otherChunk)) {
					return false;
				}

				// Pick a new name for the integrated chunk
				if (this.name && otherChunk.name) {
					if (this.hasEntryModule() === otherChunk.hasEntryModule()) {
						// When both chunks have entry modules or none have one, use
						// shortest name
						if (this.name.length !== otherChunk.name.length) {
							this.name =
								this.name.length < otherChunk.name.length
									? this.name
									: otherChunk.name;
						} else {
							this.name = this.name < otherChunk.name ? this.name : otherChunk.name;
						}
					} else if (otherChunk.hasEntryModule()) {
						// Pick the name of the chunk with the entry module
						this.name = otherChunk.name;
					}
				} else if (otherChunk.name) {
					this.name = otherChunk.name;
				}

				// Array.from is used here to create a clone, because moveModule modifies otherChunk._modules
				for (const module of Array.from(otherChunk._modules)) {
					otherChunk.moveModule(module, this);
				}
				otherChunk._modules.clear();

				if (otherChunk.entryModule) {
					this.entryModule = otherChunk.entryModule;
				}

				for (const chunkGroup of otherChunk._groups) {
					chunkGroup.replaceChunk(otherChunk, this);
					this.addGroup(chunkGroup);
				}
				otherChunk._groups.clear();

				return true;
			}

			/**
			* @param {Chunk} newChunk the new chunk that will be split out of the current chunk
			* @returns {void}
			*/
			split(newChunk) {
				for (const chunkGroup of this._groups) {
					chunkGroup.insertChunk(newChunk, this);
					newChunk.addGroup(chunkGroup);
				}
			}

			isEmpty() {
				return this._modules.size === 0;
			}

			updateHash(hash) {
				hash.update(`${this.id} `);
				hash.update(this.ids ? this.ids.join(",") : "");
				hash.update(`${this.name || ""} `);
				for (const m of this._modules) {
					hash.update(m.hash);
				}
			}

			canBeIntegrated(otherChunk) {
				if (this.preventIntegration || otherChunk.preventIntegration) {
					return false;
				}

				/**
				* @param {Chunk} a chunk
				* @param {Chunk} b chunk
				* @returns {boolean} true, if a is always available when b is reached
				*/
				const isAvailable = (a, b) => {
					const queue = new Set(b.groupsIterable);
					for (const chunkGroup of queue) {
						if (a.isInGroup(chunkGroup)) continue;
						if (chunkGroup.isInitial()) return false;
						for (const parent of chunkGroup.parentsIterable) {
							queue.add(parent);
						}
					}
					return true;
				};

				const selfHasRuntime = this.hasRuntime();
				const otherChunkHasRuntime = otherChunk.hasRuntime();

				if (selfHasRuntime !== otherChunkHasRuntime) {
					if (selfHasRuntime) {
						return isAvailable(this, otherChunk);
					} else if (otherChunkHasRuntime) {
						return isAvailable(otherChunk, this);
					} else {
						return false;
					}
				}

				if (this.hasEntryModule() || otherChunk.hasEntryModule()) {
					return false;
				}

				return true;
			}

			/**
			*
			* @param {number} size the size
			* @param {Object} options the options passed in
			* @returns {number} the multiplier returned
			*/
			addMultiplierAndOverhead(size, options) {
				const overhead =
					typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
				const multiplicator = this.canBeInitial()
					? options.entryChunkMultiplicator || 10
					: 1;

				return size * multiplicator + overhead;
			}

			/**
			* @returns {number} the size of all modules
			*/
			modulesSize() {
				return this._modules.getFromUnorderedCache(getModulesSize);
			}

			/**
			* @param {Object} options the size display options
			* @returns {number} the chunk size
			*/
			size(options = {}) {
				return this.addMultiplierAndOverhead(this.modulesSize(), options);
			}

			/**
			* @param {Chunk} otherChunk the other chunk
			* @param {TODO} options the options for this function
			* @returns {number | false} the size, or false if it can't be integrated
			*/
			integratedSize(otherChunk, options) {
				// Chunk if it's possible to integrate this chunk
				if (!this.canBeIntegrated(otherChunk)) {
					return false;
				}

				let integratedModulesSize = this.modulesSize();
				// only count modules that do not exist in this chunk!
				for (const otherModule of otherChunk._modules) {
					if (!this._modules.has(otherModule)) {
						integratedModulesSize += otherModule.size();
					}
				}

				return this.addMultiplierAndOverhead(integratedModulesSize, options);
			}

			/**
			* @param {function(Module, Module): -1|0|1=} sortByFn a predicate function used to sort modules
			* @returns {void}
			*/
			sortModules(sortByFn) {
				this._modules.sortWith(sortByFn || sortModuleById);
			}

			sortItems() {
				this.sortModules();
			}

			/**
			* @returns {Set<Chunk>} a set of all the async chunks
			*/
			getAllAsyncChunks() {
				const queue = new Set();
				const chunks = new Set();

				const initialChunks = intersect(
					Array.from(this.groupsIterable, g => new Set(g.chunks))
				);

				for (const chunkGroup of this.groupsIterable) {
					for (const child of chunkGroup.childrenIterable) {
						queue.add(child);
					}
				}

				for (const chunkGroup of queue) {
					for (const chunk of chunkGroup.chunks) {
						if (!initialChunks.has(chunk)) {
							chunks.add(chunk);
						}
					}
					for (const child of chunkGroup.childrenIterable) {
						queue.add(child);
					}
				}

				return chunks;
			}

			/**
			* @typedef {Object} ChunkMaps
			* @property {Record<string|number, string>} hash
			* @property {Record<string|number, Record<string, string>>} contentHash
			* @property {Record<string|number, string>} name
			*/

			/**
			* @param {boolean} realHash should the full hash or the rendered hash be used
			* @returns {ChunkMaps} the chunk map information
			*/
			getChunkMaps(realHash) {
				/** @type {Record<string|number, string>} */
				const chunkHashMap = Object.create(null);
				/** @type {Record<string|number, Record<string, string>>} */
				const chunkContentHashMap = Object.create(null);
				/** @type {Record<string|number, string>} */
				const chunkNameMap = Object.create(null);

				for (const chunk of this.getAllAsyncChunks()) {
					chunkHashMap[chunk.id] = realHash ? chunk.hash : chunk.renderedHash;
					for (const key of Object.keys(chunk.contentHash)) {
						if (!chunkContentHashMap[key]) {
							chunkContentHashMap[key] = Object.create(null);
						}
						chunkContentHashMap[key][chunk.id] = chunk.contentHash[key];
					}
					if (chunk.name) {
						chunkNameMap[chunk.id] = chunk.name;
					}
				}

				return {
					hash: chunkHashMap,
					contentHash: chunkContentHashMap,
					name: chunkNameMap
				};
			}

			/**
			* @returns {Record<string, Set<TODO>[]>} a record object of names to lists of child ids(?)
			*/
			getChildIdsByOrders() {
				const lists = new Map();
				for (const group of this.groupsIterable) {
					if (group.chunks[group.chunks.length - 1] === this) {
						for (const childGroup of group.childrenIterable) {
							// TODO webpack 5 remove this check for options
							if (typeof childGroup.options === "object") {
								for (const key of Object.keys(childGroup.options)) {
									if (key.endsWith("Order")) {
										const name = key.substr(0, key.length - "Order".length);
										let list = lists.get(name);
										if (list === undefined) lists.set(name, (list = []));
										list.push({
											order: childGroup.options[key],
											group: childGroup
										});
									}
								}
							}
						}
					}
				}
				const result = Object.create(null);
				for (const [name, list] of lists) {
					list.sort((a, b) => {
						const cmp = b.order - a.order;
						if (cmp !== 0) return cmp;
						// TODO webpack 5 remove this check of compareTo
						if (a.group.compareTo) {
							return a.group.compareTo(b.group);
						}
						return 0;
					});
					result[name] = Array.from(
						list.reduce((set, item) => {
							for (const chunk of item.group.chunks) {
								set.add(chunk.id);
							}
							return set;
						}, new Set())
					);
				}
				return result;
			}

			getChildIdsByOrdersMap(includeDirectChildren) {
				const chunkMaps = Object.create(null);

				const addChildIdsByOrdersToMap = chunk => {
					const data = chunk.getChildIdsByOrders();
					for (const key of Object.keys(data)) {
						let chunkMap = chunkMaps[key];
						if (chunkMap === undefined) {
							chunkMaps[key] = chunkMap = Object.create(null);
						}
						chunkMap[chunk.id] = data[key];
					}
				};

				if (includeDirectChildren) {
					const chunks = new Set();
					for (const chunkGroup of this.groupsIterable) {
						for (const chunk of chunkGroup.chunks) {
							chunks.add(chunk);
						}
					}
					for (const chunk of chunks) {
						addChildIdsByOrdersToMap(chunk);
					}
				}

				for (const chunk of this.getAllAsyncChunks()) {
					addChildIdsByOrdersToMap(chunk);
				}

				return chunkMaps;
			}

			/**
			* @typedef {Object} ChunkModuleMaps
			* @property {Record<string|number, (string|number)[]>} id
			* @property {Record<string|number, string>} hash
			*/

			/**
			* @param {ModuleFilterPredicate} filterFn function used to filter modules
			* @returns {ChunkModuleMaps} module map information
			*/
			getChunkModuleMaps(filterFn) {
				/** @type {Record<string|number, (string|number)[]>} */
				const chunkModuleIdMap = Object.create(null);
				/** @type {Record<string|number, string>} */
				const chunkModuleHashMap = Object.create(null);

				for (const chunk of this.getAllAsyncChunks()) {
					/** @type {(string|number)[]} */
					let array;
					for (const module of chunk.modulesIterable) {
						if (filterFn(module)) {
							if (array === undefined) {
								array = [];
								chunkModuleIdMap[chunk.id] = array;
							}
							array.push(module.id);
							chunkModuleHashMap[module.id] = module.renderedHash;
						}
					}
					if (array !== undefined) {
						array.sort();
					}
				}

				return {
					id: chunkModuleIdMap,
					hash: chunkModuleHashMap
				};
			}

			/**
			*
			* @param {function(Module): boolean} filterFn predicate function used to filter modules
			* @param {function(Chunk): boolean} filterChunkFn predicate function used to filter chunks
			* @returns {boolean} return true if module exists in graph
			*/
			hasModuleInGraph(filterFn, filterChunkFn) {
				const queue = new Set(this.groupsIterable);
				const chunksProcessed = new Set();

				for (const chunkGroup of queue) {
					for (const chunk of chunkGroup.chunks) {
						if (!chunksProcessed.has(chunk)) {
							chunksProcessed.add(chunk);
							if (!filterChunkFn || filterChunkFn(chunk)) {
								for (const module of chunk.modulesIterable) {
									if (filterFn(module)) {
										return true;
									}
								}
							}
						}
					}
					for (const child of chunkGroup.childrenIterable) {
						queue.add(child);
					}
				}
				return false;
			}

			toString() {
				return `Chunk[${Array.from(this._modules).join()}]`;
			}
		}
    ```
    :::