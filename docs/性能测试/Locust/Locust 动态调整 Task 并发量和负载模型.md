# Locust 动态调整 Task 并发量和负载模型

是的，Locust 支持动态调整单个 Task 的并发量和负载模型，但需要通过一些技巧来实现。以下是完整的方法：

## 1. 动态 Task 权重调整

### 方法1：运行时修改 Task 权重
```python
from locust import HttpUser, task, between, events
import time
import random

class DynamicWeightUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.task_weights = {
            'high_priority_task': 5,
            'medium_priority_task': 3, 
            'low_priority_task': 1
        }
        self.setup_dynamic_tasks()
    
    def setup_dynamic_tasks(self):
        """动态设置 Task 权重"""
        self.tasks = []
        
        # 根据权重添加任务
        for task_name, weight in self.task_weights.items():
            task_method = getattr(self, task_name)
            # 创建带权重的任务
            for _ in range(weight):
                self.tasks.append(task_method)
    
    @task
    def high_priority_task(self):
        """高优先级任务"""
        self.client.get("/api/high-priority", name="high_priority")
        print(f"执行高优先级任务，权重: {self.task_weights['high_priority_task']}")
    
    @task  
    def medium_priority_task(self):
        """中优先级任务"""
        self.client.get("/api/medium-priority", name="medium_priority")
        print(f"执行中优先级任务，权重: {self.task_weights['medium_priority_task']}")
    
    @task
    def low_priority_task(self):
        """低优先级任务"""
        self.client.get("/api/low-priority", name="low_priority")
        print(f"执行低优先级任务，权重: {self.task_weights['low_priority_task']}")
    
    def update_task_weights(self, new_weights):
        """动态更新任务权重"""
        self.task_weights.update(new_weights)
        # 重新设置任务列表
        self.setup_dynamic_tasks()
        print(f"任务权重已更新: {self.task_weights}")

# 通过事件监听器动态调整权重
@events.test_start.add_listener
def setup_dynamic_adjustment(environment, **kwargs):
    """测试开始时设置动态调整"""
    def adjust_weights_periodically():
        """周期性调整权重"""
        import threading
        import schedule
        import time
        
        def job():
            if environment.runner and environment.runner.user_count > 0:
                # 随机选择用户实例并调整权重
                user_instance = random.choice(list(environment.runner.user_classes)[0].users)
                new_weights = {
                    'high_priority_task': random.randint(1, 10),
                    'medium_priority_task': random.randint(1, 5),
                    'low_priority_task': random.randint(1, 3)
                }
                user_instance.update_task_weights(new_weights)
        
        # 每30秒调整一次权重
        schedule.every(30).seconds.do(job)
        
        while True:
            schedule.run_pending()
            time.sleep(1)
    
    # 在后台线程中运行权重调整
    adjustment_thread = threading.Thread(target=adjust_weights_periodically, daemon=True)
    adjustment_thread.start()
```

## 2. 动态负载模型调整

