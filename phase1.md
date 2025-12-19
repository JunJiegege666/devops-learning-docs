# DevOps 第一阶段实战指南：Linux 基础、服务部署与自动化

本文档涵盖了从用户权限管理、Systemd 服务配置、Nginx 反向代理到 Shell 脚本自动化监控的全流程。

---

## 1. 用户与安全管理

### 1.1 创建新用户

避免使用 root 直接操作，遵循最小权限原则。

```bash
# 添加用户 (会自动创建家目录)
adduser devops_user

```

### 1.2 赋予 sudo 权限

```bash
# 将用户加入 sudo (Ubuntu) 或 wheel (CentOS) 组
usermod -aG sudo devops_user

```

> **⚠️ 参数详解：**
>
> - `-a`: Append（追加）。**这非常重要！** 如果不加 `-a` 只加 `-G`，会覆盖掉用户原有的组，导致用户丢失其他权限。
> - `-G`: Groups（指定组名）。

### 1.3 验证与切换

```bash
# 切换到新用户 (注意中间的减号，代表切换环境变量)
su - devops_user

# 测试权限 (需要输入 devops_user 的密码)
sudo cat /etc/shadow

```

### 1.4 SSH 安全加固 (禁止 Root 远程登录)

```bash
# 编辑 SSH 配置文件
sudo vim /etc/ssh/sshd_config
# (提示：如果不会用 vim，可以用 nano编辑器：sudo nano /etc/ssh/sshd_config)

```

**修改内容：**
找到 `PermitRootLogin` 这一项。

- 改前：`PermitRootLogin yes`
- 改后：`PermitRootLogin no`

**重启生效：**

```bash
sudo systemctl restart sshd

```

---

## 2. 后端服务部署 (Systemd)

将 Python 脚本注册为系统服务，实现开机自启和崩溃重启。

### 2.1 编写服务文件

```bash
sudo vim /etc/systemd/system/my-python-app.service

```

### 2.2 配置文件内容

```ini
[Unit]
# 服务的描述
Description=My Simple Python Backend Service
# 依赖顺序：网络准备好之后再启动我
After=network.target

[Service]
# ⚠️ 重要：以哪个用户身份运行？(千万别用 root 跑业务代码)
User=devops_user
Group=devops_user

# 工作目录（代码里的相对路径会基于这里）
WorkingDirectory=/home/devops_user/webapp

# 启动命令 (必须用绝对路径，用 `which python3` 可以查看路径)
ExecStart=/usr/bin/python3 /home/devops_user/webapp/server.py

# 守护进程策略：如果挂了，总是自动重启
Restart=always
RestartSec=5

[Install]
# 也就是“开机自启”需要挂载的目标
WantedBy=multi-user.target

```

### 2.3 启动与管理

```bash
# 1. 重载 Systemd 配置 (每次修改 .service 文件后必须执行)
sudo systemctl daemon-reload

# 2. 启动服务
sudo systemctl start my-python-app

# 3. 设置开机自启
sudo systemctl enable my-python-app

# 4. 查看运行状态
sudo systemctl status my-python-app

```

---

## 3. Nginx 反向代理配置

隐藏后端端口（8080），只暴露标准 HTTP 端口（80）。

### 3.1 编辑配置

```bash
sudo vim /etc/nginx/nginx.conf
# 注意：如果是宝塔环境，建议在 /www/server/panel/vhost/nginx/ 下新建 .conf 文件

```

### 3.2 配置内容 (Server 块)

```nginx
server {
    listen       80;
    server_name  _;  # _ 代表匹配所有域名/IP
    root         /usr/share/nginx/html;

    # --- 反向代理核心配置 ---
    location / {
        # 把请求转发给本地的 Python 服务
        proxy_pass http://127.0.0.1:8080;

        # (选填) 带上一些头信息，让 Python 知道真实的客户端 IP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    # ----------------------
}

```

### 3.3 验证与重启

```bash
# 检查语法有没有写错
sudo nginx -t

# 如果显示 successful，就重启
sudo systemctl restart nginx
# (宝塔环境建议使用: sudo nginx -s reload)

```

---

## 4. 运维排查常用命令

### 4.1 端口与进程检查

```bash
# 查看占用端口的进程
# 参数说明：-t (tcp), -u (udp), -l (listening), -p (pid/name), -n (numeric)
sudo netstat -tulpn | grep :80

```

### 4.2 强制结束进程

```bash
# 强制杀掉所有 python3 进程 (慎用)
sudo killall -9 python3

```

---

## 5. 自动化监控与自愈 (Shell + Crontab)

实现功能：每分钟检查 Nginx 是否存活，如果挂了自动重启并记录日志。

### 5.1 编写监控脚本

```bash
vim /home/devops_user/monitor_nginx.sh

```

**脚本内容：**

```bash
#!/bin/bash
LOG_FILE="/home/devops_user/nginx_monitor.log"

# 【检测逻辑】
# 使用 grep nginx 查找进程名，避免 grep :80 误伤 8080 端口
# wc -l 统计行数，如果等于 0 说明没有 nginx 进程在运行
if [ $(netstat -tulpn | grep nginx | wc -l) -eq 0 ]; then

    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⚠️ 警报：Nginx 进程消失，正在重启..." >> $LOG_FILE

    # 启动命令 (适配宝塔或源码安装环境)
    /etc/init.d/nginx start

    sleep 3

    # 再次检查
    if [ $(netstat -tulpn | grep nginx | wc -l) -gt 0 ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Nginx 自动修复成功！" >> $LOG_FILE
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ 修复失败，请速来排查！" >> $LOG_FILE
    fi

else
    # 正常运行，不记录日志
    :
fi

```

### 5.2 赋予执行权限

```bash
# 必须有 x 权限脚本才能运行
chmod +x /home/devops_user/monitor_nginx.sh

```

### 5.3 配置定时任务 (Root 用户)

因为重启 Nginx 需要管理员权限，必须配置在 root 的 crontab 中。

```bash
sudo crontab -e

```

**添加规则：**

```cron
# 每分钟执行一次监控脚本
* * * * * /home/devops_user/monitor_nginx.sh

```

> **💡 Crontab 格式说明：**
> 五个星号 `* * * * *` 分别代表：`分` `时` `日` `月` `周`。
> 五个都是 `*` 即表示“每分钟”。
