# Python 使用 WireMock 完整指南

以下是使用 WireMock 进行 API Mock 的完整步骤，包括安装、配置和 Python 集成。

## 1. **WireMock 安装和设置**

### 方法一：Java 独立部署（推荐）

**步骤 1：安装 Java**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-11-jdk

# CentOS/RHEL
sudo yum install java-11-openjdk

# macOS
brew install openjdk@11

# 验证安装
java -version
```

**步骤 2：下载 WireMock**
```bash
# 下载最新版本
wget https://repo1.maven.org/maven2/com/github/tomakehurst/wiremock-standalone/2.35.0/wiremock-standalone-2.35.0.jar

# 或者使用 curl
curl -O https://repo1.maven.org/maven2/com/github/tomakehurst/wiremock-standalone/2.35.0/wiremock-standalone-2.35.0.jar
```

### 方法二：Docker 部署
```bash
# 拉取官方镜像
docker pull wiremock/wiremock:latest

# 或者直接运行
docker run -d --name wiremock -p 8080:8080 wiremock/wiremock
```

## 2. **基础 WireMock 使用**

### 启动 WireMock 服务器
```bash
# 基础启动
java -jar wiremock-standalone-2.35.0.jar --port 8080

# 生产环境启动（推荐）
java -jar wiremock-standalone-2.35.0.jar \
  --port 8080 \
  --bind-address 0.0.0.0 \
  --verbose \
  --global-response-templating
```

### 创建目录结构
```bash
mkdir -p wiremock/{mappings,__files,extensions}
```

目录结构：
```
wiremock/
├── mappings/          # 存根映射文件
├── __files/          # 响应体文件
└── extensions/       # 自定义扩展（可选）
```

## 3. **Python 集成环境设置**

### 创建 Python 虚拟环境
```bash
# 创建项目目录
mkdir wiremock-python-demo
cd wiremock-python-demo

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows

# 安装依赖
pip install requests pytest
```

### 项目结构
```
wiremock-python-demo/
├── venv/
├── wiremock/          # WireMock 文件
│   ├── mappings/
│   └── __files/
├── src/
│   ├── wiremock_client.py
│   ├── api_tester.py
│   └── test_api.py
├── requirements.txt
└── README.md
```

## 4. **基础 WireMock 配置示例**

### 创建简单的存根映射
```json
// wiremock/mappings/users-api.json
{
  "request": {
    "method": "GET",
    "url": "/api/users"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": [
      {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com"
      },
      {
        "id": 2,
        "name": "Bob", 
        "email": "bob@example.com"
      }
    ]
  }
}
```

### 创建响应体文件
```json
// wiremock/__files/user-details.json
{
  "id": 123,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zipcode": "10001"
  }
}
```

### 使用文件响应的映射
```json
// wiremock/mappings/user-details.json
{
  "request": {
    "method": "GET",
    "urlPath": "/api/users/123"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "bodyFileName": "user-details.json"
  }
}
```

## 5. **Python WireMock 客户端**

### 基础 WireMock 管理客户端
```python
# src/wiremock_client.py
import requests
import json
import time
import subprocess
import os
import signal
from typing import Dict, List, Optional

class WireMockClient:
    def __init__(self, host: str = "localhost", port: int = 8080):
        self.base_url = f"http://{host}:{port}"
        self.admin_url = f"{self.base_url}/__admin"
    
    def create_stub(self, stub_definition: Dict) -> bool:
        """创建存根映射"""
        url = f"{self.admin_url}/mappings"
        response = requests.post(url, json=stub_definition)
        return response.status_code == 201
    
    def get_all_stubs(self) -> Dict:
        """获取所有存根映射"""
        response = requests.get(f"{self.admin_url}/mappings")
        return response.json()
    
    def reset(self) -> bool:
        """重置所有存根和请求日志"""
        response = requests.post(f"{self.admin_url}/reset")
        return response.status_code == 200
    
    def get_requests(self) -> Dict:
        """获取所有接收到的请求"""
        response = requests.get(f"{self.admin_url}/requests")
        return response.json()
    
    def verify_request(self, verification_pattern: Dict) -> bool:
        """验证请求是否被接收"""
        response = requests.post(
            f"{self.admin_url}/requests/count",
            json=verification_pattern
        )
        count = response.json().get("count", 0)
        return count > 0
    
    def shutdown(self) -> bool:
        """关闭 WireMock 服务器"""
        response = requests.post(f"{self.admin_url}/shutdown")
        return response.status_code == 200