### 方法2：运行时修改负载模式
```python
from locust import HttpUser, task, between, LoadTestShape
import time
import math

class DynamicLoadUser(HttpUser):
    wait_time = between(1, 5)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.current_load_profile = "normal"  # normal, high, low
        self.load_profiles = {
            "normal": {"users": 50, "spawn_rate": 5},
            "high": {"users": 200, "spawn_rate": 20}, 
            "low": {"users": 10, "spawn_rate": 2}
        }
    
    @task(3)
    def normal_workload(self):
        """正常负载任务"""
        if self.current_load_profile == "high":
            # 高负载时增加处理时间
            time.sleep(0.5)
        self.client.get("/api/normal", name="normal_workload")
    
    @task(2)
    def intensive_workload(self):
        """密集型任务"""
        if self.current_load_profile == "high":
            # 高负载时减少复杂操作
            self.client.get("/api/simple", name="simple_intensive")
        else:
            # 正常负载执行完整操作
            self.client.get("/api/complex", name="complex_intensive")
            time.sleep(1)
    
    @task(1)
    def background_workload(self):
        """后台任务"""
        if self.current_load_profile == "low":
            # 低负载时执行更多后台任务
            self.client.get("/api/background", name="background_workload")
    
    def switch_load_profile(self, profile_name):
        """切换负载模式"""
        if profile_name in self.load_profiles:
            self.current_load_profile = profile_name
            print(f"切换到负载模式: {profile_name}")
            
            # 更新等待时间
            if profile_name == "high":
                self.wait_time = between(0.1, 1)
            elif profile_name == "low":
                self.wait_time = between(3, 10)
            else:
                self.wait_time = between(1, 5)

# 动态负载形状控制
class AdaptiveLoadTestShape(LoadTestShape):
    """
    自适应负载测试形状
    根据系统响应动态调整负载
    """
    
    def __init__(self):
        super().__init__()
        self.current_stage = 0
        self.last_adjustment_time = time.time()
        self.response_time_threshold = 1000  # 1秒阈值
        self.error_rate_threshold = 0.05     # 5%错误率阈值
    
    def tick(self):
        """
        返回当前时刻的 (用户数, 生成率) 或 None 来停止测试
        """
        run_time = self.get_run_time()
        
        # 获取当前统计信息
        stats = self.get_current_stats()
        
        # 基于性能指标动态调整负载
        new_users, new_spawn_rate = self.adaptive_adjustment(stats, run_time)
        
        return (new_users, new_spawn_rate)
    
    def get_current_stats(self):
        """获取当前性能统计"""
        # 这里需要访问环境统计信息
        # 在实际使用中，需要通过 environment 获取
        return {
            "avg_response_time": 150,  # 模拟数据
            "error_rate": 0.02,
            "current_users": 50
        }
    
    def adaptive_adjustment(self, stats, run_time):
        """自适应调整逻辑"""
        current_users = stats["current_users"]
        
        # 基于响应时间调整
        if stats["avg_response_time"] > self.response_time_threshold:
            # 响应时间过长，减少负载
            new_users = max(10, current_users - 10)
            print(f"📉 响应时间过长，减少负载到 {new_users} 用户")
        elif stats["avg_response_time"] < 500 and stats["error_rate"] < self.error_rate_threshold:
            # 系统表现良好，增加负载
            new_users = min(1000, current_users + 20)
            print(f"📈 系统表现良好，增加负载到 {new_users} 用户")
        else:
            # 保持当前负载
            new_users = current_users
        
        # 基于测试阶段调整
        if run_time < 60:
            # 第一阶段：缓慢增加
            new_users = min(100, int(run_time))
        elif run_time < 300:
            # 第二阶段：稳定负载
            new_users = 100
        else:
            # 第三阶段：压力测试
            new_users = min(500, 100 + int((run_time - 300) / 10))
        
        spawn_rate = max(1, new_users // 10)
        
        return new_users, spawn_rate
```

## 3. 基于 Web API 的动态控制

### 方法3：通过 HTTP API 动态调整
```python
from locust import HttpUser, task, between
from flask import Flask, request, jsonify
import threading
import json

# 创建控制 API
control_app = Flask(__name__)

class APIControlledUser(HttpUser):
    wait_time = between(1, 3)
    
    # 类变量存储控制状态
    control_config = {
        "task_weights": {"task_a": 3, "task_b": 2, "task_c": 1},
        "load_multiplier": 1.0,
        "enabled_tasks": ["task_a", "task_b", "task_c"]
    }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.update_tasks()
    
    def update_tasks(self):
        """根据控制配置更新任务"""
        self.tasks = []
        
        for task_name in self.control_config["enabled_tasks"]:
            if hasattr(self, task_name):
                task_method = getattr(self, task_name)
                weight = self.control_config["task_weights"].get(task_name, 1)
                # 应用负载乘数
                adjusted_weight = max(1, int(weight * self.control_config["load_multiplier"]))
                
                for _ in range(adjusted_weight):
                    self.tasks.append(task_method)
    
    @task
    def task_a(self):
        """任务 A"""
        self.client.get("/api/task-a", name="task_a")
    
    @task  
    def task_b(self):
        """任务 B"""
        self.client.get("/api/task-b", name="task_b")
    
    @task
    def task_c(self):
        """任务 C"""
        self.client.get("/api/task-c", name="task_c")
    
    @classmethod
    def update_control_config(cls, new_config):
        """更新控制配置"""
        cls.control_config.update(new_config)
        print(f"控制配置已更新: {cls.control_config}")
        
        # 通知所有用户实例更新任务
        # 这需要在测试环境中实现用户实例的访问

# 控制 API 路由
@control_app.route('/control/task_weights', methods=['POST'])
def update_task_weights():
    """更新任务权重"""
    data = request.json
    APIControlledUser.control_config["task_weights"].update(data)
    return jsonify({"status": "success", "new_weights": APIControlledUser.control_config["task_weights"]})

@control_app.route('/control/load_multiplier', methods=['POST'])
def update_load_multiplier():
    """更新负载乘数"""
    data = request.json
    APIControlledUser.control_config["load_multiplier"] = data.get("multiplier", 1.0)
    return jsonify({"status": "success", "new_multiplier": APIControlledUser.control_config["load_multiplier"]})

@control_app.route('/control/enable_tasks', methods=['POST'])
def enable_tasks():
    """启用/禁用任务"""
    data = request.json
    APIControlledUser.control_config["enabled_tasks"] = data.get("tasks", [])
    return jsonify({"status": "success", "enabled_tasks": APIControlledUser.control_config["enabled_tasks"]})

@control_app.route('/control/status', methods=['GET'])
def get_control_status():
    """获取控制状态"""
    return jsonify(APIControlledUser.control_config)

def start_control_api():
    """启动控制 API 服务器"""
    control_app.run(port=5000, debug=False, use_reloader=False)

# 在测试开始时启动控制 API
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """测试开始时启动控制 API"""
    api_thread = threading.Thread(target=start_control_api, daemon=True)
    api_thread.start()
    print("🎮 控制 API 已启动: http://localhost:5000")
```

