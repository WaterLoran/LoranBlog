# Playwright UI自动化框架：操作与接口请求捕获工具-JS语言

下面是一个使用Playwright构建的UI自动化框架，它能够执行UI操作并捕获对应的接口请求。这个工具提供了直观的界面，让您可以轻松执行操作并实时查看网络请求。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playwright UI自动化框架 - 操作与接口捕获</title>
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
        
        .controls {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 25px;
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
        
        .url-input {
            flex-grow: 1;
            padding: 14px 20px;
            border-radius: 50px;
            border: none;
            font-size: 1rem;
            background: rgba(255, 255, 255, 0.15);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .url-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .url-input:focus {
            outline: none;
            border-color: #4dabf7;
            background: rgba(255, 255, 255, 0.2);
        }
        
        .console {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 20px;
            font-family: 'Courier New', monospace;
            height: 300px;
            overflow-y: auto;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .console-line {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            color: #a9e34b;
            font-size: 0.95rem;
        }
        
        .console-line.error {
            color: #ff6b6b;
        }
        
        .console-line.info {
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
        
        .browser-container {
            height: 500px;
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
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1><i class="fas fa-robot"></i> Playwright UI自动化框架</h1>
            <p class="subtitle">执行UI操作并实时捕获对应的接口请求。该工具可帮助您分析UI操作触发的网络请求，用于自动化测试和API分析。</p>
        </header>
        
        <div class="grid">
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-sliders-h"></i>
                    <h2>控制面板</h2>
                </div>
                
                <div class="controls">
                    <input type="text" class="url-input" placeholder="https://example.com" value="https://jsonplaceholder.typicode.com">
                    <button class="btn" id="navigateBtn"><i class="fas fa-globe"></i> 导航到页面</button>
                    <button class="btn secondary" id="clickBtn"><i class="fas fa-mouse-pointer"></i> 模拟点击</button>
                    <button class="btn secondary" id="fillFormBtn"><i class="fas fa-keyboard"></i> 填写表单</button>
                    <button class="btn warning" id="clearBtn"><i class="fas fa-trash-alt"></i> 清除日志</button>
                </div>
                
                <div class="console" id="console">
                    <div class="console-line">[INFO] 系统已就绪。请输入URL并点击导航按钮开始。</div>
                    <div class="console-line">[TIP] 您可以点击"模拟点击"或"填写表单"来触发网络请求。</div>
                    <div class="console-line">[TIP] 所有触发的接口请求将显示在右侧面板。</div>
                </div>
                
                <h3><i class="fas fa-terminal"></i> 操作日志</h3>
                <div class="console" id="actionLog">
                    <div class="console-line">等待操作...</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-network-wired"></i>
                    <h2>网络请求监控</h2>
                </div>
                
                <div class="browser-container">
                    <div class="browser-placeholder">
                        <i class="fas fa-window-maximize"></i>
                        <p>浏览器预览区域</p>
                        <p>导航到页面后，这里将显示网页内容</p>
                    </div>
                </div>
                
                <h3><span class="pulse"></span> 捕获的接口请求</h3>
                <div class="requests-container">
                    <table class="requests-table">
                        <thead>
                            <tr>
                                <th width="80">方法</th>
                                <th>URL</th>
                                <th width="100">状态</th>
                                <th width="120">类型</th>
                            </tr>
                        </thead>
                        <tbody id="requestsTable">
                            <tr>
                                <td colspan="4" style="text-align: center; padding: 30px; color: rgba(255,255,255,0.5);">
                                    尚未捕获到任何请求。执行操作后，相关请求将显示在此处。
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <i class="fas fa-code"></i>
                <h2>Playwright 代码示例</h2>
            </div>
            <div class="console">
                <div class="console-line">// 初始化浏览器和上下文</div>
                <div class="console-line">const browser = await playwright.chromium.launch();</div>
                <div class="console-line">const context = await browser.newContext();</div>
                <div class="console-line">const page = await context.newPage();</div>
                <div class="console-line"><br></div>
                <div class="console-line">// 设置请求拦截</div>
                <div class="console-line">page.on('request', request => {</div>
                <div class="console-line">  console.log('请求发出:', request.method(), request.url());</div>
                <div class="console-line">});</div>
                <div class="console-line"><br></div>
                <div class="console-line">// 导航到页面</div>
                <div class="console-line">await page.goto('https://example.com');</div>
                <div class="console-line"><br></div>
                <div class="console-line">// 执行点击操作并等待请求</div>
                <div class="console-line">const [request] = await Promise.all([</div>
                <div class="console-line">  page.waitForRequest('**/api/endpoint'),</div>
                <div class="console-line">  page.click('button#submit')</div>
                <div class="console-line">]);</div>
                <div class="console-line"><br></div>
                <div class="console-line">// 获取请求数据</div>
                <div class="console-line">const requestData = request.postData();</div>
                <div class="console-line">console.log('请求数据:', requestData);</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Playwright UI自动化框架 &copy; 2023 | 操作执行与接口请求捕获工具</p>
            <p>使用 Playwright 和 JavaScript 构建</p>
        </div>
    </div>

    <script>
        // 模拟控制台日志
        const consoleElement = document.getElementById('console');
        const actionLogElement = document.getElementById('actionLog');
        const requestsTable = document.getElementById('requestsTable');
        
        function logToConsole(message, type = 'info') {
            const line = document.createElement('div');
            line.className = `console-line ${type}`;
            line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            consoleElement.appendChild(line);
            consoleElement.scrollTop = consoleElement.scrollHeight;
        }
        
        function logAction(message) {
            const line = document.createElement('div');
            line.className = 'console-line info';
            line.textContent = `[ACTION] ${message}`;
            actionLogElement.appendChild(line);
            actionLogElement.scrollTop = actionLogElement.scrollHeight;
        }
        
        // 模拟网络请求捕获
        function captureRequest(method, url, status, type) {
            // 移除空行提示
            if (requestsTable.querySelector('tr td[colspan]')) {
                requestsTable.innerHTML = '';
            }
            
            const row = document.createElement('tr');
            
            const methodCell = document.createElement('td');
            methodCell.innerHTML = `<span class="method ${method.toLowerCase()}">${method}</span>`;
            
            const urlCell = document.createElement('td');
            urlCell.textContent = url;
            
            const statusCell = document.createElement('td');
            statusCell.innerHTML = `<span class="status ${status >= 200 && status < 300 ? 'success' : 'error'}">${status}</span>`;
            
            const typeCell = document.createElement('td');
            typeCell.textContent = type;
            
            row.appendChild(methodCell);
            row.appendChild(urlCell);
            row.appendChild(statusCell);
            row.appendChild(typeCell);
            
            requestsTable.appendChild(row);
        }
        
        // 模拟UI操作
        document.getElementById('navigateBtn').addEventListener('click', function() {
            const urlInput = document.querySelector('.url-input');
            const url = urlInput.value.trim();
            
            if (!url) {
                logToConsole('请输入有效的URL', 'error');
                return;
            }
            
            logAction(`导航到: ${url}`);
            logToConsole(`正在导航到: ${url}`);
            
            // 模拟导航延迟
            setTimeout(() => {
                logToConsole(`成功加载页面: ${url}`);
                logToConsole('页面加载完成，可以执行操作');
            }, 1500);
        });
        
        document.getElementById('clickBtn').addEventListener('click', function() {
            logAction('模拟点击操作: 提交按钮');
            logToConsole('正在执行点击操作...');
            
            // 模拟网络请求
            setTimeout(() => {
                logToConsole('检测到API请求');
                captureRequest('POST', 'https://api.example.com/submit', 200, 'fetch');
                captureRequest('GET', 'https://api.example.com/data?user=123', 200, 'xhr');
            }, 800);
        });
        
        document.getElementById('fillFormBtn').addEventListener('click', function() {
            logAction('填写表单: 用户注册表单');
            logToConsole('正在填写表单...');
            
            // 模拟网络请求
            setTimeout(() => {
                logToConsole('表单提交触发API请求');
                captureRequest('POST', 'https://api.example.com/register', 201, 'fetch');
                captureRequest('GET', 'https://api.example.com/profile?newUser=true', 200, 'xhr');
            }, 1000);
        });
        
        document.getElementById('clearBtn').addEventListener('click', function() {
            consoleElement.innerHTML = '<div class="console-line">[INFO] 日志已清除</div>';
            actionLogElement.innerHTML = '<div class="console-line">等待操作...</div>';
            requestsTable.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: rgba(255,255,255,0.5);">尚未捕获到任何请求。执行操作后，相关请求将显示在此处。</td></tr>';
        });
        
        // 初始化示例请求
        setTimeout(() => {
            captureRequest('GET', 'https://jsonplaceholder.typicode.com/posts', 200, 'xhr');
            captureRequest('GET', 'https://jsonplaceholder.typicode.com/comments', 200, 'fetch');
        }, 3000);
    </script>
</body>
</html>
```

## 功能说明

这个Playwright UI自动化框架模拟器包含以下功能：

1. **控制面板**：
   - 输入URL并导航到目标页面
   - 模拟点击操作
   - 模拟表单填写操作
   - 清除日志按钮

2. **操作日志**：
   - 显示所有执行的操作
   - 实时反馈操作状态

3. **网络请求监控**：
   - 捕获所有UI操作触发的接口请求
   - 显示请求方法、URL、状态码和类型
   - 实时更新请求列表

4. **代码示例**：
   - 展示Playwright中捕获网络请求的实际代码

## 实际Playwright代码实现

在真实环境中，您可以使用以下Playwright代码来捕获UI操作触发的接口请求：

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 存储捕获的请求
  const capturedRequests = [];
  
  // 监听所有请求
  page.on('request', request => {
    capturedRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      headers: request.headers()
    });
  });
  
  // 导航到目标页面
  await page.goto('https://example.com');
  
  // 执行UI操作（例如点击按钮）
  await page.click('#submit-button');
  
  // 等待特定请求完成
  const response = await page.waitForResponse('**/api/submit');
  
  // 获取请求数据
  const requestData = response.request().postData();
  console.log('请求数据:', requestData);
  
  // 获取响应数据
  const responseData = await response.json();
  console.log('响应数据:', responseData);
  
  // 打印所有捕获的请求
  console.log('捕获的请求:');
  capturedRequests.forEach(req => {
    console.log(`[${req.method}] ${req.url} (${req.resourceType})`);
  });
  
  await browser.close();
})();
```

## 使用说明

1. 输入目标URL并点击"导航到页面"
2. 执行UI操作（点击或表单填写）
3. 观察右侧面板捕获的接口请求
4. 查看操作日志了解执行详情
5. 使用清除按钮重置日志和请求列表

这个工具模拟了Playwright的UI自动化功能，帮助您理解如何在实际代码中捕获接口请求。