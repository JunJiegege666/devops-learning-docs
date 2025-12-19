import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "DevOps Learning Notes",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      // 建议：路径通常用小写，尽量不要有空格
      { text: 'docs', link: '/phase1' } 
    ],

    sidebar: [
      {
        text: '实战指南',
        items: [
          { text: 'Linux 概览', link: '/linux' }, 
          { text: '第一阶段: Linux 基础', link: '/phase1' },
          { text: '第二阶段: Docker 容器', link: '/phase2' },
          { text: '第三阶段: CI/CD 自动化', link: '/phase3' }
        ]
      }
    ],

    socialLinks: [
      // 建议：换成你自己的仓库地址
      { icon: 'github', link: 'https://github.com/JunJiegege666/devops-learning' }
    ]
  }
})