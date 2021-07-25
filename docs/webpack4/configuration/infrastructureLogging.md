# infrastructureLogging

infrastructureLogging 是一个对象，用来控制 webpack 基础设施级别的日志输出。配置选项如下：

:::tip
ProgressPlugin 插件会用到这个配置项
:::

## level

默认值是 `'info'`，枚举值如下：

- **'none'**：禁止命令行输出任何东西

- **'error'**：只允许在命令行输出 errors

- **'warn'**：只允许在命令行输出 errors 和 warnings

- **'info'**：只允许在命令行输出 errors、warnings 和 info

- **'log'**：允许命令行输出 errors、warnings、info、log 等等

- **'verbose'**：除了 debug 和 trace，允许命令行输出任何东西

## debug

默认值是 `'false'`，代表 webpack 构建过程中禁止 logging，它还可以是字符串，正则，函数，或者是一个包含这些种类的数组，主要是用来过滤 name 命中规则的 WebpackLogger 实例。

```js
module.exports = {
  //...
  infrastructureLogging: {
    level: 'info',
    debug: [
      'MyPlugin', // 过滤 compiler.getInfrastructureLogger('MyPlugin')
      /MyPlugin/, // 过滤 name 命中正则的 logger
      (name) => name.contains('MyPlugin') // 过滤 name 含有该字符串的 logger
    ]
  }
};
```

## console

webpack 允许你传入自定义的 logger 实现，不过它已自带了 node 环境下的 console 实现，所以一般不用传。

## 源码实现

在 `lib/node/NodeEnvironmentPlugin.js` 的逻辑里面，会根据 `infrastructureLogging` 来创建 logger。具体的逻辑如下：

```js
const nodeConsole = require("./nodeConsole");
class NodeEnvironmentPlugin {
  constructor(options) {
    this.options = options || {};
  }

  apply(compiler) {
    // 生成 logger
    compiler.infrastructureLogger = createConsoleLogger(
      Object.assign(
        {
          level: "info",
          debug: false,
          console: nodeConsole
        },
        this.options.infrastructureLogging
      )
    );
  }
}
```

接着是 createConsoleLogger 逻辑，代码在 `lib/logging/createConsoleLogger.js` 文件。

:::details lib/logging/createConsoleLogger.js
```js
module.exports = ({ level = "info", debug = false, console }) => {
  const logger = (name, type, args) => {
    // ... 省略内部逻辑
  };
  return logger;
};
```
:::

createConsoleLogger 接收三个参数，其中 `console` 参数是自己内部实现的 `nodeConsole` 对象，这个后面再谈。createConsoleLogger 函数返回的是另外一个 `logger` 函数，相当于 `compiler.infrastructureLogger = logger`， `logger` 是个闭包函数，包含了 `level`、`debug`、`console` 的引用，具体来看 logger 内部逻辑。

## compiler.infrastructureLogger

