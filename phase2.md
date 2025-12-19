# DevOps 第二阶段实战指南：Docker 容器化与编排

本文档记录了从零安装 Docker、编写 Dockerfile 打包应用，到使用 Docker Compose 进行服务编排的全过程。

---

## 1. 环境准备 (CentOS 7)

### 1.1 安装 Docker Engine

由于 CentOS 7 自带的源较老，需要配置阿里云镜像源以获取最新稳定版。

```bash
# 1. 卸载旧版本 (清理环境)
sudo yum remove docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine

# 2. 安装必要工具
sudo yum install -y yum-utils

# 3. 设置 Docker 仓库 (使用阿里云源)
sudo yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

# 4. 安装 Docker 核心组件
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 5. 启动并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

```

### 1.2 权限配置 (非 Root 运行)

为了安全和方便，允许普通用户执行 Docker 命令。

```bash
# 将当前用户加入 docker 组
sudo usermod -aG docker $USER

# 刷新组权限 (无需重启，立即生效)
newgrp docker

# 验证安装
docker version
docker run hello-world

```

---

## 2. 应用容器化 (Dockerfile)

### 2.1 停用旧服务

为了避免端口冲突 (8080)，先停止第一阶段手动部署的 Systemd 服务。

```bash
sudo systemctl stop my-python-app
sudo systemctl disable my-python-app

```

### 2.2 编写 Dockerfile

在项目根目录 (`/home/devops_user/webapp`) 创建描述文件。

**文件名：** `Dockerfile` (首字母大写，无后缀)

```dockerfile
# 1. 基础镜像：基于轻量级 Python 3.9
FROM python:3.9-slim

# 2. 工作目录：容器内部的 "cd /app"
WORKDIR /app

# 3. 复制文件：把宿主机的代码拷进容器
COPY server.py .

# 4. 启动命令：容器启动时执行
CMD ["python", "server.py"]

```

### 2.3 手动构建与运行 (基础模式)

```bash
# 1. 构建镜像 (注意最后的点 . 代表当前目录)
docker build -t my-python-app:v1 .

# 2. 启动容器
# -d: 后台运行
# -p 8080:8080: 端口映射 (宿主机端口:容器端口)
docker run -d -p 8080:8080 --name my-running-app my-python-app:v1

# 3. 验证
docker ps
curl 127.0.0.1:8080

```

---

## 3. 服务编排 (Docker Compose)

使用 YAML 文件管理服务，替代复杂的命令行参数。这是 DevOps 的标准姿势 (IaC)。

### 3.1 安装 Docker Compose 插件

```bash
sudo yum install docker-compose-plugin -y
# 验证版本
docker compose version

```

### 3.2 编写编排文件

**文件名：** `docker-compose.yml`

> **⚠️ 警告：YAML 格式对缩进非常敏感！**
>
> - `webapp:` 必须缩进 2 空格
> - `build:` 必须缩进 4 空格
> - 严禁使用 Tab 键，必须用空格。

```yaml
version: "3.8"

services:
  webapp:
    # 自动在当前目录寻找 Dockerfile 构建
    build: .
    # 容器名称
    container_name: my-running-app
    # 端口映射 "宿主机:容器"
    ports:
      - "8080:8080"
    # 自动重启策略 (相当于 Systemd 的 Restart=always)
    restart: always
```

### 3.3 常用管理命令 (SRE 必备)

| 场景              | 命令                           | 说明                                           |
| ----------------- | ------------------------------ | ---------------------------------------------- |
| **一键启动/更新** | `docker compose up -d --build` | 自动构建镜像并后台启动，如果代码变了会自动更新 |
| **查看状态**      | `docker compose ps`            | 查看服务运行状态和端口映射                     |
| **查看日志**      | `docker compose logs -f`       | 实时追踪日志 (按 Ctrl+C 退出)                  |
| **资源监控**      | `docker stats`                 | 实时查看 CPU/内存占用                          |
| **停止并清理**    | `docker compose down`          | 停止容器并删除实例 (镜像保留)                  |
| **检查配置**      | `docker compose config`        | 检查 YAML 文件语法是否正确                     |

---

## 4. 架构说明

完成此阶段后，你的服务器架构变为：

```text
用户 (Browser)
   │
   ▼
Nginx (Port 80)  <--- 宿主机反向代理 (配置无需修改)
   │
   │ (转发到 127.0.0.1:8080)
   ▼
Docker 端口映射 (Port 8080)
   │
   │ (穿透隔离墙)
   ▼
[ 容器: my-running-app ]
   │
   └─ Python Process (Port 8080)

```

**核心优势：**

- **解耦：** Nginx 不知道后端跑在容器里。
- **可移植：** 有了 `docker-compose.yml`，在任何服务器上一键启动。

# DevOps 第二阶段实战指南 (进阶)：可视化与微服务

