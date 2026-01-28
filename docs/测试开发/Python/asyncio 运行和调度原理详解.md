# asyncio 运行和调度原理详解

## 一、asyncio 运行原理

### 1. 核心组件
```python
"""
asyncio 架构层次：
1. 事件循环 (Event Loop) - 调度核心
2. 协程 (Coroutine) - 异步函数
3. Task/Future - 协程的包装
4. 调度器 (Scheduler)
"""
```

### 2. 事件循环工作原理
```python
import asyncio
import time
from collections import deque

class SimpleEventLoop:
    """简化版事件循环演示"""
    
    def __init__(self):
        self._ready = deque()      # 就绪队列
        self._scheduled = []       # 定时任务
        self._running = False
        self._time = time.time()
    
    def call_soon(self, callback, *args):
        """立即调度回调"""
        self._ready.append((callback, args))
    
    def call_later(self, delay, callback, *args):
        """延迟调度"""
        when = self._time + delay
        self._scheduled.append((when, callback, args))
        self._scheduled.sort(key=lambda x: x[0])
    
    def run_once(self):
        """执行一轮事件循环"""
        # 1. 更新时间
        self._time = time.time()
        
        # 2. 处理定时任务
        while self._scheduled and self._scheduled[0][0] <= self._time:
            _, callback, args = self._scheduled.pop(0)
            self._ready.append((callback, args))
        
        # 3. 执行就绪任务
        for _ in range(len(self._ready)):
            if not self._ready:
                break
            callback, args = self._ready.popleft()
            try:
                callback(*args)
            except Exception as e:
                print(f"Error in callback: {e}")
    
    def run_forever(self):
        """运行事件循环"""
        self._running = True
        while self._running:
            self.run_once()
            # 防止CPU空转
            time.sleep(0.001)
```

### 3. 协程调度流程
```python
"""
asyncio 协程执行流程：
1. 创建协程对象 (async def 函数)
2. 创建 Task/Future
3. 注册到事件循环
4. 遇到 await 时挂起
5. 事件循环调度其他任务
6. await 完成时恢复执行
"""
```

## 二、调度现象和机制

### 1. 任务状态切换
```python
import asyncio
import inspect

async def demo_coroutine():
    print("1. 协程开始执行")
    
    # 检查当前协程状态
    coro = inspect.currentframe()
    print(f"协程状态: {coro}") if coro else None
    
    # await 导致挂起
    print("2. 准备 await asyncio.sleep(1)")
    await asyncio.sleep(1)  # 挂起点
    
    print("3. 恢复执行")
    await asyncio.sleep(0.5)
    print("4. 协程结束")
```

### 2. 调度优先级
```python
async def show_scheduling():
    """展示调度顺序"""
    
    async def task(name, delay):
        print(f"{name}: 开始")
        await asyncio.sleep(delay)
        print(f"{name}: 结束")
        return name
    
    # 创建任务时的调度
    tasks = [
        asyncio.create_task(task(f"任务{i}", 1)) 
        for i in range(3)
    ]
    
    # 观察执行顺序
    print("=== 创建任务完成 ===")
    
    # 并发执行
    results = await asyncio.gather(*tasks)
    print(f"结果: {results}")
```

### 3. 关键调度点
```python
"""
调度发生的关键时刻：
1. 遇到 await 表达式
2. async with/for 语句
3. 调用 asyncio.sleep(0) 显式让出控制权
4. I/O 操作完成时（通过 selector）
5. 调用 ensure_future() 或 create_task()
"""
```

## 三、同步代码中集成异步任务的设计模式

### 1. 适配器模式（同步调用异步）
```python
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

class AsyncToSyncAdapter:
    """
    将异步代码适配到同步环境
    """
    
    def __init__(self):
        self._loop = None
        self._executor = ThreadPoolExecutor(max_workers=3)
    
    def _get_or_create_loop(self):
        """获取或创建事件循环"""
        try:
            return asyncio.get_event_loop()
        except RuntimeError:
            # 在新线程中创建事件循环
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop
    
    def run_async(self, coro_func: Callable, *args, **kwargs) -> Any:
        """
        在同步环境中运行异步函数
        
        方法1：在新线程中运行事件循环
        """
        def run_in_thread():
            loop = self._get_or_create_loop()
            return loop.run_until_complete(coro_func(*args, **kwargs))
        
        # 在线程池中执行
        future = self._executor.submit(run_in_thread)
        return future.result()
    
    def sync_wrapper(self, async_func):
        """装饰器：将异步函数包装为同步函数"""
        def wrapper(*args, **kwargs):
            return self.run_async(async_func, *args, **kwargs)
        return wrapper
```

