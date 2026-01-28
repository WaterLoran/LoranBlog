# Gevent 常用用法详解

Gevent 是一个基于协程的 Python 网络库，使用 greenlet 提供高性能的并发编程能力。以下是 Gevent 的常用用法：

## 1. **基础安装与基本概念**

```python
# 安装
# pip install gevent

import gevent
from gevent import monkey
import time
```

## 2. **基本用法**

### 2.1 协程创建与执行
```python
import gevent

def task(n):
    """定义一个任务"""
    print(f"开始任务 {n}")
    gevent.sleep(1)  # 模拟耗时操作
    print(f"完成任务 {n}")
    return f"任务 {n} 的结果"

# 创建协程（不会立即执行）
greenlet1 = gevent.spawn(task, 1)
greenlet2 = gevent.spawn(task, 2)

print("协程已创建，等待执行...")

# 等待所有协程完成
gevent.joinall([greenlet1, greenlet2])

# 获取结果
print(f"结果1: {greenlet1.value}")
print(f"结果2: {greenlet2.value}")
```

### 2.2 使用猴子补丁（Monkey Patch）
```python
import gevent
from gevent import monkey

# 打猴子补丁（修改标准库，使其支持异步）
# 必须在使用任何标准库模块之前调用
monkey.patch_all()

import time
import socket
import requests

def fetch_url(url):
    """使用 gevent 优化网络请求"""
    print(f"开始请求: {url}")
    try:
        response = requests.get(url, timeout=5)
        print(f"{url}: 状态码 {response.status_code}, 长度 {len(response.text)}")
        return response.status_code
    except Exception as e:
        print(f"{url}: 错误 - {e}")
        return None

# 并发请求多个 URL
urls = [
    'https://httpbin.org/get',
    'https://httpbin.org/post',
    'https://httpbin.org/headers',
    'https://httpbin.org/ip',
]

# 使用列表推导创建协程列表
jobs = [gevent.spawn(fetch_url, url) for url in urls]

# 等待所有完成
gevent.joinall(jobs)

# 收集结果
results = [job.value for job in jobs]
print(f"所有请求完成，结果: {results}")
```

## 3. **并发编程**

### 3.1 并发执行多个函数
```python
import gevent
import random

def worker(name, delay):
    """模拟工作线程"""
    print(f"Worker {name}: 开始工作，需要 {delay} 秒")
    gevent.sleep(delay)
    print(f"Worker {name}: 完成工作")
    return f"{name}: 耗时 {delay} 秒"

def concurrent_execution():
    """并发执行多个任务"""
    # 创建多个协程
    tasks = []
    for i in range(5):
        delay = random.uniform(0.5, 2.0)
        task = gevent.spawn(worker, f"Worker-{i}", delay)
        tasks.append(task)
    
    # 等待所有完成
    gevent.joinall(tasks)
    
    # 获取所有结果
    results = [task.value for task in tasks]
    print("所有任务完成:")
    for result in results:
        print(f"  {result}")

# 运行
concurrent_execution()
```

### 3.2 使用 `imap` 和 `imap_unordered`
```python
import gevent
from gevent.pool import Pool

def process_item(item):
    """处理单个项目"""
    gevent.sleep(0.1)  # 模拟处理时间
    return f"处理后的 {item}"

# 方法1: 使用 imap（保持顺序）
def use_imap():
    print("使用 imap（保持顺序）:")
    
    pool = Pool(3)  # 限制并发数为3
    items = range(10)
    
    for result in pool.imap(process_item, items):
        print(f"  收到: {result}")

# 方法2: 使用 imap_unordered（不保持顺序，谁先完成先返回）
def use_imap_unordered():
    print("\n使用 imap_unordered（不保持顺序）:")
    
    pool = Pool(3)
    items = range(10)
    
    for result in pool.imap_unordered(process_item, items):
        print(f"  收到: {result}")

# 运行
use_imap()
use_imap_unordered()
```

## 4. **网络编程**