本文档记录了如何在 Docker 环境中引入可视化管理工具 (Portainer)，并将单体应用升级为连接 Redis 数据库的微服务架构。

---

## 1. 部署 Portainer (可视化管理)

为了摆脱纯命令行管理的枯燥，我们部署 Portainer 来图形化管理容器。

### 1.1 修改 Docker Compose

编辑 `docker-compose.yml`，在 `services` 列表中增加 `portainer` 服务。

```yaml
portainer:
  image: portainer/portainer-ce:latest
  container_name: portainer
  restart: always
  ports:
    - "9000:9000" # Web 访问端口
  volumes:
    # 核心配置：将宿主机的 Docker 守护进程 Socket 挂载给容器
    # 这样 Portainer 才有权限管理宿主机的其他容器
    - /var/run/docker.sock:/var/run/docker.sock
    # 数据持久化
    - portainer_data:/data
```

### 1.2 注册数据卷

在文件最末尾（顶格写）注册 Volume：

```yaml
volumes:
  portainer_data:
```

### 1.3 放行防火墙

Portainer 使用 9000 端口，需在宿主机放行。

```bash
# CentOS 7 Firewalld
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload

```

### 1.4 访问与设置

- 地址：`http://服务器IP:9000`
- 初始化：设置管理员密码 -> 选择 **Get Started** (Local Environment)。

---

## 2. 微服务架构改造 (Python + Redis)

将 Python 应用改造为访问计数器，数据存储在独立的 Redis 容器中。

### 2.1 修改应用代码 (server.py)

Python 通过主机名 `redis` 连接数据库，而不是 IP 地址。

**文件路径：** `/home/devops_user/webapp/server.py`

```python
from http.server import BaseHTTPRequestHandler, HTTPServer
import redis
import socket

# 连接 Redis
# ⚠️ 关键点：host 写 docker-compose 中的服务名 'redis'
# Docker 内部 DNS 会自动把 'redis' 解析成对应容器的 IP
r = redis.Redis(host='redis', port=6379, db=0)

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # 计数器 +1
            count = r.incr('hits')
            hostname = socket.gethostname()

            message = f"Hello from Docker! I have been seen {count} times.\n(Processed by Container: {hostname})"

            self.send_response(200)
            self.send_header('Content-type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(message.encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Redis Error: {str(e)}".encode('utf-8'))

server = HTTPServer(('0.0.0.0', 8080), SimpleHandler)
print("Python Redis App is running...")
server.serve_forever()

```

### 2.2 修改构建文件 (Dockerfile)

增加 `redis` 客户端库依赖。

**文件路径：** `/home/devops_user/webapp/Dockerfile`

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# --- 新增依赖安装 ---
# 使用清华源加速下载
RUN pip install redis -i https://pypi.tuna.tsinghua.edu.cn/simple
# ------------------

COPY server.py .

CMD ["python", "server.py"]

```

### 2.3 最终版编排文件 (docker-compose.yml)

将 Python、Redis 和 Portainer 编排在一起。

**文件路径：** `/home/devops_user/webapp/docker-compose.yml`

```yaml
version: "3.8"

services:
  # 1. Python 应用服务
  webapp:
    build: .
    container_name: my-running-app
    ports:
      - "8080:8080"
    restart: always
    # 依赖声明：确保 Redis 启动后再启动 Python
    depends_on:
      - redis

  # 2. Redis 数据库服务
  redis:
    image: redis:alpine # 使用轻量级 Alpine 版本
    container_name: my-redis
    restart: always
    # 注意：无需映射端口 (ports)，因为只供内部 webapp 访问，不对外暴露

  # 3. Portainer 管理面板
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

# 全局数据卷定义
volumes:
  portainer_data:
```

---

## 3. 部署与验证

### 3.1 一键更新环境

因为修改了代码和 Dockerfile，必须使用 `--build` 参数强制重构镜像。

```bash
cd /home/devops_user/webapp
docker compose up -d --build

```

### 3.2 验证微服务通信

- **浏览器访问：** `http://服务器IP`
- **现象：** 页面显示 `I have been seen X times`。
- **测试：** 连续刷新页面，数字应自动增加。
- **持久性测试：** 重启 webapp 容器 (`docker compose restart webapp`)，数字不会清零（因为数据在 Redis 容器里）。

---

## 4. 核心知识点回顾

1. **环境隔离：** 宿主机不需要安装 Redis，也不需要 Python 环境，所有依赖都在容器内。
2. **服务发现 (Service Discovery)：** 在 Docker Compose 网络中，服务之间可以通过**服务名**（如 `redis`）直接互相访问，无需关心 IP 变化。
3. **声明式架构 (IaC)：** 所有的环境配置、依赖关系、网络结构都记录在 `docker-compose.yml` 中，实现了“代码即基础设施”。