### 2. 服务层分离模式
```python
"""
架构设计：
┌─────────────────┐    ┌─────────────────┐
│  同步业务层     │    │  异步服务层     │
│  (Django/Flask) │    │  (FastAPI/独立) │
├─────────────────┤    ├─────────────────┤
│  REST API       │───▶│ WebSocket       │
│  业务逻辑       │    │  实时推送       │
│  数据库操作     │    │  消息队列       │
└─────────────────┘    └─────────────────┘
"""

# 同步业务层
class SyncService:
    def __init__(self, async_client):
        self.async_client = async_client
    
    def process_order(self, order_data):
        """同步处理订单"""
        # 同步业务逻辑
        print("处理订单同步逻辑...")
        
        # 调用异步服务
        notification = self.async_client.send_notification(order_data)
        
        # 继续同步处理
        return self._finalize_order(order_data)

# 异步服务层（独立运行）
class AsyncNotificationService:
    async def send_notification(self, data):
        """异步发送通知"""
        async with websockets.connect("ws://notification-server") as ws:
            await ws.send(json.dumps(data))
            response = await ws.recv()
            return response
```

### 3. 消息队列桥接模式
```python
import queue
import asyncio
import threading
import json

class SyncAsyncBridge:
    """
    通过消息队列连接同步和异步世界
    """
    
    def __init__(self):
        self.sync_to_async_queue = queue.Queue(maxsize=1000)
        self.async_to_sync_queue = asyncio.Queue(maxsize=1000)
        
        self._async_thread = None
        self._running = False
    
    def start_async_worker(self):
        """启动异步工作线程"""
        self._running = True
        self._async_thread = threading.Thread(
            target=self._async_worker_loop,
            daemon=True
        )
        self._async_thread.start()
    
    def _async_worker_loop(self):
        """异步工作线程的主循环"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def process_messages():
            while self._running:
                try:
                    # 从同步队列获取消息
                    sync_msg = self.sync_to_async_queue.get_nowait()
                    
                    # 处理异步任务
                    result = await self._async_task_handler(sync_msg)
                    
                    # 将结果放回异步队列
                    await self.async_to_sync_queue.put(result)
                    
                except queue.Empty:
                    await asyncio.sleep(0.01)
                except Exception as e:
                    print(f"Async worker error: {e}")
        
        loop.run_until_complete(process_messages())
    
    async def _async_task_handler(self, message):
        """异步任务处理"""
        # 模拟异步处理
        await asyncio.sleep(0.1)
        return f"Processed: {message}"
    
    def sync_call_async(self, message, timeout=5):
        """同步调用异步任务"""
        # 发送到异步队列
        self.sync_to_async_queue.put(message)
        
        # 等待结果（同步阻塞）
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                # 在同步代码中轮询异步队列
                loop = asyncio.new_event_loop()
                result = loop.run_until_complete(
                    self.async_to_sync_queue.get()
                )
                loop.close()
                return result
            except asyncio.QueueEmpty:
                time.sleep(0.01)
        
        raise TimeoutError("Async call timeout")
```

