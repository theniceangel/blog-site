# module

webpack 内部万物皆是 module，只不过有多种类型的 module。

[[toc]]

## normalModule

```js
// index.js
import './a.js'

// a.js
export default 'a'
```

上面的例子 index.js 作为 webpack 的入口文件，其中 a.js 就是一个 normalModule。运行 webpack 打包之后编：

:::details webpack.config.js
```js
const path = require('path')
module.exports = {
  mode: "development",
	context: __dirname,
	entry: './index.js',
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	},
	optimization: {
		minimize: false
	}
};
```
:::

```js
/******/ (function(modules) { // webpackBootstrap
/******/ 	// ...... 省略其他代码
/******/ })
/************************************************************************/
/******/ ({ // a 模块就是一个 normalModel

/***/ "./a.js":
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ('a');\n\n//# sourceURL=webpack:///./a.js?");

/***/ }),

/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _a_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./a.js */ \"./a.js\");\n\n\n//# sourceURL=webpack:///./index.js?");

/***/ })

/******/ });
```

## entryModule

entryModule 比较特殊，它代表程序的启动点，

1. **字符串 entry 配置**

    对于 webpack 单入口的 entry 配置来说，entryModule 就是配置的文件模块，就拿上面的例子来说，`index.js` 就是一个 entryModule。

    :::details main.js
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
    /******/ 	return __webpack_require__(__webpack_require__.s = "./index.js");
    /******/ })
    /************************************************************************/
    /******/ ({

    /***/ "./a.js":
    /*!**************!*\
      !*** ./a.js ***!
      \**************/
    /*! exports provided: default */
    /***/ (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ('a');\n\n//# sourceURL=webpack:///./a.js?");

    /***/ }),

    /***/ "./index.js":
    /*!******************!*\
      !*** ./index.js ***!
      \******************/
    /*! no exports provided */
    /***/ (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _a_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./a.js */ \"./a.js\");\n\n\n//# sourceURL=webpack:///./index.js?");

    /***/ })

    /******/ });
    ```
    :::

    `index.js` 就是 entryModule，程序启动的入口，就是下面这段代码

    ```js
    return __webpack_require__(__webpack_require__.s = "./index.js");
    ```

2. **对象 entry 配置**

    对象配置的 entry，代表存在多个 entryModule，因为会有多份 js 文件被打包出来，每一个 js 文件都是程序的入口。

    :::details webpack.config.js
    ```js
    const path = require('path')

    module.exports = {
      mode: "development",
      context: __dirname,
      entry: {
        entry1: './entry1.js',
        entry2: './entry2.js'
      },
      output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].js"
      },
      optimization: {
        minimize: false
      }
    };
    ```
    :::

    :::details entry1.js
    ```js
    export default 'entry1'
    ```
    :::

    :::details entry2.js
    ```js
    export default 'entry2'
    ```
    :::

    运行 webpack 打包命令之后，会在 dist 目录下面打出 `entry1.js` 和 `entry2.js`

    :::details dist/entry1.js
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
    /******/ 	return __webpack_require__(__webpack_require__.s = "./entry1.js");
    /******/ })
    /************************************************************************/
    /******/ ({

    /***/ "./entry1.js":
    /*!*******************!*\
      !*** ./entry1.js ***!
      \*******************/
    /*! exports provided: default */
    /***/ (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ('entry1');\n\n//# sourceURL=webpack:///./entry1.js?");

    /***/ })

    /******/ });
    ```
    :::

    可以看到 entry1.js 的程序入口就是 `entry1` module，它就是 entryModule。

    :::details dist/entry2.js
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
    /******/ 	return __webpack_require__(__webpack_require__.s = "./entry2.js");
    /******/ })
    /************************************************************************/
    /******/ ({

    /***/ "./entry2.js":
    /*!*******************!*\
      !*** ./entry2.js ***!
      \*******************/
    /*! exports provided: default */
    /***/ (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    eval("__webpack_require__.r(__webpack_exports__);\n/* harmony default export */ __webpack_exports__[\"default\"] = ('entry2');\n\n//# sourceURL=webpack:///./entry2.js?");

    /***/ })

    /******/ });
    ```
    :::

    同理，entry2 也是 entryModule。

3. **数组 entry 配置**

    数组配置的 entry 会很特殊，不再是你明面上配置的那些模块了，那到底是什么呢？举个例子：

    :::details webpack.config.js
    ```js
    const path = require('path')

    module.exports = {
      mode: "development",
      context: __dirname,
      devtool: false,
      entry: ['./a.js', './b.js'],
      output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].js"
      },
      optimization: {
        minimize: false
      }
    };
    ```
    :::

    :::details a.js
    ```js
    export default 'a'
    ```
    :::

    :::details b.js
    ```js
    export default 'b'
    ```
    :::

    运行 webpack 打包命令之后，会在 dist 目录下面打出 `main.js`。

    :::details dist/main.js
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
    /******/ ({

    /***/ "./a.js":
    /*!**************!*\
      !*** ./a.js ***!
      \**************/
    /*! exports provided: default */
    /***/ (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */ __webpack_exports__["default"] = ('a');

    /***/ }),

    /***/ "./b.js":
    /*!**************!*\
      !*** ./b.js ***!
      \**************/
    /*! exports provided: default */
    /***/ (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    __webpack_require__.r(__webpack_exports__);
    /* harmony default export */ __webpack_exports__["default"] = ('b');

    /***/ }),

    /***/ 0:
    /*!***************************!*\
      !*** multi ./a.js ./b.js ***!
      \***************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    __webpack_require__(/*! ./a.js */"./a.js");
    module.exports = __webpack_require__(/*! ./b.js */"./b.js");


    /***/ })

    /******/ });
    ```
    :::

    从打包的代码来看，entryModule 是一个叫 `multi ./a.js ./b.js` 的模块，它是由 webpack 内部的 MultiModule 创建而来，聚合了 a 和 b 模块。相当于声明了一种特殊的 entry，也就是 entry 数组最后一个模块会被暴露出去，类似于：

    ```js
    // multi ./a.js ./b.js
    import './a.js'
    export * from './b.js'
    ```

