# Locust 的请求录制功能详解

是的，Locust **本身不直接提供内置的请求录制功能**，这是它与 JMeter 等工具的一个显著区别。Locust 的核心哲学是"代码即测试"，强调通过编写 Python 代码来定义用户行为。然而，有多种有效的方法可以实现类似"录制"的效果来快速生成 Locust 测试脚本。

## 主要录制方法介绍

以下是三种主要的"录制"方式，我将详细介绍最推荐的方法一的操作过程：

### 方法一：使用 `locust-plugins` 的 `recorder`（推荐）

这是目前最接近传统"录制"概念的方案，它是一个官方维护的插件。

#### 操作过程

**1. 安装必要的包**
```bash
pip install locust locust-plugins
```

**2. 启动录制工具**
```bash
python -m locust.recorder
```
这会启动一个代理服务器，默认监听在 `http://localhost:8089`（如果冲突，会提示你使用其他端口）。

**3. 配置浏览器代理**
将你的浏览器网络代理设置为：
- **地址**: `localhost`
- **端口**: `8089`（或录制工具提示的端口）

![浏览器代理设置示意图](https://miro.medium.com/v2/resize:fit:1400/1*_S1Yz1G3sWkUQa4p2GzqkA.png)

*不同浏览器的代理设置位置不同，通常在网络设置或高级设置中*

**4. 执行用户操作**
在浏览器中正常操作你的web应用。所有经过代理的HTTP/HTTPS请求都会被捕获。

**5. 生成Locust脚本**
完成操作后，在录制工具运行的终端中按 `Ctrl+C` 停止录制。工具会自动生成一个基本的Locust脚本（通常是 `generated_locustfile.py`）。

**6. 优化生成的脚本**
查看并编辑生成的脚本，通常需要：
- 添加动态参数处理（如session ID、CSRF token）
- 组织任务流程
- 添加断言和验证
- 设置合理的等待时间

#### 示例生成的脚本

```python
from locust import HttpUser, task, between
from locust.contrib.fasthttp import FastHttpUser

class RecordedUser(FastHttpUser):
    wait_time = between(1, 5)
    
    def on_start(self):
        # 录制工具可能会捕获到初始请求
        self.client.get("/")
        self.client.get("/static/css/main.css")
    
    @task
    def recorded_flow(self):
        # 登录请求
        self.client.post("/login", {
            "username": "testuser",
            "password": "password123"
        })
        
        # 浏览商品
        self.client.get("/products")
        self.client.get("/product/123")
        
        # 添加到购物车
        self.client.post("/cart/add", {
            "product_id": 123,
            "quantity": 1
        })
        
        # 结账
        self.client.get("/checkout")
        self.client.post("/checkout/process", {
            "payment_method": "credit_card"
        })
```

### 方法二：使用浏览器开发者工具手动复制

#### 操作过程

**1. 打开浏览器开发者工具**
- Chrome/Firefox: 按 F12 或右键选择"检查"
- 切换到 **Network（网络）** 标签页

**2. 开始录制**
- 确保录制按钮是开启状态（通常是红色）
- 清空现有的网络请求记录

**3. 执行用户操作**
在浏览器中执行你想要录制的业务流程

**4. 导出HTTP请求**
- 右键点击网络请求列表
- 选择 **Copy** → **Copy as cURL**
- 或者使用浏览器扩展（如 "Copy as Python"）

**5. 转换cURL命令为Locust代码**
使用在线工具或手动转换：

```python
# 原始cURL命令
# curl 'https://api.example.com/login' \
#   -H 'Content-Type: application/json' \
#   --data-raw '{"username":"test","password":"secret"}' \
#   --compressed

# 转换后的Locust代码
self.client.post("/login", 
    json={"username": "test", "password": "secret"},
    headers={"Content-Type": "application/json"})
```

### 方法三：使用专业的API测试工具中转

#### 操作过程（以Postman为例）

**1. 在Postman中录制/创建请求**
- 使用Postman的代理录制功能
- 或手动创建请求集合

**2. 导出Postman集合**
- 选择集合 → 导出
- 选择格式为 **Collection v2.1**

**3. 使用转换工具**
使用 `postman-to-locust` 等工具进行转换：

```bash
# 安装转换工具
pip install postman-to-locust

# 转换Postman集合
postman2locust postman_collection.json locustfile.py
```

**4. 优化生成的脚本**
```python
# 转换后的脚本可能需要进一步优化
from locust import HttpUser, task, between

class PostmanUser(HttpUser):
    wait_time = between(1, 5)
    
    @task
    def my_flow(self):
        # 自动生成的请求可能需要进行参数化
        self.client.get("/api/users")
        self.client.post("/api/login", json={
            "username": "test", 
            "password": "password"
        })
```

## 处理常见录制挑战

### 1. 动态参数处理

录制的脚本通常包含硬编码的值，需要替换为动态参数：

```python
from locust import HttpUser, task, between
import re

class DynamicParamUser(HttpUser):
    wait_time = between(1, 3)
    
    def extract_csrf_token(self, response):
        # 从响应中提取CSRF token
        return re.search('name="csrf" value="(.+?)"', response.text).group(1)
    
    def extract_product_id(self, response):
        # 从商品列表提取商品ID
        return re.search('/product/(\\d+)"', response.text).group(1)
    
    @task
    def dynamic_flow(self):
        # 获取首页并提取CSRF token
        response = self.client.get("/")
        csrf_token = self.extract_csrf_token(response)
        
        # 使用动态token登录
        self.client.post("/login", {
            "username": "test",
            "password": "pass",
            "csrf": csrf_token
        })
        
        # 浏览商品并提取商品ID
        response = self.client.get("/products")
        product_id = self.extract_product_id(response)
        
        # 使用动态商品ID
        self.client.get(f"/product/{product_id}")
```

### 2. 处理认证和会话

```python
from locust import HttpUser, task, between

class AuthenticatedUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """每个用户开始时执行登录"""
        response = self.client.post("/login", {
            "username": "test_user",
            "password": "test_pass"
        })
        
        # 保存认证token供后续请求使用
        self.auth_token = response.json().get("token")
    
    @task
    def authenticated_request(self):
        # 在请求头中使用认证token
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        self.client.get("/api/protected", headers=headers)
```

### 3. 创建更真实的用户流

```python
from locust import HttpUser, task, between
import random
import time

class RealisticUser(HttpUser):
    wait_time = between(2, 8)  # 更真实的思考时间
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.products = []  # 用户购物车
    
    @task(3)
    def browse_products(self):
        """浏览商品 - 发生频率更高"""
        categories = ["electronics", "books", "clothing"]
        category = random.choice(categories)
        
        # 模拟用户浏览行为
        self.client.get(f"/products?category={category}")
        time.sleep(random.uniform(1, 3))  # 浏览时间
        
        # 查看几个商品详情
        for _ in range(random.randint(1, 3)):
            product_id = random.randint(1, 100)
            self.client.get(f"/product/{product_id}")
            time.sleep(random.uniform(0.5, 2))
    
    @task(1)
    def purchase_flow(self):
        """购买流程 - 发生频率较低"""
        # 添加到购物车
        product_id = random.randint(1, 100)
        self.client.post("/cart/add", {
            "product_id": product_id,
            "quantity": random.randint(1, 3)
        })
        
        # 有时会继续购物，有时会结账
        if random.random() < 0.7:  # 70%的概率结账
            self.client.get("/checkout")
            self.client.post("/checkout/process", {
                "payment_method": random.choice(["credit_card", "paypal"])
            })
```

## 最佳实践和建议

1. **录制只是起点**：录制的脚本通常需要大量手动优化才能成为有效的性能测试脚本。

2. **处理动态数据**：识别并参数化所有动态值（session ID、token、时间戳等）。

3. **添加断言**：录制工具不会添加验证逻辑，需要手动添加响应断言。

4. **组织任务结构**：将录制的请求组织成有意义的任务和方法。

5. **设置合理的等待时间**：根据真实用户行为调整任务之间的等待时间。

6. **考虑数据多样性**：使用参数化数据避免所有用户执行完全相同的操作。

7. **安全注意事项**：不要在脚本中硬编码真实的生产凭证。

8. **版本控制**：将优化后的Locust脚本纳入版本控制系统。

虽然Locust没有一键录制功能，但通过这些方法，你可以高效地将用户操作转换为性能测试脚本，结合Locust代码灵活性的优势，创建出比传统录制工具更强大、更真实的负载测试场景。