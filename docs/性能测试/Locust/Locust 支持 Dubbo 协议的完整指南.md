# Locust 支持 Dubbo 协议的完整指南

Locust 默认不支持 Dubbo 协议，但我们可以通过扩展 Locust 来支持 Dubbo 测试。下面详细介绍几种实现方式，并提供完整的示例。

## 🔧 方法一：使用 Python Dubbo 客户端库

### 1. 安装必要的库

```bash
pip install locust python-dubbo
# 或者使用 dubbo-client-py
pip install locust dubbo-client-py
```

### 2. 创建 Dubbo Locust 测试脚本

```python
# dubbo_locust.py
from locust import User, task, between, events
from dubbo.client import DubboClient
import json
import time
from threading import Lock

class DubboClientWrapper:
    """
    Dubbo 客户端包装器，用于集成到 Locust 的统计系统中
    """
    def __init__(self, host, port):
        self.client = DubboClient(host, port)
        self.host = host
        self.port = port
        self.lock = Lock()  # 确保线程安全
    
    def invoke(self, service_name, method_name, args, name="dubbo_call"):
        """
        调用 Dubbo 服务并集成 Locust 统计
        """
        start_time = time.time()
        response_length = 0
        exception = None
        
        try:
            # 执行 Dubbo 调用
            with self.lock:
                result = self.client.invoke(service_name, method_name, args)
            
            # 计算响应数据长度
            response_length = len(str(result)) if result else 0
            response_time = int((time.time() - start_time) * 1000)
            
            # 报告成功
            events.request_success.fire(
                request_type="DUBBO",
                name=name,
                response_time=response_time,
                response_length=response_length,
            )
            
            return result
            
        except Exception as e:
            response_time = int((time.time() - start_time) * 1000)
            exception = e
            
            # 报告失败
            events.request_failure.fire(
                request_type="DUBBO",
                name=name,
                response_time=response_time,
                exception=e,
            )
            
            raise e

class DubboUser(User):
    """
    Dubbo 协议的用户类
    """
    wait_time = between(1, 3)
    abstract = True
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dubbo_client = DubboClientWrapper(
            self.host.split("://")[1].split(":")[0],  # 提取主机名
            int(self.host.split(":")[-1])  # 提取端口
        )

class ExampleDubboUser(DubboUser):
    """
    Dubbo 测试用户示例
    """
    host = "dubbo://127.0.0.1:20880"  # Dubbo 服务地址
    
    def on_start(self):
        """用户启动时执行"""
        print("Dubbo 用户启动")
    
    @task(3)
    def test_user_service(self):
        """测试用户服务"""
        try:
            # 调用用户查询服务
            result = self.dubbo_client.invoke(
                service_name="com.example.UserService",
                method_name="getUserById",
                args=[12345],
                name="getUserById"
            )
            
            # 可以添加断言验证结果
            if result and "success" in str(result).lower():
                print(f"用户查询成功: {result}")
            else:
                print(f"用户查询返回异常: {result}")
                
        except Exception as e:
            print(f"用户服务调用失败: {e}")
    
    @task(2)
    def test_order_service(self):
        """测试订单服务"""
        try:
            # 调用订单创建服务
            order_data = {
                "userId": 12345,
                "productId": 1001,
                "quantity": 2,
                "price": 99.99
            }
            
            result = self.dubbo_client.invoke(
                service_name="com.example.OrderService", 
                method_name="createOrder",
                args=[order_data],
                name="createOrder"
            )
            
            print(f"订单创建结果: {result}")
            
        except Exception as e:
            print(f"订单服务调用失败: {e}")
    
    @task(1)
    def test_product_service(self):
        """测试商品服务 - 多个参数示例"""
        try:
            result = self.dubbo_client.invoke(
                service_name="com.example.ProductService",
                method_name="searchProducts",
                args=["手机", 1, 20],  # 关键词, 页码, 页大小
                name="searchProducts"
            )
            
            print(f"商品搜索返回 {len(result) if result else 0} 条结果")
            
        except Exception as e:
            print(f"商品服务调用失败: {e}")
```

## 🔧 方法二：使用 Telnet 连接 Dubbo（推荐）

Dubbo 服务通常提供 Telnet 支持，我们可以通过 Telnet 协议直接调用 Dubbo 服务。

### 1. 实现 Dubbo Telnet 客户端

