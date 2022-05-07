module.exports = {
  lang: 'zh-CN',
  title: '卑鄙智',
  base: '/blog-site/',
  description: '',
  markdown: {
    code: { lineNumbers: false }
  },
  themeConfig: {
    logo: '/assets/logo.jpeg',
    repo: 'https://github.com/theniceangel',
    sidebar: {
      '/': [
        {
          text: 'sourcemap',
          children: [
            '/sourcemap/base64.md',
            '/sourcemap/README.md',
            '/sourcemap/unicodeInJavascript.md'
          ]
        }
      ],
      '/webpack4/': [
        {
          text: '术语',
          children: [
            '/webpack4/term/module.md',
            '/webpack4/term/chunk.md',
            '/webpack4/term/entrypoint&chunkGroup.md',
            '/webpack4/term/dependency&moduleFactory.md'
          ]
        },
        {
          text: 'tapable-1.1.3',
          children: ['/webpack4/tapable']
        },
        {
          text: '流程图',
          children: ['/webpack4/introduction/flow-diagram.md']
        },
        {
          text: '编译全流程',
          children: [
            '/webpack4/webpack-process/startup.md',
            '/webpack4/webpack-process/handle-options.md',
            '/webpack4/webpack-process/new-compiler.md',
            '/webpack4/webpack-process/inner-plugins.md',
            '/webpack4/webpack-process/run-compiler.md',
            '/webpack4/webpack-process/before-compile.md',
            '/webpack4/webpack-process/compiling.md',
            '/webpack4/webpack-process/compiling-modules.md'
          ]
        },
        {
          text: '路径解析',
          children: [
            '/webpack4/module-resolver/README.md',
            '/webpack4/module-resolver/Resolver.md',
            '/webpack4/module-resolver/ResolverFactory.md'
          ]
        },
        {
          text: 'Loader 原理',
          children: [
            '/webpack4/loaders/README.md',
            '/webpack4/loaders/loader-runner.md'
          ]
        },
        {
          text: 'webpack 内部插件合集',
          children: [
            '/webpack4/internal-plugins/entry/EntryOptionPlugin.md',
            '/webpack4/internal-plugins/TemplatedPathPlugin.md',
            '/webpack4/internal-plugins/WarnCaseSensitiveModulesPlugin.md'
          ]
        },
        {
          text: 'webpack 第三方库',
          children: ['/webpack4/third-dependencies/README.md']
        },
        {
          text: 'webpack 配置项',
          children: ['/webpack4/configuration/README.md']
        }
      ],
      '/networks/': [
        {
          text: '网络知识',
          children: ['/networks/https.md']
        }
      ]
    },
    navbar: [
      {
        text: 'Vue 源码合集',
        children: [
          {
            text: 'v2',
            link: '/vue2/README.md'
          },
          {
            text: 'v3',
            link: '/vue3/README.md'
          }
        ]
      },
      {
        text: 'webpack 源码合集',
        children: [
          {
            text: 'v4.46.0',
            link: '/webpack4/README.md'
          },
          {
            text: 'v5',
            link: '/webpack5/README.md'
          }
        ]
      },
      {
        text: '计算机基础知识',
        children: [
          {
            text: '网络',
            link: '/networks/README.md'
          }
        ]
      }
    ]
  },
  plugins: [
    [
      '@vuepress/plugin-shiki',
      {
        theme: 'github-dark'
      }
    ]
  ]
}
