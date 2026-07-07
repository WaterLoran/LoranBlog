# FastAPI使用websocket的示例

下面是一个完整的 **FastAPI + WebSocket** 示例，实现了一个简单的聊天室。服务端维护所有在线连接，收到的消息会广播给所有客户端。

### 完整代码

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List
import json

app = FastAPI(title="WebSocket 聊天室示例")

# 存储所有活跃的 WebSocket 连接
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """接受新连接，并加入列表"""
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        """断开连接时从列表中移除"""
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str, sender: WebSocket = None):
        """向所有连接的客户端广播消息，可选择排除发送者"""
        for connection in self.active_connections:
            if connection != sender:
                await connection.send_text(message)

# 创建管理器实例
manager = ConnectionManager()

# ---------- WebSocket 端点 ----------
@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    # 1. 接受连接
    await manager.connect(websocket)
    # 可选：给客户端发送欢迎消息
    await websocket.send_text(json.dumps({"type": "system", "message": "欢迎加入聊天室！"}))

    try:
        # 2. 持续接收客户端消息
        while True:
            # 接收文本消息（也可以接收 bytes）
            data = await websocket.receive_text()
            # 简单处理：假设客户端发送的 JSON 格式 {"username": "张三", "content": "hello"}
            try:
                msg_obj = json.loads(data)
                username = msg_obj.get("username", "匿名")
                content = msg_obj.get("content", "")
                # 构造广播消息
                broadcast_msg = json.dumps({
                    "type": "chat",
                    "username": username,
                    "content": content
                })
            except json.JSONDecodeError:
                # 如果客户端发送的不是 JSON，原样广播
                broadcast_msg = json.dumps({
                    "type": "chat",
                    "username": "系统",
                    "content": data
                })
            # 广播给所有其他客户端（排除自己）
            await manager.broadcast(broadcast_msg, sender=websocket)
    except WebSocketDisconnect:
        # 3. 客户端主动断开连接时触发
        manager.disconnect(websocket)
        # 通知其他用户
        await manager.broadcast(json.dumps({"type": "system", "message": "有人离开了聊天室"}))

# ---------- 可选：一个简单的 HTML 前端页面 ----------
from fastapi.responses import HTMLResponse