```js
const LogType = Object.freeze({
  error: /** @type {"error"} */ ("error"), // message, c style arguments
  warn: /** @type {"warn"} */ ("warn"), // message, c style arguments
  info: /** @type {"info"} */ ("info"), // message, c style arguments
  log: /** @type {"log"} */ ("log"), // message, c style arguments
  debug: /** @type {"debug"} */ ("debug"), // message, c style arguments

  trace: /** @type {"trace"} */ ("trace"), // no arguments

  group: /** @type {"group"} */ ("group"), // [label]
  groupCollapsed: /** @type {"groupCollapsed"} */ ("groupCollapsed"), // [label]
  groupEnd: /** @type {"groupEnd"} */ ("groupEnd"), // [label]

  profile: /** @type {"profile"} */ ("profile"), // [profileName]
  profileEnd: /** @type {"profileEnd"} */ ("profileEnd"), // [profileName]

  time: /** @type {"time"} */ ("time"), // name, time as [seconds, nanoseconds]

  clear: /** @type {"clear"} */ ("clear"), // no arguments
  status: /** @type {"status"} */ ("status") // message, arguments
});

// 对 debug 的类型进行处理，统统包裹成一个函数等待调用
const filterToFunction = item => {
  // 如果是 string，转化成正则，包裹成一个函数，等待调用
  if (typeof item === "string") {
    const regExp = new RegExp(
      `[\\\\/]${item.replace(
        /[-[\]{}()*+?.\\^$|]/g,
        "\\$&"
      )}([\\\\/]|$|!|\\?)`
    );
    return ident => regExp.test(ident);
  }
  // 如果是正则，包裹成一个函数，等待调用
  if (item && typeof item === "object" && typeof item.test === "function") {
    return ident => item.test(ident);
  }
  // 如果是函数，直接返回，等待调用
  if (typeof item === "function") {
    return item;
  }
  // 如果是布尔值，包裹成函数，等待调用
  if (typeof item === "boolean") {
    return () => item;
  }
};

const LogLevel = {
  none: 6,
  false: 6,
  error: 5,
  warn: 4,
  info: 3,
  log: 2,
  true: 2,
  verbose: 1
};

// debugFilters 是一个数组，里面都是对 debug 进行一层包裹的函数
const debugFilters =
    typeof debug === "boolean"
      ? [() => debug]
      : ([]).concat(debug).map(filterToFunction);
const loglevel = LogLevel[`${level}`] || 0;

// name 代表 logger 的名字
// type 代表 logger 的 type，枚举值见 LogType
const logger = (name, type, args) => {
  const labeledArgs = () => {
    if (Array.isArray(args)) {
      if (args.length > 0 && typeof args[0] === "string") {
        return [`[${name}] ${args[0]}`, ...args.slice(1)];
      } else {
        return [`[${name}]`, ...args];
      }
    } else {
      return [];
    }
  };
  // 校验是否可以 debug
  const debug = debugFilters.some(f => f(name));
  switch (type) {
    case LogType.debug:
      if (!debug) return;
      if (typeof console.debug === "function") {
        console.debug(...labeledArgs());
      } else {
        console.log(...labeledArgs());
      }
      break;
    case LogType.log:
      if (!debug && loglevel > LogLevel.log) return;
      console.log(...labeledArgs());
      break;
    case LogType.info:
      if (!debug && loglevel > LogLevel.info) return;
      console.info(...labeledArgs());
      break;
    case LogType.warn:
      if (!debug && loglevel > LogLevel.warn) return;
      console.warn(...labeledArgs());
      break;
    case LogType.error:
      if (!debug && loglevel > LogLevel.error) return;
      console.error(...labeledArgs());
      break;
    case LogType.trace:
      if (!debug) return;
      console.trace();
      break;
    case LogType.groupCollapsed:
      if (!debug && loglevel > LogLevel.log) return;
      if (!debug && loglevel > LogLevel.verbose) {
        if (typeof console.groupCollapsed === "function") {
          console.groupCollapsed(...labeledArgs());
        } else {
          console.log(...labeledArgs());
        }
        break;
      }
    case LogType.group:
      if (!debug && loglevel > LogLevel.log) return;
      if (typeof console.group === "function") {
        console.group(...labeledArgs());
      } else {
        console.log(...labeledArgs());
      }
      break;
    case LogType.groupEnd:
      if (!debug && loglevel > LogLevel.log) return;
      if (typeof console.groupEnd === "function") {
        console.groupEnd();
      }
      break;
    case LogType.time: {
      if (!debug && loglevel > LogLevel.log) return;
      const ms = args[1] * 1000 + args[2] / 1000000;
      const msg = `[${name}] ${args[0]}: ${ms}ms`;
      if (typeof console.logTime === "function") {
        console.logTime(msg);
      } else {
        console.log(msg);
      }
      break;
    }
    case LogType.profile:
      if (typeof console.profile === "function") {
        console.profile(...labeledArgs());
      }
      break;
    case LogType.profileEnd:
      if (typeof console.profileEnd === "function") {
        console.profileEnd(...labeledArgs());
      }
      break;
    case LogType.clear:
      if (!debug && loglevel > LogLevel.log) return;
      if (typeof console.clear === "function") {
        console.clear();
      }
      break;
    case LogType.status:
      if (!debug && loglevel > LogLevel.info) return;
      if (typeof console.status === "function") {
        if (args.length === 0) {
          console.status();
        } else {
          console.status(...labeledArgs());
        }
      } else {
        if (args.length !== 0) {
          console.info(...labeledArgs());
        }
      }
      break;
    default:
      throw new Error(`Unexpected LogType ${type}`);
  }
};
```

调用 `compiler.infrastructureLogger` 函数的时候，type 可以分为以下类型：

- **'debug'**：受 `debug` 配置影响

