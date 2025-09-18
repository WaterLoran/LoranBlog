# Locust 中的控制流脚本示例

在 Locust 中，控制流指的是如何管理和组织虚拟用户的行为流程，包括条件执行、循环、任务选择、错误处理等。以下是 Locust 中各种控制流实现的详细示例：

## 1. 基本任务控制流

### 顺序执行控制

虽然 Locust 默认是随机选择任务，但你可以通过任务设计实现顺序执行：

```python
from locust import HttpUser, task, between

class SequentialUser(HttpUser):
    wait_time = between(1, 2)
    host = "https://your-app.com"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.current_step = 0
        self.steps = [
            self.login,
            self.browse_products,
            self.view_product,
            self.add_to_cart,
            self.checkout,
            self.logout
        ]
    
    @task
    def execute_sequence(self):
        """按顺序执行所有步骤"""
        if self.current_step < len(self.steps):
            self.steps[self.current_step]()
            self.current_step += 1
        else:
            # 完成后重置，重新开始序列
            self.current_step = 0
            self.environment.runner.quit()  # 或者等待一段时间后重新开始
    
    def login(self):
        with self.client.post("/login", {
            "username": "testuser",
            "password": "testpass"
        }, catch_response=True) as response:
            if response.status_code == 200:
                print("登录成功")
            else:
                print("登录失败")
                self.current_step = 0  # 重置序列
    
    def browse_products(self):
        self.client.get("/products")
    
    def view_product(self):
        self.client.get("/product/123")
    
    def add_to_cart(self):
        self.client.post("/cart/add", {"product_id": 123, "quantity": 1})
    
    def checkout(self):
        self.client.post("/checkout", {"payment_method": "credit_card"})
    
    def logout(self):
        self.client.post("/logout")
        print("完成完整流程")
```

## 2. 条件执行控制流

### 基于响应内容的条件执行

```python
from locust import HttpUser, task, between
import json

class ConditionalUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def conditional_flow(self):
        # 第一步：获取用户状态
        with self.client.get("/api/user/status", catch_response=True) as response:
            if response.status_code != 200:
                return  # 终止流程
            
            try:
                data = response.json()
                user_status = data.get("status")
                
                # 根据用户状态决定下一步操作
                if user_status == "new":
                    self.complete_profile()
                elif user_status == "active":
                    self.perform_actions()
                elif user_status == "premium":
                    self.access_premium_features()
                else:
                    self.default_behavior()
                    
            except json.JSONDecodeError:
                response.failure("Invalid JSON response")
    
    def complete_profile(self):
        print("新用户，完善资料")
        self.client.post("/api/profile/complete", {
            "name": "Test User",
            "email": "test@example.com"
        })
    
    def perform_actions(self):
        print("活跃用户，执行常规操作")
        self.client.get("/api/actions")
    
    def access_premium_features(self):
        print("高级用户，访问高级功能")
        self.client.get("/api/premium/features")
    
    def default_behavior(self):
        print("未知状态，执行默认行为")
        self.client.get("/api/default")
```

### 基于环境条件的控制流

```python
from locust import HttpUser, task, between
import random

class EnvironmentAwareUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 模拟环境条件
        self.is_mobile = random.choice([True, False])
        self.network_speed = random.choice(["fast", "medium", "slow"])
    
    @task
    def adaptive_behavior(self):
        # 根据设备类型选择不同的行为
        if self.is_mobile:
            self.mobile_behavior()
        else:
            self.desktop_behavior()
        
        # 根据网络条件调整请求
        if self.network_speed == "slow":
            # 减少数据量或使用简化版本
            self.client.get("/api/lite/content")
        else:
            self.client.get("/api/full/content")
    
    def mobile_behavior(self):
        print("移动设备行为")
        self.client.get("/api/mobile/optimized")
    
    def desktop_behavior(self):
        print("桌面设备行为")
        self.client.get("/api/desktop/full")
```

## 3. 循环控制流

### 固定次数循环

```python
from locust import HttpUser, task, between

class LoopUser(HttpUser):
    wait_time = between(1, 2)
    host = "https://your-app.com"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.loop_count = 0
        self.max_loops = 5  # 最大循环次数
    
    @task
    def limited_loop(self):
        """有限次数的循环"""
        if self.loop_count >= self.max_loops:
            print("完成所有循环")
            return
        
        # 执行循环体内的操作
        self.perform_action()
        self.loop_count += 1
        print(f"已完成 {self.loop_count}/{self.max_loops} 次循环")
    
    def perform_action(self):
        """循环体内执行的操作"""
        self.client.get("/api/action")
        # 可以添加更多操作...
```