4. **Dynamic entry 配置**

  动态 entry 的场景是为了获取配置的函数的返回值，来决定 entryModule，配置可以是如下的方式：

  ```js
  // 返回字符串
  module.exports = {
    //...
    entry: () => './demo'
  };

  // 返回包含数组的 promise
  module.exports = {
    //...
    entry: () => new Promise((resolve) => resolve(['./demo', './demo2']))
  };
  ```

  所以 entryModule 与前面数组、对象、字符串的情况一模一样。


## 关于 module 的类

1. **DependenciesBlock**
    
    :::details DependenciesBlock.js
    ```js
    class DependenciesBlock {
      constructor() {
        /** @type {Dependency[]} */
        this.dependencies = [];
        /** @type {AsyncDependenciesBlock[]} */
        this.blocks = [];
        /** @type {DependenciesBlockVariable[]} */
        this.variables = [];
      }

      /**
       * Adds a DependencyBlock to DependencyBlock relationship.
      * This is used for when a Module has a AsyncDependencyBlock tie (for code-splitting)
      *
      * @param {AsyncDependenciesBlock} block block being added
      * @returns {void}
      */
      addBlock(block) {
        this.blocks.push(block);
        block.parent = this;
      }

      /**
       * @param {string} name name of dependency
      * @param {string} expression expression string for variable
      * @param {Dependency[]} dependencies dependency instances tied to variable
      * @returns {void}
      */
      addVariable(name, expression, dependencies) {
        for (let v of this.variables) {
          if (v.name === name && v.expression === expression) {
            return;
          }
        }
        this.variables.push(
          new DependenciesBlockVariable(name, expression, dependencies)
        );
      }

      /**
       * @param {Dependency} dependency dependency being tied to block.
      * This is an "edge" pointing to another "node" on module graph.
      * @returns {void}
      */
      addDependency(dependency) {
        this.dependencies.push(dependency);
      }

      /**
       * @param {Dependency} dependency dependency being removed
      * @returns {void}
      */
      removeDependency(dependency) {
        const idx = this.dependencies.indexOf(dependency);
        if (idx >= 0) {
          this.dependencies.splice(idx, 1);
        }
      }

      /**
       * @param {Hash} hash the hash used to track dependencies
      * @returns {void}
      */
      updateHash(hash) {
        for (const dep of this.dependencies) dep.updateHash(hash);
        for (const block of this.blocks) block.updateHash(hash);
        for (const variable of this.variables) variable.updateHash(hash);
      }

      disconnect() {
        for (const dep of this.dependencies) dep.disconnect();
        for (const block of this.blocks) block.disconnect();
        for (const variable of this.variables) variable.disconnect();
      }

      unseal() {
        for (const block of this.blocks) block.unseal();
      }

      /**
       * @param {DependencyFilterFunction} filter filter function for dependencies, gets passed all dependency ties from current instance
      * @returns {boolean} returns boolean for filter
      */
      hasDependencies(filter) {
        if (filter) {
          for (const dep of this.dependencies) {
            if (filter(dep)) return true;
          }
        } else {
          if (this.dependencies.length > 0) {
            return true;
          }
        }

        for (const block of this.blocks) {
          if (block.hasDependencies(filter)) return true;
        }
        for (const variable of this.variables) {
          if (variable.hasDependencies(filter)) return true;
        }
        return false;
      }

      sortItems() {
        for (const block of this.blocks) block.sortItems();
      }
    }
    ```
    :::

    如果某个模块作为 code splitting 的分割点，那么它就会带有 DependenciesBlock 信息，比如下面的 a 模块会含有 DependenciesBlock 信息。

    ```js
    import('./a.js')
    ```
    