## 4. 基于性能反馈的动态调整

### 方法4：根据系统性能自动调整
```python
from locust import HttpUser, task, between, events
import time
from collections import deque

class FeedbackDrivenUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.performance_history = deque(maxlen=10)  # 最近10次请求的响应时间
        self.aggressiveness = 1.0  # 攻击性系数 0.1-2.0
        self.task_configs = {
            "heavy_task": {"base_weight": 2, "current_weight": 2},
            "light_task": {"base_weight": 5, "current_weight": 5},
            "critical_task": {"base_weight": 1, "current_weight": 1}
        }
        self.setup_adaptive_tasks()
    
    def setup_adaptive_tasks(self):
        """设置自适应任务"""
        self.tasks = []
        
        for task_name, config in self.task_configs.items():
            task_method = getattr(self, task_name)
            weight = int(config["current_weight"] * self.aggressiveness)
            
            for _ in range(max(1, weight)):
                self.tasks.append(task_method)
    
    @task
    def heavy_task(self):
        """重量级任务"""
        start_time = time.time()
        
        # 执行复杂操作
        self.client.get("/api/complex-operation", name="heavy_task")
        time.sleep(0.2 * self.aggressiveness)  # 根据攻击性调整处理时间
        
        response_time = (time.time() - start_time) * 1000
        self.record_performance(response_time)
        self.adaptive_adjustment()
    
    @task
    def light_task(self):
        """轻量级任务"""
        self.client.get("/api/simple-operation", name="light_task")
    
    @task  
    def critical_task(self):
        """关键任务"""
        self.client.get("/api/critical-operation", name="critical_task")
    
    def record_performance(self, response_time):
        """记录性能数据"""
        self.performance_history.append(response_time)
    
    def adaptive_adjustment(self):
        """自适应调整"""
        if len(self.performance_history) < 5:
            return
        
        avg_response_time = sum(self.performance_history) / len(self.performance_history)
        
        # 基于响应时间调整攻击性
        if avg_response_time > 2000:  # 2秒阈值
            # 响应时间过长，降低攻击性
            self.aggressiveness = max(0.1, self.aggressiveness * 0.8)
            print(f"📉 响应时间过长，降低攻击性到: {self.aggressiveness:.2f}")
        elif avg_response_time < 500:  # 0.5秒阈值
            # 响应时间良好，提高攻击性
            self.aggressiveness = min(2.0, self.aggressiveness * 1.2)
            print(f"📈 响应时间良好，提高攻击性到: {self.aggressiveness:.2f}")
        
        # 重新计算任务权重
        for task_name, config in self.task_configs.items():
            config["current_weight"] = int(config["base_weight"] * self.aggressiveness)
        
        # 更新任务列表
        self.setup_adaptive_tasks()
```

## 5. 使用环境变量动态控制

