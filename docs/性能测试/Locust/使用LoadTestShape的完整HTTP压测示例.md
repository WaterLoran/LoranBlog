# 使用LoadTestShape的完整HTTP压测示例

## **1. 完整的压测脚本：复杂场景模拟**

```python
# loadtest_shape_demo.py
from locust import HttpUser, task, between, events, LoadTestShape
import time
import json
import logging
from datetime import datetime

# 配置日志格式
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 事件监听器：记录测试状态
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    logger.info(f"✅ 压测开始 | 目标主机: {environment.host}")
    environment.shape_start_time = time.time()
    environment.phase_log = []

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    total_duration = time.time() - environment.shape_start_time
    logger.info(f"✅ 压测结束 | 总时长: {total_duration:.2f}秒")
    
    # 打印阶段记录
    print("\n" + "="*60)
    print("📊 负载形状阶段总结")
    print("="*60)
    for phase in environment.phase_log:
        print(f"阶段: {phase['name']:15s} | 用户数: {phase['users']:4d} | "
              f"孵化率: {phase['spawn_rate']:3d}/s | 时长: {phase['duration']:3d}秒")

# 自定义用户类：模拟不同用户行为
class APIUser(HttpUser):
    """
    模拟API调用用户
    支持不同类型的请求操作
    """
    wait_time = between(0.1, 0.5)  # 较短的等待时间，模拟高并发
    host = "http://api.example.com"  # 替换为实际测试地址
    
    def on_start(self):
        """用户启动时初始化"""
        self.user_id = f"user_{id(self)}_{int(time.time())}"
        self.request_counter = 0
        self.start_time = time.time()
        
        # 登录获取token（如果接口需要）
        self.token = self.login()
        
        # 记录用户启动
        logger.debug(f"用户启动: {self.user_id}")
    
    def login(self):
        """模拟登录获取认证token"""
        try:
            response = self.client.post(
                "/api/auth/login",
                json={
                    "username": "testuser",
                    "password": "testpass"
                },
                name="auth_login",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("token")
        except Exception as e:
            logger.warning(f"登录失败: {e}")
        return None
    
    @task(5)  # 权重5：高频读操作
    def get_user_profile(self):
        """获取用户信息"""
        self.request_counter += 1
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        with self.client.get(
            f"/api/users/{self.user_id}",
            headers=headers,
            name="get_profile",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"获取用户信息失败: {response.status_code}")
    
    @task(3)  # 权重3：中频搜索操作
    def search_products(self):
        """搜索产品"""
        self.request_counter += 1
        search_terms = ["phone", "laptop", "book", "shoes", "watch"]
        import random
        term = random.choice(search_terms)
        
        with self.client.get(
            f"/api/products/search?q={term}&page=1&size=20",
            name="search_products",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("products"):
                    response.success()
                else:
                    response.failure("搜索无结果")
            else:
                response.failure(f"搜索失败: {response.status_code}")
    
    @task(2)  # 权重2：低频写操作
    def create_order(self):
        """创建订单"""
        self.request_counter += 1
        order_data = {
            "userId": self.user_id,
            "items": [
                {"productId": "prod_001", "quantity": 1},
                {"productId": "prod_002", "quantity": 2}
            ],
            "totalAmount": 299.99
        }
        
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        with self.client.post(
            "/api/orders",
            json=order_data,
            headers=headers,
            name="create_order",
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"创建订单失败: {response.status_code}")
    
    @task(1)  # 权重1：低频复杂操作
    def batch_operation(self):
        """批量操作"""
        self.request_counter += 1
        batch_data = {
            "operations": [
                {"action": "update", "data": {"status": "active"}},
                {"action": "delete", "data": {"id": "temp_123"}}
            ]
        }
        
        with self.client.post(
            "/api/batch",
            json=batch_data,
            name="batch_operation",
            catch_response=True,
            timeout=30  # 批量操作可能较慢
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"批量操作失败: {response.status_code}")
    
    def on_stop(self):
        """用户停止时统计"""
        duration = time.time() - self.start_time
        rps = self.request_counter / duration if duration > 0 else 0
        logger.debug(f"用户 {self.user_id} 结束 | 请求数: {self.request_counter} | "
                    f"平均RPS: {rps:.2f}/s")

# ============================================================================
# LoadTestShape 实现
# ============================================================================

class ProductionLoadShape(LoadTestShape):
    """
    生产环境负载形状：模拟真实用户行为模式
    包含：爬坡期、平稳期、高峰冲击、下降期
    """
    
    # 定义测试阶段：每个阶段是 (duration, users, spawn_rate, name)
    stages = [
        # 阶段1: 初始爬坡 (10分钟)
        {"duration": 600, "users": 100, "spawn_rate": 2, "name": "初始爬坡"},
        
        # 阶段2: 平稳运行 (20分钟)
        {"duration": 1200, "users": 100, "spawn_rate": 2, "name": "平稳期"},
        
        # 阶段3: 第一次高峰 (5分钟爬坡到200用户)
        {"duration": 300, "users": 200, "spawn_rate": 5, "name": "第一次高峰"},
        
        # 阶段4: 高峰维持 (10分钟)
        {"duration": 600, "users": 200, "spawn_rate": 2, "name": "高峰维持"},
        
        # 阶段5: 下降到正常水平 (5分钟)
        {"duration": 300, "users": 150, "spawn_rate": 3, "name": "下降期1"},
        
        # 阶段6: 第二次更高高峰 (5分钟爬坡到300用户)
        {"duration": 300, "users": 300, "spawn_rate": 6, "name": "第二次高峰"},
        
        # 阶段7: 压力测试 (5分钟)
        {"duration": 300, "users": 300, "spawn_rate": 2, "name": "压力测试"},
        
        # 阶段8: 逐步下降 (10分钟降到0)
        {"duration": 600, "users": 0, "spawn_rate": 5, "name": "结束下降"},
    ]
    
    def tick(self):
        """
        核心方法：每秒调用一次
        返回: (用户数, 孵化率) 或 None(停止测试)
        """
        run_time = self.get_run_time()
        current_stage = None
        
        # 计算当前所处的阶段
        elapsed_in_stage = 0
        for i, stage in enumerate(self.stages):
            if run_time < elapsed_in_stage + stage["duration"]:
                current_stage = stage
                stage_start_time = elapsed_in_stage
                break
            elapsed_in_stage += stage["duration"]
        
        if current_stage is None:
            # 所有阶段完成
            logger.info("🎯 所有负载阶段已完成")
            return None
        
        # 记录阶段开始（仅第一次进入时记录）
        if not hasattr(self, 'stage_history'):
            self.stage_history = {}
        
        stage_key = current_stage["name"]
        if stage_key not in self.stage_history:
            self.stage_history[stage_key] = True
            logger.info(f"📈 进入阶段: {stage_key} | "
                       f"目标用户: {current_stage['users']} | "
                       f"孵化率: {current_stage['spawn_rate']}/s | "
                       f"时长: {current_stage['duration']}秒")
            
            # 记录到环境变量中，供事件监听器使用
            if hasattr(self.environment, 'phase_log'):
                self.environment.phase_log.append({
                    "name": current_stage["name"],
                    "users": current_stage["users"],
                    "spawn_rate": current_stage["spawn_rate"],
                    "duration": current_stage["duration"]
                })
        
        return (current_stage["users"], current_stage["spawn_rate"])

class SpikeLoadShape(LoadTestShape):
    """
    尖峰负载测试：模拟突发流量
    """
    
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time < 300:  # 0-5分钟：正常负载
            return (50, 5)
        elif run_time < 310:  # 5-5分10秒：突发尖峰
            return (500, 50)  # 瞬间增加10倍用户
        elif run_time < 360:  # 5分10秒-6分钟：恢复正常
            return (50, 5)
        elif run_time < 420:  # 6-7分钟：第二个尖峰
            return (300, 30)
        else:  # 测试结束
            return None

class DailyPatternLoadShape(LoadTestShape):
    """
    模拟24小时用户访问模式
    假设：工作时间访问多，夜间访问少
    """
    
    def tick(self):
        run_time = self.get_run_time() % 86400  # 模24小时
        
        # 工作时间 (9:00-18:00)
        if 32400 <= run_time < 64800:  # 9:00-18:00
            hour_of_day = (run_time - 32400) / 3600
            
            # 模拟午休下降
            if 3 <= hour_of_day < 4:  # 12:00-13:00
                users = 200
            # 下午高峰
            elif 5 <= hour_of_day < 7:  # 14:00-16:00
                users = 400
            else:
                users = 300
                
            return (users, users // 10)  # 孵化率为用户的1/10
        
        # 晚上时间 (18:00-22:00)
        elif 64800 <= run_time < 79200:
            users = 150
            return (users, 15)
        
        # 夜间 (22:00-9:00)
        else:
            users = 50
            return (users, 5)

class StepLoadShape(LoadTestShape):
    """
    阶梯式负载测试：逐步增加压力
    """
    
    step_duration = 180  # 每个阶梯3分钟
    max_steps = 8  # 最多8个阶梯
    
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time < self.step_duration * self.max_steps:
            step = int(run_time / self.step_duration) + 1
            users = step * 50  # 每个阶梯增加50用户
            spawn_rate = max(10, users // 5)  # 孵化率动态调整
            
            # 记录当前阶梯
            if not hasattr(self, 'current_step') or self.current_step != step:
                self.current_step = step
                logger.info(f"📊 阶梯 {step}: {users} 用户, {spawn_rate}/s 孵化率")
            
            return (users, spawn_rate)
        
        return None

# ============================================================================
# 运行配置和主程序
# ============================================================================

# 选择要使用的负载形状（取消注释你想要使用的形状）
# CURRENT_SHAPE = ProductionLoadShape()  # 完整生产负载
# CURRENT_SHAPE = SpikeLoadShape()      # 尖峰测试
# CURRENT_SHAPE = DailyPatternLoadShape() # 日模式
CURRENT_SHAPE = StepLoadShape()         # 阶梯测试

# 导出LoadTestShape实例
shape = CURRENT_SHAPE

if __name__ == "__main__":
    """
    本地调试模式：直接运行单个用户
    """
    from locust import run_single_user
    
    # 设置测试URL
    APIUser.host = "http://localhost:8080"  # 本地测试
    
    print("🚀 启动单用户调试模式...")
    print(f"目标地址: {APIUser.host}")
    print("按 Ctrl+C 停止测试\n")
    
    # 运行单个用户（用于脚本调试）
    run_single_user(APIUser)
```

