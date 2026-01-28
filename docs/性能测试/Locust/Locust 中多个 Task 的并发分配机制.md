# Locust 中多个 Task 的并发分配机制

这是一个很好的问题！在 Locust 中，当你有多个 task 并且设置了 100 并发用户时，**每个 task 并没有固定的并发数**，而是基于概率和调度机制动态分配的。

## 核心原理

### 1. Task 选择机制

Locust 使用**加权随机选择**来决定每个用户下一次执行哪个 task：

```python
from locust import HttpUser, task, between

class ExampleUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)  # 权重为 3
    def high_frequency_task(self):
        self.client.get("/api/high_freq")
    
    @task(2)  # 权重为 2  
    def medium_frequency_task(self):
        self.client.get("/api/medium_freq")
    
    @task(1)  # 权重为 1（默认）
    def low_frequency_task(self):
        self.client.get("/api/low_freq")
```

**权重计算：**
- 总权重 = 3 + 2 + 1 = 6
- 每个 task 被选中的概率：
  - `high_frequency_task`: 3/6 = 50%
  - `medium_frequency_task`: 2/6 ≈ 33%
  - `low_frequency_task`: 1/6 ≈ 17%

### 2. 并发用户的行为模式

100 个并发用户，每个用户的行为：

```
用户1: taskA → wait → taskB → wait → taskA → ...
用户2: taskB → wait → taskC → wait → taskA → ...
用户3: taskA → wait → taskA → wait → taskC → ...
...
用户100: taskC → wait → taskB → wait → taskB → ...
```

## 实际并发计算

### 场景分析

假设有 3 个 task，权重分别为 3、2、1，100 个并发用户：

```python
from locust import HttpUser, task, between
import time

class MultiTaskUser(HttpUser):
    wait_time = between(1, 2)  # 每个请求后等待1-2秒
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.task_count = {"high": 0, "medium": 0, "low": 0}
    
    @task(3)
    def high_frequency_task(self):
        self.task_count["high"] += 1
        # 假设这个任务执行时间较短：0.1秒
        self.client.get("/api/fast", name="high_freq")
    
    @task(2)  
    def medium_frequency_task(self):
        self.task_count["medium"] += 1
        # 假设这个任务执行时间中等：0.3秒  
        self.client.get("/api/medium", name="medium_freq")
    
    @task(1)
    def low_frequency_task(self):
        self.task_count["low"] += 1
        # 假设这个任务执行时间较长：0.5秒
        self.client.get("/api/slow", name="low_freq")
```

### 并发估算

**计算每个用户的循环时间：**
- 平均等待时间：1.5 秒
- 任务执行时间（加权平均）：约 0.23 秒
- 每个循环 ≈ 1.73 秒

**每秒总请求数估算：**
- 100 用户 × (1 请求 / 1.73 秒) ≈ 58 RPS

**每个 task 的 RPS 估算：**
- `high_frequency_task`: 58 × 50% ≈ 29 RPS
- `medium_frequency_task`: 58 × 33% ≈ 19 RPS  
- `low_frequency_task`: 58 × 17% ≈ 10 RPS

**瞬时并发数（同时执行的用户数）：**
由于每个任务执行时间不同，瞬时并发数会动态变化。

## 验证方法

### 方法1：通过 Locust Web UI 监控

在 Locust Web 界面中，你可以看到：
- **Statistics 标签页**：显示每个 task 的实时 RPS
- **Charts 标签页**：显示每个 task 的请求数趋势

### 方法2：添加自定义监控

```python
from locust import HttpUser, task, between, events
from collections import defaultdict
import time

# 全局并发计数器
concurrent_tasks = defaultdict(int)
task_lock = False

@events.request.add_listener
def on_task_start(request_type, name, response_time, response_length, **kwargs):
    global concurrent_tasks
    concurrent_tasks[name] += 1
    print(f"🚀 Task {name} started. Current concurrent: {concurrent_tasks}")

@events.request.add_listener  
def on_task_complete(request_type, name, response_time, response_length, response, **kwargs):
    global concurrent_tasks
    concurrent_tasks[name] = max(0, concurrent_tasks[name] - 1)
    print(f"✅ Task {name} completed. Current concurrent: {concurrent_tasks}")

class MonitoredUser(HttpUser):
    wait_time = between(1, 2)
    
    @task(3)
    def task_high(self):
        self.client.get("/api/high", name="high_task")
    
    @task(2)
    def task_medium(self):
        self.client.get("/api/medium", name="medium_task") 
    
    @task(1)
    def task_low(self):
        self.client.get("/api/low", name="low_task")
```