### 4.1 HTTP 服务器
```python
from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler

def simple_wsgi_app(environ, start_response):
    """简单的 WSGI 应用"""
    start_response('200 OK', [('Content-Type', 'text/html')])
    return [b"<h1>Hello, Gevent!</h1>"]

def run_http_server():
    """运行 HTTP 服务器"""
    print("启动 HTTP 服务器在 8080 端口...")
    server = WSGIServer(('0.0.0.0', 8080), simple_wsgi_app)
    server.serve_forever()

# 在后台运行服务器
import threading
server_thread = threading.Thread(target=run_http_server, daemon=True)
server_thread.start()

# 给服务器一点时间启动
import time
time.sleep(1)

# 测试请求
import requests
response = requests.get('http://localhost:8080')
print(f"服务器响应: {response.text}")
```

### 4.2 Socket 编程
```python
import gevent
from gevent import socket

def handle_client(client_socket, address):
    """处理客户端连接"""
    print(f"新连接: {address}")
    
    # 接收数据
    data = client_socket.recv(1024)
    print(f"收到数据: {data.decode('utf-8')}")
    
    # 发送响应
    response = b"Hello from Gevent Server!"
    client_socket.send(response)
    
    # 关闭连接
    client_socket.close()
    print(f"连接关闭: {address}")

def start_socket_server():
    """启动 Socket 服务器"""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(('0.0.0.0', 9999))
    server.listen(5)
    print("Socket 服务器启动在 9999 端口...")
    
    while True:
        client, addr = server.accept()
        # 为每个客户端启动一个协程
        gevent.spawn(handle_client, client, addr)

def socket_client():
    """Socket 客户端"""
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect(('127.0.0.1', 9999))
    client.send(b"Hello Server!")
    response = client.recv(1024)
    print(f"服务器响应: {response.decode('utf-8')}")
    client.close()

# 运行示例
import threading

# 启动服务器
server_thread = threading.Thread(target=start_socket_server, daemon=True)
server_thread.start()
time.sleep(1)

# 启动多个客户端并发连接
clients = [gevent.spawn(socket_client) for _ in range(3)]
gevent.joinall(clients)
```

## 5. **高级特性**

### 5.1 协程池（Pool）
```python
from gevent.pool import Pool
import gevent

def intensive_task(n):
    """密集任务"""
    print(f"开始任务 {n}")
    gevent.sleep(1)  # 模拟 I/O 操作
    print(f"完成任务 {n}")
    return n * n

# 使用协程池限制并发数
def use_pool():
    print("使用协程池（最大并发数=3）:")
    
    pool = Pool(3)  # 限制最大并发数为3
    
    # 提交任务
    tasks = []
    for i in range(10):
        task = pool.spawn(intensive_task, i)
        tasks.append(task)
    
    # 等待所有完成
    gevent.joinall(tasks)
    
    # 获取结果
    results = [task.value for task in tasks]
    print(f"所有任务完成，结果: {results}")
    
    # 使用方法2：apply_async
    print("\n使用 apply_async:")
    
    async_results = []
    for i in range(5):
        result = pool.apply_async(intensive_task, args=(i,))
        async_results.append(result)
    
    # 获取异步结果
    for i, result in enumerate(async_results):
        print(f"任务 {i} 结果: {result.get()}")

use_pool()
```

