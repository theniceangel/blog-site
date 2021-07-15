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
    sidebar: {
      '/webpack4/': [
        {
          text: 'optimization',
          children: ['/webpack4/optimization/splitChunks.md', '/webpack4/optimization/runtimeChunk.md'],
        },
      ]
    },
    navbar: [
      {
        text: 'Vue 资源合集',
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
        text: 'webpack 资源合集',
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
}