# Locust 实时监控单个请求的 RT 和 TPS 曲线图

Locust 默认的 Web UI 提供了基础的监控，但对于详细的单个请求实时 RT 和 TPS 曲线图，需要结合其他工具或自定义实现。以下是几种解决方案：

## 1. Locust 默认 Web UI 的局限性

**默认 Web UI 提供：**
- 聚合的响应时间图表（所有请求混合）
- 总 RPS 图表
- 每个请求类型的统计表格，但没有实时曲线图

## 2. 使用 Locust 的 CSV 数据 + 实时图表工具

### 方案1：实时解析 CSV + Matplotlib

```python
from locust import HttpUser, task, between
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from datetime import datetime
import threading
import time

class MonitoredUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def fast_endpoint(self):
        self.client.get("/api/fast", name="fast_api")
    
    @task(2)
    def medium_endpoint(self):
        self.client.get("/api/medium", name="medium_api")
    
    @task(1)
    def slow_endpoint(self):
        self.client.get("/api/slow", name="slow_api")

# 实时图表监控类
class RealTimeMonitor:
    def __init__(self, csv_file="results_stats_history.csv"):
        self.csv_file = csv_file
        self.fig, self.axes = plt.subplots(2, 1, figsize=(12, 8))
        self.setup_plots()
        
    def setup_plots(self):
        """初始化图表"""
        # RT 图表
        self.axes[0].set_title('Real-time Response Time by Endpoint')
        self.axes[0].set_ylabel('Response Time (ms)')
        self.axes[0].grid(True)
        self.axes[0].legend()
        
        # TPS 图表
        self.axes[1].set_title('Real-time TPS by Endpoint')
        self.axes[1].set_ylabel('Requests per Second')
        self.axes[1].set_xlabel('Time')
        self.axes[1].grid(True)
        self.axes[1].legend()
    
    def update_plots(self, frame):
        """更新图表数据"""
        try:
            # 读取最新的 CSV 数据
            df = pd.read_csv(self.csv_file)
            df['Timestamp'] = pd.to_datetime(df['Timestamp'])
            
            # 清空当前图表
            self.axes[0].clear()
            self.axes[1].clear()
            
            # 按端点分组绘制
            endpoints = df['Name'].unique()
            colors = plt.cm.Set3(range(len(endpoints)))
            
            for i, endpoint in enumerate(endpoints):
                endpoint_data = df[df['Name'] == endpoint]
                
                # 绘制响应时间
                self.axes[0].plot(endpoint_data['Timestamp'], 
                                endpoint_data['Average Response Time'], 
                                label=endpoint, color=colors[i], linewidth=2)
                
                # 绘制 TPS
                self.axes[1].plot(endpoint_data['Timestamp'], 
                                endpoint_data['Current RPS'], 
                                label=endpoint, color=colors[i], linewidth=2)
            
            # 重新设置图表属性
            self.setup_plots()
            
        except Exception as e:
            print(f"Error updating plots: {e}")
    
    def start_monitoring(self):
        """启动实时监控"""
        ani = animation.FuncAnimation(self.fig, self.update_plots, interval=2000)
        plt.tight_layout()
        plt.show()

# 在另一个线程中启动监控
def start_realtime_monitor():
    monitor = RealTimeMonitor()
    monitor.start_monitoring()

# 启动监控线程（在 Locust 启动后运行）
# monitor_thread = threading.Thread(target=start_realtime_monitor, daemon=True)
# monitor_thread.start()
```

### 方案2：使用 Plotly 实现 Web 实时仪表盘

