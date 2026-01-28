# Locust 中的前后置函数详解

Locust 提供了丰富的前后置函数（钩子函数），用于在测试的不同阶段执行自定义逻辑。以下是完整的分类和用法说明：

## 1. 测试生命周期钩子函数

### 1.1 测试级别钩子

```python
from locust import events
from locust.runners import MasterRunner, WorkerRunner
import time
import logging

# 1. 测试初始化钩子
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    在整个测试开始时触发（仅一次）
    在 Master 和每个 Worker 上都会执行
    """
    if isinstance(environment.runner, MasterRunner):
        logging.info("🚀 测试开始 - Master 节点")
        # Master 节点初始化逻辑
        environment.runner.custom_data = {"start_time": time.time()}
    elif isinstance(environment.runner, WorkerRunner):
        logging.info(f"🔧 Worker 节点启动: {environment.runner.client_id}")
    
    # 公共初始化逻辑
    environment.runner.shared_data = {
        "config_loaded": True,
        "test_phase": "initial"
    }
    print(f"📊 测试环境初始化完成，主机: {environment.host}")

@events.test_stop.add_listener  
def on_test_stop(environment, **kwargs):
    """
    在整个测试结束时触发（仅一次）
    在 Master 和每个 Worker 上都会执行
    """
    if isinstance(environment.runner, MasterRunner):
        duration = time.time() - environment.runner.custom_data["start_time"]
        logging.info(f"🛑 测试结束 - 总时长: {duration:.2f}秒")
        
        # 生成自定义报告
        generate_custom_report(environment)
    
    print("🧹 清理测试资源...")
    cleanup_resources(environment)

def generate_custom_report(environment):
    """生成自定义测试报告"""
    stats = environment.runner.stats
    print(f"📈 总请求数: {stats.total.num_requests}")
    print(f"❌ 失败请求: {stats.total.num_failures}")
    print(f"📨 总RPS: {stats.total.total_rps}")

def cleanup_resources(environment):
    """清理资源"""
    # 关闭数据库连接、文件句柄等
    if hasattr(environment.runner, 'db_connection'):
        environment.runner.db_connection.close()
```

### 1.2 用户级别钩子

```python
from locust import User, task, between, constant
from locust.env import Environment

class BaseUser(User):
    """
    基础用户类，包含通用的前后置逻辑
    """
    abstract = True
    
    def on_start(self):
        """
        在每个用户实例开始执行时调用
        用于用户级别的初始化
        """
        print(f"👤 用户 {id(self)} 启动 - 时间: {time.strftime('%H:%M:%S')}")
        
        # 用户登录
        login_success = self.login()
        if not login_success:
            # 登录失败则停止该用户
            self.stop(force=True)
            return
            
        # 初始化用户会话数据
        self.session_data = {
            "user_id": f"user_{id(self)}",
            "login_time": time.time(),
            "request_count": 0
        }
        
    def on_stop(self):
        """
        在每个用户实例停止时调用
        用于用户级别的清理
        """
        print(f"👋 用户 {id(self)} 停止 - 总请求数: {self.session_data['request_count']}")
        
        # 用户登出
        self.logout()
        
        # 清理用户数据
        duration = time.time() - self.session_data["login_time"]
        print(f"⏱️ 用户会话时长: {duration:.2f}秒")
    
    def login(self):
        """模拟用户登录"""
        try:
            # 模拟登录请求
            response = self.client.post("/api/login", json={
                "username": f"test_user_{id(self)}",
                "password": "password123"
            })
            return response.status_code == 200
        except Exception as e:
            print(f"❌ 登录失败: {e}")
            return False
    
    def logout(self):
        """模拟用户登出"""
        try:
            self.client.post("/api/logout")
        except Exception as e:
            print(f"⚠️ 登出异常: {e}")
```

## 2. 请求级别钩子

### 2.1 请求前后置处理

