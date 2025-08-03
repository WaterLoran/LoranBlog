**总结**: 以下的封装方法不完美

1. 仅仅能够去发送请求
2. 不方便去集成框架功能(断言, 提取信息)
3. 重复代码多, 冗余代码多
4. 不能根据每一类接口的特点去对应的去适配, 以提供最方便最容易理解的调用方式
5. 不涉及不考虑多接口组合的场景
6. 不涉及不考虑数据依赖的场景
7. 不涉及不考虑复用的场景



针对API自动化测试中的关键字封装设计，我将结合前述API模式提供系统化的封装方案，重点解决模式差异性和复用性问题。以下是分层封装策略和具体实现示例：

---

### **一、基础请求层封装（核心基石）**
处理HTTP基础操作，支持所有API模式
```python
# http_client.py
import requests

class HTTPClient:
    def __init__(self, base_url, default_headers=None):
        self.base_url = base_url
        self.session = requests.Session()
        if default_headers:
            self.session.headers.update(default_headers)
        self.last_response = None  # 存储最后一次响应
        self.etag_cache = {}  # 存储资源ETag

    def _send_request(self, method, endpoint, **kwargs):
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        self.last_response = response
        
        # 自动缓存ETag (针对条件请求)
        if response.status_code == 200 and 'ETag' in response.headers:
            resource_id = endpoint.split('/')[-1]
            self.etag_cache[resource_id] = response.headers['ETag']
        
        return response

    # 封装基础HTTP方法
    def get(self, endpoint, params=None, **kwargs):
        return self._send_request('GET', endpoint, params=params, **kwargs)
    
    def post(self, endpoint, json=None, **kwargs):
        return self._send_request('POST', endpoint, json=json, **kwargs)
    
    def patch(self, endpoint, json=None, **kwargs):
        return self._send_request('PATCH', endpoint, json=json, **kwargs)
    
    # 其他方法: put, delete 等...
```

---

### **二、模式化业务层封装**
#### **1. 数据获取模式**
```python
# api_keywords.py
from http_client import HTTPClient

class APIKeywords:
    def __init__(self, base_url):
        self.client = HTTPClient(base_url)
    
    # 模式1: 全量获取
    def get_full_resource(self, resource_type, resource_id):
        endpoint = f"/{resource_type}/{resource_id}"
        return self.client.get(endpoint).json()
    
    # 模式2: 字段投影
    def get_partial_resource(self, resource_type, resource_id, fields):
        endpoint = f"/{resource_type}/{resource_id}"
        params = {'fields': ','.join(fields)}  # 转换为 field1,field2
        return self.client.get(endpoint, params=params).json()
    
    # 模式3: 分页获取 (支持两种分页模式)
    def get_paginated_resources(self, resource_type, page_type='number', **kwargs):
        endpoint = f"/{resource_type}"
        params = {}
        
        if page_type == 'number':
            params = {'page': kwargs.get('page', 1), 
                     'page_size': kwargs.get('page_size', 10)}
        elif page_type == 'cursor':
            params = {'cursor': kwargs.get('cursor'), 
                      'limit': kwargs.get('limit', 50)}
        
        response = self.client.get(endpoint, params=params)
        return {
            'data': response.json(),
            'pagination': response.headers.get('X-Pagination')  # 解析分页元数据
        }
```

