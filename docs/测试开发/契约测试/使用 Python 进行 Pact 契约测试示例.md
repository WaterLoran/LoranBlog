# 使用 Python 进行 Pact 契约测试示例

下面我将提供一个完整的 Python Pact 契约测试示例，展示一个订单服务(消费者)与用户服务(提供者)之间的交互。

## 项目设置

首先安装必要的依赖：

```bash
# 创建项目目录
mkdir pact-python-example
cd pact-python-example

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows

# 安装依赖
pip install pact-python pytest requests
```

## 项目结构

```
pact-python-example/
├── consumer/
│   ├── __init__.py
│   ├── user_client.py
│   ├── order_service.py
│   └── test_order_service.py
├── provider/
│   ├── __init__.py
│   ├── app.py
│   └── test_user_provider.py
├── pacts/                  # 自动生成的契约文件
└── requirements.txt
```

## 消费者测试示例

创建 `consumer/user_client.py`：

```python
import requests

class UserClient:
    def __init__(self, base_url):
        self.base_url = base_url
    
    def get_user(self, user_id):
        """获取用户信息"""
        response = requests.get(f"{self.base_url}/users/{user_id}")
        response.raise_for_status()
        return response.json()
```

创建 `consumer/order_service.py`：

```python
class OrderService:
    def __init__(self, user_client):
        self.user_client = user_client
    
    def get_user_details(self, user_id):
        """获取用户详细信息"""
        try:
            return self.user_client.get_user(user_id)
        except Exception as e:
            raise Exception(f"Error getting user details: {str(e)}")
```

创建 `consumer/test_order_service.py`：

```python
import pytest
import atexit
from pact import Consumer, Provider
from consumer.user_client import UserClient
from consumer.order_service import OrderService

# 定义 Pact 的消费者和提供者
pact = Consumer('OrderService').has_pact_with(Provider('UserService'), port=8080)
pact.start_service()
atexit.register(pact.stop_service)

def test_get_user_details():
    # 定义期望的交互
    expected = {
        'id': 1,
        'name': 'John Doe',
        'email': 'john.doe@example.com'
    }
    
    # 设置 Pact 交互
    (pact
     .given('user with id 1 exists')
     .upon_receiving('a request for user details')
     .with_request(
         method='GET',
         path='/users/1',
         headers={'Accept': 'application/json'})
     .will_respond_with(
         status=200,
         headers={'Content-Type': 'application/json'},
         body=expected))
    
    # 开始 Pact 测试
    with pact:
        # 创建客户端和服务实例
        user_client = UserClient(pact.uri)
        order_service = OrderService(user_client)
        
        # 执行测试
        result = order_service.get_user_details(1)
        
        # 验证结果
        assert result == expected
        assert result['id'] == 1
        assert result['name'] == 'John Doe'
        assert result['email'] == 'john.doe@example.com'

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
```

## 提供者验证示例

创建 `provider/app.py`：

```python
from flask import Flask, jsonify

app = Flask(__name__)

# 简单的用户服务API
@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    # 模拟数据库查询
    users = {
        1: {'id': 1, 'name': 'John Doe', 'email': 'john.doe@example.com'},
        2: {'id': 2, 'name': 'Jane Smith', 'email': 'jane.smith@example.com'}
    }
    
    if user_id in users:
        return jsonify(users[user_id])
    else:
        return jsonify({'error': 'User not found'}), 404

if __name__ == '__main__':
    app.run(port=5000)
```

创建 `provider/test_user_provider.py`：

```python
import pytest
import requests
from pact import Verifier

def test_user_provider():
    # 设置验证器
    verifier = Verifier(provider='UserService',
                        provider_base_url='http://localhost:5000')
    
    # 执行验证
    output, _ = verifier.verify_pacts(
        './pacts/orderservice-userservice.json',
        verbose=True,
        provider_states_setup_url='http://localhost:5000/_pact/provider_states'
    )
    
    # 检查验证结果
    assert output == 0, "Pact验证失败"

# 如果需要设置provider states（可选）
@app.route('/_pact/provider_states', methods=['POST'])
def provider_states():
    # 这里可以设置测试前的状态，例如准备测试数据
    return jsonify({'result': 'success'})

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
```

## 运行测试

1. 首先运行消费者测试生成Pact文件：

```bash
cd consumer
python -m pytest test_order_service.py -v
```

这将在 `pacts/` 目录下生成一个JSON格式的契约文件。

2. 启动提供者服务：

```bash
cd provider
python app.py
```

3. 在另一个终端中运行提供者验证：

```bash
cd provider
python -m pytest test_user_provider.py -v
```

## 完整的工作流程

1. **消费者测试**：运行消费者测试时，Pact会启动一个模拟服务器，记录所有交互，并生成契约文件
2. **契约文件**：生成的JSON文件定义了消费者期望的API行为
3. **提供者验证**：Pact使用契约文件验证真实提供者API的行为是否符合预期
4. **持续集成**：通常这些步骤会集成到CI/CD流程中，确保API变更不会破坏现有契约

## 注意事项

- 确保提供者服务在验证前已经运行
- Pact文件应该被版本控制并共享给提供者团队
- 在CI环境中，通常使用Pact Broker来管理和共享契约文件

这个示例展示了Pact契约测试的基本用法，你可以根据实际项目需求进行扩展和调整。