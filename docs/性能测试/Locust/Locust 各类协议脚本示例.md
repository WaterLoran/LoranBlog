# Locust 各类协议脚本示例

Locust 的核心设计是基于 Python 代码的灵活性，这使得它可以测试各种协议，而不仅仅是 HTTP。以下是 Locust 支持的不同协议的脚本示例：

## 1. HTTP/HTTPS (内置支持)

这是 Locust 最常用的协议，内置完整支持。

```python
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)
    host = "https://example.com"
    
    @task(3)
    def view_items(self):
        # 查询参数请求
        for item_id in range(10):
            self.client.get(f"/item?id={item_id}", name="/item")
    
    @task
    def create_item(self):
        # JSON POST 请求
        self.client.post("/create", json={
            "name": "test_item",
            "value": 42
        })
    
    @task
    def upload_file(self):
        # 文件上传
        with open("test.txt", "rb") as f:
            self.client.post("/upload", files={"file": f})
    
    def on_start(self):
        # 登录操作
        self.client.post("/login", {
            "username": "test_user",
            "password": "test_password"
        })
```

## 2. WebSocket

需要安装 `websocket-client` 库：`pip install websocket-client`

```python
import json
import time
from locust import User, task, between
from websocket import create_connection, WebSocketConnectionClosedException

class WebSocketUser(User):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.ws = None
        self.connect()
    
    def connect(self):
        """建立 WebSocket 连接"""
        try:
            self.ws = create_connection("ws://echo.websocket.org/")
            self.ws.send(json.dumps({"type": "connect", "user": "test"}))
        except Exception as e:
            print(f"WebSocket 连接失败: {e}")
    
    @task
    def send_message(self):
        """发送消息任务"""
        try:
            start_time = time.time()
            message = json.dumps({"type": "message", "data": "Hello WebSocket"})
            self.ws.send(message)
            
            # 接收响应
            result = self.ws.recv()
            total_time = int((time.time() - start_time) * 1000)
            
            # 手动记录成功请求
            self.environment.events.request_success.fire(
                request_type="WebSocket",
                name="send_message",
                response_time=total_time,
                response_length=len(result),
            )
        except WebSocketConnectionClosedException:
            # 记录失败请求
            self.environment.events.request_failure.fire(
                request_type="WebSocket",
                name="send_message",
                response_time=0,
                exception=WebSocketConnectionClosedException("连接已关闭"),
            )
            # 尝试重新连接
            self.connect()
    
    def on_stop(self):
        """停止时关闭连接"""
        if self.ws:
            self.ws.close()
```

## 3. MQTT

需要安装 `paho-mqtt` 库：`pip install paho-mqtt`

```python
import time
import paho.mqtt.client as mqtt
from locust import User, task, between

class MQTTUser(User):
    wait_time = between(1, 5)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.connected = False
        
        try:
            self.client.connect("test.mosquitto.org", 1883, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"MQTT 连接失败: {e}")
    
    def on_connect(self, client, userdata, flags, rc):
        """连接回调"""
        if rc == 0:
            self.connected = True
            print("MQTT 连接成功")
            self.client.subscribe("test/topic")
        else:
            print(f"MQTT 连接失败，返回码: {rc}")
    
    def on_message(self, client, userdata, msg):
        """消息接收回调"""
        # 这里可以处理接收到的消息
        pass
    
    @task
    def publish_message(self):
        """发布消息任务"""
        if not self.connected:
            return
            
        start_time = time.time()
        try:
            # 发布消息
            result = self.client.publish("test/topic", "Hello MQTT from Locust")
            
            # 等待发布完成
            result.wait_for_publish()
            
            total_time = int((time.time() - start_time) * 1000)
            
            # 记录成功请求
            self.environment.events.request_success.fire(
                request_type="MQTT",
                name="publish",
                response_time=total_time,
                response_length=len("Hello MQTT from Locust"),
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            self.environment.events.request_failure.fire(
                request_type="MQTT",
                name="publish",
                response_time=total_time,
                exception=e,
            )
    
    def on_stop(self):
        """停止时断开连接"""
        self.client.loop_stop()
        self.client.disconnect()
```

## 4. TCP 原始套接字