class WireMockServer:
    def __init__(self, jar_path: str, port: int = 8080, root_dir: str = "./wiremock"):
        self.jar_path = jar_path
        self.port = port
        self.root_dir = root_dir
        self.process = None
        self.client = WireMockClient(port=port)
    
    def start(self, timeout: int = 30) -> bool:
        """启动 WireMock 服务器"""
        if not os.path.exists(self.root_dir):
            os.makedirs(self.root_dir)
        
        cmd = [
            "java", "-jar", self.jar_path,
            "--port", str(self.port),
            "--root-dir", self.root_dir,
            "--verbose",
            "--global-response-templating"
        ]
        
        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid
            )
            
            # 等待服务器启动
            return self._wait_for_startup(timeout)
        except Exception as e:
            print(f"启动 WireMock 服务器失败: {e}")
            return False
    
    def _wait_for_startup(self, timeout: int) -> bool:
        """等待服务器启动完成"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"{self.client.admin_url}")
                if response.status_code == 200:
                    print(f"WireMock 服务器已在端口 {self.port} 启动")
                    return True
            except requests.exceptions.ConnectionError:
                time.sleep(1)
        
        print("WireMock 服务器启动超时")
        return False
    
    def stop(self) -> bool:
        """停止 WireMock 服务器"""
        if self.process:
            try:
                # 先尝试优雅关闭
                self.client.shutdown()
                time.sleep(2)
                
                # 如果还在运行，强制终止
                if self.process.poll() is None:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                    self.process.wait(timeout=10)
                
                print("WireMock 服务器已停止")
                return True
            except Exception as e:
                print(f"停止 WireMock 服务器时出错: {e}")
                return False
        return True
    
    def is_running(self) -> bool:
        """检查服务器是否在运行"""
        try:
            response = requests.get(f"{self.client.admin_url}", timeout=2)
            return response.status_code == 200
        except:
            return False

# 使用示例
if __name__ == "__main__":
    # 启动服务器
    server = WireMockServer(
        jar_path="./wiremock-standalone-2.35.0.jar",
        port=8080,
        root_dir="./wiremock"
    )
    
    if server.start():
        print("服务器启动成功")
        
        # 创建一些测试存根
        stub_definition = {
            "request": {
                "method": "GET",
                "url": "/api/health"
            },
            "response": {
                "status": 200,
                "jsonBody": {"status": "healthy", "service": "wiremock"}
            }
        }
        
        if server.client.create_stub(stub_definition):
            print("存根创建成功")
        
        # 保持服务器运行
        try:
            input("按 Enter 停止服务器...")
        finally:
            server.stop()
    else:
        print("服务器启动失败")
```

## 6. **API 测试示例**

### API 测试客户端
```python
# src/api_tester.py
import requests
import json
from typing import Dict, Any

class APITester:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
    
    def get_users(self) -> Dict[str, Any]:
        """获取用户列表"""
        response = requests.get(f"{self.base_url}/api/users")
        response.raise_for_status()
        return response.json()
    
    def get_user(self, user_id: int) -> Dict[str, Any]:
        """获取特定用户"""
        response = requests.get(f"{self.base_url}/api/users/{user_id}")
        response.raise_for_status()
        return response.json()
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新用户"""
        response = requests.post(
            f"{self.base_url}/api/users",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        response = requests.get(f"{self.base_url}/api/health")
        response.raise_for_status()
        return response.json()

def demo_api_calls():
    """演示 API 调用"""
    tester = APITester()
    
    try:
        # 健康检查
        health = tester.health_check()
        print("健康检查:", health)
        
        # 获取用户列表
        users = tester.get_users()
        print("用户列表:", json.dumps(users, indent=2))
        
        # 获取特定用户
        user = tester.get_user(123)
        print("用户详情:", json.dumps(user, indent=2))
        
        # 创建新用户
        new_user = tester.create_user({
            "name": "Charlie",
            "email": "charlie@example.com"
        })
        print("新用户:", json.dumps(new_user, indent=2))
        
    except requests.exceptions.RequestException as e:
        print(f"API 调用失败: {e}")

if __name__ == "__main__":
    demo_api_calls()
```

## 7. **高级 WireMock 配置**

### 动态响应模板
```json
// wiremock/mappings/dynamic-user.json
{
  "request": {
    "method": "GET",
    "urlPathPattern": "/api/users/([0-9]+)"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "id": "{{request.pathSegments.[2]}}",
      "name": "User {{request.pathSegments.[2]}}",
      "email": "user{{request.pathSegments.[2]}}@example.com",
      "createdAt": "{{now}}",
      "requestId": "{{randomValue length=10 type='ALPHANUMERIC'}}"
    },
    "transformers": ["response-template"]
  }
}
```

### 条件响应和错误模拟
```json
// wiremock/mappings/conditional-response.json
[
  {
    "request": {
      "method": "GET",
      "url": "/api/orders/123"
    },
    "response": {
      "status": 200,
      "jsonBody": {
        "orderId": 123,
        "status": "processing"
      }
    }
  },
  {
    "request": {
      "method": "GET", 
      "url": "/api/orders/999"
    },
    "response": {
      "status": 404,
      "jsonBody": {
        "error": "Order not found",
        "code": "ORDER_404"
      }
    }
  },
  {
    "request": {
      "method": "GET",
      "url": "/api/unreliable"
    },
    "response": {
      "fault": "CONNECTION_RESET_BY_PEER"
    }
  }
]
```

### 延迟响应
```json
// wiremock/mappings/delayed-response.json
{
  "request": {
    "method": "GET",
    "url": "/api/slow"
  },
  "response": {
    "status": 200,
    "body": "This is a delayed response",
    "fixedDelayMilliseconds": 3000
  }
}
```

## 8. **Python 测试集成**

### Pytest 测试用例
```python
# test/test_api.py
import pytest
import requests
from src.wiremock_client import WireMockServer, WireMockClient
from src.api_tester import APITester
import time

