# FastAPI使用中间件的示例

下面是一个完整的 **FastAPI 中间件** 示例，涵盖了自定义中间件和内置中间件的使用。代码中包含详细的注释，并解释了中间件的执行流程。

### 完整代码（可直接运行）

```python
import time
import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware import Middleware

app = FastAPI(title="中间件示例")

# ---------- 1. 使用装饰器定义简单中间件（记录请求耗时） ----------
@app.middleware("http")
async def log_request_time(request: Request, call_next):
    """
    记录每个请求的处理耗时，并添加到响应头 X-Process-Time 中
    """
    start_time = time.perf_counter()
    
    # 可以在这里添加请求前逻辑
    print(f"请求开始: {request.method} {request.url.path}")
    
    # 调用下一个中间件或最终的路由处理函数
    response = await call_next(request)
    
    # 请求后逻辑：计算耗时并添加到响应头
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    print(f"请求完成: {request.method} {request.url.path} - 耗时 {process_time:.4f}s")
    
    return response

# ---------- 2. 使用类方式定义中间件（添加请求 ID） ----------
class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    为每个请求生成唯一 ID，添加到响应头 X-Request-ID
    如果请求头中已有 X-Request-ID，则沿用（可用于分布式追踪）
    """
    async def dispatch(self, request: Request, call_next):
        # 从请求头获取已有的 request_id，否则生成新的
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        # 将 request_id 存储到 request.state 中，方便路由函数使用
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

# 注册类中间件
app.add_middleware(RequestIDMiddleware)

# ---------- 3. 添加内置中间件：CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],               # 允许所有来源，生产环境应指定具体域名
    allow_credentials=True,
    allow_methods=["*"],               # 允许所有 HTTP 方法
    allow_headers=["*"],               # 允许所有请求头
)

# ---------- 4. 添加内置中间件：信任主机 ----------
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["example.com", "*.example.com", "localhost", "127.0.0.1"]
)

# ---------- 5. 使用中间件存储的数据 ----------
@app.get("/")
async def root(request: Request):
    # 从 request.state 中获取中间件设置的 request_id
    request_id = getattr(request.state, "request_id", "unknown")
    return {
        "message": "Hello World",
        "your_request_id": request_id
    }

@app.get("/slow")
async def slow_operation():
    import asyncio
    await asyncio.sleep(1)  # 模拟耗时操作
    return {"result": "操作完成"}

# ---------- 6. 另一种高级写法：直接使用 Starlette 的 Middleware 类 ----------
# 这里展示一个简单的异常处理中间件（记录异常日志并返回统一错误格式）
from fastapi import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import traceback

class ExceptionHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except HTTPException as http_exc:
            # 对于 FastAPI 主动抛出的 HTTPException，直接返回，不改变状态码
            return Response(
                content=f'{{"detail": "{http_exc.detail}"}}',
                status_code=http_exc.status_code,
                media_type="application/json"
            )
        except Exception as exc:
            # 未捕获的异常：记录日志，返回 500
            print(f"未处理的异常: {traceback.format_exc()}")
            return Response(
                content='{"detail": "Internal Server Error"}',
                status_code=500,
                media_type="application/json"
            )

# 注册异常处理中间件（注意顺序：一般放在最外层）
app.add_middleware(ExceptionHandlerMiddleware)

# ---------- 7. 启动服务器 ----------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 🔍 中间件详解

### 什么是中间件？

中间件是一个**在请求到达路由处理函数之前**和**响应返回客户端之前**执行的钩子函数。它能够：
- 检查/修改请求（`Request`）
- 检查/修改响应（`Response`）
- 执行额外逻辑（日志、鉴权、计时、添加头等）
- 提前返回响应（短路后续处理）

### FastAPI 中定义中间件的两种方式

| 方式                        | 适用场景                 | 示例                 |
| :-------------------------- | :----------------------- | :------------------- |
| `@app.middleware("http")`   | 简单、快速，适合轻量逻辑 | 记录请求耗时         |
| `class(BaseHTTPMiddleware)` | 需要更多控制、复用或继承 | 请求ID生成、异常处理 |

两种方式最终都是 ASGI 中间件，性能无本质区别。

---

## 📌 中间件执行流程图

```
客户端请求
    │
    ▼