#### **2. 数据修改模式**
```python
# 续 api_keywords.py
    # 模式4: 全量替换更新 (带ETag验证)
    def full_update_resource(self, resource_type, resource_id, data):
        endpoint = f"/{resource_type}/{resource_id}"
        headers = {}
        
        # 自动附加条件请求头
        if resource_id in self.client.etag_cache:
            headers['If-Match'] = self.client.etag_cache[resource_id]
        
        return self.client.put(endpoint, json=data, headers=headers)
    
    # 模式5: 部分更新 (支持多种Patch格式)
    def partial_update_resource(self, resource_type, resource_id, 
                               patch_data, patch_format='merge'):
        endpoint = f"/{resource_type}/{resource_id}"
        headers = {'Content-Type': self._get_patch_content_type(patch_format)}
        
        # 附加ETag
        if resource_id in self.client.etag_cache:
            headers['If-Match'] = self.client.etag_cache[resource_id]
        
        return self.client.patch(endpoint, json=patch_data, headers=headers)
    
    def _get_patch_content_type(self, format_type):
        types = {
            'merge': 'application/merge-patch+json',
            'json-patch': 'application/json-patch+json',
            'custom': 'application/vnd.custom.patch+json'
        }
        return types.get(format_type, 'application/json')
    
    # 模式6: 直接创建
    def create_resource(self, resource_type, data):
        endpoint = f"/{resource_type}"
        return self.client.post(endpoint, json=data)
```

#### **3. 高级模式封装**
```python
# 续 api_keywords.py
    # 模式7: 批量操作
    def execute_batch_operations(self, operations):
        """ operations示例: 
        [
            {"method": "POST", "url": "/users", "body": {...}},
            {"method": "PATCH", "url": "/orders/123", "body": {...}}
        ]
        """
        return self.client.post("/batch", json={"operations": operations})
    
    # 模式8: GraphQL查询
    def execute_graphql_query(self, query, variables=None):
        payload = {"query": query}
        if variables: payload["variables"] = variables
        return self.client.post("/graphql", json=payload)
    
    # 模式9: Webhook模拟
    def simulate_webhook_event(self, event_type, payload):
        # 内部调用webhook处理器
        return self.client.post(f"/internal/webhooks/{event_type}", json=payload)
```

---

### **三、验证层封装**
```python
# validation_keywords.py
class ValidationKeywords:
    @staticmethod
    def should_contain_fields(response, expected_fields):
        """验证响应包含指定字段"""
        data = response.json()
        missing = [field for field in expected_fields if field not in data]
        if missing:
            raise AssertionError(f"缺少字段: {missing}")
    
    @staticmethod
    def should_have_status(response, expected_status):
        """验证HTTP状态码"""
        if response.status_code != expected_status:
            raise AssertionError(
                f"预期状态 {expected_status}, 实际 {response.status_code}"
            )
    
    @staticmethod
    def should_contain_pagination(response):
        """验证分页元数据"""
        pagination = response.headers.get('X-Pagination')
        if not pagination:
            raise AssertionError("响应缺少分页信息")
        # 可进一步解析JSON验证具体字段
    
    @staticmethod
    def should_reflect_changes(original, updated, changed_fields):
        """验证部分更新有效性"""
        for field in changed_fields:
            if original[field] == updated[field]:
                raise AssertionError(f"字段 {field} 未更新")
```

---

### **四、关键字组合示例**
#### **场景：安全的部分更新流程**
```python
# test_user_profile.py
def test_partial_update_user_email():
    # 初始化API客户端
    api = APIKeywords(BASE_URL)
    validator = ValidationKeywords()
    
    # 1. 全量获取用户数据
    user_data = api.get_full_resource('users', 'user123')
    
    # 2. 执行部分更新
    update_payload = {'email': 'new@example.com'}
    response = api.partial_update_resource(
        'users', 'user123', update_payload, patch_format='merge'
    )
    
    # 3. 验证更新结果
    validator.should_have_status(response, 200)
    
    # 4. 获取更新后数据验证
    updated_data = api.get_full_resource('users', 'user123')
    validator.should_reflect_changes(user_data, updated_data, ['email'])
```

#### **场景：防并发更新**
```python
def test_optimistic_locking():
    api = APIKeywords(BASE_URL)
    
    # 第一次获取并缓存ETag
    api.get_full_resource('orders', 'order456')
    
    # 模拟并发冲突
    conflict_data = {'status': 'cancelled'}
    first_update = api.partial_update_resource('orders', 'order456', conflict_data)
    
    # 第二次更新应失败 (ETag已变更)
    second_update = api.partial_update_resource('orders', 'order456', {'amount': 99})
    
    # 验证冲突错误
    assert second_update.status_code == 412  # Precondition Failed
```

