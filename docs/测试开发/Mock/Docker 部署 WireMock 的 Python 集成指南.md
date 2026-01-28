# Docker 部署 WireMock 的 Python 集成指南

以下是针对 Docker 部署 WireMock 的完整 Python 集成方案。

## 1. **Docker 部署 WireMock**

### 基础部署命令
```bash
# 拉取最新镜像
docker pull wiremock/wiremock:latest

# 运行 WireMock 容器
docker run -d \
  --name wiremock \
  -p 8080:8080 \
  -v $(pwd)/wiremock:/home/wiremock \
  wiremock/wiremock:latest

# 或者使用 Docker Compose
```

### Docker Compose 配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  wiremock:
    image: wiremock/wiremock:latest
    container_name: wiremock
    ports:
      - "8080:8080"
      - "8443:8443"  # HTTPS 端口
    volumes:
      - ./wiremock/mappings:/home/wiremock/mappings
      - ./wiremock/__files:/home/wiremock/__files
      - ./wiremock/extensions:/home/wiremock/extensions
    environment:
      - WIREMOCK_OPTIONS=--verbose --global-response-templating
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/__admin"]
      interval: 30s
      timeout: 10s
      retries: 3
```

启动服务：
```bash
docker-compose up -d
```

## 2. **Python Docker WireMock 客户端**

### 完整的 Docker WireMock 管理客户端
```python
# src/docker_wiremock_client.py
import requests
import json
import time
import docker
from typing import Dict, List, Optional, Any
import subprocess