### 4. 协程池模式
```python
import asyncio
from concurrent.futures import Future as SyncFuture
import functools

class CoroutinePool:
    """
    协程池：管理异步任务的生命周期
    """
    
    def __init__(self, max_workers=10):
        self.max_workers = max_workers
        self._loop = None
        self._tasks = []
        self._results = {}
        self._counter = 0
        
    def init_event_loop(self):
        """初始化事件循环（在单独线程中）"""
        if self._loop is None:
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            
            # 启动事件循环
            threading.Thread(
                target=self._loop.run_forever,
                daemon=True
            ).start()
    
    def submit(self, coro_func, *args, **kwargs) -> SyncFuture:
        """提交异步任务到协程池"""
        self.init_event_loop()
        
        # 创建同步Future用于返回结果
        sync_future = SyncFuture()
        task_id = self._counter
        self._counter += 1
        
        # 包装协程以处理结果
        async def wrapped_coro():
            try:
                result = await coro_func(*args, **kwargs)
                self._results[task_id] = ('success', result)
                sync_future.set_result(result)
            except Exception as e:
                self._results[task_id] = ('error', str(e))
                sync_future.set_exception(e)
        
        # 在事件循环线程中调度任务
        def schedule_task():
            task = asyncio.create_task(wrapped_coro())
            self._tasks.append(task)
            
            # 添加完成回调
            def cleanup(_):
                self._tasks.remove(task)
            
            task.add_done_callback(cleanup)
        
        # 线程安全地调度
        self._loop.call_soon_threadsafe(schedule_task)
        
        return sync_future
    
    def map(self, coro_func, iterable):
        """批量提交异步任务"""
        futures = []
        for item in iterable:
            if isinstance(item, (tuple, list)):
                future = self.submit(coro_func, *item)
            else:
                future = self.submit(coro_func, item)
            futures.append(future)
        
        # 等待所有结果
        results = []
        for future in futures:
            try:
                results.append(future.result())
            except Exception as e:
                results.append(e)
        
        return results
```

### 5. 上下文桥接模式
```python
"""
混合模式：同步框架中嵌入异步上下文
适用于 Django、Flask 等传统框架
"""

from contextlib import contextmanager
import asyncio
import threading

class AsyncContextManager:
    """管理异步上下文"""
    
    @staticmethod
    @contextmanager
    def async_context():
        """
        为同步代码块提供异步上下文
        使用方式：
        with async_context():
            result = await some_async_function()
        """
        # 检查是否已有事件循环
        try:
            loop = asyncio.get_event_loop()
            new_loop = False
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            new_loop = True
        
        # 如果是新事件循环，需要在单独线程运行
        if new_loop:
            stop_event = threading.Event()
            
            def run_loop():
                asyncio.set_event_loop(loop)
                try:
                    loop.run_forever()
                finally:
                    loop.close()
            
            thread = threading.Thread(target=run_loop, daemon=True)
            thread.start()
            
            yield loop
            
            # 清理
            loop.call_soon_threadsafe(loop.stop)
            stop_event.wait(timeout=5)
        else:
            yield loop

# Django/Flask 视图中的使用示例
def sync_view(request):
    """同步视图函数"""
    # 同步处理
    data = process_sync(request)
    
    # 在异步上下文中调用异步代码
    with AsyncContextManager.async_context() as loop:
        # 在当前线程运行异步任务
        async def fetch_async_data():
            return await external_async_api(data)
        
        # 注意：这里会阻塞当前线程
        async_data = loop.run_until_complete(fetch_async_data())
    
    # 继续同步处理
    return combine_results(data, async_data)
```

## 四、实战设计建议

### 1. 架构选择指南
```python
"""
根据场景选择集成模式：

1. 轻量级集成（简单调用）：
   → 使用 asyncio.run() 或 run_until_complete()
   
2. 后台任务处理：
   → 使用消息队列桥接模式
   
3. 实时性要求高：
   → 服务层分离模式
   
4. 已有大型同步系统：
   → 上下文桥接模式 + 协程池
   
5. 需要大量并发I/O：
   → 考虑整体迁移到异步框架
"""
```