### 5.2 队列（Queue）
```python
import gevent
from gevent.queue import Queue, Empty

def producer(queue, name):
    """生产者"""
    for i in range(5):
        item = f"{name}-item-{i}"
        print(f"生产者 {name}: 生产 {item}")
        queue.put(item)
        gevent.sleep(0.5)  # 模拟生产时间
    
    # 发送结束信号
    queue.put(None)
    print(f"生产者 {name}: 完成")

def consumer(queue, name):
    """消费者"""
    while True:
        try:
            item = queue.get(timeout=3)
            if item is None:  # 结束信号
                print(f"消费者 {name}: 收到结束信号")
                queue.put(None)  # 传递给其他消费者
                break
            
            print(f"消费者 {name}: 消费 {item}")
            gevent.sleep(1)  # 模拟消费时间
            
        except Empty:
            print(f"消费者 {name}: 队列为空，退出")
            break

def queue_example():
    """队列示例：多生产者多消费者"""
    queue = Queue()
    
    # 创建生产者和消费者
    producers = [
        gevent.spawn(producer, queue, "P1"),
        gevent.spawn(producer, queue, "P2"),
    ]
    
    consumers = [
        gevent.spawn(consumer, queue, "C1"),
        gevent.spawn(consumer, queue, "C2"),
        gevent.spawn(consumer, queue, "C3"),
    ]
    
    # 等待生产者完成
    gevent.joinall(producers)
    
    # 等待消费者完成
    gevent.joinall(consumers)
    
    print("所有任务完成")

queue_example()
```

### 5.3 事件（Event）和锁（Lock）
```python
import gevent
from gevent.event import Event
from gevent.lock import RLock

def waiter(event, name):
    """等待事件"""
    print(f"{name}: 等待事件...")
    event.wait()  # 阻塞直到事件被设置
    print(f"{name}: 事件已触发，继续执行")

def setter(event, delay):
    """设置事件"""
    gevent.sleep(delay)
    print(f"设置事件（延迟 {delay} 秒）")
    event.set()  # 触发事件

def lock_example():
    """锁示例"""
    lock = RLock()
    counter = 0
    
    def increment(name):
        nonlocal counter
        for _ in range(1000):
            with lock:  # 使用锁保护临界区
                counter += 1
                # print(f"{name}: 计数器增加到 {counter}")
    
    # 创建多个协程同时修改计数器
    tasks = [
        gevent.spawn(increment, "Task1"),
        gevent.spawn(increment, "Task2"),
        gevent.spawn(increment, "Task3"),
    ]
    
    gevent.joinall(tasks)
    print(f"最终计数器值: {counter} (期望: 3000)")

# 事件示例
print("事件示例:")
event = Event()
gevent.joinall([
    gevent.spawn(waiter, event, "Waiter1"),
    gevent.spawn(waiter, event, "Waiter2"),
    gevent.spawn(setter, event, 2),
])

# 锁示例
print("\n锁示例:")
lock_example()
```

## 6. **WebSocket 支持**

```python
from geventwebsocket import WebSocketServer, WebSocketApplication, Resource
from gevent import pywsgi
import json

class EchoApplication(WebSocketApplication):
    """简单的 WebSocket 回显应用"""
    
    def on_open(self):
        print("WebSocket 连接已建立")
    
    def on_message(self, message):
        if message is None:
            return
        
        print(f"收到消息: {message}")
        
        # 回显消息
        response = {"echo": message, "timestamp": time.time()}
        self.ws.send(json.dumps(response))
    
    def on_close(self, reason):
        print(f"WebSocket 连接关闭: {reason}")

def websocket_server():
    """启动 WebSocket 服务器"""
    print("启动 WebSocket 服务器在 8000 端口...")
    
    # 设置资源映射
    resource = Resource({
        '/echo': EchoApplication,
    })
    
    server = WebSocketServer(
        ('0.0.0.0', 8000),
        resource,
        debug=False
    )
    
    server.serve_forever()

# 在后台运行 WebSocket 服务器
ws_thread = threading.Thread(target=websocket_server, daemon=True)
ws_thread.start()
time.sleep(1)

# 客户端示例（使用 websocket-client 库）
try:
    import websocket
    
    def on_message(ws, message):
        print(f"客户端收到: {message}")
    
    def on_error(ws, error):
        print(f"客户端错误: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print("客户端连接关闭")
    
    def on_open(ws):
        print("客户端连接已打开")
        # 发送测试消息
        ws.send("Hello WebSocket!")
    
    # 创建 WebSocket 客户端
    ws = websocket.WebSocketApp(
        "ws://localhost:8000/echo",
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    
    # 在后台运行客户端
    client_thread = threading.Thread(target=ws.run_forever, daemon=True)
    client_thread.start()
    time.sleep(2)
    
except ImportError:
    print("需要安装 websocket-client: pip install websocket-client")
```

