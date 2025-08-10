MySQL 8.0 允许从外部访问，但需要正确配置 **用户权限**、**绑定地址（bind-address）** 和 **网络环境**（如防火墙、Docker 端口映射）。以下是详细的配置步骤和注意事项：


### **一、核心配置：允许远程连接的用户权限**
MySQL 默认仅允许 `localhost`（本地）连接，需为用户授予 **远程访问权限**。


#### **1. 登录 MySQL 控制台**
以 `root` 用户身份登录 MySQL（本地或通过 Docker 容器）：  
```bash
# 若 MySQL 在 Docker 中，进入容器后登录
docker exec -it ruoyi-mysql bash
mysql -u root -p  # 输入密码（如 ruoyi123）
```


#### **2. 授予远程访问权限**
执行以下 SQL 命令，允许指定用户从任意 IP 远程连接（`%` 表示任意主机）：  
```sql
-- 创建/修改用户（示例：允许 root 用户从任意 IP 远程连接）
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'ruoyi123';  -- 若用户已存在，跳过此步
ALTER USER 'root'@'%' IDENTIFIED BY 'ruoyi123';  -- 更新密码（可选）

-- 授予所有数据库的所有权限（生产环境建议限制具体数据库）
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 刷新权限（立即生效）
FLUSH PRIVILEGES;
```


#### **3. 验证权限**
退出 MySQL 控制台，尝试用外部工具（如 DBeaver、命令行）连接测试：  
```bash
# 命令行测试（假设 MySQL 宿主机 IP 为 192.168.1.100）
mysql -h 192.168.1.100 -P 3306 -u root -p  # 输入密码 ruoyi123
```


### **二、关键配置：MySQL 绑定地址（bind-address）**
MySQL 通过 `bind-address` 配置决定允许哪些 IP 连接。默认值为 `127.0.0.1`（仅本地），需修改为 `0.0.0.0`（允许所有 IP）。


#### **1. 找到 MySQL 配置文件**
MySQL 配置文件通常位于：  
- **Linux/macOS**：`/etc/mysql/my.cnf` 或 `/etc/mysql/mysql.conf.d/mysqld.cnf`  
- **Docker 容器**：进入容器后查看 `/etc/mysql/my.cnf`（如 `docker exec -it ruoyi-mysql cat /etc/mysql/my.cnf`）  


#### **2. 修改 bind-address**
编辑配置文件，找到 `[mysqld]` 部分，将 `bind-address` 设置为 `0.0.0.0`（允许所有 IP 连接）：  
```ini
[mysqld]
bind-address = 0.0.0.0  # 允许所有 IP 远程连接
```


#### **3. 重启 MySQL 服务**
修改后需重启 MySQL 使配置生效：  
```bash
# 若在宿主机（非 Docker）
sudo systemctl restart mysql  # Linux
sudo brew services restart mysql  # macOS

# 若在 Docker 容器中
docker-compose restart ruoyi-mysql  # 重启容器
```


### **三、网络环境配置（防火墙/端口映射）**
即使 MySQL 配置正确，外部仍可能因 **防火墙拦截** 或 **Docker 端口未映射** 无法连接。


#### **1. 开放 3306 端口（宿主机防火墙）**
- **Linux（ufw）**：  
  ```bash
  sudo ufw allow 3306/tcp  # 开放 TCP 3306 端口
  ```
- **macOS（防火墙）**：  
  ```bash
  sudo /usr/libexec/ApplicationFirewall/socketfilterfw --addport 3306/tcp  # 开放端口
  ```


#### **2. Docker 端口映射（若 MySQL 在容器中）**
确保 `docker-compose.yml` 中正确映射了 3306 端口（宿主机端口 → 容器端口）：  
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: ruoyi-mysql
    ports:
      - "3306:3306"  # 宿主机 3306 → 容器 3306（必须）
    networks:
      - ruoyi-net
```


### **四、Docker 特殊场景：容器网络模式**
若 MySQL 容器使用 `bridge` 网络（默认），外部可通过宿主机 IP 访问；若使用 `host` 网络（容器直接使用宿主机网络），需确保宿主机防火墙开放 3306 端口。


### **五、常见问题排查**
#### **问题 1：连接时提示“Host 'xxx' is not allowed to connect”**  
- **原因**：用户权限未授予远程访问（`root@%` 未配置）。  
- **解决**：重新执行 `GRANT` 命令，确保用户权限包含 `%`（任意 IP）。  


#### **问题 2：连接超时（无响应）**  
- **原因**：防火墙拦截、MySQL 未监听外部 IP 或 Docker 端口未映射。  
- **解决**：  
  1. 检查 `bind-address` 是否为 `0.0.0.0`；  
  2. 确认宿主机防火墙开放 3306 端口；  
  3. 验证 Docker 端口映射（`docker port ruoyi-mysql 3306` 应输出宿主机 IP:3306）。  


#### **问题 3：MySQL 8.0 客户端连接失败（认证插件问题）**  
- **原因**：MySQL 8.0 默认使用 `caching_sha2_password` 插件，部分旧客户端（如 MySQL 5.7 客户端）不兼容。  
- **解决**：  
  - 升级客户端到 8.0+；  
  - 或修改用户认证插件（不推荐，降低安全性）：  
    ```sql
    ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'ruoyi123';
    FLUSH PRIVILEGES;
    ```


### **总结**
MySQL 8.0 允许外部访问的核心步骤：  
1. 授予用户远程权限（`GRANT ... TO 'user'@'%'`）；  
2. 修改 `bind-address` 为 `0.0.0.0`；  
3. 开放宿主机防火墙 3306 端口；  
4. 确保 Docker 端口映射正确（若容器部署）。  

通过以上配置，外部设备即可连接 MySQL 8.0 数据库。