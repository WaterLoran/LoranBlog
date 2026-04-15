# 使用GreatExpectation进行不同层次不同维度数据校验的完整示例

使用 Great Expectations (GE) 进行不同层次、不同维度数据校验的完整示例。

GE 的核心概念是 **Expectation Suite**（期望套件），它是一组对数据的断言。通过运行这些断言，可以生成 **Validation Result**（验证结果），报告数据是否符合预期。结合之前聊的量化测试场景，以下是针对五种校验类型的 GE 实战示例。

---

## 一、环境准备

首先安装 GE 并初始化：

```bash
pip install great_expectations
```

创建一个测试数据文件 `trading_data.csv` 作为示例数据：

```python
import pandas as pd

data = {
    'order_id': [1001, 1002, 1003, 1004, 1005],
    'account_id': ['ACC01', 'ACC01', 'ACC02', 'ACC03', 'ACC02'],
    'symbol': ['AAPL', 'AAPL', 'GOOGL', 'AAPL', 'GOOGL'],
    'side': ['BUY', 'BUY', 'SELL', 'BUY', 'SELL'],
    'quantity': [100, 150, 50, 200, 75],
    'price': [150.25, 151.00, 2800.50, 152.50, 2795.00],
    'order_time': ['2024-01-15 09:30:01', '2024-01-15 09:31:15', 
                   '2024-01-15 09:32:00', '2024-01-15 09:33:22', 
                   '2024-01-15 09:34:10'],
    'status': ['FILLED', 'FILLED', 'FILLED', 'REJECTED', 'FILLED'],
    'reject_reason': [None, None, None, 'INSUFFICIENT_FUNDS', None]
}
df = pd.DataFrame(data)
df.to_csv('trading_data.csv', index=False)
```

初始化 GE 并创建数据源：

```python
import great_expectations as gx

# 初始化 Data Context
context = gx.get_context()

# 添加数据源
data_source = context.data_sources.add_pandas_filesystem(
    name="trading_datasource",
    base_directory="."
)

# 添加数据资产
asset = data_source.add_csv_asset(name="trading_asset")

# 创建 Batch Definition 和 Batch
batch_definition = asset.add_batch_definition_whole_dataframe("trading_batch")
batch = batch_definition.get_batch(batch_parameters={"dataframe": df})
```


## 二、数据层比对（Data Consistency）

**业务背景**：交易系统与清算系统的持仓数据必须一致。这里演示如何验证订单表中的 `quantity` 字段值与一个外部参考值（如从清算系统获取）是否匹配。

```python
# 定义清算系统的参考值（实际场景中可从另一数据源读取）
clearing_quantities = {
    1001: 100,   # order_id 1001 清算系统确认的成交数量
    1002: 150,
    1003: 50,
    1004: 0,     # 被拒绝的订单，清算系统成交数量为0
    1005: 75
}

# 创建参考 DataFrame
clearing_df = pd.DataFrame([
    {'order_id': oid, 'clearing_qty': qty} 
    for oid, qty in clearing_quantities.items()
])

# 将清算数据也加入数据源
clearing_asset = data_source.add_dataframe_asset(name="clearing_asset")
clearing_batch_def = clearing_asset.add_batch_definition_whole_dataframe("clearing_batch")
clearing_batch = clearing_batch_def.get_batch(batch_parameters={"dataframe": clearing_df})

# 对交易数据进行验证：订单数量应与清算系统数量一致
# 方式一：直接使用内置 Expectation（需要数据在同一 Batch 中）
# 实际场景中，可以先将两个数据源 Join 后再校验

# 方式二：使用自定义条件（假设两个表已关联）
# 这里先创建合并后的 DataFrame 演示
merged_df = df.merge(clearing_df, on='order_id', how='left')
merged_batch = batch_definition.get_batch(batch_parameters={"dataframe": merged_df})

# 验证：quantity 必须等于 clearing_qty
expectation = gx.expectations.ExpectColumnValuesToMatchOtherColumn(
    column="quantity",
    other_column="clearing_qty"
)
result = merged_batch.validate(expectation)
print(f"数据层比对结果: success={result['success']}")
```

**解释**：
- 将交易系统和清算系统的数据通过 `order_id` 关联
- `ExpectColumnValuesToMatchOtherColumn` 验证两列值是否相等
- 订单 1004 交易系统 quantity=200，清算系统 clearing_qty=0，会触发校验失败


## 三、计算关系校验（Calculation Validation）

**业务背景**：验证订单金额 = 数量 × 价格。这是量化系统中最基础的计算正确性校验。

