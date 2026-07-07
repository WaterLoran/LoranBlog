# Locust WebSocket压测并集成Web界面展示

是的，可以在Locust中实现对WebSocket的压测，并将数据展示到原生Web界面。以下是完整的实现方案：

## **1. 完整的WebSocket压测实现**

```python
# websocket_locust.py
import asyncio
import websockets
import json
import time
import threading
import queue
import ssl
from locust import User, task, events, between, LoadTestShape
from locust.runners import MasterRunner, WorkerRunner
from dataclasses import dataclass
from typing import Optional, Dict, List
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# 自定义WebSocket事件追踪
# ============================================================================

@dataclass
class WebSocketRequest:
    """WebSocket请求记录"""
    name: str
    start_time: float
    coroutine_id: str
    user_id: str
    message_size: int = 0
    response_size: int = 0
    success: bool = True
    exception: Optional[Exception] = None
    metadata: Dict = None

class WebSocketTracker:
    """WebSocket请求追踪器"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance
    
    def _init(self):
        self.active_connections = {}
        self.request_queue = queue.Queue()
        self.stats = {
            "total_connections": 0,
            "active_connections": 0,
            "total_messages_sent": 0,
            "total_messages_received": 0,
            "total_bytes_sent": 0,
            "total_bytes_received": 0
        }
        
        # 启动统计线程
        self.stats_thread = threading.Thread(target=self._process_stats, daemon=True)
        self.stats_thread.start()
    
    def _process_stats(self):
        """处理统计信息的线程"""
        while True:
            try:
                request = self.request_queue.get(timeout=1)
                if request:
                    # 触发Locust事件
                    self._fire_locust_event(request)
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"处理统计信息错误: {e}")
    
    def _fire_locust_event(self, ws_request: WebSocketRequest):
        """触发Locust事件，显示在Web界面"""
        response_time = (time.time() - ws_request.start_time) * 1000  # 毫秒
        
        # 触发请求事件
        events.request.fire(
            request_type="WS",
            name=ws_request.name,
            response_time=response_time,
            response_length=ws_request.response_size,
            exception=ws_request.exception,
            **ws_request.metadata if ws_request.metadata else {}
        )
        
        # 更新统计
        if ws_request.success:
            self.stats["total_messages_sent"] += 1
            self.stats["total_bytes_sent"] += ws_request.message_size
            self.stats["total_bytes_received"] += ws_request.response_size
        else:
            events.request_failure.fire(
                request_type="WS",
                name=ws_request.name,
                response_time=response_time,
                exception=str(ws_request.exception) if ws_request.exception else "Unknown"
            )
    
    def record_connection(self, connection_id: str, user_id: str):
        """记录WebSocket连接"""
        self.active_connections[connection_id] = {
            "user_id": user_id,
            "connected_at": time.time(),
            "message_count": 0
        }
        self.stats["total_connections"] += 1
        self.stats["active_connections"] += 1
    
    def record_disconnection(self, connection_id: str):
        """记录WebSocket断开"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            self.stats["active_connections"] -= 1
    
    def record_message(self, ws_request: WebSocketRequest):
        """记录WebSocket消息"""
        self.request_queue.put(ws_request)
        if ws_request.success:
            self.stats["total_messages_received"] += 1

# ============================================================================
# WebSocket客户端包装类
# ============================================================================

class WebSocketClient:
    """WebSocket客户端包装，支持统计"""
    
    def __init__(self, user_instance, uri: str, headers: Dict = None):
        self.user = user_instance
        self.uri = uri
        self.headers = headers or {}
        self.websocket = None
        self.connected = False
        self.connection_id = str(uuid.uuid4())
        self.tracker = WebSocketTracker()
        self.executor = ThreadPoolExecutor(max_workers=1)
        
        # 消息响应回调映射
        self.response_handlers = {}
        self.message_queue = asyncio.Queue()
        self.listener_task = None
        
    async def connect(self):
        """异步连接WebSocket"""
        try:
            # 创建SSL上下文（如果需要）
            ssl_context = None
            if self.uri.startswith('wss://'):
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
            
            # 建立连接
            self.websocket = await websockets.connect(
                self.uri,
                extra_headers=self.headers,
                ssl=ssl_context,
                ping_interval=None,  # 禁用自动ping
                close_timeout=10
            )
            
            self.connected = True
            self.tracker.record_connection(self.connection_id, str(id(self.user)))
            
            # 启动消息监听器
            self.listener_task = asyncio.create_task(self._message_listener())
            
            logger.info(f"WebSocket连接成功: {self.uri}")
            return True
            
        except Exception as e:
            logger.error(f"WebSocket连接失败: {e}")
            self.connected = False
            raise
    
    async def _message_listener(self):
        """监听WebSocket消息"""
        try:
            while self.connected and self.websocket:
                try:
                    message = await self.websocket.recv()
                    await self.message_queue.put(message)
                    
                    # 触发消息接收事件
                    await self._handle_incoming_message(message)
                    
                except websockets.exceptions.ConnectionClosed:
                    logger.info("WebSocket连接已关闭")
                    break
                except Exception as e:
                    logger.error(f"接收消息错误: {e}")
                    break
        except asyncio.CancelledError:
            pass
    
    async def _handle_incoming_message(self, message: str):
        """处理接收到的消息"""
        try:
            # 记录消息统计
            ws_request = WebSocketRequest(
                name="WS_RECEIVE",
                start_time=time.time(),
                coroutine_id=str(asyncio.current_task()),
                user_id=str(id(self.user)),
                response_size=len(message.encode('utf-8') if isinstance(message, str) else len(message)),
                metadata={
                    "direction": "receive",
                    "message_type": type(message).__name__,
                    "connection_id": self.connection_id
                }
            )
            
            self.tracker.record_message(ws_request)
            
            # 尝试解析JSON消息
            try:
                if isinstance(message, str):
                    msg_data = json.loads(message)
                    message_id = msg_data.get("id", msg_data.get("request_id"))
                    
                    # 如果有对应的响应处理器，触发它
                    if message_id in self.response_handlers:
                        handler = self.response_handlers.pop(message_id)
                        if asyncio.iscoroutinefunction(handler):
                            await handler(message)
                        elif callable(handler):
                            handler(message)
            except json.JSONDecodeError:
                pass  # 非JSON消息
            
        except Exception as e:
            logger.error(f"处理消息错误: {e}")
    
    async def send(self, message, name: str = "WS_SEND", timeout: float = 10):
        """发送消息并等待响应"""
        if not self.connected or not self.websocket:
            raise ConnectionError("WebSocket未连接")
        
        # 准备请求记录
        start_time = time.time()
        message_id = str(uuid.uuid4())
        message_data = None
        
        try:
            # 如果是字典，转换为JSON并添加ID
            if isinstance(message, dict):
                message["id"] = message_id
                message_str = json.dumps(message)
                message_data = message
            elif isinstance(message, str):
                # 尝试解析并添加ID
                try:
                    message_data = json.loads(message)
                    message_data["id"] = message_id
                    message_str = json.dumps(message_data)
                except json.JSONDecodeError:
                    message_str = message
            else:
                message_str = str(message)
            
            # 发送消息
            await self.websocket.send(message_str)
            
            # 记录发送事件
            ws_request = WebSocketRequest(
                name=name,
                start_time=start_time,
                coroutine_id=str(asyncio.current_task()),
                user_id=str(id(self.user)),
                message_size=len(message_str.encode('utf-8')),
                metadata={
                    "direction": "send",
                    "message_type": type(message).__name__,
                    "message_id": message_id,
                    "connection_id": self.connection_id
                }
            )
            
            # 如果有期望的响应模式
            if isinstance(message_data, dict) and "expect_response" in message_data:
                response_future = asyncio.Future()
                self.response_handlers[message_id] = lambda msg: response_future.set_result(msg)
                
                try:
                    # 等待响应
                    response = await asyncio.wait_for(response_future, timeout=timeout)
                    
                    # 完成请求记录
                    ws_request.response_size = len(response.encode('utf-8') if isinstance(response, str) else len(response))
                    ws_request.success = True
                    
                except asyncio.TimeoutError:
                    ws_request.exception = TimeoutError(f"等待响应超时: {timeout}s")
                    ws_request.success = False
                    raise ws_request.exception
            
            # 提交统计
            self.tracker.record_message(ws_request)
            
        except Exception as e:
            # 记录失败的请求
            ws_request.exception = e
            ws_request.success = False
            self.tracker.record_message(ws_request)
            raise
    
    async def close(self):
        """关闭WebSocket连接"""
        self.connected = False
        
        if self.listener_task:
            self.listener_task.cancel()
            try:
                await self.listener_task
            except asyncio.CancelledError:
                pass
        
        if self.websocket:
            await self.websocket.close()
        
        self.tracker.record_disconnection(self.connection_id)
        logger.info(f"WebSocket连接关闭: {self.connection_id}")

# ============================================================================
# Locust User类：支持WebSocket
# ============================================================================

class WebSocketUser(User):
    """WebSocket压测用户类"""
    
    # WebSocket服务器地址
    ws_host = "ws://localhost:8080/ws"
    
    # 等待时间
    wait_time = between(1, 3)
    
    # 自定义WebSocket统计
    websocket_stats = {
        "connections": 0,
        "messages_sent": 0,
        "messages_received": 0,
        "avg_message_size": 0
    }
    
    def __init__(self, environment):
        super().__init__(environment)
        self.ws_client = None
        self.loop = None
        self.user_id = f"user_{id(self)}"
        
        # 如果是worker节点，确保有事件循环
        if isinstance(environment.runner, WorkerRunner):
            self._ensure_event_loop()
    
    def _ensure_event_loop(self):
        """确保有事件循环"""
        try:
            self.loop = asyncio.get_event_loop()
        except RuntimeError:
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
    
    def on_start(self):
        """用户启动时连接WebSocket"""
        try:
            self._ensure_event_loop()
            
            # 同步方式运行异步连接
            if self.loop and self.loop.is_running():
                # 如果事件循环已经在运行，使用create_task
                asyncio.create_task(self._async_on_start())
            else:
                # 否则使用run_until_complete
                self.loop.run_until_complete(self._async_on_start())
                
        except Exception as e:
            logger.error(f"用户启动失败: {e}")
    
    async def _async_on_start(self):
        """异步的用户启动逻辑"""
        try:
            self.ws_client = WebSocketClient(
                self,
                uri=self.ws_host,
                headers={
                    "User-Agent": f"Locust-WebSocket-{self.user_id}",
                    "X-User-ID": self.user_id
                }
            )
            
            await self.ws_client.connect()
            logger.info(f"用户 {self.user_id} WebSocket连接成功")
            
        except Exception as e:
            logger.error(f"WebSocket连接失败: {e}")
            raise
    
    def on_stop(self):
        """用户停止时关闭WebSocket"""
        try:
            if self.ws_client and self.loop:
                if self.loop.is_running():
                    # 如果事件循环在运行，使用create_task
                    asyncio.create_task(self.ws_client.close())
                else:
                    # 否则同步关闭
                    self.loop.run_until_complete(self.ws_client.close())
        except Exception as e:
            logger.error(f"关闭WebSocket失败: {e}")
    
    @task
    def send_chat_message(self):
        """发送聊天消息"""
        if not self.ws_client or not self.ws_client.connected:
            logger.warning("WebSocket未连接，跳过消息发送")
            return
        
        try:
            # 同步方式运行异步发送
            message = {
                "type": "chat_message",
                "user": self.user_id,
                "text": f"Hello from {self.user_id} at {time.time()}",
                "timestamp": time.time(),
                "expect_response": True
            }
            
            if self.loop.is_running():
                # 如果事件循环在运行，使用run_coroutine_threadsafe
                future = asyncio.run_coroutine_threadsafe(
                    self.ws_client.send(message, name="chat_message"),
                    self.loop
                )
                future.result(timeout=15)
            else:
                # 否则同步执行
                self.loop.run_until_complete(
                    self.ws_client.send(message, name="chat_message")
                )
                
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
            events.request_failure.fire(
                request_type="WS",
                name="chat_message",
                response_time=0,
                exception=str(e)
            )
    
    @task(3)
    def send_heartbeat(self):
        """发送心跳"""
        if not self.ws_client or not self.ws_client.connected:
            return
        
        try:
            heartbeat = {
                "type": "heartbeat",
                "user": self.user_id,
                "timestamp": time.time()
            }
            
            if self.loop.is_running():
                future = asyncio.run_coroutine_threadsafe(
                    self.ws_client.send(heartbeat, name="heartbeat"),
                    self.loop
                )
                future.result(timeout=5)
            else:
                self.loop.run_until_complete(
                    self.ws_client.send(heartbeat, name="heartbeat")
                )
                
        except Exception as e:
            logger.debug(f"心跳发送失败（可能正常）: {e}")
    
    @task(2)
    def send_batch_messages(self):
        """批量发送消息"""
        if not self.ws_client or not self.ws_client.connected:
            return
        
        try:
            # 发送5条快速消息
            for i in range(5):
                batch_msg = {
                    "type": "batch",
                    "user": self.user_id,
                    "index": i,
                    "data": {"value": i * 100}
                }
                
                if self.loop.is_running():
                    future = asyncio.run_coroutine_threadsafe(
                        self.ws_client.send(batch_msg, name=f"batch_{i}"),
                        self.loop
                    )
                    future.result(timeout=2)
                else:
                    self.loop.run_until_complete(
                        self.ws_client.send(batch_msg, name=f"batch_{i}")
                    )
                    
                time.sleep(0.1)  # 小延迟
                
        except Exception as e:
            logger.error(f"批量发送失败: {e}")

# ============================================================================
# 自定义Web界面扩展
# ============================================================================

# 自定义统计页面
from locust.web import ui
from flask import Blueprint, render_template_string, jsonify
import threading

# 创建蓝图
websocket_bp = Blueprint('websocket', __name__)

# WebSocket统计HTML模板
WEBSOCKET_STATS_HTML = '''
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Statistics</title>
    <style>
        .websocket-stats {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .stat-card {
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 15px;
            border-radius: 4px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
        }
        .stat-label {
            font-size: 14px;
            color: #6c757d;
            margin-top: 5px;
        }
        .connection-list {
            max-height: 300px;
            overflow-y: auto;
            margin-top: 20px;
        }
        .connection-item {
            padding: 10px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
        }
        .connection-item:hover {
            background: #f8f9fa;
        }
    </style>
</head>
<body>
    <div class="websocket-stats">
        <h2>🔌 WebSocket Statistics</h2>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="total-connections">0</div>
                <div class="stat-label">Total Connections</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="active-connections">0</div>
                <div class="stat-label">Active Connections</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="messages-sent">0</div>
                <div class="stat-label">Messages Sent</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="messages-received">0</div>
                <div class="stat-label">Messages Received</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="bytes-sent">0</div>
                <div class="stat-label">Bytes Sent</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="bytes-received">0</div>
                <div class="stat-label">Bytes Received</div>
            </div>
        </div>
        
        <h3 style="margin-top: 30px;">Active Connections</h3>
        <div class="connection-list" id="connection-list">
            <!-- Connections will be populated here -->
        </div>
    </div>
    
    <script>
        function updateWebSocketStats() {
            fetch('/websocket/stats')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('total-connections').textContent = data.total_connections;
                    document.getElementById('active-connections').textContent = data.active_connections;
                    document.getElementById('messages-sent').textContent = data.messages_sent;
                    document.getElementById('messages-received').textContent = data.messages_received;
                    
                    // Format bytes
                    document.getElementById('bytes-sent').textContent = formatBytes(data.bytes_sent);
                    document.getElementById('bytes-received').textContent = formatBytes(data.bytes_received);
                    
                    // Update connection list
                    const connectionList = document.getElementById('connection-list');
                    connectionList.innerHTML = '';
                    
                    data.connections.forEach(conn => {
                        const div = document.createElement('div');
                        div.className = 'connection-item';
                        div.innerHTML = `
                            <span>${conn.user_id}</span>
                            <span>${formatDuration(conn.duration)}</span>
                        `;
                        connectionList.appendChild(div);
                    });
                })
                .catch(error => console.error('Error fetching WebSocket stats:', error));
        }
        
        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        function formatDuration(seconds) {
            if (seconds < 60) return seconds.toFixed(0) + 's';
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return minutes + 'm ' + remainingSeconds.toFixed(0) + 's';
        }
        
        // Update every 2 seconds
        setInterval(updateWebSocketStats, 2000);
        
        // Initial load
        updateWebSocketStats();
    </script>
</body>
</html>
'''

@websocket_bp.route('/stats')
def websocket_stats():
    """返回WebSocket统计数据的API端点"""
    tracker = WebSocketTracker()
    
    # 获取活跃连接信息
    connections = []
    for conn_id, conn_info in tracker.active_connections.items():
        connections.append({
            "connection_id": conn_id,
            "user_id": conn_info["user_id"],
            "duration": time.time() - conn_info["connected_at"],
            "message_count": conn_info["message_count"]
        })
    
    return jsonify({
        "total_connections": tracker.stats["total_connections"],
        "active_connections": tracker.stats["active_connections"],
        "messages_sent": tracker.stats["total_messages_sent"],
        "messages_received": tracker.stats["total_messages_received"],
        "bytes_sent": tracker.stats["total_bytes_sent"],
        "bytes_received": tracker.stats["total_bytes_received"],
        "connections": connections
    })

@websocket_bp.route('/')
def websocket_dashboard():
    """WebSocket统计页面"""
    return render_template_string(WEBSOCKET_STATS_HTML)

# ============================================================================
# 事件监听器：集成到Locust Web界面
# ============================================================================

@events.init.add_listener
def on_locust_init(environment, **kwargs):
    """Locust初始化时注册WebSocket统计页面"""
    # 只在Master节点注册Web界面
    if isinstance(environment.runner, MasterRunner):
        # 注册蓝图
        environment.web_ui.app.register_blueprint(
            websocket_bp,
            url_prefix='/websocket'
        )
        
        # 在导航栏添加WebSocket统计链接
        @environment.web_ui.app.context_processor
        def inject_navbar():
            return dict(
                extra_nav_entries=[
                    ('/websocket', '🔌 WebSocket', 'websocket_stats')
                ]
            )
        
        logger.info("WebSocket统计页面已注册")

# ============================================================================
# 负载形状定义
# ============================================================================

class WebSocketLoadShape(LoadTestShape):
    """WebSocket专用负载形状"""
    
    stages = [
        {"duration": 60, "users": 10, "spawn_rate": 2, "name": "缓慢启动"},
        {"duration": 120, "users": 50, "spawn_rate": 5, "name": "逐渐增加"},
        {"duration": 180, "users": 200, "spawn_rate": 10, "name": "高峰负载"},
        {"duration": 120, "users": 100, "spawn_rate": 10, "name": "维持负载"},
        {"duration": 60, "users": 20, "spawn_rate": 5, "name": "逐渐减少"},
    ]
    
    def tick(self):
        run_time = self.get_run_time()
        
        elapsed = 0
        for stage in self.stages:
            if run_time < elapsed + stage["duration"]:
                logger.info(f"WebSocket负载阶段: {stage['name']} - {stage['users']}用户")
                return (stage["users"], stage["spawn_rate"])
            elapsed += stage["duration"]
        
        return None

# ============================================================================
# 示例WebSocket服务器（用于测试）
# ============================================================================

async def example_websocket_server(websocket, path):
    """简单的WebSocket服务器示例"""
    try:
        async for message in websocket:
            # 解析消息
            try:
                data = json.loads(message)
                message_type = data.get("type", "unknown")
                
                # 根据消息类型处理
                if message_type == "chat_message":
                    # 回复确认
                    response = {
                        "type": "chat_response",
                        "original_message": data,
                        "server_timestamp": time.time(),
                        "status": "received"
                    }
                    await websocket.send(json.dumps(response))
                    
                elif message_type == "heartbeat":
                    # 心跳响应
                    response = {
                        "type": "heartbeat_ack",
                        "received_at": time.time(),
                        "status": "alive"
                    }
                    await websocket.send(json.dumps(response))
                    
                elif message_type == "batch":
                    # 批量消息响应
                    response = {
                        "type": "batch_response",
                        "index": data.get("index"),
                        "processed": True,
                        "timestamp": time.time()
                    }
                    await websocket.send(json.dumps(response))
                    
                else:
                    # 默认响应
                    await websocket.send(json.dumps({
                        "type": "echo",
                        "original": data,
                        "timestamp": time.time()
                    }))
                    
            except json.JSONDecodeError:
                # 非JSON消息，原样返回
                await websocket.send(f"Echo: {message}")
                
    except websockets.exceptions.ConnectionClosed:
        pass

def start_example_server():
    """启动示例WebSocket服务器"""
    import asyncio
    
    async def start():
        server = await websockets.serve(
            example_websocket_server,
            "localhost",
            8080
        )
        print("示例WebSocket服务器启动在 ws://localhost:8080")
        await server.wait_closed()
    
    # 在新线程中启动服务器
    server_thread = threading.Thread(
        target=lambda: asyncio.run(start()),
        daemon=True
    )
    server_thread.start()
    
    return server_thread

# ============================================================================
# 主程序入口
# ============================================================================

if __name__ == "__main__":
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='WebSocket压测工具')
    parser.add_argument('--host', default='ws://localhost:8080/ws', 
                       help='WebSocket服务器地址')
    parser.add_argument('--start-server', action='store_true',
                       help='启动示例WebSocket服务器')
    parser.add_argument('--users', type=int, default=10,
                       help='用户数（不使用负载形状时）')
    parser.add_argument('--spawn-rate', type=float, default=1,
                       help='孵化率（不使用负载形状时）')
    parser.add_argument('--run-time', default='1m',
                       help='运行时间（不使用负载形状时）')
    
    args = parser.parse_args()
    
    # 更新WebSocket地址
    WebSocketUser.ws_host = args.host
    
    if args.start_server:
        print("启动示例WebSocket服务器...")
        start_example_server()
        time.sleep(1)  # 等待服务器启动
    
    # 如果直接运行，启动单用户调试模式
    from locust import run_single_user
    
    print(f"启动WebSocket压测，目标: {args.host}")
    print("按Ctrl+C停止测试")
    
    try:
        # 修改用户启动逻辑，避免异步问题
        user_instance = WebSocketUser(environment=None)
        user_instance.ws_host = args.host
        
        # 简化运行
        asyncio.run(user_instance._async_on_start())
        
        # 发送一些测试消息
        for i in range(5):
            asyncio.run(user_instance.send_chat_message())
            time.sleep(1)
        
        # 关闭连接
        asyncio.run(user_instance.on_stop())
        
    except KeyboardInterrupt:
        print("\n测试停止")
    except Exception as e:
        print(f"测试错误: {e}")
```

