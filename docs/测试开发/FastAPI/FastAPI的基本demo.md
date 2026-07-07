# FastAPI的基本demo

下面是一个典型的 FastAPI 应用示例，实现了一个简单的用户管理 API。它涵盖了路径参数、查询参数、请求体验证、依赖注入、错误处理和自动文档等核心功能。

### 完整代码

```python
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import secrets

# ---------- 1. 创建 FastAPI 应用实例 ----------
app = FastAPI(
    title="用户管理 API",
    description="一个展示 FastAPI 核心特性的示例 API",
    version="1.0.0"
)

# ---------- 2. 模拟数据库 ----------
fake_users_db = [
    {"id": 1, "name": "张三", "email": "zhangsan@example.com", "age": 25},
    {"id": 2, "name": "李四", "email": "lisi@example.com", "age": 30},
]

# ---------- 3. 安全依赖：HTTP Basic Auth ----------
security = HTTPBasic()

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """简单的身份验证依赖项（用户名密码校验）"""
    correct_username = secrets.compare_digest(credentials.username, "admin")
    correct_password = secrets.compare_digest(credentials.password, "secret")
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证失败",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# ---------- 4. Pydantic 模型（请求/响应数据校验） ----------
class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="用户姓名")
    email: EmailStr = Field(..., description="电子邮箱地址")
    age: Optional[int] = Field(None, ge=0, le=150, description="年龄")

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    class Config:
        orm_mode = True   # 允许从字典或 ORM 对象转换

# ---------- 5. API 端点 ----------

# 5.1 根路径
@app.get("/", tags=["系统"])
async def root():
    return {"message": "欢迎访问用户管理 API"}

# 5.2 获取用户列表（带查询参数分页）
@app.get("/users", response_model=List[UserResponse], tags=["用户"])
async def get_users(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(10, ge=1, le=100, description="返回的最大记录数"),
    # 可选：依赖注入认证（此处注释掉，允许公开访问）
    # username: str = Depends(verify_credentials)
):
    """
    获取所有用户，支持分页。
    - **skip**: 从第几条开始
    - **limit**: 最多返回多少条
    """
    return fake_users_db[skip : skip + limit]

# 5.3 根据 ID 获取单个用户（路径参数）
@app.get("/users/{user_id}", response_model=UserResponse, tags=["用户"])
async def get_user(user_id: int):
    user = next((u for u in fake_users_db if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user

# 5.4 创建新用户（请求体验证 + 依赖注入认证）
@app.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["用户"]
)
async def create_user(
    user: UserCreate,
    username: str = Depends(verify_credentials)   # 只有认证通过才能创建
):
    new_id = max(u["id"] for u in fake_users_db) + 1 if fake_users_db else 1
    new_user = {"id": new_id, **user.dict()}
    fake_users_db.append(new_user)
    return new_user

# 5.5 更新用户信息
@app.put("/users/{user_id}", response_model=UserResponse, tags=["用户"])
async def update_user(
    user_id: int,
    user_update: UserCreate,
    username: str = Depends(verify_credentials)
):
    user = next((u for u in fake_users_db if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.update(user_update.dict())
    return user

# 5.6 删除用户
@app.delete("/users/{user_id}", tags=["用户"])
async def delete_user(user_id: int, username: str = Depends(verify_credentials)):
    global fake_users_db
    user = next((u for u in fake_users_db if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    fake_users_db = [u for u in fake_users_db if u["id"] != user_id]
    return {"detail": "用户已删除"}

# ---------- 6. 运行说明（通常用 uvicorn 启动）----------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```

---

### 代码详细解释

#### 1. 创建 FastAPI 应用实例
```python
app = FastAPI(title="用户管理 API", ...)
```
- 通过 `FastAPI()` 创建核心应用，可以设置标题、描述、版本等元数据。这些信息会自动出现在 `/docs` 交互文档中。

#### 2. 模拟数据库
```python
fake_users_db = [{"id": 1, "name": "张三", ...}]
```
- 使用简单的内存列表代替真实数据库，便于演示。

#### 3. 安全依赖：HTTP Basic Auth
```python
security = HTTPBasic()
def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    ...
```
- `HTTPBasic()` 是 FastAPI 提供的安全工具，用于提取请求头中的 Basic Auth 凭证。
- `Depends(security)` 声明依赖项，FastAPI 会自动解析请求头并注入 `credentials` 对象。
- 使用 `secrets.compare_digest` 防止时序攻击。
- 验证失败时抛出 `HTTPException`，状态码 401，浏览器会弹出登录框。

