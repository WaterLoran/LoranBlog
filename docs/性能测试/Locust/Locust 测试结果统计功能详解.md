# Locust 测试结果统计功能详解

Locust 提供了强大而灵活的测试结果统计功能，支持实时监控、详细报告生成和自定义指标收集。下面全面介绍 Locust 的统计功能和使用方法。

## 📊 实时统计监控

### 1. Web UI 实时统计界面

Locust 的 Web 界面提供丰富的实时统计信息：

```python
# 示例测试脚本用于展示统计功能
from locust import HttpUser, task, between
import random

class StatsDemoUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://httpbin.org"
    
    @task(3)
    def get_status(self):
        status_codes = [200, 404, 500]
        code = random.choice(status_codes)
        self.client.get(f"/status/{code}", name="/status/[code]")
    
    @task(2)
    def get_delay(self):
        delay = random.randint(1, 5)
        self.client.get(f"/delay/{delay}", name="/delay/[seconds]")
    
    @task(1)
    def post_data(self):
        self.client.post("/post", json={"test": "data"}, name="/post")
```

访问 `http://localhost:8089` 可以看到：

- **Statistics 标签页**：请求级别的详细统计
- **Charts 标签页**：实时图表展示
- **Failures 标签页**：失败请求详情
- **Exceptions 标签页**：异常信息
- **Download Data**：下载测试数据

### 2. 统计指标说明

**Statistics 表格包含以下关键指标：**

| 指标                   | 说明                     |
| ---------------------- | ------------------------ |
| **Type**               | 请求类型 (GET/POST等)    |
| **Name**               | 请求名称（支持名称分组） |
| **# Requests**         | 总请求数                 |
| **# Fails**            | 失败请求数               |
| **Median**             | 响应时间中位数           |
| **90%ile**             | 90% 请求的响应时间       |
| **95%ile**             | 95% 请求的响应时间       |
| **99%ile**             | 99% 请求的响应时间       |
| **Average**            | 平均响应时间             |
| **Min**                | 最小响应时间             |
| **Max**                | 最大响应时间             |
| **Average Size**       | 平均响应大小             |
| **Current RPS**        | 当前每秒请求数           |
| **Current Failures/s** | 当前每秒失败数           |

## 💾 统计报告导出

### 1. CSV 报告生成

```bash
# 生成 CSV 报告文件
locust -f stats_demo.py --headless --users 10 --spawn-rate 1 --run-time 30s --csv=test_results

# 生成的文件：
# test_results_stats.csv      # 统计摘要
# test_results_stats_history.csv # 历史统计数据
# test_results_failures.csv   # 失败记录
# test_results_exceptions.csv # 异常记录
```

**CSV 文件内容示例：**
```csv
Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%
GET,/status/[code],150,50,210,245,120,890,145,5.0,1.67,210,280,320,350,420,480,520,550,600,620,890
POST,/post,50,2,180,195,130,450,230,1.67,0.07,180,210,240,260,300,330,380,400,420,440,450
```

### 2. HTML 报告

```bash
# 生成 HTML 报告
locust -f stats_demo.py --headless --users 100 --spawn-rate 10 --run-time 1m --html=report.html
```

### 3. JSON 格式统计

```bash
# 生成 JSON 格式的统计数据
locust -f stats_demo.py --headless --users 10 --run-time 10s --json --json-save=stats.json
```

## 🔧 自定义统计功能

### 1. 自定义指标收集

```python
from locust import HttpUser, task, between, events
import time
import statistics

class CustomMetricsCollector:
    def __init__(self):
        self.response_times = []
        self.slow_requests = 0
        self.custom_metrics = {}
        
    @events.request_success.add_listener
    def on_request_success(self, request_type, name, response_time, response_length, **kwargs):
        # 收集响应时间
        self.response_times.append(response_time)
        
        # 统计慢请求
        if response_time > 1000:
            self.slow_requests += 1
            
        # 按端点分组统计
        if name not in self.custom_metrics:
            self.custom_metrics[name] = []
        self.custom_metrics[name].append(response_time)
    
    @events.test_stop.add_listener
    def on_test_stop(self, environment, **kwargs):
        """测试结束时生成自定义报告"""
        if self.response_times:
            print(f"\n📊 自定义统计报告:")
            print(f"   总请求数: {len(self.response_times)}")
            print(f"   平均响应时间: {statistics.mean(self.response_times):.2f}ms")
            print(f"   响应时间标准差: {statistics.stdev(self.response_times):.2f}ms")
            print(f"   慢请求数 (>1000ms): {self.slow_requests}")
            print(f"   慢请求比例: {(self.slow_requests/len(self.response_times)*100):.2f}%")
            
            # 各端点统计
            for endpoint, times in self.custom_metrics.items():
                avg_time = statistics.mean(times)
                p95 = statistics.quantiles(times, n=100)[94]
                print(f"   {endpoint}: 平均{avg_time:.2f}ms, P95={p95:.2f}ms")

# 初始化自定义指标收集器
metrics = CustomMetricsCollector()
```