```python
from locust import task, HttpUser
import time
from functools import wraps

class ApiUser(BaseUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.request_hooks_enabled = True
    
    def request_hook(self, func):
        """
        请求钩子装饰器
        为每个请求添加前后置处理
        """
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 前置处理
            start_time = time.time()
            request_name = func.__name__
            
            print(f"➡️ 开始请求: {request_name}")
            
            # 执行实际请求
            try:
                result = func(*args, **kwargs)
                
                # 后置处理 - 成功
                duration = (time.time() - start_time) * 1000
                self.session_data["request_count"] += 1
                
                print(f"✅ 请求完成: {request_name} - 耗时: {duration:.2f}ms")
                
                return result
                
            except Exception as e:
                # 后置处理 - 失败
                duration = (time.time() - start_time) * 1000
                print(f"❌ 请求失败: {request_name} - 错误: {e} - 耗时: {duration:.2f}ms")
                raise
        
        return wrapper
    
    @task(3)
    @request_hook
    def get_user_profile(self):
        """获取用户信息"""
        with self.client.get("/api/user/profile", 
                           name="Get User Profile",
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"状态码: {response.status_code}")
            return response
    
    @task(2)
    @request_hook  
    def update_user_settings(self):
        """更新用户设置"""
        settings = {
            "theme": "dark" if int(time.time()) % 2 == 0 else "light",
            "notifications": True
        }
        
        self.client.put("/api/user/settings", 
                       json=settings,
                       name="Update User Settings")
    
    @task(1)
    def search_products(self):
        """搜索商品 - 使用手动钩子"""
        # 手动实现前后置处理
        start_time = time.time()
        query = f"product_{int(time.time()) % 100}"
        
        print(f"🔍 开始搜索: {query}")
        
        try:
            response = self.client.get(f"/api/search?q={query}", 
                                     name="Search Products")
            
            duration = (time.time() - start_time) * 1000
            print(f"✅ 搜索完成: {query} - 耗时: {duration:.2f}ms")
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            print(f"❌ 搜索失败: {query} - 错误: {e}")
```

## 3. 事件监听器详解

### 3.1 请求事件监听

```python
from locust import events

# 请求成功事件监听
@events.request.add_listener
def on_request_success(request_type, name, response_time, response_length, **kwargs):
    """
    当请求成功时触发
    """
    print(f"✅ 请求成功 - 类型: {request_type}, 名称: {name}, "
          f"响应时间: {response_time}ms, 长度: {response_length}字节")
    
    # 可以在这里实现自定义监控逻辑
    log_successful_request(name, response_time)

# 请求失败事件监听  
@events.request_failure.add_listener
def on_request_failure(request_type, name, response_time, response_length, 
                      exception, **kwargs):
    """
    当请求失败时触发
    """
    print(f"❌ 请求失败 - 类型: {request_type}, 名称: {name}, "
          f"异常: {exception}, 响应时间: {response_time}ms")
    
    # 失败请求分析
    analyze_failed_request(name, exception)

# 自定义事件处理
def log_successful_request(name, response_time):
    """记录成功请求"""
    if response_time > 1000:
        print(f"⚠️ 慢请求警告: {name} - {response_time}ms")

def analyze_failed_request(name, exception):
    """分析失败请求"""
    error_type = type(exception).__name__
    
    # 根据错误类型采取不同措施
    if "ConnectionError" in error_type:
        print("🔌 网络连接错误，可能需要检查服务器状态")
    elif "Timeout" in error_type:
        print("⏰ 请求超时，可能需要调整超时设置")

# 添加更多事件监听
@events.worker_report.add_listener
def on_worker_report(client_id, data, **kwargs):
    """Worker 报告数据时触发"""
    print(f"📋 Worker {client_id} 报告数据")
    
@events.spawning_complete.add_listener  
def on_spawning_complete(user_count, **kwargs):
    """用户生成完成时触发"""
    print(f"🎉 用户生成完成，总数: {user_count}")

@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    """Locust 退出时触发"""
    print("👋 Locust 正在退出...")
```

