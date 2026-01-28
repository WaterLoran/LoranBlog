# Python中的Queue队列

Python 中的 `queue` 模块提供了多种线程安全的队列实现，主要用于多线程编程中的数据交
换和同步。让我详细介绍各类队列的使用方法和应用场景。

## **1. 队列类型概览**

| 队列类型        | 特点             | 应用场景               |
| --------------- | ---------------- | ---------------------- |
| `Queue`         | 先进先出（FIFO） | 任务队列、消息队列     |
| `LifoQueue`     | 后进先出（LIFO） | 撤销操作、深度优先搜索 |
| `PriorityQueue` | 优先级队列       | 任务调度、事件处理     |
| `SimpleQueue`   | 简单队列（3.7+） | 简单生产者-消费者      |

## **2. Queue（先进先出队列）**

### **2.1 基本使用**
```python
import queue
import threading
import time

# 创建队列
q = queue.Queue(maxsize=3)  # 最大容量为3

# 基本操作
q.put('任务1')          # 添加元素，队列满时会阻塞
q.put('任务2')
q.put_nowait('任务3')    # 不阻塞，队列满时抛出queue.Full异常

print(f"队列大小: {q.qsize()}")      # 当前元素数量: 3
print(f"队列是否满: {q.full()}")     # True
print(f"队列是否空: {q.empty()}")    # False

# 获取元素
item = q.get()           # 获取并移除，队列空时会阻塞
print(f"获取: {item}")   # 任务1
item = q.get_nowait()    # 不阻塞，队列空时抛出queue.Empty异常
print(f"获取: {item}")   # 任务2

# 任务完成标记
q.task_done()  # 标记一个任务完成
q.join()       # 阻塞直到所有任务完成
```

### **2.2 生产者-消费者模式**
```python
import queue
import threading
import random
import time

def producer(q, name):
    """生产者函数"""
    for i in range(5):
        item = f"产品_{name}_{i}"
        time.sleep(random.uniform(0.1, 0.5))
        q.put(item)
        print(f"[生产者{name}] 生产: {item}")

def consumer(q, name):
    """消费者函数"""
    while True:
        try:
            # 设置超时避免永久阻塞
            item = q.get(timeout=2)
            time.sleep(random.uniform(0.2, 0.8))
            print(f"[消费者{name}] 消费: {item}")
            q.task_done()  # 标记任务完成
        except queue.Empty:
            print(f"[消费者{name}] 队列已空，退出")
            break

# 创建队列
q = queue.Queue(maxsize=10)

# 创建线程
producers = [
    threading.Thread(target=producer, args=(q, f"P{i}"))
    for i in range(3)
]

consumers = [
    threading.Thread(target=consumer, args=(q, f"C{i}"))
    for i in range(2)
]

# 启动线程
for p in producers:
    p.start()

for c in consumers:
    c.start()

# 等待生产者完成
for p in producers:
    p.join()

# 等待队列清空
q.join()

# 停止消费者（通过超时机制）
for c in consumers:
    c.join()

print("所有任务完成")
```

## **3. LifoQueue（后进先出队列/栈）**

### **3.1 基本使用**
```python
import queue

# 创建LIFO队列（栈）
stack = queue.LifoQueue()

# 压栈
stack.put("任务1")
stack.put("任务2")
stack.put("任务3")

# 弹栈（后进先出）
print(stack.get())  # 任务3
print(stack.get())  # 任务2
print(stack.get())  # 任务1
```

### **3.2 应用场景：撤销操作**
```python
import queue

class Editor:
    """支持撤销操作的文本编辑器"""
    def __init__(self):
        self.text = ""
        self.undo_stack = queue.LifoQueue()
        self.redo_stack = queue.LifoQueue()
    
    def write(self, new_text):
        """写入文本，保存到撤销栈"""
        if self.text != new_text:
            # 保存当前状态到撤销栈
            self.undo_stack.put(self.text)
            # 清空重做栈
            while not self.redo_stack.empty():
                self.redo_stack.get()
            self.text = new_text
    
    def undo(self):
        """撤销操作"""
        if not self.undo_stack.empty():
            # 当前状态保存到重做栈
            self.redo_stack.put(self.text)
            # 恢复到上一个状态
            self.text = self.undo_stack.get()
    
    def redo(self):
        """重做操作"""
        if not self.redo_stack.empty():
            # 当前状态保存到撤销栈
            self.undo_stack.put(self.text)
            # 恢复到重做栈中的状态
            self.text = self.redo_stack.get()
    
    def __str__(self):
        return f"文本: {self.text}"

# 使用示例
editor = Editor()
editor.write("Hello")
editor.write("Hello World")
editor.write("Hello World!")

print(editor)  # Hello World!

editor.undo()
print(editor)  # Hello World

editor.undo()
print(editor)  # Hello

editor.redo()
print(editor)  # Hello World
```

