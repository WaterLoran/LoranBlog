以下是一个支持 **SSH协议**、**HTTP协议**、以及**多端口转发**的完整 FRPS (FRP 服务端) 配置教程。

---

### 1. 准备工作
- **一台公网服务器**：
  - 公网 IP，开放端口。
  - 用于部署 FRPS 服务端。
- **内网设备**：
  - 部署 FRPC（FRP 客户端）。
  - 提供 SSH、HTTP 等服务。

---

### 2. 安装 FRP 服务端 (FRPS)
#### （1）下载和解压
1. 从 [FRP Releases](https://github.com/fatedier/frp/releases) 下载适合的版本。
2. 将文件上传到你的公网服务器，并解压，例如解压到 `/opt/frp/`：
   ```bash
   tar -xzf frp_0.61.0_linux_amd64.tar.gz -C /root/
   cd /root/frp_0.61.0_linux_amd64
   ```

#### （2）创建 `frps.ini` 配置文件
创建或修改 `frps.ini`，添加以下内容：

```ini
[common]
bind_port = 7000                  # 服务端监听端口（客户端连接用）
token = your_token_here           # 密钥（需与客户端一致）
dashboard_port = 7500             # FRPS 管理面板端口
dashboard_user = admin            # 管理面板用户名
dashboard_pwd = admin             # 管理面板密码
allow_ports = 8022 # 允许转发的端口范围

# 如果需要启用 TLS（可选，增强安全性）
# tls_enable = true
```

#### （3）启动 FRPS
使用以下命令启动 FRP 服务端：
```bash
./frps -c ./frps.ini
```
后台运行：
```bash
nohup ./frps -c ./frps.ini > frps.log 2>&1 &
```

---

### 3. 安装 FRP 客户端 (FRPC)
#### （1）下载和解压
与服务端相同，下载并解压到内网设备上。

#### （2）创建 `frpc.ini` 配置文件
创建或修改 `frpc.ini`，内容如下：

```ini
[common]
server_addr = 公网服务器IP       # 公网服务器 IP
server_port = 7000               # FRP 服务端监听端口
token = your_token_here          # 密钥（与服务端一致）

# 转发 SSH 服务
[ssh]
type = tcp
local_ip = 127.0.0.1
local_port = 22                  # 本地 SSH 端口
remote_port = 6000               # 公网服务器暴露的端口

# 转发 HTTP 服务
[http]
type = http
local_ip = 127.0.0.1
local_port = 8080                # 本地 HTTP 服务端口
custom_domains = yourdomain.com  # 使用的域名

# 转发额外的端口（示例：3000 和 3306）
[app_tcp]
type = tcp
local_ip = 127.0.0.1
local_port = 3000                # 本地服务端口
remote_port = 3001               # 公网服务器暴露的端口

[db]
type = tcp
local_ip = 127.0.0.1
local_port = 3306                # 本地 MySQL 服务端口
remote_port = 3307               # 公网服务器暴露的端口
```

#### （3）启动 FRPC
启动客户端：
```bash
./frpc -c ./frpc.ini
```
后台运行：
```bash
nohup ./frpc -c ./frpc.ini > frpc.log 2>&1 &
```

---

### 4. 测试服务
#### （1）SSH 连接测试
在公网服务器上，尝试通过 FRP 转发的端口访问内网设备：
```bash
ssh -p 6000 用户名@公网服务器IP
```

#### （2）HTTP 服务测试
确保内网设备的 HTTP 服务已启动，然后通过浏览器访问：
```
http://yourdomain.com
```

#### （3）其他服务测试
- **TCP 服务**：例如，测试 MySQL 连接：
  
  ```bash
  mysql -h 公网服务器IP -P 3307 -u 用户名 -p
  ```

---

### 5. 高级配置
#### （1）多客户端支持
服务端允许多个客户端连接，只需在不同的客户端配置文件中使用相同的 `token`，并确保端口不冲突。

#### （2）启用 TLS 加密
在服务端和客户端都启用 `tls_enable = true`，增强安全性：
- 服务端 `frps.ini`：
  ```ini
  tls_enable = true
  ```
- 客户端 `frpc.ini`：
  ```ini
  tls_enable = true
  ```

#### （3）设置服务自启动
##### Linux（以服务端为例）：
创建 Systemd 服务文件 `/etc/systemd/system/frps.service`：
```ini
[Unit]
Description=FRP Server
After=network.target

[Service]
ExecStart=/opt/frp/frps -c /opt/frp/frps.ini
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```
启动并设置开机自启：
```bash
systemctl start frps
systemctl enable frps
```

##### Windows：
在 Windows 下，可将 FRPS 或 FRPC 添加到任务计划程序中自动启动。

---

### 6. 常见问题
1. **端口占用问题**：检查端口是否被其他应用占用，修改配置或释放端口。
   ```bash
   netstat -tuln | grep PORT_NUMBER
   ```

2. **连接失败问题**：
   - 检查服务端和客户端的 `token` 是否一致。
   - 确保服务端和客户端的防火墙规则允许相应的端口。

3. **HTTP 服务域名问题**：
   - 确保你的域名解析正确指向公网服务器 IP。
   - 如果使用 Nginx 等反代工具，请检查其配置。

---

以上配置完成后，你可以使用 FRP 转发 **SSH**、**HTTP** 服务以及多个自定义端口，轻松实现内网穿透。