## **2. 运行和配置**

### **2.1 安装依赖**
```bash
pip install locust websockets flask
```

### **2.2 运行命令**

#### **基本运行**
```bash
# 1. 启动Locust Web界面
locust -f websocket_locust.py --host=ws://your-server:8080

# 2. 访问Web界面
# 打开浏览器访问 http://localhost:8089
# 在Web界面中设置用户数、孵化率
# 点击 "Start swarming" 开始测试

# 3. 查看WebSocket统计
# 在导航栏点击 "🔌 WebSocket" 进入统计页面
```

#### **Headless模式（无Web界面）**
```bash
locust -f websocket_locust.py \
  --host=ws://your-server:8080 \
  --headless \
  -u 100 \
  -r 10 \
  --run-time 5m \
  --html=websocket_report.html
```

#### **分布式模式**
```bash
# Master节点
locust -f websocket_locust.py \
  --host=ws://your-server:8080 \
  --master

# Worker节点（启动多个）
locust -f websocket_locust.py \
  --worker \
  --master-host=127.0.0.1
```

#### **使用负载形状**
```bash
# LoadTestShape会自动控制负载
locust -f websocket_locust.py \
  --host=ws://your-server:8080 \
  --headless
```

### **2.3 启动示例服务器并测试**
```bash
# 启动示例服务器和测试
python websocket_locust.py --start-server --host=ws://localhost:8080

# 在另一个终端运行Locust
locust -f websocket_locust.py --host=ws://localhost:8080
```

