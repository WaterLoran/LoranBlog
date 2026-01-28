# Locust 功能全面解析

Locust 是一个功能强大的开源负载测试工具，具有丰富的特性和灵活的扩展能力。下面详细分类介绍 Locust 的所有主要功能。

## 🎯 核心测试功能

### 1. 用户行为模拟
```python
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)  # 等待时间控制
    
    @task(3)  # 任务权重
    def view_homepage(self):
        self.client.get("/")
    
    @task(1)
    def login(self):
        self.client.post("/login", {
            "username": "test",
            "password": "secret"
        })
    
    def on_start(self):
        """用户启动时执行"""
        self.login()
    
    def on_stop(self):
        """用户停止时执行"""
        self.client.get("/logout")
```

### 2. 多种等待时间策略
```python
from locust import between, constant, constant_pacing

# 随机等待
wait_time = between(1, 5)

# 固定等待
wait_time = constant(2)

# 恒定步调（确保任务执行间隔）
wait_time = constant_pacing(3)  # 每3秒执行一次

# 自定义等待时间
import random
def custom_wait():
    return random.expovariate(1) * 10

wait_time = custom_wait
```

### 3. 请求验证和断言
```python
class ValidatingUser(HttpUser):
    @task
    def validated_request(self):
        # 方法1：使用 catch_response
        with self.client.get("/api/data", 
                           catch_response=True, 
                           name="验证API") as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    response.success()
                else:
                    response.failure("API返回状态错误")
            else:
                response.failure(f"HTTP错误: {response.status_code}")
        
        # 方法2：直接断言
        response = self.client.get("/api/health")
        assert response.status_code == 200, "健康检查失败"
        assert "OK" in response.text, "响应文本不正确"
```

## 📊 负载模式控制

### 1. 基础负载配置
```python
from locust import HttpUser, task

class LoadTestUser(HttpUser):
    @task
    def test_endpoint(self):
        self.client.get("/api")
```

启动命令：
```bash
# 基础配置
locust -f locustfile.py --users 100 --spawn-rate 10 --run-time 1h

# 无界面模式
locust -f locustfile.py --headless --users 1000 --spawn-rate 100 --run-time 30m
```

### 2. 高级负载形状（Load Shape）
```python
from locust import LoadTestShape
import math

class CustomLoadShape(LoadTestShape):
    """
    自定义负载形状示例：
    - 第0-60秒：逐渐增加到100用户
    - 第60-120秒：保持100用户
    - 第120-180秒：逐渐减少到0用户
    - 然后停止测试
    """
    
    stages = [
        {"duration": 60, "users": 100, "spawn_rate": 20},
        {"duration": 120, "users": 100, "spawn_rate": 10},
        {"duration": 180, "users": 0, "spawn_rate": 10},
    ]
    
    def tick(self):
        run_time = self.get_run_time()
        
        for stage in self.stages:
            if run_time < stage["duration"]:
                try:
                    users = stage["users"]
                    spawn_rate = stage["spawn_rate"]
                except KeyError:
                    users = 0
                    spawn_rate = 0
                return (users, spawn_rate)
        
        return None

class WaveLoadShape(LoadTestShape):
    """波浪形负载"""
    
    def tick(self):
        run_time = self.get_run_time()
        
        # 正弦波负载：50 ± 30 * sin(t/30)
        users = 50 + 30 * math.sin(run_time / 30)
        spawn_rate = 10
        
        return (int(users), spawn_rate)
```

### 3. 步进负载测试
```python
class StepLoadShape(LoadTestShape):
    """步进式增加负载"""
    
    steps = [
        {"duration": 120, "users": 10, "spawn_rate": 5},
        {"duration": 240, "users": 50, "spawn_rate": 10},
        {"duration": 360, "users": 100, "spawn_rate": 20},
        {"duration": 480, "users": 200, "spawn_rate": 30},
    ]
    
    def tick(self):
        run_time = self.get_run_time()
        
        for step in self.steps:
            if run_time < step["duration"]:
                return (step["users"], step["spawn_rate"])
        
        return None
```

## 🔧 分布式测试功能

### 1. 基础分布式运行
```bash
# Master 节点
locust -f locustfile.py --master --master-bind-host=0.0.0.0 --master-bind-port=5557

# Worker 节点（多台机器）
locust -f locustfile.py --worker --master-host=192.168.1.100 --master-port=5557
```

