# Locust Web 界面只显示部分接口的原因和解决方案

这是一个常见问题，Locust Web 界面默认只显示请求数量最多的几个接口。以下是详细的原因分析和解决方案：

## 🔍 问题原因分析

### 1. **默认显示限制**
Locust 默认在 Web 界面只显示**请求数量最多的前几个接口**（通常是10个左右），这是为了界面简洁和性能考虑。

### 2. **接口命名问题**
- 使用了**动态 URL** 但没有指定 `name` 参数
- 接口名称**没有正确分组**
- 使用了**参数化 URL** 但每个参数都被视为独立接口

### 3. **数据聚合设置**
Locust 会对相似的请求进行聚合，如果聚合规则不合适，可能导致接口显示不全。

## 🛠️ 解决方案

### 方案1：在 Web 界面手动调整显示数量

在 Locust Web 界面的 **Statistics 标签页**：
1. 查找 **"Show rows"** 或类似的输入框
2. 将显示数量从默认值（如10）调整为更大的数字（如50、100）
3. 或者选择 **"All"** 显示所有接口

### 方案2：修改 Locust 配置增加显示限制

**方法1：通过环境变量**
```bash
export LOCUST_STATS_ROW_LIMIT=100
locust -f your_locustfile.py
```

**方法2：通过命令行参数**
```bash
locust -f your_locustfile.py --stats-row-limit 100
```

**方法3：在 locustfile 中配置**
```python
from locust import HttpUser, task, between
import os

# 设置显示行数限制
os.environ['LOCUST_STATS_ROW_LIMIT'] = '100'

class MyUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def api_call(self):
        self.client.get("/api/test")
```

### 方案3：优化接口命名策略（最重要）

**问题代码示例：**
```python
from locust import HttpUser, task, between

class ProblematicUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def various_requests(self):
        # 问题1：动态URL没有使用name参数
        for i in range(10):
            self.client.get(f"/api/users/{i}")  # 每个URL都显示为独立接口
        
        # 问题2：查询参数导致接口分裂
        self.client.get("/api/search?q=test1")
        self.client.get("/api/search?q=test2")
```

**优化后的代码：**
```python
from locust import HttpUser, task, between

class OptimizedUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def get_users(self):
        # 使用固定的name参数聚合所有用户详情请求
        user_ids = [1, 2, 3, 4, 5]
        for user_id in user_ids:
            self.client.get(f"/api/users/{user_id}", name="get_user_detail")
    
    @task(2)
    def search_operations(self):
        # 聚合所有搜索请求
        search_terms = ["test1", "test2", "product", "user"]
        for term in search_terms:
            self.client.get(f"/api/search?q={term}", name="search_api")
    
    @task(1)
    def create_items(self):
        # 分类别命名不同的创建操作
        item_types = ["product", "order", "user", "category"]
        for item_type in item_types:
            self.client.post(
                f"/api/{item_type}", 
                json={"name": f"test_{item_type}"},
                name=f"create_{item_type}"
            )
```

### 方案4：使用分类和层级命名

```python
from locust import HttpUser, task, between
import random

class CategorizedUser(HttpUser):
    wait_time = between(1, 2)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.categories = ["electronics", "books", "clothing"]
        self.statuses = ["pending", "completed", "cancelled"]
    
    @task(4)
    def product_operations(self):
        # 产品相关操作使用统一前缀
        operations = [
            ("GET", "/api/products", "products.list"),
            ("GET", f"/api/products/{random.randint(1,100)}", "products.detail"),
            ("POST", "/api/products", "products.create"),
            ("GET", f"/api/products/category/{random.choice(self.categories)}", "products.by_category")
        ]
        
        for method, url, name in operations:
            if method == "GET":
                self.client.get(url, name=name)
            elif method == "POST":
                self.client.post(url, json={}, name=name)
    
    @task(3)
    def order_operations(self):
        # 订单相关操作
        order_id = random.randint(1, 1000)
        self.client.get(f"/api/orders/{order_id}", name="orders.detail")
        self.client.get(f"/api/orders?status={random.choice(self.statuses)}", name="orders.list")
    
    @task(2)
    def user_operations(self):
        # 用户相关操作
        user_actions = [
            ("/api/users/profile", "users.profile"),
            ("/api/users/settings", "users.settings"),
            ("/api/users/notifications", "users.notifications")
        ]
        
        for url, name in user_actions:
            self.client.get(url, name=name)
    
    @task(1)
    def system_operations(self):
        # 系统操作
        self.client.get("/api/health", name="system.health")
        self.client.get("/api/metrics", name="system.metrics")
```