2. **Module**

    :::details Module.js
    ```js
    class Module extends DependenciesBlock {
      constructor(type, context = null) {
        super();
        /** @type {string} */
        this.type = type;
        /** @type {string} */
        this.context = context;

        // Unique Id
        /** @type {number} */
        this.debugId = debugId++;

        // Hash
        /** @type {string} */
        this.hash = undefined;
        /** @type {string} */
        this.renderedHash = undefined;

        // Info from Factory
        /** @type {TODO} */
        this.resolveOptions = EMPTY_RESOLVE_OPTIONS;
        /** @type {object} */
        this.factoryMeta = {};

        // Info from Build
        /** @type {WebpackError[]} */
        this.warnings = [];
        /** @type {WebpackError[]} */
        this.errors = [];
        /** @type {object} */
        this.buildMeta = undefined;
        /** @type {object} */
        this.buildInfo = undefined;

        // Graph (per Compilation)
        /** @type {ModuleReason[]} */
        this.reasons = [];
        /** @type {SortableSet<Chunk>} */
        this._chunks = new SortableSet(undefined, sortById);

        // Info from Compilation (per Compilation)
        /** @type {number|string} */
        this.id = null;
        /** @type {number} */
        this.index = null;
        /** @type {number} */
        this.index2 = null;
        /** @type {number} */
        this.depth = null;
        /** @type {Module} */
        this.issuer = null;
        /** @type {undefined | object} */
        this.profile = undefined;
        /** @type {boolean} */
        this.prefetched = false;
        /** @type {boolean} */
        this.built = false;

        // Info from Optimization (per Compilation)
        /** @type {null | boolean} */
        this.used = null;
        /** @type {false | true | string[]} */
        this.usedExports = null;
        /** @type {(string | OptimizationBailoutFunction)[]} */
        this.optimizationBailout = [];

        // delayed operations
        /** @type {undefined | {oldChunk: Chunk, newChunks: Chunk[]}[] } */
        this._rewriteChunkInReasons = undefined;

        /** @type {boolean} */
        this.useSourceMap = false;

        // info from build
        this._source = null;
      }

      get exportsArgument() {
        return (this.buildInfo && this.buildInfo.exportsArgument) || "exports";
      }

      get moduleArgument() {
        return (this.buildInfo && this.buildInfo.moduleArgument) || "module";
      }

      disconnect() {
        this.hash = undefined;
        this.renderedHash = undefined;

        this.reasons.length = 0;
        this._rewriteChunkInReasons = undefined;
        this._chunks.clear();

        this.id = null;
        this.index = null;
        this.index2 = null;
        this.depth = null;
        this.issuer = null;
        this.profile = undefined;
        this.prefetched = false;
        this.built = false;

        this.used = null;
        this.usedExports = null;
        this.optimizationBailout.length = 0;
        super.disconnect();
      }

      unseal() {
        this.id = null;
        this.index = null;
        this.index2 = null;
        this.depth = null;
        this._chunks.clear();
        super.unseal();
      }

      setChunks(chunks) {
        this._chunks = new SortableSet(chunks, sortById);
      }

      addChunk(chunk) {
        if (this._chunks.has(chunk)) return false;
        this._chunks.add(chunk);
        return true;
      }

      removeChunk(chunk) {
        if (this._chunks.delete(chunk)) {
          chunk.removeModule(this);
          return true;
        }
        return false;
      }

      isInChunk(chunk) {
        return this._chunks.has(chunk);
      }

      isEntryModule() {
        for (const chunk of this._chunks) {
          if (chunk.entryModule === this) return true;
        }
        return false;
      }

      get optional() {
        return (
          this.reasons.length > 0 &&
          this.reasons.every(r => r.dependency && r.dependency.optional)
        );
      }

      /**
       * @returns {Chunk[]} all chunks which contain the module
      */
      getChunks() {
        return Array.from(this._chunks);
      }

      getNumberOfChunks() {
        return this._chunks.size;
      }

      get chunksIterable() {
        return this._chunks;
      }

      hasEqualsChunks(otherModule) {
        if (this._chunks.size !== otherModule._chunks.size) return false;
        this._chunks.sortWith(sortByDebugId);
        otherModule._chunks.sortWith(sortByDebugId);
        const a = this._chunks[Symbol.iterator]();
        const b = otherModule._chunks[Symbol.iterator]();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const aItem = a.next();
          const bItem = b.next();
          if (aItem.done) return true;
          if (aItem.value !== bItem.value) return false;
        }
      }

      addReason(module, dependency, explanation) {
        this.reasons.push(new ModuleReason(module, dependency, explanation));
      }

      removeReason(module, dependency) {
        for (let i = 0; i < this.reasons.length; i++) {
          let r = this.reasons[i];
          if (r.module === module && r.dependency === dependency) {
            this.reasons.splice(i, 1);
            return true;
          }
        }
        return false;
      }

      hasReasonForChunk(chunk) {
        if (this._rewriteChunkInReasons) {
          for (const operation of this._rewriteChunkInReasons) {
            this._doRewriteChunkInReasons(operation.oldChunk, operation.newChunks);
          }
          this._rewriteChunkInReasons = undefined;
        }
        for (let i = 0; i < this.reasons.length; i++) {
          if (this.reasons[i].hasChunk(chunk)) return true;
        }
        return false;
      }

      hasReasons() {
        return this.reasons.length > 0;
      }

      rewriteChunkInReasons(oldChunk, newChunks) {
        // This is expensive. Delay operation until we really need the data
        if (this._rewriteChunkInReasons === undefined) {
          this._rewriteChunkInReasons = [];
        }
        this._rewriteChunkInReasons.push({
          oldChunk,
          newChunks
        });
      }

      _doRewriteChunkInReasons(oldChunk, newChunks) {
        for (let i = 0; i < this.reasons.length; i++) {
          this.reasons[i].rewriteChunks(oldChunk, newChunks);
        }
      }

      /**
       * @param {string=} exportName the name of the export
      * @returns {boolean|string} false if the export isn't used, true if no exportName is provided and the module is used, or the name to access it if the export is used
      */
      isUsed(exportName) {
        if (!exportName) return this.used !== false;
        if (this.used === null || this.usedExports === null) return exportName;
        if (!this.used) return false;
        if (!this.usedExports) return false;
        if (this.usedExports === true) return exportName;
        let idx = this.usedExports.indexOf(exportName);
        if (idx < 0) return false;

        // Mangle export name if possible
        if (this.isProvided(exportName)) {
          if (this.buildMeta.exportsType === "namespace") {
            return Template.numberToIdentifer(idx);
          }
          if (
            this.buildMeta.exportsType === "named" &&
            !this.usedExports.includes("default")
          ) {
            return Template.numberToIdentifer(idx);
          }
        }
        return exportName;
      }

      isProvided(exportName) {
        if (!Array.isArray(this.buildMeta.providedExports)) return null;
        return this.buildMeta.providedExports.includes(exportName);
      }

      toString() {
        return `Module[${this.id || this.debugId}]`;
      }

      needRebuild(fileTimestamps, contextTimestamps) {
        return true;
      }

      /**
       * @param {Hash} hash the hash used to track dependencies
      * @returns {void}
      */
      updateHash(hash) {
        hash.update(`${this.id}`);
        hash.update(JSON.stringify(this.usedExports));
        super.updateHash(hash);
      }

      sortItems(sortChunks) {
        super.sortItems();
        if (sortChunks) this._chunks.sort();
        this.reasons.sort((a, b) => {
          if (a.module === b.module) return 0;
          if (!a.module) return -1;
          if (!b.module) return 1;
          return sortById(a.module, b.module);
        });
        if (Array.isArray(this.usedExports)) {
          this.usedExports.sort();
        }
      }

      unbuild() {
        this.dependencies.length = 0;
        this.blocks.length = 0;
        this.variables.length = 0;
        this.buildMeta = undefined;
        this.buildInfo = undefined;
        this.disconnect();
      }

      get arguments() {
        throw new Error("Module.arguments was removed, there is no replacement.");
      }

      set arguments(value) {
        throw new Error("Module.arguments was removed, there is no replacement.");
      }
    }

    // TODO remove in webpack 5
    Object.defineProperty(Module.prototype, "forEachChunk", {
      configurable: false,
      value: util.deprecate(
        /**
        * @deprecated
        * @param {function(any, any, Set<any>): void} fn callback function
        * @returns {void}
        * @this {Module}
        */
        function(fn) {
          this._chunks.forEach(fn);
        },
        "Module.forEachChunk: Use for(const chunk of module.chunksIterable) instead"
      )
    });

    // TODO remove in webpack 5
    Object.defineProperty(Module.prototype, "mapChunks", {
      configurable: false,
      value: util.deprecate(
        /**
        * @deprecated
        * @param {function(any, any): void} fn Mapper function
        * @returns {Array<TODO>} Array of chunks mapped
        * @this {Module}
        */
        function(fn) {
          return Array.from(this._chunks, fn);
        },
        "Module.mapChunks: Use Array.from(module.chunksIterable, fn) instead"
      )
    });

    // TODO remove in webpack 5
    Object.defineProperty(Module.prototype, "entry", {
      configurable: false,
      get() {
        throw new Error("Module.entry was removed. Use Chunk.entryModule");
      },
      set() {
        throw new Error("Module.entry was removed. Use Chunk.entryModule");
      }
    });

    // TODO remove in webpack 5
    Object.defineProperty(Module.prototype, "meta", {
      configurable: false,
      get: util.deprecate(
        /**
        * @deprecated
        * @returns {void}
        * @this {Module}
        */
        function() {
          return this.buildMeta;
        },
        "Module.meta was renamed to Module.buildMeta"
      ),
      set: util.deprecate(
        /**
        * @deprecated
        * @param {TODO} value Value
        * @returns {void}
        * @this {Module}
        */
        function(value) {
          this.buildMeta = value;
        },
        "Module.meta was renamed to Module.buildMeta"
      )
    });

    /** @type {function(): string} */
    Module.prototype.identifier = null;

    /** @type {function(RequestShortener): string} */
    Module.prototype.readableIdentifier = null;

    Module.prototype.build = null;
    Module.prototype.source = null;
    Module.prototype.size = null;
    Module.prototype.nameForCondition = null;
    /** @type {null | function(Chunk): boolean} */
    Module.prototype.chunkCondition = null;
    Module.prototype.updateCacheModule = null;
    ```
    :::

    基类。

