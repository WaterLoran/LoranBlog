以下是对上述在 **CentOS** 系统中配置 Docker 源的命令的详细说明和指导文档：

---

## **CentOS 系统下配置 Docker 源并优化 Docker 日志**

---

### **前提条件**
- 确保系统已安装 Docker 和 kubelet。
- 当前用户具有 `sudo` 权限。

---

### **1. 停止相关服务**
在配置 Docker 之前，需要停止 `kubelet` 和运行中的所有 Docker 容器。

#### **命令**
```bash
# 停止 kubelet 服务
systemctl stop kubelet

# 停止所有运行中的 Docker 容器
docker stop $(docker ps -aq)
```

#### **说明**
- `systemctl stop kubelet`：停止 `kubelet`，避免其干扰 Docker 服务。
- `docker ps -aq`：列出所有容器的 ID，`docker stop` 停止这些容器。

---

### **2. 配置 Docker 的日志限制和镜像加速源**

#### **创建或修改 Docker 配置文件**
执行以下命令编辑 Docker 的配置文件 `/etc/docker/daemon.json`：
```bash
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "log-opts": {
    "max-size": "5m",
    "max-file": "3"
  },
  "exec-opts": ["native.cgroupdriver=systemd"],  
  "registry-mirrors": [
     "https://docker.rainbond.cc",
     "https://docker.1panel.live"
  ]
}
EOF
```

#### **配置说明**
1. **日志选项 (`log-opts`)**：
   - `"max-size": "5m"`：限制每个日志文件大小为 5MB。
   - `"max-file": "3"`：最多保留 3 个日志文件。

2. **Cgroup 驱动 (`exec-opts`)**：
   - `"native.cgroupdriver=systemd"`：设置 Docker 使用 `systemd` 作为 Cgroup 驱动，与 `kubelet` 的 Cgroup 驱动保持一致。

3. **镜像加速源 (`registry-mirrors`)**：
   - `"https://docker.rainbond.cc"` 和 `"https://docker.1panel.live"`：设置 Docker 使用国内镜像加速下载，提升镜像拉取速度。

---

### **3. 重载并重启 Docker 服务**
完成配置后，需要重载守护进程并重启 Docker 服务以应用更改。

#### **命令**
```bash
# 重载 systemd 配置
sudo systemctl daemon-reload

# 重启 Docker 服务
sudo systemctl restart docker
```

---

### **4. 启动 Docker 容器和 kubelet**
在完成 Docker 配置和服务重启后，重新启动之前停止的容器和 `kubelet`。

#### **命令**
```bash
# 启动所有 Docker 容器
docker start $(docker ps -aq)

# 启动 kubelet 服务
systemctl start kubelet
```

---

### **完整脚本**
将上述步骤整合为一个脚本，方便执行：
```bash
#!/bin/bash

# 停止服务
systemctl stop kubelet
docker stop $(docker ps -aq)

# 配置 Docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "log-opts": {
    "max-size": "5m",
    "max-file": "3"
  },
  "exec-opts": ["native.cgroupdriver=systemd"],  
  "registry-mirrors": [
     "https://docker.rainbond.cc",
     "https://docker.1panel.live"
  ]
}
EOF

# 重载并重启服务
sudo systemctl daemon-reload
sudo systemctl restart docker

# 启动服务
docker start $(docker ps -aq)
systemctl start kubelet
```

---

### **5. 验证配置是否生效**

#### **检查 Docker 配置**
验证 `/etc/docker/daemon.json` 文件是否已正确配置：
```bash
cat /etc/docker/daemon.json
```

#### **检查 Docker 服务状态**
确保 Docker 服务已正常运行：
```bash
systemctl status docker
```

#### **验证镜像加速源**
拉取一个公共镜像，确认加速生效：
```bash
docker pull hello-world
```

---

### **6. 常见问题及解决方法**

#### **问题 1：`kubelet` 无法启动**
- **原因**：`kubelet` 和 `Docker` 的 Cgroup 驱动不一致。
- **解决方法**：确保 `kubelet` 配置文件 `/var/lib/kubelet/config.yaml` 中的 `cgroupDriver` 与 Docker 配置一致：
  ```yaml
  cgroupDriver: systemd
  ```

#### **问题 2：镜像拉取速度未加速**
- **原因**：镜像加速源未生效。
- **解决方法**：
  1. 检查 `/etc/docker/daemon.json` 文件中的 `registry-mirrors` 配置是否正确。
  2. 重启 Docker 服务：
     ```bash
     sudo systemctl restart docker
     ```

#### **问题 3：日志过多导致磁盘空间不足**
- **原因**：未限制 Docker 日志文件大小。
- **解决方法**：确认日志限制选项已生效：
  ```bash
  docker info | grep "Logging Driver"
  ```
  应输出：
  ```plaintext
  Logging Driver: json-file
  ```

---

### **7. 总结**

通过上述配置，您完成了以下任务：
1. 优化 Docker 日志文件大小，避免磁盘空间占用过多。
2. 配置国内镜像加速，提高 Docker 镜像拉取速度。
3. 设置 Docker 的 Cgroup 驱动，与 `kubelet` 保持一致，确保 Kubernetes 集群稳定运行。

此配置适用于 CentOS 系统，能够有效提升 Docker 的运行效率和系统资源的合理利用。