```python
from locust import HttpUser, task, between
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import dash
from dash import dcc, html
from dash.dependencies import Input, Output
import threading
import time

class MonitoredUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def get_users(self):
        self.client.get("/api/users", name="get_users")
    
    @task(2)
    def create_user(self):
        self.client.post("/api/users", json={"name": "test"}, name="create_user")
    
    @task(1)
    def get_orders(self):
        self.client.get("/api/orders", name="get_orders")

# Dash 实时仪表盘
class LiveDashboard:
    def __init__(self):
        self.app = dash.Dash(__name__)
        self.setup_layout()
        self.setup_callbacks()
    
    def setup_layout(self):
        """设置仪表盘布局"""
        self.app.layout = html.Div([
            html.H1("Locust Real-time Monitoring", style={'textAlign': 'center'}),
            
            dcc.Interval(
                id='interval-component',
                interval=2*1000,  # 2秒更新一次
                n_intervals=0
            ),
            
            html.Div([
                dcc.Graph(id='rt-graph'),
                dcc.Graph(id='tps-graph')
            ], style={'columnCount': 1})
        ])
    
    def setup_callbacks(self):
        """设置回调函数"""
        @self.app.callback(
            [Output('rt-graph', 'figure'),
             Output('tps-graph', 'figure')],
            [Input('interval-component', 'n_intervals')]
        )
        def update_graphs(n):
            return self.create_rt_figure(), self.create_tps_figure()
    
    def create_rt_figure(self):
        """创建响应时间图表"""
        try:
            df = pd.read_csv("results_stats_history.csv")
            df['Timestamp'] = pd.to_datetime(df['Timestamp'])
            
            fig = go.Figure()
            
            endpoints = df['Name'].unique()
            for endpoint in endpoints:
                endpoint_data = df[df['Name'] == endpoint]
                fig.add_trace(go.Scatter(
                    x=endpoint_data['Timestamp'],
                    y=endpoint_data['Average Response Time'],
                    name=endpoint,
                    mode='lines+markers'
                ))
            
            fig.update_layout(
                title='Real-time Response Time by Endpoint',
                xaxis_title='Time',
                yaxis_title='Response Time (ms)',
                hovermode='x unified'
            )
            
            return fig
        except Exception as e:
            return go.Figure()
    
    def create_tps_figure(self):
        """创建 TPS 图表"""
        try:
            df = pd.read_csv("results_stats_history.csv")
            df['Timestamp'] = pd.to_datetime(df['Timestamp'])
            
            fig = go.Figure()
            
            endpoints = df['Name'].unique()
            for endpoint in endpoints:
                endpoint_data = df[df['Name'] == endpoint]
                fig.add_trace(go.Scatter(
                    x=endpoint_data['Timestamp'],
                    y=endpoint_data['Current RPS'],
                    name=endpoint,
                    mode='lines+markers'
                ))
            
            fig.update_layout(
                title='Real-time TPS by Endpoint',
                xaxis_title='Time',
                yaxis_title='Requests per Second',
                hovermode='x unified'
            )
            
            return fig
        except Exception as e:
            return go.Figure()
    
    def run(self):
        """运行仪表盘"""
        self.app.run_server(debug=False, port=8050)

# 启动仪表盘
def start_dashboard():
    dashboard = LiveDashboard()
    dashboard.run()

# 在另一个端口运行（避免与 Locust Web UI 冲突）
# dashboard_thread = threading.Thread(target=start_dashboard, daemon=True)
# dashboard_thread.start()
```

## 3. 使用 Locust Plugins + InfluxDB + Grafana（推荐）

### 步骤1：安装必要的包
```bash
pip install locust-plugins influxdb-client grafana-api
```

### 步骤2：配置 Locust 写入 InfluxDB

```python
from locust import HttpUser, task, between
from locust_plugins.listeners import InfluxDbListener
import influxdb_client
from influxdb_client.client.write_api import SYNCHRONOUS

# InfluxDB 配置
influx_config = {
    "url": "http://localhost:8086",
    "token": "your-token-here",
    "org": "your-org",
    "bucket": "locust"
}

# 初始化 InfluxDB 客户端
client = influxdb_client.InfluxDBClient(
    url=influx_config["url"],
    token=influx_config["token"],
    org=influx_config["org"]
)

write_api = client.write_api(write_options=SYNCHRONOUS)

class InfluxDBUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.influx_listener = InfluxDbListener(
            env=self.environment,
            influx_client=client,
            bucket=influx_config["bucket"]
        )
    
    @task(3)
    def search_products(self):
        self.client.get("/api/products/search", name="search_products")
    
    @task(2)
    def get_product_detail(self):
        self.client.get("/api/products/123", name="get_product_detail")
    
    @task(1)
    def create_order(self):
        self.client.post("/api/orders", json={"items": []}, name="create_order")
```

### 步骤3：Grafana 仪表盘配置

在 Grafana 中创建两个面板：

**响应时间面板查询：**
```sql
SELECT 
  mean("response_time") as "avg_rt"
FROM "request_stats" 
WHERE 
  $timeFilter 
  AND "name" =~ /$endpoint/
GROUP BY 
  time(1s), "name"
```

**TPS 面板查询：**
```sql
SELECT 
  count("response_time") as "rps"
FROM "request_stats" 
WHERE 
  $timeFilter 
  AND "name" =~ /$endpoint/
GROUP BY 
  time(1s), "name"
```

## 4. 使用 Prometheus + Grafana

### 方案：自定义指标导出

```python
from locust import HttpUser, task, between, events
from prometheus_client import start_http_server, Counter, Histogram, Gauge
import time

# Prometheus 指标定义
REQUEST_RPS = Counter('locust_requests_total', 
                     'Total requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('locust_request_duration_seconds',
                           'Request duration in seconds', ['method', 'endpoint'])
ACTIVE_USERS = Gauge('locust_active_users', 'Number of active users')
CURRENT_RPS = Gauge('locust_current_rps', 'Current RPS by endpoint', ['endpoint'])

# 启动 Prometheus metrics 服务器
start_http_server(8000)

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, **kwargs):
    # 记录请求指标
    status = 'success' if response.status_code < 400 else 'failure'
    REQUEST_RPS.labels(method=request_type, endpoint=name, status=status).inc()
    REQUEST_DURATION.labels(method=request_type, endpoint=name).observe(response_time / 1000.0)

@events.worker_report.add_listener
def on_worker_report(client_id, data, **kwargs):
    # 更新当前 RPS
    for stats in data['stats']:
        CURRENT_RPS.labels(endpoint=stats['name']).set(stats['current_rps'])

class PrometheusUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def api_health(self):
        self.client.get("/api/health", name="api_health")
    
    @task(2)
    def api_data(self):
        self.client.get("/api/data", name="api_data")
    
    @task(1)
    def api_heavy(self):
        self.client.get("/api/heavy-operation", name="api_heavy")
```

