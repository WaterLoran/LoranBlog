# Locust 核心对象详解

## **1. SequentialTaskSet - 顺序任务集**

```python
from locust import SequentialTaskSet, task, HttpUser, between

class MySequentialTaskSet(SequentialTaskSet):
    """
    按顺序执行任务，每个任务执行一次后进入下一个
    适合模拟用户按固定流程操作
    """
    
    def on_start(self):
        """在任务序列开始前执行"""
        print("开始顺序任务流程")
    
    @task
    def first_step(self):
        """第一步"""
        self.client.get("/login")
        print("执行第一步: 登录")
    
    @task
    def second_step(self):
        """第二步"""
        self.client.post("/search", json={"query": "test"})
        print("执行第二步: 搜索")
    
    @task
    def third_step(self):
        """第三步"""
        self.client.get("/checkout")
        print("执行第三步: 结账")
    
    def on_stop(self):
        """在任务序列结束后执行"""
        print("顺序任务流程结束")

class SequentialUser(HttpUser):
    tasks = [MySequentialTaskSet]
    wait_time = between(1, 2)
```

**特点**：
- 任务按定义顺序执行
- 每个任务执行一次
- 执行完所有任务后，用户会停止
- 适合工作流测试

## **2. MarkovTaskSet - 马尔可夫任务集**

```python
"""
注意：标准Locust库中没有MarkovTaskSet
这是第三方扩展或自定义实现的概念
但我们可以理解其设计思想
"""

# 概念示例（非实际API）
class MarkovTaskSetConcept:
    """
    基于马尔可夫链的任务集
    任务之间的转换有概率分布
    """
    
    # 转移概率矩阵
    transition_matrix = {
        "task1": {"task2": 0.6, "task3": 0.4},
        "task2": {"task1": 0.3, "task3": 0.7},
        "task3": {"task1": 0.5, "task2": 0.5}
    }
```

**用途**：
- 模拟更真实用户行为
- 基于概率的任务切换
- 需要自定义实现

## **3. transition / transitions - 任务转移**

```python
"""
这两个也不是标准Locust API
通常是自定义实现的一部分
"""
from random import random

class CustomTaskSet:
    """自定义任务转移逻辑"""
    
    def get_next_task(self):
        """根据概率选择下一个任务"""
        current_task = self.current_task
        
        # 转移概率定义
        transitions = {
            "browse": {"browse": 0.7, "search": 0.2, "checkout": 0.1},
            "search": {"browse": 0.3, "search": 0.5, "checkout": 0.2},
            "checkout": {"browse": 0.8, "search": 0.1, "order": 0.1}
        }
        
        # 根据概率选择
        rand = random()
        cumulative = 0
        for next_task, prob in transitions[current_task].items():
            cumulative += prob
            if rand <= cumulative:
                return next_task
```

## **4. wait_time - 等待时间控制**

```python
from locust import HttpUser, task
from locust.wait_time import between, constant, constant_pacing

# 方式1: 使用between - 随机等待
class RandomWaitUser(HttpUser):
    wait_time = between(1, 5)  # 1到5秒随机等待
    # 每次任务后等待1-5秒
    
    @task
    def my_task(self):
        self.client.get("/api")

# 方式2: 使用constant - 固定等待
class ConstantWaitUser(HttpUser):
    wait_time = constant(3)  # 固定等待3秒
    
    @task
    def my_task(self):
        self.client.get("/api")

# 方式3: 使用constant_pacing - 恒定节奏
class ConstantPacingUser(HttpUser):
    wait_time = constant_pacing(10)  # 每个任务间隔10秒（包括执行时间）
    """
    如果任务执行耗时2秒，则等待8秒
    如果任务执行耗时15秒，则立即执行下一个（等待0秒）
    确保每个任务+等待总共10秒
    """
    
    @task
    def my_task(self):
        self.client.get("/api")

# 方式4: 自定义等待函数
from locust import between

class CustomWaitUser(HttpUser):
    # 自定义等待时间函数
    def wait_time(self):
        import random
        import time
        hour = time.localtime().tm_hour
        
        # 根据时间调整等待时间
        if 9 <= hour <= 17:  # 工作时间
            return random.uniform(0.5, 2)
        else:  # 非工作时间
            return random.uniform(2, 10)
    
    @task
    def my_task(self):
        self.client.get("/api")
```

