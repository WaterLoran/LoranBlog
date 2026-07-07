# FastAPI的后台任务功能

FastAPI 内置了 **后台任务（BackgroundTasks）** 功能，用于在**返回 HTTP 响应之后**执行耗时操作，例如发送邮件、处理文件、调用外部 API 等。这样客户端无需等待这些操作完成，提升了响应速度和用户体验。

---

## 🧠 核心概念

- **执行时机**：后台任务在响应已经发送给客户端之后执行。
- **依赖注入**：通过路径函数参数 `background_tasks: BackgroundTasks` 获取。
- **添加任务**：调用 `background_tasks.add_task(func, *args, **kwargs)`。
- **任务函数**：可以是普通的 `def` 函数（FastAPI 会在外部线程池中运行）或 `async def` 函数（会在事件循环中运行）。
- **生命周期**：后台任务与请求绑定。如果请求在任务执行前异常结束（如客户端断开），任务可能不会执行。

> ⚠️ **重要**：不要在后台任务中访问 `request` 对象，因为请求在响应发送后会被关闭。

---

## 📝 基础示例：发送邮件

```python
from fastapi import FastAPI, BackgroundTasks
from typing import Optional

app = FastAPI()

# 模拟发送邮件的耗时函数
def send_email(email_to: str, subject: str, body: str):
    import time
    time.sleep(2)  # 模拟网络延迟
    print(f"📧 已发送邮件至 {email_to}")
    print(f"   主题: {subject}")
    print(f"   内容: {body}")
    return True

@app.post("/send-notification/{email}")
async def notify(email: str, background_tasks: BackgroundTasks):
    # 添加后台任务：将在响应返回后执行
    background_tasks.add_task(
        send_email,
        email_to=email,
        subject="欢迎注册",
        body="感谢您使用我们的服务！"
    )
    return {"message": "通知已加入队列，邮件将在后台发送"}
```

**效果**：访问 `POST /send-notification/user@example.com` 会立即得到 `{"message": "..."}`，然后控制台会在大约 2 秒后打印邮件信息。

---

## 🧪 运行与测试

1. **安装依赖**：
   ```bash
   pip install fastapi uvicorn
   ```

2. **保存代码为 `main.py`**。

3. **启动服务**：
   ```bash
   uvicorn main:app --reload
   ```

4. **发送请求**（使用 `curl` 或浏览器）：
   ```bash
   curl -X POST http://localhost:8000/send-notification/test@example.com
   ```

   立即返回：
   ```json
   {"message":"通知已加入队列，邮件将在后台发送"}
   ```

   几秒后服务器控制台输出：
   ```
   📧 已发送邮件至 test@example.com
      主题: 欢迎注册
      内容: 感谢您使用我们的服务！
   ```

---

## 🔧 更复杂的示例：处理文件 + 数据库更新

```python
from fastapi import FastAPI, BackgroundTasks, UploadFile, File
import aiofiles
import os

app = FastAPI()

# 模拟数据库更新（同步函数，会在线程池执行）
def update_database(user_id: int, file_path: str):
    import time
    time.sleep(1)
    print(f"📀 数据库已更新：用户 {user_id} 上传文件 {file_path}")

# 后台处理上传的文件
async def process_uploaded_file(file_path: str, user_id: int):
    # 异步读取文件内容（不阻塞事件循环）
    async with aiofiles.open(file_path, 'rb') as f:
        content = await f.read()
        print(f"📂 文件内容长度: {len(content)} 字节")
    # 调用同步数据库更新（会自动在线程池执行）
    update_database(user_id, file_path)
    # 最后可以删除临时文件
    os.remove(file_path)
    print(f"🗑️ 临时文件 {file_path} 已删除")

@app.post("/upload/{user_id}")
async def upload_file(
    user_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    # 保存上传的文件到临时位置
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # 将处理任务添加到后台
    background_tasks.add_task(process_uploaded_file, temp_path, user_id)
    
    return {"message": f"文件 {file.filename} 已接收，将在后台处理"}
```

**说明**：
- 客户端上传文件后立即收到响应。
- 后台任务负责读取文件、更新数据库、清理临时文件，全部在响应返回后执行。

---

## 📌 后台任务与异步函数的配合

后台任务函数可以是 `async def` 或普通 `def`：

| 类型        | 执行方式             | 适用场景                                          |
| :---------- | :------------------- | :------------------------------------------------ |
| `def`       | 在外部线程池中运行   | CPU 密集型或同步 I/O 操作（如使用 `requests` 库） |
| `async def` | 在事件循环中直接运行 | 异步 I/O 操作（如 `aiohttp`、异步数据库驱动）     |

**示例**：混合使用两种类型
```python
async def async_task(data: str):
    await asyncio.sleep(1)
    print(f"异步任务: {data}")

def sync_task(data: str):
    time.sleep(1)
    print(f"同步任务: {data}")

@app.post("/mixed")
async def mixed(background_tasks: BackgroundTasks):
    background_tasks.add_task(async_task, "hello")
    background_tasks.add_task(sync_task, "world")
    return {"status": "added"}
```

---

## 🆚 与 Celery 等专业任务队列的对比

| 特性         | FastAPI BackgroundTasks          | Celery / RQ                  |
| :----------- | :------------------------------- | :--------------------------- |
| **持久化**   | ❌ 任务存储在内存中，服务重启丢失 | ✅ 支持 Redis/RabbitMQ 持久化 |
| **分布式**   | ❌ 仅限单个进程                   | ✅ 多 worker、多节点          |
| **重试机制** | ❌ 需手动实现                     | ✅ 内置重试、失败回调         |
| **任务监控** | ❌ 无                             | ✅ Flower 等管理界面          |
| **适用场景** | 轻量、快速、非关键任务           | 重量、可靠、生产级任务       |

**总结**：`BackgroundTasks` 适合**短小、非关键、无需持久化**的任务。对于邮件发送、文件处理等完全够用；如果需要任务幂等、重试、分布式，则考虑 Celery。

---

## ⚠️ 注意事项

1. **避免访问请求对象**：后台任务执行时，原始的 `Request` 对象可能已经被关闭或回收。
2. **异常处理**：后台任务中的未捕获异常会被记录到日志，但不会影响已发送的响应。建议在任务函数内部添加 `try/except`。
3. **依赖注入**：后台任务函数本身不支持 FastAPI 的 `Depends`，但你可以通过 `add_task` 传递已经解析好的依赖对象。
4. **生命周期**：如果使用 `yield` 依赖（如数据库会话），后台任务在响应返回后才执行，此时 `yield` 之后的清理代码已经运行，因此会话可能已关闭。解决方案是手动管理资源（在任务内部创建新会话）。

---

## 🎯 总结

- FastAPI 内置后台任务简单易用，无需额外依赖。
- 通过 `BackgroundTasks` 注入，调用 `add_task` 添加函数。
- 任务在响应后执行，不阻塞客户端。
- 适用于发送邮件、日志记录、数据清洗等非实时操作。

运行上述示例，你就能直观感受后台任务的便利性。对于更复杂的需求，可以再结合 Celery 等专业队列。