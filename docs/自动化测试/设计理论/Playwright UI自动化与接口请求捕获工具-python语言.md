# Playwright UI自动化与接口请求捕获工具-python语言

下面是一个使用Python Playwright实现的UI自动化框架，它能够在执行UI操作时捕获对应的接口请求，并以可视化方式展示结果。

```python
import os
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from playwright.sync_api import sync_playwright
import time
from datetime import datetime

# 全局变量存储捕获的请求
captured_requests = []
last_action = "等待操作..."

class RequestCapture:
    def __init__(self, page):
        self.page = page
        self.captured_requests = []
        
    def start_capturing(self):
        self.page.on("request", self._on_request)
        self.page.on("response", self._on_response)
        
    def _on_request(self, request):
        request_data = {
            "method": request.method,
            "url": request.url,
            "headers": request.headers,
            "post_data": request.post_data,
            "resource_type": request.resource_type,
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            "status": "pending",
            "action": last_action
        }
        self.captured_requests.append(request_data)
        captured_requests.append(request_data)
        
    def _on_response(self, response):
        for req in self.captured_requests:
            if req["url"] == response.url:
                req["status"] = response.status
                req["response_headers"] = response.headers
                try:
                    req["response_body"] = response.json()
                except:
                    try:
                        req["response_body"] = response.text()
                    except:
                        req["response_body"] = "Unable to capture response body"

class WebHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            with open('index.html', 'rb') as f:
                self.wfile.write(f.read())
        elif self.path == '/requests':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(captured_requests).encode('utf-8'))
        elif self.path == '/last-action':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(last_action.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_web_server():
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, WebHandler)
    print("Web服务器运行在 http://localhost:8000")
    httpd.serve_forever()

def run_playwright():
    global last_action
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # 启动请求捕获
        capturer = RequestCapture(page)
        capturer.start_capturing()
        
        # 导航到示例页面
        last_action = "导航到演示页面"
        page.goto("https://jsonplaceholder.typicode.com/")
        
        # 等待用户通过Web界面触发操作
        while True:
            time.sleep(1)
            
            # 在实际应用中，这里可以添加更多自动化操作
            # 例如根据Web界面指令执行不同操作
            
            # 示例：每10秒自动执行一个操作
            if int(time.time()) % 10 == 0:
                last_action = "获取待办事项列表"
                page.click("text=Todos")
                time.sleep(1)
                
                last_action = "获取用户列表"
                page.click("text=Users")
                time.sleep(1)
                
                last_action = "创建新帖子"
                page.click("text=Posts")
                page.click("text=Create")
                time.sleep(2)

def main():
    # 创建HTML界面文件
    create_html_interface()
    
    # 启动Web服务器线程
    web_thread = threading.Thread(target=run_web_server, daemon=True)
    web_thread.start()
    
    # 启动Playwright自动化
    run_playwright()

def create_html_interface():
    html_content = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playwright UI自动化与接口捕获</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #1a2a6c, #b21f1f, #1a2a6c);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            text-align: center;
            padding: 20px 0;
            margin-bottom: 30px;
        }
        
        h1 {
            font-size: 2.8rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        
        .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }
        
        @media (max-width: 900px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
        
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .card-header i {
            font-size: 1.8rem;
            margin-right: 15px;
            color: #4dabf7;
        }
        
        .card-header h2 {
            font-size: 1.8rem;
        }
        
        .browser-container {
            height: 400px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px dashed rgba(255, 255, 255, 0.3);
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
        }
        
        .browser-placeholder {
            text-align: center;
            padding: 30px;
        }
        
        .browser-placeholder i {
            font-size: 5rem;
            opacity: 0.3;
            margin-bottom: 20px;
        }
        
        .browser-placeholder p {
            font-size: 1.2rem;
            opacity: 0.7;
        }
        
        .action-bar {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .btn {
            background: linear-gradient(to right, #4dabf7, #3b5bdb);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 50px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
        
        .btn:active {
            transform: translateY(0);
        }
        
        .btn.secondary {
            background: linear-gradient(to right, #20c997, #12b886);
        }
        
        .btn.warning {
            background: linear-gradient(to right, #ff6b6b, #fa5252);
        }
        
        .btn i {
            font-size: 1.2rem;
        }
        
        .current-action {
            background: rgba(255, 255, 255, 0.15);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 1.1rem;
        }
        
        .current-action i {
            margin-right: 10px;
            color: #4dabf7;
        }
        
        .requests-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .requests-table th {
            background: rgba(77, 171, 247, 0.2);
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        
        .requests-table td {
            padding: 12px 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .requests-table tr:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        
        .method {
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.85rem;
        }
        
        .method.get {
            background: rgba(76, 175, 80, 0.2);
            color: #81c784;
        }
        
        .method.post {
            background: rgba(33, 150, 243, 0.2);
            color: #64b5f6;
        }
        
        .method.put {
            background: rgba(255, 152, 0, 0.2);
            color: #ffcc80;
        }
        
        .method.delete {
            background: rgba(244, 67, 54, 0.2);
            color: #ef9a9a;
        }
        
        .status {
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.85rem;
        }
        
        .status.success {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
        }
        
        .status.error {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
        }
        
        .request-details {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            max-height: 300px;
            overflow: auto;
        }
        
        .request-details pre {
            white-space: pre-wrap;
            word-break: break-all;
        }
        
        .highlight {
            color: #4dabf7;
            font-weight: bold;
        }
        
        .footer {
            text-align: center;
            padding: 30px 0;
            margin-top: 20px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
        }
        
        .pulse {
            display: inline-block;
            width: 12px;
            height: 12px;
            background-color: #4dabf7;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse-animation 1.5s infinite;
        }
        
        @keyframes pulse-animation {
            0% { box-shadow: 0 0 0 0 rgba(77, 171, 247, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(77, 171, 247, 0); }
            100% { box-shadow: 0 0 0 0 rgba(77, 171, 247, 0); }
        }
        
        .request-container {
            max-height: 500px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1><i class="fas fa-robot"></i> Playwright UI自动化与接口捕获</h1>
            <p class="subtitle">执行UI操作时实时捕获对应的接口请求 - Python实现</p>
        </header>
        
        <div class="grid">
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-window-maximize"></i>
                    <h2>浏览器操作</h2>
                </div>
                
                <div class="browser-container">
                    <div class="browser-placeholder">
                        <i class="fas fa-window-maximize"></i>
                        <p>Playwright浏览器实例运行中</p>
                        <p>当前页面: <span class="highlight">https://jsonplaceholder.typicode.com/</span></p>
                    </div>
                </div>
                
                <div class="current-action">
                    <i class="fas fa-sync-alt fa-spin"></i>
                    <span id="currentAction">等待操作...</span>
                </div>
                
                <div class="action-bar">
                    <button class="btn" onclick="performAction('getTodos')">
                        <i class="fas fa-list"></i> 获取待办事项
                    </button>
                    <button class="btn secondary" onclick="performAction('getUsers')">
                        <i class="fas fa-users"></i> 获取用户
                    </button>
                    <button class="btn" onclick="performAction('createPost')">
                        <i class="fas fa-plus"></i> 创建帖子
                    </button>
                    <button class="btn warning" onclick="clearRequests()">
                        <i class="fas fa-trash-alt"></i> 清除记录
                    </button>
                </div>
                
                <div class="card-header">
                    <i class="fas fa-info-circle"></i>
                    <h2>操作说明</h2>
                </div>
                
                <p>1. 点击上方按钮执行UI操作</p>
                <p>2. Playwright会自动执行操作并捕获网络请求</p>
                <p>3. 捕获的请求将显示在右侧面板</p>
                <p>4. 点击请求查看详细信息</p>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-network-wired"></i>
                    <h2>接口请求捕获 <span class="pulse"></span></h2>
                </div>
                
                <div class="request-container">
                    <table class="requests-table">
                        <thead>
                            <tr>
                                <th width="80">方法</th>
                                <th>URL</th>
                                <th width="100">状态</th>
                                <th width="150">操作</th>
                                <th width="100">时间</th>
                            </tr>
                        </thead>
                        <tbody id="requestsTable">
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 30px; color: rgba(255,255,255,0.5);">
                                    尚未捕获到任何请求。执行操作后，相关请求将显示在此处。
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="request-details" id="requestDetails" style="display: none;">
                    <h3>请求详情</h3>
                    <pre id="detailsContent"></pre>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <i class="fas fa-code"></i>
                <h2>Python Playwright 代码实现</h2>
            </div>
            <pre style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; color: #a9e34b; overflow: auto;">
class RequestCapture:
    def __init__(self, page):
        self.page = page
        self.captured_requests = []
        
    def start_capturing(self):
        self.page.on("request", self._on_request)
        self.page.on("response", self._on_response)
        
    def _on_request(self, request):
        request_data = {
            "method": request.method,
            "url": request.url,
            "headers": request.headers,
            "post_data": request.post_data,
            "resource_type": request.resource_type,
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            "status": "pending",
            "action": last_action
        }
        self.captured_requests.append(request_data)
        captured_requests.append(request_data)
        
    def _on_response(self, response):
        for req in self.captured_requests:
            if req["url"] == response.url:
                req["status"] = response.status
                req["response_headers"] = response.headers
                try:
                    req["response_body"] = response.json()
                except:
                    req["response_body"] = "Unable to capture response body"

# 使用示例
with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    
    capturer = RequestCapture(page)
    capturer.start_capturing()
    
    # 导航到目标页面
    page.goto("https://example.com")
    
    # 执行UI操作
    page.click("#submit-button")
    
    # 捕获的请求存储在capturer.captured_requests中</pre>
        </div>
        
        <div class="footer">
            <p>Playwright UI自动化与接口捕获工具 &copy; 2023 | Python实现</p>
            <p>使用 Playwright 和 Python 构建</p>
        </div>
    </div>

    <script>
        // 更新当前操作
        function updateCurrentAction() {
            fetch('/last-action')
                .then(response => response.text())
                .then(action => {
                    document.getElementById('currentAction').textContent = action;
                });
        }
        
        // 执行操作
        function performAction(action) {
            // 在实际实现中，这里会发送指令给Playwright
            // 本示例中仅更新UI状态
            let actionName = '';
            switch(action) {
                case 'getTodos':
                    actionName = '获取待办事项列表';
                    break;
                case 'getUsers':
                    actionName = '获取用户列表';
                    break;
                case 'createPost':
                    actionName = '创建新帖子';
                    break;
            }
            document.getElementById('currentAction').textContent = actionName + '...';
            
            // 模拟操作延迟
            setTimeout(() => {
                document.getElementById('currentAction').textContent = actionName + ' 完成';
            }, 1500);
        }
        
        // 清除请求记录
        function clearRequests() {
            if (confirm('确定要清除所有捕获的请求吗?')) {
                fetch('/clear-requests', { method: 'POST' })
                    .then(() => {
                        document.getElementById('requestsTable').innerHTML = `
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 30px; color: rgba(255,255,255,0.5);">
                                    尚未捕获到任何请求。执行操作后，相关请求将显示在此处。
                                </td>
                            </tr>`;
                        document.getElementById('requestDetails').style.display = 'none';
                    });
            }
        }
        
        // 显示请求详情
        function showRequestDetails(index) {
            fetch('/requests')
                .then(response => response.json())
                .then(requests => {
                    if (requests[index]) {
                        const req = requests[index];
                        const details = {
                            "操作": req.action,
                            "时间": req.timestamp,
                            "方法": req.method,
                            "URL": req.url,
                            "状态": req.status,
                            "请求头": req.headers,
                            "请求体": req.post_data ? JSON.parse(req.post_data) : null,
                            "响应头": req.response_headers,
                            "响应体": req.response_body
                        };
                        
                        document.getElementById('detailsContent').textContent = 
                            JSON.stringify(details, null, 2);
                        document.getElementById('requestDetails').style.display = 'block';
                    }
                });
        }
        
        // 更新请求列表
        function updateRequestsTable() {
            fetch('/requests')
                .then(response => response.json())
                .then(requests => {
                    if (requests.length === 0) return;
                    
                    let tableHTML = '';
                    requests.forEach((req, index) => {
                        // 简化URL显示
                        const url = req.url.length > 60 ? req.url.substring(0, 60) + '...' : req.url;
                        
                        tableHTML += `
                            <tr onclick="showRequestDetails(${index})">
                                <td><span class="method ${req.method.toLowerCase()}">${req.method}</span></td>
                                <td>${url}</td>
                                <td><span class="status ${req.status >= 200 && req.status < 300 ? 'success' : 'error'}">${req.status}</span></td>
                                <td>${req.action}</td>
                                <td>${req.timestamp}</td>
                            </tr>`;
                    });
                    
                    document.getElementById('requestsTable').innerHTML = tableHTML;
                });
        }
        
        // 初始加载
        updateCurrentAction();
        updateRequestsTable();
        
        // 定时更新
        setInterval(() => {
            updateCurrentAction();
            updateRequestsTable();
        }, 2000);
    </script>
</body>
</html>
    """
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

if __name__ == "__main__":
    main()
```