3. **NormalModule**

    :::details NormalModule.js
    ```js
    class NormalModule extends Module {
      constructor({
        type,
        request,
        userRequest,
        rawRequest,
        loaders,
        resource,
        matchResource,
        parser,
        generator,
        resolveOptions
      }) {
        super(type, getContext(resource));

        // Info from Factory
        this.request = request;
        this.userRequest = userRequest;
        this.rawRequest = rawRequest;
        this.binary = type.startsWith("webassembly");
        this.parser = parser;
        this.generator = generator;
        this.resource = resource;
        this.matchResource = matchResource;
        this.loaders = loaders;
        if (resolveOptions !== undefined) this.resolveOptions = resolveOptions;

        // Info from Build
        this.error = null;
        this._source = null;
        this._sourceSize = null;
        this._buildHash = "";
        this.buildTimestamp = undefined;
        /** @private @type {Map<string, CachedSourceEntry>} */
        this._cachedSources = new Map();

        // Options for the NormalModule set by plugins
        // TODO refactor this -> options object filled from Factory
        this.useSourceMap = false;
        this.lineToLine = false;

        // Cache
        this._lastSuccessfulBuildMeta = {};
      }

      identifier() {
        return this.request;
      }

      readableIdentifier(requestShortener) {
        return requestShortener.shorten(this.userRequest);
      }

      libIdent(options) {
        return contextify(options.context, this.userRequest);
      }

      nameForCondition() {
        const resource = this.matchResource || this.resource;
        const idx = resource.indexOf("?");
        if (idx >= 0) return resource.substr(0, idx);
        return resource;
      }

      updateCacheModule(module) {
        this.type = module.type;
        this.request = module.request;
        this.userRequest = module.userRequest;
        this.rawRequest = module.rawRequest;
        this.parser = module.parser;
        this.generator = module.generator;
        this.resource = module.resource;
        this.matchResource = module.matchResource;
        this.loaders = module.loaders;
        this.resolveOptions = module.resolveOptions;
      }

      createSourceForAsset(name, content, sourceMap) {
        if (!sourceMap) {
          return new RawSource(content);
        }

        if (typeof sourceMap === "string") {
          return new OriginalSource(content, sourceMap);
        }

        return new SourceMapSource(content, name, sourceMap);
      }

      createLoaderContext(resolver, options, compilation, fs) {
        const requestShortener = compilation.runtimeTemplate.requestShortener;
        const getCurrentLoaderName = () => {
          const currentLoader = this.getCurrentLoader(loaderContext);
          if (!currentLoader) return "(not in loader scope)";
          return requestShortener.shorten(currentLoader.loader);
        };
        const loaderContext = {
          version: 2,
          emitWarning: warning => {
            if (!(warning instanceof Error)) {
              warning = new NonErrorEmittedError(warning);
            }
            this.warnings.push(
              new ModuleWarning(this, warning, {
                from: getCurrentLoaderName()
              })
            );
          },
          emitError: error => {
            if (!(error instanceof Error)) {
              error = new NonErrorEmittedError(error);
            }
            this.errors.push(
              new ModuleError(this, error, {
                from: getCurrentLoaderName()
              })
            );
          },
          getLogger: name => {
            const currentLoader = this.getCurrentLoader(loaderContext);
            return compilation.getLogger(() =>
              [currentLoader && currentLoader.loader, name, this.identifier()]
                .filter(Boolean)
                .join("|")
            );
          },
          // TODO remove in webpack 5
          exec: (code, filename) => {
            // @ts-ignore Argument of type 'this' is not assignable to parameter of type 'Module'.
            const module = new NativeModule(filename, this);
            // @ts-ignore _nodeModulePaths is deprecated and undocumented Node.js API
            module.paths = NativeModule._nodeModulePaths(this.context);
            module.filename = filename;
            module._compile(code, filename);
            return module.exports;
          },
          resolve(context, request, callback) {
            resolver.resolve({}, context, request, {}, callback);
          },
          getResolve(options) {
            const child = options ? resolver.withOptions(options) : resolver;
            return (context, request, callback) => {
              if (callback) {
                child.resolve({}, context, request, {}, callback);
              } else {
                return new Promise((resolve, reject) => {
                  child.resolve({}, context, request, {}, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                  });
                });
              }
            };
          },
          emitFile: (name, content, sourceMap, assetInfo) => {
            if (!this.buildInfo.assets) {
              this.buildInfo.assets = Object.create(null);
              this.buildInfo.assetsInfo = new Map();
            }
            this.buildInfo.assets[name] = this.createSourceForAsset(
              name,
              content,
              sourceMap
            );
            this.buildInfo.assetsInfo.set(name, assetInfo);
          },
          rootContext: options.context,
          webpack: true,
          sourceMap: !!this.useSourceMap,
          mode: options.mode || "production",
          _module: this,
          _compilation: compilation,
          _compiler: compilation.compiler,
          fs: fs
        };

        compilation.hooks.normalModuleLoader.call(loaderContext, this);
        if (options.loader) {
          Object.assign(loaderContext, options.loader);
        }

        return loaderContext;
      }

      getCurrentLoader(loaderContext, index = loaderContext.loaderIndex) {
        if (
          this.loaders &&
          this.loaders.length &&
          index < this.loaders.length &&
          index >= 0 &&
          this.loaders[index]
        ) {
          return this.loaders[index];
        }
        return null;
      }

      createSource(source, resourceBuffer, sourceMap) {
        // if there is no identifier return raw source
        if (!this.identifier) {
          return new RawSource(source);
        }

        // from here on we assume we have an identifier
        const identifier = this.identifier();

        if (this.lineToLine && resourceBuffer) {
          return new LineToLineMappedSource(
            source,
            identifier,
            asString(resourceBuffer)
          );
        }

        if (this.useSourceMap && sourceMap) {
          return new SourceMapSource(source, identifier, sourceMap);
        }

        if (Buffer.isBuffer(source)) {
          // @ts-ignore
          // TODO We need to fix @types/webpack-sources to allow RawSource to take a Buffer | string
          return new RawSource(source);
        }

        return new OriginalSource(source, identifier);
      }

      doBuild(options, compilation, resolver, fs, callback) {
        const loaderContext = this.createLoaderContext(
          resolver,
          options,
          compilation,
          fs
        );

        runLoaders(
          {
            resource: this.resource,
            loaders: this.loaders,
            context: loaderContext,
            readResource: fs.readFile.bind(fs)
          },
          (err, result) => {
            if (result) {
              this.buildInfo.cacheable = result.cacheable;
              this.buildInfo.fileDependencies = new Set(result.fileDependencies);
              this.buildInfo.contextDependencies = new Set(
                result.contextDependencies
              );
            }

            if (err) {
              if (!(err instanceof Error)) {
                err = new NonErrorEmittedError(err);
              }
              const currentLoader = this.getCurrentLoader(loaderContext);
              const error = new ModuleBuildError(this, err, {
                from:
                  currentLoader &&
                  compilation.runtimeTemplate.requestShortener.shorten(
                    currentLoader.loader
                  )
              });
              return callback(error);
            }

            const resourceBuffer = result.resourceBuffer;
            const source = result.result[0];
            const sourceMap = result.result.length >= 1 ? result.result[1] : null;
            const extraInfo = result.result.length >= 2 ? result.result[2] : null;

            if (!Buffer.isBuffer(source) && typeof source !== "string") {
              const currentLoader = this.getCurrentLoader(loaderContext, 0);
              const err = new Error(
                `Final loader (${
                  currentLoader
                    ? compilation.runtimeTemplate.requestShortener.shorten(
                        currentLoader.loader
                      )
                    : "unknown"
                }) didn't return a Buffer or String`
              );
              const error = new ModuleBuildError(this, err);
              return callback(error);
            }

            this._source = this.createSource(
              this.binary ? asBuffer(source) : asString(source),
              resourceBuffer,
              sourceMap
            );
            this._sourceSize = null;
            this._ast =
              typeof extraInfo === "object" &&
              extraInfo !== null &&
              extraInfo.webpackAST !== undefined
                ? extraInfo.webpackAST
                : null;
            return callback();
          }
        );
      }

      markModuleAsErrored(error) {
        // Restore build meta from successful build to keep importing state
        this.buildMeta = Object.assign({}, this._lastSuccessfulBuildMeta);
        this.error = error;
        this.errors.push(this.error);
        this._source = new RawSource(
          "throw new Error(" + JSON.stringify(this.error.message) + ");"
        );
        this._sourceSize = null;
        this._ast = null;
      }

      applyNoParseRule(rule, content) {
        // must start with "rule" if rule is a string
        if (typeof rule === "string") {
          return content.indexOf(rule) === 0;
        }

        if (typeof rule === "function") {
          return rule(content);
        }
        // we assume rule is a regexp
        return rule.test(content);
      }

      // check if module should not be parsed
      // returns "true" if the module should !not! be parsed
      // returns "false" if the module !must! be parsed
      shouldPreventParsing(noParseRule, request) {
        // if no noParseRule exists, return false
        // the module !must! be parsed.
        if (!noParseRule) {
          return false;
        }

        // we only have one rule to check
        if (!Array.isArray(noParseRule)) {
          // returns "true" if the module is !not! to be parsed
          return this.applyNoParseRule(noParseRule, request);
        }

        for (let i = 0; i < noParseRule.length; i++) {
          const rule = noParseRule[i];
          // early exit on first truthy match
          // this module is !not! to be parsed
          if (this.applyNoParseRule(rule, request)) {
            return true;
          }
        }
        // no match found, so this module !should! be parsed
        return false;
      }

      _initBuildHash(compilation) {
        const hash = createHash(compilation.outputOptions.hashFunction);
        if (this._source) {
          hash.update("source");
          this._source.updateHash(hash);
        }
        hash.update("meta");
        hash.update(JSON.stringify(this.buildMeta));
        this._buildHash = /** @type {string} */ (hash.digest("hex"));
      }

      build(options, compilation, resolver, fs, callback) {
        this.buildTimestamp = Date.now();
        this.built = true;
        this._source = null;
        this._sourceSize = null;
        this._ast = null;
        this._buildHash = "";
        this.error = null;
        this.errors.length = 0;
        this.warnings.length = 0;
        this.buildMeta = {};
        this.buildInfo = {
          cacheable: false,
          fileDependencies: new Set(),
          contextDependencies: new Set(),
          assets: undefined,
          assetsInfo: undefined
        };

        return this.doBuild(options, compilation, resolver, fs, err => {
          this._cachedSources.clear();

          // if we have an error mark module as failed and exit
          if (err) {
            this.markModuleAsErrored(err);
            this._initBuildHash(compilation);
            return callback();
          }

          // check if this module should !not! be parsed.
          // if so, exit here;
          const noParseRule = options.module && options.module.noParse;
          if (this.shouldPreventParsing(noParseRule, this.request)) {
            this._initBuildHash(compilation);
            return callback();
          }

          const handleParseError = e => {
            const source = this._source.source();
            const loaders = this.loaders.map(item =>
              contextify(options.context, item.loader)
            );
            const error = new ModuleParseError(this, source, e, loaders);
            this.markModuleAsErrored(error);
            this._initBuildHash(compilation);
            return callback();
          };

          const handleParseResult = result => {
            this._lastSuccessfulBuildMeta = this.buildMeta;
            this._initBuildHash(compilation);
            return callback();
          };

          try {
            const result = this.parser.parse(
              this._ast || this._source.source(),
              {
                current: this,
                module: this,
                compilation: compilation,
                options: options
              },
              (err, result) => {
                if (err) {
                  handleParseError(err);
                } else {
                  handleParseResult(result);
                }
              }
            );
            if (result !== undefined) {
              // parse is sync
              handleParseResult(result);
            }
          } catch (e) {
            handleParseError(e);
          }
        });
      }

      getHashDigest(dependencyTemplates) {
        // TODO webpack 5 refactor
        let dtHash = dependencyTemplates.get("hash");
        return `${this.hash}-${dtHash}`;
      }

      source(dependencyTemplates, runtimeTemplate, type = "javascript") {
        const hashDigest = this.getHashDigest(dependencyTemplates);
        const cacheEntry = this._cachedSources.get(type);
        if (cacheEntry !== undefined && cacheEntry.hash === hashDigest) {
          // We can reuse the cached source
          return cacheEntry.source;
        }

        const source = this.generator.generate(
          this,
          dependencyTemplates,
          runtimeTemplate,
          type
        );

        const cachedSource = new CachedSource(source);
        this._cachedSources.set(type, {
          source: cachedSource,
          hash: hashDigest
        });
        return cachedSource;
      }

      originalSource() {
        return this._source;
      }

      needRebuild(fileTimestamps, contextTimestamps) {
        // always try to rebuild in case of an error
        if (this.error) return true;

        // always rebuild when module is not cacheable
        if (!this.buildInfo.cacheable) return true;

        // Check timestamps of all dependencies
        // Missing timestamp -> need rebuild
        // Timestamp bigger than buildTimestamp -> need rebuild
        for (const file of this.buildInfo.fileDependencies) {
          const timestamp = fileTimestamps.get(file);
          if (!timestamp) return true;
          if (timestamp >= this.buildTimestamp) return true;
        }
        for (const file of this.buildInfo.contextDependencies) {
          const timestamp = contextTimestamps.get(file);
          if (!timestamp) return true;
          if (timestamp >= this.buildTimestamp) return true;
        }
        // elsewise -> no rebuild needed
        return false;
      }

      size() {
        if (this._sourceSize === null) {
          this._sourceSize = this._source ? this._source.size() : -1;
        }
        return this._sourceSize;
      }

      /**
       * @param {Hash} hash the hash used to track dependencies
      * @returns {void}
      */
      updateHash(hash) {
        hash.update(this._buildHash);
        super.updateHash(hash);
      }
    }
    ```
    :::

    绝大部分的 Module 都属于 NormalModule。

4. **MultiModule**

    :::details MultiModule.js
    ```js
    class MultiModule extends Module {
      constructor(context, dependencies, name) {
        super("javascript/dynamic", context);

        // Info from Factory
        this.dependencies = dependencies;
        this.name = name;
        this._identifier = `multi ${this.dependencies
          .map(d => d.request)
          .join(" ")}`;
      }

      identifier() {
        return this._identifier;
      }

      readableIdentifier(requestShortener) {
        return `multi ${this.dependencies
          .map(d => requestShortener.shorten(d.request))
          .join(" ")}`;
      }

      build(options, compilation, resolver, fs, callback) {
        this.built = true;
        this.buildMeta = {};
        this.buildInfo = {};
        return callback();
      }

      needRebuild() {
        return false;
      }

      size() {
        return 16 + this.dependencies.length * 12;
      }

      /**
       * @param {Hash} hash the hash used to track dependencies
      * @returns {void}
      */
      updateHash(hash) {
        hash.update("multi module");
        hash.update(this.name || "");
        super.updateHash(hash);
      }

      source(dependencyTemplates, runtimeTemplate) {
        const str = [];
        let idx = 0;
        for (const dep of this.dependencies) {
          if (dep.module) {
            if (idx === this.dependencies.length - 1) {
              str.push("module.exports = ");
            }
            str.push("__webpack_require__(");
            if (runtimeTemplate.outputOptions.pathinfo) {
              str.push(Template.toComment(dep.request));
            }
            str.push(`${JSON.stringify(dep.module.id)}`);
            str.push(")");
          } else {
            const content = require("./dependencies/WebpackMissingModule").module(
              dep.request
            );
            str.push(content);
          }
          str.push(";\n");
          idx++;
        }
        return new RawSource(str.join(""));
      }
    }
    ```
    :::

    entry 配置为数组，会生成 MultiModule。

5. **DllModule**

    :::details DllModule.js
    ```js
    class DllModule extends Module {
      constructor(context, dependencies, name, type) {
        super("javascript/dynamic", context);

        // Info from Factory
        this.dependencies = dependencies;
        this.name = name;
        this.type = type;
      }

      identifier() {
        return `dll ${this.name}`;
      }

      readableIdentifier() {
        return `dll ${this.name}`;
      }

      build(options, compilation, resolver, fs, callback) {
        this.built = true;
        this.buildMeta = {};
        this.buildInfo = {};
        return callback();
      }

      source() {
        return new RawSource("module.exports = __webpack_require__;");
      }

      needRebuild() {
        return false;
      }

      size() {
        return 12;
      }

      /**
       * @param {Hash} hash the hash used to track dependencies
      * @returns {void}
      */
      updateHash(hash) {
        hash.update("dll module");
        hash.update(this.name || "");
        super.updateHash(hash);
      }
    }
    ```
    :::

6. **DelegatedModule**

    :::details DelegatedModule.js
    ```js
    class DelegatedModule extends Module {
      constructor(sourceRequest, data, type, userRequest, originalRequest) {
        super("javascript/dynamic", null);

        // Info from Factory
        this.sourceRequest = sourceRequest;
        this.request = data.id;
        this.type = type;
        this.userRequest = userRequest;
        this.originalRequest = originalRequest;
        this.delegateData = data;

        // Build info
        this.delegatedSourceDependency = undefined;
      }

      libIdent(options) {
        return typeof this.originalRequest === "string"
          ? this.originalRequest
          : this.originalRequest.libIdent(options);
      }

      identifier() {
        return `delegated ${JSON.stringify(this.request)} from ${
          this.sourceRequest
        }`;
      }

      readableIdentifier() {
        return `delegated ${this.userRequest} from ${this.sourceRequest}`;
      }

      needRebuild() {
        return false;
      }

      build(options, compilation, resolver, fs, callback) {
        this.built = true;
        this.buildMeta = Object.assign({}, this.delegateData.buildMeta);
        this.buildInfo = {};
        this.delegatedSourceDependency = new DelegatedSourceDependency(
          this.sourceRequest
        );
        this.addDependency(this.delegatedSourceDependency);
        this.addDependency(
          new DelegatedExportsDependency(this, this.delegateData.exports || true)
        );
        callback();
      }

      source(depTemplates, runtime) {
        const dep = /** @type {DelegatedSourceDependency} */ (this.dependencies[0]);
        const sourceModule = dep.module;
        let str;

        if (!sourceModule) {
          str = WebpackMissingModule.moduleCode(this.sourceRequest);
        } else {
          str = `module.exports = (${runtime.moduleExports({
            module: sourceModule,
            request: dep.request
          })})`;

          switch (this.type) {
            case "require":
              str += `(${JSON.stringify(this.request)})`;
              break;
            case "object":
              str += `[${JSON.stringify(this.request)}]`;
              break;
          }

          str += ";";
        }

        if (this.useSourceMap) {
          return new OriginalSource(str, this.identifier());
        } else {
          return new RawSource(str);
        }
      }

      size() {
        return 42;
      }

      /**
       * @param {Hash} hash the hash used to track dependencies
      * @returns {void}
      */
      updateHash(hash) {
        hash.update(this.type);
        hash.update(JSON.stringify(this.request));
        super.updateHash(hash);
      }
    }
    ```
    :::

    使用了 DllPlugin 插件，会用到第 5 和 第 6 两种 module。

7. **ExternalModule**

    :::details ExternalModule.js
    ```js
    class ExternalModule extends Module {
      constructor(request, type, userRequest) {
        super("javascript/dynamic", null);

        // Info from Factory
        this.request = request;
        this.externalType = type;
        this.userRequest = userRequest;
        this.external = true;
      }

      libIdent() {
        return this.userRequest;
      }

      chunkCondition(chunk) {
        return chunk.hasEntryModule();
      }

      identifier() {
        return "external " + JSON.stringify(this.request);
      }

      readableIdentifier() {
        return "external " + JSON.stringify(this.request);
      }

      needRebuild() {
        return false;
      }

      build(options, compilation, resolver, fs, callback) {
        this.built = true;
        this.buildMeta = {};
        this.buildInfo = {};
        callback();
      }

      getSourceForGlobalVariableExternal(variableName, type) {
        if (!Array.isArray(variableName)) {
          // make it an array as the look up works the same basically
          variableName = [variableName];
        }

        // needed for e.g. window["some"]["thing"]
        const objectLookup = variableName
          .map(r => `[${JSON.stringify(r)}]`)
          .join("");
        return `(function() { module.exports = ${type}${objectLookup}; }());`;
      }

      getSourceForCommonJsExternal(moduleAndSpecifiers) {
        if (!Array.isArray(moduleAndSpecifiers)) {
          return `module.exports = require(${JSON.stringify(
            moduleAndSpecifiers
          )});`;
        }

        const moduleName = moduleAndSpecifiers[0];
        const objectLookup = moduleAndSpecifiers
          .slice(1)
          .map(r => `[${JSON.stringify(r)}]`)
          .join("");
        return `module.exports = require(${JSON.stringify(
          moduleName
        )})${objectLookup};`;
      }

      checkExternalVariable(variableToCheck, request) {
        return `if(typeof ${variableToCheck} === 'undefined') {${WebpackMissingModule.moduleCode(
          request
        )}}\n`;
      }

      getSourceForAmdOrUmdExternal(id, optional, request) {
        const externalVariable = `__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
          `${id}`
        )}__`;
        const missingModuleError = optional
          ? this.checkExternalVariable(externalVariable, request)
          : "";
        return `${missingModuleError}module.exports = ${externalVariable};`;
      }

      getSourceForDefaultCase(optional, request) {
        if (!Array.isArray(request)) {
          // make it an array as the look up works the same basically
          request = [request];
        }

        const variableName = request[0];
        const missingModuleError = optional
          ? this.checkExternalVariable(variableName, request.join("."))
          : "";
        const objectLookup = request
          .slice(1)
          .map(r => `[${JSON.stringify(r)}]`)
          .join("");
        return `${missingModuleError}module.exports = ${variableName}${objectLookup};`;
      }

      getSourceString(runtime) {
        const request =
          typeof this.request === "object" && !Array.isArray(this.request)
            ? this.request[this.externalType]
            : this.request;
        switch (this.externalType) {
          case "this":
          case "window":
          case "self":
            return this.getSourceForGlobalVariableExternal(
              request,
              this.externalType
            );
          case "global":
            return this.getSourceForGlobalVariableExternal(
              request,
              runtime.outputOptions.globalObject
            );
          case "commonjs":
          case "commonjs2":
            return this.getSourceForCommonJsExternal(request);
          case "amd":
          case "amd-require":
          case "umd":
          case "umd2":
          case "system":
            return this.getSourceForAmdOrUmdExternal(
              this.id,
              this.optional,
              request
            );
          default:
            return this.getSourceForDefaultCase(this.optional, request);
        }
      }

      getSource(sourceString) {
        if (this.useSourceMap) {
          return new OriginalSource(sourceString, this.identifier());
        }

        return new RawSource(sourceString);
      }

      source(dependencyTemplates, runtime) {
        return this.getSource(this.getSourceString(runtime));
      }

      size() {
        return 42;
      }

      /**
       * @param {Hash} hash the hash used to track dependencies
      * @returns {void}
      */
      updateHash(hash) {
        hash.update(this.externalType);
        hash.update(JSON.stringify(this.request));
        hash.update(JSON.stringify(Boolean(this.optional)));
        super.updateHash(hash);
      }
    }
    ```
    :::

    配置了 externals 的 module，都是 ExternalModule。