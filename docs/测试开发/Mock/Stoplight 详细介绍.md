# Stoplight 详细介绍

Stoplight 是一个全面的 API 设计、开发和测试平台，提供强大的 API Mock 功能。它既提供云服务，也有本地部署方案。

## 核心特性

### 1. **可视化 API 设计**
- 图形化界面设计 API
- 支持 OpenAPI 2.0/3.0/3.1
- 自动生成 API 文档

### 2. **强大的 Mock 服务**
- 基于规范自动生成 Mock 数据
- 支持动态响应
- 长期运行的 Mock 服务器

### 3. **协作功能**
- 团队协作设计 API
- 版本控制
- 评审工作流

## 安装和部署

### 云服务（推荐）
直接使用 [Stoplight Platform](https://stoplight.io) 云服务

### 本地部署
```bash
# 使用 Docker 部署
docker run -p 8080:8080 stoplight/studio

# 或者使用 npm
npm install -g @stoplight/cli
```

## Mock 功能详解

### 1. **基于 OpenAPI 的自动 Mock**

**示例 OpenAPI 文件** (`api.yaml`):
```yaml
openapi: 3.1.0
info:
  title: User API
  version: 1.0.0
servers:
  - url: http://localhost:4010
paths:
  /users:
    get:
      summary: Get all users
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                      example: 1
                    name:
                      type: string
                      example: John Doe
                    email:
                      type: string
                      format: email
                      example: john@example.com
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  email:
                    type: string
                    format: email
        '404':
          description: User not found
```

### 2. **启动 Mock 服务**

**使用 Stoplight CLI**:
```bash
# 安装 CLI
npm install -g @stoplight/cli

# 启动 Mock 服务
stoplight mock --port 4010 api.yaml
```

**使用 Prism（Stoplight 的开源工具）**:
```bash
# 安装 Prism
npm install -g @stoplight/prism-cli

# 启动 Mock 服务
prism mock api.yaml
```

### 3. **Python 集成示例**

```python
import requests
import subprocess
import time
import json
import threading

class StoplightMockServer:
    def __init__(self, spec_file, port=4010):
        self.spec_file = spec_file
        self.port = port
        self.process = None
    
    def start(self):
        """启动 Stoplight Mock 服务"""
        self.process = subprocess.Popen([
            'prism', 'mock', self.spec_file, '-p', str(self.port)
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # 等待服务启动
        time.sleep(3)
        print(f"Stoplight Mock 服务已启动在端口 {self.port}")
    
    def stop(self):
        """停止服务"""
        if self.process:
            self.process.terminate()
            self.process.wait()
            print("Stoplight Mock 服务已停止")
    
    def test_requests(self):
        """测试 Mock API"""
        base_url = f"http://localhost:{self.port}"
        
        # 测试获取用户列表
        response = requests.get(f"{base_url}/users")
        print(f"GET /users: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        
        # 测试获取单个用户
        response = requests.get(f"{base_url}/users/1")
        print(f"GET /users/1: {response.status_code}")
        print(json.dumps(response.json(), indent=2))

# 使用示例
if __name__ == "__main__":
    mock_server = StoplightMockServer("api.yaml")
    
    try:
        mock_server.start()
        mock_server.test_requests()
        
        # 保持服务运行
        input("按 Enter 键停止服务...")
    finally:
        mock_server.stop()
```

## 高级 Mock 功能

### 1. **动态响应**

**使用示例扩展**:
```yaml
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  role:
                    type: string
                    enum: [admin, user, guest]
              examples:
                admin_user:
                  summary: Admin user example
                  value:
                    id: 1
                    name: Admin User
                    role: admin
                regular_user:
                  summary: Regular user example
                  value:
                    id: 2
                    name: Regular User
                    role: user
```

### 2. **自定义响应头**

```yaml
paths:
  /auth/login:
    post:
      responses:
        '200':
          description: Login successful
          headers:
            X-Auth-Token:
              schema:
                type: string
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          content:
            application/json:
              schema:
                type: object
                properties:
                  user_id:
                    type: integer
                  expires_in:
                    type: integer
```

### 3. **错误响应模拟**

```yaml
paths:
  /users/{id}:
    get:
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    example: "User not found"
                  code:
                    type: integer
                    example: 404
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    example: "Internal server error"
                  request_id:
                    type: string
                    example: "req_123456"
```

## Python 自动化集成

### 1. **完整的测试套件**

```python
import pytest
import requests
import subprocess
import time

@pytest.fixture(scope="session")
def mock_server():
    """启动 Stoplight Mock 服务器"""
    process = subprocess.Popen([
        'prism', 'mock', 'api_spec.yaml', '-p', '4010'
    ])
    
    # 等待服务器启动
    time.sleep(3)
    
    yield "http://localhost:4010"
    
    # 测试结束后停止服务器
    process.terminate()
    process.wait()

class TestUserAPI:
    def test_get_users(self, mock_server):
        """测试获取用户列表"""
        response = requests.get(f"{mock_server}/users")
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
    
    def test_get_user_by_id(self, mock_server):
        """测试根据 ID 获取用户"""
        response = requests.get(f"{mock_server}/users/1")
        assert response.status_code == 200
        user = response.json()
        assert 'id' in user
        assert 'name' in user
        assert 'email' in user
    
    def test_user_not_found(self, mock_server):
        """测试用户不存在的情况"""
        response = requests.get(f"{mock_server}/users/999")
        assert response.status_code == 404

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

### 2. **CI/CD 集成**

```python
# ci_integration.py
import requests
import subprocess
import time
import sys

def run_integration_tests():
    """在 CI 环境中运行集成测试"""
    
    # 启动 Mock 服务器
    print("启动 Stoplight Mock 服务器...")
    process = subprocess.Popen([
        'prism', 'mock', 'api_spec.yaml', '-p', '4010'
    ])
    
    try:
        time.sleep(5)  # 等待服务器完全启动
        
        # 测试服务器是否正常响应
        health_check_url = "http://localhost:4010/users"
        response = requests.get(health_check_url)
        
        if response.status_code != 200:
            raise Exception(f"Mock 服务器启动失败: {response.status_code}")
        
        print("Mock 服务器启动成功，开始运行测试...")
        
        # 运行你的测试逻辑
        # run_your_tests_here()
        
        print("所有测试通过！")
        return True
        
    except Exception as e:
        print(f"测试失败: {e}")
        return False
    finally:
        # 清理
        process.terminate()
        process.wait()

if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)
```

## 优势和适用场景

### 优势
1. **规范驱动**：基于 OpenAPI，确保 Mock 与真实 API 一致
2. **长期运行**：支持作为独立服务长期运行
3. **动态灵活**：支持多种响应模式和动态数据
4. **团队协作**：优秀的团队协作和版本管理功能
5. **企业级**：支持本地部署和安全控制

### 适用场景
- **前端开发**：后端 API 未完成时的开发
- **集成测试**：自动化测试中的 API 模拟
- **演示环境**：产品演示和客户展示
- **培训环境**：API 使用培训和教学
- **灾难恢复**：真实 API 不可用时的备用方案

## 总结

Stoplight 提供了一个企业级的 API Mock 解决方案，特别适合需要长期运行、规范驱动且功能丰富的 Mock 服务场景。通过 OpenAPI 规范，可以确保 Mock 服务与真实 API 的高度一致性，是团队协作开发中的理想选择。