## 4. 高级前后置场景

### 4.1 数据库连接管理

```python
import sqlite3
import psycopg2
from contextlib import contextmanager

class DatabaseUser(BaseUser):
    """
    需要数据库连接的用户类
    """
    abstract = True
    
    @events.test_start.add_listener
    def setup_database_connection(environment, **kwargs):
        """测试开始时建立数据库连接池"""
        if not hasattr(environment, 'db_pool'):
            environment.db_pool = DatabasePool()
            environment.db_pool.initialize()
            print("🗄️ 数据库连接池初始化完成")
    
    @events.test_stop.add_listener
    def close_database_connection(environment, **kwargs):
        """测试结束时关闭数据库连接"""
        if hasattr(environment, 'db_pool'):
            environment.db_pool.close()
            print("🗄️ 数据库连接池已关闭")
    
    @contextmanager
    def get_db_connection(self):
        """获取数据库连接的上下文管理器"""
        conn = None
        try:
            conn = self.environment.db_pool.get_connection()
            yield conn
        except Exception as e:
            print(f"❌ 数据库操作失败: {e}")
            raise
        finally:
            if conn:
                self.environment.db_pool.return_connection(conn)

class DatabasePool:
    """简单的数据库连接池"""
    def __init__(self):
        self.connections = []
        self.max_connections = 10
    
    def initialize(self):
        """初始化连接池"""
        for i in range(self.max_connections):
            conn = sqlite3.connect(':memory:')  # 或真实的数据库连接
            self.connections.append(conn)
    
    def get_connection(self):
        """获取连接"""
        if self.connections:
            return self.connections.pop()
        else:
            raise Exception("连接池耗尽")
    
    def return_connection(self, conn):
        """归还连接"""
        self.connections.append(conn)
    
    def close(self):
        """关闭所有连接"""
        for conn in self.connections:
            conn.close()
        self.connections.clear()
```

### 4.2 文件操作前后置

```python
import csv
import json
import tempfile
import os

class FileProcessingUser(BaseUser):
    """
    处理文件的用户类
    """
    
    def on_start(self):
        """用户开始时创建临时文件"""
        super().on_start()
        
        # 创建临时工作目录
        self.temp_dir = tempfile.mkdtemp(prefix="locust_")
        self.data_file = os.path.join(self.temp_dir, "test_data.csv")
        
        # 初始化测试数据文件
        self.initialize_test_data()
        
        print(f"📁 工作目录: {self.temp_dir}")
    
    def on_stop(self):
        """用户结束时清理临时文件"""
        # 清理临时文件
        if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
            import shutil
            shutil.rmtree(self.temp_dir)
            print(f"🧹 清理临时目录: {self.temp_dir}")
        
        super().on_stop()
    
    def initialize_test_data(self):
        """初始化测试数据文件"""
        with open(self.data_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'name', 'value'])
            for i in range(100):
                writer.writerow([i, f'item_{i}', i * 10])
    
    @task
    def process_data_file(self):
        """处理数据文件任务"""
        try:
            # 读取并处理文件
            with open(self.data_file, 'r') as f:
                reader = csv.DictReader(f)
                processed_count = 0
                
                for row in reader:
                    # 模拟处理逻辑
                    self.client.post("/api/process", json=dict(row))
                    processed_count += 1
                    
                    # 每处理10条记录休息一下
                    if processed_count % 10 == 0:
                        time.sleep(0.1)
            
            print(f"✅ 处理完成 {processed_count} 条记录")
            
        except Exception as e:
            print(f"❌ 文件处理失败: {e}")
```

### 4.3 缓存管理前后置

