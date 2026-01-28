# Locust 脚本中数据生命周期完整指南

在 Locust 脚本中，不同位置定义的数据具有不同的生命周期和作用域。以下是完整的分类说明：

## 1. 数据存储位置分类

### 全局变量（模块级别）
```python
from locust import HttpUser, task, between, events
import time

# ========== 全局变量 ==========
GLOBAL_CONFIG = {
    "base_url": "https://api.example.com",
    "timeout": 30
}

shared_counter = 0  # 全局计数器
user_credentials = []  # 全局数据列表
```

### 类变量（User 类级别）
```python
class MyUser(HttpUser):
    wait_time = between(1, 3)
    
    # ========== 类变量 ==========
    CLASS_COUNTER = 0  # 所有用户实例共享
    common_data = ["item1", "item2"]  # 共享数据
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # ========== 实例变量 ==========
        self.instance_data = {
            "user_id": f"user_{id(self)}",
            "session_token": None,
            "request_count": 0
        }
```

### 函数局部变量
```python
    @task
    def my_task(self):
        # ========== 函数局部变量 ==========
        local_timestamp = time.time()  # 只在函数执行期间存在
        temp_data = {"action": "process"}
        
        # 使用实例变量保持状态
        self.instance_data["request_count"] += 1
        
        print(f"局部变量: {local_timestamp}")
        print(f"实例变量: {self.instance_data['request_count']}")
```

## 2. 数据生命周期详细说明

### 2.1 全局变量（模块级别）
```python
# 全局数据 - 生命周期最长
APP_CONFIG = {
    "version": "1.0",
    "environment": "test"
}

user_pool = []  # 全局用户池
request_history = []  # 全局请求历史

@events.test_start.add_listener
def init_global_data(environment, **kwargs):
    """测试开始时初始化全局数据"""
    global user_pool
    user_pool = [f"user_{i}" for i in range(1000)]
    print(f"全局数据初始化完成，用户池大小: {len(user_pool)}")

@events.test_stop.add_listener
def cleanup_global_data(environment, **kwargs):
    """测试结束时清理全局数据"""
    global user_pool, request_history
    user_pool.clear()
    request_history.clear()
    print("全局数据已清理")

class GlobalDataUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # 访问全局数据
        global user_pool
        if user_pool:
            self.username = user_pool.pop()
            print(f"用户获取用户名: {self.username}")
    
    @task
    def use_global_data(self):
        global request_history
        # 向全局列表添加数据
        request_history.append({
            "timestamp": time.time(),
            "user": getattr(self, 'username', 'unknown'),
            "endpoint": "/api/test"
        })
```

**生命周期**：从模块加载开始，到 Python 解释器退出结束
**作用域**：所有 User 实例和函数共享
**线程安全**：⚠️ 需要加锁保证线程安全

### 2.2 类变量（User 类级别）
```python
class ClassVariableUser(HttpUser):
    wait_time = between(1, 3)
    
    # 类变量 - 所有实例共享
    total_requests = 0  # 所有用户的总请求数
    active_users = set()  # 活跃用户集合
    data_queue = []  # 共享数据队列
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 记录用户到类变量
        ClassVariableUser.active_users.add(id(self))
        
    def on_start(self):
        print(f"活跃用户数: {len(ClassVariableUser.active_users)}")
    
    @task
    def update_class_variables(self):
        # 更新类变量
        ClassVariableUser.total_requests += 1
        
        # 从共享队列获取数据
        if ClassVariableUser.data_queue:
            data = ClassVariableUser.data_queue.pop(0)
            print(f"处理共享数据: {data}")
        
        print(f"总请求数: {ClassVariableUser.total_requests}")
    
    def on_stop(self):
        # 从活跃用户中移除
        ClassVariableUser.active_users.discard(id(self))
        print(f"用户退出，剩余活跃用户: {len(ClassVariableUser.active_users)}")
```

**生命周期**：从类定义加载开始，到 Python 解释器退出结束
**作用域**：该类的所有实例共享
**线程安全**：⚠️ 需要加锁保证线程安全