@app.get("/")
async def get():
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>FastAPI WebSocket 聊天室</title>
    </head>
    <body>
        <h1>聊天室</h1>
        <div>
            <label>用户名: <input type="text" id="username" value="用户" /></label>
            <button onclick="connect()">连接</button>
            <button onclick="disconnect()">断开</button>
        </div>
        <div id="messages" style="border:1px solid #ccc; height:300px; overflow:auto; margin-top:10px;"></div>
        <div>
            <input type="text" id="messageText" placeholder="输入消息..." />
            <button onclick="sendMessage()">发送</button>
        </div>
        <script>
            let ws = null;
            function connect() {
                if (ws) {
                    alert("已经连接了");
                    return;
                }
                ws = new WebSocket("ws://localhost:8000/ws/chat");
                ws.onopen = function() {
                    addMessage("系统", "已连接服务器");
                };
                ws.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    if (data.type === "chat") {
                        addMessage(data.username, data.content);
                    } else if (data.type === "system") {
                        addMessage("系统", data.message);
                    }
                };
                ws.onclose = function() {
                    addMessage("系统", "连接已关闭");
                    ws = null;
                };
            }
            function disconnect() {
                if (ws) {
                    ws.close();
                    ws = null;
                }
            }
            function sendMessage() {
                if (!ws) {
                    alert("请先连接");
                    return;
                }
                const username = document.getElementById("username").value;
                const content = document.getElementById("messageText").value;
                if (content.trim() === "") return;
                ws.send(JSON.stringify({username: username, content: content}));
                document.getElementById("messageText").value = "";
            }
            function addMessage(sender, text) {
                const messagesDiv = document.getElementById("messages");
                const p = document.createElement("p");
                p.textContent = `${sender}: ${text}`;
                messagesDiv.appendChild(p);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# ---------- 启动命令 ----------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 📖 代码详解

### 1. WebSocket 路由定义

```python
@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
```

- 使用 `@app.websocket` 装饰器，而不是 `@app.get` 或 `@app.post`。
- 路径参数可以是 `{room_id}` 等，用法与 HTTP 路径参数相同。
- 函数参数中的 `websocket: WebSocket` 会被 FastAPI 自动注入。

### 2. 连接管理类 `ConnectionManager`

- **`connect`**：调用 `await websocket.accept()` 接受 WebSocket 握手，然后将连接加入列表。
- **`disconnect`**：从列表中移除已断开的连接。
- **`broadcast`**：遍历所有连接，向每个连接发送消息。可以排除发送者（避免回显）。

> **注意**：生产环境中应使用线程安全的数据结构（如 `set`），这里简单使用 `list` 即可。

### 3. 接收与广播循环

```python
while True:
    data = await websocket.receive_text()
    # 处理消息...
    await manager.broadcast(broadcast_msg, sender=websocket)
```

- `receive_text()` 会一直等待直到收到一条完整的文本消息（WebSocket 帧）。
- 当客户端断开时，`receive_text()` 会抛出 `WebSocketDisconnect` 异常，我们在 `except` 块中处理清理工作。
- 广播时使用了 `sender=websocket` 参数，避免将消息回发给发送者自己。

### 4. 异常处理 `WebSocketDisconnect`

```python
except WebSocketDisconnect:
    manager.disconnect(websocket)
    await manager.broadcast(...)
```

- 当客户端主动关闭连接或网络中断时，该异常被捕获。
- 需要将连接从管理器移除，并通知其他用户。

### 5. 测试用的 HTML 前端

- 访问 `http://localhost:8000/` 即可看到一个简单的聊天室界面。
- 使用浏览器原生的 WebSocket API 与后端通信。
- 发送消息时采用 JSON 格式：`{"username": "...", "content": "..."}`。
- 后端广播的消息也是 JSON 格式，前端解析后显示。

---

## 🚀 如何运行与测试

1. **安装依赖**：
   ```bash
   pip install fastapi uvicorn websockets
   ```

2. **保存代码** 为 `main.py`。

3. **运行**：
   ```bash
   uvicorn main:app --reload
   ```

4. **打开浏览器**：访问 `http://localhost:8000`，打开多个标签页或不同浏览器，即可测试聊天室功能。

---

## 🧠 进阶：依赖注入在 WebSocket 中使用

FastAPI 的 WebSocket 端点同样支持 `Depends`，例如获取当前用户：

```python
from fastapi import Depends, WebSocket
from .auth import get_current_user_ws

@app.websocket("/ws/chat")
async def websocket_chat(
    websocket: WebSocket,
    user: User = Depends(get_current_user_ws)  # 自定义的 WebSocket 认证依赖
):
    await manager.connect(websocket)
    # 使用 user 信息
```

依赖注入函数需要接收 `websocket` 参数（或从 `request` 中提取），例如：

```python
async def get_current_user_ws(websocket: WebSocket):
    # 从查询参数或子协议中获取 token
    token = websocket.query_params.get("token")
    user = verify_token(token)
    if not user:
        await websocket.close(code=1008)  # 策略错误
        raise HTTPException(...)  # 这里实际上不会触发，需要手动关闭
    return user
```

> 注意：WebSocket 依赖注入不能像 HTTP 依赖那样抛出 `HTTPException`，因为 WebSocket 没有 HTTP 响应概念。通常的做法是手动调用 `websocket.close()` 并返回（或抛出 `WebSocketDisconnect`）。

---

## 📌 WebSocket 与普通 HTTP 的区别

| 特性               | HTTP                   | WebSocket                      |
| :----------------- | :--------------------- | :----------------------------- |
| **通信方向**       | 单向（请求-响应）      | 全双工（服务器可主动推送）     |
| **连接生命周期**   | 短连接（每次请求新建） | 长连接（保持到任意一方关闭）   |
| **适用场景**       | REST API、文件上传等   | 实时通信、聊天、游戏、股票行情 |
| **协议**           | HTTP/1.1 或 HTTP/2     | WS (ws://) 或 WSS (加密)       |
| **FastAPI 装饰器** | `@app.get` 等          | `@app.websocket`               |

---

## 🔧 常见 WebSocket 操作

| 操作       | 方法                                             |
| :--------- | :----------------------------------------------- |
| 接受连接   | `await websocket.accept()`                       |
| 接收文本   | `await websocket.receive_text()`                 |
| 接收二进制 | `await websocket.receive_bytes()`                |
| 发送文本   | `await websocket.send_text("...")`               |
| 发送 JSON  | `await websocket.send_json({"key": "value"})`    |
| 关闭连接   | `await websocket.close(code=1000, reason="bye")` |

---

## ⚠️ 注意事项

- **并发安全**：上述示例中 `active_connections` 是一个普通列表，在广播时遍历。如果连接在遍历过程中被 `disconnect` 移除，可能会引发 `RuntimeError`。简单示例中影响不大，生产环境建议使用 `asyncio.lock` 或使用 `set` 并复制一份进行遍历。
- **心跳机制**：为防止空闲连接被网络设备断开，可以定期发送 ping/pong 帧。FastAPI 底层自动处理，但也可以手动发送 `await websocket.send_text("ping")` 并期望客户端回复。
- **扩展性**：多进程部署时，WebSocket 连接无法跨进程广播，需要使用 Redis Pub/Sub 或消息队列。

运行上述代码，你将拥有一个实时聊天的完整示例。可以基于它进一步实现房间、私聊、在线人数统计等功能。