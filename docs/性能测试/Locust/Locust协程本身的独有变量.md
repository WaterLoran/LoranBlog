# Locust协程本身的独有变量

在Locust中，要实现一个变量生命周期仅限于单个协程，并且在`on_start`和`on_stop`中可见，有以下几种实现方式：

## **1. 使用实例变量（推荐）**

```python
from locust import HttpUser, task, between
import gevent
import time

class MyUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """
        每个协程启动时执行
        实例变量只在当前用户实例（协程）中可见
        """
        # 协程本地数据，仅当前协程可见
        self.coroutine_local_data = {
            "coroutine_id": id(gevent.getcurrent()),
            "start_time": time.time(),
            "request_count": 0,
            "session_token": f"token_{id(self)}_{time.time()}",
            "visited_urls": []
        }
        
        print(f"[on_start] 协程 {self.coroutine_local_data['coroutine_id']} 启动")
        print(f"         Session Token: {self.coroutine_local_data['session_token']}")
    
    @task
    def my_task(self):
        """任务方法中可以访问协程本地数据"""
        # 访问实例变量
        self.coroutine_local_data["request_count"] += 1
        current_count = self.coroutine_local_data["request_count"]
        
        # 记录访问的URL
        url = f"/api/data/{current_count}"
        self.coroutine_local_data["visited_urls"].append(url)
        
        # 使用session token
        headers = {
            "Authorization": f"Bearer {self.coroutine_local_data['session_token']}",
            "X-Coroutine-ID": str(self.coroutine_local_data["coroutine_id"])
        }
        
        # 发起请求
        with self.client.get(url, headers=headers, catch_response=True) as response:
            if response.status_code == 200:
                print(f"协程 {self.coroutine_local_data['coroutine_id']} 第{current_count}次请求成功")
            else:
                print(f"协程 {self.coroutine_local_data['coroutine_id']} 请求失败: {response.status_code}")
    
    def on_stop(self):
        """
        每个协程停止时执行
        可以访问协程本地数据，进行清理或统计
        """
        if hasattr(self, "coroutine_local_data"):
            duration = time.time() - self.coroutine_local_data["start_time"]
            request_count = self.coroutine_local_data["request_count"]
            coroutine_id = self.coroutine_local_data["coroutine_id"]
            
            print(f"[on_stop] 协程 {coroutine_id} 结束")
            print(f"         运行时长: {duration:.2f}秒")
            print(f"         总请求数: {request_count}")
            print(f"         Session Token: {self.coroutine_local_data['session_token']}")
            
            # 清理数据
            self.coroutine_local_data.clear()
```

## **2. 使用属性装饰器封装**

```python
from locust import HttpUser, task, between
import gevent
import time
from functools import wraps

class CoroutineLocalStorageUser(HttpUser):
    wait_time = between(1, 3)
    
    @property
    def coroutine_data(self):
        """延迟初始化协程本地数据"""
        if not hasattr(self, "_coroutine_data"):
            # 每个实例首次访问时初始化
            self._coroutine_data = {
                "coroutine_id": id(gevent.getcurrent()),
                "created_at": time.time(),
                "user_state": "initialized"
            }
        return self._coroutine_data
    
    @coroutine_data.setter
    def coroutine_data(self, value):
        """防止外部直接赋值"""
        raise AttributeError("协程数据不能直接赋值，请使用 update_coroutine_data 方法")
    
    def update_coroutine_data(self, key, value):
        """安全更新协程数据"""
        if not hasattr(self, "_coroutine_data"):
            self.coroutine_data  # 触发初始化
        self._coroutine_data[key] = value
    
    def on_start(self):
        """初始化协程数据"""
        # 使用属性访问，触发初始化
        data = self.coroutine_data
        
        # 添加更多初始化数据
        self.update_coroutine_data("request_counter", 0)
        self.update_coroutine_data("last_request_time", None)
        self.update_coroutine_data("error_count", 0)
        
        print(f"协程 {data['coroutine_id']} 启动，状态: {data['user_state']}")
    
    @task
    def task1(self):
        """访问协程本地数据"""
        self.update_coroutine_data("request_counter", 
                                  self.coroutine_data.get("request_counter", 0) + 1)
        
        counter = self.coroutine_data["request_counter"]
        
        # 模拟业务逻辑
        if counter % 5 == 0:
            self.update_coroutine_data("user_state", "processing_batch")
        
        self.client.get(f"/api?counter={counter}")
    
    def on_stop(self):
        """清理协程数据"""
        if hasattr(self, "_coroutine_data"):
            data = self._coroutine_data
            duration = time.time() - data["created_at"]
            
            print(f"协程 {data['coroutine_id']} 结束运行")
            print(f"  最终状态: {data.get('user_state', 'unknown')}")
            print(f"  总请求数: {data.get('request_counter', 0)}")
            print(f"  运行时长: {duration:.2f}秒")
            
            # 清理引用，帮助垃圾回收
            del self._coroutine_data
```

