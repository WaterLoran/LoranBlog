`tcpdump` 是一款强大的命令行抓包工具，常用于 Linux/Unix 系统中进行网络流量捕获和分析。它能够实时监控网络接口的流量，并支持多种过滤规则来精确捕获目标数据包。以下是 `tcpdump` 的常用抓包方法和相关样例。

### 一、基本抓包命令

1. **捕获所有流量**

   ```
   bash复制代码sudo tcpdump -i eth0
   ```

   - **说明**：默认在指定的 `eth0` 接口上捕获所有流量。

2. **捕获并显示指定数量的包**

   ```
   bash复制代码sudo tcpdump -i eth0 -c 10
   ```

   - **说明**：捕获 `eth0` 接口上的前 10 个数据包，然后退出。

3. **保存数据包到文件**

   ```
   bash复制代码sudo tcpdump -i eth0 -w capture.pcap
   ```

   - **说明**：将 `eth0` 接口上的流量保存到 `capture.pcap` 文件中，供之后分析。

4. **从文件中读取并解析数据包**

   ```
   bash复制代码sudo tcpdump -r capture.pcap
   ```

   - **说明**：读取并解析保存的 `capture.pcap` 文件。

### 二、使用过滤表达式

1. **过滤特定的 IP 地址**

   ```
   bash复制代码sudo tcpdump -i eth0 host 192.168.1.10
   ```

   - **说明**：仅捕获源地址或目标地址为 `192.168.1.10` 的数据包。

2. **过滤特定端口的数据包**

   ```
   bash复制代码sudo tcpdump -i eth0 port 80
   ```

   - **说明**：仅捕获 TCP/UDP 端口号为 `80` 的数据包。

3. **过滤特定协议的数据包**

   ```
   bash复制代码sudo tcpdump -i eth0 tcp
   ```

   - **说明**：仅捕获 TCP 协议的数据包。

4. **排除特定 IP 地址的数据包**

   ```
   bash复制代码sudo tcpdump -i eth0 not host 192.168.1.10
   ```

   - **说明**：排除源或目的地址为 `192.168.1.10` 的数据包。

### 三、高级抓包示例

1. **捕获 HTTP 请求并显示数据内容**

   ```
   bash复制代码sudo tcpdump -A -s 0 -i eth0 port 80
   ```

   - **说明**：使用 `-A` 以 ASCII 格式显示数据包内容，`-s 0` 读取完整数据包。

2. **捕获指定源 IP 和目的端口的数据包**

   ```
   bash复制代码sudo tcpdump -i eth0 src 192.168.1.10 and dst port 443
   ```

   - **说明**：仅捕获源 IP 为 `192.168.1.10` 且目的端口为 `443` 的数据包。

3. **实时查看 DNS 请求**

   ```
   bash复制代码sudo tcpdump -i eth0 udp port 53
   ```

   - **说明**：捕获 `eth0` 接口上的所有 DNS 请求（UDP 端口 53）。

4. **捕获特定主机之间的 ICMP 数据包**

   ```
   bash复制代码sudo tcpdump -i eth0 icmp and host 192.168.1.20
   ```

   - **说明**：仅捕获与 `192.168.1.20` 相关的 ICMP（Ping）数据包。

### 四、排查 `tcpdump` 的常见问题

1. **未使用管理员权限**：
   - 问题：如果未使用 `sudo` 或 root 权限运行，可能会出现权限不足的问题。
   - 解决方法：使用 `sudo` 或切换到 root 用户。
2. **错误的网卡选择**：
   - 问题：抓包时选择了不活跃或错误的网卡（如 `lo` 而非 `eth0`）。
   - 解决方法：使用 `tcpdump -D` 检查网卡列表，选择正确的网卡接口。
3. **捕获过滤规则设置不当**：
   - 问题：使用了过于严格的过滤规则，导致没有匹配到目标数据包。
   - 解决方法：先使用较宽泛的过滤规则进行初步抓包（如 `tcp or udp`），再逐步收紧过滤条件。
4. **数据包截断导致内容不完整**：
   - 问题：`tcpdump` 默认只捕获前 96 字节，导致数据包内容不完整。
   - 解决方法：使用 `-s 0` 选项来捕获完整的数据包内容。

通过上述方法和样例，可以更高效地使用 `tcpdump` 进行数据包捕获和分析。