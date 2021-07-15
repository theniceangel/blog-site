# runtimeChunk

## 背景

webpack 的 entry 可以是一个对象，代表了多入口的意思，打出来的每个 bundle 都会含有一份 runtime code，有些不明所以的同学会好奇，什么是 runtime code，下面的这段函数就是 runtime bootstrap code。

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

从上面代码的执行逻辑来看，如果每一份 entry 都含有 runtime code 的话，相当于每个 entry 有自己对应的 installedModules，这个变量是放置在立即执行函数里面，隔离了其他作用域，但是如果同一个 page 要引入多份的 entry bundle，完全可以将这份 runtime 给抽离出来，形成一个 runtime chunk，其他所有的 entry bundle 剔除 runtime code，降级为一个 normal chunk，normal chunk 会通过 webpack.webpackJsonp 来注入进 runtime chunk 的启动逻辑。为什么可以这么做呢？其实对于 webpack 的一次 compile，只要保持 module 的独立性以及唯一性，无论存在多少份 entry 入口，他们之间都不会相互影响。具体的例子后面再解释，先直入源码。

## 源码

### 默认配置项

runtimeChunk 的默认配置项如下：

```js
module.exports = {
  //...
  optimization: {
    runtimeChunk: false // 代表未开启 runtimeChunk 插件
  }
};
```

默认情况下是不开启该插件，这样的话有多个 entry 入口，就会有多份 runtime code。如果自己想要控制 runtimeChunk 的生成，可以进行以下几种配置。

```js
// "single" 相当于
module.exports = {
  //...
  optimization: {
    runtimeChunk: {
      name: "runtime"
    };
  }
};

// true 或者 "multiple"
module.exports = {
  //...
  optimization: {
    runtimeChunk: {
      name: entrypoint => `runtime~${entrypoint.name}`
    };
  }
};

// 用户传入符合格式的对象
module.exports = {
  //...
  optimization: {
    runtimeChunk: {
      name: '自定义的名字' | () => '自定义的名称' // 自定义的字符串 或者返回名称的函数
    }
  }
};
```

配置为 `true` 或者 `'multiple'` 只是会把多份 entry 的 runtime chunk 给抽离出来，形成多份 runtime chunk，并没有做到**复用**，所以多入口一般可以配置为 `'single'` 来减少体积，不过这些体积造成的影响非常微末，不值一谈。

### 一. 初始化

```js
constructor(options) {
  this.options = Object.assign(
    {
      name: entrypoint => `runtime~${entrypoint.name}`
    },
    options
  );
}
```

提供默认的配置，相当于 runtimeChunk 配置为 `true | 'multiple'`。

### 二. 钩子

```js
compiler.hooks.thisCompilation.tap("RuntimeChunkPlugin", compilation => {
  compilation.hooks.optimizeChunksAdvanced.tap("RuntimeChunkPlugin", () => {
    // ... handle
  });
});
```

插件利用的是 thisCompilation hook，并且得到 compilation 钩入 optimizeChunksAdvanced hook，第一个钩子是 compiler 上的，第二个是 compilation 上的，在 watch 模式下，compilation 往往有多个实例，代表着文件的修改触发了多次构建，而实际上 compiler 上有 thisCompilation hook，也有一个叫 compilation hook，他们有什么区别呢？其实只有在 compiler 衍生出 childCompiler 的时候，会产生影响。

```js
class Compiler {
  createChildCompiler(
		compilation,
		compilerName,
		compilerIndex,
		outputOptions,
		plugins
	) {
		const childCompiler = new Compiler(this.context);
		if (Array.isArray(plugins)) {
			for (const plugin of plugins) {
				plugin.apply(childCompiler);
			}
    }
    // 将父 compiler 所有白名单 hooks 的 taps 拷贝到 childCompiler 上去
		for (const name in this.hooks) {
			if (
				![
					"make",
					"compile",
					"emit",
					"afterEmit",
					"invalid",
					"done",
					"thisCompilation"
				].includes(name)
			) {
				if (childCompiler.hooks[name]) {
					childCompiler.hooks[name].taps = this.hooks[name].taps.slice();
				}
			}
		}
		// ...
	}
}
```

