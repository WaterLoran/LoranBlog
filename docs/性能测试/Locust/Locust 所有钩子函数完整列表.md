# Locust 所有钩子函数完整列表

以下是 Locust 中所有可用的事件钩子函数，按功能分类：

## 1. 测试生命周期事件

### 测试开始和结束
```python
from locust import events

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """整个测试开始时触发"""
    print("测试开始")

@events.test_stop.add_listener  
def on_test_stop(environment, **kwargs):
    """整个测试结束时触发"""
    print("测试结束")
```

### 微测试阶段（企业版）
```python
@events.micro_test_start.add_listener
def on_micro_test_start(environment, **kwargs):
    """微测试阶段开始"""

@events.micro_test_stop.add_listener
def on_micro_test_stop(environment, **kwargs):
    """微测试阶段结束"""
```

## 2. 请求相关事件

### 请求事件
```python
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, exception, context, **kwargs):
    """每个HTTP请求完成后触发"""
    print(f"请求: {name}, 响应时间: {response_time}ms")

@events.request_success.add_listener
def on_request_success(request_type, name, response_time, response_length, **kwargs):
    """请求成功时触发"""

@events.request_failure.add_listener  
def on_request_failure(request_type, name, response_time, response_length, exception, **kwargs):
    """请求失败时触发"""
```

## 3. 用户生命周期事件

### 用户生成和退出
```python
@events.user_spawning_complete.add_listener
def on_user_spawning_complete(user_count, **kwargs):
    """所有用户生成完成时触发"""
    print(f"所有 {user_count} 个用户已生成")

@events.user_spawning_start.add_listener
def on_user_spawning_start(user_count, **kwargs):
    """开始生成用户时触发"""

@events.spawning_complete.add_listener
def on_spawning_complete(**kwargs):
    """用户生成完成（已废弃，使用 user_spawning_complete）"""

@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    """Locust 退出时触发"""

@events.quit.add_listener  
def on_quit(exit_code, **kwargs):
    """Locust 退出时触发（收到退出信号）"""
```

## 4. 分布式测试事件

### Worker 节点事件
```python
@events.worker_report.add_listener
def on_worker_report(client_id, data, **kwargs):
    """Worker 节点向 Master 报告统计数据时触发"""
    print(f"Worker {client_id} 报告数据")

@events.worker_connect.add_listener
def on_worker_connect(client_id, **kwargs):
    """Worker 节点连接到 Master 时触发"""

@events.worker_disconnect.add_listener
def on_worker_disconnect(client_id, **kwargs):
    """Worker 节点从 Master 断开连接时触发"""
```

## 5. 初始化事件

### 初始化钩子
```python
@events.init.add_listener
def on_init(environment, **kwargs):
    """Locust 环境初始化时触发"""
    print("Locust 环境初始化完成")

@events.init_command_line_parser.add_listener
def on_init_command_line_parser(parser, **kwargs):
    """初始化命令行参数解析器时触发"""
    parser.add_argument("--my-custom-arg", help="自定义参数")

@events.init_csv_writer.add_listener
def on_init_csv_writer(environment, csv_writer, **kwargs):
    """初始化 CSV 写入器时触发"""
```

## 6. 报告和输出事件

### 统计报告事件
```python
@events.report_to_master.add_listener
def on_report_to_master(client_id, data, **kwargs):
    """Worker 向 Master 报告数据时触发"""

@events.report_to_console.add_listener
def on_report_to_console(environment, stats, **kwargs):
    """向控制台报告统计数据时触发"""
    print("控制台报告生成")

@events.other_report_to_master.add_listener
def on_other_report_to_master(client_id, data, **kwargs):
    """Worker 向 Master 报告其他数据时触发"""
```

## 7. 完整示例：所有钩子的使用

```python
from locust import HttpUser, task, between, events
import time
import json

class ExampleUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """用户级别的启动钩子"""
        print(f"用户 {id(self)} 启动")
    
    def on_stop(self):
        """用户级别的停止钩子""" 
        print(f"用户 {id(self)} 停止")
    
    @task
    def example_task(self):
        self.client.get("/api/test")

# ===== 测试生命周期事件 =====
@events.test_start.add_listener
def setup_test(environment, **kwargs):
    print("🎯 测试开始 - 初始化资源")
    environment.test_start_time = time.time()

@events.test_stop.add_listener
def teardown_test(environment, **kwargs):
    duration = time.time() - environment.test_start_time
    print(f"🏁 测试结束 - 运行时长: {duration:.2f}秒")

# ===== 请求事件 =====
@events.request.add_listener
def log_all_requests(request_type, name, response_time, response_length, response, exception, context, **kwargs):
    """记录所有请求"""
    if response_time > 1000:
        print(f"🐌 慢请求: {name} - {response_time}ms")

@events.request_success.add_listener
def on_success(request_type, name, response_time, response_length, **kwargs):
    """成功请求处理"""
    pass

@events.request_failure.add_listener
def on_failure(request_type, name, response_time, response_length, exception, **kwargs):
    """失败请求处理"""
    print(f"❌ 请求失败: {name} - {exception}")

# ===== 用户生成事件 =====
@events.user_spawning_start.add_listener
def on_spawning_start(user_count, **kwargs):
    print(f"👥 开始生成 {user_count} 个用户")

@events.user_spawning_complete.add_listener
def on_spawning_complete(user_count, **kwargs):
    print(f"✅ 所有 {user_count} 个用户生成完成")

# ===== 分布式事件 =====
@events.worker_connect.add_listener
def on_worker_connect(client_id, **kwargs):
    print(f"🔗 Worker {client_id} 已连接")

@events.worker_disconnect.add_listener
def on_worker_disconnect(client_id, **kwargs):
    print(f"🔌 Worker {client_id} 已断开")

@events.worker_report.add_listener
def on_worker_report(client_id, data, **kwargs):
    print(f"📊 收到 Worker {client_id} 的报告")

# ===== 初始化事件 =====
@events.init.add_listener
def on_init(environment, **kwargs):
    print("🔧 Locust 环境初始化")
    environment.custom_data = {}

@events.init_command_line_parser.add_listener
def add_custom_args(parser, **kwargs):
    """添加自定义命令行参数"""
    parser.add_argument(
        "--test-environment",
        help="测试环境",
        default="staging"
    )

# ===== 退出事件 =====
@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    print("👋 Locust 正在退出")

@events.quit.add_listener
def on_quit(exit_code, **kwargs):
    print(f"🚪 Locust 退出，代码: {exit_code}")
```

