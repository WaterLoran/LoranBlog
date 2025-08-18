# 在 Airflow 中判断任务成功与运行 pytest 脚本的完整指南

## 一、如何判断 Airflow 任务是否成功

### 1. 任务状态判断机制
Airflow 使用状态机管理任务状态，关键状态包括：
- `success`: 任务成功完成
- `failed`: 任务执行失败
- `upstream_failed`: 上游任务失败
- `skipped`: 任务被跳过
- `running`: 任务执行中
- `queued`: 任务排队中

### 2. 判断任务成功的核心方法

#### (1) 通过 Web UI 查看
![Airflow UI 状态展示](https://airflow.apache.org/docs/apache-airflow/stable/_images/graph.png)
- 绿色任务：成功状态
- 任务详情页显示 "Status: success"

#### (2) 通过命令行检查
```bash
# 检查特定任务状态
airflow tasks state <dag_id> <task_id> <execution_date>

# 示例：检查2023-01-01运行的my_dag中process_data任务
airflow tasks state my_dag process_data 2023-01-01T00:00:00+00:00
# 输出：success
```

#### (3) 编程方式验证
```python
from airflow.api.client.local_client import Client

c = Client(None, None)
task_status = c.get_task_instance(
    dag_id="my_dag",
    task_id="my_task",
    execution_date="2023-01-01T00:00:00+00:00"
).state

if task_status == "success":
    print("任务成功完成")
```

### 3. 任务成功的判定标准
1. **操作符执行**：Operator 的 `execute()` 方法正常返回（无异常退出）
2. **退出代码**：BashOperator/PythonOperator 返回值为0或None
3. **回调函数**：未触发任何失败回调
4. **依赖关系**：所有上游任务成功完成

### 4. 高级成功检测模式
```python
from airflow.models import TaskInstance
from airflow.utils.state import State

def custom_success_logic(context):
    ti: TaskInstance = context['ti']
    
    # 检查日志中特定关键字
    if "Validation passed" not in ti.log_filepath.read_text():
        raise ValueError("验证未通过")
    
    # 检查输出文件是否存在
    if not Path("/data/output.csv").exists():
        raise FileNotFoundError("输出文件缺失")
    
    return True

with DAG(...) as dag:
    task = PythonOperator(
        task_id="data_processing",
        python_callable=process_data,
        on_success_callback=custom_success_logic
    )
```

## 二、在 Airflow 中运行 pytest 脚本

### 1. 推荐方法：使用 BashOperator
这是最简单直接的方式：

```python
from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime

with DAG(
    dag_id="pytest_runner",
    start_date=datetime(2023, 1, 1),
    schedule_interval="@daily"
) as dag:
    
    run_tests = BashOperator(
        task_id="run_pytest",
        bash_command="""
        # 激活虚拟环境（如果需要）
        source /path/to/venv/bin/activate
        
        # 运行pytest并生成JUnit XML报告
        pytest /path/to/tests \
          --junitxml=/airflow/reports/pytest_{{ ds }}.xml \
          -v
        """,
        # 确保非零退出码标记为失败
        retries=0
    )
```

### 2. 高级方法：使用 PythonOperator
提供更精细的控制：

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
import pytest
import os

def run_pytest(**context):
    # 设置环境变量
    os.environ["AIRFLOW_RUN_ID"] = context["run_id"]
    
    # 执行pytest
    exit_code = pytest.main([
        "/path/to/tests",
        f"--junitxml=/airflow/reports/pytest_{context['ds']}.xml",
        "-v"
    ])
    
    # 非零退出码抛出异常
    if exit_code != 0:
        raise RuntimeError(f"pytest failed with code {exit_code}")

with DAG(...) as dag:
    test_task = PythonOperator(
        task_id="pytest_tests",
        python_callable=run_pytest,
        provide_context=True
    )
```

### 3. 集成测试报告到 Airflow

#### (1) 使用 XCom 传递测试结果
```python
def run_pytest(**context):
    # 收集测试结果
    reporter = pytest.main([...], plugins=[_create_custom_reporter()])
    
    # 通过XCom传递结果
    context["ti"].xcom_push(key="pytest_results", value=reporter.stats)

# 下游任务使用结果
def generate_report(**context):
    stats = context["ti"].xcom_pull(task_ids="pytest_tests", key="pytest_results")
    # 生成报告...
```

#### (2) 在 Airflow UI 中显示报告
1. 生成 JUnit XML 报告：
   ```bash
   pytest --junitxml=test-results.xml
   ```
2. 使用 `xunit` 插件在 UI 中显示：
   ```python
   run_tests = BashOperator(
       task_id="run_pytest",
       bash_command="pytest --junitxml=/tmp/pytest.xml",
       # 将报告推送到XCom
       do_xcom_push=True,
       # 注册xunit插件
       executor_config={"xunit": "/tmp/pytest.xml"}
   )
   ```

### 4. 最佳实践配置

#### (1) 虚拟环境管理
```python
BashOperator(
    task_id="run_in_venv",
    bash_command="""
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    pytest tests/
    """
)
```

#### (2) 并行测试执行
```python
BashOperator(
    task_id="parallel_tests",
    bash_command="pytest -n auto tests/"  # 使用pytest-xdist
)
```

#### (3) 测试隔离与清理
```python
from airflow.providers.docker.operators.docker import DockerOperator

test_task = DockerOperator(
    task_id="docker_pytest",
    image="python:3.9-slim",
    command="pytest /tests",
    volumes=["/host/tests:/tests"],
    auto_remove=True
)
```

### 5. 完整 DAG 示例
```python
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.operators.dummy import DummyOperator
from datetime import datetime
import requests

def notify_slack(context):
    if context["ti"].state == "success":
        message = f":white_check_mark: Tests passed for {context['ds']}"
    else:
        message = f":x: Tests FAILED for {context['ds']}"
    
    requests.post(
        "https://hooks.slack.com/services/...",
        json={"text": message}
    )

with DAG(
    dag_id="ci_cd_pipeline",
    start_date=datetime(2023, 1, 1),
    schedule_interval="@daily",
    catchup=False,
    default_args={
        "on_failure_callback": notify_slack,
        "on_success_callback": notify_slack
    }
) as dag:
    
    start = DummyOperator(task_id="start")
    
    unit_tests = BashOperator(
        task_id="unit_tests",
        bash_command="pytest tests/unit --junitxml=reports/unit-{{ ds }}.xml"
    )
    
    integration_tests = BashOperator(
        task_id="integration_tests",
        bash_command="pytest tests/integration --junitxml=reports/integration-{{ ds }}.xml"
    )
    
    performance_tests = PythonOperator(
        task_id="performance_tests",
        python_callable=run_performance_tests
    )
    
    deploy = DummyOperator(task_id="deploy")
    
    start >> [unit_tests, integration_tests] >> performance_tests >> deploy
```

## 三、常见问题解决方案

### 1. 依赖管理问题
**解决方案**：使用虚拟环境或容器
```python
# 使用PythonVirtualenvOperator
from airflow.operators.python import PythonVirtualenvOperator

unit_tests = PythonVirtualenvOperator(
    task_id="unit_tests",
    python_callable=run_pytest,
    requirements=["pytest", "pytest-xdist"],
    system_site_packages=False
)
```

### 2. 测试数据管理
**最佳实践**：
1. 使用 Airflow 变量存储测试配置
   ```python
   from airflow.models import Variable
   
   test_db_url = Variable.get("TEST_DB_URL")
   ```
2. 测试前初始化数据库
   ```python
   init_db = BashOperator(
       task_id="init_test_db",
       bash_command=f"python init_test_db.py --url={test_db_url}"
   )
   ```

### 3. 长时测试处理
**策略**：
```python
# 设置超时时间
performance_tests = BashOperator(
    task_id="long_running_tests",
    bash_command="pytest tests/performance",
    execution_timeout=timedelta(minutes=30)  # 30分钟超时
)

# 使用异步任务队列
from airflow.providers.celery.operators.celery import CeleryOperator

celery_test_task = CeleryOperator(
    task_id="async_tests",
    celery_command="pytest tests/async",
    queue="long_tasks"
)
```

## 四、监控与告警

### 1. 测试覆盖率报告
```python
BashOperator(
    task_id="test_with_coverage",
    bash_command="""
    coverage run -m pytest tests/
    coverage xml -o coverage.xml
    coverage report
    """
)
```

### 2. 测试结果分析
```python
def analyze_test_results(**context):
    from junitparser import JUnitXml
    
    xml = JUnitXml.fromfile(f"reports/pytest_{context['ds']}.xml")
    failures = sum(suite.failures for suite in xml)
    
    if failures > 0:
        error_msg = f"{failures} tests failed!"
        # 发送详细报告到Slack/邮件
        # ...
        raise ValueError(error_msg)
```

### 3. 集成到质量门禁
```python
def quality_gate(**context):
    coverage = float(context["ti"].xcom_pull(task_ids="coverage_report"))
    test_pass_rate = float(context["ti"].xcom_pull(task_ids="test_analysis"))
    
    if coverage < 80 or test_pass_rate < 95:
        raise ValueError("质量门禁未通过")
```

## 总结：最佳实践路线图

1. **简单场景**：使用 BashOperator 直接运行 pytest
   ```bash
   pytest /path/to/tests
   ```

2. **中等复杂度**：结合虚拟环境和报告生成
   ```bash
   source .venv/bin/activate
   pytest --junitxml=report.xml --cov=myapp tests/
   ```

3. **企业级方案**：
   - 使用 DockerOperator 确保环境一致性
   - 生成 JUnit XML 报告并集成到 Airflow UI
   - 通过 XCom 传递测试结果
   - 实现质量门禁检查
   - 设置 Slack/Teams 实时通知
   - 历史结果存储到 S3/GCS

4. **高级优化**：
   ```python
   # 动态测试选择
   test_selection = (
       "tests/unit" 
       if context["execution_date"].weekday() < 5 
       else "tests/integration"
   )
   
   BashOperator(
       bash_command=f"pytest {test_selection}"
   )
   ```

通过以上方法，您可以在 Airflow 中高效运行 pytest 测试套件，并精确判断任务成功状态，构建完整的 CI/CD 流水线。