### 方法5：通过环境变量实时调整
```python
from locust import HttpUser, task, between
import os
import time
import json

class EnvironmentControlledUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.config_file = "dynamic_config.json"
        self.last_config_update = 0
        self.load_config()
    
    def load_config(self):
        """加载配置"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    self.config = json.load(f)
            else:
                # 默认配置
                self.config = {
                    "task_weights": {"api_search": 3, "api_create": 2, "api_delete": 1},
                    "think_time_multiplier": 1.0,
                    "enabled_features": ["search", "create"]
                }
                self.save_config()
        except Exception as e:
            print(f"配置加载失败: {e}")
            self.config = {}
    
    def save_config(self):
        """保存配置"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            print(f"配置保存失败: {e}")
    
    def check_config_update(self):
        """检查配置更新"""
        current_time = time.time()
        if current_time - self.last_config_update > 5:  # 每5秒检查一次
            file_mtime = os.path.getmtime(self.config_file) if os.path.exists(self.config_file) else 0
            if file_mtime > self.last_config_update:
                self.load_config()
                self.last_config_update = current_time
                print("配置已更新")
                return True
        return False
    
    @task
    def api_search(self):
        """搜索 API"""
        if self.check_config_update():
            self.apply_config()
        
        if "search" in self.config.get("enabled_features", []):
            think_time = 1.0 * self.config.get("think_time_multiplier", 1.0)
            time.sleep(think_time)
            self.client.get("/api/search", name="api_search")
    
    @task
    def api_create(self):
        """创建 API"""
        if self.check_config_update():
            self.apply_config()
        
        if "create" in self.config.get("enabled_features", []):
            think_time = 2.0 * self.config.get("think_time_multiplier", 1.0)
            time.sleep(think_time)
            self.client.post("/api/create", json={}, name="api_create")
    
    @task  
    def api_delete(self):
        """删除 API"""
        if self.check_config_update():
            self.apply_config()
        
        if "delete" in self.config.get("enabled_features", []):
            self.client.delete("/api/delete", name="api_delete")
    
    def apply_config(self):
        """应用配置到任务权重"""
        # 动态更新 tasks 属性
        self.tasks = []
        weights = self.config.get("task_weights", {})
        
        for task_name, weight in weights.items():
            if hasattr(self, task_name) and task_name in self.config.get("enabled_features", []):
                task_method = getattr(self, task_name)
                for _ in range(weight):
                    self.tasks.append(task_method)

# 配置管理脚本
def create_config_manager():
    """创建配置管理工具"""
    import threading
    
    def config_manager():
        """配置管理器线程"""
        while True:
            try:
                # 模拟动态配置更新
                new_config = {
                    "task_weights": {
                        "api_search": random.randint(1, 5),
                        "api_create": random.randint(1, 3), 
                        "api_delete": random.randint(0, 2)
                    },
                    "think_time_multiplier": random.uniform(0.5, 2.0),
                    "enabled_features": random.sample(
                        ["search", "create", "delete"], 
                        random.randint(1, 3)
                    )
                }
                
                with open("dynamic_config.json", 'w') as f:
                    json.dump(new_config, f, indent=2)
                
                print("🔄 配置已更新")
                time.sleep(30)  # 每30秒更新一次配置
                
            except Exception as e:
                print(f"配置管理错误: {e}")
                time.sleep(10)
    
    manager_thread = threading.Thread(target=config_manager, daemon=True)
    manager_thread.start()

@events.test_start.add_listener
def start_config_manager(environment, **kwargs):
    """启动配置管理器"""
    create_config_manager()
    print("⚙️ 动态配置管理器已启动")
```

## 6. 使用示例和测试命令

### 运行动态负载测试
```bash
# 1. 运行基础测试
locust -f dynamic_load.py --headless -u 100 -r 10 -t 10m

# 2. 使用负载形状
locust -f dynamic_load.py --headless --autostart --autoquit 0 -u 1 -t 1h --loglevel INFO

# 3. 运行时通过 API 控制
# 在测试运行期间，可以调用控制 API：
curl -X POST http://localhost:5000/control/task_weights \
  -H "Content-Type: application/json" \
  -d '{"task_a": 5, "task_b": 3, "task_c": 1}'

curl -X POST http://localhost:5000/control/load_multiplier \
  -H "Content-Type: application/json" \
  -d '{"multiplier": 2.0}'
```

## 7. 动态调整策略总结

| 调整维度     | 实现方法                | 适用场景         | 优点             | 缺点                 |
| ------------ | ----------------------- | ---------------- | ---------------- | -------------------- |
| **Task权重** | 运行时修改 `tasks` 列表 | 业务优先级变化   | 灵活控制任务比例 | 需要重新构建任务列表 |
| **负载模型** | 自定义 `LoadTestShape`  | 模拟真实负载波动 | 自动化调整       | 实现复杂度高         |
| **API控制**  | 内置 HTTP API           | 人工干预测试     | 实时控制         | 需要额外服务         |
| **性能反馈** | 基于响应时间调整        | 自适应负载测试   | 智能调整         | 可能振荡             |
| **环境变量** | 配置文件热更新          | 长期稳定性测试   | 持久化配置       | 文件IO开销           |

**核心要点**：
1. Locust 本身不直接支持单个 Task 的并发控制，但可以通过动态修改 `tasks` 属性实现
2. 负载模型可以通过自定义 `LoadTestShape` 实现复杂动态调整
3. 结合事件系统和多线程可以实现实时动态控制
4. 选择合适的方法取决于你的具体需求和测试场景