---

### **五、封装设计原则**
1. **分层隔离**
   - 基础层：HTTP通信/会话管理
   - 模式层：API模式实现
   - 验证层：响应断言逻辑

2. **模式化参数设计**
   ```python
   # 通过枚举明确模式选项
   from enum import Enum
   class PatchFormat(Enum):
       MERGE = 'merge'
       JSON_PATCH = 'json-patch'
       CUSTOM = 'custom'
   
   def partial_update(..., format: PatchFormat = PatchFormat.MERGE)
   ```

3. **状态管理**
   - 自动维护会话/cookie
   - 缓存ETag等元数据
   - 记录最后一次响应

4. **错误处理增强**
   ```python
   def _send_request(...):
       try:
           response = ...
           response.raise_for_status()  # 自动抛出4xx/5xx异常
       except RequestException as e:
           log_error(f"请求失败: {e}")
           capture_screenshot()  # 失败时截图
           raise
   ```

5. **动态适配机制**
   ```python
   # 根据API版本自动调整路径
   def __init__(self, base_url, api_version='v2'):
       self.api_path = f"/api/{api_version}"
   
   def _build_endpoint(self, resource, resource_id=None):
       path = f"{self.api_path}/{resource}"
       return f"{path}/{resource_id}" if resource_id else path
   ```

---

### **六、高级封装模式**
#### **1. 命令模式封装**
```python
class CommandKeywords:
    def submit_order(self, cart_id, shipping_info):
        return self.client.post(
            "/commands/submit-order",
            json={"cartId": cart_id, "shipping": shipping_info}
        )
    
    def approve_loan(self, application_id, approver):
        return self.client.post(
            f"/loan-applications/{application_id}/approve",
            json={"approver": approver}
        )
```

#### **2. 异步操作封装**
```python
def execute_async_action(action_name, payload):
    # 触发异步操作
    initiation_resp = self.client.post(f"/async/{action_name}", json=payload)
    operation_id = initiation_resp.json()['operationId']
    
    # 轮询结果
    while True:
        status_resp = self.client.get(f"/async/operations/{operation_id}")
        if status_resp.json()['status'] == 'COMPLETED':
            return self.client.get(status_resp.json()['resultUri'])
        time.sleep(POLL_INTERVAL)
```

#### **3. Webhook测试自动化**
```python
class WebhookTester:
    def __init__(self):
        self.receiver = start_webhook_receiver()  # 启动临时HTTP服务
    
    def wait_for_webhook(self, event_type, timeout=10):
        start_time = time.time()
        while time.time() - start_time < timeout:
            for event in self.receiver.events:
                if event['type'] == event_type:
                    return event
            time.sleep(0.5)
        raise TimeoutError(f"未收到 {event_type} 事件")
    
    def verify_webhook_payload(self, event, expected_data):
        assert event['payload'] == expected_data
```

---

### **七、关键决策点**
| **设计选择** | **推荐方案**              | **优势**               |
| ------------ | ------------------------- | ---------------------- |
| 状态管理     | 显式缓存ETag/LastModified | 避免条件请求实现侵入性 |
| 部分更新格式 | 默认JSON Merge Patch      | 兼容性好，简单易用     |
| 错误处理     | 分层捕获+增强日志         | 平衡快速失败与调试信息 |
| 异步操作     | 轮询+超时机制             | 避免外部依赖，通用性强 |
| 参数传递     | 类型化枚举(Enum)          | 提升可读性和IDE支持    |
| 验证逻辑     | 分离验证关键字            | 支持多种断言策略组合   |

这种封装设计能有效应对不同API模式的测试需求，通过合理的分层和模式化参数，既保证灵活性又减少重复代码。核心在于识别各模式的差异点进行针对性封装，同时保持基础请求层的统一性。