## **5. task - 任务装饰器**

```python
from locust import HttpUser, task, between, TaskSet

class MyUser(HttpUser):
    wait_time = between(1, 3)
    
    # 方式1: 使用装饰器定义任务
    @task
    def task1(self):
        """普通任务"""
        self.client.get("/api/1")
    
    # 方式2: 带权重的任务
    @task(3)  # 权重为3，执行频率更高
    def task2(self):
        """权重为3的任务"""
        self.client.get("/api/2")
    
    # 方式3: 使用类属性定义任务
    tasks = {
        task1: 1,  # 权重为1
        task2: 3,  # 权重为3
        # 概率: task1 - 25%, task2 - 75%
    }
    
    # 方式4: 嵌套TaskSet作为任务
    @task
    class NestedTasks(TaskSet):
        @task
        def nested_task(self):
            self.client.get("/api/nested")

# 方式5: 使用列表定义任务
class ListTaskUser(HttpUser):
    wait_time = between(1, 3)
    
    def task_a(self):
        self.client.get("/api/a")
    
    def task_b(self):
        self.client.get("/api/b")
    
    # 使用列表定义任务和权重
    tasks = [
        (task_a, 2),  # 权重2
        (task_b, 1),  # 权重1
    ]
```

## **6. tag - 标签装饰器**

```python
from locust import HttpUser, task, tag, between

class TaggedUser(HttpUser):
    wait_time = between(1, 2)
    
    @task
    @tag("auth", "critical")  # 多个标签
    def login(self):
        """认证相关任务"""
        self.client.post("/login", json={"user": "test"})
    
    @task
    @tag("api", "read")
    def get_data(self):
        """读取数据任务"""
        self.client.get("/api/data")
    
    @task
    @tag("api", "write")
    def post_data(self):
        """写入数据任务"""
        self.client.post("/api/data", json={"value": "test"})
    
    @task
    @tag("ui", "navigation")
    def browse(self):
        """浏览任务"""
        self.client.get("/home")

# 运行命令：只执行特定标签的任务
# locust -f locustfile.py --tags api        # 只执行api标签
# locust -f locustfile.py --tags api read   # 执行api和read标签
# locust -f locustfile.py --exclude-tags ui # 排除ui标签
```

## **7. TaskSet - 任务集合**

```python
from locust import HttpUser, TaskSet, task, between

class BrowseSection(TaskSet):
    """浏览模块任务集"""
    
    @task(2)
    def view_products(self):
        self.client.get("/products")
    
    @task(1)
    def view_categories(self):
        self.client.get("/categories")
    
    @task(1)
    def stop_browsing(self):
        """中断任务集，返回父级"""
        self.interrupt()

class SearchSection(TaskSet):
    """搜索模块任务集"""
    
    def on_start(self):
        """进入任务集时执行"""
        print("开始搜索任务")
    
    @task(3)
    def search(self):
        self.client.get("/search?q=test")
    
    @task(1)
    def advanced_search(self):
        self.client.get("/search/advanced")
    
    def on_stop(self):
        """离开任务集时执行"""
        print("结束搜索任务")

class MainTaskSet(TaskSet):
    """主任务集"""
    
    # 嵌套任务集
    tasks = {
        BrowseSection: 3,  # 权重3
        SearchSection: 2,  # 权重2
    }
    
    @task(1)
    def home_page(self):
        self.client.get("/")

class NestedUser(HttpUser):
    tasks = [MainTaskSet]
    wait_time = between(1, 3)
```

**TaskSet特点**：
- 可以嵌套任务集
- 可以组织相关任务
- 支持中断和返回父级
- 有独立的`on_start`和`on_stop`

## **8. HttpUser - HTTP用户类**