class DockerWireMockClient:
    def __init__(self, host: str = "localhost", port: int = 8080, container_name: str = "wiremock"):
        self.base_url = f"http://{host}:{port}"
        self.admin_url = f"{self.base_url}/__admin"
        self.container_name = container_name
        self.docker_client = docker.from_env()
    
    def is_container_running(self) -> bool:
        """检查 WireMock 容器是否在运行"""
        try:
            container = self.docker_client.containers.get(self.container_name)
            return container.status == "running"
        except docker.errors.NotFound:
            return False
        except docker.errors.APIError as e:
            print(f"Docker API 错误: {e}")
            return False
    
    def start_container(self) -> bool:
        """启动 WireMock 容器"""
        try:
            # 使用 Docker Compose 启动
            result = subprocess.run(
                ["docker-compose", "up", "-d"],
                capture_output=True,
                text=True,
                cwd="."  # 确保在 docker-compose.yml 所在目录
            )
            
            if result.returncode == 0:
                # 等待容器完全启动
                return self._wait_for_container_ready()
            return False
            
        except Exception as e:
            print(f"启动容器失败: {e}")
            return False
    
    def stop_container(self) -> bool:
        """停止 WireMock 容器"""
        try:
            result = subprocess.run(
                ["docker-compose", "down"],
                capture_output=True,
                text=True,
                cwd="."
            )
            return result.returncode == 0
        except Exception as e:
            print(f"停止容器失败: {e}")
            return False
    
    def restart_container(self) -> bool:
        """重启 WireMock 容器"""
        return self.stop_container() and self.start_container()
    
    def _wait_for_container_ready(self, timeout: int = 30) -> bool:
        """等待容器就绪"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"{self.admin_url}", timeout=2)
                if response.status_code == 200:
                    print("WireMock 容器已就绪")
                    return True
            except requests.exceptions.ConnectionError:
                time.sleep(2)
            except Exception as e:
                print(f"等待容器就绪时出错: {e}")
                time.sleep(2)
        
        print("WireMock 容器启动超时")
        return False
    
    def create_stub(self, stub_definition: Dict) -> bool:
        """创建存根映射"""
        try:
            url = f"{self.admin_url}/mappings"
            response = requests.post(url, json=stub_definition, timeout=10)
            return response.status_code == 201
        except Exception as e:
            print(f"创建存根失败: {e}")
            return False
    
    def create_stub_from_file(self, mapping_file: str) -> bool:
        """从文件创建存根"""
        try:
            with open(mapping_file, 'r') as f:
                stub_definition = json.load(f)
            return self.create_stub(stub_definition)
        except Exception as e:
            print(f"从文件创建存根失败: {e}")
            return False
    
    def get_all_stubs(self) -> Dict:
        """获取所有存根映射"""
        try:
            response = requests.get(f"{self.admin_url}/mappings", timeout=10)
            return response.json()
        except Exception as e:
            print(f"获取存根失败: {e}")
            return {}
    
    def get_stub_by_id(self, stub_id: str) -> Optional[Dict]:
        """根据 ID 获取存根"""
        try:
            response = requests.get(f"{self.admin_url}/mappings/{stub_id}", timeout=10)
            return response.json() if response.status_code == 200 else None
        except Exception as e:
            print(f"获取存根详情失败: {e}")
            return None
    
    def delete_stub(self, stub_id: str) -> bool:
        """删除存根"""
        try:
            response = requests.delete(f"{self.admin_url}/mappings/{stub_id}", timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"删除存根失败: {e}")
            return False
    
    def reset_all(self) -> bool:
        """重置所有存根和请求日志"""
        try:
            response = requests.post(f"{self.admin_url}/reset", timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"重置失败: {e}")
            return False
    
    def get_all_requests(self) -> Dict:
        """获取所有接收到的请求"""
        try:
            response = requests.get(f"{self.admin_url}/requests", timeout=10)
            return response.json()
        except Exception as e:
            print(f"获取请求记录失败: {e}")
            return {}
    
    def verify_request(self, verification_pattern: Dict) -> bool:
        """验证请求是否被接收"""
        try:
            response = requests.post(
                f"{self.admin_url}/requests/count",
                json=verification_pattern,
                timeout=10
            )
            count = response.json().get("count", 0)
            return count > 0
        except Exception as e:
            print(f"验证请求失败: {e}")
            return False
    
    def update_stub(self, stub_id: str, stub_definition: Dict) -> bool:
        """更新存根"""
        try:
            # 先删除旧存根
            self.delete_stub(stub_id)
            # 创建新存根
            return self.create_stub(stub_definition)
        except Exception as e:
            print(f"更新存根失败: {e}")
            return False
    
    def get_settings(self) -> Dict:
        """获取服务器设置"""
        try:
            response = requests.get(f"{self.admin_url}/settings", timeout=10)
            return response.json() if response.status_code == 200 else {}
        except Exception as e:
            print(f"获取设置失败: {e}")
            return {}
    
    def get_health(self) -> bool:
        """健康检查"""
        try:
            response = requests.get(f"{self.base_url}/__admin", timeout=5)
            return response.status_code == 200
        except:
            return False

class WireMockManager:
    def __init__(self):
        self.client = DockerWireMockClient()
    
    def setup_basic_stubs(self):
        """设置基础存根"""
        basic_stubs = [
            # 健康检查
            {
                "request": {
                    "method": "GET",
                    "url": "/health"
                },
                "response": {
                    "status": 200,
                    "jsonBody": {
                        "status": "healthy",
                        "service": "wiremock",
                        "timestamp": "{{now}}"
                    },
                    "transformers": ["response-template"]
                }
            },
            # 用户 API
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
                        {"id": 1, "name": "Alice", "email": "alice@example.com"},
                        {"id": 2, "name": "Bob", "email": "bob@example.com"}
                    ]
                }
            },
            # 动态用户详情
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
                        "createdAt": "{{now}}"
                    },
                    "transformers": ["response-template"]
                }
            }
        ]
        
        for stub in basic_stubs:
            if self.client.create_stub(stub):
                print(f"成功创建存根: {stub['request']['method']} {stub['request'].get('url', stub['request'].get('urlPathPattern', ''))}")
            else:
                print(f"创建存根失败: {stub['request']['method']} {stub['request'].get('url', stub['request'].get('urlPathPattern', ''))}")

# 使用示例
if __name__ == "__main__":
    manager = WireMockManager()
    
    # 检查容器状态
    if not manager.client.is_container_running():
        print("WireMock 容器未运行，正在启动...")
        if manager.client.start_container():
            print("WireMock 容器启动成功")
        else:
            print("WireMock 容器启动失败")
            exit(1)
    
    # 设置基础存根
    manager.setup_basic_stubs()
    
    # 测试 API
    import requests
    try:
        response = requests.get("http://localhost:8080/health")
        print(f"健康检查: {response.json()}")
        
        response = requests.get("http://localhost:8080/api/users")
        print(f"用户列表: {response.json()}")
        
        response = requests.get("http://localhost:8080/api/users/123")
        print(f"用户详情: {response.json()}")
        
    except Exception as e:
        print(f"API 测试失败: {e}")
```

## 3. **API 测试客户端**

```python
# src/api_test_client.py
import requests
import json
import time
from typing import Dict, List, Optional, Any
from datetime import datetime

class APITestClient:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        # 设置通用请求头
        self.session.headers.update({
            "User-Agent": "APITestClient/1.0",
            "Accept": "application/json"
        })
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """发起请求的通用方法"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            print(f"请求失败: {method} {url} - {e}")
            raise
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        response = self._make_request("GET", "/health")
        return response.json()
    
    # 用户 API
    def get_users(self, params: Optional[Dict] = None) -> List[Dict]:
        """获取用户列表"""
        response = self._make_request("GET", "/api/users", params=params)
        return response.json()
    
    def get_user(self, user_id: int) -> Dict[str, Any]:
        """获取用户详情"""
        response = self._make_request("GET", f"/api/users/{user_id}")
        return response.json()
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建用户"""
        response = self._make_request("POST", "/api/users", json=user_data)
        return response.json()
    
    def update_user(self, user_id: int, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新用户"""
        response = self._make_request("PUT", f"/api/users/{user_id}", json=user_data)
        return response.json()
    
    def delete_user(self, user_id: int) -> bool:
        """删除用户"""
        response = self._make_request("DELETE", f"/api/users/{user_id}")
        return response.status_code == 204
    
    # 产品 API
    def get_products(self, category: Optional[str] = None) -> List[Dict]:
        """获取产品列表"""
        params = {"category": category} if category else None
        response = self._make_request("GET", "/api/products", params=params)
        return response.json()
    
    def get_product(self, product_id: int) -> Dict[str, Any]:
        """获取产品详情"""
        response = self._make_request("GET", f"/api/products/{product_id}")
        return response.json()
    
    # 订单 API
    def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建订单"""
        response = self._make_request("POST", "/api/orders", json=order_data)
        return response.json()
    
    def get_order(self, order_id: int) -> Dict[str, Any]:
        """获取订单详情"""
        response = self._make_request("GET", f"/api/orders/{order_id}")
        return response.json()
    
    def performance_test(self, endpoint: str, num_requests: int = 10) -> Dict[str, Any]:
        """性能测试"""
        times = []
        for i in range(num_requests):
            start_time = time.time()
            try:
                self._make_request("GET", endpoint)
                end_time = time.time()
                times.append(end_time - start_time)
            except:
                pass
        
        if times:
            return {
                "total_requests": num_requests,
                "successful_requests": len(times),
                "average_time": sum(times) / len(times),
                "min_time": min(times),
                "max_time": max(times),
                "total_time": sum(times)
            }
        return {"error": "所有请求都失败"}

def demo_usage():
    """演示使用方法"""
    client = APITestClient()
    
    print("=== WireMock API 测试演示 ===")
    
    try:
        # 健康检查
        health = client.health_check()
        print(f"✅ 健康检查: {health}")
        
        # 用户 API 测试
        users = client.get_users()
        print(f"✅ 获取用户列表: {len(users)} 个用户")
        
        user = client.get_user(123)
        print(f"✅ 获取用户详情: {user}")
        
        # 创建新用户
        new_user = client.create_user({
            "name": "Test User",
            "email": "test@example.com"
        })
        print(f"✅ 创建用户: {new_user}")
        
        # 性能测试
        perf = client.performance_test("/api/users")
        print(f"✅ 性能测试: 平均响应时间 {perf['average_time']:.3f} 秒")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")

if __name__ == "__main__":
    demo_usage()
```

## 4. **高级存根配置示例**

### 创建高级存根配置
```python
# src/advanced_stubs.py
from typing import Dict, List
from docker_wiremock_client import DockerWireMockClient

class AdvancedStubConfigurator:
    def __init__(self, wiremock_client: DockerWireMockClient):
        self.client = wiremock_client
    
    def setup_ecommerce_stubs(self):
        """设置电商系统存根"""
        stubs = [
            # 产品列表 - 带分页
            {
                "request": {
                    "method": "GET",
                    "urlPath": "/api/products",
                    "queryParameters": {
                        "page": {
                            "matches": "^[0-9]+$"
                        },
                        "limit": {
                            "matches": "^[0-9]+$"
                        }
                    }
                },
                "response": {
                    "status": 200,
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "jsonBody": {
                        "products": [
                            {
                                "id": "{{randomValue length=5 type='NUMERIC'}}",
                                "name": "Product {{randomValue length=3 type='NUMERIC'}}",
                                "price": "{{randomValue length=2 type='NUMERIC'}}.99",
                                "category": "electronics"
                            }
                        ],
                        "pagination": {
                            "page": "{{request.query.page}}",
                            "limit": "{{request.query.limit}}",
                            "total": 100
                        }
                    },
                    "transformers": ["response-template"]
                }
            },
            
            # 订单创建
            {
                "request": {
                    "method": "POST",
                    "url": "/api/orders",
                    "bodyPatterns": [
                        {
                            "matchesJsonPath": "$.items"
                        }
                    ]
                },
                "response": {
                    "status": 201,
                    "headers": {
                        "Content-Type": "application/json",
                        "Location": "/api/orders/{{randomValue length=8 type='NUMERIC'}}"
                    },
                    "jsonBody": {
                        "orderId": "{{randomValue length=8 type='NUMERIC'}}",
                        "status": "pending",
                        "createdAt": "{{now}}",
                        "totalAmount": "{{jsonPath request.body '$.total'}}"
                    },
                    "transformers": ["response-template"]
                }
            },
            
            # 支付处理 - 带延迟
            {
                "request": {
                    "method": "POST",
                    "url": "/api/payments",
                    "bodyPatterns": [
                        {
                            "matchesJsonPath": "$.orderId"
                        }
                    ]
                },
                "response": {
                    "status": 200,
                    "jsonBody": {
                        "paymentId": "{{randomValue length=10 type='ALPHANUMERIC'}}",
                        "status": "completed",
                        "processedAt": "{{now}}"
                    },
                    "fixedDelayMilliseconds": 2000,  # 2秒延迟模拟处理时间
                    "transformers": ["response-template"]
                }
            },
            
            # 错误响应模拟
            {
                "request": {
                    "method": "GET",
                    "url": "/api/orders/999"
                },
                "response": {
                    "status": 404,
                    "jsonBody": {
                        "error": "Order not found",
                        "code": "ORDER_404",
                        "message": "The requested order does not exist"
                    }
                }
            },
            
            # 认证失败
            {
                "request": {
                    "method": "GET",
                    "url": "/api/admin/users",
                    "headers": {
                        "Authorization": {
                            "absent": True
                        }
                    }
                },
                "response": {
                    "status": 401,
                    "jsonBody": {
                        "error": "Unauthorized",
                        "message": "Authentication required"
                    }
                }
            }
        ]
        
        success_count = 0
        for stub in stubs:
            if self.client.create_stub(stub):
                success_count += 1
                method = stub["request"]["method"]
                url = stub["request"].get("url", stub["request"].get("urlPath", "unknown"))
                print(f"✅ 创建存根: {method} {url}")
            else:
                print(f"❌ 创建存根失败")
        
        print(f"\n📊 存根配置完成: {success_count}/{len(stubs)} 成功")
    
    def setup_scenario_stubs(self):
        """设置场景测试存根"""
        # 订单状态流转场景
        scenario_stubs = [
            # 初始状态 - 订单创建
            {
                "scenarioName": "Order Status Flow",
                "requiredScenarioState": "Started",
                "newScenarioState": "Order Created",
                "request": {
                    "method": "POST",
                    "url": "/api/scenario/orders"
                },
                "response": {
                    "status": 201,
                    "jsonBody": {
                        "orderId": "SCN001",
                        "status": "created",
                        "message": "Order created successfully"
                    }
                }
            },
            
            # 订单处理中
            {
                "scenarioName": "Order Status Flow",
                "requiredScenarioState": "Order Created",
                "newScenarioState": "Processing",
                "request": {
                    "method": "PUT",
                    "url": "/api/scenario/orders/SCN001/process"
                },
                "response": {
                    "status": 200,
                    "jsonBody": {
                        "orderId": "SCN001",
                        "status": "processing",
                        "message": "Order is being processed"
                    }
                }
            },
            
            # 订单完成
            {
                "scenarioName": "Order Status Flow",
                "requiredScenarioState": "Processing",
                "newScenarioState": "Completed",
                "request": {
                    "method": "PUT",
                    "url": "/api/scenario/orders/SCN001/complete"
                },
                "response": {
                    "status": 200,
                    "jsonBody": {
                        "orderId": "SCN001",
                        "status": "completed",
                        "message": "Order completed successfully"
                    }
                }
            }
        ]
        
        for stub in scenario_stubs:
            self.client.create_stub(stub)
        
        print("✅ 场景测试存根配置完成")

def setup_advanced_stubs():
    """设置高级存根配置"""
    client = DockerWireMockClient()
    
    if not client.get_health():
        print("❌ WireMock 服务不可用")
        return
    
    configurator = AdvancedStubConfigurator(client)
    
    # 重置现有存根
    client.reset_all()
    print("🗑️  已重置所有存根")
    
    # 设置电商存根
    configurator.setup_ecommerce_stubs()
    
    # 设置场景测试存根
    configurator.setup_scenario_stubs()
    
    print("\n🎉 高级存根配置完成！")

if __name__ == "__main__":
    setup_advanced_stubs()
```

## 5. **Pytest 测试集成**

```python
# tests/test_docker_wiremock.py
import pytest
import requests
import time
from src.docker_wiremock_client import DockerWireMockClient, WireMockManager
from src.api_test_client import APITestClient

@pytest.fixture(scope="session")
def wiremock_client():
    """WireMock 客户端 fixture"""
    client = DockerWireMockClient()
    
    # 确保 WireMock 服务运行
    if not client.get_health():
        pytest.fail("WireMock 服务不可用，请先启动 Docker 容器")
    
    # 重置环境
    client.reset_all()
    
    return client

@pytest.fixture(scope="session")
def api_client():
    """API 测试客户端 fixture"""
    return APITestClient()

@pytest.fixture(scope="function")
def setup_basic_stubs(wiremock_client):
    """为每个测试设置基础存根"""
    manager = WireMockManager()
    manager.client = wiremock_client
    manager.setup_basic_stubs()
    
    yield
    
    # 测试后清理（可选）
    # wiremock_client.reset_all()

class TestDockerWireMock:
    def test_health_check(self, wiremock_client, api_client):
        """测试健康检查"""
        assert wiremock_client.get_health()
        
        health_data = api_client.health_check()
        assert health_data["status"] == "healthy"
    
    def test_user_api(self, setup_basic_stubs, api_client):
        """测试用户 API"""
        # 获取用户列表
        users = api_client.get_users()
        assert isinstance(users, list)
        assert len(users) == 2
        
        # 获取用户详情
        user = api_client.get_user(123)
        assert user["id"] == "123"
        assert "name" in user
        assert "email" in user
    
    def test_dynamic_user_creation(self, wiremock_client, api_client):
        """测试动态用户创建"""
        # 创建用户存根
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
                    "id": "{{randomValue length=5 type='NUMERIC'}}",
                    "name": "{{jsonPath request.body '$.name'}}",
                    "createdAt": "{{now}}",
                    "status": "active"
                },
                "transformers": ["response-template"]
            }
        }
        
        assert wiremock_client.create_stub(stub)
        
        # 测试创建用户
        user_data = {
            "name": "Test User",
            "email": "test@example.com"
        }
        
        new_user = api_client.create_user(user_data)
        assert new_user["name"] == "Test User"
        assert "id" in new_user
        assert new_user["status"] == "active"
    
    def test_error_responses(self, wiremock_client, api_client):
        """测试错误响应"""
        # 设置 404 错误存根
        stub = {
            "request": {
                "method": "GET",
                "url": "/api/nonexistent"
            },
            "response": {
                "status": 404,
                "jsonBody": {
                    "error": "Not Found",
                    "code": "RESOURCE_404"
                }
            }
        }
        
        wiremock_client.create_stub(stub)
        
        # 测试错误响应
        try:
            api_client._make_request("GET", "/api/nonexistent")
            assert False, "应该抛出异常"
        except requests.exceptions.HTTPError as e:
            assert e.response.status_code == 404
            error_data = e.response.json()
            assert error_data["error"] == "Not Found"
    
    def test_delayed_response(self, wiremock_client, api_client):
        """测试延迟响应"""
        # 设置延迟存根
        stub = {
            "request": {
                "method": "GET",
                "url": "/api/slow"
            },
            "response": {
                "status": 200,
                "body": "Delayed response",
                "fixedDelayMilliseconds": 1000  # 1秒延迟
            }
        }
        
        wiremock_client.create_stub(stub)
        
        # 测试延迟
        start_time = time.time()
        response = requests.get("http://localhost:8080/api/slow")
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) >= 1.0
    
    def test_request_verification(self, wiremock_client, api_client):
        """测试请求验证"""
        # 重置请求日志
        wiremock_client.reset_all()
        
        # 发起多个请求
        api_client.health_check()
        api_client.get_users()
        api_client.get_user(123)
        
        # 等待请求被处理
        time.sleep(0.5)
        
        # 验证请求被记录
        verification = {
            "method": "GET",
            "url": "/api/users"
        }
        assert wiremock_client.verify_request(verification)
        
        # 获取所有请求
        requests_log = wiremock_client.get_all_requests()
        assert "requests" in requests_log
        assert len(requests_log["requests"]) >= 3
    
    def test_performance_monitoring(self, api_client):
        """测试性能监控"""
        perf_data = api_client.performance_test("/api/users", num_requests=5)
        
        assert perf_data["total_requests"] == 5
        assert perf_data["successful_requests"] == 5
        assert perf_data["average_time"] > 0

@pytest.mark.slow
class TestAdvancedFeatures:
    def test_scenario_workflow(self, wiremock_client, api_client):
        """测试场景工作流"""
        # 设置场景存根
        scenario_stubs = [
            {
                "scenarioName": "User Registration",
                "requiredScenarioState": "Started",
                "newScenarioState": "User Created",
                "request": {
                    "method": "POST",
                    "url": "/api/register"
                },
                "response": {
                    "status": 201,
                    "jsonBody": {"status": "registered", "userId": "U001"}
                }
            },
            {
                "scenarioName": "User Registration", 
                "requiredScenarioState": "User Created",
                "request": {
                    "method": "GET",
                    "url": "/api/users/U001"
                },
                "response": {
                    "status": 200,
                    "jsonBody": {"id": "U001", "name": "Registered User"}
                }
            }
        ]
        
        for stub in scenario_stubs:
            wiremock_client.create_stub(stub)
        
        # 测试场景流程
        response1 = api_client._make_request("POST", "/api/register")
        assert response1.status_code == 201
        assert response1.json()["status"] == "registered"
        
        response2 = api_client._make_request("GET", "/api/users/U001")
        assert response2.status_code == 200
        assert response2.json()["name"] == "Registered User"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

## 6. **运行和部署脚本**

### 部署脚本
```bash
#!/bin/bash
# deploy_wiremock.sh

set -e

echo "🚀 部署 WireMock Docker 服务..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 创建目录结构
mkdir -p wiremock/{mappings,__files,extensions}

echo "📁 目录结构创建完成"

# 启动服务
echo "🔄 启动 WireMock 容器..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
if curl -f http://localhost:8080/__admin > /dev/null 2>&1; then
    echo "✅ WireMock 服务启动成功"
    echo "📊 管理界面: http://localhost:8080/__admin"
    echo "🔧 API 端点: http://localhost:8080"
else
    echo "❌ WireMock 服务启动失败"
    exit 1
fi

# 运行 Python 配置脚本
echo "🐍 运行 Python 配置脚本..."
python3 src/advanced_stubs.py

echo "🎉 部署完成！"
```

### 测试运行脚本
```bash
#!/bin/bash
# run_tests.sh

echo "🧪 运行 WireMock 测试..."

# 激活 Python 虚拟环境（如果有）
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# 运行测试
python -m pytest tests/ -v --tb=short

# 运行演示
echo ""
echo "🎭 运行 API 演示..."
python src/api_test_client.py

echo ""
echo "📊 测试完成！"
```

## 7. **项目结构总结**

```
wiremock-docker-python/
├── docker-compose.yml
├── deploy_wiremock.sh
├── run_tests.sh
├── wiremock/
│   ├── mappings/          # 存根映射文件
│   ├── __files/          # 响应体文件
│   └── extensions/       # 自定义扩展
├── src/
│   ├── docker_wiremock_client.py
│   ├── api_test_client.py
│   ├── advanced_stubs.py
│   └── __init__.py
├── tests/
│   ├── test_docker_wiremock.py
│   └── __init__.py
├── requirements.txt
└── README.md
```

### requirements.txt
```txt
requests>=2.25.1
pytest>=6.2.2
docker>=5.0.0
pytest-asyncio>=0.15.0
```

## 8. **使用说明**

1. **部署 WireMock**:
   ```bash
   chmod +x deploy_wiremock.sh
   ./deploy_wiremock.sh
   ```

2. **运行测试**:
   ```bash
   chmod +x run_tests.sh
   ./run_tests.sh
   ```

3. **手动测试**:
   ```bash
   python src/api_test_client.py
   ```

4. **查看 WireMock 管理界面**:
   打开浏览器访问 `http://localhost:8080/__admin`

这个完整的方案提供了：
- ✅ Docker 化的 WireMock 部署
- ✅ 完整的 Python 客户端管理
- ✅ 丰富的 API 测试功能
- ✅ 高级存根配置
- ✅ 完整的测试套件
- ✅ 自动化部署脚本

所有组件都针对 Docker 部署进行了优化，可以轻松集成到现有的开发和测试流程中。