#### 4. Pydantic 模型（数据校验）
```python
class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    age: Optional[int] = Field(None, ge=0, le=150)
```
- 继承 `BaseModel` 定义数据形状。
- `Field(...)` 中 `...` 表示该字段**必需**；`None` 表示可选。
- `EmailStr` 需要安装 `email-validator` 库，会自动验证邮箱格式。
- `ge`、`le` 等参数用于数值范围校验。
- `UserResponse` 额外包含 `id` 字段，并设置 `orm_mode = True`，允许从字典直接转换。

#### 5. API 端点详解

##### 根路径（`GET /`）
```python
@app.get("/", tags=["系统"])
async def root():
    return {"message": "欢迎访问..."}
```
- `@app.get` 装饰器声明 HTTP 方法。
- `tags` 参数用于在文档中对端点分组。

##### 获取用户列表（`GET /users`）
```python
async def get_users(skip: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=100)):
```
- `skip` 和 `limit` 是**查询参数**，因为它们在路径中没有声明，也不是请求体。
- `Query(...)` 可以添加校验（如 `ge=0`）和描述，这些信息会显示在文档中。
- 返回类型注解 `response_model=List[UserResponse]` 会过滤、转换响应数据，并生成 JSON Schema。

##### 获取单个用户（`GET /users/{user_id}`）
```python
async def get_user(user_id: int):
```
- `user_id` 声明为路径参数（因为它在路径 `{user_id}` 中）。
- 通过类型注解 `int`，FastAPI 自动将字符串转换为整数，无效值返回清晰错误。
- 如果用户不存在，手动抛出 `HTTPException` 并设置状态码 404。

##### 创建用户（`POST /users`）
```python
async def create_user(user: UserCreate, username: str = Depends(verify_credentials)):
```
- `user: UserCreate` 是一个 Pydantic 模型，FastAPI 会从请求体中读取 JSON 并自动校验。
- `username` 来自依赖注入 `verify_credentials`，只有认证通过才会执行到函数内部。
- 返回 `UserResponse` 模型，状态码为 `201 Created`。

##### 更新用户（`PUT /users/{user_id}`）
```python
async def update_user(user_id: int, user_update: UserCreate, ...):
```
- 组合了路径参数 `user_id` 和请求体 `user_update`。
- 同样需要认证。

##### 删除用户（`DELETE /users/{user_id}`）
```python
async def delete_user(user_id: int, username: str = Depends(verify_credentials)):
```
- 返回一个简单的 JSON 消息表示成功。

#### 6. 启动服务器
```python
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```
- `uvicorn` 是 ASGI 服务器，`reload=True` 开启热重载，适合开发。

---

### 如何运行与测试

1. **安装依赖**：
   ```bash
   pip install fastapi uvicorn[standard] email-validator
   ```

2. **保存代码** 为 `main.py`。

3. **运行**：
   ```bash
   python main.py
   ```
   或者直接用 uvicorn：
   ```bash
   uvicorn main:app --reload
   ```

4. **访问交互文档**：
   - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

5. **测试认证**：  
   创建或更新用户时，需要添加 HTTP Basic Auth 头，用户名 `admin`，密码 `secret`。在 Swagger UI 中点击右上角 “Authorize” 按钮即可设置。

---

### 这个示例展示了 FastAPI 的哪些核心特性？

| 特性           | 体现                          |
| -------------- | ----------------------------- |
| 路径操作装饰器 | `@app.get`, `@app.post` 等    |
| 路径参数       | `user_id: int`                |
| 查询参数       | `skip`, `limit` 使用 `Query`  |
| 请求体校验     | `user: UserCreate` (Pydantic) |
| 响应模型       | `response_model=UserResponse` |
| 依赖注入       | `Depends(verify_credentials)` |
| 安全认证       | `HTTPBasic`                   |
| 异常处理       | `raise HTTPException(...)`    |
| 自动文档       | 运行 `/docs` 查看             |
| 类型提示       | 全函数参数类型注解            |

通过这个例子，你可以快速理解 FastAPI 的开发模式：声明式、类型安全、自带文档，且性能出色。