- **'log'**：受 `debug` 配置影响以及 `level` 值必须大于 `LogLevel.log` 枚举值

- **'info'**：受 `debug` 配置影响以及 `level` 值必须大于 `LogLevel.info` 枚举值

- **'warn'**：受 `debug` 配置影响以及 `level` 值必须大于 `LogLevel.warn` 枚举值

- **'error'**：受 `debug` 配置影响以及 `level` 值必须大于 `LogLevel.error` 枚举值

- **'trace'**：受 `debug` 配置影响

- **'groupCollapsed'**：受 `debug` 以及 `level` 配置影响

- **'group'**：受 `debug` 以及 `level` 配置影响

- **'groupEnd'**：受 `debug` 以及 `level` 配置影响

- **'time'**：受 `debug` 以及 `level` 配置影响

- **'profile'**：受 `console` 配置影响

- **'profileEnd'**：受 `console` 配置影响

- **'clear'**：受 `debug` 以及 `level` 配置影响

- **'status'**：受 `debug` 以及 `level` 配置影响

因此在调用 `compiler.infrastructureLogger` 的时候，其实就是调用 webpack 内部的 `nodeConsole`，它的逻辑在 `lib/node/nodeConsole.js` 里面。

:::details lib/node/nodeConsole.js
```js
module.exports = {
  log: writeColored("    ", "\u001b[1m", "\u001b[22m"),
  debug: writeColored("    ", "", ""),
  trace: writeColored("    ", "", ""),
  info: writeColored("<i> ", "\u001b[1m\u001b[32m", "\u001b[39m\u001b[22m"),
  warn: writeColored("<w> ", "\u001b[1m\u001b[33m", "\u001b[39m\u001b[22m"),
  error: writeColored("<e> ", "\u001b[1m\u001b[31m", "\u001b[39m\u001b[22m"),
  logTime: writeColored("<t> ", "\u001b[1m\u001b[35m", "\u001b[39m\u001b[22m"),
  group: (...args) => {
    writeGroupMessage(...args);
    if (currentCollapsed > 0) {
      currentCollapsed++;
    } else {
      currentIndent += "  ";
    }
  },
  groupCollapsed: (...args) => {
    writeGroupCollapsedMessage(...args);
    currentCollapsed++;
  },
  groupEnd: () => {
    if (currentCollapsed > 0) currentCollapsed--;
    else if (currentIndent.length >= 2)
      currentIndent = currentIndent.slice(0, currentIndent.length - 2);
  },
  profile: console.profile && (name => console.profile(name)),
  profileEnd: console.profileEnd && (name => console.profileEnd(name)),
  clear:
    tty &&
    console.clear &&
    (() => {
      clearStatusMessage();
      console.clear();
      writeStatusMessage();
    }),
  status: tty
    ? (name, ...args) => {
        args = args.filter(Boolean);
        if (name === undefined && args.length === 0) {
          clearStatusMessage();
          currentStatusMessage = undefined;
        } else if (
          typeof name === "string" &&
          name.startsWith("[webpack.Progress] ")
        ) {
          currentStatusMessage = [name.slice(19), ...args];
          writeStatusMessage();
        } else if (name === "[webpack.Progress]") {
          currentStatusMessage = [...args];
          writeStatusMessage();
        } else {
          currentStatusMessage = [name, ...args];
          writeStatusMessage();
        }
      }
    : writeColored("<s> ", "", "")
};
```
:::

nodeConsole 对外暴露的是拥有以上方法的对象，比如你可以像下面这样调用：

```js
const console = require('webpack/lib/node/nodeConsole')

console.log('123')
console.error(new Error('123'))
```

// TODO console 的实现留到后期再研究。。。。

## compiler.getInfrastructureLogger

看完 `compiler.infrastructureLogger` 的实现之后，发现它就是个 logger 函数，内部会调用 `nodeConsole` 函数，而真正消费 `compiler.infrastructureLogger` 的是 `compiler.getInfrastructureLogger` 方法。

```js
const { Logger } = require("./logging/Logger");
class Compiler {
  getInfrastructureLogger(name) {
    // 必须传 name
    if (!name) {
      throw new TypeError(
        "Compiler.getInfrastructureLogger(name) called without a name"
      );
    }
    // 返回 Logger 实例
    return new Logger((type, args) => {
      if (typeof name === "function") {
        name = name();
        if (!name) {
          throw new TypeError(
            "Compiler.getInfrastructureLogger(name) called with a function not returning a name"
          );
        }
      }
      if (this.hooks.infrastructureLog.call(name, type, args) === undefined) {
        if (this.infrastructureLogger !== undefined) {
          this.infrastructureLogger(name, type, args);
        }
      }
    });
  }
}
```