## 7. **数据库连接池**

```python
import gevent
from gevent.pool import Pool
import sqlite3
from contextlib import contextmanager

class DatabasePool:
    """简单的数据库连接池"""
    
    def __init__(self, db_path, pool_size=5):
        self.db_path = db_path
        self.pool = Pool(pool_size)
        self.connections = []
        
        # 预先创建连接
        for _ in range(pool_size):
            conn = sqlite3.connect(db_path, check_same_thread=False)
            self.connections.append(conn)
    
    @contextmanager
    def get_connection(self):
        """从池中获取连接"""
        # 在实际项目中应该实现更复杂的连接管理
        conn = self.connections.pop() if self.connections else \
               sqlite3.connect(self.db_path, check_same_thread=False)
        
        try:
            yield conn
        finally:
            # 将连接放回池中
            self.connections.append(conn)
    
    def execute_query(self, query, params=None):
        """执行查询（协程安全）"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if query.strip().upper().startswith('SELECT'):
                return cursor.fetchall()
            else:
                conn.commit()
                return cursor.lastrowid
    
    def concurrent_queries(self, queries):
        """并发执行多个查询"""
        jobs = []
        
        for query, params in queries:
            job = self.pool.spawn(self.execute_query, query, params)
            jobs.append(job)
        
        # 等待所有查询完成
        gevent.joinall(jobs)
        
        # 收集结果
        return [job.value for job in jobs]

# 使用示例
def database_example():
    """数据库连接池示例"""
    import tempfile
    import os
    
    # 创建临时数据库
    temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    db_path = temp_db.name
    temp_db.close()
    
    try:
        # 创建连接池
        db_pool = DatabasePool(db_path, pool_size=3)
        
        # 创建表
        db_pool.execute_query('''
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                name TEXT,
                age INTEGER
            )
        ''')
        
        # 准备批量插入数据
        queries = []
        for i in range(10):
            queries.append((
                "INSERT INTO users (name, age) VALUES (?, ?)",
                (f"User-{i}", 20 + i)
            ))
        
        # 并发插入数据
        print("并发插入数据...")
        results = db_pool.concurrent_queries(queries)
        print(f"插入结果: {results}")
        
        # 并发查询数据
        print("\n并发查询数据...")
        query_jobs = []
        for i in range(5):
            job = db_pool.pool.spawn(
                db_pool.execute_query,
                "SELECT * FROM users WHERE age > ?",
                (22 + i,)
            )
            query_jobs.append(job)
        
        gevent.joinall(query_jobs)
        
        for i, job in enumerate(query_jobs):
            print(f"查询{i}结果: {len(job.value)} 条记录")
    
    finally:
        # 清理临时文件
        os.unlink(db_path)
        print(f"\n已清理临时数据库: {db_path}")

database_example()
```

## 8. **定时任务**

```python
import gevent
from gevent import Greenlet
import time

class PeriodicTask(Greenlet):
    """周期性任务"""
    
    def __init__(self, interval, callback, *args, **kwargs):
        super().__init__()
        self.interval = interval
        self.callback = callback
        self.args = args
        self.kwargs = kwargs
        self.running = False
    
    def _run(self):
        self.running = True
        while self.running:
            start_time = time.time()
            
            # 执行回调
            self.callback(*self.args, **self.kwargs)
            
            # 计算剩余睡眠时间
            elapsed = time.time() - start_time
            sleep_time = max(0, self.interval - elapsed)
            
            if sleep_time > 0:
                gevent.sleep(sleep_time)
    
    def stop(self):
        self.running = False

def print_time(name):
    """打印当前时间"""
    current_time = time.strftime("%H:%M:%S")
    print(f"{name}: 当前时间 {current_time}")

def scheduler_example():
    """定时任务调度器示例"""
    print("启动定时任务...")
    
    # 创建多个定时任务
    tasks = [
        PeriodicTask(1, print_time, "任务A"),   # 每秒执行
        PeriodicTask(2, print_time, "任务B"),   # 每2秒执行
        PeriodicTask(5, print_time, "任务C"),   # 每5秒执行
    ]
    
    # 启动所有任务
    for task in tasks:
        task.start()
    
    # 运行一段时间后停止
    gevent.sleep(10)
    
    print("\n停止定时任务...")
    for task in tasks:
        task.stop()
        task.join()  # 等待任务结束
    
    print("所有定时任务已停止")

scheduler_example()
```

