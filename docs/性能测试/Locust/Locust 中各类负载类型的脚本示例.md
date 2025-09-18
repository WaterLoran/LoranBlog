# Locust 中各类负载类型的脚本示例

在性能测试中，不同的负载类型可以帮助我们模拟各种真实世界的场景。以下是 Locust 中实现不同类型负载模式的脚本示例：

## 1. 恒定负载（Constant Load）

模拟固定数量的并发用户持续运行。

```python
from locust import HttpUser, task, between

class ConstantLoadUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def visit_homepage(self):
        self.client.get("/")
    
    @task(3)
    def browse_products(self):
        self.client.get("/products")
    
    @task(2)
    def view_product_details(self):
        self.client.get("/product/123")
```

运行方式（使用 Web UI 或命令行设置固定用户数）：
```bash
locust -f constant_load.py --headless --users 100 --spawn-rate 10 -t 10m
```

## 2. 递增负载（Ramp-Up Load）

逐步增加并发用户数，模拟用户逐渐增加的情景。

```python
from locust import HttpUser, task, between
from locust.runners import MasterRunner

class RampUpUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def perform_action(self):
        self.client.get("/api/action")
    
    # 可以使用自定义形状类实现更精确的递增控制
```

使用自定义形状类实现精确的递增控制：

```python
from locust import HttpUser, task, between, LoadTestShape

class RampUpLoadTest(LoadTestShape):
    """
    递增负载形状：
    - 0-1分钟: 0到50用户 (50用户/分钟)
    - 1-3分钟: 50到150用户 (50用户/分钟)
    - 3-5分钟: 150用户保持
    - 5-7分钟: 150到50用户 (50用户/分钟递减)
    - 7-8分钟: 50到0用户
    """
    
    stages = [
        {"duration": 60, "users": 50, "spawn_rate": 50},
        {"duration": 180, "users": 150, "spawn_rate": 50},
        {"duration": 300, "users": 150, "spawn_rate": 10},
        {"duration": 420, "users": 50, "spawn_rate": 50},
        {"duration": 480, "users": 0, "spawn_rate": 50},
    ]
    
    def tick(self):
        run_time = self.get_run_time()
        
        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])
        
        return None

class RampUpUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def perform_action(self):
        self.client.get("/api/action")
```

## 3. 峰值负载（Spike Load）

模拟突然的流量高峰，测试系统在压力下的表现。

```python
from locust import HttpUser, task, between, LoadTestShape

class SpikeLoadTest(LoadTestShape):
    """
    峰值负载测试：
    - 0-2分钟: 正常负载 (50用户)
    - 2-4分钟: 突然高峰 (500用户)
    - 4-6分钟: 恢复正常负载 (50用户)
    """
    
    stages = [
        {"duration": 120, "users": 50, "spawn_rate": 10},
        {"duration": 240, "users": 500, "spawn_rate": 100},
        {"duration": 360, "users": 50, "spawn_rate": 10},
    ]
    
    def tick(self):
        run_time = self.get_run_time()
        
        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])
        
        return None

class SpikeUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task(3)
    def view_content(self):
        self.client.get("/content")
    
    @task
    def perform_action(self):
        self.client.post("/action", json={"action": "test"})
```

## 4. 压力测试负载（Stress Test Load）

不断增加负载直到系统达到极限或崩溃。

```python
from locust import HttpUser, task, between, LoadTestShape

class StressTestLoad(LoadTestShape):
    """
    压力测试：逐步增加负载直到系统极限
    - 每2分钟增加100用户
    - 直到达到1000用户或手动停止
    """
    
    max_users = 1000
    time_per_step = 120  # 2分钟
    users_per_step = 100
    
    def tick(self):
        run_time = self.get_run_time()
        
        current_step = int(run_time / self.time_per_step) + 1
        users = min(current_step * self.users_per_step, self.max_users)
        spawn_rate = self.users_per_step / (self.time_per_step / 60)  # 用户/分钟
        
        if users < self.max_users:
            return (users, spawn_rate)
        
        return (self.max_users, spawn_rate)

class StressTestUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task(5)
    def light_operation(self):
        self.client.get("/api/light")
    
    @task(2)
    def medium_operation(self):
        self.client.get("/api/medium")
    
    @task(1)
    def heavy_operation(self):
        self.client.get("/api/heavy")
```

## 5. 耐力测试负载（Endurance Test Load）

长时间运行稳定负载，检测内存泄漏和稳定性问题。

```python
from locust import HttpUser, task, between

class EnduranceUser(HttpUser):
    wait_time = between(1, 5)
    host = "https://your-app.com"
    
    def on_start(self):
        # 记录开始时间，用于长时间运行测试
        self.start_time = self.environment.runner.stats.start_time
    
    @task(10)
    def common_operation(self):
        self.client.get("/api/common")
    
    @task(3)
    def data_operation(self):
        self.client.get("/api/data")
    
    @task(1)
    def report_operation(self):
        # 每小时执行一次报告生成操作
        current_time = self.environment.runner.stats.start_time
        elapsed_hours = (current_time - self.start_time).total_seconds() / 3600
        
        if elapsed_hours >= 1 and int(elapsed_hours) % 1 == 0:
            self.client.get("/api/report")
```

运行方式（长时间运行）：
```bash
locust -f endurance_test.py --headless --users 100 --spawn-rate 10 -t 8h
```

