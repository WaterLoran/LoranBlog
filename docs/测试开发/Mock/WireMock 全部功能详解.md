# WireMock 全部功能详解

WireMock 是一个功能完整的 HTTP Mock 服务器，提供了丰富的功能来模拟各种 API 行为。以下是 WireMock 的全部功能详解：

## 1. **核心功能**

### 请求匹配 (Request Matching)
```json
{
  "request": {
    "method": "GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS",
    "url": "/api/users",
    "urlPath": "/api/users",
    "urlPathPattern": "/api/users/[0-9]+",
    "urlPattern": "/api/.*",
    "queryParameters": {
      "search": {
        "equalTo": "john"
      },
      "page": {
        "matches": "^[0-9]+$"
      }
    },
    "headers": {
      "Content-Type": {
        "equalTo": "application/json"
      },
      "Authorization": {
        "contains": "Bearer"
      }
    },
    "cookies": {
      "session": {
        "equalTo": "abc123"
      }
    },
    "bodyPatterns": [
      {
        "equalToJson": "{\"name\": \"John\"}"
      },
      {
        "matchesJsonPath": "$.users[?(@.age > 18)]"
      },
      {
        "equalToXml": "<user><name>John</name></user>"
      },
      {
        "matchesXPath": "//user[name='John']"
      },
      {
        "contains": "important"
      },
      {
        "matches": ".*pattern.*"
      }
    ],
    "basicAuth": {
      "username": "admin",
      "password": "password"
    }
  }
}
```

### 响应定义 (Response Definition)
```json
{
  "response": {
    "status": 200,
    "statusMessage": "OK",
    "headers": {
      "Content-Type": "application/json",
      "X-Custom-Header": "value",
      "Set-Cookie": "session=abc123"
    },
    "body": "{\"message\": \"Hello World\"}",
    "bodyFileName": "response.json",
    "base64Body": "base64EncodedContent",
    "jsonBody": {
      "id": 1,
      "name": "John"
    },
    "fault": "CONNECTION_RESET_BY_PEER",
    "transformers": ["response-template", "body-transformer"],
    "transformerParameters": {
      "cache": true
    }
  }
}
```

## 2. **高级匹配功能**

### 多条件匹配
```json
{
  "request": {
    "method": "ANY",
    "urlPath": "/api/data",
    "headers": {
      "X-API-Key": {
        "equalTo": "secret123"
      }
    }
  },
  "response": {
    "status": 200,
    "body": "Authorized"
  }
}
```

### 优先级匹配
```json
{
  "priority": 1,
  "request": {
    "method": "GET",
    "url": "/api/specific"
  },
  "response": {
    "status": 200,
    "body": "High priority response"
  }
}
```

## 3. **动态响应**

### 响应模板 (Response Templating)
```json
{
  "request": {
    "method": "GET",
    "urlPath": "/api/users/123"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json",
      "X-Request-ID": "{{request.headers.X-Request-ID}}"
    },
    "jsonBody": {
      "id": "{{request.pathSegments.[2]}}",
      "name": "User {{request.pathSegments.[2]}}",
      "timestamp": "{{now}}",
      "randomValue": "{{randomValue length=10}}",
      "requestMethod": "{{request.method}}",
      "requestUrl": "{{request.url}}"
    },
    "transformers": ["response-template"]
  }
}
```

### Handlebars 助手函数
```json
{
  "response": {
    "status": 200,
    "body": "{{#each items}}Item: {{this}}{{/each}}",
    "transformers": ["response-template"]
  }
}
```

## 4. **故障模拟**

### 各种故障类型
```json
{
  "request": {
    "method": "GET",
    "url": "/api/unreliable"
  },
  "response": {
    "fault": "CONNECTION_RESET_BY_PEER"
  }
}

// 其他故障类型：
// - EMPTY_RESPONSE
// - MALFORMED_RESPONSE_CHUNK
// - RANDOM_DATA_THEN_CLOSE
```