## 9. **与 asyncio 结合使用**

```python
import asyncio
import gevent
import time

def gevent_task(name, duration):
    """Gevent 协程任务"""
    print(f"Gevent {name}: 开始")
    gevent.sleep(duration)
    print(f"Gevent {name}: 完成")
    return f"Gevent {name} 结果"

async def asyncio_task(name, duration):
    """asyncio 协程任务"""
    print(f"asyncio {name}: 开始")
    await asyncio.sleep(duration)
    print(f"asyncio {name}: 完成")
    return f"asyncio {name} 结果"

def run_gevent_in_asyncio():
    """在 asyncio 中运行 gevent"""
    
    async def main():
        print("在 asyncio 中运行 gevent...")
        
        # 使用 run_in_executor 运行 gevent
        loop = asyncio.get_event_loop()
        
        # 运行 gevent 任务
        gevent_future = loop.run_in_executor(
            None,
            lambda: gevent.joinall([
                gevent.spawn(gevent_task, "任务1", 1),
                gevent.spawn(gevent_task, "任务2", 2),
            ])
        )
        
        # 同时运行 asyncio 任务
        asyncio_future = asyncio.gather(
            asyncio_task("任务A", 1.5),
            asyncio_task("任务B", 2.5),
        )
        
        # 等待所有完成
        await asyncio.gather(gevent_future, asyncio_future)
        print("所有任务完成")
    
    asyncio.run(main())

run_gevent_in_asyncio()
```

## 10. **错误处理与超时**

```python
import gevent
from gevent import Timeout

def risky_operation(duration):
    """有风险的操作"""
    print(f"执行有风险的操作，需要 {duration} 秒")
    gevent.sleep(duration)
    
    # 模拟可能失败的操作
    if duration > 2:
        raise ValueError(f"操作时间太长: {duration} 秒")
    
    return f"操作成功，耗时 {duration} 秒"

def error_handling_example():
    """错误处理示例"""
    
    # 方法1: 使用 try-except
    print("方法1: 直接 try-except")
    try:
        result = risky_operation(3)
        print(f"结果: {result}")
    except ValueError as e:
        print(f"捕获错误: {e}")
    
    # 方法2: 协程中的错误处理
    print("\n方法2: 协程错误处理")
    greenlet = gevent.spawn(risky_operation, 3)
    
    try:
        result = greenlet.get()  # 获取结果，可能抛出异常
        print(f"结果: {result}")
    except ValueError as e:
        print(f"协程错误: {e}")
    
    # 方法3: 使用 joinall 的错误处理
    print("\n方法3: joinall 错误处理")
    tasks = [
        gevent.spawn(risky_operation, 1),
        gevent.spawn(risky_operation, 2),
        gevent.spawn(risky_operation, 3),  # 这个会失败
    ]
    
    gevent.joinall(tasks)
    
    for i, task in enumerate(tasks):
        if task.exception():
            print(f"任务{i} 失败: {task.exception()}")
        else:
            print(f"任务{i} 成功: {task.value}")
    
    # 方法4: 超时控制
    print("\n方法4: 超时控制")
    
    # 使用 Timeout 上下文管理器
    try:
        with Timeout(1.5):  # 1.5秒超时
            result = risky_operation(2)  # 这个需要2秒，会超时
            print(f"结果: {result}")
    except Timeout:
        print("操作超时！")
    
    # 方法5: 超时装饰器
    print("\n方法5: 超时装饰器")
    
    timeout = Timeout(1)  # 创建超时对象
    timeout.start()  # 开始计时
    
    try:
        result = risky_operation(1.5)  # 需要1.5秒，会超时
        print(f"结果: {result}")
    except Timeout:
        print("装饰器超时！")
    finally:
        timeout.cancel()  # 取消超时

error_handling_example()
```