### 2. 最佳实践代码示例
```python
import asyncio
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class HybridApplication:
    """
    混合应用的最佳实践实现
    """
    
    def __init__(self):
        self._async_init_done = False
        self._shutdown_event = asyncio.Event()
        
    async def async_init(self):
        """异步初始化（在异步上下文中调用）"""
        if self._async_init_done:
            return
        
        # 初始化异步资源
        self.db_pool = await create_db_pool()
        self.cache = await create_redis_pool()
        self._async_init_done = True
        
        logger.info("Async resources initialized")
    
    def sync_method(self, data):
        """同步方法中可以安全调用异步代码"""
        # 方法1：使用线程局部存储的事件循环
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # 创建新的事件循环（在独立线程中）
            return self._run_async_in_thread(
                self._async_operation, data
            )
        
        # 如果已有事件循环，安全地调度
        if loop.is_running():
            # 避免阻塞，返回Future
            future = asyncio.run_coroutine_threadsafe(
                self._async_operation(data),
                loop
            )
            return future.result(timeout=10)  # 可设置超时
        else:
            # 直接运行
            return loop.run_until_complete(
                self._async_operation(data)
            )
    
    async def _async_operation(self, data):
        """真正的异步操作"""
        if not self._async_init_done:
            await self.async_init()
        
        # 使用异步资源
        async with self.db_pool.acquire() as conn:
            # 执行异步数据库操作
            result = await conn.fetch("SELECT * FROM data WHERE id = $1", data['id'])
            
            # 异步缓存
            await self.cache.set(f"data:{data['id']}", json.dumps(result))
        
        return result
    
    def _run_async_in_thread(self, coro_func, *args):
        """在新线程中运行异步函数"""
        result_queue = queue.Queue()
        
        def thread_target():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                result = loop.run_until_complete(coro_func(*args))
                result_queue.put(('success', result))
            except Exception as e:
                result_queue.put(('error', e))
            finally:
                loop.close()
        
        thread = threading.Thread(target=thread_target, daemon=True)
        thread.start()
        thread.join(timeout=30)  # 超时保护
        
        if result_queue.empty():
            raise TimeoutError("Async operation timeout")
        
        status, value = result_queue.get()
        if status == 'success':
            return value
        else:
            raise value
    
    async def graceful_shutdown(self):
        """优雅关闭异步资源"""
        self._shutdown_event.set()
        
        if self._async_init_done:
            await self.db_pool.close()
            await self.cache.close()
            self._async_init_done = False
```

## 五、调试和监控

### 1. 调试工具
```python
import asyncio
import traceback

class AsyncDebugger:
    """异步代码调试工具"""
    
    @staticmethod
    def trace_coroutine():
        """跟踪协程执行"""
        original_run = asyncio.coroutines._format_coroutine
        
        def debug_format(coro):
            stack = traceback.format_stack()
            print(f"协程 {coro} 的调用栈:")
            for frame in stack[-10:]:
                print(frame)
            return original_run(coro)
        
        asyncio.coroutines._format_coroutine = debug_format
    
    @staticmethod
    def monitor_tasks():
        """监控所有运行中的任务"""
        tasks = asyncio.all_tasks()
        print(f"\n=== 当前运行任务: {len(tasks)} ===")
        
        for task in tasks:
            print(f"任务: {task}")
            print(f"状态: {task._state}")
            if task._coro:
                print(f"协程: {task._coro}")
            print("-" * 40)
```

### 2. 性能监控
```python
import time
from dataclasses import dataclass
from typing import List

@dataclass
class AsyncMetrics:
    task_count: int = 0
    avg_latency: float = 0
    throughput: float = 0

class AsyncProfiler:
    """异步性能分析器"""
    
    def __init__(self):
        self.start_times = {}
        self.completion_times = {}
        self.task_history = []
    
    def task_started(self, task_name):
        self.start_times[task_name] = time.time()
    
    def task_completed(self, task_name):
        if task_name in self.start_times:
            latency = time.time() - self.start_times[task_name]
            self.completion_times[task_name] = latency
            self.task_history.append((task_name, latency))
            
            # 只保留最近1000条记录
            if len(self.task_history) > 1000:
                self.task_history = self.task_history[-1000:]
    
    def get_metrics(self) -> AsyncMetrics:
        if not self.completion_times:
            return AsyncMetrics()
        
        latencies = list(self.completion_times.values())
        avg_latency = sum(latencies) / len(latencies)
        
        # 计算最近1分钟的吞吐量
        one_min_ago = time.time() - 60
        recent_tasks = [t for t in self.task_history 
                       if t[1] > one_min_ago]
        
        return AsyncMetrics(
            task_count=len(self.completion_times),
            avg_latency=avg_latency,
            throughput=len(recent_tasks) / 60  # 任务/秒
        )
```

## 六、总结

### 关键原则：
1. **避免混用**：尽量减少同步异步混用，明确边界
2. **线程安全**：注意异步代码在不同线程中的安全性
3. **资源管理**：妥善管理异步资源的生命周期
4. **错误处理**：异步错误需要特殊处理，不能简单try-catch
5. **性能考量**：同步调用异步会有额外开销，考虑是否值得

### 选择策略：
- **简单场景**：直接使用`asyncio.run()`
- **复杂集成**：使用消息队列桥接
- **系统重构**：采用服务层分离
- **渐进迁移**：使用协程池模式

通过合理的设计，可以在现有同步系统中安全、高效地引入异步能力，获得并发性能优势。