```python
# 添加计算列
df['calculated_amount'] = df['quantity'] * df['price']

# 重新获取 Batch
batch = batch_definition.get_batch(batch_parameters={"dataframe": df})

# 定义期望：amount（假设存在）应等于 quantity * price
# 使用自定义条件进行校验
expectation = gx.expectations.ExpectColumnValuesToMatchComputedColumn(
    column="calculated_amount",
    computation=lambda row: row['quantity'] * row['price']
)
# 注：上述 Expectation 为示例说明，GE 实际提供 ExpectColumnValuesToMatchOtherColumn

# 更实用的方式：使用 row_condition 检查两列是否相等
# 先创建包含 amount 字段的完整数据
df['amount'] = df['quantity'] * df['price']
batch = batch_definition.get_batch(batch_parameters={"dataframe": df})

expectation = gx.expectations.ExpectColumnValuesToMatchOtherColumn(
    column="amount",
    other_column="calculated_amount"
)
result = batch.validate(expectation)
print(f"计算关系校验结果: success={result['success']}")
print(f"验证的期望数量: {len(result['results'])}")
```

**进阶：使用条件校验验证带手续费的净额计算**

```python
# 业务场景：净额 = 成交金额 × (1 + 手续费率)
df['commission_rate'] = 0.0003  # 万分之三
df['trade_amount'] = df['quantity'] * df['price']
df['net_amount'] = df['trade_amount'] * (1 + df['commission_rate'])

# 重新计算用于验证
df['expected_net'] = df['trade_amount'] * (1 + df['commission_rate'])

batch = batch_definition.get_batch(batch_parameters={"dataframe": df})

expectation = gx.expectations.ExpectColumnValuesToMatchOtherColumn(
    column="net_amount",
    other_column="expected_net"
)
result = batch.validate(expectation)
print(f"净额计算校验: success={result['success']}")
```


## 四、状态机校验（State Machine Validation）

**业务背景**：订单状态必须遵循合法的流转路径。例如：
- `NEW` → `SUBMITTED` → `PARTIAL_FILLED` → `FILLED`
- 从 `SUBMITTED` 可以直接到 `CANCELLED`
- 从 `FILLED` 不能再转换到其他状态

GE 没有内置的状态机校验，需要通过 `Custom Expectation` 实现：

```python
from great_expectations.expectations.expectation import Expectation
from great_expectations.core.expectation_configuration import ExpectationConfiguration
from great_expectations.exceptions import InvalidExpectationConfigurationError

class ExpectOrderStatusTransitionsToBeValid(Expectation):
    """自定义期望：验证订单状态流转是否合法"""
    
    valid_transitions = {
        'NEW': ['SUBMITTED', 'CANCELLED'],
        'SUBMITTED': ['PARTIAL_FILLED', 'FILLED', 'CANCELLED'],
        'PARTIAL_FILLED': ['PARTIAL_FILLED', 'FILLED', 'CANCELLED'],
        'FILLED': [],
        'CANCELLED': []
    }
    
    def validate(self, configuration: ExpectationConfiguration, batch=None, **kwargs):
        """执行验证逻辑"""
        column_name = configuration.kwargs.get('column')
        previous_state_column = configuration.kwargs.get('previous_state_column')
        
        if not batch or not column_name or not previous_state_column:
            return {'success': False, 'result': {'error': 'Missing required parameters'}}
        
        df = batch.data.dataframe
        success = True
        unexpected_states = []
        
        # 逐行检查状态流转
        for idx, row in df.iterrows():
            curr_state = row[column_name]
            prev_state = row[previous_state_column] if previous_state_column in row else None
            
            if prev_state and prev_state not in self.valid_transitions.get(curr_state, []):
                # 实际场景中，应该检查 prev -> curr 的合法性
                # 这里简化：如果当前状态在有效转换列表中
                pass
            
            # 更合理的检查：prev_state 是否可以转换到 curr_state
            if prev_state and curr_state not in self.valid_transitions.get(prev_state, []):
                success = False
                unexpected_states.append({
                    'order_id': row.get('order_id', idx),
                    'prev_state': prev_state,
                    'curr_state': curr_state
                })
        
        return {
            'success': success,
            'result': {
                'observed_value': unexpected_states,
                'unexpected_count': len(unexpected_states)
            }
        }
    
    def _validate_configuration(self, configuration):
        """验证期望配置参数"""
        super()._validate_configuration(configuration)
        column = configuration.kwargs.get('column')
        prev_column = configuration.kwargs.get('previous_state_column')
        
        if not column or not prev_column:
            raise InvalidExpectationConfigurationError(
                "Both 'column' and 'previous_state_column' must be provided"
            )

# 注册自定义期望
from great_expectations.expectations.registry import register_expectation
register_expectation(ExpectOrderStatusTransitionsToBeValid)

# 使用示例：创建包含历史状态的 DataFrame
df_with_history = pd.DataFrame({
    'order_id': [1001, 1002, 1003, 1004],
    'prev_status': ['NEW', 'SUBMITTED', 'PARTIAL_FILLED', 'SUBMITTED'],
    'status': ['SUBMITTED', 'FILLED', 'FILLED', 'REJECTED'],  # REJECTED 不在有效状态中
})
batch = batch_definition.get_batch(batch_parameters={"dataframe": df_with_history})

expectation = ExpectOrderStatusTransitionsToBeValid(
    column="status",
    previous_state_column="prev_status"
)
result = batch.validate(expectation)
print(f"状态机校验结果: success={result['success']}")
print(f"异常状态转换: {result['result']['observed_value']}")
```