## 11. **性能对比示例**

```python
import gevent
import time
import threading
import requests
from gevent import monkey
monkey.patch_all()

def fetch_url_sync(url):
    """同步获取 URL"""
    try:
        response = requests.get(url, timeout=5)
        return response.status_code
    except Exception as e:
        return str(e)

def test_sync(urls):
    """同步版本测试"""
    print("同步版本开始...")
    start = time.time()
    
    results = []
    for url in urls:
        results.append(fetch_url_sync(url))
    
    elapsed = time.time() - start
    print(f"同步版本完成，耗时: {elapsed:.2f} 秒")
    return elapsed

def test_threading(urls):
    """多线程版本测试"""
    print("多线程版本开始...")
    start = time.time()
    
    results = []
    threads = []
    
    def worker(url):
        results.append(fetch_url_sync(url))
    
    for url in urls:
        thread = threading.Thread(target=worker, args=(url,))
        thread.start()
        threads.append(thread)
    
    for thread in threads:
        thread.join()
    
    elapsed = time.time() - start
    print(f"多线程版本完成，耗时: {elapsed:.2f} 秒")
    return elapsed

def test_gevent(urls):
    """Gevent 版本测试"""
    print("Gevent 版本开始...")
    start = time.time()
    
    jobs = [gevent.spawn(fetch_url_sync, url) for url in urls]
    gevent.joinall(jobs)
    
    results = [job.value for job in jobs]
    
    elapsed = time.time() - start
    print(f"Gevent 版本完成，耗时: {elapsed:.2f} 秒")
    return elapsed

def performance_comparison():
    """性能对比测试"""
    # 使用测试 URL（避免对外部服务造成压力）
    urls = [
        'https://httpbin.org/delay/1',  # 延迟1秒
        'https://httpbin.org/delay/1',
        'https://httpbin.org/delay/1',
        'https://httpbin.org/delay/1',
        'https://httpbin.org/delay/1',
    ] * 2  # 总共10个请求，每个延迟1秒
    
    print(f"测试 {len(urls)} 个请求，每个延迟1秒")
    
    # 测试不同方法
    sync_time = test_sync(urls[:2])  # 只测试2个，避免等待太久
    
    # 注意：在实际测试中，可能需要考虑线程/协程创建开销
    threading_time = test_threading(urls)
    gevent_time = test_gevent(urls)
    
    print(f"\n性能对比:")
    print(f"  同步:    {sync_time * (len(urls)/2):.2f} 秒 (估算)")
    print(f"  多线程:  {threading_time:.2f} 秒")
    print(f"  Gevent:  {gevent_time:.2f} 秒")
    
    # 计算加速比
    if threading_time > 0 and gevent_time > 0:
        print(f"\n加速比 (对比多线程): {threading_time/gevent_time:.2f}x")

# 运行性能测试
performance_comparison()
```

## 12. **最佳实践总结**

