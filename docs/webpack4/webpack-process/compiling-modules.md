# 模块解析

webpack 需要配置 entry，这个是 webpack 的入口模块，通过入口模块，就能解析出所有的模块，而入口就在触发 make hook 的时候。

```js
class Compiler extends Tapable {
  compile(callback) {
    this.hooks.make.callAsync(compilation, err => {
      // ...
    });
  }
}
```

在这个例子里面，钩入 make hook 的插件是 [SingleEntryPlugin](../internal-plugins/entry/SingleEntryPlugin.md)，当然也有可能是其他的插件，比如 [MultiEntryPlugin](../internal-plugins/entry/MultiEntryPlugin.md)、[DynamicEntryPlugin](../internal-plugins/entry/DynamicEntryPlugin.md)，这些取决于 [EntryOptionPlugin](../internal-plugins/entry/EntryOptionPlugin.md)。

## SingleEntryPlugin

```js
class SingleEntryPlugin {
  apply(compiler) {
    // ... 省略其他代码
    compiler.hooks.make.tapAsync(
      "SingleEntryPlugin",
      (compilation, callback) => {
        const { entry, name, context } = this;
        // 生成 singleEntryDependency
        const dep = SingleEntryPlugin.createDependency(entry, name);
        // 添加 entry
        compilation.addEntry(context, dep, name, callback);
      }
    );
  }
  static createDependency(entry, name) {
    const dep = new SingleEntryDependency(entry);
    dep.loc = { name };
    return dep;
  }
}
```

具体 SingleEntryPlugin 的分析，请👇[这里](../internal-plugins/entry/SingleEntryPlugin.md)，接着就是执行 `compilation.addEntry`。

## compilation.addEntry()

```js
class Compilation {
  // context：执行 webpack 的上下文路径
  // entry： dependency
  // name：入口模块的名称，默认是 main
  addEntry(context, entry, name, callback) {
    // 触发 addEntry hook
    this.hooks.addEntry.call(entry, name);

    const slot = {
      name: name,
      request: null,
      module: null
    };

    if (entry instanceof ModuleDependency) {
      slot.request = entry.request;
    }
    // 判断是否有重名的入口模块
    const idx = this._preparedEntrypoints.findIndex(slot => slot.name === name);
    if (idx >= 0) {
      // 如果存在就直接覆盖
      this._preparedEntrypoints[idx] = slot;
    } else {
      this._preparedEntrypoints.push(slot);
    }
    // 开始递归分析所有的模块
    this._addModuleChain(
      context,
      entry,
      module => {
        // 保存入口模块
        this.entries.push(module);
      },
      (err, module) => {
        // 所有的模块已经分析完成
        if (err) {
          // 如果出错，触发 failedEntry 钩子
          this.hooks.failedEntry.call(entry, name, err);
          return callback(err);
        }
        // 如果成功解析入口模块
        if (module) {
          slot.module = module;
        } else {
          const idx = this._preparedEntrypoints.indexOf(slot);
          if (idx >= 0) {
            this._preparedEntrypoints.splice(idx, 1);
          }
        }
        // 触发 succeedEntry hook，因为从入口开始已经解析出了所有的模块
        this.hooks.succeedEntry.call(entry, name, module);
        return callback(null, module);
      }
    );
  }
}
```

`compilation.addEntry` 包含了整个模块解析的过程，而 `this._addModuleChain` 则是递归分析所有模块的入口。

## compilation._addModuleChain()

```js
 class Compilation {
   _addModuleChain(context, dependency, onModule, callback) {
     // 配置了 profile 选项
    const start = this.profile && Date.now();
    const currentProfile = this.profile && {};
    // this.bail 为 true 的话，出现 error，第一时间退出 webpack 构建
    // 否则会将 errors 存到 compilation.errors 上，等到构建完成之后，打印在命令行
    const errorAndCallback = this.bail
      ? err => {
          callback(err);
        }
      : err => {
          err.dependencies = [dependency];
          this.errors.push(err);
          callback();
        };

    if (
      typeof dependency !== "object" ||
      dependency === null ||
      !dependency.constructor
    ) {
      throw new Error("Parameter 'dependency' must be a Dependency");
    }
    const Dep = /** @type {DepConstructor} */ (dependency.constructor);
    const moduleFactory = this.dependencyFactories.get(Dep);
    if (!moduleFactory) {
      throw new Error(
        `No dependency factory available for this dependency type: ${dependency.constructor.name}`
      );
    }

    this.semaphore.acquire(() => {
      moduleFactory.create(
        {
          contextInfo: {
            issuer: "",
            compiler: this.compiler.name
          },
          context: context,
          dependencies: [dependency]
        },
        (err, module) => {
          if (err) {
            this.semaphore.release();
            return errorAndCallback(new EntryModuleNotFoundError(err));
          }

          let afterFactory;

          if (currentProfile) {
            afterFactory = Date.now();
            currentProfile.factory = afterFactory - start;
          }

          const addModuleResult = this.addModule(module);
          module = addModuleResult.module;

          onModule(module);

          dependency.module = module;
          module.addReason(null, dependency);

          const afterBuild = () => {
            if (addModuleResult.dependencies) {
              this.processModuleDependencies(module, err => {
                if (err) return callback(err);
                callback(null, module);
              });
            } else {
              return callback(null, module);
            }
          };

          if (addModuleResult.issuer) {
            if (currentProfile) {
              module.profile = currentProfile;
            }
          }

          if (addModuleResult.build) {
            this.buildModule(module, false, null, null, err => {
              if (err) {
                this.semaphore.release();
                return errorAndCallback(err);
              }

              if (currentProfile) {
                const afterBuilding = Date.now();
                currentProfile.building = afterBuilding - afterFactory;
              }

              this.semaphore.release();
              afterBuild();
            });
          } else {
            this.semaphore.release();
            this.waitForBuildingFinished(module, afterBuild);
          }
        }
      );
    });
  }
 }
```