## **2. 运行脚本的配置文件**

```yaml
# locust_config.yaml
# Locust 配置文件，支持更复杂的配置

locustfile: loadtest_shape_demo.py
host: http://api.example.com
users: 1000  # 会被LoadTestShape覆盖
spawn-rate: 50  # 会被LoadTestShape覆盖
run-time: 30m
headless: true
only-summary: false
csv: results/stats  # CSV输出前缀
html: results/report.html
logfile: results/locust.log
loglevel: INFO
tags: []
exclude-tags: []
```

## **3. 批量运行脚本**

```python
# run_tests.py
#!/usr/bin/env python3
"""
批量运行多个负载测试场景
"""
import os
import subprocess
import time
import json
from datetime import datetime
import argparse

def run_locust_test(test_name, host, users, spawn_rate, runtime, shape_class=None):
    """
    运行单个Locust测试
    """
    print(f"\n{'='*60}")
    print(f"开始测试: {test_name}")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"目标主机: {host}")
    print(f"最大用户数: {users}")
    print(f"孵化率: {spawn_rate}/s")
    print(f"运行时间: {runtime}")
    print(f"{'='*60}\n")
    
    # 创建结果目录
    result_dir = f"results/{test_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(result_dir, exist_ok=True)
    
    # 构建命令
    cmd = [
        "locust",
        "-f", "loadtest_shape_demo.py",
        "--host", host,
        "--headless",
        "--only-summary",
        "--csv", f"{result_dir}/stats",
        "--html", f"{result_dir}/report.html",
        "--logfile", f"{result_dir}/locust.log",
        "--loglevel", "INFO",
    ]
    
    # 如果不使用LoadTestShape，则指定用户数
    if shape_class is None:
        cmd.extend(["-u", str(users), "-r", str(spawn_rate), "--run-time", runtime])
    
    # 执行命令
    start_time = time.time()
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=int(runtime[:-1]) * 60 + 300)
        
        # 保存输出
        with open(f"{result_dir}/output.log", "w") as f:
            f.write(result.stdout)
            f.write(result.stderr)
        
        # 分析结果
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"测试完成: {test_name}")
        print(f"耗时: {duration:.2f}秒")
        print(f"退出码: {result.returncode}")
        
        # 提取关键指标
        if result.returncode == 0:
            print("✅ 测试成功完成")
        else:
            print("❌ 测试失败或中断")
        
        return {
            "test_name": test_name,
            "status": "success" if result.returncode == 0 else "failed",
            "duration": duration,
            "exit_code": result.returncode,
            "result_dir": result_dir
        }
        
    except subprocess.TimeoutExpired:
        print(f"❌ 测试超时: {test_name}")
        return {
            "test_name": test_name,
            "status": "timeout",
            "duration": int(runtime[:-1]) * 60,
            "exit_code": -1,
            "result_dir": result_dir
        }
    except Exception as e:
        print(f"❌ 测试异常: {test_name} - {str(e)}")
        return {
            "test_name": test_name,
            "status": "error",
            "error": str(e),
            "exit_code": -1,
            "result_dir": result_dir
        }

def main():
    parser = argparse.ArgumentParser(description="批量运行Locust负载测试")
    parser.add_argument("--host", required=True, help="目标主机地址")
    parser.add_argument("--tests", nargs="+", help="要运行的测试列表")
    parser.add_argument("--config", help="配置文件路径")
    
    args = parser.parse_args()
    
    # 测试场景配置
    test_scenarios = [
        {
            "name": "baseline_test",
            "description": "基线测试",
            "users": 100,
            "spawn_rate": 10,
            "runtime": "5m",
            "shape_class": None  # 不使用LoadTestShape
        },
        {
            "name": "step_load_test",
            "description": "阶梯负载测试",
            "users": 500,
            "spawn_rate": 50,
            "runtime": "30m",
            "shape_class": "StepLoadShape"
        },
        {
            "name": "spike_test",
            "description": "尖峰测试",
            "users": 1000,
            "spawn_rate": 100,
            "runtime": "15m",
            "shape_class": "SpikeLoadShape"
        },
        {
            "name": "production_simulation",
            "description": "生产环境模拟",
            "users": 1000,
            "spawn_rate": 50,
            "runtime": "60m",
            "shape_class": "ProductionLoadShape"
        }
    ]
    
    # 运行测试
    results = []
    for scenario in test_scenarios:
        if args.tests and scenario["name"] not in args.tests:
            continue
            
        print(f"\n🎯 准备运行: {scenario['description']}")
        print(f"场景配置: {json.dumps(scenario, indent=2, ensure_ascii=False)}")
        
        # 修改locustfile中的LoadTestShape
        if scenario["shape_class"]:
            with open("loadtest_shape_demo.py", "r") as f:
                content = f.read()
            
            # 找到LoadTestShape配置行并修改
            lines = content.split("\n")
            for i, line in enumerate(lines):
                if "CURRENT_SHAPE =" in line:
                    lines[i] = f"CURRENT_SHAPE = {scenario['shape_class']}()"
                    break
            
            with open("loadtest_shape_demo.py", "w") as f:
                f.write("\n".join(lines))
        
        # 运行测试
        result = run_locust_test(
            test_name=scenario["name"],
            host=args.host,
            users=scenario["users"],
            spawn_rate=scenario["spawn_rate"],
            runtime=scenario["runtime"]
        )
        results.append(result)
        
        # 暂停一下，让系统恢复
        time.sleep(30)
    
    # 生成测试报告
    print("\n" + "="*80)
    print("测试结果汇总")
    print("="*80)
    
    for result in results:
        status_icon = "✅" if result["status"] == "success" else "❌"
        print(f"{status_icon} {result['test_name']:20s} | "
              f"状态: {result['status']:10s} | "
              f"耗时: {result.get('duration', 0):.1f}s | "
              f"结果目录: {result.get('result_dir', 'N/A')}")
    
    # 保存汇总结果
    with open("results/test_summary.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "host": args.host,
            "results": results
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n📊 详细结果已保存到: results/test_summary.json")

if __name__ == "__main__":
    main()
```

