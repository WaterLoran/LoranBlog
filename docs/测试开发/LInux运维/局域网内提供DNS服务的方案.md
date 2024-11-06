在公司局域网中部署DNS服务器，可以让员工通过域名方便地访问内部网站和服务。以下是建立并配置DNS服务器的详细步骤，以帮助解决常见的可能问题：

### 1. **选择合适的DNS服务器软件**
   - **推荐软件**：BIND、Dnsmasq或Unbound等。BIND功能强大且广泛应用，适合有复杂需求的环境；Dnsmasq较为轻量，适合小型网络。
   - **图形化管理**：如果希望使用图形化界面，可以结合Webmin等管理工具来简化配置。

### 2. **安装DNS服务器软件**
   - **在Linux服务器上安装DNS服务器**：
     - 使用BIND（适合复杂环境）：
       ```bash
       # CentOS/RHEL
       sudo yum install bind bind-utils

       # Ubuntu/Debian
       sudo apt install bind9
       ```
     - 或者，使用Dnsmasq（适合小型环境）：
       ```bash
       sudo apt install dnsmasq
       ```
   - **安装Webmin**（可选）：便于通过图形化界面管理BIND。

### 3. **配置DNS区域文件**
   - **定义局域网专用域名**：选择一个公司内部使用的域名，例如`company.local`或`internal.company.com`，以防止与公共域名冲突。
   - **配置正向区域文件**：在BIND中，编辑或创建一个区域文件（例如，`/etc/bind/db.company.local`），包含内部网站的DNS记录。
   - **示例配置**（BIND区域文件）：
     ```bash
     $TTL 86400
     @   IN  SOA     ns1.company.local. admin.company.local. (
             1       ; 序列号，每次更改区域文件后要递增
             604800  ; 刷新时间
             86400   ; 重试时间
             2419200 ; 过期时间
             86400 ) ; 最小TTL

     ; 定义名称服务器
         IN  NS      ns1.company.local.

     ; DNS服务器的A记录
     ns1 IN  A       192.168.1.10

     ; 内部网站的A记录
     www IN  A       192.168.1.20
     intranet IN A   192.168.1.21
     ```

### 4. **配置DNS服务的全局设置**
   - **监听地址**：确保DNS服务器监听公司局域网的接口。对于BIND，可以在`/etc/bind/named.conf.options`（或`/etc/named.conf`）中指定监听地址：
     ```bash
     options {
         listen-on port 53 { 192.168.1.10; };  # DNS服务器的IP地址
         allow-query { 192.168.1.0/24; };      # 允许查询的局域网IP段
         recursion yes;
     };
     ```

### 5. **配置DNS转发器（可选）**
   - 如果需要解析外部域名，可以配置DNS转发器，将外部请求转发到公共DNS服务器，例如Google或Cloudflare。
     ```bash
     forwarders {
         8.8.8.8;    # Google DNS
         1.1.1.1;    # Cloudflare DNS
     };
     ```

### 6. **测试DNS配置**
   - **语法检查**：使用以下命令检查BIND配置文件是否正确。
     ```bash
     sudo named-checkconf
     sudo named-checkzone company.local /etc/bind/db.company.local
     ```
   - **重启DNS服务**：
     ```bash
     sudo systemctl restart bind9     # Ubuntu/Debian
     sudo systemctl restart named     # CentOS/RHEL
     ```
   - **使用`dig`或`nslookup`测试解析**：
     ```bash
     dig @192.168.1.10 www.company.local
     ```

### 7. **在局域网内设置DNS服务器地址**
   - **在路由器/DHCP服务器中配置DNS**：如果路由器或DHCP服务器支持自定义DNS选项，将该DNS服务器（例如，`192.168.1.10`）配置为默认DNS，这样每个通过DHCP连接的设备会自动使用它。
   - **手动配置客户端设备**：如需要，也可以在客户端设备的网络设置中，手动将DNS服务器地址更改为公司DNS服务器的IP地址。

### 8. **解决可能遇到的问题**

   - **防火墙配置**：确保防火墙允许DNS服务器的53端口（UDP和TCP）通信。
     ```bash
     sudo firewall-cmd --permanent --add-port=53/udp
     sudo firewall-cmd --permanent --add-port=53/tcp
     sudo firewall-cmd --reload
     ```

   - **缓存和DNS刷新**：客户端设备可能会缓存旧的DNS记录，如果遇到解析问题，可以在客户端上刷新DNS缓存：
     - **Windows**：`ipconfig /flushdns`
     - **macOS/Linux**：重新连接网络或重启网络服务。

   - **DNS转发问题**：如果外部解析请求失败，检查DNS服务器的转发器配置是否正确，确保服务器可以访问公共DNS。

### 9. **设置和优化日志记录（可选）**
   - 通过日志监控DNS服务器的运行状态和请求情况，便于排查解析问题。
   - 在`named.conf.options`中启用日志记录，并指定日志文件路径：

     ```bash
     logging {
         channel default_debug {
             file "/var/log/named/bind.log";
             severity debug;
             print-category yes;
             print-severity yes;
             print-time yes;
         };
     };
     ```

### 10. **定期维护和更新**
   - 定期检查区域文件并更新DNS记录，确保所有内部服务都能正确解析。
   - 如果有新服务上线或IP更改，及时更新区域文件并重启DNS服务。

### 总结
通过以上步骤，您可以在公司局域网中建立一个稳定的DNS服务器，便于员工通过域名访问内部服务。确保在路由器或客户端设备中正确配置DNS服务器地址，并定期维护DNS配置，以确保解析准确、快速。