### 2. 响应时间分桶统计

```python
from locust import events
from collections import defaultdict

class ResponseTimeBuckets:
    def __init__(self):
        self.buckets = defaultdict(int)
        self.bucket_ranges = [
            (0, 100), (100, 200), (200, 500), 
            (500, 1000), (1000, 2000), (2000, float('inf'))
        ]
    
    @events.request_success.add_listener
    def bucket_response_time(self, request_type, name, response_time, response_length, **kwargs):
        for min_time, max_time in self.bucket_ranges:
            if min_time <= response_time < max_time:
                self.buckets[(min_time, max_time)] += 1
                break
    
    @events.test_stop.add_listener
    def print_bucket_stats(self, environment, **kwargs):
        print("\n📈 响应时间分布:")
        total_requests = sum(self.buckets.values())
        for bucket, count in sorted(self.buckets.items()):
            percentage = (count / total_requests * 100) if total_requests > 0 else 0
            print(f"   {bucket[0]}-{bucket[1]}ms: {count} 请求 ({percentage:.1f}%)")

buckets = ResponseTimeBuckets()
```

### 3. 业务指标统计

```python
class BusinessMetrics:
    def __init__(self):
        self.transactions = {
            'login_success': 0,
            'login_failure': 0,
            'purchase_success': 0,
            'purchase_failure': 0
        }
        self.revenue = 0
        
    def record_login(self, success=True):
        if success:
            self.transactions['login_success'] += 1
        else:
            self.transactions['login_failure'] += 1
    
    def record_purchase(self, amount, success=True):
        if success:
            self.transactions['purchase_success'] += 1
            self.revenue += amount
        else:
            self.transactions['purchase_failure'] += 1
    
    @events.test_stop.add_listener
    def print_business_report(self, environment, **kwargs):
        print("\n💰 业务指标报告:")
        total_logins = self.transactions['login_success'] + self.transactions['login_failure']
        login_success_rate = (self.transactions['login_success'] / total_logins * 100) if total_logins > 0 else 0
        
        total_purchases = self.transactions['purchase_success'] + self.transactions['purchase_failure']
        purchase_success_rate = (self.transactions['purchase_success'] / total_purchases * 100) if total_purchases > 0 else 0
        
        print(f"   登录成功率: {login_success_rate:.1f}%")
        print(f"   购买成功率: {purchase_success_rate:.1f}%")
        print(f"   总营收: ${self.revenue:.2f}")
        print(f"   平均订单价值: ${self.revenue/self.transactions['purchase_success']:.2f}" if self.transactions['purchase_success'] > 0 else "   平均订单价值: $0.00")

business_metrics = BusinessMetrics()

class EcommerceUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://api.example.com"
    
    @task
    def login(self):
        response = self.client.post("/login", json={
            "username": "test", 
            "password": "password"
        })
        if response.status_code == 200:
            business_metrics.record_login(success=True)
        else:
            business_metrics.record_login(success=False)
    
    @task
    def purchase(self):
        order_amount = random.randint(10, 100)
        response = self.client.post("/purchase", json={
            "amount": order_amount,
            "product_id": random.randint(1, 10)
        })
        if response.status_code == 200:
            business_metrics.record_purchase(order_amount, success=True)
        else:
            business_metrics.record_purchase(order_amount, success=False)
```

## 📈 高级统计功能

### 1. 实时统计数据处理