### 2.3 实例变量（对象级别）
```python
class InstanceVariableUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 实例变量 - 每个用户独立
        self.user_id = f"user_{id(self)}"
        self.session_data = {
            "login_time": time.time(),
            "request_count": 0,
            "last_request": None
        }
        self.personal_queue = []  # 个人数据队列
        
        print(f"用户实例创建: {self.user_id}")
    
    def on_start(self):
        # 初始化实例数据
        self.personal_queue = [f"task_{i}" for i in range(5)]
        self.session_data["status"] = "active"
    
    @task
    def use_instance_data(self):
        # 使用和更新实例数据
        self.session_data["request_count"] += 1
        self.session_data["last_request"] = time.time()
        
        # 处理个人队列
        if self.personal_queue:
            task = self.personal_queue.pop(0)
            print(f"{self.user_id} 处理任务: {task}")
        
        print(f"用户 {self.user_id} 请求次数: {self.session_data['request_count']}")
    
    def on_stop(self):
        # 清理实例数据
        self.session_data["status"] = "inactive"
        print(f"用户 {self.user_id} 完成，总请求: {self.session_data['request_count']}")
```

**生命周期**：从对象创建（`__init__`）开始，到对象销毁（`on_stop` 后）结束
**作用域**：仅当前用户实例可见
**线程安全**：✅ 每个用户独立，天然线程安全

### 2.4 函数局部变量
```python
class LocalVariableUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def task_with_local_variables(self):
        # 局部变量 - 函数执行期间存在
        start_time = time.time()  # 每次调用重新创建
        local_cache = {}  # 每次调用重新创建
        
        # 处理数据
        response = self.client.get("/api/data")
        processing_time = time.time() - start_time  # 计算处理时间
        
        # 局部变量在函数结束时自动销毁
        print(f"处理时间: {processing_time:.3f}s")
    
    @task
    def another_task(self):
        # 无法访问其他函数的局部变量
        # print(start_time)  # 这会报错！
        
        # 需要持久化的数据应该存储在实例变量中
        if not hasattr(self, 'persistent_data'):
            self.persistent_data = []
        
        self.persistent_data.append(time.time())
```

**生命周期**：从函数调用开始，到函数返回结束
**作用域**：仅在函数内部可见
**线程安全**：✅ 每次调用独立

## 3. 事件监听器中的数据

### 事件监听器变量作用域
```python
from locust import events
from collections import defaultdict

# 全局事件数据
event_stats = defaultdict(list)

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, exception, context, **kwargs):
    """请求事件监听器 - 使用全局数据存储"""
    
    # 局部变量 - 每次事件触发时创建
    timestamp = time.time()
    event_id = f"{name}_{timestamp}"
    
    # 存储到全局变量
    event_stats[name].append({
        "timestamp": timestamp,
        "response_time": response_time,
        "success": exception is None
    })
    
    # 局部变量在函数结束时销毁
    # event_id 和 timestamp 会被垃圾回收

@events.test_stop.add_listener
def report_event_stats(environment, **kwargs):
    """测试结束时报告事件统计"""
    global event_stats
    print(f"事件统计报告:")
    for endpoint, stats in event_stats.items():
        avg_rt = sum(s['response_time'] for s in stats) / len(stats)
        print(f"  {endpoint}: {len(stats)} 次请求, 平均RT: {avg_rt:.1f}ms")
    
    # 清理全局数据
    event_stats.clear()
```

## 4. 分布式环境中的数据生命周期

### Master-Worker 数据共享
```python
from locust import events
import pickle
import os

# Master 节点数据
master_data = {}

@events.init.add_listener
def on_init(environment, **kwargs):
    """初始化时设置数据"""
    if environment.web_ui:  # Master 节点
        global master_data
        master_data = {
            "test_config": {"users": 100, "spawn_rate": 10},
            "shared_resources": ["res1", "res2", "res3"]
        }
        
        # 保存到文件供 Worker 读取
        with open('shared_data.pkl', 'wb') as f:
            pickle.dump(master_data, f)

class DistributedUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.local_data = {}
        
        # Worker 节点加载共享数据
        if not self.environment.web_ui:
            try:
                with open('shared_data.pkl', 'rb') as f:
                    shared_data = pickle.load(f)
                    self.local_data = shared_data.copy()
            except FileNotFoundError:
                self.local_data = {}
    
    @task
    def distributed_task(self):
        # 使用本地副本数据
        if self.local_data.get('shared_resources'):
            resource = self.local_data['shared_resources'].pop(0)
            print(f"使用共享资源: {resource}")
```

## 5. 数据持久化模式