## **3. Web界面展示效果**

### **3.1 原生Locust统计**
在标准Locust Web界面中，你会看到：
- **Requests标签页**：显示所有WebSocket消息的统计
  - 请求类型标记为 "WS"
  - 包含响应时间、失败率、RPS等
- **Charts标签页**：响应时间和RPS图表
- **Failures标签页**：失败的WebSocket请求详情

### **3.2 自定义WebSocket统计页面**
访问 `http://localhost:8089/websocket`，可以看到：
1. **实时连接统计**：
   - 总连接数
   - 活跃连接数
   - 消息发送/接收数量
   - 字节发送/接收量

2. **活跃连接列表**：
   - 每个连接的用户ID
   - 连接持续时间
   - 消息数量

## **4. 配置WebSocket服务器**

### **4.1 支持WSS（SSL/TLS）**
```python
class SecureWebSocketUser(WebSocketUser):
    ws_host = "wss://your-secure-server:443/ws"
    
    # 自定义SSL上下文
    def create_ssl_context(self):
        import ssl
        context = ssl.create_default_context()
        
        # 自定义证书验证
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE  # 测试环境可禁用验证
        
        return context
```

### **4.2 认证支持**
```python
class AuthenticatedWebSocketUser(WebSocketUser):
    
    def on_start(self):
        # 首先获取认证token
        token = self.get_auth_token()
        
        # 使用token连接WebSocket
        self.ws_client = WebSocketClient(
            self,
            uri=self.ws_host,
            headers={
                "Authorization": f"Bearer {token}",
                "X-API-Key": "your-api-key"
            }
        )
        
        asyncio.run(self.ws_client.connect())
    
    def get_auth_token(self):
        # 调用认证API获取token
        import requests
        response = requests.post(
            "https://api.example.com/auth",
            json={"username": "test", "password": "test"}
        )
        return response.json()["token"]
```

