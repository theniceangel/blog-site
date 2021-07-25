# Tapable

webpack 强大的 Plugins 架构设计就是基于 Tapable，内部含有各种各样的 hooks，它们的种类和功能都不一样。由于 webpack 4.46.0 依赖的是 tapable 1.1.3，所以先研究 tapable v1，等到 webpack v5 的时候再研究 tapable v2。

// TODO