[中间件1] 请求前逻辑 (before)
    │
    ▼
[中间件2] 请求前逻辑
    │
    ▼
路由处理函数 (业务逻辑)
    │
    ▼
[中间件2] 响应后逻辑 (after)
    │
    ▼
[中间件1] 响应后逻辑
    │
    ▼
返回客户端
```

- **顺序**：`add_middleware` 或装饰器注册的顺序 **与执行顺序相反**（即先注册的后执行请求前逻辑，后注册的先执行）。  
  但在上述代码中，`@app.middleware` 和 `add_middleware` 混合使用时，推荐遵循 **越外层（通用）越先注册** 的原则。

---

## 🧪 测试中间件效果

### 1. 启动服务
```bash
python main.py
```

### 2. 发送请求
```bash
curl -v http://localhost:8000/
```

你会看到响应头中包含：
- `X-Process-Time: 0.000123`
- `X-Request-ID: 某个UUID`

控制台输出：
```
请求开始: GET /
请求完成: GET / - 耗时 0.0012s
```

### 3. 测试慢请求
```bash
curl http://localhost:8000/slow
```
`X-Process-Time` 会显示约 1 秒。

### 4. 测试异常处理
触发一个未捕获的异常（例如修改代码抛出一个普通的 `Exception`），中间件会捕获并返回 500 错误。

---

## 🛠️ 常用内置中间件

FastAPI（基于 Starlette）提供了多个内置中间件，直接 `add_middleware` 即可使用：

| 中间件                    | 功能               | 示例                   |
| :------------------------ | :----------------- | :--------------------- |
| `CORSMiddleware`          | 跨域资源共享       | 允许前端 AJAX 请求     |
| `TrustedHostMiddleware`   | 限制允许的主机头   | 防止 Host 头攻击       |
| `GZipMiddleware`          | 压缩响应体         | 减少传输大小           |
| `HTTPSRedirectMiddleware` | 强制重定向到 HTTPS | 生产环境安全           |
| `SessionMiddleware`       | 服务端会话支持     | 需要 `itsdangerous` 库 |

示例：添加 GZip 压缩
```python
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

---

## ⚠️ 中间件注意事项

1. **必须调用 `await call_next(request)`**  
   否则请求不会继续向下传递，导致路由不执行。

2. **不要修改已发送的响应体**  
   一旦 `call_next` 返回，响应可能已经开始流式传输，某些修改可能无效或引发错误。可以安全修改的是响应头。

3. **异步与同步**  
   `@app.middleware("http")` 装饰的函数必须是 `async def`；`BaseHTTPMiddleware` 的 `dispatch` 也必须是 `async def`。内部可以调用同步代码（使用 `run_in_executor` 或直接编写同步逻辑，但会阻塞事件循环）。

4. **中间件顺序很重要**  
   - 异常处理中间件通常放在最外层（最先注册），以便捕获所有内部异常。
   - CORS 中间件通常放在较外层，因为它需要添加响应头。
   - 请求ID中间件放在更靠近业务逻辑的位置，确保ID生成后可用于其他中间件。

5. **性能影响**  
   每个中间件都会增加一次函数调用开销。生产环境中只添加必要的中间件。

---

## 🎯 总结

- 中间件是 FastAPI 扩展功能、实现横切关注点（日志、监控、安全）的强大机制。
- 使用 `@app.middleware("http")` 快速定义，或继承 `BaseHTTPMiddleware` 获得更清晰的结构。
- 通过 `request.state` 可以在中间件和路由函数之间传递数据。
- 合理利用内置中间件可以避免重复造轮子。

运行上述示例代码，观察控制台输出和响应头，你就能直观理解中间件的工作方式。