## 8. 用户类级别的钩子

除了全局事件，User 类还有自己的生命周期方法：

```python
from locust import HttpUser, task, between

class UserWithHooks(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        print("用户对象初始化")
        self.session_data = {}
    
    def on_start(self):
        """每个用户开始执行任务前调用"""
        print("用户开始执行")
        # 登录、初始化数据等
        self.login()
    
    def on_stop(self):
        """每个用户停止执行任务后调用"""
        print("用户停止执行")
        # 登出、清理资源等
        self.logout()
    
    def login(self):
        """自定义登录方法"""
        response = self.client.post("/api/login", json={
            "username": "test", 
            "password": "test"
        })
        if response.status_code == 200:
            self.session_data["token"] = response.json().get("token")
    
    def logout(self):
        """自定义登出方法"""
        if "token" in self.session_data:
            self.client.post("/api/logout")
    
    @task
    def some_task(self):
        self.client.get("/api/data")
```

## 9. 事件参数详解

### test_start / test_stop 参数
```python
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    environment: LocustEnvironment 对象
        - environment.host: 目标主机
        - environment.parsed_options: 解析的命令行参数
        - environment.runner: 运行器实例
    """
    print(f"目标主机: {environment.host}")
```

### request 事件参数
```python
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, exception, context, **kwargs):
    """
    request_type: HTTP 方法 ("GET", "POST" 等)
    name: 请求名称
    response_time: 响应时间(毫秒)
    response_length: 响应体大小
    response: Response 对象 (包含 status_code, headers 等)
    exception: 异常对象 (如果有)
    context: 请求上下文字典
    """
```

### worker 事件参数
```python
@events.worker_report.add_listener
def on_worker_report(client_id, data, **kwargs):
    """
    client_id: Worker 节点ID
    data: 包含统计数据的字典
        - data['stats']: 请求统计
        - data['errors']: 错误统计
        - data['user_count']: 用户数量
    """
```

## 10. 实际应用场景

### 性能监控集成
```python
@events.request.add_listener
def send_metrics_to_prometheus(request_type, name, response_time, response_length, response, exception, context, **kwargs):
    """发送指标到 Prometheus"""
    status = "success" if not exception else "failure"
    labels = {
        "method": request_type,
        "endpoint": name,
        "status": status
    }
    # prometheus_metrics.http_requests.labels(**labels).observe(response_time / 1000.0)
```

### 实时告警
```python
@events.request_failure.add_listener
def alert_on_failures(request_type, name, response_time, response_length, exception, **kwargs):
    """失败请求告警"""
    if "critical" in name:
        send_alert(f"关键接口失败: {name} - {exception}")

def send_alert(message):
    """发送告警"""
    print(f"🚨 {message}")
```

### 自定义报告
```python
@events.test_stop.add_listener
def generate_custom_report(environment, **kwargs):
    """生成自定义测试报告"""
    report = {
        "duration": time.time() - getattr(environment, 'test_start_time', 0),
        "total_requests": sum(stats.num_requests for stats in environment.stats.entries.values()),
        "environment": getattr(environment.parsed_options, 'test_environment', 'unknown')
    }
    
    with open('custom_report.json', 'w') as f:
        json.dump(report, f, indent=2)
```

## 总结

Locust 提供了完整的事件钩子系统，覆盖了测试的各个生命周期阶段：

1. **测试级别**：`test_start`, `test_stop`
2. **请求级别**：`request`, `request_success`, `request_failure`  
3. **用户级别**：`user_spawning_start`, `user_spawning_complete`
4. **分布式级别**：`worker_connect`, `worker_disconnect`, `worker_report`
5. **初始化级别**：`init`, `init_command_line_parser`
6. **退出级别**：`quitting`, `quit`

这些钩子让你能够在测试的各个阶段插入自定义逻辑，实现复杂的监控、报告和集成需求。