```python
import json
import requests
from locust import events
from threading import Thread
import time

class RealTimeStatsProcessor:
    def __init__(self, dashboard_url=None):
        self.dashboard_url = dashboard_url
        self.stats_buffer = []
        self.running = False
        
    def start_realtime_processing(self):
        """启动实时统计处理线程"""
        self.running = True
        self.process_thread = Thread(target=self._process_stats)
        self.process_thread.daemon = True
        self.process_thread.start()
    
    def _process_stats(self):
        """实时处理统计数据的后台线程"""
        while self.running:
            if self.stats_buffer:
                stats = self.stats_buffer.pop(0)
                self._send_to_dashboard(stats)
                self._check_alerts(stats)
            time.sleep(5)  # 每5秒处理一次
    
    @events.request_success.add_listener
    @events.request_failure.add_listener
    def collect_realtime_stats(self, **kwargs):
        """收集实时统计数据"""
        current_stats = {
            'timestamp': time.time(),
            'metrics': kwargs
        }
        self.stats_buffer.append(current_stats)
    
    def _send_to_dashboard(self, stats):
        """发送统计数据到监控面板"""
        if self.dashboard_url:
            try:
                requests.post(self.dashboard_url, 
                            json=stats, 
                            timeout=2)
            except Exception as e:
                print(f"发送到监控面板失败: {e}")
    
    def _check_alerts(self, stats):
        """检查统计警报"""
        response_time = stats['metrics'].get('response_time', 0)
        if response_time > 5000:  # 5秒阈值
            self._trigger_alert(f"高响应时间警报: {response_time}ms")
    
    def _trigger_alert(self, message):
        """触发警报"""
        print(f"🚨 {message}")
        # 可以集成到 Slack、邮件、短信等通知系统

# 使用实时统计处理器
realtime_processor = RealTimeStatsProcessor()
realtime_processor.start_realtime_processing()
```

### 2. 分布式统计聚合

```python
from locust import events
import redis
import json

class DistributedStatsAggregator:
    def __init__(self, redis_host='localhost', redis_port=6379):
        self.redis = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        self.stats_key = "locust:stats"
        
    @events.init.add_listener
    def setup_distributed_stats(self, environment, **kwargs):
        """设置分布式统计"""
        if environment.parsed_options.master:
            # Master 节点初始化统计
            self.redis.delete(self.stats_key)
        elif environment.parsed_options.worker:
            # Worker 节点设置统计报告
            environment.events.report_to_master.add_listener(self.on_worker_report)
    
    def on_worker_report(self, client_id, data):
        """Worker 向 Master 报告自定义统计"""
        custom_stats = {
            'worker_id': client_id,
            'timestamp': time.time(),
            'custom_metrics': {
                'active_users': len(self.get_active_users()),
                'cache_hit_rate': self.calculate_cache_hit_rate()
            }
        }
        data['custom_stats'] = custom_stats
    
    @events.worker_report.add_listener
    def on_worker_report_receive(self, client_id, data):
        """Master 接收 Worker 报告"""
        if 'custom_stats' in data:
            # 存储 Worker 统计
            worker_stats = data['custom_stats']
            self.redis.hset(self.stats_key, client_id, json.dumps(worker_stats))
            
            # 聚合所有 Worker 统计
            self.aggregate_worker_stats()
    
    def aggregate_worker_stats(self):
        """聚合所有 Worker 的统计"""
        all_stats = self.redis.hgetall(self.stats_key)
        aggregated = {
            'total_workers': len(all_stats),
            'aggregated_metrics': {},
            'timestamp': time.time()
        }
        
        for worker_id, stats_json in all_stats.items():
            stats = json.loads(stats_json)
            for metric, value in stats.get('custom_metrics', {}).items():
                if metric not in aggregated['aggregated_metrics']:
                    aggregated['aggregated_metrics'][metric] = []
                aggregated['aggregated_metrics'][metric].append(value)
        
        # 计算聚合值（平均值）
        for metric, values in aggregated['aggregated_metrics'].items():
            aggregated['aggregated_metrics'][f"{metric}_avg"] = sum(values) / len(values)
        
        print(f"📊 分布式统计聚合: {aggregated}")

# 初始化分布式统计聚合器
distributed_stats = DistributedStatsAggregator()
```

### 3. 统计数据分析与可视化

