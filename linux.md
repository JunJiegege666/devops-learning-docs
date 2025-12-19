# Linux 常用命令速查 (Cheat Sheet)

本文档汇总了日常运维和开发中最常用的 Linux 命令，涵盖文件操作、系统监控、网络管理等领域。

## 1. 文件与目录操作

| 命令    | 说明                   | 示例                                                      |
| ------- | ---------------------- | --------------------------------------------------------- |
| `ls`    | 列出目录内容           | `ls -ll` (详细列表), `ls -a` (显示隐藏文件)               |
| `cd`    | 切换目录               | `cd /home` (去指定目录), `cd ..` (返回上一级)             |
| `pwd`   | 显示当前工作目录       | `pwd`                                                     |
| `mkdir` | 创建目录               | `mkdir code` (创建单个), `mkdir -p a/b/c` (递归创建)      |
| `rm`    | 删除文件或目录         | `rm file.txt` (删文件), `rm -rf dir/` (强制递归删目录)    |
| `cp`    | 复制                   | `cp file1 file2` (复制文件), `cp -r dir1 dir2` (复制目录) |
| `mv`    | 移动或重命名           | `mv old.txt new.txt` (重命名), `mv file dir/` (移动)      |
| `touch` | 创建空文件或更新时间戳 | `touch index.html`                                        |
| `find`  | 查找文件               | `find / -name "*.log"` (全盘查找 log 文件)                |

## 2. 文件查看与编辑

| 命令           | 说明                        | 示例                                         |
| -------------- | --------------------------- | -------------------------------------------- |
| `cat`          | 查看文件全部内容            | `cat config.json`                            |
| `tail`         | 查看文件尾部 (常用于看日志) | `tail -f app.log` (实时追踪日志变化)         |
| `less`         | 分页查看大文件              | `less large.log` (按 q 退出)                 |
| `grep`         | 文本搜索/过滤               | `grep "error" app.log` (查找包含 error 的行) |
| `vim` / `nano` | 文本编辑器                  | `vim server.py`                              |

## 3. 用户与权限管理

| 命令      | 说明             | 示例                                                  |
| --------- | ---------------- | ----------------------------------------------------- |
| `sudo`    | 以管理员身份执行 | `sudo apt update`                                     |
| `chmod`   | 修改文件权限     | `chmod +x script.sh` (添加执行权限), `chmod 777 file` |
| `chown`   | 修改文件所有者   | `chown user:group file`                               |
| `useradd` | 添加新用户       | `useradd -m username`                                 |
| `passwd`  | 修改密码         | `passwd username`                                     |
| `su`      | 切换用户         | `su - username`                                       |

## 4. 系统管理 & 进程监控

| 命令           | 说明                   | 示例                                  |
| -------------- | ---------------------- | ------------------------------------- |
| `top` / `htop` | 实时查看系统资源与进程 | `top` (按 q 退出)                     |
| `ps`           | 查看静态进程快照       | `ps aux                               |
| `kill`         | 终止进程               | `kill 1234` (杀掉 PID 为 1234 的进程) |
| `killall`      | 根据名称终止进程       | `killall nginx`                       |
| `systemctl`    | 管理后台服务           | `systemctl restart docker`            |
| `df`           | 查看磁盘空间           | `df -h` (以易读格式显示)              |
| `free`         | 查看内存使用           | `free -h`                             |
| `history`      | 查看历史命令           | `history                              |

## 5. 网络操作

| 命令      | 说明             | 示例                               |
| --------- | ---------------- | ---------------------------------- |
| `ip addr` | 查看 IP 地址     | `ip a`                             |
| `ping`    | 测试网络连通性   | `ping google.com`                  |
| `curl`    | 发送 HTTP 请求   | `curl -I baidu.com` (查看响应头)   |
| `netstat` | 查看网络端口占用 | `netstat -tulpn                    |
| `ssh`     | 远程登录         | `ssh user@192.168.1.1`             |
| `scp`     | 远程文件传输     | `scp local_file user@server:/path` |

## 6. 压缩与解压

| 命令              | 说明             | 示例                                  |
| ----------------- | ---------------- | ------------------------------------- |
| `tar` (打包/解压) | Linux 最常用格式 | **解压:** `tar -zxvf data.tar.gz`<br> |

<br>**压缩:** `tar -czvf data.tar.gz folder/` |
| `zip` / `unzip` | Windows 常用格式 | `unzip file.zip` |

---

> **💡 小技巧：**
>
> - **Tab 键：** 自动补全文件名或命令，按两下显示所有匹配项。
> - **Ctrl + C：** 强制停止当前正在运行的命令。
> - **Ctrl + L：** 清屏 (相当于 `clear` 命令)。