@pytest.fixture(scope="session")
def wiremock_server():
    """启动 WireMock 服务器 fixture"""
    server = WireMockServer(
        jar_path="./wiremock-standalone-2.35.0.jar",
        port=9090,  # 使用不同的端口避免冲突
        root_dir="./test_wiremock"
    )
    
    if server.start():
        yield server
        server.stop()
    else:
        pytest.fail("无法启动 WireMock 服务器")

@pytest.fixture
def wiremock_client(wiremock_server):
    """WireMock 客户端 fixture"""
    return wiremock_server.client

@pytest.fixture
def api_tester():
    """API 测试客户端 fixture"""
    return APITester(base_url="http://localhost:9090")

class TestUserAPI:
    def test_get_users(self, wiremock_client, api_tester):
        """测试获取用户列表"""
        # 设置存根
        stub = {
            "request": {
                "method": "GET",
                "url": "/api/users"
            },
            "response": {
                "status": 200,
                "jsonBody": [
                    {"id": 1, "name": "Test User 1"},
                    {"id": 2, "name": "Test User 2"}
                ]
            }
        }
        wiremock_client.create_stub(stub)
        
        # 测试 API 调用
        users = api_tester.get_users()
        assert len(users) == 2
        assert users[0]["name"] == "Test User 1"
    
    def test_get_user_not_found(self, wiremock_client, api_tester):
        """测试用户不存在的情况"""
        stub = {
            "request": {
                "method": "GET",
                "url": "/api/users/999"
            },
            "response": {
                "status": 404,
                "jsonBody": {
                    "error": "User not found"
                }
            }
        }
        wiremock_client.create_stub(stub)
        
        # 测试 API 调用应该抛出异常
        try:
            api_tester.get_user(999)
            assert False, "应该抛出异常"
        except requests.exceptions.HTTPError as e:
            assert e.response.status_code == 404
    
    def test_create_user(self, wiremock_client, api_tester):
        """测试创建用户"""
        stub = {
            "request": {
                "method": "POST",
                "url": "/api/users",
                "bodyPatterns": [
                    {
                        "matchesJsonPath": "$.name"
                    }
                ]
            },
            "response": {
                "status": 201,
                "jsonBody": {
                    "id": 100,
                    "name": "{{jsonPath request.body '$.name'}}",
                    "status": "created"
                },
                "transformers": ["response-template"]
            }
        }
        wiremock_client.create_stub(stub)
        
        # 创建用户
        new_user = api_tester.create_user({
            "name": "Test User",
            "email": "test@example.com"
        })
        
        assert new_user["id"] == 100
        assert new_user["name"] == "Test User"
        assert new_user["status"] == "created"
    
    def test_request_verification(self, wiremock_client, api_tester):
        """测试请求验证"""
        # 重置请求日志
        wiremock_client.reset()
        
        # 调用 API
        api_tester.health_check()
        
        # 验证请求被接收
        verification = {
            "method": "GET",
            "url": "/api/health"
        }
        
        # 等待一下确保请求被处理
        time.sleep(0.5)
        
        assert wiremock_client.verify_request(verification)

