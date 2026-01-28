# Locust控制请求量的方法

在Locust中控制最终的请求量可以通过以下几种方式实现：

## 1. **设置运行时间控制**
```bash
# 通过运行时间间接控制请求量
locust -f locustfile.py --host=http://example.com --run-time 5m
# 或
locust -f locustfile.py --host=http://example.com --run-time 1h30m
```

## 2. **使用迭代次数控制**
在Locust任务中通过计数器控制请求次数：

```python
from locust import HttpUser, task, between
import itertools

class MyUser(HttpUser):
    wait_time = between(1, 2.5)
    max_requests_per_user = 100  # 每个用户最多执行100个请求
    
    def on_start(self):
        self.request_count = 0
    
    @task
    def my_task(self):
        if self.request_count >= self.max_requests_per_user:
            self.environment.runner.quit()
            return
        
        self.client.get("/api/test")
        self.request_count += 1
```

## 3. **使用测试停止事件**
通过全局计数器控制总请求量：

```python
from locust import HttpUser, task, between, events
from locust.runners import STATE_STOPPING, STATE_STOPPED, STATE_CLEANUP

total_requests = 0
MAX_REQUESTS = 1000

class MyUser(HttpUser):
    wait_time = between(0.5, 2)
    
    @task
    def my_task(self):
        self.client.get("/api/test")
        
        # 全局请求计数
        global total_requests
        total_requests += 1
        
        if total_requests >= MAX_REQUESTS:
            self.environment.runner.quit()
```

## 4. **使用TaskSequence限制执行次数**
```python
from locust import HttpUser, TaskSet, task, between

class LimitedTaskSet(TaskSet):
    max_iterations = 10  # 最多执行10次
    iteration_count = 0
    
    def on_start(self):
        self.iteration_count = 0
    
    @task
    def my_task(self):
        if self.iteration_count >= self.max_iterations:
            self.interrupt()  # 停止执行该TaskSet
            return
            
        self.client.get("/api/test")
        self.iteration_count += 1

class MyUser(HttpUser):
    tasks = [LimitedTaskSet]
    wait_time = between(1, 3)
```

## 5. **命令行+配置文件组合控制**
```python
# locustfile.py
from locust import HttpUser, task, between, events
import os

class MyUser(HttpUser):
    wait_time = between(0.5, 2)
    
    @task
    def my_task(self):
        self.client.get("/api/test")

# 从环境变量获取最大请求数
max_requests = int(os.getenv("MAX_REQUESTS", "0"))
request_count = 0

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, **kwargs):
    global request_count
    request_count += 1
    
    if max_requests > 0 and request_count >= max_requests:
        from locust.env import Environment
        env = Environment.get_instance()
        env.runner.quit()
```

```bash
# 运行
export MAX_REQUESTS=500
locust -f locustfile.py --headless -u 10 -r 5 --run-time 10m
```

## 6. **使用Headless模式精确控制**
```bash
# 结合用户数、孵化率和运行时间控制
locust -f locustfile.py \
    --headless \
    --host=http://example.com \
    -u 50 \          # 总用户数
    -r 5 \           # 每秒孵化用户数
    --run-time 2m \  # 运行时间
    --only-summary
```

## 7. **进阶：自定义停止条件**
```python
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner, WorkerRunner

class RequestCounter:
    def __init__(self, max_requests):
        self.count = 0
        self.max_requests = max_requests
    
    def increment(self):
        self.count += 1
        return self.count >= self.max_requests

counter = RequestCounter(max_requests=1000)

class MyUser(HttpUser):
    wait_time = between(0.5, 1.5)
    
    @task
    def my_task(self):
        with self.client.get("/api/test", catch_response=True) as response:
            if counter.increment():
                self.environment.runner.stop()

# 分布式运行时的处理
@events.init.add_listener
def on_locust_init(environment, **kwargs):
    if isinstance(environment.runner, MasterRunner):
        # Master节点逻辑
        pass
    elif isinstance(environment.runner, WorkerRunner):
        # Worker节点逻辑
        pass
```

## 推荐方案

1. **精确控制请求次数**：使用方案3（全局计数器）
2. **控制每个用户的请求次数**：使用方案2（用户级计数器）
3. **分布式测试**：使用方案7（分布式计数器）
4. **简单场景**：使用方案1（控制运行时间）

选择哪种方案取决于你的具体需求：是否需要精确控制、是否分布式运行、是否要控制每个用户的请求量等。