## **4. 运行命令示例**

```bash
# 1. 基础运行（使用LoadTestShape）
locust -f loadtest_shape_demo.py --host=http://api.example.com --headless

# 2. 指定运行时间（LoadTestShape优先）
locust -f loadtest_shape_demo.py --host=http://api.example.com --headless --run-time 30m

# 3. 分布式运行
# Master节点
locust -f loadtest_shape_demo.py --host=http://api.example.com --master

# Worker节点（启动多个）
locust -f loadtest_shape_demo.py --worker --master-host=127.0.0.1

# 4. 使用配置文件
locust -f loadtest_shape_demo.py --config=locust_config.yaml

# 5. 运行批量测试
python run_tests.py --host=http://api.example.com --tests step_load_test spike_test

# 6. 调试模式（不使用LoadTestShape）
locust -f loadtest_shape_demo.py --host=http://localhost:8080 --headless -u 10 -r 2 --run-time 2m

# 7. 生成HTML报告
locust -f loadtest_shape_demo.py --host=http://api.example.com --headless --html=report.html

# 8. CSV输出
locust -f loadtest_shape_demo.py --host=http://api.example.com --headless --csv=results/stats
```

## **5. 监控和结果分析脚本**

```python
# monitor_results.py
"""
实时监控和结果分析工具
"""
import pandas as pd
import matplotlib.pyplot as plt
import json
import time
from datetime import datetime
import os

class LoadTestMonitor:
    def __init__(self, csv_prefix="results/stats"):
        self.csv_prefix = csv_prefix
        self.metrics = {}
        
    def load_csv_data(self):
        """加载CSV数据"""
        files = {
            "requests": f"{self.csv_prefix}_requests.csv",
            "responses": f"{self.csv_prefix}_responses.csv",
            "users": f"{self.csv_prefix}_users.csv",
            "exceptions": f"{self.csv_prefix}_exceptions.csv",
            "stats": f"{self.csv_prefix}_stats.csv"
        }
        
        data = {}
        for name, filepath in files.items():
            if os.path.exists(filepath):
                try:
                    data[name] = pd.read_csv(filepath)
                except Exception as e:
                    print(f"加载 {name} 失败: {e}")
            else:
                print(f"文件不存在: {filepath}")
        
        return data
    
    def analyze_performance(self, data):
        """分析性能指标"""
        if "stats" not in data:
            return {}
        
        df = data["stats"]
        
        # 提取关键指标
        analysis = {
            "total_requests": df["Request Count"].sum(),
            "total_failures": df["Failure Count"].sum(),
            "failure_rate": df["Failure Count"].sum() / df["Request Count"].sum() * 100 if df["Request Count"].sum() > 0 else 0,
            "avg_response_time": df["Average Response Time"].mean(),
            "median_response_time": df["Median Response Time"].median(),
            "max_response_time": df["Max Response Time"].max(),
            "min_response_time": df["Min Response Time"].min(),
            "requests_per_second": df["Requests/s"].mean(),
            "p95_response_time": df["95%"].mean() if "95%" in df.columns else None,
            "p99_response_time": df["99%"].mean() if "99%" in df.columns else None,
        }
        
        # 按端点分析
        endpoint_stats = {}
        for _, row in df.iterrows():
            endpoint = row["Name"]
            endpoint_stats[endpoint] = {
                "requests": row["Request Count"],
                "failures": row["Failure Count"],
                "avg_response_time": row["Average Response Time"],
                "median_response_time": row["Median Response Time"],
                "rps": row["Requests/s"]
            }
        
        analysis["endpoints"] = endpoint_stats
        
        return analysis
    
    def plot_metrics(self, data):
        """绘制性能图表"""
        if "users" not in data or "responses" not in data:
            print("缺少数据文件，无法绘制图表")
            return
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # 用户数随时间变化
        if "users" in data:
            df_users = data["users"]
            axes[0, 0].plot(df_users["Timestamp"], df_users["User Count"])
            axes[0, 0].set_title("并发用户数")
            axes[0, 0].set_xlabel("时间")
            axes[0, 0].set_ylabel("用户数")
            axes[0, 0].grid(True)
        
        # 响应时间分布
        if "stats" in data:
            df_stats = data["stats"]
            endpoints = df_stats["Name"].tolist()
            avg_times = df_stats["Average Response Time"].tolist()
            median_times = df_stats["Median Response Time"].tolist()
            
            x = range(len(endpoints))
            width = 0.35
            
            axes[0, 1].bar([i - width/2 for i in x], avg_times, width, label="平均响应时间")
            axes[0, 1].bar([i + width/2 for i in x], median_times, width, label="中位数响应时间")
            axes[0, 1].set_xticks(x)
            axes[0, 1].set_xticklabels(endpoints, rotation=45, ha="right")
            axes[0, 1].set_title("响应时间分布")
            axes[0, 1].set_ylabel("时间(ms)")
            axes[0, 1].legend()
            axes[0, 1].grid(True, axis='y')
        
        # 请求成功率
        if "stats" in data:
            success_rate = []
            for _, row in df_stats.iterrows():
                total = row["Request Count"]
                failures = row["Failure Count"]
                success = total - failures
                rate = (success / total * 100) if total > 0 else 0
                success_rate.append(rate)
            
            axes[1, 0].bar(endpoints, success_rate)
            axes[1, 0].set_title("请求成功率")
            axes[1, 0].set_xticklabels(endpoints, rotation=45, ha="right")
            axes[1, 0].set_ylabel("成功率(%)")
            axes[1, 0].axhline(y=99, color='r', linestyle='--', alpha=0.5, label="99% SLA")
            axes[1, 0].legend()
            axes[1, 0].grid(True, axis='y')
        
        # RPS随时间变化
        if "responses" in data:
            df_responses = data["responses"]
            axes[1, 1].plot(df_responses["Timestamp"], df_responses["Requests/s"])
            axes[1, 1].set_title("每秒请求数(RPS)")
            axes[1, 1].set_xlabel("时间")
            axes[1, 1].set_ylabel("RPS")
            axes[1, 1].grid(True)
        
        plt.tight_layout()
        plt.savefig(f"{self.csv_prefix}_charts.png", dpi=300)
        plt.show()
    
    def generate_report(self, analysis):
        """生成测试报告"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_requests": analysis["total_requests"],
                "total_failures": analysis["total_failures"],
                "failure_rate": f"{analysis['failure_rate']:.2f}%",
                "avg_response_time": f"{analysis['avg_response_time']:.2f}ms",
                "requests_per_second": f"{analysis['requests_per_second']:.2f}"
            },
            "sla_check": {
                "response_time_under_500ms": analysis["avg_response_time"] < 500,
                "failure_rate_under_1%": analysis["failure_rate"] < 1,
                "p95_under_1000ms": analysis.get("p95_response_time", 0) < 1000 if analysis.get("p95_response_time") else "N/A"
            },
            "endpoint_performance": analysis["endpoints"]
        }
        
        # 保存报告
        report_file = f"{self.csv_prefix}_analysis.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"📋 分析报告已保存到: {report_file}")
        return report

def main():
    monitor = LoadTestMonitor(csv_prefix="results/stats")
    
    print("📊 加载测试数据...")
    data = monitor.load_csv_data()
    
    print("📈 分析性能指标...")
    analysis = monitor.analyze_performance(data)
    
    if analysis:
        print("\n" + "="*60)
        print("性能分析结果")
        print("="*60)
        print(f"总请求数: {analysis['total_requests']}")
        print(f"总失败数: {analysis['total_failures']}")
        print(f"失败率: {analysis['failure_rate']:.2f}%")
        print(f"平均响应时间: {analysis['avg_response_time']:.2f}ms")
        print(f"中位数响应时间: {analysis['median_response_time']:.2f}ms")
        print(f"最大响应时间: {analysis['max_response_time']:.2f}ms")
        print(f"最小响应时间: {analysis['min_response_time']:.2f}ms")
        print(f"平均RPS: {analysis['requests_per_second']:.2f}")
        
        if analysis.get("p95_response_time"):
            print(f"P95响应时间: {analysis['p95_response_time']:.2f}ms")
        if analysis.get("p99_response_time"):
            print(f"P99响应时间: {analysis['p99_response_time']:.2f}ms")
        
        print("\n端点性能详情:")
        for endpoint, stats in analysis["endpoints"].items():
            print(f"  {endpoint}:")
            print(f"    请求数: {stats['requests']}")
            print(f"    失败数: {stats['failures']}")
            print(f"    平均响应: {stats['avg_response_time']:.2f}ms")
            print(f"    中位数响应: {stats['median_response_time']:.2f}ms")
            print(f"    RPS: {stats['rps']:.2f}")
    
    # 生成图表
    print("\n📈 生成性能图表...")
    monitor.plot_metrics(data)
    
    # 生成报告
    print("\n📋 生成分析报告...")
    report = monitor.generate_report(analysis)
    
    # SLA检查
    print("\n🔍 SLA合规性检查:")
    sla = report["sla_check"]
    for check, passed in sla.items():
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"  {check}: {status}")

if __name__ == "__main__":
    main()
```

## **6. 最佳实践建议**

### **LoadTestShape设计原则**
1. **渐进式爬坡**：避免瞬间压力冲击
2. **平稳期观察**：保持稳定负载观察系统表现
3. **峰值测试**：测试系统极限承载能力
4. **恢复测试**：观察压力下降后的系统恢复
5. **真实模拟**：根据业务特点设计负载模式

### **执行流程**
```bash
# 1. 准备环境
mkdir -p results
pip install locust matplotlib pandas

# 2. 修改配置
# 编辑 loadtest_shape_demo.py，修改 APIUser.host 为目标地址

# 3. 运行测试
python run_tests.py --host=http://your-api.com --tests production_simulation

# 4. 监控结果
# 实时查看日志，或使用Web界面（非headless模式）

# 5. 分析结果
python monitor_results.py
```

### **关键配置参数**
- `wait_time`: 控制请求间隔，影响RPS
- `catch_response`: 用于自定义响应处理
- `timeout`: 设置请求超时时间
- `name`: 为请求命名，便于统计
- `weight`: 任务权重，控制执行频率

这个完整示例提供了从脚本编写、测试执行到结果分析的完整流程，适合生产环境使用。