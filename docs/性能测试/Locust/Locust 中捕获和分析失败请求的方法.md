# Locust 中捕获和分析失败请求的方法

在 Locust 负载测试中，有效地捕获和分析失败请求对于识别性能瓶颈和系统问题至关重要。以下是 Locust 中捕获和分析失败请求的全面方法。

## 1. 基本失败请求捕获

### 使用 `catch_response` 参数

这是最常用的方法，允许你手动控制请求的成功/失败状态：

```python
from locust import HttpUser, task, between
import json

class BasicFailureCaptureUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def check_response(self):
        with self.client.get("/api/data", catch_response=True) as response:
            # 检查状态码
            if response.status_code != 200:
                response.failure(f"Status code: {response.status_code}")
                return
            
            # 检查响应内容
            try:
                data = response.json()
                if not data.get("success"):
                    response.failure(f"API returned failure: {data.get('error')}")
                else:
                    response.success()
            except json.JSONDecodeError:
                response.failure("Response is not valid JSON")
```

### 自动失败检测

Locust 会自动将以下情况标记为失败：
- HTTP 状态码 ≥ 400
- 连接错误、超时等网络异常

```python
from locust import HttpUser, task, between

class AutoFailureUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def auto_failure_detection(self):
        # Locust 会自动将非2xx状态码标记为失败
        self.client.get("/api/data")
        
        # 连接错误、超时等也会自动标记为失败
        self.client.get("/api/might-fail", timeout=0.5)  # 短超时更容易触发失败
```

## 2. 高级失败分析和记录

### 自定义失败记录器

```python
from locust import HttpUser, task, between, events
import csv
import datetime
import os

# 创建失败请求记录文件
failure_log_file = "failure_analysis.csv"
if not os.path.exists(failure_log_file):
    with open(failure_log_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "timestamp", "request_type", "name", "response_time", 
            "status_code", "exception", "response_length", "url"
        ])

# 失败请求事件监听器
@events.request_failure.add_listener
def log_failure(request_type, name, response_time, exception, response_length, **kwargs):
    timestamp = datetime.datetime.now().isoformat()
    status_code = getattr(exception, "response", None)
    if status_code:
        status_code = status_code.status_code if hasattr(status_code, 'status_code') else str(status_code)
    else:
        status_code = "N/A"
    
    url = kwargs.get('context', {}).get('url', 'N/A')
    
    with open(failure_log_file, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            timestamp, request_type, name, response_time,
            status_code, str(exception), response_length, url
        ])

class AdvancedFailureAnalysisUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def api_call_with_context(self):
        # 添加上下文信息，便于失败分析
        context = {"url": "/api/data", "user_id": "test123"}
        with self.client.get("/api/data", catch_response=True, context=context) as response:
            if response.status_code != 200:
                response.failure(f"Status code: {response.status_code}")
```

### 分类失败类型

```python
from locust import HttpUser, task, between, events
from collections import defaultdict

# 失败分类统计
failure_categories = defaultdict(int)

@events.request_failure.add_listener
def categorize_failures(request_type, name, response_time, exception, **kwargs):
    exception_str = str(exception).lower()
    
    if "timeout" in exception_str:
        failure_categories["timeout"] += 1
    elif "connection" in exception_str:
        failure_categories["connection_error"] += 1
    elif "404" in exception_str or "not found" in exception_str:
        failure_categories["not_found"] += 1
    elif "50" in exception_str:  # 500, 502, 503等
        failure_categories["server_error"] += 1
    elif "40" in exception_str:  # 400, 401, 403等
        failure_categories["client_error"] += 1
    else:
        failure_categories["other"] += 1

@events.test_stop.add_listener
def print_failure_summary(environment, **kwargs):
    print("\n=== 失败请求分类统计 ===")
    for category, count in failure_categories.items():
        print(f"{category}: {count}")
    print("=======================")

class CategorizedFailureUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def make_request(self):
        self.client.get("/api/data")
```

## 3. 实时失败监控和警报

### 实时失败率监控