## 五、业务约束校验（Business Constraint Validation）

**业务背景**：
1. 单笔订单金额不得超过 100 万
2. 订单数量必须为正整数
3. 买卖方向只能是 BUY 或 SELL
4. 被拒绝的订单必须有拒绝原因

```python
# 创建新的 Batch
batch = batch_definition.get_batch(batch_parameters={"dataframe": df})

# 约束1：金额 = quantity * price ≤ 1000000
expectation_1 = gx.expectations.ExpectColumnValuesToBeBetween(
    column="amount",
    min_value=0,
    max_value=1000000
)
result_1 = batch.validate(expectation_1)
print(f"金额限制校验: success={result_1['success']}")

# 约束2：数量必须为正整数
expectation_2 = gx.expectations.ExpectColumnValuesToBeInSet(
    column="quantity",
    value_set=[100, 150, 50, 200, 75]  # 实际应用中使用 expect_column_values_to_be_of_type
)
result_2 = batch.validate(expectation_2)

# 更好的方式：检查数值类型和范围
expectation_2_alt = gx.expectations.ExpectColumnValuesToBeBetween(
    column="quantity",
    min_value=1,
    max_value=1000000
)
result_2_alt = batch.validate(expectation_2_alt)

# 约束3：买卖方向只能是 BUY 或 SELL
expectation_3 = gx.expectations.ExpectColumnValuesToBeInSet(
    column="side",
    value_set=["BUY", "SELL"]
)
result_3 = batch.validate(expectation_3)
print(f"买卖方向校验: success={result_3['success']}")

# 约束4：被拒绝的订单必须有拒绝原因（条件校验）
# 使用 row_condition：只检查 status='REJECTED' 的行
expectation_4 = gx.expectations.ExpectColumnValuesToNotBeNull(
    column="reject_reason",
    condition_parser="pandas",
    row_condition='status=="REJECTED"'
)
result_4 = batch.validate(expectation_4)
print(f"拒绝原因校验: success={result_4['success']}")

# 查看校验结果详情
if not result_4['success']:
    print(f"失败详情: {result_4['results'][0]}")
```

**条件校验说明**：`row_condition` 参数允许只在满足条件的行上执行校验。这里只对状态为 `REJECTED` 的订单检查 `reject_reason` 是否非空。


## 六、时序因果校验（Temporal & Causal Validation）

**业务背景**：
1. 订单时间必须是有效的时间戳
2. 成交时间必须晚于下单时间
3. 同一订单的成交时间必须 ≥ 下单时间

```python
# 确保订单时间是有效的日期时间格式
# 先将 order_time 转换为 datetime
df['order_time'] = pd.to_datetime(df['order_time'])

# 添加成交时间（示例数据中所有订单都已成交）
df['trade_time'] = df['order_time'] + pd.to_timedelta([2, 3, 1, 5, 2], unit='s')
df['trade_time'] = df['trade_time'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))
df['order_time'] = df['order_time'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))

batch = batch_definition.get_batch(batch_parameters={"dataframe": df})

# 约束1：订单时间必须符合特定格式
expectation_1 = gx.expectations.ExpectColumnValuesToMatchRegex(
    column="order_time",
    regex=r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'
)
result_1 = batch.validate(expectation_1)

# 约束2：成交时间格式校验
expectation_2 = gx.expectations.ExpectColumnValuesToMatchRegex(
    column="trade_time",
    regex=r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'
)

# 约束3：成交时间应晚于订单时间（使用自定义条件）
# 这里需要比较两个 datetime 字段
# 先将数据转换回 datetime 进行比较
df['order_dt'] = pd.to_datetime(df['order_time'])
df['trade_dt'] = pd.to_datetime(df['trade_time'])
batch = batch_definition.get_batch(batch_parameters={"dataframe": df})

# 验证 trade_dt >= order_dt
expectation_3 = gx.expectations.ExpectColumnValuesToMatchOtherColumn(
    column="trade_dt",
    other_column="order_dt"
)
# 注意：ExpectColumnValuesToMatchOtherColumn 检查相等性，不是大于
# 对于大于检查，可以使用自定义期望或条件校验

# 使用条件表达式实现大于检查
def check_trade_after_order(row):
    return row['trade_dt'] >= row['order_dt']

df['time_valid'] = df.apply(check_trade_after_order, axis=1)
batch = batch_definition.get_batch(batch_parameters={"dataframe": df})

expectation_3 = gx.expectations.ExpectColumnValuesToBeTrue(
    column="time_valid"
)
result_3 = batch.validate(expectation_3)
print(f"时序因果校验（成交≥下单）: success={result_3['success']}")

# 验证结果详情
print(f"验证的期望数量: {len(result_3['results'])}")
```