## **4. PriorityQueue（优先级队列）**

### **4.1 基本使用**
```python
import queue
import threading

# 创建优先级队列
pq = queue.PriorityQueue()

# 添加元素（优先级，数据）
# 优先级数字越小，优先级越高
pq.put((2, "中级任务"))
pq.put((1, "紧急任务"))
pq.put((3, "普通任务"))

# 按优先级顺序获取
print(pq.get()[1])  # 紧急任务
print(pq.get()[1])  # 中级任务
print(pq.get()[1])  # 普通任务
```

### **4.2 应用场景：任务调度系统**
```python
import queue
import threading
import time
from dataclasses import dataclass, field
from typing import Any
from enum import IntEnum

class TaskPriority(IntEnum):
    """任务优先级枚举"""
    CRITICAL = 1    # 关键任务
    HIGH = 2        # 高优先级
    NORMAL = 3      # 普通优先级
    LOW = 4         # 低优先级

@dataclass(order=True)
class Task:
    """任务类，支持优先级比较"""
    priority: int
    name: str = field(compare=False)
    data: Any = field(compare=False)
    
    def __str__(self):
        return f"任务[{self.name}] 优先级:{self.priority}"

class TaskScheduler:
    """任务调度器"""
    def __init__(self, num_workers=3):
        self.task_queue = queue.PriorityQueue()
        self.workers = []
        self.stop_event = threading.Event()
        
        # 创建工作线程
        for i in range(num_workers):
            worker = threading.Thread(
                target=self._worker_func,
                args=(f"Worker-{i}",),
                daemon=True
            )
            self.workers.append(worker)
    
    def add_task(self, task: Task):
        """添加任务"""
        self.task_queue.put(task)
        print(f"[调度器] 添加任务: {task}")
    
    def _worker_func(self, name):
        """工作线程函数"""
        print(f"[{name}] 启动")
        
        while not self.stop_event.is_set():
            try:
                # 获取任务（2秒超时）
                task = self.task_queue.get(timeout=2)
                print(f"[{name}] 开始执行: {task}")
                
                # 模拟任务执行
                time.sleep(1)
                print(f"[{name}] 完成执行: {task}")
                
                self.task_queue.task_done()
                
            except queue.Empty:
                continue
    
    def start(self):
        """启动调度器"""
        for worker in self.workers:
            worker.start()
    
    def stop(self):
        """停止调度器"""
        self.stop_event.set()
        self.task_queue.join()
        print("所有任务完成，调度器停止")

# 使用示例
scheduler = TaskScheduler(num_workers=2)

# 添加任务
scheduler.add_task(Task(
    priority=TaskPriority.NORMAL,
    name="数据备份",
    data={"type": "backup", "path": "/data"}
))

scheduler.add_task(Task(
    priority=TaskPriority.CRITICAL,
    name="紧急修复",
    data={"type": "fix", "bug_id": "BUG-001"}
))

scheduler.add_task(Task(
    priority=TaskPriority.HIGH,
    name="用户报告",
    data={"type": "report", "user_id": 123}
))

# 启动调度器
scheduler.start()
time.sleep(5)  # 运行一段时间
scheduler.stop()
```

## **5. SimpleQueue（简单队列）**

### **5.1 基本使用**
```python
import queue
import threading

# 创建简单队列（无大小限制，没有task_done/join功能）
sq = queue.SimpleQueue()

# 基本操作
sq.put("任务1")
sq.put("任务2")

print(sq.get())  # 任务1
print(sq.get())  # 任务2
print(sq.empty())  # True
```

## **6. 实际应用场景**