```python
from locust import HttpUser, task, between, events
import time
from threading import Thread

class FailureMonitor:
    def __init__(self, threshold=0.1):  # 10%失败率阈值
        self.threshold = threshold
        self.total_requests = 0
        self.failed_requests = 0
        self.last_check = time.time()
        self.check_interval = 10  # 每10秒检查一次
        
    def start_monitoring(self):
        Thread(target=self._monitor_loop, daemon=True).start()
    
    def _monitor_loop(self):
        while True:
            time.sleep(self.check_interval)
            self._check_failure_rate()
    
    def _check_failure_rate(self):
        if self.total_requests == 0:
            return
            
        failure_rate = self.failed_requests / self.total_requests
        if failure_rate > self.threshold:
            print(f"警告: 失败率过高! 当前失败率: {failure_rate:.2%}")
            # 这里可以添加邮件、Slack等警报逻辑
    
    def add_request(self, failed=False):
        self.total_requests += 1
        if failed:
            self.failed_requests += 1

# 创建全局监控器
failure_monitor = FailureMonitor(threshold=0.05)  # 5%失败率阈值

@events.request.add_listener
def track_request(request_type, name, response_time, response_length, **kwargs):
    failure_monitor.add_request(failed=False)

@events.request_failure.add_listener
def track_failure(request_type, name, response_time, exception, **kwargs):
    failure_monitor.add_request(failed=True)

@events.test_start.add_listener
def start_monitoring(environment, **kwargs):
    failure_monitor.start_monitoring()

class MonitoredUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def make_request(self):
        self.client.get("/api/data")
```

## 4. 失败请求详细分析

### 保存失败请求的详细信息

```python
from locust import HttpUser, task, between, events
import json
import os
from datetime import datetime

# 创建目录保存失败请求详情
failure_dir = "failure_details"
os.makedirs(failure_dir, exist_ok=True)

@events.request_failure.add_listener
def save_failure_details(request_type, name, response_time, exception, response_length, **kwargs):
    # 生成唯一文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{failure_dir}/failure_{timestamp}.json"
    
    # 收集失败详情
    failure_details = {
        "timestamp": datetime.now().isoformat(),
        "request_type": request_type,
        "name": name,
        "response_time": response_time,
        "exception": str(exception),
        "response_length": response_length,
        "context": kwargs.get("context", {})
    }
    
    # 尝试获取更多异常详情
    if hasattr(exception, 'response'):
        response = exception.response
        failure_details.update({
            "status_code": getattr(response, 'status_code', None),
            "response_headers": dict(response.headers) if hasattr(response, 'headers') else {},
            "response_text": response.text[:1000] if hasattr(response, 'text') else None  # 限制文本长度
        })
    
    # 保存到文件
    with open(filename, 'w') as f:
        json.dump(failure_details, f, indent=2)

class DetailedFailureUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def make_detailed_request(self):
        context = {
            "test_data": "sample",
            "expected_result": "success",
            "timestamp": datetime.now().isoformat()
        }
        with self.client.get("/api/data", catch_response=True, context=context) as response:
            if response.status_code != 200:
                response.failure(f"Unexpected status: {response.status_code}")
```

## 5. 失败模式分析和报告

### 生成失败分析报告

