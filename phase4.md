# DevOps 实战指南：VitePress 文档站自动化部署

本文档详细记录了如何从零搭建一个基于 VitePress 的技术文档网站，并实现 **"本地写作 -> Git 推送 -> 自动构建 -> 服务器更新"** 的全自动化流程。

---

## 1. 架构设计

为了实现高效开发与部署，我们采用了 **“构建与运行分离”** 的架构：

- **本地开发 (Local):** 使用 VS Code 编写 Markdown 文档。
- **构建工厂 (GitHub Actions):** 云端安装 Node.js 环境，将 Markdown 编译为静态 HTML/CSS/JS 文件。
- **运行环境 (Server):** 使用 Docker 运行轻量级 Nginx，只负责静态文件托管 (Port 8081)。
- **传输方式 (SCP):** 编译产物通过 SSH 安全传输到服务器挂载目录。

---

## 2. 本地项目初始化

我们将文档项目独立为一个新的 Git 仓库，保持结构清晰。

### 2.1 创建 VitePress 项目

在本地计算机执行：

```bash
# 1. 创建项目目录
mkdir devops-learning-docs
cd devops-learning-docs

# 2. 初始化 (一路回车默认即可)
npx vitepress init

# 3. 安装依赖
npm install

```

### 2.2 配置 Git 忽略文件

创建 `.gitignore` 文件，防止上传垃圾文件：

```text
node_modules
.DS_Store
dist
.vitepress/dist
.vitepress/cache

```

### 2.3 编写 Nginx 编排文件

在项目根目录创建 `docker-compose.yml`，用于定义服务器上的运行环境。

```yaml
version: "3.8"

services:
  docs-nginx:
    image: nginx:alpine
    container_name: my-docs-site
    restart: always
    # 端口映射：外部 8081 -> 容器内部 80
    # 避免与宿主机的 80 或 8080 端口冲突
    ports:
      - "8081:80"
    volumes:
      # 将服务器上的 html 目录挂载到容器内
      - ./html:/usr/share/nginx/html
```

---

## 3. 服务器端环境准备

登录 CentOS 服务器，拉取代码并启动 Nginx 容器。

### 3.1 克隆仓库与启动

```bash
cd /home/devops_user

# 1. 克隆仓库
git clone https://github.com/你的用户名/devops-learning-docs.git

# 2. 进入目录
cd devops-learning-docs

# 3. 创建挂载目录 (存放网页文件)
mkdir html

# 4. 启动 Nginx (此时访问是 403 Forbidden，因为 html 目录是空的)
docker compose up -d

```

### 3.2 验证端口

```bash
docker compose ps
# 确认端口监听状态：0.0.0.0:8081->80/tcp

```

---

## 4. 自动化部署配置 (CI/CD)

### 4.1 配置 GitHub Secrets

在 GitHub 仓库 -> **Settings** -> **Secrets and variables** -> **Actions** 中添加：

- `SERVER_HOST`: 服务器 IP 地址
- `SERVER_USER`: `devops_user`
- `SSH_PRIVATE_KEY`: 服务器私钥内容 (`cat ~/.ssh/github_actions`)

### 4.2 编写 Workflow 脚本

在本地创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy Docs

# 触发条件：监听 main 分支的推送
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # 1. 拉取代码
      - name: Checkout code
        uses: actions/checkout@v3

      # 2. 准备 Node.js 环境
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20

      # 3. 编译构建 (生成静态文件)
      - name: Build Docs
        run: |
          npm install
          npm run docs:build
          # 编译后的文件位于 .vitepress/dist

      # 4. 部署到服务器 (SCP 文件传输)
      - name: Copy files to Server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          # ⚠️ 注意：填写服务器真实的 SSH 端口 (如 20000)
          port: 20000
          # 源文件：编译后的 dist 目录
          source: ".vitepress/dist/*"
          # 目标路径：服务器上的挂载目录
          target: "/home/devops_user/devops-learning-docs/html"
          # 移除路径前缀 (只拷贝 dist 内部的文件)
          strip_components: 2
```

---

## 5. 日常维护流程

完成上述配置后，您的文档维护工作流如下：

1. **写文档：** 在本地 VS Code 中修改 `index.md` 或添加新的 `.md` 文件。
2. **本地预览 (可选)：** `npm run docs:dev` 在本地查看效果。
3. **提交推送：**

```bash
git add .
git commit -m "Update docs"
git push

```

4. **自动上线：** 等待 GitHub Actions 变绿，访问 `http://服务器IP:8081` 即可看到最新内容。

---

## 6. 常见问题排查

- **访问 403 Forbidden:**
- 原因：`html` 目录是空的，GitHub Actions 还没跑完，或者路径配置错误。
- 解决：检查 Actions 日志，确认 `Copy files to Server` 步骤的目标路径 (`target`) 是否正确。

- **Actions 报错 `connect connection refused`:**
- 原因：SSH 端口填错了。
- 解决：检查 `deploy.yml` 中的 `port` 是否与 `sudo netstat -tulpn | grep sshd` 查到的一致。

- **Actions 报错 `Permission denied`:**
- 原因：服务器上的 `html` 目录权限不足，GitHub 机器人写不进去。
- 解决：在服务器执行 `chmod -R 777 /home/devops_user/devops-learning-docs/html`。
