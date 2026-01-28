# Locust的各种运行方式

## 1. 基础 Locust 脚本示例

首先创建一个基础的 `locustfile.py`：

```python
from locust import HttpUser, task, between
import random
import time

class QuickstartUser(HttpUser):
    wait_time = between(1, 5)
    
    @task(3)
    def view_items(self):
        # 查看商品列表
        self.client.get("/api/items")
    
    @task(2)
    def view_item_detail(self):
        # 查看商品详情
        item_id = random.randint(1, 100)
        self.client.get(f"/api/items/{item_id}", name="/api/items/[id]")
    
    @task(1)
    def add_to_cart(self):
        # 添加商品到购物车
        item_id = random.randint(1, 100)
        self.client.post(
            "/api/cart",
            json={"item_id": item_id, "quantity": 1},
            headers={"Authorization": "Bearer token123"}
        )
    
    def on_start(self):
        # 用户启动时执行（登录）
        self.client.post("/api/login", json={
            "username": "test_user",
            "password": "test_password"
        })
        print("用户登录成功")
```

## 2. 高级 Locust 脚本（带自定义指标）

```python
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner, WorkerRunner
import time
import json

# 自定义事件钩子
@events.init.add_listener
def on_locust_init(environment, **kwargs):
    print("Locust 初始化完成")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("测试开始")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("测试结束")

class AdvancedUser(HttpUser):
    wait_time = between(0.5, 3)
    host = "https://api.example.com"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = None
        self.token = None
    
    @task(5)
    def get_products(self):
        with self.client.get("/products", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"获取商品失败: {response.status_code}")
    
    @task(3)
    def create_order(self):
        order_data = {
            "product_id": random.randint(1, 100),
            "quantity": random.randint(1, 5),
            "price": round(random.uniform(10, 1000), 2)
        }
        
        start_time = time.time()
        response = self.client.post(
            "/orders",
            json=order_data,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        # 记录自定义指标
        if response.status_code == 201:
            events.request.fire(
                request_type="POST",
                name="/orders/create",
                response_time=(time.time() - start_time) * 1000,
                response_length=len(response.content),
                exception=None,
                context={}
            )
    
    @task(1)
    def heavy_operation(self):
        # 模拟复杂操作
        with self.client.get("/analytics/report", name="/analytics") as response:
            pass
    
    def on_start(self):
        # 用户启动时登录
        login_response = self.client.post("/auth/login", json={
            "username": f"user_{random.randint(1000, 9999)}",
            "password": "password123"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.user_id = login_response.json().get("user_id")
            print(f"用户 {self.user_id} 登录成功")
```

## 3. 运行 Locust 的各种方式

### 方式一：Web UI 模式（推荐用于开发调试）

```bash
# 基础启动
locust

# 指定文件、主机和端口
locust -f locustfile.py --host=https://api.example.com --web-host=0.0.0.0 --web-port=8089

# 设置用户数和孵化率（启动时预填）
locust -f locustfile.py --users 100 --spawn-rate 10 --host=https://api.example.com
```

### 方式二：无头模式（命令行模式，用于CI/CD）

```bash
# 基础无头模式
locust -f locustfile.py --headless --users 100 --spawn-rate 10 --run-time 1h --host=https://api.example.com

# 设置运行时间格式
locust -f locustfile.py --headless --users 500 --spawn-rate 20 --run-time 30m

# 指定停止超时时间
locust -f locustfile.py --headless --users 1000 --spawn-rate 50 --run-time 1h --stop-timeout 99
```

### 方式三：分布式模式（用于大规模测试）

**Master 节点：**
```bash
# 启动 master
locust -f locustfile.py --master --expect-workers 4 --host=https://api.example.com --web-port=8089

# 或者无头模式
locust -f locustfile.py --master --headless --expect-workers 4 --users 10000 --spawn-rate 100 --run-time 1h
```

**Worker 节点：**
```bash
# 启动 worker（在另一台机器上）
locust -f locustfile.py --worker --master-host=192.168.1.100

# 指定 worker 数量（在一台机器上启动多个 worker）
locust -f locustfile.py --worker --master-host=localhost --processes 4
```

### 方式四：使用配置文件