### 2. 分布式数据共享
```python
from locust import events
import redis
import json

class DistributedUser(HttpUser):
    def on_start(self):
        self.redis = redis.Redis(host='redis-host', port=6379)
    
    @task
    def shared_counter_test(self):
        # 分布式计数器
        request_id = self.redis.incr("global_request_id")
        self.client.get(f"/api?req_id={request_id}")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    if environment.parsed_options.master:
        # 只在 Master 执行初始化
        redis_client = redis.Redis(host='redis-host', port=6379)
        redis_client.delete("global_request_id")
```

## 📈 监控和报告功能

### 1. 实时 Web UI
```python
# 自定义 Web UI 配置
class CustomUser(HttpUser):
    host = "http://example.com"
    
    @task
    def homepage(self):
        self.client.get("/")
```

访问 `http://localhost:8089` 查看：
- 实时 RPS（每秒请求数）
- 响应时间统计（平均、中位数、95%分位等）
- 失败请求统计
- 用户数量监控

### 2. 自定义指标收集
```python
from locust import events
import time

class CustomMetrics:
    def __init__(self):
        self.slow_requests = 0
        self.custom_timings = []
    
    @events.request_success.add_listener
    def track_slow_requests(self, request_type, name, response_time, response_length, **kwargs):
        if response_time > 1000:  # 1秒以上算慢请求
            self.slow_requests += 1
            self.custom_timings.append({
                "timestamp": time.time(),
                "endpoint": name,
                "response_time": response_time
            })
        
        # 实时打印慢请求警告
        if response_time > 5000:
            print(f"🚨 极慢请求: {name} - {response_time}ms")

metrics = CustomMetrics()
```

### 3. 多种报告格式
```bash
# 生成 CSV 报告
locust -f locustfile.py --headless --users 100 --run-time 10m --csv=report

# 生成 HTML 报告
locust -f locustfile.py --headless --users 100 --run-time 10m --html=report.html

# 生成 JSON 格式的统计数据
locust -f locustfile.py --headless --users 100 --run-time 1m --json --json-save=stats.json
```

## 🔌 扩展和集成功能

### 1. 事件系统扩展
```python
from locust import events
import requests
import json

@events.init.add_listener
def setup_environment(environment, **kwargs):
    """环境初始化"""
    environment.custom_config = {
        "api_key": "test_key",
        "environment": "staging"
    }

@events.test_start.add_listener  
def on_test_start(environment, **kwargs):
    """测试开始时发送通知"""
    webhook_url = "https://hooks.slack.com/services/..."
    payload = {
        "text": f"🚀 Locust 性能测试开始于 {environment.host}"
    }
    try:
        requests.post(webhook_url, json=payload, timeout=5)
    except:
        print("Slack 通知发送失败")

@events.request_failure.add_listener
def on_request_failure(request_type, name, response_time, exception, **kwargs):
    """请求失败时记录到外部系统"""
    error_data = {
        "timestamp": time.time(),
        "endpoint": name,
        "error": str(exception),
        "response_time": response_time
    }
    # 可以发送到 ELK、DataDog 等监控系统
    log_to_external_system(error_data)
```

### 2. 自定义客户端
```python
from locust import User, task, between
import websocket
import json

class WebSocketUser(User):
    wait_time = between(1, 3)
    
    def on_start(self):
        self.ws = websocket.WebSocket()
        self.ws.connect("ws://echo.websocket.org")
    
    @task
    def send_message(self):
        message = json.dumps({"type": "test", "data": "hello"})
        start_time = time.time()
        
        try:
            self.ws.send(message)
            response = self.ws.recv()
            response_time = int((time.time() - start_time) * 1000)
            
            # 报告成功
            events.request_success.fire(
                request_type="WS",
                name="websocket_echo",
                response_time=response_time,
                response_length=len(response),
            )
        except Exception as e:
            response_time = int((time.time() - start_time) * 1000)
            events.request_failure.fire(
                request_type="WS", 
                name="websocket_echo",
                response_time=response_time,
                exception=e,
            )
    
    def on_stop(self):
        self.ws.close()
```

### 3. 数据库测试集成
```python
from locust import User, task, between
import pymysql
import time

class DatabaseUser(User):
    wait_time = between(0.1, 0.5)
    
    def on_start(self):
        self.connection = pymysql.connect(
            host='localhost',
            user='testuser',
            password='testpass',
            database='testdb'
        )
    
    @task
    def query_users(self):
        start_time = time.time()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("SELECT * FROM users LIMIT 10")
                result = cursor.fetchall()
                
            response_time = int((time.time() - start_time) * 1000)
            events.request_success.fire(
                request_type="SQL",
                name="query_users",
                response_time=response_time,
                response_length=len(result),
            )
        except Exception as e:
            response_time = int((time.time() - start_time) * 1000)
            events.request_failure.fire(
                request_type="SQL",
                name="query_users", 
                response_time=response_time,
                exception=e,
            )
```