### **6.1 Web爬虫任务队列**
```python
import queue
import threading
import requests
from urllib.parse import urljoin
from bs4 import BeautifulSoup

class WebCrawler:
    def __init__(self, start_url, max_pages=50):
        self.url_queue = queue.Queue()
        self.visited = set()
        self.url_queue.put(start_url)
        self.max_pages = max_pages
        self.pages_crawled = 0
        self.lock = threading.Lock()
        
    def crawl(self):
        """启动爬虫"""
        threads = []
        for i in range(5):  # 5个爬虫线程
            thread = threading.Thread(target=self._crawler_worker)
            threads.append(thread)
            thread.start()
        
        # 等待所有线程完成
        for thread in threads:
            thread.join()
    
    def _crawler_worker(self):
        """爬虫工作线程"""
        while self.pages_crawled < self.max_pages:
            try:
                url = self.url_queue.get(timeout=2)
                
                with self.lock:
                    if url in self.visited:
                        continue
                    self.visited.add(url)
                
                # 获取页面
                try:
                    response = requests.get(url, timeout=5)
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # 提取链接
                    for link in soup.find_all('a', href=True):
                        new_url = urljoin(url, link['href'])
                        if new_url not in self.visited:
                            self.url_queue.put(new_url)
                    
                    # 处理页面内容
                    self._process_page(url, soup)
                    
                    with self.lock:
                        self.pages_crawled += 1
                    
                    print(f"已爬取: {url} (总数: {self.pages_crawled})")
                
                except Exception as e:
                    print(f"错误爬取 {url}: {e}")
                
                finally:
                    self.url_queue.task_done()
            
            except queue.Empty:
                break
    
    def _process_page(self, url, soup):
        """处理页面内容"""
        # 这里可以实现页面解析和存储逻辑
        title = soup.title.string if soup.title else "无标题"
        print(f"处理: {title}")
```

### **6.2 日志处理系统**
```python
import queue
import threading
import logging
import time
from datetime import datetime

class AsyncLogger:
    """异步日志处理器"""
    def __init__(self, log_file="app.log"):
        self.log_queue = queue.Queue()
        self.running = True
        self.log_file = log_file
        
        # 启动日志处理线程
        self.worker = threading.Thread(target=self._log_worker)
        self.worker.daemon = True
        self.worker.start()
    
    def log(self, level, message):
        """添加日志到队列"""
        log_entry = {
            'timestamp': datetime.now(),
            'level': level,
            'message': message,
            'thread': threading.current_thread().name
        }
        self.log_queue.put(log_entry)
    
    def _log_worker(self):
        """日志处理线程"""
        with open(self.log_file, 'a') as f:
            while self.running or not self.log_queue.empty():
                try:
                    # 获取日志条目（1秒超时）
                    entry = self.log_queue.get(timeout=1)
                    
                    # 格式化日志
                    log_line = (
                        f"{entry['timestamp']} "
                        f"[{entry['level']}] "
                        f"[{entry['thread']}] "
                        f"{entry['message']}\n"
                    )
                    
                    # 写入文件
                    f.write(log_line)
                    f.flush()
                    
                    self.log_queue.task_done()
                    
                except queue.Empty:
                    continue
    
    def info(self, message):
        self.log('INFO', message)
    
    def error(self, message):
        self.log('ERROR', message)
    
    def stop(self):
        """停止日志处理器"""
        self.running = False
        self.log_queue.join()

# 使用示例
logger = AsyncLogger()

# 多个线程同时记录日志
def worker_func(name):
    for i in range(5):
        logger.info(f"线程{name}: 消息{i}")
        time.sleep(0.1)

threads = []
for i in range(3):
    thread = threading.Thread(target=worker_func, args=(f"T{i}",))
    threads.append(thread)
    thread.start()

for thread in threads:
    thread.join()

logger.stop()
```

### **6.3 数据流水线处理**
```python
import queue
import threading
import time
import random

class DataPipeline:
    """多阶段数据流水线"""
    def __init__(self):
        # 创建队列连接各个阶段
        self.raw_data_queue = queue.Queue(maxsize=100)
        self.processed_queue = queue.Queue(maxsize=100)
        self.storage_queue = queue.Queue(maxsize=100)
        
        # 启动各个处理阶段
        self.stages = [
            threading.Thread(target=self._stage1_collect),
            threading.Thread(target=self._stage2_process),
            threading.Thread(target=self._stage3_store),
        ]
        
        for stage in self.stages:
            stage.start()
    
    def _stage1_collect(self):
        """阶段1：数据收集"""
        while True:
            # 模拟数据收集
            time.sleep(random.uniform(0.1, 0.3))
            data = {
                'id': random.randint(1, 1000),
                'value': random.random(),
                'timestamp': time.time()
            }
            self.raw_data_queue.put(data)
            print(f"[收集] 收集数据: {data['id']}")
    
    def _stage2_process(self):
        """阶段2：数据处理"""
        while True:
            try:
                data = self.raw_data_queue.get(timeout=2)
                
                # 模拟数据处理
                time.sleep(random.uniform(0.05, 0.15))
                data['processed'] = data['value'] * 100
                data['status'] = 'processed'
                
                self.processed_queue.put(data)
                print(f"[处理] 处理数据: {data['id']}")
                
                self.raw_data_queue.task_done()
                
            except queue.Empty:
                continue
    
    def _stage3_store(self):
        """阶段3：数据存储"""
        while True:
            try:
                data = self.processed_queue.get(timeout=2)
                
                # 模拟数据存储
                time.sleep(random.uniform(0.02, 0.08))
                print(f"[存储] 存储数据: {data['id']} 值: {data['processed']:.2f}")
                
                self.processed_queue.task_done()
                
            except queue.Empty:
                continue
    
    def stop(self):
        """停止流水线"""
        # 等待所有队列清空
        self.raw_data_queue.join()
        self.processed_queue.join()

# 使用示例
pipeline = DataPipeline()
time.sleep(5)  # 运行5秒
pipeline.stop()
```

