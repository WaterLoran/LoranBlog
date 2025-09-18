# Locust 登录获取 Token 并传递到后续请求的完整示例

下面我将提供一个完整的 Locust 示例，演示如何实现用户登录、获取 Token，并在后续请求中传递该 Token。

## 完整示例代码

```python
from locust import HttpUser, task, between
import json
import random

class AuthenticatedUser(HttpUser):
    """
    认证用户类：演示登录获取token并在后续请求中使用
    """
    wait_time = between(1, 3)  # 任务间等待1-3秒
    host = "https://api.example.com"  # 被测API的基础URL
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = None  # 存储认证token
        self.user_id = None  # 存储用户ID（可选）
        self.headers = {}  # 存储请求头
    
    def on_start(self):
        """
        每个虚拟用户启动时执行一次
        用于执行登录操作获取token
        """
        self.login()
    
    def login(self):
        """
        登录操作：获取认证token
        """
        # 准备登录数据 - 可以使用参数化数据
        login_data = {
            "username": f"testuser{random.randint(1, 1000)}",
            "password": "password123"
        }
        
        # 发送登录请求
        with self.client.post(
            "/auth/login", 
            json=login_data,
            catch_response=True,  # 捕获响应以自定义成功/失败判断
            name="用户登录"
        ) as response:
            # 检查响应状态码
            if response.status_code != 200:
                response.failure(f"登录失败，状态码: {response.status_code}")
                return False
            
            try:
                # 解析响应JSON
                response_data = response.json()
                
                # 提取token（根据实际API响应结构调整）
                self.token = response_data.get("access_token") or response_data.get("token")
                
                # 提取其他可能需要的信息
                self.user_id = response_data.get("user_id")
                
                if not self.token:
                    response.failure("响应中未找到token")
                    return False
                
                # 设置后续请求的认证头
                self.headers = {
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                }
                
                response.success()
                print(f"用户 {login_data['username']} 登录成功，获取到token")
                return True
                
            except json.JSONDecodeError:
                response.failure("响应不是有效的JSON")
                return False
            except Exception as e:
                response.failure(f"登录过程出错: {str(e)}")
                return False
    
    @task(3)
    def get_user_profile(self):
        """
        获取用户资料 - 需要认证
        """
        if not self.token:
            # 如果没有token，尝试重新登录
            if not self.login():
                return  # 登录失败，跳过此任务
        
        with self.client.get(
            "/user/profile",
            headers=self.headers,
            catch_response=True,
            name="获取用户资料"
        ) as response:
            if response.status_code == 200:
                # 可以进一步验证响应内容
                try:
                    profile_data = response.json()
                    # 验证用户ID是否匹配（如果之前保存了user_id）
                    if self.user_id and profile_data.get("id") != self.user_id:
                        response.failure("用户ID不匹配")
                    else:
                        response.success()
                except json.JSONDecodeError:
                    response.failure("响应不是有效的JSON")
            elif response.status_code == 401:
                # Token可能过期，尝试重新登录
                print("Token可能已过期，尝试重新登录")
                if self.login():
                    # 登录成功，重试当前请求
                    self.get_user_profile()
                else:
                    response.failure("认证失败且重新登录失败")
            else:
                response.failure(f"获取用户资料失败，状态码: {response.status_code}")
    
    @task(2)
    def browse_products(self):
        """
        浏览商品 - 可能需要认证
        """
        if not self.token:
            # 如果没有token，尝试重新登录
            if not self.login():
                return  # 登录失败，跳过此任务
        
        with self.client.get(
            "/products",
            headers=self.headers,
            catch_response=True,
            name="浏览商品"
        ) as response:
            if response.status_code == 200:
                # 可选：验证响应结构或数据
                response.success()
            elif response.status_code == 401:
                # Token可能过期，尝试重新登录
                if self.login():
                    self.browse_products()  # 重试
                else:
                    response.failure("认证失败且重新登录失败")
            else:
                response.failure(f"浏览商品失败，状态码: {response.status_code}")
    
    @task(1)
    def create_post(self):
        """
        创建帖子 - 需要认证
        """
        if not self.token:
            # 如果没有token，尝试重新登录
            if not self.login():
                return  # 登录失败，跳过此任务
        
        # 创建测试数据
        post_data = {
            "title": f"测试帖子 {random.randint(1, 1000)}",
            "content": "这是使用Locust创建的测试帖子内容",
            "category": random.choice(["tech", "life", "news"])
        }
        
        with self.client.post(
            "/posts",
            json=post_data,
            headers=self.headers,
            catch_response=True,
            name="创建帖子"
        ) as response:
            if response.status_code == 201:
                # 创建成功，可以提取帖子ID供后续使用
                try:
                    post_response = response.json()
                    post_id = post_response.get("id")
                    if post_id:
                        # 可以保存post_id供后续操作使用
                        print(f"成功创建帖子，ID: {post_id}")
                    response.success()
                except json.JSONDecodeError:
                    response.failure("响应不是有效的JSON")
            elif response.status_code == 401:
                # Token可能过期，尝试重新登录
                if self.login():
                    self.create_post()  # 重试
                else:
                    response.failure("认证失败且重新登录失败")
            else:
                response.failure(f"创建帖子失败，状态码: {response.status_code}")
    
    @task(1)
    def perform_logout(self):
        """
        执行注销操作 - 需要认证
        注意：注销后token会失效，需要重新登录
        """
        if not self.token:
            return  # 没有token，无需注销
        
        with self.client.post(
            "/auth/logout",
            headers=self.headers,
            catch_response=True,
            name="用户注销"
        ) as response:
            if response.status_code in [200, 204]:
                # 注销成功，清除token
                self.token = None
                self.headers = {}
                response.success()
                print("用户注销成功")
            else:
                response.failure(f"注销失败，状态码: {response.status_code}")
    
    def on_stop(self):
        """
        每个虚拟用户停止时执行一次
        可用于清理资源或执行注销
        """
        if self.token:
            # 可以选择在用户停止时执行注销
            self.perform_logout()
```

