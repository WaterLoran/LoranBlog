# Locust 中的各类数据对象及其关系

## **1. 核心对象层级结构**

```
Environment
├── Runner
├── User Classes (负载用户类)
│   ├── User instances (负载用户实例)
│   │   ├── TaskSet (任务集)
│   │   │   ├── Tasks (任务)
│   │   │   └── Sub-TaskSet (嵌套任务集)
│   │   └── State (用户状态)
│   └── Client (客户端，如 HttpUser 的 HTTP 客户端)
├── Stats (统计)
├── Events (事件系统)
└── Web UI (Web界面)
```

## **2. 主要对象详解**

### **2.1 Environment（环境对象）**
这是 Locust 的核心容器，管理整个测试运行环境。

```python
from locust import Environment

# 环境配置示例
env = Environment(
    user_classes=[WebsiteUser, ApiUser],  # 用户类列表
    events=events,                         # 事件处理器
    host="http://example.com"              # 基础URL
)

# 常用属性
print(env.runner)      # Runner对象
print(env.stats)       # 统计对象
print(env.web_ui)      # Web UI对象
```

### **2.2 User Class（用户类）**
定义模拟用户的行为模式。

```python
from locust import HttpUser, task, between, constant

class WebsiteUser(HttpUser):
    # 基础属性
    host = "http://example.com"     # 目标主机
    wait_time = between(1, 3)       # 任务间等待时间
    weight = 3                       # 权重（相对于其他用户类）
    
    # 可选：用户初始化
    def on_start(self):
        """用户启动时执行"""
        self.login()
    
    # 可选：用户停止
    def on_stop(self):
        """用户停止时执行"""
        self.logout()
    
    # 任务定义
    @task(3)  # 权重为3
    def view_homepage(self):
        self.client.get("/")
    
    @task(1)  # 权重为1
    def view_about(self):
        self.client.get("/about")
    
    # 自定义属性
    def login(self):
        self.token = "user_token"
        self.user_id = 123
```

### **2.3 User Instance（用户实例）**
运行时创建的每个虚拟用户都是一个独立的实例。

```python
# 每个用户实例都有：
user = WebsiteUser(environment=env)
print(user.environment)  # 环境引用
print(user.client)       # HTTP客户端（HttpUser特有）
print(user.wait_time)    # 等待时间策略
print(user.id)           # 用户唯一ID
```

### **2.4 TaskSet（任务集对象）**
组织和管理一组相关任务。

```python
from locust import TaskSet, task

class UserBehavior(TaskSet):
    # 任务权重
    @task(3)
    def browse_products(self):
        self.client.get("/products")
    
    @task(1)
    class CartTasks(TaskSet):  # 嵌套TaskSet
        @task(2)
        def view_cart(self):
            self.client.get("/cart")
        
        @task(1)
        def checkout(self):
            self.client.get("/checkout")
        
        @task
        def stop(self):  # 返回到父TaskSet
            self.interrupt()
    
    @task
    def logout(self):
        self.client.get("/logout")
```

### **2.5 HttpUser vs User**
```python
from locust import User, HttpUser

# HttpUser：内置HTTP客户端
class ApiUser(HttpUser):
    @task
    def call_api(self):
        # 自动有 self.client
        response = self.client.get("/api/data")
        print(response.status_code)

# User：基础用户，无内置客户端
class CustomProtocolUser(User):
    abstract = True  # 抽象基类
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.custom_client = CustomClient()
    
    @task
    def custom_task(self):
        self.custom_client.send_message()
```

## **3. 对象关系与交互**

### **3.1 创建和执行流程**
```python
# 1. Environment 创建
env = Environment(user_classes=[WebsiteUser])

# 2. Runner 启动用户
env.runner.start(100, spawn_rate=10)  # 启动100个用户，每秒10个

# 3. 对每个用户：
#    a. 创建 User 实例
#    b. 调用 on_start()
#    c. 进入任务循环：
#        - 选择任务（按权重）
#        - 执行任务
#        - 等待 wait_time
#        - 重复

# 4. 用户停止：
#    a. 调用 on_stop()
#    b. 销毁实例
```