### 延迟响应
```json
{
  "request": {
    "method": "GET",
    "url": "/api/slow"
  },
  "response": {
    "status": 200,
    "body": "Slow response",
    "fixedDelayMilliseconds": 5000
  }
}

// 随机延迟
{
  "response": {
    "status": 200,
    "body": "Random delay",
    "delayDistribution": {
      "type": "lognormal",
      "median": 80,
      "sigma": 0.4
    }
  }
}
```

## 5. **场景和状态管理**

### 状态机 (Scenarios)
```json
{
  "scenarioName": "User Registration",
  "requiredScenarioState": "Started",
  "newScenarioState": "User Created",
  "request": {
    "method": "POST",
    "url": "/api/users"
  },
  "response": {
    "status": 201,
    "body": "User created"
  }
}

{
  "scenarioName": "User Registration",
  "requiredScenarioState": "User Created",
  "request": {
    "method": "GET",
    "url": "/api/users/1"
  },
  "response": {
    "status": 200,
    "body": "User details"
  }
}
```

## 6. **代理和录制**

### 代理配置
```json
{
  "request": {
    "method": "ANY",
    "urlPattern": ".*"
  },
  "response": {
    "proxyBaseUrl": "https://real-api.example.com"
  }
}
```

### 录制功能
```bash
# 启动录制模式
java -jar wiremock-standalone.jar \
  --port 8080 \
  --proxy-all="https://real-api.example.com" \
  --record-mappings \
  --match-headers="Accept,Content-Type"
```

## 7. **验证功能**

### 请求验证 API
```python
import requests

# 验证请求是否被接收
def verify_requests():
    base_url = "http://localhost:8080/__admin"
    
    # 获取所有请求日志
    response = requests.get(f"{base_url}/requests")
    requests_log = response.json()
    
    # 验证特定请求
    verification = {
        "method": "POST",
        "url": "/api/users",
        "bodyPatterns": [
            {
                "matchesJsonPath": "$.name"
            }
        ]
    }
    
    verify_response = requests.post(
        f"{base_url}/requests/count",
        json=verification
    )
    
    count = verify_response.json()["count"]
    print(f"POST /api/users 被调用了 {count} 次")
```

## 8. **扩展功能**

### 自定义扩展
```java
// ResponseTransformer 示例
public class CustomTransformer extends ResponseTransformer {
    @Override
    public Response transform(Request request, Response response, FileSource files, Parameters parameters) {
        return Response.Builder.like(response)
                .but().body("Custom transformed response")
                .build();
    }
    
    @Override
    public String getName() {
        return "custom-transformer";
    }
}
```

```json
{
  "request": {
    "method": "GET",
    "url": "/api/custom"
  },
  "response": {
    "status": 200,
    "body": "Original response",
    "transformers": ["custom-transformer"]
  }
}
```

## 9. **文件服务**

### 静态文件服务
```json
{
  "request": {
    "method": "GET",
    "url": "/api/data"
  },
  "response": {
    "status": 200,
    "bodyFileName": "data.json"
  }
}
```

目录结构：
```
wiremock/
├── __files/
│   ├── data.json
│   └── images/
│       └── logo.png
└── mappings/
    └── api-mappings.json
```

## 10. **认证和安全**

### Basic 认证
```json
{
  "request": {
    "method": "GET",
    "url": "/api/secure",
    "basicAuth": {
      "username": "admin",
      "password": "password"
    }
  },
  "response": {
    "status": 200,
    "body": "Authenticated"
  }
}
```

## 11. **CORS 支持**

### 自动 CORS 处理
```json
{
  "request": {
    "method": "OPTIONS",
    "url": "/api/users"
  },
  "response": {
    "status": 200,
    "headers": {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }
  }
}
```

## 12. **Webhook 支持**

### 请求后触发 Webhook
```json
{
  "request": {
    "method": "POST",
    "url": "/api/orders"
  },
  "response": {
    "status": 201,
    "body": "Order created"
  },
  "postServeActions": [
    {
      "name": "webhook",
      "parameters": {
        "method": "POST",
        "url": "http://another-service.com/webhooks/order-created",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": "{\"orderId\": \"{{jsonPath request.body '$.id'}}\", \"status\": \"created\"}"
      }
    }
  ]
}
```