```python
import redis
from functools import lru_cache

class CachedApiUser(BaseUser):
    """
    使用缓存的API用户
    """
    
    @events.test_start.add_listener
    def setup_redis_cache(environment, **kwargs):
        """测试开始时设置Redis缓存"""
        try:
            environment.redis_client = redis.Redis(
                host='localhost', 
                port=6379, 
                db=0,
                decode_responses=True
            )
            environment.redis_client.ping()
            print("🔴 Redis 缓存连接成功")
        except Exception as e:
            print(f"❌ Redis 连接失败: {e}")
            environment.redis_client = None
    
    @events.test_stop.add_listener
    def cleanup_redis_cache(environment, **kwargs):
        """测试结束时清理缓存"""
        if hasattr(environment, 'redis_client') and environment.redis_client:
            environment.redis_client.close()
            print("🔴 Redis 连接已关闭")
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cache_enabled = True
    
    def get_cached_data(self, key, ttl=300):
        """获取缓存数据"""
        if not self.cache_enabled or not self.environment.redis_client:
            return None
            
        try:
            cached = self.environment.redis_client.get(key)
            if cached:
                print(f"💾 缓存命中: {key}")
                return json.loads(cached)
            return None
        except Exception as e:
            print(f"⚠️ 缓存读取失败: {e}")
            return None
    
    def set_cached_data(self, key, data, ttl=300):
        """设置缓存数据"""
        if not self.cache_enabled or not self.environment.redis_client:
            return
            
        try:
            self.environment.redis_client.setex(
                key, ttl, json.dumps(data)
            )
        except Exception as e:
            print(f"⚠️ 缓存写入失败: {e}")
    
    @task
    def get_cached_user(self):
        """获取缓存用户信息"""
        user_id = f"user_{int(time.time()) % 100}"
        cache_key = f"user_info:{user_id}"
        
        # 尝试从缓存获取
        cached_data = self.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        # 缓存未命中，从API获取
        response = self.client.get(f"/api/users/{user_id}", 
                                 name="Get User Info")
        
        if response.status_code == 200:
            user_data = response.json()
            # 设置缓存
            self.set_cached_data(cache_key, user_data)
            return user_data
```

## 5. 完整示例