```python
# dubbo_telnet_client.py
import telnetlib
import json
import re
import time
from locust import events

class DubboTelnetClient:
    """
    Dubbo Telnet 客户端
    """
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.tn = None
        self.connect()
    
    def connect(self):
        """连接到 Dubbo 服务"""
        try:
            self.tn = telnetlib.Telnet(self.host, self.port)
            # 读取欢迎信息
            self.tn.read_until(b"dubbo>")
            print(f"成功连接到 Dubbo 服务 {self.host}:{self.port}")
        except Exception as e:
            print(f"连接 Dubbo 服务失败: {e}")
            raise e
    
    def invoke(self, service_method, args, name="dubbo_invoke"):
        """
        调用 Dubbo 服务
        :param service_method: 服务方法，如 com.example.UserService.getUserById
        :param args: 参数列表
        :param name: 调用名称，用于统计
        """
        start_time = time.time()
        
        try:
            # 构建调用命令
            if isinstance(args, (list, tuple)):
                args_str = " ".join([json.dumps(arg) for arg in args])
            else:
                args_str = json.dumps(args)
            
            command = f"invoke {service_method}({args_str})\n"
            
            # 发送命令
            self.tn.write(command.encode('utf-8'))
            
            # 读取响应
            response = self.tn.read_until(b"dubbo>", timeout=10).decode('utf-8')
            
            # 解析响应结果
            result = self._parse_response(response)
            response_time = int((time.time() - start_time) * 1000)
            
            # 报告成功
            events.request_success.fire(
                request_type="DUBBO",
                name=name,
                response_time=response_time,
                response_length=len(str(result)),
            )
            
            return result
            
        except Exception as e:
            response_time = int((time.time() - start_time) * 1000)
            
            # 报告失败
            events.request_failure.fire(
                request_type="DUBBO",
                name=name,
                response_time=response_time,
                exception=e,
            )
            
            # 重新连接
            try:
                self.connect()
            except:
                pass
            
            raise e
    
    def _parse_response(self, response):
        """解析 Telnet 响应"""
        # 移除命令提示符
        response = response.replace("dubbo>", "").strip()
        
        # 提取 JSON 结果（如果存在）
        json_match = re.search(r'(\{.*\}|\[.*\])', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except:
                pass
        
        # 返回原始响应
        return response
    
    def close(self):
        """关闭连接"""
        if self.tn:
            self.tn.close()

class DubboTelnetUser(User):
    """
    基于 Telnet 的 Dubbo 用户
    """
    wait_time = between(1, 5)
    abstract = True
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        host = self.host.replace("dubbo://", "").replace("telnet://", "")
        host_parts = host.split(":")
        self.dubbo_client = DubboTelnetClient(host_parts[0], int(host_parts[1]))
    
    def on_stop(self):
        """用户停止时关闭连接"""
        self.dubbo_client.close()
```

### 2. 完整的 Dubbo Telnet 测试示例

```python
# dubbo_telnet_test.py
from locust import User, task, between, events
from dubbo_telnet_client import DubboTelnetUser
import random

class RealDubboUser(DubboTelnetUser):
    """
    真实的 Dubbo 服务测试用户
    """
    host = "dubbo://127.0.0.1:20880"  # Dubbo 服务地址
    
    def on_start(self):
        """用户启动时执行"""
        print("Dubbo Telnet 用户启动")
    
    @task(4)
    def query_user_info(self):
        """查询用户信息"""
        user_ids = [1001, 1002, 1003, 1004, 1005]
        user_id = random.choice(user_ids)
        
        result = self.dubbo_client.invoke(
            service_method="com.example.userService.findById",
            args=[user_id],
            name="userService.findById"
        )
        
        print(f"查询用户 {user_id} 结果: {result}")
    
    @task(3)
    def create_order(self):
        """创建订单"""
        order_data = {
            "userId": random.randint(1000, 9999),
            "productId": random.randint(1, 100),
            "productName": f"商品{random.randint(1, 1000)}",
            "quantity": random.randint(1, 5),
            "price": round(random.uniform(10.0, 500.0), 2)
        }
        
        result = self.dubbo_client.invoke(
            service_method="com.example.orderService.create",
            args=[order_data],
            name="orderService.create"
        )
        
        print(f"创建订单结果: {result}")
    
    @task(2)
    def search_products(self):
        """搜索商品"""
        keywords = ["手机", "电脑", "平板", "耳机", "手表"]
        keyword = random.choice(keywords)
        
        result = self.dubbo_client.invoke(
            service_method="com.example.productService.search",
            args=[keyword, 1, 10],  # 关键词, 页码, 页大小
            name="productService.search"
        )
        
        print(f"搜索 '{keyword}' 返回结果")
    
    @task(1)
    def batch_operation(self):
        """批量操作测试"""
        user_ids = [random.randint(1000, 9999) for _ in range(3)]
        
        result = self.dubbo_client.invoke(
            service_method="com.example.userService.batchQuery",
            args=[user_ids],
            name="userService.batchQuery"
        )
        
        print(f"批量查询 {len(user_ids)} 个用户完成")
```