## **5. 高级功能扩展**

### **5.1 消息模式生成器**
```python
class MessagePatternGenerator:
    """WebSocket消息模式生成器"""
    
    patterns = {
        "chat": {
            "type": "chat",
            "user": "{user_id}",
            "message": "{random_text}",
            "timestamp": "{timestamp}"
        },
        "notification": {
            "type": "notification",
            "title": "Test Notification",
            "body": "This is a test message",
            "priority": "{random_int:1-3}"
        },
        "data_update": {
            "type": "data_update",
            "data": {
                "id": "{uuid}",
                "value": "{random_int:1-1000}",
                "timestamp": "{timestamp}"
            }
        }
    }
    
    @classmethod
    def generate_message(cls, pattern_name, **kwargs):
        import random
        import string
        
        pattern = cls.patterns.get(pattern_name, cls.patterns["chat"])
        message = pattern.copy()
        
        # 替换模板变量
        import json
        msg_str = json.dumps(message)
        
        replacements = {
            "{user_id}": kwargs.get("user_id", "anonymous"),
            "{timestamp}": time.time(),
            "{uuid}": str(uuid.uuid4()),
            "{random_text}": ''.join(random.choices(string.ascii_letters, k=20)),
            "{random_int:1-1000}": str(random.randint(1, 1000))
        }
        
        for key, value in replacements.items():
            msg_str = msg_str.replace(key, str(value))
        
        return json.loads(msg_str)

# 在任务中使用
@task
def send_pattern_message(self):
    pattern = random.choice(["chat", "notification", "data_update"])
    message = MessagePatternGenerator.generate_message(
        pattern,
        user_id=self.user_id
    )
    
    asyncio.run(self.ws_client.send(
        message,
        name=f"pattern_{pattern}"
    ))
```