def test_delayed_response(wiremock_client, api_tester):
    """测试延迟响应"""
    stub = {
        "request": {
            "method": "GET",
            "url": "/api/slow"
        },
        "response": {
            "status": 200,
            "body": "Delayed response",
            "fixedDelayMilliseconds": 1000
        }
    }
    wiremock_client.create_stub(stub)
    
    # 测试响应时间
    start_time = time.time()
    response = requests.get("http://localhost:9090/api/slow")
    end_time = time.time()
    
    assert response.status_code == 200
    assert (end_time - start_time) >= 1.0  # 至少延迟 1 秒
```

## 9. **完整的项目配置**

### requirements.txt
```txt
requests>=2.25.1
pytest>=6.2.2
pytest-asyncio>=0.15.0
```

### pytest.ini
```ini
[pytest]
testpaths = test
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
```

### 启动脚本
```bash
#!/bin/bash
# start_wiremock.sh

set -e

echo "Starting WireMock server..."

# 检查 Java 是否安装
if ! command -v java &> /dev/null; then
    echo "Error: Java is not installed. Please install Java 8 or higher."
    exit 1
fi

# 检查 WireMock JAR 文件是否存在
if [ ! -f "wiremock-standalone-2.35.0.jar" ]; then
    echo "Downloading WireMock..."
    wget -q https://repo1.maven.org/maven2/com/github/tomakehurst/wiremock-standalone/2.35.0/wiremock-standalone-2.35.0.jar
fi

# 创建目录
mkdir -p wiremock/{mappings,__files}

# 启动 WireMock
java -jar wiremock-standalone-2.35.0.jar \
    --port 8080 \
    --bind-address 0.0.0.0 \
    --root-dir wiremock \
    --verbose \
    --global-response-templating \
    --enable-browser-proxying
```

## 10. **运行和验证**

### 运行测试
```bash
# 激活虚拟环境
source venv/bin/activate

# 运行所有测试
pytest test/ -v

# 运行特定测试
pytest test/test_api.py::TestUserAPI::test_get_users -v
```

### 手动测试 API
```python
# manual_test.py
from src.wiremock_client import WireMockServer
from src.api_tester import APITester

def main():
    # 启动服务器
    server = WireMockServer(
        jar_path="./wiremock-standalone-2.35.0.jar",
        port=8080
    )
    
    if server.start():
        print("WireMock 服务器已启动")
        
        # 测试 API
        tester = APITester()
        
        try:
            # 健康检查
            health = tester.health_check()
            print(f"健康检查: {health}")
            
            # 演示其他 API 调用
            # ...
            
        except Exception as e:
            print(f"测试失败: {e}")
        
        # 保持运行
        input("按 Enter 停止服务器...")
        server.stop()
    else:
        print("启动服务器失败")

if __name__ == "__main__":
    main()
```

## 总结

这个完整的指南涵盖了：

1. **WireMock 安装和配置**
2. **Python 客户端实现**
3. **API 测试集成**
4. **高级 Mock 功能（动态响应、错误模拟、延迟等）**
5. **自动化测试框架**

通过这个设置，你可以：
- 快速启动和停止 WireMock 服务器
- 动态配置 API 响应
- 编写全面的 API 测试
- 模拟各种网络条件和错误场景
- 集成到 CI/CD 流程中

这种组合提供了强大而灵活的 API Mock 解决方案，特别适合微服务测试、前端开发和集成测试场景。