## **3. 使用上下文管理器**

```python
from locust import HttpUser, task, between
import gevent
import time
import contextlib

class CoroutineContextUser(HttpUser):
    wait_time = between(1, 3)
    
    class CoroutineContext:
        """协程上下文管理类"""
        def __init__(self, user_instance):
            self.user = user_instance
            self.data = {}
            self.coroutine_id = id(gevent.getcurrent())
        
        def __enter__(self):
            """进入上下文时初始化"""
            self.data = {
                "start_time": time.time(),
                "coroutine_id": self.coroutine_id,
                "request_log": [],
                "session_id": f"session_{self.coroutine_id}_{int(time.time())}"
            }
            return self.data
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            """退出上下文时清理"""
            duration = time.time() - self.data["start_time"]
            request_count = len(self.data["request_log"])
            
            print(f"协程上下文结束: {self.coroutine_id}")
            print(f"  会话ID: {self.data['session_id']}")
            print(f"  请求数量: {request_count}")
            print(f"  运行时长: {duration:.2f}秒")
            
            # 清理数据
            self.data.clear()
            return False  # 不抑制异常
    
    def on_start(self):
        """创建协程上下文"""
        self.ctx = self.CoroutineContext(self)
        self.coroutine_data = self.ctx.__enter__()
        
        print(f"[on_start] 创建协程上下文: {self.coroutine_data['coroutine_id']}")
    
    @task
    def api_request(self):
        """在任务中使用协程数据"""
        if not hasattr(self, "coroutine_data"):
            # 如果还没初始化，重新初始化（安全防护）
            self.on_start()
        
        # 记录请求
        request_id = len(self.coroutine_data["request_log"]) + 1
        request_info = {
            "id": request_id,
            "timestamp": time.time(),
            "url": f"/api/v1/data/{request_id}"
        }
        self.coroutine_data["request_log"].append(request_info)
        
        # 使用session_id
        headers = {
            "X-Session-ID": self.coroutine_data["session_id"],
            "X-Request-ID": str(request_id)
        }
        
        self.client.get(request_info["url"], headers=headers)
    
    def on_stop(self):
        """结束协程上下文"""
        if hasattr(self, "ctx"):
            self.ctx.__exit__(None, None, None)
```

## **4. 使用Python的弱引用和描述符**

```python
from locust import HttpUser, task, between
import gevent
import time
import weakref

class CoroutineLocal:
    """协程本地存储描述符"""
    def __init__(self, factory=None):
        self.factory = factory or dict
        self.data = weakref.WeakKeyDictionary()
    
    def __get__(self, instance, owner):
        """获取协程本地数据"""
        if instance is None:
            return self
        
        # 每个实例有自己的数据
        if instance not in self.data:
            self.data[instance] = self.factory()
        
        return self.data[instance]
    
    def __set__(self, instance, value):
        """设置协程本地数据"""
        self.data[instance] = value
    
    def __delete__(self, instance):
        """删除协程本地数据"""
        if instance in self.data:
            del self.data[instance]

class AdvancedUser(HttpUser):
    wait_time = between(1, 3)
    
    # 使用描述符定义协程本地属性
    coroutine_store = CoroutineLocal(lambda: {
        "initialized": False,
        "data": {}
    })
    
    def on_start(self):
        """初始化协程本地存储"""
        store = self.coroutine_store
        
        # 第一次访问时初始化
        if not store["initialized"]:
            store.update({
                "initialized": True,
                "coroutine_id": id(gevent.getcurrent()),
                "start_timestamp": time.time(),
                "counter": 0,
                "metadata": {
                    "user_agent": "Locust-Coroutine",
                    "protocol": "HTTP/1.1"
                }
            })
            print(f"协程 {store['coroutine_id']} 初始化完成")
    
    @task(3)
    def high_priority_task(self):
        """高优先级任务"""
        store = self.coroutine_store
        
        # 确保已初始化
        if not store.get("initialized", False):
            self.on_start()
            store = self.coroutine_store
        
        # 更新计数器
        store["counter"] += 1
        request_num = store["counter"]
        
        # 添加请求记录
        if "requests" not in store:
            store["requests"] = []
        
        store["requests"].append({
            "task": "high_priority",
            "time": time.time(),
            "number": request_num
        })
        
        self.client.get(f"/api/high/{request_num}")
    
    @task(1)
    def low_priority_task(self):
        """低优先级任务"""
        store = self.coroutine_store
        
        if store.get("counter", 0) % 5 == 0:
            print(f"协程 {store.get('coroutine_id', 'unknown')} 执行第{store.get('counter', 0)}次低优先级任务")
        
        self.client.get("/api/low")
    
    def on_stop(self):
        """清理协程本地存储"""
        store = self.coroutine_store
        
        if store.get("initialized", False):
            duration = time.time() - store.get("start_timestamp", time.time())
            total_requests = store.get("counter", 0)
            
            print(f"协程 {store.get('coroutine_id')} 统计:")
            print(f"  运行时长: {duration:.2f}秒")
            print(f"  总请求数: {total_requests}")
            print(f"  元数据: {store.get('metadata')}")
            
            # 使用描述符的删除方法清理
            del self.coroutine_store
```