### **5.2 连接池管理**
```python
class WebSocketConnectionPool:
    """WebSocket连接池"""
    
    def __init__(self, max_connections=100):
        self.pool = []
        self.max_connections = max_connections
        self.lock = threading.Lock()
    
    def get_connection(self, uri, headers=None):
        with self.lock:
            # 寻找空闲连接
            for conn in self.pool:
                if not conn["in_use"] and conn["uri"] == uri:
                    conn["in_use"] = True
                    return conn["client"]
            
            # 创建新连接
            if len(self.pool) < self.max_connections:
                client = WebSocketClient(uri, headers)
                self.pool.append({
                    "uri": uri,
                    "client": client,
                    "in_use": True,
                    "created_at": time.time()
                })
                return client
        
        return None
    
    def release_connection(self, client):
        with self.lock:
            for conn in self.pool:
                if conn["client"] == client:
                    conn["in_use"] = False
                    break
```

## **6. 监控和告警集成**

### **6.1 Prometheus指标导出**
```python
from prometheus_client import Counter, Gauge, Histogram, start_http_server

# 定义Prometheus指标
ws_connections = Gauge('websocket_connections', 'Active WebSocket connections')
ws_messages_sent = Counter('websocket_messages_sent', 'Total messages sent')
ws_messages_received = Counter('websocket_messages_received', 'Total messages received')
ws_message_duration = Histogram('websocket_message_duration', 'Message response duration')

class PrometheusWebSocketTracker(WebSocketTracker):
    """支持Prometheus的WebSocket追踪器"""
    
    def _fire_locust_event(self, ws_request):
        super()._fire_locust_event(ws_request)
        
        # 更新Prometheus指标
        ws_connections.set(len(self.active_connections))
        
        if ws_request.success:
            ws_messages_sent.inc()
            response_time = (time.time() - ws_request.start_time) * 1000
            ws_message_duration.observe(response_time)

# 启动Prometheus HTTP服务器
start_http_server(8000)
```

## **7. 最佳实践**

1. **连接管理**：
   - 合理设置连接超时
   - 实现连接重试逻辑
   - 监控连接状态

2. **消息处理**：
   - 实现消息确认机制
   - 处理消息顺序和一致性
   - 支持大消息分片

3. **性能优化**：
   - 使用连接池复用连接
   - 批量发送消息减少开销
   - 异步处理接收的消息

4. **监控告警**：
   - 监控连接成功率
   - 监控消息延迟
   - 设置异常告警阈值

这个完整的WebSocket压测方案可以：
1. ✅ 在Locust Web界面展示统计信息
2. ✅ 支持自定义WebSocket统计页面
3. ✅ 集成到Locust事件系统
4. ✅ 支持分布式压测
5. ✅ 提供详细的性能指标
6. ✅ 支持各种WebSocket使用场景