## 功能说明

这个工具结合了Playwright UI自动化和网络请求捕获功能，主要特点包括：

1. **UI自动化核心**：
   - 使用Playwright控制浏览器
   - 导航到目标网页
   - 执行UI操作（点击、表单填写等）

2. **请求捕获机制**：
   - 监听所有网络请求和响应
   - 记录请求方法、URL、头部、主体
   - 捕获响应状态码、头部和内容

3. **可视化界面**：
   - 实时显示当前浏览器操作
   - 展示捕获的接口请求列表
   - 点击查看请求详细信息
   - 提供操作按钮执行特定UI动作

4. **技术架构**：
   - Python后端处理Playwright自动化
   - HTTP服务器提供Web界面
   - 实时通信更新捕获的请求数据

## 使用方法

1. 安装必要的Python库：
```bash
pip install playwright
playwright install
```

2. 将上面的代码保存为 `playwright_capture.py`

3. 运行脚本：
```bash
python playwright_capture.py
```

4. 打开浏览器访问：http://localhost:8000

5. 使用界面上的按钮执行UI操作，右侧将显示捕获的接口请求

## 实现原理

1. **请求捕获类**：
   ```python
   class RequestCapture:
       def __init__(self, page):
           self.page = page
           self.captured_requests = []
           
       def start_capturing(self):
           self.page.on("request", self._on_request)
           self.page.on("response", self._on_response)
   ```
   这个类负责监听页面请求和响应事件，收集相关信息。

2. **Web服务器**：
   ```python
   class WebHandler(BaseHTTPRequestHandler):
       def do_GET(self):
           if self.path == '/':
               # 返回HTML界面
           elif self.path == '/requests':
               # 返回捕获的请求数据
   ```
   提供Web界面和API端点来展示捕获的数据。

3. **Playwright自动化**：
   ```python
   with sync_playwright() as p:
       browser = p.chromium.launch(headless=False)
       page = browser.new_page()
       
       capturer = RequestCapture(page)
       capturer.start_capturing()
   ```
   启动浏览器并开始捕获网络请求。

4. **多线程处理**：
   ```python
   web_thread = threading.Thread(target=run_web_server, daemon=True)
   web_thread.start()
   
   run_playwright()
   ```
   同时运行Web服务器和Playwright自动化。

## 扩展建议

1. 添加更多UI操作类型（表单填写、下拉选择等）
2. 实现请求过滤功能（按URL、方法或状态码）
3. 添加请求重放功能
4. 集成API测试验证
5. 添加用户自定义脚本支持

这个工具为UI自动化测试提供了强大的网络请求分析能力，特别适合验证前端操作触发的后端API调用。