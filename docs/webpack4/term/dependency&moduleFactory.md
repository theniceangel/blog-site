
# dependency、moduleFactory

## dependency

在 webpack 当中，万物皆是 module，但是当一个模块依赖另外一个模块的时候，怎么描述这个关系呢？没错，**依赖**！

举个例子：

```js
// index.js
import A from './a'
```

对于 index 模块来说，它的产生，是因为在 webpack.config.js 配置了 entry 是 index 文件，而 index 模块对应的 dependency 就是 [SingleEntryDependency](../internal-plugins/entry/SingleEntryPlugin.md)。

对于 a 模块来说，它的产生，是因为 index 模块引入了它，换言之，而 a 模块对应的 dependency 就是 HarmonyImportSpecifierDependency 与 HarmonyImportSideEffectDependency。

但是模块是直接与 dependency 关联的吗？

**不，它们之间还有一层 moduleFactory。**

## moduleFactory

与 dependency 有直接联系的是 moduleFactory，在 webpack 源码中最常见的就是 `NormalModuleFactory`，NormalModuleFactory 的功能与它的名字相符，就是为了生成 normalModule，当然还有很多其他类型的 ModuleFactory 实例，详见下文。

## Dependency 与 ModuleFactory 集合

- **`1. NormalModuleFactory`**

  webpack 源码中最常见的 ModuleFactory 类，生成的模块是 normalModule。与它有关系的 Dependency 如下图：

  <img :src="$withBase('/assets/normalModuleFactory.png')" />

- **`2. MultiModuleFactory`**

  如果 webpack 的 entry 配置为数组，那么生成入口模块的 dependency 就是 MultiModuleFactory，它生成的模块是 multiModule。与它有关系的 Dependency 如下图：

  <img :src="$withBase('/assets/multi-module-factory.png')" />

- **`3. ContextModuleFactory`**

  比较少见的模块生成的工厂类，生成的模块是 contextModule。在以下的场景会使用 ContextModuleFactory。与它有关系的 Dependency 如下图：

  <img :src="$withBase('/assets/contextModuleFactory.png')" />

  ```js
  // 加载 template 目录下所有 ejs 格式的文件
  require('./template/' + name + '.ejs');

  // 加载 lang 目录下所有的语言包
  import('./lang/' + name + '.js')
  ```

- **`4. DllModuleFactory`**

  在使用了 DllEntryPlugin 插件之后，webpack 内部就会使用 DllModuleFactory，生成的模块就是 dllModule。与它有关系的 Dependency 如下图：

  <img :src="$withBase('/assets/dll-module-factory.png')" />

- **`5. NullFactory`**

  NullFactory 没有任何的特殊的意义，只是提供一个占位的功能来对齐以上的功能。很多 Dependency 都与 NullFactory 关联。

  <img :src="$withBase('/assets/null-factory.png')" />

## 示意图

用一个图来说明 Dependency, ModuleFactory, Module 的关系。

<img :src="$withBase('/assets/dependency-module-factory.png')" />

Dependency 与 ModuleFactory 的关系是保存在 compilation.dependencyFactories，它是一个 Map 结构，不同的 Dependency 关联不同的 ModuleFactory，最后生成对应的 Module 实例。
