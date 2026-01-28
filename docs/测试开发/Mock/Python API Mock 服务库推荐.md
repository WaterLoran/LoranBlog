# Python API Mock 服务库推荐

对于需要拉起长期运行的 API Mock 服务，以下是几个专门为此设计的 Python 库：

## 1. **Prism** (推荐)

### 特点
- 基于 OpenAPI/Swagger 规范
- 支持验证、模拟和文档生成
- 高性能，专为 API Mock 设计

### 安装和使用
```bash
# 安装
pip install prism

# 使用 OpenAPI 文件启动 Mock 服务
prism mock openapi.yaml
```

### 示例
```python
# 通过 Python 启动
import subprocess
import time

def start_prism_mock(openapi_file, port=4010):
    """启动 Prism Mock 服务"""
    process = subprocess.Popen([
        'prism', 'mock', openapi_file, '-p', str(port)
    ])
    time.sleep(2)  # 等待服务启动
    return process

# 启动服务
prism_process = start_prism_mock('api_spec.yaml')

# 使用服务
import requests
response = requests.get('http://localhost:4010/users')
print(response.json())

# 停止服务
prism_process.terminate()
```

## 2. **Mockserver**

### 特点
- 功能丰富的 Mock 服务器
- 支持动态配置期望值
- 可以记录和重放请求

### 安装
```bash
pip install mockserver
```

### 示例代码
```python
from mockserver import MockServerClient, request, times
from mockserver.json_equals import json_equals
import threading
import time

# 启动 Mock 服务器
def run_mock_server():
    client = MockServerClient("localhost", 1080)
    
    # 设置期望的请求和响应
    client.stub(
        request(
            method="GET",
            path="/users"
        ),
        times(1)
    ).respond_with(
        response(
            status_code=200,
            body=[
                {"id": 1, "name": "John"},
                {"id": 2, "name": "Jane"}
            ]
        )
    )
    
    # 保持服务器运行
    while True:
        time.sleep(1)

# 在后台线程中运行
server_thread = threading.Thread(target=run_mock_server, daemon=True)
server_thread.start()

# 使用 Mock 服务
response = requests.get("http://localhost:1080/users")
print(response.json())
```

## 3. **Flask** + **Flask-RESTful** (自定义方案)

### 特点
- 完全自定义的 Mock 服务
- 灵活性极高
- 适合复杂业务逻辑

### 示例代码
```python
from flask import Flask, jsonify, request
from flask_restful import Api, Resource
import threading
import time

app = Flask(__name__)
api = Api(app)

# Mock 数据存储
mock_data = {
    'users': [
        {'id': 1, 'name': 'Alice', 'email': 'alice@example.com'},
        {'id': 2, 'name': 'Bob', 'email': 'bob@example.com'}
    ],
    'products': [
        {'id': 1, 'name': 'Product A', 'price': 99.99},
        {'id': 2, 'name': 'Product B', 'price': 149.99}
    ]
}

class UserList(Resource):
    def get(self):
        return jsonify(mock_data['users'])
    
    def post(self):
        new_user = request.get_json()
        new_user['id'] = len(mock_data['users']) + 1
        mock_data['users'].append(new_user)
        return jsonify(new_user), 201

class UserDetail(Resource):
    def get(self, user_id):
        user = next((u for u in mock_data['users'] if u['id'] == user_id), None)
        if user:
            return jsonify(user)
        return {'error': 'User not found'}, 404

api.add_resource(UserList, '/users')
api.add_resource(UserDetail, '/users/<int:user_id>')

def run_mock_server(port=5000):
    """运行 Mock 服务器"""
    app.run(port=port, debug=False, use_reloader=False)

# 启动服务
server_thread = threading.Thread(target=run_mock_server, daemon=True)
server_thread.start()
time.sleep(2)  # 等待服务器启动

# 测试
response = requests.get('http://localhost:5000/users')
print(response.json())
```

## 4. **FastAPI** (高性能方案)

### 特点
- 高性能异步框架
- 自动生成 API 文档
- 类型提示支持