```python
from locust import HttpUser, task, between

class APIClient(HttpUser):
    """
    HttpUser是最常用的用户类
    内置requests.Session风格的HTTP客户端
    """
    wait_time = between(1, 3)
    host = "https://api.example.com"  # 基础URL
    
    def on_start(self):
        """用户启动时执行"""
        # 设置默认头
        self.client.headers = {
            "User-Agent": "Locust Performance Test",
            "Content-Type": "application/json"
        }
        print(f"用户启动，客户端: {self.client}")
    
    @task
    def get_users(self):
        """GET请求示例"""
        # 自动拼接host: https://api.example.com/users
        response = self.client.get("/users")
        
        # 断言响应
        assert response.status_code == 200, f"获取用户失败: {response.status_code}"
        
        # 处理响应数据
        users = response.json()
        print(f"获取到 {len(users)} 个用户")
    
    @task
    def create_user(self):
        """POST请求示例"""
        user_data = {
            "name": f"User_{id(self)}",
            "email": f"user_{id(self)}@example.com"
        }
        
        with self.client.post("/users", json=user_data, catch_response=True) as response:
            if response.status_code == 201:
                response.success()
                print(f"用户创建成功: {response.json()}")
            else:
                response.failure(f"创建失败: {response.status_code}")
    
    @task
    def upload_file(self):
        """文件上传示例"""
        files = {"file": ("test.txt", b"Hello, World!", "text/plain")}
        self.client.post("/upload", files=files)
    
    def on_stop(self):
        """用户停止时执行"""
        print("用户停止")
```

## **9. FastHttpUser - 高性能HTTP用户类**

```python
from locust import FastHttpUser, task, between

class FastAPIClient(FastHttpUser):
    """
    FastHttpUser使用geventhttpclient，性能更高
    适用于高并发场景
    """
    wait_time = between(0.1, 0.5)  # 更短的等待时间，更高的并发
    host = "http://api.example.com"
    
    @task
    def get_request(self):
        """GET请求 - 与HttpUser类似"""
        response = self.client.get("/api/data")
        if response.status_code == 200:
            print(f"响应长度: {len(response.text)}")
    
    @task
    def post_request(self):
        """POST请求 - 注意参数差异"""
        # FastHttpUser的post方法参数略有不同
        response = self.client.post(
            "/api/data",
            json={"test": "data"},  # 直接传递字典
            headers={"Content-Type": "application/json"}
        )
    
    @task
    def streaming_request(self):
        """流式请求处理"""
        with self.client.get("/api/stream", stream=True) as response:
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    # 处理数据块
                    pass

# FastHttpUser vs HttpUser 比较:
# 1. 性能: FastHttpUser > HttpUser
# 2. API兼容性: HttpUser ≈ requests API，FastHttpUser略有不同
# 3. 功能: HttpUser更全面，FastHttpUser更专注于性能
```

## **10. User - 基础用户类**

```python
from locust import User, task, between, events
import time
import socket
import json

class CustomProtocolUser(User):
    """
    User类是基础类，不包含HTTP客户端
    用于测试非HTTP协议（如WebSocket、TCP、自定义协议）
    """
    wait_time = between(1, 3)
    
    def __init__(self, environment):
        super().__init__(environment)
        self.socket = None
        self.connected = False
    
    def on_start(self):
        """连接自定义服务"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect(("localhost", 8080))
            self.connected = True
            print("连接成功")
        except Exception as e:
            print(f"连接失败: {e}")
            self.connected = False
    
    @task
    def send_message(self):
        """发送自定义协议消息"""
        if not self.connected:
            return
        
        message = {
            "type": "request",
            "timestamp": time.time(),
            "data": "test"
        }
        
        # 记录请求开始时间
        start_time = time.time()
        
        try:
            # 发送消息
            data = json.dumps(message).encode()
            self.socket.send(data)
            
            # 接收响应
            response = self.socket.recv(1024)
            response_time = (time.time() - start_time) * 1000  # 毫秒
            
            # 触发事件
            events.request.fire(
                request_type="CUSTOM",
                name="custom_protocol",
                response_time=response_time,
                response_length=len(response),
                exception=None
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            events.request.fire(
                request_type="CUSTOM",
                name="custom_protocol",
                response_time=response_time,
                response_length=0,
                exception=e
            )
    
    def on_stop(self):
        """清理连接"""
        if self.socket:
            self.socket.close()
```

## **11. between - 等待时间辅助函数**