### 方案5：自定义统计数据处理

```python
from locust import HttpUser, task, between, events
from locust.stats import stats_history, StatsEntry
import re

class CustomStatsUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.setup_custom_stats()
    
    def setup_custom_stats(self):
        """设置自定义统计处理"""
        @events.request.add_listener
        def on_request(name, response_time, response_length, response, **kwargs):
            # 在这里可以自定义统计逻辑
            pass
        
        # 修改统计显示限制
        if hasattr(self.environment, 'parsed_options'):
            self.environment.parsed_options.stats_row_limit = 100
    
    @task
    def api_calls(self):
        # 使用智能命名
        endpoints = [
            ("/api/v1/users", "api.v1.users"),
            ("/api/v2/users", "api.v2.users"),
            ("/api/v1/products", "api.v1.products"),
            ("/api/v2/products", "api.v2.products"),
        ]
        
        for url, name in endpoints:
            self.client.get(url, name=name)

# 启动时设置全局配置
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    # 增加统计行数限制
    if hasattr(environment, 'parsed_options'):
        environment.parsed_options.stats_row_limit = 150
    
    print(f"Statistics row limit set to: {getattr(environment.parsed_options, 'stats_row_limit', 'default')}")
```

### 方案6：使用 CSV 导出查看完整数据

如果 Web 界面仍然限制显示，可以通过 CSV 导出查看所有接口：

```bash
# 运行测试并导出 CSV
locust -f your_locustfile.py --csv=results --headless -u 10 -r 1 -t 5m

# 查看完整的统计 CSV
cat results_stats.csv
```

**分析 CSV 数据的 Python 脚本：**
```python
import pandas as pd
import matplotlib.pyplot as plt

def analyze_locust_csv(csv_file="results_stats.csv"):
    """分析 Locust CSV 统计数据"""
    df = pd.read_csv(csv_file)
    
    print("所有接口统计:")
    print("=" * 50)
    for index, row in df.iterrows():
        print(f"{row['Name']:30} | Requests: {row['Request Count']:6} | "
              f"Avg RT: {row['Average Response Time']:6.1f}ms | "
              f"RPS: {row['Requests/s']:5.1f}")
    
    # 可视化
    plt.figure(figsize=(12, 8))
    
    # 请求数量柱状图
    plt.subplot(2, 1, 1)
    df_sorted = df.sort_values('Request Count', ascending=False)
    plt.bar(df_sorted['Name'], df_sorted['Request Count'])
    plt.title('Requests by Endpoint')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    
    plt.subplot(2, 1, 2)
    plt.bar(df_sorted['Name'], df_sorted['Average Response Time'])
    plt.title('Average Response Time by Endpoint')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    
    plt.show()

# 使用示例
analyze_locust_csv("results_stats.csv")
```

## 🎯 最佳实践总结

### 1. **合理的命名策略**
- 使用**固定的 `name` 参数**聚合相似请求
- 采用**层级命名**（如 `api.v1.users.get`）
- 按**业务功能**而不是 URL 结构命名

### 2. **配置调整**
```bash
# 推荐启动命令
locust -f your_locustfile.py --stats-row-limit 50 --csv=full_results
```

### 3. **代码结构优化**
```python
class BestPracticeUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def grouped_requests(self):
        # 好的做法：使用固定的name
        self.client.get(f"/api/items/{item_id}", name="get_item")
        
        # 不好的做法：让Locust自动命名
        self.client.get(f"/api/items/{item_id}")  # 每个item_id都会单独显示
```

### 4. **监控所有接口**
```python
# 在locustfile中添加全局监控
@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("\n=== 所有接口统计 ===")
    for name, stats in environment.stats.entries.items():
        if stats.num_requests > 0:
            print(f"{name}: {stats.num_requests} requests, "
                  f"avg RT: {stats.avg_response_time:.1f}ms")
```

## 📊 验证解决方案

实施上述方案后，你应该能在 Web 界面看到：

1. **更多的接口行**（通过调整 `--stats-row-limit`）
2. **更有组织的接口分组**（通过优化命名策略）
3. **完整的统计数据**（通过 CSV 导出）

如果问题仍然存在，请检查：
- Locust 版本（建议使用最新版本）
- 是否有接口被错误地命名为空字符串或 None
- 是否所有请求都确实被执行了

通过这些方法，你应该能够完整地看到所有接口的统计数据。