### 条件循环

```python
from locust import HttpUser, task, between
import random

class ConditionalLoopUser(HttpUser):
    wait_time = between(1, 2)
    host = "https://your-app.com"
    
    @task
    def conditional_loop(self):
        """基于条件的循环"""
        attempts = 0
        max_attempts = 3
        success = False
        
        # 尝试最多3次，直到成功或达到最大尝试次数
        while attempts < max_attempts and not success:
            attempts += 1
            print(f"尝试第 {attempts} 次")
            
            with self.client.post("/api/operation", catch_response=True) as response:
                if response.status_code == 200:
                    success = True
                    print("操作成功")
                else:
                    print(f"第 {attempts} 次尝试失败")
        
        if not success:
            print("所有尝试都失败了")
```

## 4. 错误处理和重试控制流

### 带重试机制的错误处理

```python
from locust import HttpUser, task, between
import time

class RetryUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def operation_with_retry(self):
        """带重试机制的操作"""
        max_retries = 3
        retry_delay = 1  # 重试延迟（秒）
        
        for attempt in range(max_retries):
            try:
                with self.client.post("/api/sensitive/operation", catch_response=True) as response:
                    if response.status_code == 200:
                        print("操作成功")
                        return  # 成功，退出循环
                    else:
                        raise Exception(f"HTTP错误: {response.status_code}")
            
            except Exception as e:
                print(f"第 {attempt + 1} 次尝试失败: {str(e)}")
                
                if attempt < max_retries - 1:
                    print(f"{retry_delay}秒后重试...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # 指数退避
                else:
                    print("所有重试尝试都失败了")
                    # 可以在这里记录失败或执行备用方案
                    self.fallback_operation()
    
    def fallback_operation(self):
        """重试失败后的备用操作"""
        print("执行备用操作")
        self.client.get("/api/fallback")
```

### 全局错误处理

```python
from locust import HttpUser, task, between, events
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ErrorHandlingUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 注册全局错误处理
        events.request_failure.add_listener(self.on_request_failure)
        events.user_error.add_listener(self.on_user_error)
    
    def on_request_failure(self, request_type, name, response_time, exception, **kwargs):
        """请求失败时的处理"""
        logger.error(f"请求失败: {request_type} {name}, 异常: {exception}")
        
        # 可以根据异常类型执行不同的处理逻辑
        if "ConnectionError" in str(exception):
            logger.warning("连接错误，可能需要检查网络或服务器状态")
        elif "Timeout" in str(exception):
            logger.warning("请求超时，可能需要调整超时设置或优化性能")
    
    def on_user_error(self, user_instance, exception, tb, **kwargs):
        """用户错误时的处理"""
        logger.error(f"用户错误: {exception}")
        logger.debug(f"追踪信息: {tb}")
        
        # 可以选择终止测试或继续
        if "CriticalError" in str(exception):
            logger.critical("发生关键错误，终止测试")
            self.environment.runner.quit()
    
    @task
    def normal_operation(self):
        """正常操作"""
        self.client.get("/api/normal")
    
    @task
    def risky_operation(self):
        """可能失败的操作"""
        try:
            # 可能抛出异常的操作
            result = self.risky_calculation()
            self.client.post("/api/risky", json={"result": result})
        except Exception as e:
            # 手动触发用户错误事件
            self.environment.events.user_error.fire(
                user_instance=self,
                exception=e,
                tb=None
            )
    
    def risky_calculation(self):
        """可能失败的计算"""
        if random.random() < 0.2:  # 20%的概率失败
            raise Exception("计算失败")
        return 42
```

## 5. 状态机控制流

对于复杂的工作流，可以使用状态机模式：

