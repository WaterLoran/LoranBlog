# 将 RuoYi-Vue3 前端项目封装为 Docker 镜像

下面是将 RuoYi-Vue3 前端项目封装为 Docker 镜像的完整方案，包括 Dockerfile 和优化配置：

## Dockerfile 实现

在项目根目录创建 `Dockerfile` 文件：

```dockerfile
# 使用 Node.js 基础镜像
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装依赖
COPY package.json yarn.lock ./
RUN yarn config set registry https://registry.npmmirror.com && \
    yarn install --frozen-lockfile

# 复制项目文件
COPY . .

# 构建生产环境应用
RUN yarn build:prod

# 使用 Nginx 作为生产环境服务器
FROM nginx:stable-alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
```

## Nginx 配置文件

在项目根目录创建 `nginx.conf` 文件（优化 Vue 路由支持）：

```nginx
server {
    listen       80;
    server_name  localhost;

    # 静态文件路径
    root   /usr/share/nginx/html;
    index  index.html index.htm;

    # 启用 gzip 压缩
    gzip on;
    gzip_min_length 1k;
    gzip_comp_level 2;
    gzip_types text/plain text/css text/javascript application/javascript application/json;
    gzip_vary on;
    gzip_disable "MSIE [1-6]\.";

    # 处理 Vue Router 的路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # 禁止访问 .env 文件
    location ~ /\.env {
        deny all;
        return 404;
    }

    # 错误处理
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

## .dockerignore 文件

在项目根目录创建 `.dockerignore` 文件，排除不必要的文件：

```
.git
.gitignore
node_modules
dist
Dockerfile
docker-compose.yml
.env
*.log
.idea
.vscode
```

## 构建和运行镜像

### 1. 构建 Docker 镜像

```bash
docker build -t ruoyi-vue3-frontend-loran .
```

### 2. 运行容器

```bash
docker run -d \
  -p 8080:80 \
  --name ruoyi-vue3-app \
  ruoyi-vue3-frontend
```

### 3. 访问应用

打开浏览器访问：`http://localhost:8080`

## Docker Compose 集成（可选）

在项目根目录创建 `docker-compose.yml` 文件：

```yaml
services:
  frontend:
    image: ruoyi-vue3-frontend-loran
    build: .
    container_name: ruoyi-vue3-frontend
    ports:
      - "8080:80"
    restart: unless-stopped
    networks:
      - ruoyi-net

  # 如果需要后端服务，可以添加如下配置
	# 这部分 backend 如果不需要部署, 则移除
  backend:
    image: ruoyi-backend:latest
    container_name: ruoyi-backend
    ports:
      - "8088:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/ruoyi?useSSL=false
      - SPRING_DATASOURCE_USERNAME=root
      - SPRING_DATASOURCE_PASSWORD=ruoyi123
    depends_on:
      - mysql
    networks:
      - ruoyi-net

  mysql:
    image: mysql:8.0
    container_name: ruoyi-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ruoyi123
      MYSQL_DATABASE: ruoyi
    volumes:
      - ruoyi-data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - ruoyi-net

volumes:
  ruoyi-data:

networks:
  ruoyi-net:
    driver: bridge
```

## 优化建议

1. **多阶段构建**：
   - 第一阶段使用 Node.js 镜像构建应用
   - 第二阶段使用轻量级 Nginx 镜像部署

2. **镜像大小优化**：
   - 使用 Alpine Linux 基础镜像
   - 清理构建缓存：
     ```dockerfile
     RUN rm -rf /usr/local/share/.cache
     ```

3. **环境变量配置**：
   如果需要动态配置，可以添加环境变量支持：
   ```dockerfile
   # 在 Dockerfile 中添加
   ENV API_BASE_URL=http://backend:8080
   
   # 在 Nginx 配置中使用
   location /api/ {
       proxy_pass ${API_BASE_URL};
   }
   ```

4. **健康检查**：
   ```dockerfile
   HEALTHCHECK --interval=30s --timeout=5s \
     CMD curl -f http://localhost:80 || exit 1
   ```

## 部署流程

```bash
# 1. 克隆项目
git clone https://github.com/WaterLoran/RuoYi-Vue3.git
cd RuoYi-Vue3

# 2. 创建 Dockerfile 和 nginx.conf
# ... 使用上面提供的内容 ...

# 3. 构建镜像
docker build -t ruoyi-vue3-frontend .

# 4. 运行容器
docker run -d -p 8080:80 --name ruoyi-app ruoyi-vue3-frontend

# 5. 验证部署
curl http://localhost:8080
```

## 常见问题解决

1. **路由问题**：
   - 确保 Nginx 配置中包含 `try_files $uri $uri/ /index.html;`

2. **跨域问题**：
   - 在 Nginx 配置中添加反向代理：
     ```nginx
     location /api/ {
         proxy_pass http://backend:8080;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
     }
     ```

3. **构建缓存优化**：
   ```dockerfile
   # 先复制 package.json 和安装依赖
   COPY package.json yarn.lock ./
   RUN yarn install --frozen-lockfile
   
   # 再复制其他文件
   COPY . .
   ```

这个方案提供了完整的 Docker 镜像封装流程，包括生产环境优化、性能优化和常见问题解决方案。根据您的实际需求，可以调整环境变量或网络配置。

备注: 如果提示缺少镜像, 则手动拉取镜像

```shell
docker pull node:18-alpine
docker pull nginx:stable-alpine 
```

