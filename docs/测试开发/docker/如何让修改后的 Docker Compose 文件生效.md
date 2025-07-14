# 如何让修改后的 Docker Compose 文件生效

当您修改了 `docker-compose.yml` 文件后，需要执行以下步骤使更改生效：

## 完整生效流程

### 1. 停止并移除现有容器（保留数据卷）
```bash
docker-compose down
```

### 2. 重新构建镜像（如果 Dockerfile 有修改）
```bash
docker-compose build --no-cache
# 或者只重建特定服务
docker-compose build frontend
```

### 3. 重新创建并启动容器
```bash
docker-compose up -d --force-recreate
```

### 4. 验证服务状态
```bash
docker-compose ps
docker-compose logs -f
```

## 不同修改类型的具体处理方式

### 场景1：修改了服务配置（端口、环境变量等）
```bash
# 重新创建服务（不重建镜像）
docker-compose up -d --force-recreate

# 验证更改
docker-compose ps
```

### 场景2：修改了 Dockerfile（代码或构建流程变更）
```bash
# 重建镜像并重新创建服务
docker-compose up -d --build

# 或者单独重建某个服务
docker-compose build frontend
docker-compose up -d --force-recreate frontend
```

### 场景3：添加或删除了服务
```bash
# 完整停止并重新启动
docker-compose down
docker-compose up -d

# 验证新服务
docker-compose ps
```

### 场景4：修改了网络或卷配置
```bash
# 需要完全重建
docker-compose down -v  # 注意：这会删除匿名卷！
docker-compose up -d
```

## 常用 Docker Compose 命令参考

| 命令                                    | 说明                           |
| --------------------------------------- | ------------------------------ |
| `docker-compose down`                   | 停止并移除容器（保留网络和卷） |
| `docker-compose down -v`                | 停止并移除容器及关联卷         |
| `docker-compose up -d`                  | 后台启动服务                   |
| `docker-compose up -d --force-recreate` | 强制重新创建容器               |
| `docker-compose up -d --build`          | 重建镜像并启动                 |
| `docker-compose restart`                | 重启所有服务                   |
| `docker-compose restart frontend`       | 重启特定服务                   |
| `docker-compose logs -f frontend`       | 实时查看服务日志               |
| `docker-compose exec frontend sh`       | 进入容器终端                   |
| `docker-compose config`                 | 验证配置文件语法               |

## 最佳实践建议

1. **使用版本控制**：
   ```bash
   git add docker-compose.yml
   git commit -m "Update compose configuration"
   ```

2. **环境变量分离**：
   创建 `.env` 文件管理变量：
   ```env
   # .env
   FRONTEND_PORT=8080
   BACKEND_PORT=8088
   ```
   在 `docker-compose.yml` 中引用：
   ```yaml
   services:
     frontend:
       ports:
         - "${FRONTEND_PORT}:80"
   ```

3. **灰度更新策略**：
   ```bash
   # 滚动更新前端服务
   docker-compose up -d --no-deps --build frontend
   ```

4. **健康检查集成**：
   在 `docker-compose.yml` 中添加健康检查：
   ```yaml
   services:
     frontend:
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:80"]
         interval: 30s
         timeout: 5s
         retries: 3
   ```

## 常见问题解决方案

### 问题1：端口冲突
```bash
# 查看端口占用
sudo lsof -i :8080

# 停止占用进程或修改 compose 文件中的端口映射
```

### 问题2：容器无法启动
```bash
# 查看详细日志
docker-compose logs --tail=100 -f

# 尝试交互式启动
docker-compose run --rm frontend sh
```

### 问题3：网络问题
```bash
# 查看网络配置
docker network ls
docker network inspect ruoyi-network

# 清理未使用网络
docker network prune
```

### 问题4：数据卷不更新
```bash
# 强制重新创建并重建卷
docker-compose down -v
docker-compose up -d
```

## 完整工作流程示例

假设您修改了前端服务的端口映射：

```yaml
# 修改前
ports:
  - "8080:80"

# 修改后
ports:
  - "8888:80"
```

执行流程：
```bash
# 1. 停止服务
docker-compose down

# 2. 重新创建并启动
docker-compose up -d

# 3. 验证新端口
curl http://localhost:8888

# 4. 检查服务状态
docker-compose ps
```

通过遵循这些步骤，您可以确保对 Docker Compose 文件的修改正确生效，同时保持服务的高可用性。