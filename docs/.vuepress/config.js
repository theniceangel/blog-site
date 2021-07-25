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
      '/webpack4/': [
        {
          text: '术语',
          children: [
            '/webpack4/term/module.md',
            '/webpack4/term/chunk.md',
            '/webpack4/term/entrypoint&chunkGroup.md'
          ]
        },
        {
          text: 'tapable-1.1.3',
          children: [
            '/webpack4/tapable'
          ]
        },
        {
          text: '流程图',
          children: [
            '/webpack4/introduction/flow-diagram.md'
          ]
        },
        {
          text: '编译全流程',
          children: [
            '/webpack4/webpack-process/startup.md',
            '/webpack4/webpack-process/handle-options.md',
            '/webpack4/webpack-process/new-compiler.md',
            '/webpack4/webpack-process/inner-plugins.md',
            '/webpack4/webpack-process/run-compiler.md'
          ]
        },
        {
          text: 'mode',
          children: [
            '/webpack4/configuration/mode.md',
          ],
        },
        {
          text: 'optimization',
          children: [
            '/webpack4/configuration/optimization/splitChunks.md',
            '/webpack4/configuration/optimization/runtimeChunk.md',
            '/webpack4/configuration/optimization/removeAvailableModules.md',
            '/webpack4/configuration/optimization/removeEmptyChunks.md',
            '/webpack4/configuration/optimization/mergeDuplicateChunks.md',
            '/webpack4/configuration/optimization/flagIncludedChunks.md',
            '/webpack4/configuration/optimization/noEmitOnErrors.md',
            '/webpack4/configuration/optimization/nodeEnv.md',
            '/webpack4/configuration/optimization/namedModules&moduleIds&occurrenceOrder&hashedModuleIds.md',
            '/webpack4/configuration/optimization/namedChunks&chunkIds&occurrenceOrder.md',
            
          ],
        },
        {
          text: 'infrastructureLogging',
          children: [
            '/webpack4/configuration/infrastructureLogging.md'
          ],
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
        ],
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
        ],
      }
    ],
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