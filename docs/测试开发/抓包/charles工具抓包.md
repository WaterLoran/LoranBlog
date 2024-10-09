Charles 是一款常用的 HTTP/HTTPS 抓包工具，常用于调试和分析 Web 流量。以下是使用 Charles 进行抓包的详细步骤和配置方法：

### 一、Charles 的基础配置

1. **安装与启动 Charles**
   - 在 [Charles 官网](https://www.charlesproxy.com/download/) 下载并安装 Charles，启动后会自动配置为系统 HTTP/HTTPS 代理。
2. **设置系统代理**
   - Charles 通常会自动配置为本机代理（例如 `127.0.0.1:8888`），确保在 `Proxy -> Proxy Settings` 中查看并确认代理端口（默认为 8888）。
3. **启动抓包**
   - 启动 Charles 后，默认会开始捕获本机浏览器和应用程序的 HTTP/HTTPS 流量。
   - 如果没有看到流量，可以手动在 `Proxy -> Start Recording` 中启动流量捕获。

### 二、捕获 HTTPS 流量

1. **启用 HTTPS 代理**
   - 在 Charles 中，前往 `Proxy -> SSL Proxying Settings`，点击 `Add`，添加目标主机（如 `*.*` 来捕获所有 HTTPS 流量）或指定域名（如 `www.example.com`）。
   - 勾选 `Enable SSL Proxying` 以启用 HTTPS 抓包。
2. **安装 Charles 证书**
   - 访问 `http://chls.pro/ssl`，根据操作系统和设备类型下载并安装 Charles 证书。
   - 在 macOS 中，安装后需要手动信任 Charles 根证书（在 `钥匙串访问` 中查找 `Charles Proxy CA`，双击后将其设为“始终信任”）。

### 三、移动设备抓包

1. **设置移动设备代理**
   - 确保 Charles 与移动设备连接到同一网络。
   - 在移动设备中（如 iOS 或 Android），进入 Wi-Fi 设置，选择当前 Wi-Fi 网络，配置 HTTP 代理为 Charles 所在主机的 IP 地址（如 `192.168.1.10`），端口设置为 `8888`。
2. **安装证书**
   - 在移动设备上访问 `http://chls.pro/ssl`，下载并安装 Charles 的根证书，并在系统中将其设为“受信任”。

### 四、过滤与调试功能

1. **设置过滤规则**
   - 使用 `View -> Include` 或 `View -> Exclude` 设置包含或排除的流量过滤规则（如只查看 `example.com` 域名的流量）。
2. **修改请求或响应**
   - 选中目标流量条目，右键选择 `Breakpoints`，再触发该流量时，Charles 会拦截并允许用户修改请求或响应内容。
3. **重放与编辑**
   - 选中一个请求，右键选择 `Repeat` 或 `Edit`，可以修改请求参数、头信息或内容，并重新发送请求。

### 五、常见问题排查

1. **未捕获 HTTPS 流量**
   - **原因**：未安装 Charles 证书或未启用 SSL Proxying。
   - **解决方法**：检查并重新配置 `SSL Proxying` 设置。
2. **移动设备无法连接到 Charles**
   - **原因**：设备代理配置错误，或 Charles 防火墙阻止了流量。
   - **解决方法**：确保代理 IP 和端口正确，且 Charles 所在机器没有防火墙限制。
3. **证书错误或 SSL 握手失败**
   - **原因**：某些应用或浏览器不信任 Charles 证书。
   - **解决方法**：确保目标设备或浏览器信任 Charles 根证书，并手动将其设为受信任的根证书。

通过 Charles 的这些功能和设置，可以有效地抓取、分析、调试 HTTP/HTTPS 流量，并灵活地修改和测试网络请求。