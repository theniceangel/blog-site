# 背景

tapable 诞生就是为了解决 webpack 钩子设计的问题，按照**种类**来划分，分为**同步**与**异步**，而对于这不同种的钩子又可以按照**返回值用途**来区分。

## `constructor`

```js
function Tapable() {
  this._plugins = {};
}
```

_plugins 对象上通过 key/value 方式存储了 pluginName 以及 pluginFunction 的映射关系。

## `plugin`

通过 `plugin` 方法来注册 plugin

```js
Tapable.prototype.plugin = function plugin(name, fn) {
  if(Array.isArray(name)) {
    name.forEach(function(name) {
      this.plugin(name, fn);
    }, this);
    return;
  }
  if(!this._plugins[name]) this._plugins[name] = [fn];
  else this._plugins[name].push(fn);
};
```

## `hasPlugin`

  ```js
  Tapable.prototype.hasPlugins = function hasPlugins(name) {
    var plugins = this._plugins[name];
    return plugins && plugins.length > 0;
  };
  ```

  判断插件是否存在。

## `apply`

  ```js
  Tapable.prototype.apply = function apply() {
    for(var i = 0; i < arguments.length; i++) {
      arguments[i].apply(this);
    }
  };
  ```

  接收插件数组，并且逐个调用插件的 apply 方法。

## `同步`

- **applyPlugins(0|1|2)**

  applyPlugins 后面的数字，代表 **pluginFunction** 接收的参数数量，applyPlugins 代表接收任意多的参数，并且全部传给 pluginFunction

  :::details 点击展开
  ```js
  Tapable.prototype.applyPlugins = function applyPlugins(name) {
    if(!this._plugins[name]) return;
    var args = Array.prototype.slice.call(arguments, 1);
    var plugins = this._plugins[name];
    for(var i = 0; i < plugins.length; i++)
      plugins[i].apply(this, args);
  };

  Tapable.prototype.applyPlugins0 = function applyPlugins0(name) {
    var plugins = this._plugins[name];
    if(!plugins) return;
    for(var i = 0; i < plugins.length; i++)
      plugins[i].call(this);
  };

  Tapable.prototype.applyPlugins1 = function applyPlugins1(name, param) {
    var plugins = this._plugins[name];
    if(!plugins) return;
    for(var i = 0; i < plugins.length; i++)
      plugins[i].call(this, param);
  };

  Tapable.prototype.applyPlugins2 = function applyPlugins2(name, param1, param2) {
    var plugins = this._plugins[name];
    if(!plugins) return;
    for(var i = 0; i < plugins.length; i++)
      plugins[i].call(this, param1, param2);
  };
  ```
  :::

  applyPlugins 仅仅只是找到指定的 pluginFuction，遍历执行，同时根据参数的数量来提供不同的方法名。

- **applyPluginsWaterfall(0|1|2)**

  applyPluginsWaterfall 与 applyPlugins 的区别在于，每一个 `pluginFunction` 的返回值，作为下一个 `pluginFunction` 的第一个参数，顾名思义 `waterfall`

  :::details 点击展开
  ```js
  Tapable.prototype.applyPluginsWaterfall = function applyPluginsWaterfall(name, init) {
    if(!this._plugins[name]) return init;
    var args = Array.prototype.slice.call(arguments, 1);
    var plugins = this._plugins[name];
    var current = init;
    for(var i = 0; i < plugins.length; i++) {
      args[0] = current;
      current = plugins[i].apply(this, args);
    }
    return current;
  };

  Tapable.prototype.applyPluginsWaterfall0 = function applyPluginsWaterfall0(name, init) {
    var plugins = this._plugins[name];
    if(!plugins) return init;
    var current = init;
    for(var i = 0; i < plugins.length; i++)
      current = plugins[i].call(this, current);
    return current;
  };

  Tapable.prototype.applyPluginsWaterfall1 = function applyPluginsWaterfall1(name, init, param) {
    var plugins = this._plugins[name];
    if(!plugins) return init;
    var current = init;
    for(var i = 0; i < plugins.length; i++)
      current = plugins[i].call(this, current, param);
    return current;
  };

  Tapable.prototype.applyPluginsWaterfall2 = function applyPluginsWaterfall2(name, init, param1, param2) {
    var plugins = this._plugins[name];
    if(!plugins) return init;
    var current = init;
    for(var i = 0; i < plugins.length; i++)
      current = plugins[i].call(this, current, param1, param2);
    return current;
  };
  ```
  :::