### 5.1 文件持久化
```python
import json
import csv

class PersistentDataUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data_file = f"user_{id(self)}_data.json"
        self.load_persistent_data()
    
    def load_persistent_data(self):
        """从文件加载持久化数据"""
        try:
            with open(self.data_file, 'r') as f:
                self.persistent_data = json.load(f)
        except FileNotFoundError:
            self.persistent_data = {"sessions": [], "metrics": {}}
    
    def save_persistent_data(self):
        """保存数据到文件"""
        with open(self.data_file, 'w') as f:
            json.dump(self.persistent_data, f, indent=2)
    
    @task
    def update_persistent_data(self):
        """更新持久化数据"""
        self.persistent_data["sessions"].append({
            "timestamp": time.time(),
            "action": "api_call"
        })
        self.save_persistent_data()
    
    def on_stop(self):
        """用户停止时保存最终状态"""
        self.persistent_data["final_state"] = "completed"
        self.save_persistent_data()
```

### 5.2 数据库持久化
```python
import sqlite3
import threading

# 线程安全的数据库连接
db_lock = threading.Lock()

class DatabaseUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = f"user_{id(self)}"
        self.setup_database()
    
    def setup_database(self):
        """初始化数据库"""
        with db_lock:
            conn = sqlite3.connect('test_data.db')
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_metrics (
                    user_id TEXT,
                    timestamp REAL,
                    endpoint TEXT,
                    response_time INTEGER
                )
            ''')
            conn.commit()
            conn.close()
    
    @task
    def log_to_database(self):
        """记录数据到数据库"""
        with db_lock:
            conn = sqlite3.connect('test_data.db')
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO user_metrics VALUES (?, ?, ?, ?)',
                (self.user_id, time.time(), '/api/test', 150)
            )
            conn.commit()
            conn.close()
```

## 6. 数据生命周期总结表

| 数据位置           | 生命周期开始  | 生命周期结束  | 作用域       | 线程安全 | 使用场景               |
| ------------------ | ------------- | ------------- | ------------ | -------- | ---------------------- |
| **全局变量**       | 模块加载时    | Python 退出时 | 全局可见     | ❌ 需加锁 | 配置数据、共享资源     |
| **类变量**         | 类定义时      | Python 退出时 | 类内所有实例 | ❌ 需加锁 | 类级别统计、共享池     |
| **实例变量**       | `__init__` 时 | 对象销毁时    | 单个实例     | ✅ 安全   | 用户会话数据、个人状态 |
| **函数局部变量**   | 函数调用时    | 函数返回时    | 函数内部     | ✅ 安全   | 临时计算、缓存         |
| **事件监听器变量** | 事件触发时    | 事件处理完成  | 函数内部     | ✅ 安全   | 事件处理临时数据       |

## 7. 最佳实践建议

### 数据存储选择指南
```python
class BestPracticeUser(HttpUser):
    wait_time = between(1, 3)
    
    # ✅ 好的实践
    SHARED_CONFIG = {"timeout": 30}  # 只读的类变量
    
    def __init__(self, *args, **kwargs):
        super().__self, *args, **kwargs)
        # ✅ 实例变量用于用户特定数据
        self.user_session = {
            "user_id": f"user_{id(self)}",
            "auth_token": None,
            "personal_data": []
        }
    
    @task
    def good_practice(self):
        # ✅ 局部变量用于临时计算
        start_time = time.time()
        
        # ✅ 需要跨请求保持的数据用实例变量
        self.user_session["request_count"] = \
            self.user_session.get("request_count", 0) + 1
        
        # ❌ 避免在任务中修改类变量（需要加锁）
        # BestPracticeUser.some_counter += 1
        
        processing_time = time.time() - start_time  # 局部变量
```

### 线程安全注意事项
```python
import threading

# 全局锁保护共享数据
shared_data_lock = threading.Lock()
shared_list = []

class ThreadSafeUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def thread_safe_operation(self):
        # 安全的实例变量操作
        if not hasattr(self, 'local_list'):
            self.local_list = []  # 每个用户独立
        
        self.local_list.append("item")  # ✅ 安全
        
        # 全局数据需要加锁
        with shared_data_lock:
            shared_list.append("item")  # ✅ 安全
        
        # ❌ 不安全的全局数据操作
        # shared_list.append("item")  # 可能导致数据竞争
```

通过合理选择数据存储位置，你可以构建出既高效又稳定的 Locust 性能测试脚本。