## 🔧 方法三：使用 Hessian 协议直接调用

对于需要更高性能的场景，可以直接使用 Hessian 协议。

### 1. 安装 Hessian 库

```bash
pip install locust pyhessian
```

### 2. Hessian 客户端实现

```python
# dubbo_hessian_client.py
import socket
import hessian2
from locust import events
import time

class DubboHessianClient:
    """
    Dubbo Hessian 协议客户端
    """
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.socket = None
    
    def connect(self):
        """建立连接"""
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect((self.host, self.port))
        self.socket.settimeout(10.0)
    
    def invoke(self, service_name, method_name, args, name="dubbo_hessian"):
        """
        通过 Hessian 协议调用 Dubbo 服务
        """
        start_time = time.time()
        
        try:
            if not self.socket:
                self.connect()
            
            # 构建 Dubbo Hessian 请求
            request_data = self._build_request(service_name, method_name, args)
            
            # 发送请求
            self.socket.send(request_data)
            
            # 接收响应
            response_data = self._receive_response()
            
            # 解析响应
            result = self._parse_response(response_data)
            response_time = int((time.time() - start_time) * 1000)
            
            events.request_success.fire(
                request_type="DUBBO_HESSIAN",
                name=name,
                response_time=response_time,
                response_length=len(str(result)),
            )
            
            return result
            
        except Exception as e:
            response_time = int((time.time() - start_time) * 1000)
            events.request_failure.fire(
                request_type="DUBBO_HESSIAN",
                name=name,
                response_time=response_time,
                exception=e,
            )
            raise e
    
    def _build_request(self, service_name, method_name, args):
        """构建 Hessian 请求数据"""
        # 这里需要根据 Dubbo Hessian 协议格式构建请求
        # 这是一个简化的示例，实际实现需要完整的协议支持
        encoder = hessian2.Encoder()
        
        # Dubbo 协议头
        header = b"da\xbb\xc2\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
        
        # Hessian 编码体
        encoder.write_string("2.0.2")  # Dubbo version
        encoder.write_string(service_name)
        encoder.write_string("0.0.0")
        encoder.write_string(method_name)
        encoder.write_string("Ljava/lang/String;")  # 参数类型描述
        
        # 编码参数
        for arg in args:
            encoder.write_object(arg)
        
        encoder.write_object({})  # attachments
        
        body = encoder.get_buffer()
        
        # 设置消息体长度
        header = header[:12] + len(body).to_bytes(4, 'big') + header[16:]
        
        return header + body
    
    def _receive_response(self):
        """接收响应数据"""
        # 读取响应头
        header = self.socket.recv(16)
        if len(header) < 16:
            raise Exception("响应头不完整")
        
        # 读取响应体长度
        body_length = int.from_bytes(header[12:16], 'big')
        
        # 读取响应体
        body = b""
        while len(body) < body_length:
            chunk = self.socket.recv(body_length - len(body))
            if not chunk:
                raise Exception("连接中断")
            body += chunk
        
        return body
    
    def _parse_response(self, response_data):
        """解析 Hessian 响应"""
        decoder = hessian2.Decoder(response_data)
        return decoder.read_object()
    
    def close(self):
        """关闭连接"""
        if self.socket:
            self.socket.close()

class DubboHessianUser(User):
    """Hessian 协议 Dubbo 用户"""
    wait_time = between(1, 3)
    abstract = True
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        host = self.host.replace("dubbo://", "")
        host_parts = host.split(":")
        self.dubbo_client = DubboHessianClient(host_parts[0], int(host_parts[1]))
    
    def on_stop(self):
        self.dubbo_client.close()
```

## 🚀 运行 Dubbo Locust 测试

### 1. 启动测试

```bash
# 使用 Web UI 模式
locust -f dubbo_telnet_test.py --host=dubbo://127.0.0.1:20880

# 使用无头模式
locust -f dubbo_telnet_test.py --headless --users 10 --spawn-rate 1 --run-time 1m
```

### 2. 分布式测试