### 示例代码
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import threading
from typing import List, Optional

app = FastAPI(title="Mock API Server", version="1.0.0")

# 数据模型
class User(BaseModel):
    id: int
    name: str
    email: str

class Product(BaseModel):
    id: int
    name: str
    price: float

# 模拟数据库
users_db = [
    User(id=1, name="Alice", email="alice@example.com"),
    User(id=2, name="Bob", email="bob@example.com")
]

products_db = [
    Product(id=1, name="Product A", price=99.99),
    Product(id=2, name="Product B", price=149.99)
]

@app.get("/users", response_model=List[User])
async def get_users():
    return users_db

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    user = next((u for u in users_db if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users", response_model=User)
async def create_user(user: User):
    users_db.append(user)
    return user

@app.get("/products", response_model=List[Product])
async def get_products():
    return products_db

def run_fastapi_server(port=8000):
    """运行 FastAPI 服务器"""
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="error")

# 启动服务
server_thread = threading.Thread(target=run_fastapi_server, daemon=True)
server_thread.start()
```

## 5. **WireMock** (Python 封装)

### 特点
- 企业级 Mock 服务器
- 功能强大，支持复杂场景
- 可以通过 Python 控制

### 安装和使用
```bash
pip install wiremock
```

### 示例代码
```python
from wiremock.client import *
import time
import threading

def setup_wiremock():
    """配置 WireMock"""
    # 配置基本 stub
    Mapping.objects.create(
        Mapping(
            priority=1,
            request=MappingRequest(
                method=HttpMethods.GET,
                url="/api/users"
            ),
            response=MappingResponse(
                status=200,
                json_body=[
                    {"id": 1, "name": "Test User 1"},
                    {"id": 2, "name": "Test User 2"}
                ]
            )
        )
    )
    
    # 配置带参数的 stub
    Mapping.objects.create(
        Mapping(
            request=MappingRequest(
                method=HttpMethods.GET,
                url_path_pattern="/api/users/[0-9]+"
            ),
            response=MappingResponse(
                status=200,
                json_body={"id": 123, "name": "Dynamic User"}
            )
        )
    )

def run_wiremock_server():
    """运行 WireMock 服务器"""
    # 这里需要先安装并运行 WireMock Java 服务
    # 或者使用 Docker 容器
    pass
```

## 6. **Mockoon** (GUI + CLI)

### 特点
- 图形界面 + 命令行工具
- 易于配置和使用
- 支持环境切换

### 安装和使用
```bash
# 安装 CLI
npm install -g @mockoon/cli

# 启动 Mock 服务
mockoon-cli start --data mockoon-data.json --port 3000
```

## 对比总结

| 库名           | 启动方式    | 配置复杂度 | 功能丰富度 | 性能 | 适合场景           |
| -------------- | ----------- | ---------- | ---------- | ---- | ------------------ |
| **Prism**      | CLI/Python  | 中等       | 高         | 高   | OpenAPI 规范的 API |
| **Mockserver** | Python      | 中等       | 高         | 中   | 企业级测试         |
| **Flask**      | Python      | 高         | 极高       | 中   | 完全自定义需求     |
| **FastAPI**    | Python      | 中         | 高         | 高   | 高性能、现代 API   |
| **WireMock**   | Java/Python | 高         | 极高       | 高   | 复杂企业场景       |
| **Mockoon**    | GUI/CLI     | 低         | 中         | 中   | 快速原型开发       |

## 推荐方案

### 1. **快速启动 + OpenAPI 规范**
```python
# 使用 Prism（如果已有 OpenAPI 文件）
prism mock your_api_spec.yaml -p 8080
```

### 2. **完全自定义 + 长期运行**
```python
# 使用 FastAPI（推荐）
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 3. **简单轻量级**
```python
# 使用 Flask
from flask import Flask
app = Flask(__name__)

@app.route("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

**最终建议**：对于长期运行的 API Mock 服务，推荐使用 **FastAPI**，因为它性能好、现代化，且易于维护和扩展。如果已有 OpenAPI 规范，**Prism** 是最佳选择。