Logger 构造函数接收一个箭头函数作为入参，而实例会作为 `compiler.getInfrastructureLogger` 方法的返回值。先来聚焦 Logger 的实现，它位于 `lib/logging/Logger.js` 文件。

```js
const LOG_SYMBOL = Symbol("webpack logger raw log method");
const TIMERS_SYMBOL = Symbol("webpack logger times");

class WebpackLogger {
  constructor(log) {
    this[LOG_SYMBOL] = log;
  }

  error(...args) {
    this[LOG_SYMBOL](LogType.error, args);
  }

  warn(...args) {
    this[LOG_SYMBOL](LogType.warn, args);
  }

  info(...args) {
    this[LOG_SYMBOL](LogType.info, args);
  }

  log(...args) {
    this[LOG_SYMBOL](LogType.log, args);
  }

  debug(...args) {
    this[LOG_SYMBOL](LogType.debug, args);
  }

  assert(assertion, ...args) {
    if (!assertion) {
      this[LOG_SYMBOL](LogType.error, args);
    }
  }

  trace() {
    this[LOG_SYMBOL](LogType.trace, ["Trace"]);
  }

  clear() {
    this[LOG_SYMBOL](LogType.clear);
  }

  status(...args) {
    this[LOG_SYMBOL](LogType.status, args);
  }

  group(...args) {
    this[LOG_SYMBOL](LogType.group, args);
  }

  groupCollapsed(...args) {
    this[LOG_SYMBOL](LogType.groupCollapsed, args);
  }

  groupEnd(...args) {
    this[LOG_SYMBOL](LogType.groupEnd, args);
  }

  profile(label) {
    this[LOG_SYMBOL](LogType.profile, [label]);
  }

  profileEnd(label) {
    this[LOG_SYMBOL](LogType.profileEnd, [label]);
  }

  time(label) {
    this[TIMERS_SYMBOL] = this[TIMERS_SYMBOL] || new Map();
    this[TIMERS_SYMBOL].set(label, process.hrtime());
  }

  timeLog(label) {
    const prev = this[TIMERS_SYMBOL] && this[TIMERS_SYMBOL].get(label);
    if (!prev) {
      throw new Error(`No such label '${label}' for WebpackLogger.timeLog()`);
    }
    const time = process.hrtime(prev);
    this[LOG_SYMBOL](LogType.time, [label, ...time]);
  }

  timeEnd(label) {
    const prev = this[TIMERS_SYMBOL] && this[TIMERS_SYMBOL].get(label);
    if (!prev) {
      throw new Error(`No such label '${label}' for WebpackLogger.timeEnd()`);
    }
    const time = process.hrtime(prev);
    this[TIMERS_SYMBOL].delete(label);
    this[LOG_SYMBOL](LogType.time, [label, ...time]);
  }
}
```

WebpackLogger 实例上提供了非常多的 API，它的实现和浏览器的 `console` 相差不大，在调用这些 API 的时候，相当于调用 `new Logger(fn)` 时候传进来的 `fn`，正如上面提到的这一段代码：

```js
new Logger((type, args) => {
  if (typeof name === "function") {
    name = name();
    if (!name) {
      throw new TypeError(
        "Compiler.getInfrastructureLogger(name) called with a function not returning a name"
      );
    }
  }
  // 触发 compiler 上的 infrastructureLog hook
  if (this.hooks.infrastructureLog.call(name, type, args) === undefined) {
    // 最终还是走进 compiler.infrastructureLogger 回到了上述 logger 的实现了。
    if (this.infrastructureLogger !== undefined) {
      this.infrastructureLogger(name, type, args);
    }
  }
})
```

从 `compiler.getInfrastructureLogger` 的实现来看，必须提供 name，同时会实例化一个与之对应的 webpackLogger，而这个实例提供的全部 API，只是对 `lib/logging/createConsoleLogger.js` 中返回的 logger 函数做了一层代理。

整体的流程图如下：

<img :src="$withBase('/assets/infrastructureLogging.png')" />