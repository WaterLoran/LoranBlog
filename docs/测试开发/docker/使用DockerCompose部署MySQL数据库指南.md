# 使用 Docker Compose 部署 MySQL 数据库指南



下面是一个完整的教程，介绍如何使用 Docker Compose 轻松部署 MySQL 数据库：

## 准备工作

1. 确保已安装 Docker 和 Docker Compose：
   ```bash
   docker --version
   docker-compose --version
   ```

2. 创建一个项目目录：
   ```bash
   mkdir mysql-docker && cd mysql-docker
   ```

## 创建 Docker Compose 文件

创建 `docker-compose.yml` 文件并添加以下内容：

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0  # 使用官方 MySQL 8.0 镜像
    container_name: mysql_db  # 容器名称
    environment:
      MYSQL_ROOT_PASSWORD: my-secret-pw  # root 用户密码
      MYSQL_DATABASE: my_database       # 初始创建的数据库
      MYSQL_USER: app_user              # 普通用户
      MYSQL_PASSWORD: user_password     # 普通用户密码
    ports:
      - "3306:3306"  # 映射端口: 主机端口:容器端口
    volumes:
      - mysql_data:/var/lib/mysql  # 数据持久化
      - ./config:/etc/mysql/conf.d  # 自定义配置文件
      - ./initdb:/docker-entrypoint-initdb.d  # 初始化脚本
    restart: unless-stopped  # 自动重启策略
    networks:
      - mysql_net

volumes:
  mysql_data:  # 命名卷，用于数据持久化

networks:
  mysql_net:   # 专用网络
```

## 可选配置

### 1. 自定义配置文件
在项目目录创建 `config` 文件夹和配置文件：
```bash
mkdir config
echo "[mysqld]
max_connections = 500
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci" > config/custom.cnf
```

### 2. 初始化脚本
在项目目录创建 `initdb` 文件夹和初始化脚本：
```bash
mkdir initdb
echo "CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO users (name, email) VALUES 
('John Doe', 'john@example.com'),
('Jane Smith', 'jane@example.com');" > initdb/init.sql
```

## 启动 MySQL 容器

```bash
# 启动服务（在后台运行）
docker-compose up -d

# 查看运行状态
docker-compose ps
```

## 连接 MySQL

### 1. 在容器内连接
```bash
docker exec -it mysql_db mysql -u root -p
# 输入密码: my-secret-pw
```

### 2. 使用本地客户端连接
使用任何 MySQL 客户端（如 MySQL Workbench）连接：
- 主机: `127.0.0.1`
- 端口: `3306`
- 用户名: `root`
- 密码: `my-secret-pw`

### 3. 验证数据库
```sql
SHOW DATABASES;
USE my_database;
SELECT * FROM users;
```

## 管理 MySQL 容器

```bash
# 停止服务
docker-compose down

# 停止服务并删除数据卷
docker-compose down -v

# 查看日志
docker-compose logs -f mysql

# 重启服务
docker-compose restart mysql
```

## 安全建议

1. **使用强密码**：避免使用示例中的简单密码
2. **限制网络访问**：在 `docker-compose.yml` 中添加：
   ```yaml
   networks:
     mysql_net:
       internal: true  # 限制为内部网络
   ```
3. **定期备份**：
   ```bash
   docker exec mysql_db sh -c 'exec mysqldump --all-databases -uroot -p"$MYSQL_ROOT_PASSWORD"' > backup.sql
   ```

## 高级配置选项

### 使用 MySQL 5.7
```yaml
services:
  mysql:
    image: mysql:5.7
    # 其他配置相同
```

### 设置时区
```yaml
environment:
  TZ: Asia/Shanghai
```

### 资源限制
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
```

备注: docker-compose不支持配置deploy参数, 这个参数仅仅在k8s中有效

## 故障排除

### 常见问题解决
1. **无法连接数据库**：
   - 检查端口映射是否正确
   - 查看容器日志：`docker-compose logs mysql`
   - 确保防火墙允许 3306 端口

2. **数据持久化问题**：
   - 确认 volumes 配置正确
   - 检查数据卷位置：`docker volume inspect mysql-docker_mysql_data`

3. **权限问题**：
   - 如果使用自定义配置文件，确保文件权限正确：
     ```bash
     chmod 644 config/custom.cnf
     ```

使用 Docker Compose 部署 MySQL 提供了灵活、可重复且易于管理的数据库解决方案。这个配置包含了基本设置以及一些高级选项，可以根据实际需求进行调整。