- **applyPluginsBailResult(0|1|2|3|4|5)**

  applyPluginsBailResult 与 applyPluginsWaterfall 的区别在于，只要前一个 `pluginFunction` 的返回值不是 `undefined`，则中断接下来所有的 `pluginFunction` 的执行，顾名思义 `Bail(保险的)`

  :::details 点击展开
  ```js
  Tapable.prototype.applyPluginsBailResult = function applyPluginsBailResult(name) {
    if(!this._plugins[name]) return;
    var args = Array.prototype.slice.call(arguments, 1);
    var plugins = this._plugins[name];
    for(var i = 0; i < plugins.length; i++) {
      var result = plugins[i].apply(this, args);
      if(typeof result !== "undefined") {
        return result;
      }
    }
  };

  Tapable.prototype.applyPluginsBailResult1 = function applyPluginsBailResult1(name, param) {
    if(!this._plugins[name]) return;
    var plugins = this._plugins[name];
    for(var i = 0; i < plugins.length; i++) {
      var result = plugins[i].call(this, param);
      if(typeof result !== "undefined") {
        return result;
      }
    }
  };

  Tapable.prototype.applyPluginsBailResult2 = function applyPluginsBailResult2(name, param1, param2) {
    if(!this._plugins[name]) return;
    var plugins = this._plugins[name];
    for(var i = 0; i < plugins.length; i++) {
      var result = plugins[i].call(this, param1, param2);
      if(typeof result !== "undefined") {
        return result;
      }
    }
  };

  Tapable.prototype.applyPluginsBailResult3 = function applyPluginsBailResult3(name, param1, param2, param3) {
    if(!this._plugins[name]) return;
    var plugins = this._plugins[name];
    for(var i = 0; i < plugins.length; i++) {
      var result = plugins[i].call(this, param1, param2, param3);
      if(typeof result !== "undefined") {
        return result;
      }
    }
  };

  Tapable.prototype.applyPluginsBailResult4 = function applyPluginsBailResult4(name, param1, param2, param3, param4) {
    if(!this._plugins[name]) return;
    var plugins = this._plugins[name];
    for(var i = 0; i < plugins.length; i++) {
      var result = plugins[i].call(this, param1, param2, param3, param4);
      if(typeof result !== "undefined") {
        return result;
      }
    }
  };

  Tapable.prototype.applyPluginsBailResult5 = function applyPluginsBailResult5(name, param1, param2, param3, param4, param5) {
    if(!this._plugins[name]) return;
    var plugins = this._plugins[name];
    for(var i = 0; i < plugins.length; i++) {
      var result = plugins[i].call(this, param1, param2, param3, param4, param5);
      if(typeof result !== "undefined") {
        return result;
      }
    }
  };
  ```
  :::

## `异步`

- **applyPluginsAsyncSeries(1) 与 applyPluginsAsync**

 :::details 点击展开
 ```js
Tapable.prototype.applyPluginsAsyncSeries = Tapable.prototype.applyPluginsAsync = function applyPluginsAsyncSeries(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    var callback = args.pop();
    var plugins = this._plugins[name];
    if(!plugins || plugins.length === 0) return callback();
    var i = 0;
    var _this = this;
    args.push(copyProperties(callback, function next(err) {
      if(err) return callback(err);
      i++;
      if(i >= plugins.length) {
        return callback();
      }
      plugins[i].apply(_this, args);
    }));
    plugins[0].apply(this, args);
  };
 ```
 :::

 applyPluginsAsyncSeries 要求每个 `pluginFunction` 手动调用 next 函数，才会执行下一个  `pluginFunction`，这样也就实现了异步顺序执行的功能，`Series` 的中文就是串行。

 举个例子：

 ```js
  let t = new Tapable()

  t.plugin('t', (next) => {
    setTimeout(() => {
      // null 代表没有错误
      next(null)
    }, 1000)
  })

  t.plugin('t', (next) => {
    // 1s 之后才会进入到这个函数
    next(null)
  })

  t.applyPluginsAsyncSeries('t', () => { console.log('done') /*最后执行*/ })
 ```