## **7. 队列使用最佳实践**

### **7.1 避免死锁的技巧**
```python
import queue
import threading
import time

class SafeQueue:
    def __init__(self):
        self.queue = queue.Queue()
        self.timeout = 5  # 超时时间
        self.shutdown_flag = threading.Event()
    
    def put_safe(self, item):
        """安全添加元素"""
        if self.shutdown_flag.is_set():
            return False
        
        try:
            self.queue.put(item, timeout=self.timeout)
            return True
        except queue.Full:
            print("队列已满，添加失败")
            return False
    
    def get_safe(self):
        """安全获取元素"""
        while not self.shutdown_flag.is_set():
            try:
                item = self.queue.get(timeout=1)
                return item
            except queue.Empty:
                continue
        return None
    
    def shutdown(self):
        """优雅关闭"""
        self.shutdown_flag.set()
        # 清空队列，释放等待的线程
        while not self.queue.empty():
            try:
                self.queue.get_nowait()
                self.queue.task_done()
            except queue.Empty:
                break
```

### **7.2 性能监控队列**
```python
import queue
import time
from threading import Lock

class MonitoredQueue(queue.Queue):
    """带监控功能的队列"""
    def __init__(self, maxsize=0):
        super().__init__(maxsize)
        self.put_count = 0
        self.get_count = 0
        self.avg_put_time = 0
        self.avg_get_time = 0
        self.lock = Lock()
    
    def put(self, item, block=True, timeout=None):
        start_time = time.time()
        try:
            return super().put(item, block, timeout)
        finally:
            with self.lock:
                self.put_count += 1
                put_time = time.time() - start_time
                # 更新平均时间
                self.avg_put_time = (
                    self.avg_put_time * (self.put_count - 1) + put_time
                ) / self.put_count
    
    def get(self, block=True, timeout=None):
        start_time = time.time()
        try:
            return super().get(block, timeout)
        finally:
            with self.lock:
                self.get_count += 1
                get_time = time.time() - start_time
                self.avg_get_time = (
                    self.avg_get_time * (self.get_count - 1) + get_time
                ) / self.get_count
    
    def get_stats(self):
        """获取统计信息"""
        with self.lock:
            return {
                'size': self.qsize(),
                'maxsize': self.maxsize,
                'puts': self.put_count,
                'gets': self.get_count,
                'avg_put_time_ms': self.avg_put_time * 1000,
                'avg_get_time_ms': self.avg_get_time * 1000
            }
```

## **8. 队列选择指南**

| 场景           | 推荐队列             | 原因               |
| -------------- | -------------------- | ------------------ |
| 任务调度       | `PriorityQueue`      | 支持任务优先级     |
| 线程池任务分发 | `Queue`              | 先进先出，公平调度 |
| 撤销操作       | `LifoQueue`          | 后进先出，栈特性   |
| 简单通信       | `SimpleQueue`        | 无额外开销         |
| 数据流水线     | `Queue`              | 支持任务完成跟踪   |
| 实时系统       | `Queue` with timeout | 避免死锁，响应及时 |
| 资源受限       | `Queue(maxsize=N)`   | 控制内存使用       |

## **9. 注意事项**

1. **队列大小**：无界队列可能导致内存溢出，建议设置合适的 `maxsize`
2. **超时设置**：使用 `timeout` 参数避免永久阻塞
3. **任务完成**：使用 `task_done()` 和 `join()` 确保所有任务完成
4. **异常处理**：正确处理 `queue.Full` 和 `queue.Empty` 异常
5. **线程安全**：队列本身是线程安全的，但队列中的对象可能需要额外同步

Python的 `queue` 模块提供了强大而灵活的队列实现，是多线程编程中数据交换和任务调度的核心工具。正确选择和使用队列可以显著提高程序的并发性能和可靠性。