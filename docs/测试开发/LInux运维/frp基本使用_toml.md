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

#### （2）创建 `frps.toml` 配置文件
创建或修改 `frps..toml`，添加以下内容：

```toml
bindPort = 7000

# 开启后端监控
enablePrometheus = true
webServer.port = 7500
webServer.user = "admin"
webServer.password = "admin"

# token
auth.token = "your_token_here"

# 多路复用
#transport.tcpMux = true

vhostHTTPPort = 880


```

#### （3）启动 FRPS
使用以下命令启动 FRP 服务端：
```bash
./frps -c ./frps.toml
```
后台运行：
```bash
nohup ./frps -c ./frps.toml > frps.log 2>&1 &
```

---

### 3. 安装 FRP 客户端 (FRPC)
#### （1）下载和解压
与服务端相同，下载并解压到内网设备上。

#### （2）创建 `frpc.toml` 配置文件
创建或修改 `frpc.toml`，内容如下：

```toml
serverAddr = "1.2.3.4"
# token
auth.token = "your_token_here"
# 多路复用
#transport.tcpMux = true


[[proxies]]
name = "xx-web"
type = "http"
localIP = "127.0.0.1"
localPort = 80
customDomains = ["xxxx.com"]

[[proxies]]
name = "another_port"
type = "tcp"
localIP = "127.0.0.1"
localPort = 80
remotePort = 12345

```

#### （3）启动 FRPC
启动客户端：
```bash
./frpc -c ./frpc.toml
```
后台运行：
```bash
nohup ./frpc -c ./frpc.toml > frpc.log 2>&1 &
```

---

### 4. 测试服务
#### （1）SSH 连接测试
在公网服务器上，尝试通过 FRP 转发的端口访问内网设备：
```bash
ssh -p 12345 用户名@公网服务器IP
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
- 服务端 `frps.toml`：
  ```ini
  tls_enable = true
  ```
- 客户端 `frpc.toml：
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

**7.局域网虚机的Nginx配置**

有时候需要通过局域网虚拟机, 并没有目标端口被绑定, 即netstat -tlunp 不能查看到端口, 这个时候, 需要部署并配置Nginx, 相关配置在 /etc/nginx/conf.d/xxx.conf

```toml
server {
    listen       8088;
    server_name  yourdomain.com;

    location / {
        proxy_pass http://192.168.88.1:33300;

        # 强制设置 Host
        proxy_set_header Host 192.168.88.1:33300;

        # 保留客户端真实 IP 信息
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 强制设置固定的 Referer
        proxy_set_header Referer "http://192.168.88.1:33300";

        # 移除跨域相关的头部配置，确保请求符合后端需求
    }
}

```



---

以上配置完成后，你可以使用 FRP 转发 **SSH**、**HTTP** 服务以及多个自定义端口，轻松实现内网穿透。