- **applyPluginsAsyncSeriesBailResult(1)**

 :::details 点击展开
 ```js
  Tapable.prototype.applyPluginsAsyncSeriesBailResult = function applyPluginsAsyncSeriesBailResult(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    var callback = args.pop();
    if(!this._plugins[name] || this._plugins[name].length === 0) return callback();
    var plugins = this._plugins[name];
    var i = 0;
    var _this = this;
    args.push(copyProperties(callback, function next() {
      if(arguments.length > 0) return callback.apply(null, arguments);
      i++;
      if(i >= plugins.length) {
        return callback();
      }
      plugins[i].apply(_this, args);
    }));
    plugins[0].apply(this, args);
  };
 ```
 :::

 applyPluginsAsyncSeriesBailResult 与 applyPluginsAsyncSeries 的功能类似，不过只要某个 `pluginFunction` 调用 next 的时候，存在入参，便中断后续的 `pluginFunction` 执行，直接调用 `callback`。

 举个例子：

 ```js
  let t = new Tapable()

  t.plugin('t', (next) => { // pluginFunction1
    setTimeout(() => {
      next(1)
    }, 1000)
  })

  t.plugin('t', (next) => { // pluginFunction2
    // 不会进入到pluginFunction2
    next(null)
  })

  t.applyPluginsAsyncSeriesBailResult('t', () => {
    // 执行完 pluginFunction1，立马执行这个函数
    console.log('done')
  })
 ```

- **applyPluginsAsyncWaterfall**

 :::details 点击展开
 ```js
  Tapable.prototype.applyPluginsAsyncWaterfall = function applyPluginsAsyncWaterfall(name, init, callback) {
    if(!this._plugins[name] || this._plugins[name].length === 0) return callback(null, init);
    var plugins = this._plugins[name];
    var i = 0;
    var _this = this;
    var next = copyProperties(callback, function(err, value) {
      if(err) return callback(err);
      i++;
      if(i >= plugins.length) {
        return callback(null, value);
      }
      plugins[i].call(_this, value, next);
    });
    plugins[0].call(this, init, next);
  };
 ```
 :::

 applyPluginsAsyncWaterfall 与 applyPluginsAsyncSeriesBailResult 的功能类似，不过上一个 `pluginFunction` 调用 next 的时候，传入的 value，会作为下一个 `pluginFunction` 的入参。

 举个例子：

 ```js
  let t = new Tapable()

  t.plugin('t', (value, next) => { // pluginFunction1
    setTimeout(() => {
      // value 是 0
      next(null, value + 1)
    }, 1000)
  })

  t.plugin('t', (value, next) => { // pluginFunction2
    // value 是 1
    next(null, value + 1)
  })

  t.applyPluginsAsyncWaterfall('t', 0, (value) => {
    // 打印 2
    console.log(value)
  })
 ```

## `既可以是同步，也可以是异步`

- **applyPluginsParallel**

  :::details 点击展开
  ```js
  Tapable.prototype.applyPluginsParallel = function applyPluginsParallel(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    var callback = args.pop();
    if(!this._plugins[name] || this._plugins[name].length === 0) return callback();
    var plugins = this._plugins[name];
    var remaining = plugins.length;
    args.push(copyProperties(callback, function(err) /* 匿名函数 */ {
      if(remaining < 0) return; // ignore
      if(err) {
        remaining = -1;
        return callback(err);
      }
      remaining--;
      if(remaining === 0) {
        return callback();
      }
    }));
    for(var i = 0; i < plugins.length; i++) {
      plugins[i].apply(this, args);
      if(remaining < 0) return;
    }
  };
  ```
  :::

  applyPluginsParallel 与 applyPlugins 很相似，唯一的差别在于 applyPluginsParallel 的最后一个参数是一个 callback，在执行完所有的 `pluginFunction`，并且在 `pluginFunction` 主动调用 `copyProperties` 返回的`匿名函数`之后，最终会执行 `callback`，而 applyPlugins 只是仅仅执行 `pluginFunction`，对 `pluginFunction` 内部的逻辑没有要求。

  举个例子：

  ```js
  // applyPlugins
  tapable.plugin('applyPlugins', () => { console.log(1) })
  tapable.plugin('applyPlugins', () => { console.log(2) })
  tapable.applyPlugins('applyPlugins')

  // applyPluginsParallel（异步）
  tapable.plugin('applyPluginsParallel', (next/*匿名函数*/) => {
    setTimeout(() => {
      console.log(1)
      // 手动调用 next
      next()
    }, 1000)
  })
  tapable.plugin('applyPluginsParallel', (next/*匿名函数*/) => {
    setTimeout(() => {
      console.log(2)
      // 手动调用 next
      next()
    }, 2000)
  })
  tapable.applyPluginsParallel('applyPluginsParallel', /*callback*/() => {
    console.log('done')
  })
  // 第 1s 打印 1，第 2s 打印2，接着打印 done
  ```

