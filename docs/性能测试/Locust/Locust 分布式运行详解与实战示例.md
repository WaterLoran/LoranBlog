# Locust 分布式运行详解与实战示例

Locust 的分布式运行模式允许你在多台机器上分布负载测试，从而生成比单机更大的并发压力。下面详细介绍分布式运行的原理、配置和实战示例。

## 📚 分布式架构概述

Locust 分布式采用 **主从架构 (Master-Worker)**：

- **Master 节点**：协调测试，收集统计信息，提供 Web UI
- **Worker 节点**：执行实际负载测试，生成虚拟用户

```
┌─────────────┐
│   Master    │◄──Web UI (8089)
│  节点       │
└─────────────┘
       │
       ├────────────┐
       │            │
┌─────────────┐ ┌─────────────┐
│  Worker 1   │ │  Worker 2   │
│  节点       │ │  节点       │
└─────────────┘ └─────────────┘
```

## 🚀 基础分布式运行示例

### 1. 启动 Master 节点

```bash
# 在 Master 机器上执行
locust -f locustfile.py --master --master-bind-host=0.0.0.0 --master-bind-port=5557
```

**参数说明：**
- `--master`：指定为 Master 模式
- `--master-bind-host`：Master 绑定的主机地址
- `--master-bind-port`：Master 绑定的端口

### 2. 启动 Worker 节点

```bash
# 在 Worker 机器上执行（可以多台）
locust -f locustfile.py --worker --master-host=192.168.1.100 --master-port=5557
```

**参数说明：**
- `--worker`：指定为 Worker 模式
- `--master-host`：Master 节点的 IP 地址
- `--master-port`：Master 节点的端口

## 🔧 完整的分布式测试示例

### Locust 测试脚本

```python
# distributed_demo.py
from locust import HttpUser, task, between, events
import time
import json

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    host = "http://example.com"
    
    def on_start(self):
        """用户启动时执行"""
        print(f"用户启动在 Worker 上")
        self.login()
    
    def login(self):
        """登录操作"""
        response = self.client.post("/login", json={
            "username": "testuser",
            "password": "testpass"
        })
        if response.status_code == 200:
            self.auth_token = response.json().get("token")
            print("登录成功")
    
    @task(3)
    def view_homepage(self):
        """浏览首页"""
        with self.client.get("/", catch_response=True, name="首页") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"首页访问失败: {response.status_code}")
    
    @task(2)
    def view_products(self):
        """浏览产品列表"""
        self.client.get("/products")
    
    @task(1)
    def purchase_product(self):
        """购买产品"""
        headers = {"Authorization": f"Bearer {getattr(self, 'auth_token', '')}"}
        self.client.post("/purchase", json={"product_id": 1}, headers=headers)

# 分布式事件处理
class DistributedEventHandler:
    def __init__(self):
        self.worker_count = 0
        
    @events.init.add_listener
    def on_locust_init(environment, **kwargs):
        print(f"节点初始化: {'Master' if environment.parsed_options.master else 'Worker'}")
        
    @events.test_start.add_listener
    def on_test_start(environment, **kwargs):
        node_type = "Master" if environment.parsed_options.master else "Worker"
        print(f"🚀 测试在 {node_type} 节点上开始")
        
    @events.test_stop.add_listener
    def on_test_stop(environment, **kwargs):
        node_type = "Master" if environment.parsed_options.master else "Worker"
        print(f"🛑 测试在 {node_type} 节点上停止")

# 初始化事件处理器
distributed_handler = DistributedEventHandler()
```

### 启动脚本示例

#### Windows 批处理脚本
```batch
@echo off
REM start_master.bat
echo 启动 Locust Master 节点...
locust -f distributed_demo.py --master --master-bind-host=0.0.0.0 --master-bind-port=5557 --web-host=0.0.0.0 --web-port=8089
pause
```

```batch
@echo off
REM start_worker.bat
set MASTER_HOST=192.168.1.100
echo 启动 Locust Worker 节点，连接到 Master: %MASTER_HOST%
locust -f distributed_demo.py --worker --master-host=%MASTER_HOST% --master-port=5557
pause
```

#### Linux/Mac Shell 脚本
```bash
#!/bin/bash
# start_master.sh
echo "启动 Locust Master 节点..."
locust -f distributed_demo.py --master \
    --master-bind-host=0.0.0.0 \
    --master-bind-port=5557 \
    --web-host=0.0.0.0 \
    --web-port=8089
```

```bash
#!/bin/bash
# start_worker.sh
MASTER_HOST="192.168.1.100"
echo "启动 Locust Worker 节点，连接到 Master: $MASTER_HOST"
locust -f distributed_demo.py --worker \
    --master-host=$MASTER_HOST \
    --master-port=5557
```

## 🔄 高级分布式配置

### 1. 使用 Docker Compose 运行分布式集群

