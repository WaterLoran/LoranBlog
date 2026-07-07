# FastAPI依赖注入的示例

下面是一个更深入的 **FastAPI 依赖注入** 示例，它模拟了真实项目中常见的场景：数据库会话管理 + 当前用户认证。我会逐块解释代码，并说明依赖注入的核心工作原理。

### 完整代码

```python
from fastapi import FastAPI, Depends, HTTPException, status
from typing import Optional, Annotated
import asyncio

app = FastAPI(title="依赖注入深度示例")

# ---------- 1. 模拟资源：数据库会话 ----------
# 使用简单的字典模拟数据库，会话是一个异步上下文管理器
fake_db = {"users": {1: {"id": 1, "name": "Alice", "role": "admin"}}}

class DBSession:
    """模拟一个数据库会话，用于演示依赖注入的生命周期管理"""
    def __init__(self):
        self.transaction_open = False
        print("[DBSession] 创建会话")

    async def __aenter__(self):
        self.transaction_open = True
        print("[DBSession] 开启事务")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            print(f"[DBSession] 发生异常，回滚事务: {exc_val}")
        else:
            print("[DBSession] 提交事务")
        self.transaction_open = False
        await self.close()

    async def close(self):
        print("[DBSession] 关闭连接")

    def get_user(self, user_id: int):
        return fake_db["users"].get(user_id)

    def update_user(self, user_id: int, data: dict):
        if user_id in fake_db["users"]:
            fake_db["users"][user_id].update(data)

# ---------- 2. 依赖函数1：获取数据库会话 (yield 依赖) ----------
async def get_db_session():
    """依赖：创建并管理数据库会话的生命周期"""
    async with DBSession() as session:
        # 在 yield 之前的部分相当于“前置逻辑”
        yield session
        # 在 yield 之后的部分会在请求结束后执行（即使发生异常）
        # 这里已经由 DBSession 的 __aexit__ 处理了清理
        # 我们也可以在这里做额外的清理工作
        print("[get_db_session] 会话已清理")

# ---------- 3. 依赖函数2：获取当前用户（依赖于会话） ----------
async def get_current_user(
    session: DBSession = Depends(get_db_session),   # 依赖另一个依赖
    user_id: int = 1   # 示例中固定使用 user_id=1，实际中可以从 Token 解析
) -> dict:
    """依赖：从会话中获取当前用户，并进行权限检查"""
    user = session.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    # 假设我们还要验证用户是否被禁用等
    if user.get("disabled"):
        raise HTTPException(status_code=400, detail="用户已被禁用")
    print(f"[get_current_user] 获取到用户: {user['name']}")
    return user

# ---------- 4. 依赖函数3：检查管理员权限（依赖用户） ----------
async def require_admin(user: dict = Depends(get_current_user)):
    """依赖：确保当前用户是管理员"""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return user

# ---------- 5. API 端点：使用依赖注入 ----------

@app.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    """获取当前用户资料（依赖 get_current_user）"""
    return {"user": user}

@app.post("/admin/do-something")
async def admin_action(admin: dict = Depends(require_admin)):
    """管理员操作（依赖 require_admin，它又依赖 get_current_user）"""
    return {"message": f"管理员 {admin['name']} 执行了敏感操作"}

# ---------- 6. 可选的快捷方式：使用 Annotated 简化重复依赖 ----------
# 从 FastAPI 0.95 开始推荐使用 Annotated 模式
from typing import Annotated

# 定义类型别名
DbSessionDep = Annotated[DBSession, Depends(get_db_session)]
CurrentUserDep = Annotated[dict, Depends(get_current_user)]
AdminDep = Annotated[dict, Depends(require_admin)]

@app.get("/profile-annotated")
async def get_profile_annotated(user: CurrentUserDep):
    """使用 Annotated 简化依赖声明"""
    return {"user": user}

@app.post("/admin/annotated-action")
async def admin_action_annotated(admin: AdminDep):
    return {"message": f"管理员 {admin['name']} (Annotated 版本) 执行了操作"}

# ---------- 7. 测试：启动服务器 ----------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```

---

### 🔍 详细解释：依赖注入的核心概念

#### 什么是依赖注入？
依赖注入是一种设计模式，函数/类不再自己创建其依赖的对象（例如数据库连接、认证服务），而是通过参数“注入”进来。FastAPI 的 `Depends` 机制自动完成依赖的创建、解析和生命周期管理。

#### FastAPI 依赖注入的关键点

| 特性           | 说明                                                         |
| :------------- | :----------------------------------------------------------- |
| **声明方式**   | 使用 `Depends(callable)` 作为函数参数的默认值                |
| **可调用对象** | 依赖可以是普通函数、异步函数、类实例、生成器函数（`yield`）  |
| **依赖缓存**   | 在同一个 HTTP 请求中，同一个依赖只会被调用一次（默认行为），后续复用结果 |
| **依赖嵌套**   | 依赖可以依赖其他依赖，形成树状结构                           |
| **yield 依赖** | 支持上下文管理器模式，`yield` 前部分在请求开始时执行，`yield` 后部分在请求结束后执行（用于资源清理） |
| **异步支持**   | 依赖函数可以是 `async def`，也可以同步 `def`（FastAPI 会自动在线程池中执行同步依赖） |