- **applyPluginsParallelBailResult(1)**

  :::details 点击展开
  ```js
  Tapable.prototype.applyPluginsParallelBailResult = function applyPluginsParallelBailResult(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    var callback = args[args.length - 1];
    if(!this._plugins[name] || this._plugins[name].length === 0) return callback();
    var plugins = this._plugins[name];
    var currentPos = plugins.length;
    var currentResult;
    var done = [];
    for(var i = 0; i < plugins.length; i++) {
      args[args.length - 1] = (function(i) {
        return copyProperties(callback, function() {
          if(i >= currentPos) return; // ignore
          done.push(i);
          if(arguments.length > 0) {
            currentPos = i + 1;
            done = fastFilter.call(done, function(item) {
              return item <= i;
            });
            currentResult = Array.prototype.slice.call(arguments);
          }
          if(done.length === currentPos) {
            callback.apply(null, currentResult);
            currentPos = 0;
          }
        });
      }(i));
      plugins[i].apply(this, args);
    }
  };

  Tapable.prototype.applyPluginsParallelBailResult1 = function applyPluginsParallelBailResult1(name, param, callback) {
    var plugins = this._plugins[name];
    if(!plugins || plugins.length === 0) return callback();
    var currentPos = plugins.length;
    var currentResult;
    var done = [];
    for(var i = 0; i < plugins.length; i++) {
      var innerCallback = (function(i) {
        return copyProperties(callback, function() {
          if(i >= currentPos) return; // ignore
          done.push(i);
          if(arguments.length > 0) {
            currentPos = i + 1;
            done = fastFilter.call(done, function(item) {
              return item <= i;
            });
            currentResult = Array.prototype.slice.call(arguments);
          }
          if(done.length === currentPos) {
            callback.apply(null, currentResult);
            currentPos = 0;
          }
        });
      }(i));
      plugins[i].call(this, param, innerCallback);
    }
  };
  ```
  :::

  applyPluginsParallelBailResult 与其他的方法有一些区别，它接收一个 callback，当内部的 `pluginFunction` 调用匿名函数传入一个非 undefined 的时候，会执行 callback，并且 `pluginFunction` 的优先级不是取决于调用匿名函数的快慢，而是 `pluginFunction` 的注册顺序。

  举个例子：

  ```js
  let t = new Tapable()

  t.plugin('t', (next) => {
    setTimeout(() => {
      next(1)
    }, 1000)
  })

  t.plugin('t', (next) => {
    next(2)
  })

  t.applyPluginsParallelBailResult('t', (result) => {
    // 过 1s 打印 1，而不是立即打印 2
    // 虽然 next(2) 的执行速度比 next(1) 快
    console.log(result)
  })
  ```

## 总结

作为 0.x 版本，其实功能已经满足 webpack 使用，但是仔细发现，0.x 版本对于异步类型来说，不支持 `promise`，当然不影响整个库完备的`同步与异步`逻辑，不过由于异步的 pluginFunction 都得依赖用户手动调用 next 函数，每次都需要开辟栈内存并且不能够及时的回收，导致 webpack 内部构建非常吃内存，很容易造成 stackOverflow，因此 [1.x](../tapable-1.x/README.md) 通过 `new Function` 的编译方式来解决栈溢出的问题，并且也支持了 `promise` 的能力，而且也支持了排序 `pluginFunction` 的能力。