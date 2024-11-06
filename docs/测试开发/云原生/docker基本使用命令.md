Docker的基本使用命令可以帮助你快速了解和操作Docker容器和镜像。以下是一些常用的Docker命令：

### 1. Docker 基本命令
- **docker version**：查看Docker版本信息。
- **docker info**：查看Docker系统的信息，包括镜像和容器数量等。

### 2. 镜像管理
- **docker images**：查看本地所有的Docker镜像。
- **docker pull [镜像名]**：从Docker Hub上下载镜像，例如`docker pull nginx`。
- **docker rmi [镜像ID]**：删除本地镜像。
- **docker build -t [镜像名:标签] .**：在当前目录根据Dockerfile构建镜像。

### 3. 容器管理
- **docker ps**：列出当前正在运行的容器。
- **docker ps -a**：列出所有容器，包括已停止的容器。
- **docker run -it --name [容器名] [镜像名]**：运行容器，例如`docker run -it --name mynginx nginx`。
  - `-d`：后台运行容器。
  - `-p [主机端口]:[容器端口]`：端口映射，例如`-p 8080:80`。
  - `-v [主机目录]:[容器目录]`：挂载目录。
  - `--name`：为容器指定一个名称。
- **docker stop [容器ID]**：停止一个正在运行的容器。
- **docker start [容器ID]**：启动一个已停止的容器。
- **docker restart [容器ID]**：重启一个容器。
- **docker rm [容器ID]**：删除一个容器（容器必须已停止）。

### 4. 进入容器
- **docker exec -it [容器ID] /bin/bash**：进入一个正在运行的容器内部，通常用于调试。
- **docker attach [容器ID]**：附加到一个正在运行的容器。

### 5. 数据卷管理
- **docker volume create [卷名]**：创建一个数据卷。
- **docker volume ls**：列出所有的数据卷。
- **docker volume rm [卷名]**：删除一个数据卷。

### 6. 网络管理
- **docker network ls**：列出Docker网络。
- **docker network create [网络名]**：创建一个新的网络。
- **docker network rm [网络名]**：删除一个网络。

### 7. Docker Compose
- **docker-compose up**：启动`docker-compose.yml`文件中定义的应用。
- **docker-compose down**：停止并删除`docker-compose`启动的容器。
- **docker-compose ps**：查看`docker-compose`管理的容器状态。

这些命令可以帮助你有效地管理Docker镜像、容器、网络和数据卷。在实际应用中可以根据需要灵活组合使用。