```bash
# Master 节点
locust -f dubbo_telnet_test.py --master --master-bind-host=0.0.0.0

# Worker 节点
locust -f dubbo_telnet_test.py --worker --master-host=192.168.1.100
```

## 📊 自定义 Dubbo 统计和监控

```python
# dubbo_metrics.py
from locust import events
import time
from collections import defaultdict

class DubboMetricsCollector:
    """Dubbo 特定指标收集器"""
    
    def __init__(self):
        self.service_metrics = defaultdict(list)
        self.slow_calls = 0
        self.start_time = time.time()
    
    @events.request_success.add_listener
    def on_dubbo_success(self, request_type, name, response_time, response_length, **kwargs):
        if "DUBBO" in request_type:
            service_name = name.split('.')[0] if '.' in name else name
            self.service_metrics[service_name].append(response_time)
            
            # 记录慢调用
            if response_time > 1000:  # 1秒以上
                self.slow_calls += 1
                print(f"⚠️  慢 Dubbo 调用: {name} - {response_time}ms")
    
    @events.request_failure.add_listener
    def on_dubbo_failure(self, request_type, name, response_time, exception, **kwargs):
        if "DUBBO" in request_type:
            print(f"❌ Dubbo 调用失败: {name} - {exception}")
    
    @events.test_stop.add_listener
    def report_dubbo_metrics(self, environment, **kwargs):
        """测试结束时报告 Dubbo 特定指标"""
        print("\n📊 Dubbo 服务性能报告:")
        for service, times in self.service_metrics.items():
            if times:
                avg_time = sum(times) / len(times)
                max_time = max(times)
                print(f"   {service}: 平均 {avg_time:.2f}ms, 最大 {max_time}ms, 调用次数 {len(times)}")
        
        print(f"   慢调用次数 (>1000ms): {self.slow_calls}")
        print(f"   总运行时间: {time.time() - self.start_time:.2f}秒")

# 初始化指标收集器
dubbo_metrics = DubboMetricsCollector()
```

## 🔧 集成到现有测试框架

### 1. 配置文件方式

```python
# config/dubbo_services.py
DUBBO_SERVICES = {
    "user_service": {
        "host": "127.0.0.1",
        "port": 20880,
        "services": {
            "getUser": "com.example.UserService.getUserById",
            "createUser": "com.example.UserService.createUser"
        }
    },
    "order_service": {
        "host": "127.0.0.1", 
        "port": 20881,
        "services": {
            "createOrder": "com.example.OrderService.createOrder",
            "queryOrder": "com.example.OrderService.queryOrder"
        }
    }
}
```

### 2. 工厂模式创建用户

```python
# dubbo_user_factory.py
from locust import User, task, between
from dubbo_telnet_client import DubboTelnetClient

def create_dubbo_user_class(service_config):
    """动态创建 Dubbo 用户类"""
    
    class DynamicDubboUser(User):
        wait_time = between(1, 5)
        host = f"dubbo://{service_config['host']}:{service_config['port']}"
        
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            host = self.host.replace("dubbo://", "")
            host_parts = host.split(":")
            self.client = DubboTelnetClient(host_parts[0], int(host_parts[1]))
        
        def on_stop(self):
            self.client.close()
    
    # 动态添加任务方法
    for task_name, service_method in service_config['services'].items():
        def create_task(method):
            def task_method(self):
                # 这里可以根据需要构造不同的参数
                args = self._get_args_for_method(method)
                self.client.invoke(method, args, name=method)
            return task_method
        
        setattr(DynamicDubboUser, task_name, task(create_task(service_method)))
    
    return DynamicDubboUser

# 使用工厂创建用户类
UserServiceUser = create_dubbo_user_class({
    "host": "127.0.0.1",
    "port": 20880,
    "services": {
        "get_user": "com.example.UserService.getUserById",
        "create_user": "com.example.UserService.createUser"
    }
})
```

## 🎯 总结

通过以上方法，你可以在 Locust 中实现对 Dubbo 服务的性能测试：

1. **Telnet 方式**：最简单实用，适合大多数场景
2. **Hessian 协议**：性能更好，但实现复杂
3. **第三方客户端**：依赖外部库，可能有限制

**推荐使用 Telnet 方式**，因为：
- ✅ Dubbo 服务默认支持 Telnet
- ✅ 实现简单，无需额外依赖
- ✅ 支持所有 Dubbo 服务方法
- ✅ 易于调试和排查问题

选择合适的方法根据你的具体需求和环境来决定。无论哪种方式，都能很好地集成到 Locust 的统计和分布式测试框架中。