```python
from locust import HttpUser, task, between
from enum import Enum, auto

class UserState(Enum):
    LOGGED_OUT = auto()
    LOGGED_IN = auto()
    BROWSING = auto()
    SHOPPING = auto()
    CHECKING_OUT = auto()

class StateMachineUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.state = UserState.LOGGED_OUT
        self.cart_items = 0
    
    @task
    def state_machine(self):
        """状态机主循环"""
        if self.state == UserState.LOGGED_OUT:
            self.login()
        elif self.state == UserState.LOGGED_IN:
            self.browse()
        elif self.state == UserState.BROWSING:
            self.shop()
        elif self.state == UserState.SHOPPING:
            if self.cart_items >= 3:  # 购物车有3件商品后结账
                self.checkout()
            else:
                self.shop()  # 继续购物
        elif self.state == UserState.CHECKING_OUT:
            self.logout()
    
    def login(self):
        with self.client.post("/login", {
            "username": "testuser",
            "password": "testpass"
        }, catch_response=True) as response:
            if response.status_code == 200:
                self.state = UserState.LOGGED_IN
                print("登录成功，状态: LOGGED_IN")
            else:
                print("登录失败，保持状态: LOGGED_OUT")
    
    def browse(self):
        self.client.get("/products")
        # 有50%的概率开始购物
        if random.random() < 0.5:
            self.state = UserState.BROWSING
            print("开始浏览，状态: BROWSING")
    
    def shop(self):
        # 随机选择商品添加到购物车
        product_id = random.randint(1, 100)
        with self.client.post("/cart/add", {
            "product_id": product_id,
            "quantity": 1
        }, catch_response=True) as response:
            if response.status_code == 200:
                self.cart_items += 1
                print(f"添加到购物车，当前商品数: {self.cart_items}")
                
                # 有30%的概率继续浏览，70%的概率继续购物
                if random.random() < 0.3:
                    self.state = UserState.BROWSING
                    print("继续浏览，状态: BROWSING")
                else:
                    self.state = UserState.SHOPPING
                    print("继续购物，状态: SHOPPING")
            else:
                print("添加购物车失败")
    
    def checkout(self):
        with self.client.post("/checkout", catch_response=True) as response:
            if response.status_code == 200:
                self.state = UserState.CHECKING_OUT
                print("结账成功，状态: CHECKING_OUT")
            else:
                print("结账失败，保持状态: SHOPPING")
    
    def logout(self):
        self.client.post("/logout")
        self.state = UserState.LOGGED_OUT
        self.cart_items = 0
        print("注销成功，状态: LOGGED_OUT")
```

## 6. 并行任务控制流

虽然 Locust 本身是单线程的（每个用户），但你可以模拟并行行为：

```python
from locust import HttpUser, task, between
import threading
import time

class ParallelBehaviorUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def simulate_parallel_actions(self):
        """模拟并行行为"""
        # 创建多个线程模拟并行操作
        threads = []
        
        # 并行执行3个不同的操作
        threads.append(threading.Thread(target=self.background_task1))
        threads.append(threading.Thread(target=self.background_task2))
        threads.append(threading.Thread(target=self.background_task3))
        
        # 启动所有线程
        for thread in threads:
            thread.start()
        
        # 等待所有线程完成
        for thread in threads:
            thread.join()
        
        print("所有并行任务完成")
    
    def background_task1(self):
        """后台任务1"""
        self.client.get("/api/task1")
    
    def background_task2(self):
        """后台任务2"""
        self.client.get("/api/task2")
    
    def background_task3(self):
        """后台任务3"""
        self.client.get("/api/task3")
```

## 7. 基于时间的控制流

```python
from locust import HttpUser, task, between
import time
from datetime import datetime, timedelta

class TimeBasedUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_time = time.time()
        self.last_daily_task = 0
    
    @task
    def time_based_operations(self):
        """基于时间的操作"""
        current_time = time.time()
        elapsed_time = current_time - self.start_time
        
        # 每小时执行一次的任务
        if elapsed_time >= 3600 and int(elapsed_time / 3600) > int(self.last_daily_task / 3600):
            self.hourly_task()
            self.last_daily_task = elapsed_time
        
        # 每5分钟执行一次的任务
        if int(elapsed_time) % 300 < 10:  # 每5分钟的前10秒
            self.five_minute_task()
        
        # 常规任务
        self.regular_task()
    
    def hourly_task(self):
        """每小时执行的任务"""
        print("执行每小时任务")
        self.client.get("/api/hourly")
    
    def five_minute_task(self):
        """每5分钟执行的任务"""
        print("执行5分钟任务")
        self.client.get("/api/5min")
    
    def regular_task(self):
        """常规任务"""
        self.client.get("/api/regular")
```

## 最佳实践和建议

1. **保持简单**：虽然可以实现复杂的控制流，但尽量保持简单易懂。

2. **错误处理**：始终包含适当的错误处理，避免因单个错误导致整个测试中断。

3. **资源管理**：注意管理资源（如数据库连接、网络连接），确保在测试结束时正确释放。

4. **可配置性**：通过环境变量或配置文件使控制流参数可配置，便于调整测试行为。

5. **日志记录**：添加适当的日志记录，便于调试和分析测试结果。

6. **性能考虑**：复杂的控制流可能会影响测试性能，确保不会引入不必要的开销。

7. **可重复性**：设计控制流时考虑测试的可重复性，确保每次测试的行为一致。

通过这些控制流示例，你可以在 Locust 中创建更加复杂和真实的用户行为模拟，从而进行更有效的负载测试和性能测试。