**进阶：跨 Batch 的时序校验**

使用 Evaluation Parameters 可以跨多个数据批次进行比较，例如验证今日数据与昨日数据的一致性：

```python
# 创建两个时间批次的验证器
from great_expectations.core.batch import BatchRequest

# 获取昨日数据
batch_request_yesterday = BatchRequest(
    datasource_name="trading_datasource",
    data_asset_name="trading_asset",
    data_connector_query={"batch_filter_parameters": {"date": "2024-01-14"}}
)

# 获取今日数据
batch_request_today = BatchRequest(
    datasource_name="trading_datasource",
    data_asset_name="trading_asset",
    data_connector_query={"batch_filter_parameters": {"date": "2024-01-15"}}
)

validator_yesterday = context.get_validator(
    batch_request=batch_request_yesterday,
    expectation_suite_name="yesterday_suite"
)

validator_today = context.get_validator(
    batch_request=batch_request_today,
    expectation_suite_name="today_suite"
)

# 禁用交互式评估
validator_today.interactive_evaluation = False

# 使用 Evaluation Parameter 引用昨日数据的总行数
validator_today.expect_table_row_count_to_equal(
    value={
        '$PARAMETER': 'urn:great_expectations:validations:yesterday_suite:expect_table_row_count_to_be_between.result.observed_value'
    }
)
```


## 七、进阶：Checkpoint 与 Actions（自动化与告警）

将上述校验封装到 Checkpoint 中，并配置失败时发送通知：

```python
from great_expectations.checkpoint import Checkpoint, SlackNotificationAction, UpdateDataDocsAction

# 创建 Actions 列表
action_list = [
    # 校验失败时发送 Slack 通知
    SlackNotificationAction(
        name="slack_notification",
        slack_token="${SLACK_WEBHOOK_TOKEN}",
        slack_channel="#data-quality-alerts",
        notify_on="failure",
        show_failed_expectations=True,
    ),
    # 更新数据文档
    UpdateDataDocsAction(name="update_data_docs"),
]

# 创建 Checkpoint
checkpoint = Checkpoint(
    name="trading_quality_checkpoint",
    validation_definitions=[validation_definition],  # 之前创建的 Validation Definition
    actions=action_list,
    result_format={"result_format": "SUMMARY"},
)

# 添加到 Context
context.checkpoints.add(checkpoint)

# 运行 Checkpoint
result = context.run_checkpoint(checkpoint_name="trading_quality_checkpoint")

if not result["success"]:
    print("数据质量校验失败！")
    sys.exit(1)
```

运行后，GE 会自动生成 HTML 格式的 Data Docs 报告，展示每个校验的通过/失败状态。


## 八、学习路径与资源

| 层次         | 学习内容                                         | 推荐资源                                                     |
| :----------- | :----------------------------------------------- | :----------------------------------------------------------- |
| **入门**     | 理解 Expectation 基础概念                        | GE 官方教程、KDnuggets 入门文章                              |
| **进阶**     | 条件期望（row_condition）、Evaluation Parameters | GE 官方文档中的 Conditional Expectations 和跨 Batch 验证指南 |
| **高级**     | Custom Expectation 开发、Checkpoint Actions 配置 | 官方 Custom Expectation 开发指南                             |
| **集成实践** | 与特征存储（Feast/Hopsworks）集成、CI/CD 集成    | Feast 验证教程、Hopsworks ValidationReport API               |

建议从基础 Expectation 开始，逐步掌握条件校验和自定义期望的开发，最后将校验集成到 CI/CD 流水线中实现自动化数据质量监控。