## 5. 实时 WebSocket 仪表盘

```python
from locust import HttpUser, task, between, events
import asyncio
import websockets
import json
import threading
from collections import defaultdict
import time

# 实时数据存储
realtime_data = defaultdict(list)
connected_clients = set()

class WebSocketMonitor:
    def __init__(self, port=8765):
        self.port = port
    
    async def handler(self, websocket):
        connected_clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            connected_clients.remove(websocket)
    
    async def broadcast_stats(self):
        while True:
            if connected_clients:
                # 准备实时数据
                stats = self.get_current_stats()
                message = json.dumps(stats)
                
                # 广播给所有连接的客户端
                disconnected = set()
                for client in connected_clients:
                    try:
                        await client.send(message)
                    except websockets.exceptions.ConnectionClosed:
                        disconnected.add(client)
                
                # 清理断开连接的客户端
                connected_clients -= disconnected
            
            await asyncio.sleep(1)  # 每秒更新一次
    
    def get_current_stats(self):
        """获取当前统计信息"""
        # 这里可以从全局统计中获取数据
        return {
            'timestamp': time.time(),
            'endpoints': [
                {
                    'name': 'endpoint1',
                    'rt': 150,
                    'tps': 25
                },
                # ... 其他端点数据
            ]
        }
    
    def start(self):
        """启动 WebSocket 服务器"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        start_server = websockets.serve(self.handler, "localhost", self.port)
        loop.run_until_complete(start_server)
        loop.run_until_complete(self.broadcast_stats())
        loop.run_forever()

class WSMonitoredUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def various_apis(self):
        self.client.get("/api/v1/endpoint", name="api_v1")
        self.client.get("/api/v2/endpoint", name="api_v2")

# 启动 WebSocket 监控
# ws_monitor = WebSocketMonitor()
# ws_thread = threading.Thread(target=ws_monitor.start, daemon=True)
# ws_thread.start()
```

## 6. 最简单的实时监控方案

如果你想要快速实现，可以使用这个简化版本：

```python
from locust import HttpUser, task, between
import pandas as pd
import plotly.express as px
from datetime import datetime
import threading
import time

class SimpleRealTimeMonitor:
    def __init__(self):
        self.running = True
    
    def monitor_loop(self):
        """监控循环"""
        while self.running:
            try:
                df = pd.read_csv("results_stats_history.csv")
                self.update_display(df)
                time.sleep(2)
            except Exception as e:
                print(f"Monitor error: {e}")
                time.sleep(5)
    
    def update_display(self, df):
        """更新显示"""
        df['Timestamp'] = pd.to_datetime(df['Timestamp'])
        
        # 响应时间图表
        fig_rt = px.line(df, x='Timestamp', y='Average Response Time', 
                        color='Name', title='Real-time Response Time')
        fig_rt.show()
        
        # TPS 图表
        fig_tps = px.line(df, x='Timestamp', y='Current RPS',
                         color='Name', title='Real-time TPS')
        fig_tps.show()
    
    def start(self):
        """启动监控"""
        thread = threading.Thread(target=self.monitor_loop, daemon=True)
        thread.start()
    
    def stop(self):
        """停止监控"""
        self.running = False

class SimpleUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # 启动简单监控
        self.monitor = SimpleRealTimeMonitor()
        self.monitor.start()
    
    @task
    def simple_api(self):
        self.client.get("/api/simple", name="simple_api")

```

## 运行方式

1. **启动 Locust 并生成 CSV：**
```bash
locust -f monitoring_locustfile.py --csv=results --headless -u 10 -r 1 -t 10m
```

2. **选择并启动监控方案：**
   - 方案1：取消注释 Matplotlib 部分
   - 方案2：取消注释 Dash 部分并访问 `http://localhost:8050`
   - 方案3：需要安装 InfluxDB 和 Grafana
   - 方案4：需要安装 Prometheus

## 推荐方案

**对于生产环境：** 方案3（InfluxDB + Grafana）
- 功能最完整
- 可持久化数据
- 专业的监控仪表盘

**对于快速原型：** 方案2（Plotly + Dash）
- 设置简单
- 美观的交互式图表
- 无需额外基础设施

**对于开发调试：** 方案1（Matplotlib）
- 最简单直接
- 无需额外依赖
- 适合快速查看趋势

选择哪种方案取决于你的具体需求：基础设施条件、监控精度要求、团队技术栈等。