## **5. 最简洁的实现（推荐用于生产）**

```python
from locust import HttpUser, task, between
import time
import hashlib

class SimpleCoroutineLocalUser(HttpUser):
    """
    最简洁的协程本地数据实现
    使用实例变量，天然符合需求：
    1. 生命周期在on_start和on_stop之间
    2. 仅当前协程可见
    3. 其他协程无法访问
    """
    wait_time = between(1, 2.5)
    
    def on_start(self):
        """初始化协程会话"""
        # 创建协程唯一的会话ID
        session_seed = f"{id(self)}_{time.time()}_{time.perf_counter()}"
        session_hash = hashlib.md5(session_seed.encode()).hexdigest()[:8]
        
        # 协程本地数据存储
        self._session = {
            "id": session_hash,
            "start": time.time(),
            "requests": 0,
            "last_success": None,
            "data": {}  # 用于存储任意临时数据
        }
        
        print(f"Session {self._session['id']} started")
    
    @task
    def make_request(self):
        """执行请求"""
        self._session["requests"] += 1
        request_num = self._session["requests"]
        
        # 在会话中存储请求特定数据
        request_id = f"{self._session['id']}_{request_num:04d}"
        self._session["data"]["last_request_id"] = request_id
        
        # 发起请求
        with self.client.get(f"/api?req={request_id}", 
                           name="api_call",
                           catch_response=True) as response:
            if response.status_code == 200:
                self._session["last_success"] = time.time()
                self._session["data"]["last_response_size"] = len(response.content)
            else:
                # 在会话中记录错误
                if "errors" not in self._session["data"]:
                    self._session["data"]["errors"] = []
                self._session["data"]["errors"].append({
                    "time": time.time(),
                    "status": response.status_code
                })
    
    def on_stop(self):
        """结束会话并输出统计"""
        if hasattr(self, "_session"):
            duration = time.time() - self._session["start"]
            rps = self._session["requests"] / duration if duration > 0 else 0
            
            print(f"\nSession {self._session['id']} ended:")
            print(f"  Duration: {duration:.2f}s")
            print(f"  Requests: {self._session['requests']}")
            print(f"  RPS: {rps:.2f}")
            
            if self._session.get("last_success"):
                last_success_age = time.time() - self._session["last_success"]
                print(f"  Last success: {last_success_age:.2f}s ago")
            
            # 清理数据（可选）
            del self._session
```

## **关键要点总结**

1. **实例变量是最佳选择**：`self.coroutine_data` 是协程本地数据的最佳载体
   - 每个用户实例在一个独立的协程中运行
   - 实例变量天然隔离，其他协程无法访问
   - 生命周期与用户实例一致

2. **生命周期保证**：
   - `on_start()` 中初始化
   - 任务方法中可以访问和修改
   - `on_stop()` 中可以访问和清理

3. **数据隔离性**：
   - 每个协程有自己的用户实例
   - 实例变量不会在协程间共享
   - 无需担心并发安全问题（对于只读或独立数据）

4. **内存管理**：
   - 协程结束时实例会被销毁
   - 实例变量随之被垃圾回收
   - 可以在 `on_stop()` 中显式清理

## **推荐实现**

对于大多数场景，推荐使用第一种方式（实例变量）：

```python
class MyUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # 初始化协程本地数据
        self.coroutine_data = {
            "session_id": "unique_id",
            "counter": 0,
            # 其他协程本地数据
        }
    
    @task
    def my_task(self):
        # 使用协程本地数据
        self.coroutine_data["counter"] += 1
    
    def on_stop(self):
        # 访问和清理协程本地数据
        if hasattr(self, "coroutine_data"):
            print(f"最终计数: {self.coroutine_data['counter']}")
            # 清理（可选）
            del self.coroutine_data
```

这种方式简洁、高效，完全满足你的需求：
1. 生命周期在 `on_start` 和 `on_stop` 之间 ✅
2. 仅当前协程可见 ✅  
3. 其他协程不可访问 ✅