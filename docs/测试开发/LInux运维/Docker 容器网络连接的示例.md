# Docker 容器网络连接的几种方法示例

以下是 Docker 使两个容器网络连接的几种常用方法：

## **方法一：使用 Docker Compose（推荐）**

### **基础示例**
```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    container_name: web-app
    ports:
      - "80:80"
    networks:
      - app-network

  database:
    image: postgres:13
    container_name: postgres-db
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### **Grafana + InfluxDB 完整示例**
```yaml
version: '3.8'

services:
  influxdb:
    image: influxdb:2.7
    container_name: influxdb
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=admin123
      - DOCKER_INFLUXDB_INIT_ORG=my-org
      - DOCKER_INFLUXDB_INIT_BUCKET=k6
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=my-super-secret-token
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - ./provisioning:/etc/grafana/provisioning
    depends_on:
      - influxdb
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

**使用方式：**
```bash
docker-compose up -d
```

---

## **方法二：创建自定义网络并连接容器**

### **步骤 1：创建自定义网络**
```bash
docker network create my-network
```

### **步骤 2：运行容器并连接到网络**
```bash
# 运行第一个容器
docker run -d --name container1 --network my-network nginx:alpine

# 运行第二个容器
docker run -d --name container2 --network my-network busybox sleep 3600
```

### **步骤 3：验证连接**
```bash
# 从 container2 ping container1
docker exec container2 ping container1

# 查看网络详情
docker network inspect my-network
```

---

## **方法三：将现有容器连接到网络**

### **将运行中的容器连接到网络**
```bash
# 创建网络
docker network create app-network

# 运行容器（不指定网络）
docker run -d --name web nginx:alpine
docker run -d --name db postgres:13

# 将现有容器连接到网络
docker network connect app-network web
docker network connect app-network db

# 验证
docker exec web ping db
```

---

## **方法四：使用 --link 参数（传统方法，已不推荐）**

```bash
# 运行第一个容器
docker run -d --name database postgres:13

# 运行第二个容器并链接到第一个
docker run -d --name webapp --link database:db nginx:alpine

# 在 webapp 容器中可以通过 "db" 主机名访问数据库
docker exec webapp ping db
```

---

## **方法五：使用 host 网络模式**

### **所有容器共享宿主机网络**
```bash
# 使用 host 网络模式
docker run -d --name container1 --network host nginx:alpine
docker run -d --name container2 --network host busybox

# 容器间可以通过 localhost 互相访问
docker exec container2 curl http://localhost:80
```

---

## **方法六：多网络连接示例**

### **容器连接到多个网络**
```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    networks:
      - frontend
      - backend

  api:
    image: node:16
    networks:
      - backend

  database:
    image: postgres:13
    networks:
      - backend
      - database

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
  database:
    driver: bridge
```

---

## **方法七：使用外部网络**

### **连接到已存在的外部网络**
```yaml
version: '3.8'

services:
  app:
    image: nginx:alpine
    networks:
      - existing-network

networks:
  existing-network:
    external: true
    name: my-existing-network
```

**创建外部网络：**
```bash
docker network create my-existing-network
```

---

## **网络连接验证方法**

### **基础连通性测试**
```bash
# 方法 1: ping 测试
docker exec container1 ping container2

# 方法 2: curl 测试（如果运行 web 服务）
docker exec container2 curl http://container1:80

# 方法 3: nc 测试端口
docker exec container2 nc -zv container1 80

# 方法 4: 使用 telnet
docker exec container2 apt-get update && apt-get install -y telnet
docker exec container2 telnet container1 80
```

### **DNS 解析测试**
```bash
# 测试 DNS 解析
docker exec container1 nslookup container2

# 查看容器内的 /etc/hosts
docker exec container1 cat /etc/hosts

# 查看 DNS 配置
docker exec container1 cat /etc/resolv.conf
```

### **网络诊断工具**
```bash
# 安装网络工具（在容器内）
docker exec container1 apk add --no-cache bind-tools  # Alpine
docker exec container1 apt-get update && apt-get install -y dnsutils iputils-ping  # Debian/Ubuntu

# 使用 dig 测试 DNS
docker exec container1 dig container2

# 查看路由表
docker exec container1 route -n
```

---

## **实际应用场景示例**

### **场景 1：Web 应用 + 数据库**
```yaml
version: '3.8'

services:
  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - web-network
    depends_on:
      - backend

  backend:
    image: node:16
    networks:
      - web-network
      - db-network
    environment:
      - DATABASE_URL=postgresql://user:password@database:5432/mydb

  database:
    image: postgres:13
    networks:
      - db-network
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password

networks:
  web-network:
    driver: bridge
  db-network:
    driver: bridge
```

### **场景 2：监控栈（Grafana + Prometheus + 数据源）**
```yaml
version: '3.8'

services:
  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]
    networks: ["monitoring"]

  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    networks: ["monitoring"]

  node-exporter:
    image: prom/node-exporter
    networks: ["monitoring"]

networks:
  monitoring:
    driver: bridge
```

---

## **网络配置选项**

### **自定义网络配置**
```yaml
networks:
  custom-network:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: 1450
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
```

### **设置容器静态 IP**
```yaml
services:
  web:
    image: nginx:alpine
    networks:
      app-network:
        ipv4_address: 172.20.0.10

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

---

## **故障排除命令**

### **网络问题诊断**
```bash
# 查看所有网络
docker network ls

# 查看网络详情
docker network inspect network-name

# 查看容器网络信息
docker inspect container-name | grep -A 20 "NetworkSettings"

# 断开容器网络
docker network disconnect network-name container-name

# 删除网络
docker network rm network-name
```

### **检查端口映射**
```bash
# 查看容器端口映射
docker port container-name

# 查看所有端口映射
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

## **总结**

| 方法           | 优点                   | 缺点               | 适用场景           |
| -------------- | ---------------------- | ------------------ | ------------------ |
| Docker Compose | 简单、可重复、版本控制 | 需要 YAML 文件     | 开发、测试、生产   |
| 自定义网络     | 灵活、手动控制         | 需要多个命令       | 临时测试、手动部署 |
| --link         | 简单快速               | 已废弃、功能有限   | 传统项目、简单连接 |
| host 网络      | 性能好、简单           | 安全性低、端口冲突 | 性能测试、本地开发 |

**推荐使用 Docker Compose**，因为它提供了最好的可维护性和可重复性。