# DevOps 第三阶段实战指南：Git 版本控制与 CI/CD 自动化部署

## 1. 架构逻辑

- **本地 (Local):** 负责写代码、写配置 (VS Code)。
- **云端 (GitHub):** 负责代码托管、触发自动化任务 (Actions)。
- **服务器 (Server):** 负责运行服务 (Docker)，被动接收更新指令。

---

## 2. 前置准备

### 2.1 本地电脑 (Windows)

1. 安装 [Git for Windows](https://git-scm.com/)。
2. 配置用户信息：

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

```

3. 克隆远程仓库：

```bash
git clone https://github.com/你的用户名/devops-learning.git
cd devops-learning
code .  # 用 VS Code 打开

```

### 2.2 服务器端 (CentOS)

我们需要为 GitHub 机器人生成一把专用的“进门钥匙”。

1. **生成密钥对 (在服务器终端执行):**

```bash
# 生成专用密钥 github_actions，无密码
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_actions -N ""

```

2. **配置权限 (至关重要):**

```bash
# 将公钥放入白名单
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# 修复文件权限 (Linux 严格安全要求)
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

```

3. **获取私钥内容:**

```bash
cat ~/.ssh/github_actions

```

_复制输出的所有内容（包括 `BEGIN` 和 `END` 行）。_ 4. **确认 SSH 端口:**

```bash
sudo netstat -tulpn | grep sshd

```

_记录监听端口，例如本例中的 `20000`。_

---

## 3. GitHub 配置 (Secrets)

为了让机器人能安全登录服务器，需要将敏感信息存入 GitHub Secrets。

**路径：** 仓库页面 -> Settings -> Secrets and variables -> Actions -> New repository secret

需添加以下三个变量：

| Secret Name       | Value (示例)        | 说明                              |
| ----------------- | ------------------- | --------------------------------- |
| `SERVER_HOST`     | `107.149.208.95`    | 服务器公网 IP                     |
| `SERVER_USER`     | `devops_user`       | 登录用户名 (非 root)              |
| `SSH_PRIVATE_KEY` | `-----BEGIN RSA...` | 刚才在服务器 `cat` 出来的私钥内容 |

---

## 4. 编写自动化脚本 (Workflow)

在本地项目根目录下创建文件：`.github/workflows/deploy.yml`

```yaml
name: Auto Deploy

# 触发条件：监听 main 分支的 push 动作
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # 步骤 1: 检出代码
      - name: Checkout code
        uses: actions/checkout@v3

      # 步骤 2: 远程连接服务器并执行命令
      - name: SSH Remote Commands
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          # ⚠️ 关键点：这里必须填写真实的 SSH 端口 (本例为 20000)
          port: 20000
          script: |
            echo "🚀 开始自动部署..."

            # 1. 进入项目目录
            cd /home/devops_user/webapp

            # 2. 强制同步代码 (丢弃本地修改，以 GitHub 为准)
            git fetch --all
            git reset --hard origin/main

            # 3. Docker 重新构建并启动
            # -d: 后台运行
            # --build: 强制构建新镜像
            docker compose up -d --build

            # 4. 清理悬空的旧镜像 (节省磁盘空间)
            docker image prune -f

            echo "✅ 部署完成！"
```

---

## 5. 日常开发工作流

配置完成后，你的日常工作将变得非常简单：

1. **Modify:** 在 VS Code 里修改 `server.py` 或配置文件。
2. **Commit:** 在终端执行提交。

```bash
git add .
git commit -m "Update feature X"

```

3. **Push:** 推送到云端。

```bash
git push

```

4. **Verify:**

- 去 GitHub **Actions** 页面查看任务状态（变绿即成功）。
- 访问网站验证更新效果。

---

## 6. 常见故障排查 (Troubleshooting)

### Q1: GitHub Actions 报错 `dial tcp ... connection refused`

- **原因:** 机器人连接 SSH 端口被拒绝。
- **解决:** 检查 `deploy.yml` 里的 `port` 是否与服务器真实 SSH 端口（`netstat -tulpn | grep sshd`）一致。本例中需显式设置为 `20000`。

### Q2: GitHub Actions 报错 `Permission denied (publickey)`

- **原因:** 密钥没对上，或者服务器权限设置太松/太严。
- **解决:**

1. 确保服务器 `.ssh` 目录权限为 `700`，`authorized_keys` 为 `600`。
2. 确保 GitHub Secrets 里的私钥复制完整（没有漏掉首尾行）。

### Q3: 部署后代码没变

- **原因:** Docker 使用了旧缓存。
- **解决:** 确保脚本中包含了 `docker compose up -d --build` (那个 `--build` 参数非常重要)。
