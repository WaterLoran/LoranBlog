# FastAPI中异步任务的功能

在 FastAPI 中，“异步任务”可以从两个层面来理解：利用 `async/await` 实现的高并发，以及将耗时操作放到后台处理的任务队列。

-   **`async/await` 异步编程**：一种**并发模型**，让单线程在处理 I/O 操作（如数据库查询、网络请求）时能“跳过”等待，去处理其他请求[reference:0]。这极大地提高了 I/O 密集型场景的吞吐量。
-   **后台任务**：一种**任务调度模式**，将耗时操作（如发邮件、处理文件）推迟到响应返回后执行，防止阻塞用户请求。

### 🧩 FastAPI 后台任务方案对比

根据任务需求和复杂度，可选择不同方案。

| 特性         | `BackgroundTasks` (内置)                          | `Celery` (第三方)                                            |
| :----------- | :------------------------------------------------ | :----------------------------------------------------------- |
| **原理**     | 在同一个应用的**后台线程**中执行任务[reference:2] | 独立的**Worker 进程**，通过**消息队列**（如 Redis）进行任务调度和执行[reference:3] |
| **任务状态** | 无法追踪，任务成功或失败对主应用透明[reference:4] | 提供完整的任务状态追踪（Pending, Started, Succeeded, Failed） |
| **结果存储** | 无                                                | 支持将执行结果存储在后端（如 Redis, DB），可随时查询         |
| **重试机制** | ❌ 不支持                                          | ✅ 支持，可定义自动重试次数和延迟                             |
| **定时任务** | ❌ 不支持                                          | ✅ 支持（Celery Beat），可实现周期性任务调度                  |
| **适用场景** | 轻量级、非关键任务（如记录日志、清理临时文件）。  | 重型、分布式、关键任务（如大规模数据处理、需要可靠交付的邮件通知）。 |

---

### ⚙️ 核心实现：`BackgroundTasks`

FastAPI 内置的 `BackgroundTasks` 是处理轻量级后台任务最便捷的工具。

#### 1. 基础用法

只需在路径函数中声明 `BackgroundTasks` 类型的参数，框架会自动注入实例。

```python
from fastapi import FastAPI, BackgroundTasks
import time

app = FastAPI()

# 定义后台任务函数（同步或异步均可）
def send_email(email: str, message: str):
    time.sleep(2)  # 模拟耗时
    print(f"📧 Email to {email}: {message}")

@app.post("/send-email/")
async def email_endpoint(email: str, background_tasks: BackgroundTasks):
    # 将任务添加到后台队列，函数名和参数依次传入
    background_tasks.add_task(send_email, email, "Welcome to our service!")
    # 主函数立即返回，不等待邮件发送完成
    return {"message": "Email will be sent in the background."}
```
它的核心工作流程是：路由处理（注册任务）-> 返回响应（用户得到反馈）-> 后台执行（邮件真正发送）[reference:6]。

#### 2. 进阶用法：`run_in_executor`

如果任务中包含**同步阻塞**的 I/O 操作（如 `requests.get`），它仍可能阻塞 `BackgroundTasks` 所在的线程。可以将同步任务包装到 `run_in_executor` 中执行，将其转化为非阻塞模式[reference:7]。

```python
import asyncio
import requests
from concurrent.futures import ThreadPoolExecutor

# 准备一个线程池执行器
executor = ThreadPoolExecutor(max_workers=4)

async def async_blocking_task(url: str):
    loop = asyncio.get_event_loop()
    # run_in_executor 会在指定线程池中运行同步函数，不阻塞事件循环
    result = await loop.run_in_executor(executor, requests.get, url)
    return result

@app.post("/fetch-data/")
async def fetch_data(background_tasks: BackgroundTasks, url: str):
    background_tasks.add_task(async_blocking_task, url)
    return {"message": "Data fetch initiated in background"}
```

---

### 🚀 企业级方案：`FastAPI + Celery`

对于需要**可靠、分布式、可监控**的生产级任务处理，`Celery` 是更合适的选择。

#### 1. 项目结构示例

一个典型的 FastAPI + Celery 项目结构如下：

```text
project/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 应用
│   ├── celery_worker.py # Celery 应用实例
│   └── tasks.py         # 任务定义
└── docker-compose.yml   # 编排 FastAPI, Celery Worker, Redis
```

#### 2. 关键代码示例

**`celery_worker.py`**：创建 Celery 应用，配置消息代理（Broker）和结果后端（Backend）。
```python
from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",   # 任务队列
    backend="redis://localhost:6379/0"   # 结果存储
)

celery_app.conf.update(
    task_track_started=True,
    task_time_limit=30 * 60,
)
```
**`tasks.py`**：定义具体的业务任务。
```python
from .celery_worker import celery_app
import time

@celery_app.task(bind=True, max_retries=3)
def process_data(self, data_id: int):
    try:
        # 模拟耗时计算
        time.sleep(10)
        return {"status": "success", "data_id": data_id}
    except Exception as exc:
        # 自动重试
        raise self.retry(exc=exc, countdown=60)
```
**`main.py`**：在 FastAPI 路由中调用 Celery 任务。
```python
from fastapi import FastAPI
from .tasks import process_data

app = FastAPI()

@app.post("/process/{data_id}")
async def process_endpoint(data_id: int):
    # 异步调用 Celery 任务，立即返回任务 ID
    task = process_data.delay(data_id)
    return {"task_id": task.id, "status": "processing"}

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    # 查询任务状态
    task = process_data.AsyncResult(task_id)
    return {"task_id": task_id, "status": task.status, "result": task.result}
```

#### 3. 运行与监控

需要同时启动 FastAPI 应用和 Celery Worker 进程。

```bash
# 启动 FastAPI 应用
uvicorn app.main:app --reload
# 启动 Celery Worker，-l info 表示日志级别
celery -A app.celery_worker.celery_app worker --loglevel=info
```
配合 `Celery Beat` 可实现周期性任务，`Flower` 则提供了可视化的 Web 监控界面。

---

### ✨ 更多异步任务模式

除了上述核心方案，FastAPI 还支持以下模式：

- **路径操作中的并发**：在 `async def` 路径函数内部，可使用 `asyncio.gather()` 并发执行多个 I/O 任务，大幅提升单次请求的处理效率。
- **启动/关闭事件中的任务**：利用 `lifespan` 功能，可在应用启动时初始化并运行后台任务，如周期性数据同步。
- **使用 APScheduler**：若场景主要为定时任务，`APScheduler` 是比 `Celery` 更轻量的选择，可方便地集成到 FastAPI 中。

### 💎 总结

- 如果任务**轻量、无需追踪**，使用内置的 **`BackgroundTasks`**。
- 如果任务**重量、需要可靠交付**，集成 **`Celery`**。
- 无论是哪种后台任务，都应遵循**任务函数短小精悍**的原则，并做好**充分的异常捕获与日志记录**，以避免对主应用造成负面影响。

如果你有更具体的场景，比如需要实现失败重试、任务进度上报，或者想集成现有的消息队列，可以再告诉我，我帮你看看更具体的实现方案。