```python
from locust import HttpUser, task, between, events
import pandas as pd
from datetime import datetime
import matplotlib.pyplot as plt

class FailureAnalyzer:
    def __init__(self):
        self.failures = []
    
    def add_failure(self, failure_data):
        self.failures.append(failure_data)
    
    def generate_report(self):
        if not self.failures:
            print("没有失败请求需要分析")
            return
            
        # 创建DataFrame进行分析
        df = pd.DataFrame(self.failures)
        
        # 1. 失败请求随时间分布
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df.set_index('timestamp', inplace=True)
        failures_by_minute = df.resample('1min').size()
        
        plt.figure(figsize=(10, 6))
        failures_by_minute.plot(title='失败请求随时间分布')
        plt.savefig('failure_timeline.png')
        plt.close()
        
        # 2. 按类型分类
        failure_types = df['exception_type'].value_counts()
        plt.figure(figsize=(10, 6))
        failure_types.plot(kind='pie', autopct='%1.1f%%', title='失败类型分布')
        plt.savefig('failure_types.png')
        plt.close()
        
        # 3. 按端点分类
        failure_endpoints = df['name'].value_counts().head(10)
        plt.figure(figsize=(10, 6))
        failure_endpoints.plot(kind='bar', title='失败最多的端点')
        plt.savefig('failure_endpoints.png')
        plt.close()
        
        # 生成详细报告
        report = f"""
        === 失败请求分析报告 ===
        生成时间: {datetime.now().isoformat()}
        总失败请求数: {len(df)}
        
        失败类型统计:
        {failure_types.to_string()}
        
        失败最多的端点:
        {failure_endpoints.to_string()}
        
        失败时间分布:
        {failures_by_minute.to_string()}
        """
        
        with open('failure_analysis_report.txt', 'w') as f:
            f.write(report)
        
        print(report)

# 创建全局分析器
failure_analyzer = FailureAnalyzer()

@events.request_failure.add_listener
def analyze_failure(request_type, name, response_time, exception, **kwargs):
    exception_str = str(exception)
    exception_type = "unknown"
    
    if "Timeout" in exception_str:
        exception_type = "timeout"
    elif "Connection" in exception_str:
        exception_type = "connection_error"
    elif "404" in exception_str:
        exception_type = "not_found"
    elif "50" in exception_str:
        exception_type = "server_error"
    elif "40" in exception_str:
        exception_type = "client_error"
    
    failure_data = {
        "timestamp": datetime.now().isoformat(),
        "request_type": request_type,
        "name": name,
        "response_time": response_time,
        "exception": exception_str,
        "exception_type": exception_type
    }
    
    failure_analyzer.add_failure(failure_data)

@events.test_stop.add_listener
def generate_final_report(environment, **kwargs):
    failure_analyzer.generate_report()

class AnalyzedUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def make_request(self):
        self.client.get("/api/data")
```

## 6. 集成外部监控系统

### 将失败数据发送到外部监控系统

```python
from locust import HttpUser, task, between, events
import requests
import json

class ExternalMonitor:
    def __init__(self, api_url, api_key):
        self.api_url = api_url
        self.api_key = api_key
        self.batch = []
        self.batch_size = 10
    
    def send_failure(self, failure_data):
        self.batch.append(failure_data)
        
        if len(self.batch) >= self.batch_size:
            self._send_batch()
    
    def _send_batch(self):
        if not self.batch:
            return
            
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                f"{self.api_url}/failures/batch",
                headers=headers,
                data=json.dumps({"failures": self.batch}),
                timeout=5
            )
            
            if response.status_code == 200:
                self.batch = []  # 清空批次
            else:
                print(f"发送失败数据到监控系统失败: {response.status_code}")
                
        except Exception as e:
            print(f"发送失败数据时出错: {str(e)}")
    
    def flush(self):
        """强制发送所有剩余数据"""
        if self.batch:
            self._send_batch()

# 创建外部监控器（在实际使用中替换为真实的URL和API密钥）
external_monitor = ExternalMonitor(
    api_url="https://your-monitoring-system.com/api",
    api_key="your-api-key-here"
)

@events.request_failure.add_listener
def send_to_external_monitor(request_type, name, response_time, exception, **kwargs):
    failure_data = {
        "timestamp": datetime.now().isoformat(),
        "request_type": request_type,
        "endpoint": name,
        "response_time_ms": response_time,
        "error": str(exception),
        "test_env": "load-test"  # 可以添加环境标识
    }
    
    external_monitor.send_failure(failure_data)

@events.test_stop.add_listener
def flush_external_monitor(environment, **kwargs):
    external_monitor.flush()

class ExternallyMonitoredUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://your-app.com"
    
    @task
    def make_request(self):
        self.client.get("/api/data")
```

## 最佳实践和建议

1. **分层记录**：根据重要性分层记录失败信息，避免记录过多数据影响性能。

2. **采样记录**：对于高并发测试，考虑对失败请求进行采样记录，而不是记录每一个失败。

3. **异步处理**：将失败记录和分析操作异步化，避免阻塞主测试流程。

4. **资源清理**：确保在测试结束时正确关闭文件句柄和网络连接。

5. **隐私和安全**：注意不要记录敏感信息，如密码、令牌等。

6. **性能监控**：监控失败记录和分析过程本身的性能，确保不会成为瓶颈。

7. **自动化分析**：将失败分析集成到CI/CD流程中，实现自动化性能回归检测。

通过这些方法，你可以在Locust测试中有效地捕获、记录和分析失败请求，从而更好地理解系统在负载下的行为，识别性能瓶颈和潜在问题。