---

### 🧩 示例中的依赖树分析

```
用户请求到达
    │
    ▼
API 端点 (例如 /admin/do-something)
    │ 参数: admin = Depends(require_admin)
    ▼
require_admin 依赖
    │ 参数: user = Depends(get_current_user)
    ▼
get_current_user 依赖
    │ 参数: session = Depends(get_db_session)
    ▼
get_db_session 依赖 (yield 生成器)
    │ 创建 DBSession 实例，进入 __aenter__
    │ yield session
    ▼
    │ session 被传递给 get_current_user
    │ get_current_user 使用 session 查询用户
    │ 返回 user 给 require_admin
    │ require_admin 检查 role
    │ 返回 admin 给端点
    ▼
端点处理请求，返回响应
    ▼
响应发送后，FastAPI 调用 get_db_session 生成器中 yield 之后的代码
    │ session.__aexit__ 被执行（提交事务/关闭连接）
    ▼
清理完成
```

---

### 🧪 运行测试与观察生命周期

1. **启动服务**：
   ```bash
   python main.py
   ```

2. **访问** `GET /profile` （无需额外认证，示例中固定 user_id=1）：
   ```bash
   curl http://localhost:8000/profile
   ```
   控制台输出：
   ```
   [DBSession] 创建会话
   [DBSession] 开启事务
   [get_current_user] 获取到用户: Alice
   [DBSession] 提交事务
   [DBSession] 关闭连接
   [get_db_session] 会话已清理
   ```
   **解释**：会话在请求开始时创建，在请求结束后自动清理。

3. **访问** `POST /admin/do-something` （需要管理员权限，Alice 是 admin）：
   ```bash
   curl -X POST http://localhost:8000/admin/do-something
   ```
   正常返回 `{"message":"管理员 Alice 执行了敏感操作"}`

4. **尝试访问不存在的用户**（若修改 `get_current_user` 中的 `user_id` 为 999），返回 404。

---

### 📌 依赖注入的最佳实践

#### 1. **使用 `Annotated` 定义类型别名**
从 FastAPI 0.95 开始，官方推荐使用 `Annotated` 来声明依赖，避免在每个路径函数中重复写 `Depends(...)`。示例中展示了 `DbSessionDep`、`CurrentUserDep` 的用法。

#### 2. **yield 依赖用于资源管理**
- 数据库会话、HTTP 客户端、文件句柄等需要显式释放的资源，使用 `yield` 模式。
- `yield` 之前的代码（类似于 `__enter__`）在请求开始时执行。
- `yield` 之后的代码（类似于 `__exit__`）在请求结束后执行，无论是否发生异常都会执行。
- 注意：`yield` 依赖内部必须使用 `try/finally` 或 `async with` 确保资源释放。

#### 3. **依赖缓存（单次请求内单例）**
在同一个请求中，多次调用同一个依赖（例如多个端点参数都 `Depends(get_current_user)`），FastAPI 只会执行该依赖一次，后续调用直接返回缓存的结果。这可以避免重复查询数据库。

#### 4. **同步与异步依赖混用**
- 如果依赖是 `def`（同步），FastAPI 会在外部线程池中执行，不会阻塞异步事件循环。
- 如果依赖是 `async def`，则在事件循环中执行。
- 优先使用 `async def` 处理 I/O 操作（如数据库查询、HTTP 调用）。

#### 5. **依赖的依赖可以覆盖全局**
`get_current_user` 依赖了 `get_db_session`，这意味着只要端点需要用户信息，数据库会话就会被自动创建和清理，无需在端点函数中显式处理会话。

---

### 🚨 常见陷阱与注意事项

| 陷阱                                                 | 解决方案                                                     |
| :--------------------------------------------------- | :----------------------------------------------------------- |
| 在 `yield` 依赖中捕获异常后重新抛出                  | 让异常自然传播，FastAPI 会处理异常响应；只有在需要自定义清理时才捕获 |
| 在路径函数中直接调用依赖函数（而不是通过 `Depends`） | 依赖内部的缓存和生命周期管理将失效，必须使用 `Depends`       |
| 在 `yield` 之后返回任何值                            | `yield` 生成器函数中，`yield` 之后不应再有 `return` 语句（除了隐式 `return`） |
| 过度使用依赖导致性能下降                             | 依赖本身应该有合理的开销；对于非常轻量的依赖，缓存机制影响不大 |

---

### 🎯 总结

FastAPI 的依赖注入系统是一个极其强大的工具，它让你能够：
- **分离关注点**：认证、数据库、权限检查等横切关注点从业务逻辑中抽离。
- **自动管理生命周期**：资源创建与清理由框架保证。
- **提升可测试性**：依赖可以轻松被模拟（mock）替换。
- **减少重复代码**：通过依赖组合，复用逻辑变得非常简洁。

这个示例展示了依赖注入最核心的三种形态：**普通依赖**、**嵌套依赖** 和 **yield 依赖**。掌握它们，你就能构建出优雅且健壮的 FastAPI 应用。