```python
from locust import between

# between 实际上是 wait_time 模块的一个函数
wait_time = between(1, 5)
# 等价于:
def custom_between(min_wait, max_wait):
    return lambda locust: random.uniform(min_wait, max_wait)

# 使用示例：
class UserWithBetween(HttpUser):
    wait_time = between(0.5, 2.5)  # 等待0.5-2.5秒
    
    @task
    def my_task(self):
        pass
```

## **12. constant - 固定等待时间**

```python
from locust import constant

wait_time = constant(3)  # 固定等待3秒

# 使用场景：
# 1. 需要恒定频率的请求
# 2. 稳定性测试
# 3. 避免随机性影响测试结果

class ConstantWaitUser(HttpUser):
    wait_time = constant(1)  # 每秒最多1个请求
    
    @task
    def request(self):
        self.client.get("/api")
```

## **13. constant_pacing - 恒定节奏**

```python
from locust import constant_pacing

"""
constant_pacing 确保任务执行间隔固定
包括任务执行时间和等待时间
"""
wait_time = constant_pacing(10)  # 每个任务周期10秒

class PacingUser(HttpUser):
    wait_time = constant_pacing(5)  # 5秒一个周期
    
    @task
    def fast_task(self):
        # 如果执行耗时1秒，则等待4秒
        self.client.get("/fast")
    
    @task
    def slow_task(self):
        # 如果执行耗时6秒，则等待0秒（立即执行下一个）
        self.client.get("/slow")
```

## **14. constant_throughput - 恒定吞吐量**

```python
from locust import constant_throughput

"""
constant_throughput 确保每秒任务数不超过指定值
基于用户数计算等待时间
"""
wait_time = constant_throughput(10)  # 每个用户每秒最多10个任务

class ThroughputUser(HttpUser):
    wait_time = constant_throughput(5)  # 每个用户每秒5个任务
    
    @task
    def my_task(self):
        self.client.get("/api")

# 计算逻辑：
# 如果有10个用户，constant_throughput(5) 意味着：
# 系统总吞吐量目标：10用户 × 5任务/秒 = 50任务/秒
# 每个用户的等待时间会自动调整以达到这个目标
```

## **15. events - 事件系统**

```python
from locust import events
import time
import json
import logging

# 1. 测试级别事件
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """测试开始时触发"""
    print(f"测试开始: {time.ctime()}")
    logging.info("负载测试开始")
    
    # 可以在这里初始化全局数据
    environment.shared_data = {
        "start_time": time.time(),
        "total_requests": 0
    }

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """测试结束时触发"""
    duration = time.time() - environment.shared_data["start_time"]
    print(f"测试结束，总时长: {duration:.2f}秒")
    logging.info(f"负载测试结束，总请求数: {environment.shared_data['total_requests']}")

# 2. 请求级别事件
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """每个请求完成后触发"""
    if exception:
        print(f"请求失败: {name}, 错误: {exception}")
    else:
        print(f"请求成功: {name}, 耗时: {response_time}ms")
    
    # 更新统计
    environment = kwargs.get("environment")
    if environment and hasattr(environment, "shared_data"):
        environment.shared_data["total_requests"] += 1

# 3. 用户级别事件
@events.user_spawning_complete.add_listener
def on_user_spawning_complete(user_count, **kwargs):
    """用户生成完成时触发"""
    print(f"用户生成完成，总数: {user_count}")

@events.spawning_complete.add_listener
def on_spawning_complete(user_count, **kwargs):
    """用户孵化完成时触发"""
    print(f"孵化完成，总用户数: {user_count}")

# 4. 自定义事件
my_custom_event = events.EventHook()

@my_custom_event.add_listener
def on_custom_event(message, **kwargs):
    """自定义事件监听器"""
    print(f"自定义事件: {message}")

# 触发自定义事件
def trigger_custom_event():
    my_custom_event.fire(message="Hello from custom event!")

# 5. 错误事件
@events.user_error.add_listener
def on_user_error(user_instance, exception, tb, **kwargs):
    """用户发生错误时触发"""
    print(f"用户错误: {exception}")
    logging.error(f"用户错误: {exception}", exc_info=True)

# 6. 初始化事件
@events.init.add_listener
def on_locust_init(environment, **kwargs):
    """Locust初始化时触发"""
    print(f"Locust初始化: {environment.host}")
    
    # 添加命令行参数
    environment.parsed_options.my_custom_option = "custom_value"

# 使用事件的完整示例
class EventUser(HttpUser):
    host = "http://example.com"
    
    @task
    def trigger_events(self):
        # 触发请求事件（自动）
        response = self.client.get("/api")
        
        # 触发自定义事件
        my_custom_event.fire(
            message="Task completed",
            user_id=id(self),
            response_time=response.elapsed.total_seconds()
        )
```