createChildCompiler 是 compiler 提供的一个方法来创建新构建流程，在官方的 [mini-css-extract-plugin](https://github.com/webpack-contrib/mini-css-extract-plugin/blob/master/src/loader.js) loader 部分使用了。而刚好 `thisCompilation` 是被排除在外的，换句话来说，parent compiler 的 thisCompilation hook 的回调是不会复制到 child compiler 上去的。

真正触发插件核心逻辑的时机，是调用 compilation.hooks.optimizeChunksAdvanced.call 的时候，这个时机是在 seal 阶段，并且是在 [splitChunks](./splitChunks.md) 之后，这个时候所有的 chunks 已经 ready 了。

### 核心逻辑

```js
// 遍历所有入口的 chunksGroup，entryPoint 是一种特殊的 chunksGroup，因为它含有 runtimeChunk
for (const entrypoint of compilation.entrypoints.values()) {
  // 获取 runtimeChunk，也就是由 entryModule 解析所有 moudle 组成的 chunk
  // 这个 chunk 就是我们常说的打包出来的 bundle
  const chunk = entrypoint.getRuntimeChunk();

  // 得到 runtimeChunk 的名称
  let name = this.options.name;
  if (typeof name === "function") {
    name = name(entrypoint);
  }
  if (
    chunk.getNumberOfModules() > 0 ||
    !chunk.preventIntegration ||
    chunk.name !== name
  ) {
    // 步骤一
    const newChunk = compilation.addChunk(name);
    newChunk.preventIntegration = true;

    // 步骤二
    entrypoint.unshiftChunk(newChunk);
    newChunk.addGroup(entrypoint);
    entrypoint.setRuntimeChunk(newChunk);
  }
}
```

前面很好理解，最后一步是生成 runtimeChunk，主要分为两步：

*第一步：如果已有可复用的 runtime chunk，就直接用，否则重新生成一个 chunk*

```js
const newChunk = compilation.addChunk(name);
newChunk.preventIntegration = true;


class Compilation {
  addChunk(name) {
    // 如果存在，直接用现有的
		if (name) {
			const chunk = this.namedChunks.get(name);
			if (chunk !== undefined) {
				return chunk;
			}
    }
    // 否则生成 newChunk
		const chunk = new Chunk(name);
		this.chunks.push(chunk);
		if (name) {
			this.namedChunks.set(name, chunk);
		}
		return chunk;
	}
}
```

有了这个逻辑，就能保证你多入口的情况下配置为 `'single'` 能共用同一份 runtime chunk。

标记这个 runtime chunk 不能和其他的 chunk 整合在一起。

*第二步：连接 runtime chunk 与 entrypoint*

```js
entrypoint.unshiftChunk(newChunk);
newChunk.addGroup(entrypoint);
entrypoint.setRuntimeChunk(newChunk);
```

在调用 setRuntimeChunk 方法之后，newChunk 就被升级为 runtime Chunk 了，它是一个 empty chunk，仅仅包含 webpack bootstrap code，同时最开始的 entryChunk 就被降级成普通的 chunk 了，不再含有 webpack bootstrap code，下面举个例子来前后对比下这个配置到底有什么作用。

我准备了一个 entry.js，它作为 webpack 的入口，并且不开启 runtimeChunk 插件

```js
// entry.js
import './moduleA.js'

// moduleA.js
export const a = '1'

// webpack.config.js
module.exports = {
	context: __dirname,
	entry: './entry.js',
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	},
	optimization: {
		minimize: false // 不压缩混淆代码
	}
};
```

打包出来的只有 **main.js** 这个 bundle，代码如下

::: details 点击展开（未开启 runtimeChunk 插件）
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
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// CONCATENATED MODULE: ./moduleA.js
const a = '1'
// CONCATENATED MODULE: ./entry.js


/***/ })
/******/ ]);
```
:::

接着，我们添加 runtimeChunk 的配置。

```js{11}
// webpack.config.js
module.exports = {
	context: __dirname,
	entry: './entry.js',
	output: {
      path: path.join(__dirname, "dist"),
      filename: "[name].js"
	},
	optimization: {
      minimize: false // 不压缩混淆代码
      runtimeChunk: 'single'
	}
}
```

再次执行打包，这个时候会打出来 `main.js` 和 `runtime.js` 两个 bundle，其中 `runtime.js` 是由 runtime chunk 生成的，他是一个 empty chunk，虽然包含 webpack runtime 启动代码，但是必须依赖 `main.js` 加载完成。先来看下 runtime.js 的内容。

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

可以看到这个立即执行函数的参数为空，因为它的 modules 都被剥离进 main.js 了。

因为 main.js 身份降级了，所以不再包含 webpack bootstrap code，只能通过 runtime.js 预留好的函数“集成”进去，main.js 的代码如下：

```js
// main.js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// CONCATENATED MODULE: ./moduleA.js
const a = '1'
// CONCATENATED MODULE: ./entry.js


/***/ })
],[[0,1]]]);
```

### 运行时代码是如何执行的

首先 webpack 只负责打包除了两个 bundle，用户在嵌入到 html 的 script 时候，对于 bundle 的加载顺序是一无所知的～

但是 webpack 强大的地方在于，它的运行时有如下这么一段代码，确保无论 main.js 和 runtime.js 加载顺序是怎样，都能够正常执行。


```js
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
```

1. **先引入 main.js 再引入 runtime.js**

  由于 main.js 先加载，所以 `window["webpackJsonp"]` 存放了所有的 modules，接着加载 runtime.js，会拿到这些 modules，并且执行 webpackJsonpCallback，这个函数内部会调用 checkDeferredModules 进而执行 webpack 的启动代码，启动代码如下：

  ```js
  __webpack_require__(__webpack_require__.s = deferredModule[0])
  ```

2. **先引入 runtime.js 再引入 main.js**

  先改写 `window["webpackJsonp"]` 的 push，变成自己作用域下面的 webpackJsonpCallback，当 main.js 加载完成之后，就会执行 webpackJsonpCallback，后续的逻辑就跟上面一样，走到 webpack 的启动代码。

以上的案例只是一个很普通的场景，实际上当有多个入口 entry 的时候，并且依赖各自的其他 chunk 时候，而且 chunk 的加载顺序很随意的话，执行过程会更加的复杂。