## 6. 波浪形负载（Wave Load）

模拟周期性的负载波动，如日间高峰和夜间低谷。

```python
from locust import HttpUser, task, between, LoadTestShape
import math

class WaveLoadTest(LoadTestShape):
    """
    波浪形负载：模拟日间高峰和夜间低谷
    使用正弦函数模拟24小时周期
    """
    
    min_users = 20
    max_users = 200
    period = 86400  # 24小时周期（秒）
    
    def tick(self):
        run_time = self.get_run_time()
        
        # 使用正弦函数计算当前用户数
        # 将运行时间映射到0-2π区间
        phase = (run_time % self.period) / self.period * 2 * math.pi
        
        # 正弦波，中午达到高峰，午夜达到低谷
        users = self.min_users + (self.max_users - self.min_users) * (math.sin(phase - math.pi/2) + 1) / 2
        
        # 确保用户数在合理范围内
        users = max(self.min_users, min(self.max_users, users))
        
        return (int(users), 10)  # 固定生成速率

class WaveUser(HttpUser):
    wait_time = between(1, 5)
    host = "https://your-app.com"
    
    @task(5)
    def daytime_operation(self):
        self.client.get("/api/day")
    
    @task(2)
    def nighttime_operation(self):
        self.client.get("/api/night")
    
    @task(1)
    def special_operation(self):
        # 在特定时间执行特殊操作
        run_time = self.environment.runner.stats.start_time
        hour = run_time.hour
        
        if 9 <= hour <= 17:  # 工作时间
            self.client.get("/api/work")
```

## 7. 基于事件的负载（Event-Based Load）

根据外部事件或条件动态调整负载。

```python
from locust import HttpUser, task, between
from locust.runners import MasterRunner, WorkerRunner
import requests
import time

class EventBasedUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def standard_operation(self):
        self.client.get("/api/standard")
    
    def on_start(self):
        # 只在主节点上运行事件监测
        if isinstance(self.environment.runner, MasterRunner):
            self.monitor_events()
    
    def monitor_events(self):
        """监测外部事件并调整负载"""
        import threading
        
        def event_monitor():
            while True:
                # 检查外部事件源（API、文件、消息队列等）
                try:
                    response = requests.get("http://event-source/status")
                    event_data = response.json()
                    
                    # 根据事件调整负载
                    if event_data.get("high_load_event"):
                        # 触发高负载事件
                        self.trigger_high_load()
                    elif event_data.get("maintenance_event"):
                        # 触发维护事件，减少负载
                        self.trigger_low_load()
                    
                except Exception as e:
                    print(f"事件监测错误: {e}")
                
                time.sleep(30)  # 每30秒检查一次
        
        # 启动事件监测线程
        thread = threading.Thread(target=event_monitor)
        thread.daemon = True
        thread.start()
    
    def trigger_high_load(self):
        """触发高负载事件"""
        # 通过Locust的API或直接修改runner状态来增加负载
        print("触发高负载事件")
        # 实际实现可能需要使用Locust的HTTP API或直接访问runner属性
    
    def trigger_low_load(self):
        """触发低负载事件"""
        print("触发低负载事件")
        # 实现负载减少逻辑
```

## 8. 混合负载模式（Mixed Load Pattern）

结合多种负载模式，模拟更真实的场景。

```python
from locust import HttpUser, task, between, LoadTestShape

class MixedLoadTest(LoadTestShape):
    """
    混合负载模式：
    - 工作日白天：波浪形负载
    - 工作日晚上：中等恒定负载
    - 周末：低恒定负载
    - 特殊事件：随机峰值
    """
    
    def tick(self):
        run_time = self.get_run_time()
        # 这里可以根据实际时间模拟不同的负载模式
        
        # 示例实现：简单交替不同负载模式
        cycle_time = run_time % 3600  # 每小时一个周期
        
        if cycle_time < 1200:  # 0-20分钟：递增负载
            users = min(200, 10 + cycle_time / 6)  # 每分钟增加10用户
            return (int(users), 10)
        elif cycle_time < 2400:  # 20-40分钟：恒定负载
            return (200, 10)
        else:  # 40-60分钟：递减负载
            users = max(10, 200 - (cycle_time - 2400) / 6)  # 每分钟减少10用户
            return (int(users), 10)

class MixedLoadUser(HttpUser):
    wait_time = between(1, 5)
    host = "https://your-app.com"
    
    @task(5)
    def common_operation(self):
        self.client.get("/api/common")
    
    @task(3)
    def data_operation(self):
        self.client.get("/api/data")
    
    @task(1)
    def resource_operation(self):
        self.client.get("/api/resource")
```

## 使用建议

1. **选择合适的负载类型**：根据测试目标选择最合适的负载模式。
2. **逐步增加负载**：特别是对于新系统，从低负载开始逐步增加。
3. **监控系统指标**：在测试期间密切监控应用和基础设施的关键指标。
4. **记录测试配置**：确保记录每次测试的负载模式和相关参数。
5. **结合真实数据**：使用真实的生产流量模式和数据来设计负载测试。
6. **考虑恢复测试**：在高峰负载后测试系统的恢复能力。

这些负载模式可以单独使用，也可以组合使用，以创建更复杂和真实的测试场景。根据你的具体需求，你可能需要调整这些示例以适应你的测试环境。