## **16. LoadTestShape - 负载形状控制**

```python
from locust import LoadTestShape
import time

class CustomLoadShape(LoadTestShape):
    """
    自定义负载形状
    控制用户数和孵化率随时间变化
    """
    
    # 时间段定义：每个元组是 (时间点, 用户数, 孵化率)
    stages = [
        {"duration": 60, "users": 10, "spawn_rate": 10},   # 0-60秒: 10用户
        {"duration": 120, "users": 50, "spawn_rate": 5},   # 60-180秒: 增加到50用户
        {"duration": 180, "users": 100, "spawn_rate": 10}, # 180-360秒: 增加到100用户
        {"duration": 120, "users": 30, "spawn_rate": 10},  # 360-480秒: 减少到30用户
        {"duration": 60, "users": 10, "spawn_rate": 10},   # 480-540秒: 减少到10用户
    ]
    
    def tick(self):
        """每秒调用一次，返回 (用户数, 孵化率) 或 None停止测试"""
        run_time = self.get_run_time()
        
        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])
        
        return None  # 停止测试

class WaveLoadShape(LoadTestShape):
    """波浪形负载"""
    
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time < 600:  # 10分钟
            # 正弦波：最小10用户，最大100用户，周期120秒
            users = 50 + 50 * (run_time % 120) / 120
            spawn_rate = 20
            return (int(users), spawn_rate)
        
        return None

class StepLoadShape(LoadTestShape):
    """阶梯式负载"""
    
    step_time = 60  # 每60秒增加一次
    step_load = 20  # 每次增加20用户
    spawn_rate = 10
    
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time < 300:  # 5分钟
            current_step = int(run_time / self.step_time) + 1
            users = current_step * self.step_load
            return (users, self.spawn_rate)
        
        return None

# 使用负载形状
# locust -f locustfile.py --host=http://example.com --headless -u 1 -r 1 --run-time 10m
# 注意：在Headless模式下，LoadTestShape会自动生效
```

## **17. run_single_user - 单用户运行**

```python
from locust import HttpUser, task, run_single_user
import time

class DebugUser(HttpUser):
    host = "http://localhost:8080"
    
    @task
    def debug_task(self):
        start = time.time()
        response = self.client.get("/api/debug")
        elapsed = time.time() - start
        
        print(f"响应时间: {elapsed:.3f}s")
        print(f"状态码: {response.status_code}")
        print(f"响应内容: {response.text[:100]}...")

# 直接运行单个用户（调试用）
if __name__ == "__main__":
    run_single_user(DebugUser)
    
# 运行方式：
# 1. python locustfile.py (直接运行脚本)
# 2. 或者正常启动Locust，但只设置1个用户

# 用途：
# - 调试脚本
# - 验证请求逻辑
# - 单用户性能测试
```

## **18. HttpLocust - 旧版HTTP用户类**

```python
"""
HttpLocust 是 Locust 0.x 版本的类
Locust 1.0+ 已重命名为 HttpUser
保持向后兼容，但不推荐使用
"""

# 旧版代码示例（不推荐）
from locust import HttpLocust, TaskSet, task

class OldUserBehavior(TaskSet):
    @task
    def old_task(self):
        self.client.get("/old/api")

class OldHttpLocustUser(HttpLocust):
    task_set = OldUserBehavior  # 旧版使用task_set属性
    min_wait = 1000  # 旧版等待时间设置方式
    max_wait = 5000

# 迁移到新版：
# 1. HttpLocust -> HttpUser
# 2. task_set -> tasks
# 3. min_wait/max_wait -> wait_time = between(min, max)
```

## **19. Locust - 旧版基础用户类**