```python
import socket
import time
from locust import User, task, between

class TCPUser(User):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.socket = None
        self.connect()
    
    def connect(self):
        """建立 TCP 连接"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect(("example.com", 80))
        except Exception as e:
            print(f"TCP 连接失败: {e}")
    
    @task
    def send_data(self):
        """发送数据任务"""
        if not self.socket:
            return
            
        start_time = time.time()
        try:
            # 构建 HTTP 请求
            request = "GET / HTTP/1.1\r\nHost: example.com\r\n\r\n"
            
            # 发送数据
            self.socket.send(request.encode())
            
            # 接收响应 (可选)
            response = self.socket.recv(1024)
            
            total_time = int((time.time() - start_time) * 1000)
            
            # 记录成功请求
            self.environment.events.request_success.fire(
                request_type="TCP",
                name="send_data",
                response_time=total_time,
                response_length=len(response),
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            self.environment.events.request_failure.fire(
                request_type="TCP",
                name="send_data",
                response_time=total_time,
                exception=e,
            )
            # 尝试重新连接
            self.connect()
    
    def on_stop(self):
        """停止时关闭连接"""
        if self.socket:
            self.socket.close()
```

## 5. gRPC

需要安装 `grpcio` 和 `grpcio-tools` 库：`pip install grpcio grpcio-tools`

首先，需要一个 proto 文件（例如 `helloworld.proto`）：
```proto
syntax = "proto3";

package helloworld;

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}
```

然后生成 Python 代码：
```bash
python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. helloworld.proto
```

最后编写 Locust 测试脚本：
```python
import time
import grpc
from locust import User, task, between
import helloworld_pb2
import helloworld_pb2_grpc

class GrpcUser(User):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.channel = grpc.insecure_channel('localhost:50051')
        self.stub = helloworld_pb2_grpc.GreeterStub(self.channel)
    
    @task
    def say_hello(self):
        """gRPC 调用任务"""
        start_time = time.time()
        try:
            # 创建请求
            request = helloworld_pb2.HelloRequest(name='Locust')
            
            # 调用 gRPC 方法
            response = self.stub.SayHello(request)
            
            total_time = int((time.time() - start_time) * 1000)
            
            # 记录成功请求
            self.environment.events.request_success.fire(
                request_type="gRPC",
                name="SayHello",
                response_time=total_time,
                response_length=len(response.message),
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            self.environment.events.request_failure.fire(
                request_type="gRPC",
                name="SayHello",
                response_time=total_time,
                exception=e,
            )
    
    def on_stop(self):
        """停止时关闭通道"""
        self.channel.close()
```

## 6. 自定义协议基类

如果你想为其他协议创建自定义客户端，可以继承 Locust 的基类：

```python
from locust import User, task, between
from locust.exception import LocustError
from locust.events import request_success, request_failure

class CustomProtocolClient:
    def __init__(self, host):
        self.host = host
        # 在这里初始化你的客户端连接
    
    def custom_request(self, method, data):
        # 实现你的协议逻辑
        start_time = time.time()
        try:
            # 发送请求并获取响应
            response = self._send_receive(method, data)
            response_time = int((time.time() - start_time) * 1000)
            
            # 触发成功事件
            request_success.fire(
                request_type="CustomProtocol",
                name=method,
                response_time=response_time,
                response_length=len(response),
            )
            return response
        except Exception as e:
            response_time = int((time.time() - start_time) * 1000)
            # 触发失败事件
            request_failure.fire(
                request_type="CustomProtocol",
                name=method,
                response_time=response_time,
                exception=e,
            )
            raise LocustError(f"Custom protocol request failed: {e}")

class CustomProtocolUser(User):
    abstract = True  # 抽象类，不会被直接实例化
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = CustomProtocolClient(self.host)

class MyCustomUser(CustomProtocolUser):
    wait_time = between(1, 3)
    host = "custom-protocol-server:8080"
    
    @task
    def my_task(self):
        self.client.custom_request("GET_DATA", {"param": "value"})
```

## 注意事项

1. **非 HTTP 协议**：对于非 HTTP 协议，你需要手动触发 `request_success` 和 `request_failure` 事件，以便 Locust 能够正确统计请求数据。

2. **资源管理**：确保正确管理连接资源（如 WebSocket、TCP 连接），在测试结束时正确关闭它们。

3. **错误处理**：实现适当的错误处理逻辑，包括连接重试机制。

4. **性能考虑**：对于高性能场景，注意避免在任务中创建过多临时对象，以免影响性能。

这些示例展示了如何使用 Locust 测试各种协议。根据你的具体需求，你可能需要调整这些示例以适应你的测试场景。