## 13. **性能测试功能**

### 并发测试支持
```python
import concurrent.futures
import requests

def stress_test_wiremock():
    base_url = "http://localhost:8080"
    
    def make_request(i):
        response = requests.get(f"{base_url}/api/users/{i}")
        return response.status_code
    
    # 并发测试
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(make_request, i) for i in range(100)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    print(f"成功请求: {results.count(200)}")
```

## 14. **管理和监控**

### 管理 API 端点
```python
import requests

class WireMockAdmin:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.admin_url = f"{base_url}/__admin"
    
    def get_mappings(self):
        """获取所有映射"""
        return requests.get(f"{self.admin_url}/mappings").json()
    
    def reset(self):
        """重置所有映射和请求日志"""
        requests.post(f"{self.admin_url}/reset")
    
    def get_requests(self):
        """获取所有请求记录"""
        return requests.get(f"{self.admin_url}/requests").json()
    
    def shutdown(self):
        """关闭 WireMock"""
        requests.post(f"{self.admin_url}/shutdown")
    
    def get_settings(self):
        """获取服务器设置"""
        return requests.get(f"{self.admin_url}/settings").json()
    
    def update_settings(self, settings):
        """更新服务器设置"""
        return requests.post(f"{self.admin_url}/settings", json=settings)
```

## 15. **配置选项**

### 启动配置参数
```bash
java -jar wiremock-standalone.jar \
  --port 8080 \                    # HTTP 端口
  --https-port 8443 \              # HTTPS 端口
  --bind-address 0.0.0.0 \         # 绑定地址
  --verbose \                      # 详细日志
  --enable-browser-proxying \      # 启用浏览器代理
  --disable-banner \               # 禁用启动横幅
  --no-request-journal \           # 禁用请求日志
  --max-request-journal-entries 1000 \ # 最大请求日志条目
  --container-threads 50 \         # 容器线程数
  --jetty-acceptor-threads 10 \    # Jetty 接收器线程
  --jetty-accept-queue-size 100 \  # 接受队列大小
  --async-response-enabled true \  # 启用异步响应
  --async-response-threads 50 \    # 异步响应线程
  --global-response-templating \   # 全局响应模板
  --local-response-templating \    # 本地响应模板
  --extensions com.example.MyTransformer \ # 自定义扩展
  --root-dir /path/to/wiremock \   # 根目录
  --record-mappings \              # 录制模式
  --match-headers "Accept,Content-Type" \ # 匹配头
  --proxy-all "https://target.com" \ # 代理所有请求
  --preserve-host-header \         # 保留主机头
  --proxy-via "proxy.example.com"  # 通过代理
```

## 16. **实际使用示例**

### 完整的电商 API Mock
```json
// mappings/orders.json
[
  {
    "scenarioName": "Order Lifecycle",
    "requiredScenarioState": "Started",
    "newScenarioState": "Order Created",
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
        "status": "created",
        "createdAt": "{{now}}",
        "total": "{{jsonPath request.body '$.total'}}"
      },
      "transformers": ["response-template"]
    }
  },
  {
    "scenarioName": "Order Lifecycle",
    "requiredScenarioState": "Order Created",
    "request": {
      "method": "GET",
      "urlPathPattern": "/api/orders/[0-9]+"
    },
    "response": {
      "status": 200,
      "jsonBody": {
        "orderId": "{{request.pathSegments.[2]}}",
        "status": "processing",
        "estimatedDelivery": "{{now offset='2 days'}}"
      },
      "transformers": ["response-template"]
    }
  }
]
```

## 总结

WireMock 提供了企业级的 API Mock 功能，包括：

- **完整的 HTTP 协议支持**
- **灵活的请求匹配**
- **动态响应生成**
- **故障注入和延迟模拟**
- **状态管理和场景测试**
- **代理和录制功能**
- **扩展和自定义**
- **管理和监控 API**
- **性能测试支持**

这些功能使得 WireMock 成为 API 开发、测试和模拟的完整解决方案，适用于从单元测试到生产环境模拟的各种场景。