### **3.2 TaskSet 嵌套与切换**
```python
class MainTaskSet(TaskSet):
    @task
    class SubTaskSet1(TaskSet):
        @task
        def task_a(self):
            pass
        
        @task
        def go_back(self):
            self.interrupt()  # 返回到MainTaskSet
    
    @task
    def switch_to_sub2(self):
        self.schedule_task(self.execute_sub2)  # 动态切换
    
    def execute_sub2(self):
        # 执行一些操作
        pass
```

### **3.3 对象间通信**
```python
class WebsiteUser(HttpUser):
    def on_start(self):
        # 通过环境共享数据
        if "cache" not in self.environment.runner.shared_data:
            self.environment.runner.shared_data["cache"] = {}
        
        # 用户间通信（通过环境）
        self.environment.events.user_success.fire(
            request_type="GET",
            name="/home",
            response_time=100,
            response_length=2000
        )
```

## **4. 状态与统计对象**

### **4.1 统计信息**
```python
# 访问统计信息
stats = env.stats
print(stats.total)  # 总请求统计

# 按名称获取统计
request_stats = stats.get("/api/users", "GET")
print(f"平均响应时间: {request_stats.avg_response_time}ms")
print(f"RPS: {request_stats.current_rps}")

# 错误统计
errors = env.stats.errors
for error in errors:
    print(f"错误: {error.error}, 出现次数: {error.occurences}")
```

### **4.2 用户状态**
```python
class AuthUser(HttpUser):
    def on_start(self):
        # 用户状态
        self.logged_in = False
        self.session_id = None
        self.request_count = 0
    
    @task
    def make_request(self):
        self.request_count += 1
        if self.request_count > 100:
            self.environment.runner.quit()  # 停止当前用户
```

## **5. 事件系统对象**

```python
from locust import events

# 事件监听器
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    print(f"请求: {name}, 响应时间: {response_time}ms")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"测试开始，用户类: {environment.user_classes}")

@events.user_error.add_listener
def on_user_error(user_instance, exception, **kwargs):
    print(f"用户 {user_instance.id} 发生错误: {exception}")
```

## **6. 实际使用示例**

```python
from locust import HttpUser, TaskSet, task, between, constant

# 定义任务集
class BrowseProducts(TaskSet):
    @task(5)
    def view_products(self):
        self.client.get("/products")
        # 父子TaskSet间传递数据
        self.user.product_views += 1
    
    @task(1)
    def search(self):
        self.client.get(f"/search?q={self.user.search_term}")
    
    @task
    def stop_browsing(self):
        self.interrupt()  # 返回到User主任务

# 定义用户类
class EcommerceUser(HttpUser):
    host = "http://shop.example.com"
    wait_time = between(1, 5)
    
    # 任务可以混合TaskSet和直接任务
    tasks = [
        BrowseProducts,  # TaskSet
        checkout,        # 直接函数
    ]
    
    def on_start(self):
        """每个用户实例启动时调用"""
        self.login()
        self.product_views = 0
        self.search_term = "laptop"
        self.cart_items = []
    
    @task(2)
    def checkout(self):
        if self.cart_items:
            self.client.post("/checkout", json={"items": self.cart_items})
    
    def login(self):
        # 登录逻辑
        self.client.post("/login", json={
            "username": f"user_{self.id}",
            "password": "password"
        })
```

## **7. 关键关系总结**

1. **一对多关系**：
   - 一个 `Environment` 包含多个 `User` 类
   - 一个 `User` 类产生多个用户实例
   - 一个用户可以运行多个 `TaskSet`
   - 一个 `TaskSet` 包含多个任务

2. **生命周期**：
   ```
   测试启动 → 创建用户实例 → on_start() → 任务循环 → on_stop() → 销毁实例
   ```

3. **数据流**：
   - 统计数据通过 `Environment.stats` 汇总
   - 事件通过 `Environment.events` 广播
   - 用户状态存储在实例属性中
   - 共享数据通过 `Environment.runner.shared_data` 传递

这些对象共同构成了 Locust 的负载测试框架，每个对象都有其特定的职责，协同工作以模拟真实用户行为并收集性能数据。