```python
"""
Gevent 最佳实践总结
"""

import gevent
from gevent import monkey
from gevent.pool import Pool

# 1. 尽早打猴子补丁
monkey.patch_all()

# 2. 使用连接池限制资源
pool = Pool(100)  # 限制最大并发数

# 3. 使用 with 语句管理资源
class ResourceManager:
    def __init__(self, resource_id):
        self.resource_id = resource_id
    
    def __enter__(self):
        print(f"获取资源 {self.resource_id}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        print(f"释放资源 {self.resource_id}")
    
    def use(self):
        gevent.sleep(0.1)
        return f"使用资源 {self.resource_id}"

def best_practices():
    """最佳实践示例"""
    
    # 4. 使用队列进行生产者-消费者模式
    from gevent.queue import Queue
    
    def producer(queue, items):
        for item in items:
            queue.put(item)
            gevent.sleep(0.01)
        queue.put(None)  # 结束信号
    
    def consumer(queue, name):
        while True:
            item = queue.get()
            if item is None:
                queue.put(None)  # 传递给其他消费者
                break
            print(f"{name} 处理: {item}")
            gevent.sleep(0.05)
    
    # 5. 合理的错误处理
    def safe_operation(operation_id):
        try:
            with ResourceManager(operation_id) as resource:
                return resource.use()
        except Exception as e:
            print(f"操作 {operation_id} 失败: {e}")
            return None
    
    # 6. 使用超时防止死锁
    from gevent import Timeout
    
    def operation_with_timeout(operation_id, timeout=2):
        try:
            with Timeout(timeout):
                return safe_operation(operation_id)
        except Timeout:
            print(f"操作 {operation_id} 超时")
            return None
    
    # 7. 批量处理数据
    def batch_process(items, batch_size=10):
        """分批处理数据"""
        results = []
        
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            
            # 使用协程池并发处理批次
            batch_jobs = [
                pool.spawn(operation_with_timeout, item)
                for item in batch
            ]
            
            gevent.joinall(batch_jobs)
            
            # 收集结果
            batch_results = [job.value for job in batch_jobs]
            results.extend(batch_results)
        
        return results
    
    # 8. 监控协程状态
    def monitored_task(task_id):
        """可监控的任务"""
        print(f"任务 {task_id} 开始")
        
        try:
            gevent.sleep(1)  # 模拟工作
            print(f"任务 {task_id} 完成")
            return f"任务 {task_id} 结果"
        except Exception as e:
            print(f"任务 {task_id} 异常: {e}")
            raise
        finally:
            print(f"任务 {task_id} 结束")
    
    # 创建并监控协程
    monitored_jobs = [gevent.spawn(monitored_task, i) for i in range(3)]
    
    # 等待所有完成，可以设置超时
    gevent.joinall(monitored_jobs, timeout=5)
    
    # 检查协程状态
    for i, job in enumerate(monitored_jobs):
        if job.ready():
            if job.successful():
                print(f"任务 {i} 成功: {job.value}")
            else:
                print(f"任务 {i} 失败: {job.exception}")
        else:
            print(f"任务 {i} 仍在运行")
    
    print("最佳实践示例完成")

best_practices()
```

## **核心要点总结**

### 1. **主要优势**
- **轻量级协程**：比线程更轻量，创建和切换开销小
- **同步编程风格**：使用猴子补丁后，可以保持同步代码风格
- **高性能 I/O**：特别适合 I/O 密集型应用

### 2. **常用场景**
- **Web 爬虫**：并发请求多个网页
- **网络服务器**：高并发 HTTP/WebSocket 服务器
- **API 客户端**：并发调用多个 API
- **数据处理**：并发处理大量数据
- **微服务**：服务间并发通信

### 3. **注意事项**
1. **猴子补丁顺序**：必须在导入任何标准库模块之前打补丁
2. **CPU 密集型任务**：Gevent 不适合 CPU 密集型任务
3. **C 扩展**：某些 C 扩展可能不兼容猴子补丁
4. **调试困难**：协程的堆栈跟踪可能难以调试

### 4. **常用模块**
- `gevent`：核心功能
- `gevent.pool`：协程池
- `gevent.queue`：协程安全队列
- `gevent.event`：事件和信号
- `gevent.lock`：锁机制
- `gevent.pywsgi`：WSGI 服务器

Gevent 是 Python 生态中成熟的并发解决方案，特别适合需要高并发 I/O 操作的场景。正确使用时，可以显著提升应用程序的性能。