```python
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime

class StatsAnalyzer:
    def __init__(self):
        self.historical_data = []
    
    def load_stats_from_csv(self, csv_file):
        """从 CSV 文件加载统计数据"""
        df = pd.read_csv(csv_file)
        return df
    
    def analyze_performance_trends(self, stats_df):
        """分析性能趋势"""
        print("\n📈 性能趋势分析:")
        
        # 计算关键指标
        total_requests = stats_df['Request Count'].sum()
        total_failures = stats_df['Failure Count'].sum()
        failure_rate = (total_failures / total_requests * 100) if total_requests > 0 else 0
        
        avg_response_time = stats_df['Average Response Time'].mean()
        p95_response_time = stats_df['95%ile'].mean()
        
        print(f"   总请求数: {total_requests}")
        print(f"   失败率: {failure_rate:.2f}%")
        print(f"   平均响应时间: {avg_response_time:.2f}ms")
        print(f"   P95响应时间: {p95_response_time:.2f}ms")
        
        # 识别性能瓶颈
        slow_endpoints = stats_df[stats_df['Average Response Time'] > 1000]
        if not slow_endpoints.empty:
            print("\n⚠️  慢端点识别:")
            for _, endpoint in slow_endpoints.iterrows():
                print(f"   {endpoint['Name']}: {endpoint['Average Response Time']:.2f}ms")
    
    def create_performance_report(self, stats_files):
        """创建性能报告"""
        plt.style.use('seaborn-v0_8')
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle('Locust 性能测试报告', fontsize=16)
        
        # 加载并分析每个测试的数据
        for i, stats_file in enumerate(stats_files):
            df = self.load_stats_from_csv(stats_file)
            test_name = f"Test {i+1}"
            
            # 响应时间分布
            axes[0, 0].bar([f"{test_name}\n{row['Name'][:15]}" for _, row in df.iterrows()], 
                          df['Average Response Time'], label=test_name, alpha=0.7)
            axes[0, 0].set_title('平均响应时间')
            axes[0, 0].tick_params(axis='x', rotation=45)
            
            # 失败率
            failure_rates = (df['Failure Count'] / df['Request Count'] * 100).fillna(0)
            axes[0, 1].bar([f"{test_name}\n{row['Name'][:15]}" for _, row in df.iterrows()], 
                          failure_rates, label=test_name, alpha=0.7)
            axes[0, 1].set_title('失败率 (%)')
            axes[0, 1].tick_params(axis='x', rotation=45)
            
            # 请求量分布
            axes[1, 0].pie(df['Request Count'], labels=df['Name'], autopct='%1.1f%%')
            axes[1, 0].set_title('请求量分布')
            
            # 响应时间百分位
            percentiles = ['50%', '90%', '95%', '99%']
            p_values = [df['Median Response Time'].mean(), 
                       df['90%ile'].mean(), 
                       df['95%ile'].mean(), 
                       df['99%ile'].mean()]
            axes[1, 1].bar(percentiles, p_values)
            axes[1, 1].set_title('响应时间百分位')
        
        plt.tight_layout()
        plt.savefig('performance_report.png', dpi=300, bbox_inches='tight')
        plt.show()

# 使用统计分析器
analyzer = StatsAnalyzer()

@events.test_stop.add_listener
def on_test_stop_analysis(environment, **kwargs):
    """测试结束时进行统计分析"""
    # 这里可以自动加载最新生成的 CSV 文件进行分析
    csv_files = ["test_results_stats.csv"]  # 实际使用时动态获取
    for csv_file in csv_files:
        try:
            df = analyzer.load_stats_from_csv(csv_file)
            analyzer.analyze_performance_trends(df)
        except FileNotFoundError:
            print(f"统计文件 {csv_file} 未找到")
```

## ⚙️ 统计配置选项

### 1. 命令行统计选项

```bash
# 完整的统计相关命令行选项
locust -f locustfile.py \
  --headless \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --csv=results \           # CSV 文件前缀
  --csv-full-history \      # 保存完整历史统计
  --html=report.html \      # HTML 报告
  --json \                  # 启用 JSON 输出
  --json-save=stats.json \  # 保存 JSON 统计
  --print-stats \           # 控制台打印统计
  --only-summary \          # 只显示摘要
  --reset-stats \           # 重置统计（分布式模式）
  --expect-workers=4        # 期望的 Worker 数量
```

### 2. 统计重置和控制