```python
from locust import HttpUser, task, between, events
import time
import json
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ComprehensiveExampleUser(HttpUser):
    """
    完整的前后置函数示例用户类
    """
    wait_time = between(1, 5)
    host = "https://api.example.com"
    
    # 测试级别初始化
    @events.test_start.add_listener
    def setup_test_environment(environment, **kwargs):
        logger.info("=" * 50)
        logger.info("🚀 开始性能测试")
        logger.info(f"⏰ 开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 50)
        
        # 初始化测试数据
        environment.test_config = {
            "start_time": time.time(),
            "total_requests": 0,
            "failed_requests": 0
        }
    
    # 测试级别清理
    @events.test_stop.add_listener
    def teardown_test_environment(environment, **kwargs):
        duration = time.time() - environment.test_config["start_time"]
        total_requests = environment.test_config["total_requests"]
        failed_requests = environment.test_config["failed_requests"]
        success_rate = (total_requests - failed_requests) / total_requests * 100 if total_requests > 0 else 0
        
        logger.info("=" * 50)
        logger.info("🛑 性能测试完成")
        logger.info(f"⏱️ 测试时长: {duration:.2f}秒")
        logger.info(f"📊 总请求数: {total_requests}")
        logger.info(f"❌ 失败请求: {failed_requests}")
        logger.info(f"✅ 成功率: {success_rate:.2f}%")
        logger.info(f"⏰ 结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 50)
    
    # 用户级别初始化
    def on_start(self):
        logger.info(f"👤 用户 {self.__class__.__name__}_{id(self)} 启动")
        
        # 用户认证
        self.authenticate()
        
        # 初始化用户状态
        self.user_state = {
            "session_id": f"session_{int(time.time())}",
            "request_count": 0,
            "last_activity": time.time()
        }
    
    # 用户级别清理
    def on_stop(self):
        duration = time.time() - self.user_state["last_activity"]
        logger.info(f"👋 用户 {self.__class__.__name__}_{id(self)} 停止 - "
                   f"请求数: {self.user_state['request_count']}, "
                   f"活跃时长: {duration:.2f}秒")
        
        # 清理会话
        self.logout()
    
    def authenticate(self):
        """用户认证"""
        try:
            response = self.client.post("/auth/login", json={
                "username": "testuser",
                "password": "testpass"
            })
            if response.status_code == 200:
                self.auth_token = response.json().get("token")
                logger.info("🔑 用户认证成功")
            else:
                logger.error("❌ 用户认证失败")
                self.stop(force=True)
        except Exception as e:
            logger.error(f"❌ 认证异常: {e}")
            self.stop(force=True)
    
    def logout(self):
        """用户登出"""
        try:
            self.client.post("/auth/logout", headers={
                "Authorization": f"Bearer {self.auth_token}"
            })
        except Exception as e:
            logger.warning(f"⚠️ 登出异常: {e}")
    
    # 请求级别处理
    @task(3)
    def get_user_info(self):
        """获取用户信息"""
        self._make_request("GET", "/user/info", "Get User Info")
    
    @task(2)
    def update_profile(self):
        """更新用户资料"""
        profile_data = {
            "name": f"User_{int(time.time())}",
            "email": f"user_{int(time.time())}@example.com"
        }
        self._make_request("PUT", "/user/profile", "Update Profile", json=profile_data)
    
    @task(1)
    def list_orders(self):
        """列出订单"""
        self._make_request("GET", "/orders", "List Orders")
    
    def _make_request(self, method, endpoint, name, **kwargs):
        """统一的请求处理方法"""
        start_time = time.time()
        
        try:
            # 设置认证头
            headers = kwargs.get('headers', {})
            headers['Authorization'] = f"Bearer {self.auth_token}"
            kwargs['headers'] = headers
            
            # 发送请求
            response = getattr(self.client, method.lower())(
                endpoint, 
                name=name,
                **kwargs
            )
            
            # 更新统计
            self._update_stats(name, response, start_time, success=True)
            
            return response
            
        except Exception as e:
            # 处理异常
            self._update_stats(name, None, start_time, success=False, exception=e)
            raise
    
    def _update_stats(self, name, response, start_time, success, exception=None):
        """更新统计信息"""
        duration = (time.time() - start_time) * 1000
        
        # 更新用户状态
        self.user_state["request_count"] += 1
        self.user_state["last_activity"] = time.time()
        
        # 更新测试统计
        self.environment.test_config["total_requests"] += 1
        if not success:
            self.environment.test_config["failed_requests"] += 1
        
        # 记录日志
        status = "✅" if success else "❌"
        error_msg = f" - 错误: {exception}" if exception else ""
        logger.info(f"{status} {name} - 耗时: {duration:.2f}ms{error_msg}")

# 运行这个完整示例
if __name__ == "__main__":
    import os
    os.system("locust -f this_script.py --headless -u 10 -r 1 -t 1m")
```

## 6. 总结

Locust 的前后置函数提供了完整的测试生命周期管理：

| 函数/装饰器          | 级别 | 触发时机       | 主要用途             |
| -------------------- | ---- | -------------- | -------------------- |
| `@events.test_start` | 测试 | 测试开始时     | 全局初始化、资源配置 |
| `@events.test_stop`  | 测试 | 测试结束时     | 资源清理、报告生成   |
| `on_start()`         | 用户 | 每个用户开始时 | 用户登录、会话初始化 |
| `on_stop()`          | 用户 | 每个用户结束时 | 用户登出、数据清理   |
| `@events.request`    | 请求 | 每次请求时     | 请求监控、统计收集   |
| `@events.quitting`   | 系统 | Locust退出时   | 最终清理操作         |

合理使用这些前后置函数可以构建出功能完善、稳定性高的性能测试脚本。