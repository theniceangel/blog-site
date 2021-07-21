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
          text: 'optimization',
          children: [
            '/webpack4/optimization/splitChunks.md',
            '/webpack4/optimization/runtimeChunk.md',
            '/webpack4/optimization/removeAvailableModules.md',
            '/webpack4/optimization/removeEmptyChunks.md',
            '/webpack4/optimization/mergeDuplicateChunks.md',
            '/webpack4/optimization/noEmitOnErrors.md',
            '/webpack4/optimization/nodeEnv.md',
            '/webpack4/optimization/namedModules&moduleIds&occurrenceOrder&hashedModuleIds.md',
            '/webpack4/optimization/namedChunks&chunkIds&occurrenceOrder.md',
            
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
            text: 'v4',
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
        theme: 'dark-plus'
      }
    ]
  ]
}