## 使用参数化数据的增强版本

如果需要使用不同的用户凭证进行测试，可以使用参数化数据：

```python
from locust import HttpUser, task, between
import csv
import queue
import json

class DataDrivenAuthenticatedUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://api.example.com"
    
    # 用户数据队列（类级别，所有用户实例共享）
    users_queue = queue.Queue()
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = None
        self.headers = {}
        self.current_user = None
        
        # 如果队列为空，加载用户数据
        if self.users_queue.empty():
            self.load_user_data()
        
        # 获取用户凭证
        try:
            self.current_user = self.users_queue.get_nowait()
        except queue.Empty:
            # 如果没有更多用户数据，使用默认值
            self.current_user = {"username": "testuser", "password": "testpass"}
    
    @classmethod
    def load_user_data(cls):
        """从CSV文件加载用户数据"""
        try:
            with open('users.csv', 'r') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    cls.users_queue.put(row)
        except FileNotFoundError:
            # 如果文件不存在，添加一些默认用户
            for i in range(1, 101):
                cls.users_queue.put({
                    "username": f"testuser{i}",
                    "password": "password123"
                })
    
    def on_start(self):
        """使用分配的用户凭证登录"""
        self.login()
    
    def login(self):
        """使用当前用户的凭证登录"""
        with self.client.post(
            "/auth/login", 
            json={
                "username": self.current_user["username"],
                "password": self.current_user["password"]
            },
            catch_response=True,
            name="用户登录"
        ) as response:
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    self.token = response_data.get("access_token")
                    
                    if self.token:
                        self.headers = {
                            "Authorization": f"Bearer {self.token}",
                            "Content-Type": "application/json"
                        }
                        response.success()
                        print(f"用户 {self.current_user['username']} 登录成功")
                        return True
                    else:
                        response.failure("响应中未找到token")
                except json.JSONDecodeError:
                    response.failure("响应不是有效的JSON")
            else:
                response.failure(f"登录失败，状态码: {response.status_code}")
            
            return False
    
    @task
    def authenticated_request(self):
        """需要认证的请求示例"""
        if not self.token and not self.login():
            return  # 登录失败，跳过任务
        
        with self.client.get(
            "/api/protected/data",
            headers=self.headers,
            catch_response=True,
            name="获取受保护数据"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                # Token过期，尝试重新登录
                if self.login():
                    self.authenticated_request()  # 重试
                else:
                    response.failure("认证失败且重新登录失败")
            else:
                response.failure(f"请求失败，状态码: {response.status_code}")
    
    def on_stop(self):
        """用户停止时，将用户数据放回队列以供重用（可选）"""
        if self.current_user:
            self.users_queue.put(self.current_user)
```

## 关键要点说明

1. **Token 获取与存储**：
   - 在 `on_start` 方法中执行登录操作
   - 从登录响应中提取 Token 并存储在实例变量中
   - 设置包含 Token 的请求头

2. **Token 使用**：
   - 在每个需要认证的请求中传递包含 Token 的请求头
   - 处理 Token 过期情况（401 状态码）

3. **错误处理**：
   - 使用 `catch_response=True` 捕获响应
   - 自定义成功/失败判断逻辑
   - 处理 JSON 解析错误和其他异常

4. **Token 刷新机制**：
   - 当收到 401 状态码时，尝试重新登录获取新 Token
   - 重试失败的请求

5. **资源管理**：
   - 在 `on_stop` 方法中执行清理操作（如注销）

6. **参数化测试**：
   - 使用队列管理多个用户凭证
   - 每个虚拟用户使用不同的凭证登录

## 运行和测试

1. 将上述代码保存为 `locustfile.py`
2. 根据需要创建 `users.csv` 文件（对于参数化版本）：
   ```csv
   username,password
   user1,pass1
   user2,pass2
   user3,pass3
   ```
3. 启动 Locust：
   ```bash
   locust -f locustfile.py
   ```
4. 打开浏览器访问 `http://localhost:8089`
5. 设置用户数和孵化速率，开始测试

## 注意事项

1. **适配实际 API**：根据实际 API 的响应结构调整 Token 提取逻辑
2. **安全考虑**：不要在代码中硬编码真实的生产环境凭证
3. **性能影响**：频繁的登录操作可能会影响测试性能，根据测试目标调整登录频率
4. **Token 过期处理**：根据实际 Token 有效期设置合理的重试逻辑
5. **并发考虑**：确保被测系统能够处理并发登录请求

这个示例提供了一个完整的框架，你可以根据实际需求进行调整和扩展，例如添加更多的任务类型、实现更复杂的业务流程或集成更高级的错误处理机制。