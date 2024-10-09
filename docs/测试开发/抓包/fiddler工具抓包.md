Fiddler 是一个功能强大的 HTTP/HTTPS 抓包调试工具，广泛用于 Web 流量监控、调试和分析。以下是使用 Fiddler 进行抓包的详细步骤：

### 一、基础使用步骤

1. **启动 Fiddler**：
   - 下载并安装 Fiddler 后，启动程序，它会自动设置为本机代理（默认 `127.0.0.1:8888`）。
2. **捕获 HTTP 和 HTTPS 流量**：
   - 启动 Fiddler 后，它会自动捕获所有本机通过该代理的 HTTP 流量。
   - 对于 HTTPS 流量，需要手动启用解密功能：
     - 在 `Tools -> Options -> HTTPS` 中勾选 `Capture HTTPS CONNECTs` 和 `Decrypt HTTPS traffic`。
     - 安装 Fiddler 根证书，并信任此证书。
3. **配置代理设置**：
   - 如果需要抓取其他设备（如手机）的流量，将移动设备的 Wi-Fi 代理设置为 Fiddler 所在机器的 IP 地址和端口（默认 `8888`）。
4. **过滤和查看目标流量**：
   - 使用过滤器（QuickExec 命令）或右键点击 `Exclude` 来隐藏不相关的流量。
   - 在 `Filters` 选项卡中，可以按主机名、请求类型或 URL 关键字进行过滤。

### 二、捕获 HTTPS 流量的配置

1. **启用 HTTPS 解密**：
   - 进入 `Tools -> Options -> HTTPS`，选择 `Decrypt HTTPS traffic` 选项。
2. **安装并信任 Fiddler 证书**：
   - 在 Fiddler 中，安装 `FiddlerRoot` 证书。对于 macOS 或 Linux 系统，需手动导入证书。
   - 在移动设备上访问 `http://ipv4.fiddler:8888` 来安装证书。

### 三、移动设备抓包

1. **设置代理**：
   - 在目标移动设备的 Wi-Fi 设置中，将 HTTP 代理设置为 Fiddler 所在主机 IP（如 `192.168.1.100`）和端口 `8888`。
2. **安装证书**：
   - 使用移动设备访问 `http://ipv4.fiddler:8888`，并根据设备提示完成证书安装。

### 四、修改与重放流量

1. **修改请求参数**：
   - 右键选择目标请求，选择 `Edit -> Edit Request`，修改 HTTP 请求头或内容。
2. **断点调试**：
   - 右键点击目标请求，选择 `Set Breakpoint`，然后再次触发该请求，Fiddler 会拦截请求，允许用户修改参数。
3. **重放和模拟请求**：
   - 选中某个请求，右键选择 `Replay` 或 `Edit`，然后修改参数并重新发送请求。

### 五、常见问题排查

1. **未捕获 HTTPS 流量**
   - **原因**：未启用 HTTPS 解密或未安装证书。
   - **解决方案**：确认 `Decrypt HTTPS traffic` 选项已启用，并安装并信任 Fiddler 的根证书。
2. **移动设备无法连接到 Fiddler**
   - **原因**：移动设备代理配置错误或 Fiddler 防火墙设置阻止了连接。
   - **解决方案**：检查设备代理设置，并在 Windows 防火墙中允许 Fiddler 的通信。
3. **证书错误（SSL 错误）**
   - **原因**：某些应用程序或浏览器未信任 Fiddler 证书。
   - **解决方案**：手动将 Fiddler 证书设为受信任的根证书，或使用绕过 SSL 验证的方式（如 `ignore SSL errors`）。

### 六、Fiddler 常用技巧

1. **QuickExec 命令行过滤**：
   - 在 Fiddler 界面底部的命令行中输入过滤命令，如 `select protocol==https` 来快速过滤 HTTPS 请求。
2. **保存会话数据**：
   - 使用 `File -> Save -> All Sessions` 将捕获的流量保存为 `.saz` 文件，供后续分析。
3. **使用脚本进行流量自动化操作**：
   - 在 `Rules -> Customize Rules` 中编写 FiddlerScript（基于 JScript.NET）来实现流量自动化处理、过滤和修改。

通过以上配置和技巧，Fiddler 可以有效地帮助开发者和测试人员调试和分析 Web 应用程序的 HTTP/HTTPS 流量。