```python
from locust import events
from locust.runners import MasterRunner, WorkerRunner

class StatsController:
    def __init__(self):
        self.test_phases = []
        self.current_phase = 0
    
    @events.test_start.add_listener
    def on_test_start(self, environment, **kwargs):
        """测试开始时重置统计"""
        if isinstance(environment.runner, MasterRunner):
            print("🧹 重置统计信息...")
            # Master 节点可以控制统计重置
            environment.runner.stats.clear_all()
    
    def start_new_phase(self, phase_name, users, spawn_rate):
        """开始新的测试阶段"""
        self.current_phase += 1
        self.test_phases.append({
            'name': phase_name,
            'users': users,
            'spawn_rate': spawn_rate,
            'start_time': time.time()
        })
        print(f"🔁 开始测试阶段: {phase_name}")

stats_controller = StatsController()
```

## 🎯 统计功能最佳实践

### 1. 生产环境统计配置

```python
# production_stats.py
from locust import HttpUser, task, between, events
import logging
import sys

class ProductionStatsConfig:
    def __init__(self):
        self.setup_logging()
        self.setup_stats_handlers()
    
    def setup_logging(self):
        """配置统计日志"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('locust_stats.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger('locust_stats')
    
    def setup_stats_handlers(self):
        """设置统计处理器"""
        @events.request_success.add_listener
        def log_success(request_type, name, response_time, response_length, **kwargs):
            if response_time > 1000:  # 只记录慢请求
                self.logger.info(f"慢请求: {name} - {response_time}ms")
        
        @events.request_failure.add_listener  
        def log_failure(request_type, name, response_time, exception, **kwargs):
            self.logger.warning(f"请求失败: {name} - {exception}")
        
        @events.test_stop.add_listener
        def final_stats_report(environment, **kwargs):
            stats = environment.stats
            total = stats.total
            
            report = f"""
🎯 测试完成报告:
   总请求数: {total.num_requests}
   失败请求: {total.num_failures}
   失败率: {(total.num_failures/total.num_requests*100):.2f}%
   平均响应时间: {total.avg_response_time:.2f}ms
   最大响应时间: {total.max_response_time}ms
   总RPS: {total.total_rps:.2f}
            """
            self.logger.info(report)

# 应用生产环境统计配置
prod_stats = ProductionStatsConfig()
```

### 2. 性能阈值监控

```python
class PerformanceThresholds:
    def __init__(self):
        self.thresholds = {
            'max_avg_response_time': 500,     # 平均响应时间上限
            'max_p95_response_time': 1000,    # P95响应时间上限  
            'max_failure_rate': 1.0,          # 失败率上限 (%)
            'min_rps': 50                     # 最低 RPS
        }
        self.violations = []
    
    @events.request.add_listener
    def check_thresholds(self, request_type, name, response_time, response_length, exception, **kwargs):
        """检查性能阈值"""
        # 这里可以实时监控阈值
        pass
    
    @events.test_stop.add_listener
    def final_threshold_check(self, environment, **kwargs):
        """最终阈值检查"""
        stats = environment.stats.total
        
        # 检查各项阈值
        if stats.avg_response_time > self.thresholds['max_avg_response_time']:
            self.violations.append(f"平均响应时间 {stats.avg_response_time:.2f}ms 超过阈值 {self.thresholds['max_avg_response_time']}ms")
        
        failure_rate = (stats.num_failures / stats.num_requests * 100) if stats.num_requests > 0 else 0
        if failure_rate > self.thresholds['max_failure_rate']:
            self.violations.append(f"失败率 {failure_rate:.2f}% 超过阈值 {self.thresholds['max_failure_rate']}%")
        
        if stats.total_rps < self.thresholds['min_rps']:
            self.violations.append(f"RPS {stats.total_rps:.2f} 低于阈值 {self.thresholds['min_rps']}")
        
        # 输出阈值检查结果
        if self.violations:
            print("❌ 性能阈值违反:")
            for violation in self.violations:
                print(f"   - {violation}")
            # 可以在这里触发警报或使测试失败
        else:
            print("✅ 所有性能指标符合要求")

threshold_monitor = PerformanceThresholds()
```

## 📋 总结

Locust 的统计功能提供了：

1. **实时监控**：Web UI 实时展示关键指标
2. **多种报告格式**：CSV、HTML、JSON 等格式的报告
3. **自定义指标**：灵活收集业务相关指标
4. **分布式统计**：支持多节点统计聚合
5. **数据分析**：强大的数据分析和可视化能力
6. **阈值监控**：性能指标阈值检查和警报

通过这些功能，你可以全面掌握系统性能表现，快速定位性能瓶颈，并生成专业的测试报告。合理利用 Locust 的统计功能，可以大大提高性能测试的效率和质量。