### 方法3：使用 Locust Plugins 详细监控

```python
from locust import HttpUser, task, between
from locust_plugins.listeners import PrintListener

class DetailedMonitorUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.task_execution_count = {
            "high": 0, "medium": 0, "low": 0
        }
    
    @task(3)
    def high_freq_task(self):
        self.task_execution_count["high"] += 1
        with self.client.get("/api/high", name="high_task", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                self._log_execution("high")
    
    @task(2)
    def medium_freq_task(self):
        self.task_execution_count["medium"] += 1  
        with self.client.get("/api/medium", name="medium_task", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                self._log_execution("medium")
    
    @task(1)
    def low_freq_task(self):
        self.task_execution_count["low"] += 1
        with self.client.get("/api/low", name="low_task", catch_response=True) as response:
            if response.status_code == 200:
                response.success() 
                self._log_execution("low")
    
    def _log_execution(self, task_type):
        """记录任务执行情况"""
        total = sum(self.task_execution_count.values())
        if total % 50 == 0:  # 每执行50次任务打印一次统计
            print(f"\n=== Task Execution Statistics ===")
            for task, count in self.task_execution_count.items():
                percentage = (count / total) * 100
                print(f"{task}_task: {count} times ({percentage:.1f}%)")
            print("==============================\n")
```

## 影响并发分布的因素

### 1. 任务执行时间差异

```python
class TimeVariantUser(HttpUser):
    wait_time = between(1, 2)
    
    @task(3)
    def fast_task(self):
        # 快速任务，执行时间约0.1秒
        self.client.get("/api/fast", name="fast")
    
    @task(1)  
    def slow_task(self):
        # 慢速任务，执行时间约2秒
        self.client.get("/api/slow", name="slow")
```

在这种情况下，虽然 `fast_task` 权重更高，但 `slow_task` 由于执行时间长，可能会占用更多并发资源。

### 2. 等待时间策略

```python
from locust import constant, constant_pacing

class DifferentWaitUser(HttpUser):
    # 不同的等待策略会影响并发分布
    wait_time = constant_pacing(1)  # 固定节奏，更稳定的分布
    # wait_time = between(0.1, 3)   # 随机等待，分布更分散
```

### 3. 任务依赖关系

```python
class DependentTaskUser(HttpUser):
    wait_time = between(1, 2)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_data = None
    
    @task(3)
    def login_task(self):
        # 登录任务，必须先执行
        response = self.client.post("/api/login", json={"user": "test"})
        if response.status_code == 200:
            self.session_data = response.json()
    
    @task(5)  
    def data_task(self):
        # 数据操作任务，依赖登录
        if self.session_data:
            self.client.get("/api/data", name="get_data")
        else:
            # 如果没有登录，重新执行登录
            self.login_task()
    
    @task(2)
    def logout_task(self):
        # 登出任务
        if self.session_data:
            self.client.post("/api/logout")
            self.session_data = None
```

## 精确控制并发的方法

如果你需要精确控制每个 task 的并发数，可以使用多个 User 类：

```python
from locust import HttpUser, task, between

class HighConcurrencyUser(HttpUser):
    """专门处理高并发任务"""
    wait_time = between(1, 2)
    
    @task
    def high_freq_task(self):
        self.client.get("/api/high", name="high_task")

class MediumConcurrencyUser(HttpUser):  
    """专门处理中等并发任务"""
    wait_time = between(2, 4)
    
    @task
    def medium_freq_task(self):
        self.client.get("/api/medium", name="medium_task")

class LowConcurrencyUser(HttpUser):
    """专门处理低并发任务"""  
    wait_time = between(3, 6)
    
    @task
    def low_freq_task(self):
        self.client.get("/api/low", name="low_task")
```

然后在 Locust Web UI 中分别设置每个用户类的数量：
- `HighConcurrencyUser`: 50 用户
- `MediumConcurrencyUser`: 30 用户  
- `LowConcurrencyUser`: 20 用户

这样就能精确控制每个 task 的并发用户数。

## 总结

- **Locust 不固定分配每个 task 的并发数**，而是基于权重概率动态分配
- **实际并发取决于**：任务权重、执行时间、等待时间、用户数量
- **监控方法**：使用 Web UI 统计、自定义事件监听、Locust Plugins
- **精确控制**：如果需要固定并发，使用多个 User 类分别控制

在 100 并发用户的情况下，每个 task 的瞬时并发数是一个动态变化的值，但长期来看会趋近于基于权重的概率分布。