创建 `locust.conf` 文件：
```ini
# locust.conf
locustfile = locustfile.py
host = https://api.example.com
users = 1000
spawn-rate = 100
run-time = 30m
headless = true
only-summary = true
csv = results
html = report.html
```

运行：
```bash
locust --config=locust.conf
```

## 4. 完整的生产环境示例

### 创建完整的测试套件

```python
# performance_test.py
import time
import random
from locust import HttpUser, task, between, tag
from locust.env import Environment
from locust.log import setup_logging

setup_logging("INFO")

class APIUser(HttpUser):
    wait_time = between(0.1, 1.0)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.headers = {"Content-Type": "application/json"}
    
    @tag('critical')
    @task(10)
    def health_check(self):
        self.client.get("/health")
    
    @tag('api')
    @task(8)
    def get_users(self):
        self.client.get("/api/users")
    
    @tag('api')
    @task(5)
    def create_user(self):
        user_data = {
            "name": f"User_{random.randint(1000, 9999)}",
            "email": f"test{random.randint(1000, 9999)}@example.com"
        }
        self.client.post("/api/users", json=user_data, headers=self.headers)
    
    @tag('heavy')
    @task(1)
    def generate_report(self):
        self.client.get("/api/reports/sales")

class WebsiteUser(HttpUser):
    wait_time = between(2, 5)
    
    @task(3)
    def view_homepage(self):
        self.client.get("/")
    
    @task(2)
    def browse_products(self):
        self.client.get("/products")
    
    @task(1)
    def view_product_detail(self):
        product_id = random.randint(1, 50)
        self.client.get(f"/products/{product_id}")
```

### 运行脚本

```bash
#!/bin/bash
# run_performance_test.sh

echo "开始性能测试..."

# 设置测试参数
USERS=500
SPAWN_RATE=50
DURATION="10m"
HOST="https://your-app.com"

echo "参数: $USERS 用户, 孵化率: $SPAWN_RATE/秒, 持续时间: $DURATION"

# 运行测试
locust -f performance_test.py \
    --headless \
    --users $USERS \
    --spawn-rate $SPAWN_RATE \
    --run-time $DURATION \
    --host $HOST \
    --csv=results/performance_test \
    --html=results/report.html \
    --only-summary

echo "测试完成！查看 results/ 目录获取报告"
```

## 5. 常用命令行参数详解

```bash
# 基本参数
-f, --locustfile        # 指定 locust 文件
-H, --host              # 设置基础主机URL
--web-host              # Web界面绑定地址（默认: 0.0.0.0）
--web-port              # Web界面端口（默认: 8089）

# 无头模式参数
--headless              # 禁用Web界面
-u, --users             # 并发用户数
-r, --spawn-rate        # 每秒启动用户数
-t, --run-time          # 运行时间（例如: 300s, 20m, 1h）
--stop-timeout          # 优雅停止超时时间（默认: None）

# 分布式参数
--master                # 设置master节点
--worker                # 设置worker节点
--master-host           # master节点地址
--master-port           # master节点端口（默认: 5557）
--expect-workers        # 期望的worker数量

# 输出参数
--csv                   # 将数据保存为CSV文件
--html                  # 生成HTML报告
--json                  # 生成JSON报告
--logfile               # 日志文件路径
--loglevel              # 日志级别（DEBUG/INFO/WARNING/ERROR）
--only-summary          # 只显示摘要统计

# 其他参数
--autostart             # 自动开始测试（需与--autoquit一起使用）
--autoquit              # 完成后自动退出
-T, --tags              # 只运行指定tag的任务
-E, --exclude-tags      # 排除指定tag的任务
```

## 6. 实际使用示例

```bash
# 开发测试（小规模）
locust -f locustfile.py --host=http://localhost:8000 --users 50 --spawn-rate 5

# 生产负载测试（大规模，分布式）
locust -f locustfile.py --master --expect-workers 4 --headless --users 5000 --spawn-rate 100 --run-time 30m --csv=load_test

# CI/CD 集成
locust -f locustfile.py --headless --users 100 --spawn-rate 10 --run-time 5m --only-summary --csv=ci_results

# 特定功能测试
locust -f performance_test.py --tags critical --headless --users 200 --spawn-rate 20 --run-time 10m
```

这些示例涵盖了 Locust 的大部分使用场景，你可以根据具体需求选择合适的运行方式。