```yaml
# docker-compose.yml
version: '3'

services:
  master:
    image: locustio/locust
    ports:
      - "8089:8089"
      - "5557:5557"
    volumes:
      - ./:/mnt/locust
    command: >
      -f /mnt/locust/distributed_demo.py
      --master
      --master-bind-host=0.0.0.0
      --master-bind-port=5557
      --web-host=0.0.0.0

  worker:
    image: locustio/locust
    volumes:
      - ./:/mnt/locust
    command: >
      -f /mnt/locust/distributed_demo.py
      --worker
      --master-host=master
    deploy:
      replicas: 4
    depends_on:
      - master
```

启动命令：
```bash
docker-compose up --scale worker=4
```

### 2. 动态 Worker 管理

```python
# dynamic_worker_manager.py
import subprocess
import time
from threading import Thread

class DynamicWorkerManager:
    def __init__(self, master_host, master_port, locust_file):
        self.master_host = master_host
        self.master_port = master_port
        self.locust_file = locust_file
        self.worker_processes = []
    
    def start_worker(self, worker_id):
        """启动一个 Worker 进程"""
        cmd = [
            'locust', 
            '-f', self.locust_file,
            '--worker',
            '--master-host', self.master_host,
            '--master-port', str(self.master_port)
        ]
        
        process = subprocess.Popen(cmd)
        self.worker_processes.append((worker_id, process))
        print(f"✅ Worker {worker_id} 已启动")
        return process
    
    def scale_workers(self, target_count):
        """动态调整 Worker 数量"""
        current_count = len(self.worker_processes)
        
        if target_count > current_count:
            # 需要启动更多 Worker
            for i in range(current_count, target_count):
                self.start_worker(i)
                time.sleep(1)  # 避免同时启动造成冲击
        elif target_count < current_count:
            # 需要停止部分 Worker
            for i in range(current_count - 1, target_count - 1, -1):
                worker_id, process = self.worker_processes[i]
                process.terminate()
                process.wait()
                self.worker_processes.pop()
                print(f"🛑 Worker {worker_id} 已停止")

# 使用示例
if __name__ == "__main__":
    manager = DynamicWorkerManager(
        master_host="192.168.1.100",
        master_port=5557,
        locust_file="distributed_demo.py"
    )
    
    # 初始启动 2 个 Worker
    manager.scale_workers(2)
    time.sleep(30)
    
    # 扩展到 4 个 Worker
    manager.scale_workers(4)
    time.sleep(30)
    
    # 缩减到 1 个 Worker
    manager.scale_workers(1)
```

### 3. 分布式数据共享和同步

```python
# distributed_with_shared_data.py
from locust import HttpUser, task, between, events
import redis
import json
import threading

class SharedDataUser(HttpUser):
    wait_time = between(1, 5)
    host = "http://api.example.com"
    
    def on_start(self):
        """初始化 Redis 连接用于数据共享"""
        self.redis_client = redis.Redis(
            host='redis-host', 
            port=6379, 
            db=0, 
            decode_responses=True
        )
        
        # 注册当前 Worker
        worker_id = self.get_worker_id()
        self.redis_client.sadd("active_workers", worker_id)
    
    def get_worker_id(self):
        """获取 Worker 唯一标识"""
        import socket
        return f"{socket.gethostname()}-{threading.current_thread().name}"
    
    @task
    def shared_counter_test(self):
        """使用共享计数器的测试"""
        # 原子递增计数器
        counter = self.redis_client.incr("global_request_counter")
        
        # 执行请求
        response = self.client.get(f"/api/data?request_id={counter}")
        
        # 记录每个 Worker 的请求数
        worker_id = self.get_worker_id()
        self.redis_client.hincrby("worker_requests", worker_id, 1)
    
    @task
    def distributed_coordination(self):
        """分布式协调示例"""
        worker_id = self.get_worker_id()
        
        # 只有第一个获取锁的 Worker 执行特定操作
        lock_acquired = self.redis_client.setnx("distributed_lock", worker_id)
        if lock_acquired:
            try:
                # 执行需要协调的操作
                self.client.post("/api/coordinated-action")
                print(f"Worker {worker_id} 获得了分布式锁")
            finally:
                # 释放锁
                self.redis_client.delete("distributed_lock")
        else:
            # 其他 Worker 执行普通操作
            self.client.get("/api/normal-action")

# 分布式事件处理
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """测试开始时初始化共享数据"""
    if not environment.parsed_options.master:
        return
    
    # 只在 Master 节点执行
    redis_client = redis.Redis(host='redis-host', port=6379, db=0)
    redis_client.delete("global_request_counter", "active_workers", "worker_requests", "distributed_lock")
    print("🧹 测试开始，清理共享数据")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """测试结束时统计分布式结果"""
    if not environment.parsed_options.master:
        return
    
    redis_client = redis.Redis(host='redis-host', port=6379, db=0)
    
    total_requests = redis_client.get("global_request_counter") or 0
    active_workers = redis_client.scard("active_workers")
    worker_stats = redis_client.hgetall("worker_requests")
    
    print(f"\n📊 分布式测试统计:")
    print(f"   总请求数: {total_requests}")
    print(f"   活跃 Worker 数: {active_workers}")
    print(f"   各 Worker 请求分布: {worker_stats}")
```