```python
"""
Locust 类在 0.x 版本中是基础用户类
1.0+ 版本重命名为 User
"""

# 旧版代码（不推荐）
from locust import Locust, TaskSet, task

class OldTaskSet(TaskSet):
    @task
    def old_task(self):
        print("Old task")

class OldLocustUser(Locust):
    task_set = OldTaskSet
    min_wait = 1000
    max_wait = 3000

# 新版对应写法
from locust import User, task, between

class NewUser(User):
    wait_time = between(1, 3)
    
    @task
    def new_task(self):
        print("New task")
```

## **20. 完整示例：综合使用**

```python
from locust import HttpUser, task, between, tag, events, SequentialTaskSet
import time
import json

# 事件监听器
@events.test_start.add_listener
def setup_test(environment, **kwargs):
    print(f"测试开始，目标主机: {environment.host}")

# 顺序任务集
class PurchaseWorkflow(SequentialTaskSet):
    
    @task
    @tag("flow", "start")
    def visit_homepage(self):
        self.client.get("/")
    
    @task
    @tag("flow", "browse")
    def browse_products(self):
        self.client.get("/products")
    
    @task
    @tag("flow", "select")
    def select_product(self):
        self.client.get("/products/1")
    
    @task
    @tag("flow", "purchase")
    def make_purchase(self):
        self.client.post("/checkout", json={"product_id": 1})
    
    @task
    def complete_flow(self):
        print("购买流程完成")
        self.interrupt()

# 主用户类
class ECommerceUser(HttpUser):
    host = "https://api.example.com"
    wait_time = between(1, 3)
    
    # 混合使用任务：75%概率执行随机任务，25%概率执行购买流程
    tasks = {
        browse_site: 3,
        PurchaseWorkflow: 1
    }
    
    def browse_site(self):
        """浏览网站任务"""
        self.client.get("/api/products")
        time.sleep(0.5)
        self.client.get("/api/categories")

# 负载形状
class PeakLoadShape:
    """高峰时段负载"""
    
    def tick(self):
        run_time = time.time() % 86400  # 一天中的秒数
        
        # 模拟早晚高峰
        if 36000 < run_time < 39600:  # 10:00-11:00
            return (1000, 100)  # 1000用户，孵化率100
        elif 61200 < run_time < 64800:  # 17:00-18:00
            return (800, 80)
        else:
            return (200, 20)

if __name__ == "__main__":
    # 调试模式运行
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--debug":
        from locust import run_single_user
        run_single_user(ECommerceUser)
```

## **总结对比**

| 对象/函数             | 用途                 | 版本变化    |
| --------------------- | -------------------- | ----------- |
| `HttpUser`            | HTTP协议测试，最常用 | 1.0+ 推荐   |
| `FastHttpUser`        | 高性能HTTP测试       | 1.0+ 推荐   |
| `User`                | 自定义协议测试基础类 | 1.0+ 推荐   |
| `TaskSet`             | 任务分组和组织       | 一直可用    |
| `SequentialTaskSet`   | 顺序执行任务         | 一直可用    |
| `task`                | 定义任务             | 一直可用    |
| `tag`                 | 任务标签过滤         | 1.0+        |
| `wait_time`           | 控制等待时间         | 一直可用    |
| `between`             | 随机等待时间         | 一直可用    |
| `constant`            | 固定等待时间         | 一直可用    |
| `constant_pacing`     | 恒定节奏             | 一直可用    |
| `constant_throughput` | 恒定吞吐量           | 一直可用    |
| `events`              | 事件系统             | 一直可用    |
| `LoadTestShape`       | 自定义负载形状       | 1.0+        |
| `run_single_user`     | 单用户调试           | 1.0+        |
| `HttpLocust`          | 旧版HTTP用户         | 0.x，不推荐 |
| `Locust`              | 旧版基础用户         | 0.x，不推荐 |

**推荐实践**：
1. 新项目使用 `HttpUser` 或 `FastHttpUser`
2. 使用 `@task` 和 `@tag` 组织任务
3. 使用 `events` 进行监控和扩展
4. 使用 `LoadTestShape` 进行复杂负载场景
5. 使用 `run_single_user` 进行调试