## 🛠️ 配置和管理功能

### 1. 配置文件支持
```python
# locust.conf
locustfile = locustfiles/api_test.py
host = http://api.example.com
users = 100
spawn-rate = 10
run-time = 10m
headless = true
csv = results/api_test
html = results/report.html
loglevel = INFO
```

### 2. 环境变量配置
```python
import os
from locust import HttpUser, task

class ConfigurableUser(HttpUser):
    host = os.getenv("TARGET_HOST", "http://default-host.com")
    
    @task
    def test_endpoint(self):
        api_key = os.getenv("API_KEY", "default-key")
        self.client.get("/api", headers={"Authorization": f"Bearer {api_key}"})
```

### 3. 命令行参数扩展
```python
from locust import events

@events.init_command_line_parser.add_listener
def add_custom_arguments(parser):
    parser.add_argument("--test-environment", type=str, default="staging")
    parser.add_argument("--test-duration", type=int, default=300)

@events.test_start.add_listener
def setup_test(environment, **kwargs):
    test_env = environment.parsed_options.test_environment
    duration = environment.parsed_options.test_duration
    print(f"测试环境: {test_env}, 持续时间: {duration}秒")
```

## 📊 高级特性

### 1. 参数化测试数据
```python
import csv
import random

class ParameterizedUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.test_data = self.load_test_data()
    
    def load_test_data(self):
        with open('test_data.csv', 'r') as f:
            reader = csv.DictReader(f)
            return list(reader)
    
    @task
    def parameterized_request(self):
        if self.test_data:
            data = random.choice(self.test_data)
            self.client.post("/api/users", json={
                "name": data["name"],
                "email": data["email"],
                "age": int(data["age"])
            })
```

### 2. 动态任务分配
```python
from locust import HttpUser, task, TaskSet

class DynamicTaskUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def dynamic_tasks(self):
        # 根据条件动态选择任务
        if random.random() < 0.7:
            self.client.get("/api/public")
        else:
            self.client.get("/api/private")
    
    @task
    class DynamicTaskSet(TaskSet):
        def on_start(self):
            self.task_weights = self.get_task_weights()
        
        def get_task_weights(self):
            # 从外部API获取任务权重
            response = self.parent.client.get("/api/task-weights")
            return response.json()
        
        @task
        def weighted_task(self):
            # 根据动态权重执行任务
            pass
```

### 3. 自定义统计分组
```python
class CustomGroupingUser(HttpUser):
    @task
    def get_user_profile(self):
        user_id = random.randint(1, 1000)
        # 使用 name 参数自定义统计分组
        self.client.get(f"/users/{user_id}/profile", name="/users/{id}/profile")
    
    @task  
    def search_products(self):
        query = random.choice(["laptop", "phone", "tablet"])
        # 相同的 name 会被分组统计
        self.client.get(f"/search?q={query}", name="/search")
```

## 🎪 总结：Locust 功能全景图

| 功能类别       | 核心功能                               | 应用场景                     |
| -------------- | -------------------------------------- | ---------------------------- |
| **用户模拟**   | 任务定义、等待时间、生命周期钩子       | 模拟真实用户行为             |
| **负载控制**   | 负载形状、步进测试、波浪负载           | 压力测试、峰值测试、耐力测试 |
| **分布式测试** | Master-Worker 架构、数据共享           | 大规模并发测试               |
| **监控报告**   | Web UI、CSV/HTML/JSON 报告、自定义指标 | 实时监控、结果分析           |
| **协议扩展**   | HTTP/WebSocket/数据库等自定义客户端    | 多协议支持                   |
| **集成扩展**   | 事件系统、外部系统集成、配置管理       | CI/CD 集成、自动化测试       |
| **高级特性**   | 参数化、动态任务、统计分组             | 复杂测试场景                 |

**Locust 的核心优势：**
- ✅ **代码驱动**：使用 Python 代码定义测试，灵活强大
- ✅ **可扩展性**：丰富的事件系统和插件机制
- ✅ **分布式支持**：轻松扩展到数千台机器
- ✅ **实时监控**：直观的 Web 界面和详细报告
- ✅ **轻量级**：单机也能模拟大量并发用户
- ✅ **开源免费**：完全免费，社区活跃

无论是简单的 API 测试还是复杂的业务场景模拟，Locust 都能提供强大的支持，是现代性能测试的优选工具。