### 4. 使用 Pytest 自动化分布式测试

```python
# test_distributed_performance.py
import pytest
import subprocess
import time
import requests
import os

class DistributedLocustTest:
    def __init__(self):
        self.master_process = None
        self.worker_processes = []
        self.locust_file = "distributed_demo.py"
    
    def start_master(self):
        """启动 Master 节点"""
        cmd = [
            'locust', '-f', self.locust_file,
            '--master', 
            '--headless',
            '--master-bind-host', '127.0.0.1',
            '--master-bind-port', '5557',
            '--web-host', '127.0.0.1',
            '--web-port', '8089',
            '--expect-workers', '2',  # 期望的 Worker 数量
            '-u', '100',  # 总用户数
            '-r', '10',   # 孵化率
            '-t', '1m'    # 运行时间
        ]
        
        self.master_process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        print("🚀 Master 节点启动中...")
        time.sleep(5)  # 等待 Master 启动
    
    def start_worker(self, worker_id):
        """启动 Worker 节点"""
        cmd = [
            'locust', '-f', self.locust_file,
            '--worker',
            '--master-host', '127.0.0.1',
            '--master-port', '5557'
        ]
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        self.worker_processes.append(process)
        print(f"👷 Worker {worker_id} 启动中...")
        time.sleep(2)
    
    def stop_all(self):
        """停止所有进程"""
        for process in self.worker_processes:
            process.terminate()
            process.wait()
        
        if self.master_process:
            self.master_process.terminate()
            self.master_process.wait()

def test_distributed_performance():
    """分布式性能测试"""
    test_runner = DistributedLocustTest()
    
    try:
        # 启动 Master
        test_runner.start_master()
        
        # 启动 2 个 Worker
        test_runner.start_worker(1)
        test_runner.start_worker(2)
        
        # 等待测试完成
        print("⏳ 测试运行中...")
        time.sleep(70)  # 1分钟测试 + 额外时间
        
        # 检查进程状态
        for i, process in enumerate(test_runner.worker_processes):
            assert process.poll() is None, f"Worker {i+1} 意外退出"
        
        # 可以添加更多断言，比如检查 API 响应等
        
        print("✅ 分布式测试完成")
        
    finally:
        # 清理
        test_runner.stop_all()

if __name__ == "__main__":
    test_distributed_performance()
```

## ⚙️ 分布式运行最佳实践

### 1. 网络配置建议

```bash
# 确保防火墙开放相关端口
# Master 需要开放：8089 (Web UI), 5557 (Worker 通信)

# Ubuntu 示例
sudo ufw allow 8089/tcp
sudo ufw allow 5557/tcp

# CentOS 示例
sudo firewall-cmd --permanent --add-port=8089/tcp
sudo firewall-cmd --permanent --add-port=5557/tcp
sudo firewall-cmd --reload
```

### 2. 性能优化配置

```bash
# 调整系统限制（Linux）
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# 对于大量 Worker，调整 Master 内存
locust -f locustfile.py --master --master-bind-host=0.0.0.0 --master-bind-port=5557 --expect-workers=10
```

### 3. 监控分布式集群

```python
# cluster_monitor.py
import psutil
import requests
import time
from datetime import datetime

def monitor_cluster(master_host="localhost", master_port=8089):
    """监控分布式集群状态"""
    while True:
        try:
            # 获取 Locust 统计信息
            stats_url = f"http://{master_host}:{master_port}/stats/requests"
            response = requests.get(stats_url)
            stats = response.json()
            
            print(f"\n📈 集群状态 - {datetime.now()}")
            print(f"   总用户数: {stats.get('user_count', 0)}")
            print(f"   总 RPS: {stats.get('total_rps', 0):.2f}")
            print(f"   失败率: {stats.get('fail_ratio', 0)*100:.2f}%")
            
            # 系统资源监控
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            print(f"   CPU 使用率: {cpu_percent}%")
            print(f"   内存使用率: {memory.percent}%")
            
        except Exception as e:
            print(f"监控错误: {e}")
        
        time.sleep(10)

if __name__ == "__main__":
    monitor_cluster()
```

## 🎯 总结

Locust 分布式运行的关键要点：

1. **架构清晰**：Master-Worker 模式，Master 负责协调，Worker 负责产生负载
2. **灵活扩展**：可以动态增加 Worker 节点来提升并发能力
3. **数据共享**：通过 Redis 等外部存储实现 Worker 间的数据同步
4. **自动化集成**：可以与 Pytest、Docker 等工具集成实现自动化测试
5. **监控完善**：提供完整的集群状态监控能力

通过合理配置分布式集群，你可以轻松模拟数万甚至数十万的并发用户，满足大规模性能测试的需求。