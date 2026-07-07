# 在数据驱动测试中记录结果到 CSV 文件的完整方案

以下是在数据驱动测试过程中，将每个测试用例的目标数据提取并记录到另一个 CSV 文件的完整实现方案。

## 1. **基础结果记录器**

### 简单的结果记录器类
```python
# result_recorder.py
import csv
import os
from typing import Dict, List, Any
from datetime import datetime
import logging

class ResultRecorder:
    """测试结果记录器"""
    
    def __init__(self, output_file: str, fieldnames: List[str] = None):
        self.output_file = output_file
        self.fieldnames = fieldnames
        self._ensure_output_file()
    
    def _ensure_output_file(self):
        """确保输出文件存在并创建表头"""
        if not os.path.exists(self.output_file):
            os.makedirs(os.path.dirname(self.output_file), exist_ok=True)
            
            if self.fieldnames:
                with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=self.fieldnames)
                    writer.writeheader()
    
    def record_result(self, result_data: Dict[str, Any]):
        """记录单个测试结果"""
        try:
            file_exists = os.path.exists(self.output_file)
            
            with open(self.output_file, 'a', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=self.fieldnames)
                
                # 如果文件不存在，写入表头
                if not file_exists and self.fieldnames:
                    writer.writeheader()
                
                writer.writerow(result_data)
                
            logging.info(f"结果已记录到: {self.output_file}")
            return True
            
        except Exception as e:
            logging.error(f"记录结果失败: {e}")
            return False
    
    def record_batch_results(self, results: List[Dict[str, Any]]):
        """批量记录测试结果"""
        success_count = 0
        for result in results:
            if self.record_result(result):
                success_count += 1
        return success_count

# 使用示例
if __name__ == "__main__":
    # 定义输出字段
    fieldnames = ['test_id', 'input_a', 'input_b', 'operation', 'expected', 'actual', 'status', 'timestamp']
    
    recorder = ResultRecorder('test_results/results.csv', fieldnames)
    
    # 记录测试结果
    test_result = {
        'test_id': 'test_001',
        'input_a': 5,
        'input_b': 3,
        'operation': 'add',
        'expected': 8,
        'actual': 8,
        'status': 'PASS',
        'timestamp': datetime.now().isoformat()
    }
    
    recorder.record_result(test_result)
```

## 2. **集成到数据驱动测试**

### 基础集成示例
```python
# test_with_recording.py
 import pytest
import csv
from datetime import datetime
from result_recorder import ResultRecorder


# 被测函数
def calculator(operation, a, b):
    """简单计算器"""
    if operation == "add":
        return a + b
    elif operation == "subtract":
        return a - b
    elif operation == "multiply":
        return a * b
    elif operation == "divide":
        if b == 0:
            raise ValueError("除数不能为零")
        return a / b
    else:
        raise ValueError(f"不支持的运算: {operation}")


# 结果记录器配置
RESULT_FIELDS = [
    'test_id', 'operation', 'input_a', 'input_b',
    'expected', 'actual', 'status', 'error_message', 'timestamp'
]

result_recorder = ResultRecorder('test_results/calculator_results.csv', RESULT_FIELDS)


def read_test_cases(csv_file):
    """读取测试用例"""
    test_cases = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 转换数据类型
            row['operation'] = str(row['operation'])
            row['a'] = int(row['a']) 
            row['b'] = int(row['b'])
            row['expected'] = float(row['expected']) if '.' in row['expected'] else int(row['expected'])
            test_cases.append(row)
    return test_cases


# 读取测试数据
TEST_CASES = read_test_cases('test_data/calculator_test_cases.csv')


@pytest.mark.parametrize("test_case", TEST_CASES)
def test_calculator_with_recording(test_case):
    """带结果记录的计算器测试"""
    operation = test_case['operation']
    a = test_case['a']
    b = test_case['b']
    expected = test_case['expected']

    # 生成测试ID
    test_id = f"{operation}_{a}_{b}"

    try:
        # 执行被测函数
        actual = calculator(operation, a, b)

        # 验证结果
        assert actual == expected, f"预期: {expected}, 实际: {actual}"

        # 记录成功结果
        result_data = {
            'test_id': test_id,
            'operation': operation,
            'input_a': a,
            'input_b': b,
            'expected': expected,
            'actual': actual,
            'status': 'PASS',
            'error_message': '',
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        # 记录失败结果
        result_data = {
            'test_id': test_id,
            'operation': operation,
            'input_a': a,
            'input_b': b,
            'expected': expected,
            'actual': 'N/A',
            'status': 'FAIL',
            'error_message': str(e),
            'timestamp': datetime.now().isoformat()
        }

        # 重新抛出异常以便 pytest 捕获
        raise e
    finally:
        # 确保结果被记录
        result_recorder.record_result(result_data)


# 运行测试
if __name__ == "__main__":
    pytest.main([__file__, '-v'])
```

## 3. **使用 Fixture 自动记录**

### 高级记录 Fixture
```python
# conftest.py
import pytest
import csv
from datetime import datetime
from result_recorder import ResultRecorder

# 全局结果记录器
RESULT_RECORDER = ResultRecorder(
    'test_results/test_execution_results.csv',
    ['test_id', 'test_name', 'input_data', 'expected', 'actual', 'status', 'duration_ms', 'timestamp']
)

@pytest.fixture(scope="function")
def record_test_result(request):
    """自动记录测试结果的 fixture"""
    test_start_time = datetime.now()
    test_result = {
        'test_id': request.node.name,
        'test_name': request.node.originalname if hasattr(request.node, 'originalname') else request.node.name,
        'input_data': '',
        'expected': '',
        'actual': '',
        'status': 'UNKNOWN',
        'duration_ms': 0,
        'timestamp': test_start_time.isoformat()
    }
    
    def finalize():
        """测试结束后记录结果"""
        test_end_time = datetime.now()
        duration = (test_end_time - test_start_time).total_seconds() * 1000
        
        test_result['duration_ms'] = round(duration, 2)
        test_result['timestamp'] = test_end_time.isoformat()
        
        # 如果测试失败，更新状态
        if hasattr(request.node, 'test_outcome'):
            if request.node.test_outcome == 'passed':
                test_result['status'] = 'PASS'
            elif request.node.test_outcome == 'failed':
                test_result['status'] = 'FAIL'
            elif request.node.test_outcome == 'skipped':
                test_result['status'] = 'SKIP'
        
        RESULT_RECORDER.record_result(test_result)
    
    request.addfinalizer(finalize)
    
    # 返回一个函数，允许测试函数更新结果数据
    def update_result(**kwargs):
        test_result.update(kwargs)
    
    return update_result

# 钩子函数，捕获测试结果
@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """捕获测试结果"""
    outcome = yield
    report = outcome.get_result()
    
    # 存储测试结果状态
    item.test_outcome = report.outcome
```

### 使用 Fixture 的测试示例
```python
# test_with_fixture_recording.py
import pytest
import json
from result_recorder import ResultRecorder

# 被测函数
def process_user_data(user_data):
    """处理用户数据"""
    if not user_data.get('username'):
        raise ValueError("用户名不能为空")
    
    if user_data.get('age', 0) < 0:
        raise ValueError("年龄不能为负数")
    
    # 添加处理时间戳
    user_data['processed_at'] = '2024-01-01T00:00:00'
    user_data['is_adult'] = user_data.get('age', 0) >= 18
    
    return user_data

# 测试数据
USER_TEST_CASES = [
    {
        'username': 'alice',
        'email': 'alice@example.com',
        'age': 25,
        'expected_adult': True
    },
    {
        'username': 'bob',
        'email': 'bob@example.com', 
        'age': 16,
        'expected_adult': False
    },
    {
        'username': '',
        'email': 'invalid@example.com',
        'age': 30,
        'expected_adult': True
    }
]

@pytest.mark.parametrize("user_data", USER_TEST_CASES)
def test_user_processing(record_test_result, user_data):
    """测试用户数据处理（使用记录 fixture）"""
    
    # 更新输入数据
    record_test_result(
        input_data=json.dumps(user_data),
        expected=f"is_adult={user_data['expected_adult']}"
    )
    
    try:
        if not user_data['username']:
            # 预期会失败的情况
            with pytest.raises(ValueError):
                process_user_data(user_data)
            actual_result = "ValueError raised as expected"
        else:
            # 正常处理
            result = process_user_data(user_data)
            actual_result = f"is_adult={result['is_adult']}"
            
            # 验证结果
            assert result['is_adult'] == user_data['expected_adult']
        
        # 更新实际结果
        record_test_result(actual=actual_result, status='PASS')
        
    except Exception as e:
        # 更新失败结果
        record_test_result(actual=str(e), status='FAIL')
        raise
```

## 4. **装饰器方式的记录**

### 结果记录装饰器
```python
# result_decorators.py
import functools
import csv
from datetime import datetime
from typing import Callable, Any
import inspect

def record_test_result(output_file: str):
    """记录测试结果的装饰器"""
    def decorator(test_func: Callable) -> Callable:
        @functools.wraps(test_func)
        def wrapper(*args, **kwargs):
            # 获取测试信息
            test_name = test_func.__name__
            timestamp = datetime.now().isoformat()
            
            # 准备结果数据
            result_data = {
                'test_name': test_name,
                'timestamp': timestamp,
                'status': 'UNKNOWN',
                'input_args': str(args),
                'input_kwargs': str(kwargs),
                'output': '',
                'error_message': ''
            }
            
            try:
                # 执行测试函数
                output = test_func(*args, **kwargs)
                result_data['output'] = str(output)
                result_data['status'] = 'PASS'
                return output
                
            except AssertionError as e:
                result_data['status'] = 'FAIL'
                result_data['error_message'] = f"AssertionError: {e}"
                raise
                
            except Exception as e:
                result_data['status'] = 'ERROR'
                result_data['error_message'] = f"Exception: {e}"
                raise
                
            finally:
                # 记录结果
                _write_result(output_file, result_data)
        
        return wrapper
    return decorator

def _write_result(output_file: str, result_data: dict):
    """写入结果到CSV文件"""
    # 使用 result_data 的键作为 fieldnames
    fieldnames = list(result_data.keys())

    file_exists = False
    try:
        with open(output_file, 'r') as f:
            # 如果文件已存在，读取现有的 fieldnames
            reader = csv.DictReader(f)
            existing_fieldnames = reader.fieldnames
            file_exists = True
            # # 合并现有的和新的 fieldnames, 这里不能直接用set, 这样子会改变原有的 顺序, 需要按照顺序去追加
            unique_to_fieldnames = [item for item in fieldnames if item not in existing_fieldnames]
            # 追加到 list1
            existing_fieldnames.extend(unique_to_fieldnames)
    except FileNotFoundError:
        pass

    with open(output_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()

        writer.writerow(result_data)

        
# 参数化记录装饰器
def record_parametrized_test(output_file: str):
    """用于参数化测试的结果记录装饰器"""
    def decorator(test_func: Callable) -> Callable:
        @functools.wraps(test_func)
        def wrapper(*args, **kwargs):
            test_name = test_func.__name__
            
            # 获取参数信息
            sig = inspect.signature(test_func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            # 提取测试数据
            test_data = {}
            for param_name, param_value in bound_args.arguments.items():
                if param_name not in ['self', 'cls']:  # 排除self/cls参数
                    test_data[param_name] = param_value
            
            timestamp = datetime.now().isoformat()
            
            result_data = {
                'test_name': test_name,
                'test_data': str(test_data),
                'timestamp': timestamp,
                'status': 'UNKNOWN',
                'output': '',
                'error_message': ''
            }
            
            try:
                output = test_func(*args, **kwargs)
                result_data['output'] = str(output)
                result_data['status'] = 'PASS'
                return output
                
            except Exception as e:
                result_data['status'] = 'FAIL'
                result_data['error_message'] = str(e)
                raise
                
            finally:
                _write_result(output_file, result_data)
        
        return wrapper
    return decorator
```

### 使用装饰器的测试示例
```python
# test_with_decorator.py
import pytest
from result_decorators import record_test_result, record_parametrized_test

# 使用装饰器记录结果的测试
@record_test_result('test_results/decorator_results.csv')
def test_addition():
    """测试加法"""
    result = 2 + 3
    assert result == 5
    return result

@record_test_result('test_results/decorator_results.csv') 
def test_subtraction():
    """测试减法"""
    result = 10 - 4
    assert result == 6
    return result

# 参数化测试使用装饰器
TEST_DATA = [
    (1, 2, 3),
    (5, 3, 2),
    (10, 5, 5)
]

@pytest.mark.parametrize("a,b,expected", TEST_DATA)
@record_parametrized_test('test_results/parametrized_results.csv')
def test_parametrized_operations(a, b, expected):
    """参数化操作测试"""
    result = a + b  # 这里应该是相应的操作
    assert result == expected
    return result

# 更复杂的例子
class DataProcessor:
    def process(self, data):
        """处理数据"""
        if 'value' not in data:
            raise ValueError("数据中缺少value字段")
        return {'processed': True, 'original_value': data['value']}

@record_test_result('test_results/class_method_results.csv')
def test_data_processor():
    """测试数据处理器"""
    processor = DataProcessor()
    
    test_data = {'value': 100}
    result = processor.process(test_data)
    
    assert result['processed'] == True
    assert result['original_value'] == 100
    
    return result

if __name__ == "__main__":
    # 运行测试
    test_addition()
    test_subtraction()
    
    # 运行参数化测试
    for a, b, expected in TEST_DATA:
        test_parametrized_operations(a, b, expected)
    
    test_data_processor()
    
    print("所有测试完成，结果已记录")
```

## 5. **完整的集成方案**

### 完整的测试套件示例
```python
# complete_test_suite.py
import pytest
import csv
import json
from datetime import datetime
from result_recorder import ResultRecorder

# 配置结果记录器
RESULTS_CONFIG = {
    'calculator': {
        'file': 'test_results/calculator_detailed.csv',
        'fields': ['test_id', 'operation', 'a', 'b', 'expected', 'actual', 'status', 'execution_time_ms', 'timestamp']
    },
    'user_validation': {
        'file': 'test_results/user_validation_detailed.csv', 
        'fields': ['test_id', 'username', 'email', 'age', 'expected_valid', 'actual_valid', 'status', 'error_msg', 'timestamp']
    }
}

class TestResultManager:
    """测试结果管理器"""
    
    def __init__(self):
        self.recorders = {}
        for test_type, config in RESULTS_CONFIG.items():
            self.recorders[test_type] = ResultRecorder(config['file'], config['fields'])
    
    def record_calculator_test(self, test_data, actual_result, status, execution_time, error_msg=''):
        """记录计算器测试结果"""
        result = {
            'test_id': f"calc_{test_data['operation']}_{test_data['a']}_{test_data['b']}",
            'operation': test_data['operation'],
            'a': test_data['a'],
            'b': test_data['b'],
            'expected': test_data['expected'],
            'actual': actual_result,
            'status': status,
            'execution_time_ms': execution_time,
            'timestamp': datetime.now().isoformat()
        }
        
        if error_msg:
            result['error_msg'] = error_msg
            
        return self.recorders['calculator'].record_result(result)
    
    def record_user_validation_test(self, test_data, actual_result, status, execution_time, error_msg=''):
        """记录用户验证测试结果"""
        result = {
            'test_id': f"user_{test_data['username']}",
            'username': test_data['username'],
            'email': test_data['email'],
            'age': test_data['age'],
            'expected_valid': test_data['expected_valid'],
            'actual_valid': actual_result,
            'status': status,
            'timestamp': datetime.now().isoformat()
        }
        
        if error_msg:
            result['error_msg'] = error_msg
            
        return self.recorders['user_validation'].record_result(result)

# 全局结果管理器
RESULT_MANAGER = TestResultManager()

# 测试实现
def read_calculator_test_cases():
    """读取计算器测试用例"""
    cases = []
    with open('test_data/calculator_detailed_cases.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 转换数据类型
            row['a'] = float(row['a'])
            row['b'] = float(row['b'])
            row['expected'] = float(row['expected'])
            cases.append(row)
    return cases

def read_user_validation_cases():
    """读取用户验证测试用例"""
    cases = []
    with open('test_data/user_validation_cases.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row['age'] = int(row['age'])
            row['expected_valid'] = row['expected_valid'].lower() == 'true'
            cases.append(row)
    return cases

# 计算器测试
CALCULATOR_CASES = read_calculator_test_cases()

@pytest.mark.parametrize("test_case", CALCULATOR_CASES)
def test_calculator_comprehensive(test_case):
    """综合计算器测试"""
    start_time = datetime.now()
    
    try:
        # 执行计算
        if test_case['operation'] == 'add':
            actual = test_case['a'] + test_case['b']
        elif test_case['operation'] == 'subtract':
            actual = test_case['a'] - test_case['b']
        elif test_case['operation'] == 'multiply':
            actual = test_case['a'] * test_case['b']
        elif test_case['operation'] == 'divide':
            if test_case['b'] == 0:
                raise ValueError("除数不能为零")
            actual = test_case['a'] / test_case['b']
        else:
            raise ValueError(f"未知操作: {test_case['operation']}")
        
        # 验证结果
        assert abs(actual - test_case['expected']) < 0.0001, f"精度误差过大"
        
        # 计算执行时间
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # 记录成功结果
        RESULT_MANAGER.record_calculator_test(
            test_case, actual, 'PASS', execution_time
        )
        
    except Exception as e:
        # 计算执行时间
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # 记录失败结果
        RESULT_MANAGER.record_calculator_test(
            test_case, 'N/A', 'FAIL', execution_time, str(e)
        )
        raise

# 用户验证测试
USER_VALIDATION_CASES = read_user_validation_cases()

def validate_user(username, email, age):
    """验证用户数据"""
    errors = []
    
    if not username or len(username) < 3:
        errors.append("用户名至少3个字符")
    
    if '@' not in email or '.' not in email:
        errors.append("邮箱格式不正确")
    
    if age < 0 or age > 150:
        errors.append("年龄必须在0-150之间")
    
    return len(errors) == 0, errors

@pytest.mark.parametrize("test_case", USER_VALIDATION_CASES)
def test_user_validation_comprehensive(test_case):
    """综合用户验证测试"""
    start_time = datetime.now()
    
    try:
        # 执行验证
        is_valid, errors = validate_user(
            test_case['username'],
            test_case['email'], 
            test_case['age']
        )
        
        # 验证结果
        assert is_valid == test_case['expected_valid'], f"验证结果不符。错误: {errors}"
        
        # 计算执行时间
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # 记录成功结果
        RESULT_MANAGER.record_user_validation_test(
            test_case, is_valid, 'PASS', execution_time
        )
        
    except Exception as e:
        # 计算执行时间
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # 记录失败结果
        RESULT_MANAGER.record_user_validation_test(
            test_case, 'N/A', 'FAIL', execution_time, str(e)
        )
        raise

if __name__ == "__main__":
    pytest.main([__file__, '-v', '--tb=short'])
```

## 6. **创建测试数据文件**

### 计算器测试数据
```csv
# test_data/calculator_detailed_cases.csv
operation,a,b,expected,description
add,1.5,2.5,4.0,小数加法
add,-2,3,1,负数加法
subtract,5.5,2.5,3.0,小数减法
subtract,3,5,-2,产生负数的减法
multiply,2.5,4,10.0,小数乘法
multiply,-3,2.5,-7.5,负数乘法
divide,10,4,2.5,小数除法
divide,7,2,3.5,不能整除的除法
```

### 用户验证测试数据
```csv
# test_data/user_validation_cases.csv
username,email,age,expected_valid,description
alice123,alice@example.com,25,true,有效用户
bob,bob@example.com,16,true,未成年有效用户
ch,charlie@example.com,30,false,用户名太短
david,david@invalid,25,false,无效邮箱
eve,eve@example.com,-5,false,负年龄
frank,frank@example.com,151,false,年龄过大
```

## 7. **运行和验证**

### 运行测试脚本
```python
# run_tests_with_recording.py
import pytest
import os
import shutil
from datetime import datetime

def setup_test_environment():
    """设置测试环境"""
    # 清理旧的测试结果
    if os.path.exists('test_results'):
        shutil.rmtree('test_results')
    
    # 创建结果目录
    os.makedirs('test_results', exist_ok=True)
    
    # 创建测试数据目录
    os.makedirs('test_data', exist_ok=True)
    
    print("测试环境设置完成")

def run_all_tests():
    """运行所有测试"""
    print(f"开始运行测试: {datetime.now().isoformat()}")
    
    # 运行测试
    pytest_args = [
        'complete_test_suite.py',
        '-v',
        '--tb=short',
        f'--html=test_results/test_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.html',
        f'--self-contained-html'
    ]
    
    exit_code = pytest.main(pytest_args)
    
    print(f"测试完成: {datetime.now().isoformat()}")
    print(f"退出代码: {exit_code}")
    
    return exit_code

def verify_results():
    """验证测试结果"""
    result_files = [
        'test_results/calculator_detailed.csv',
        'test_results/user_validation_detailed.csv'
    ]
    
    for result_file in result_files:
        if os.path.exists(result_file):
            with open(result_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                print(f"{result_file}: {len(rows)} 条记录")
        else:
            print(f"{result_file}: 文件不存在")

if __name__ == "__main__":
    setup_test_environment()
    run_all_tests()
    verify_results()
```

## 8. **结果分析和报告**

### 结果分析工具
```python
# result_analyzer.py
import csv
import pandas as pd
from datetime import datetime
import matplotlib.pyplot as plt

class ResultAnalyzer:
    """测试结果分析器"""
    
    def __init__(self, result_files):
        self.result_files = result_files
        self.df = None
        
    def load_results(self):
        """加载所有结果文件"""
        dfs = []
        for file_path in self.result_files:
            try:
                df = pd.read_csv(file_path)
                df['source_file'] = file_path
                dfs.append(df)
            except Exception as e:
                print(f"加载文件 {file_path} 失败: {e}")
        
        if dfs:
            self.df = pd.concat(dfs, ignore_index=True)
            print(f"成功加载 {len(self.df)} 条测试记录")
        else:
            print("没有加载到任何测试记录")
    
    def generate_summary(self):
        """生成测试摘要"""
        if self.df is None:
            self.load_results()
        
        summary = {
            'total_tests': len(self.df),
            'passed_tests': len(self.df[self.df['status'] == 'PASS']),
            'failed_tests': len(self.df[self.df['status'] == 'FAIL']),
            'pass_rate': 0,
            'execution_time_avg': 0
        }
        
        if summary['total_tests'] > 0:
            summary['pass_rate'] = (summary['passed_tests'] / summary['total_tests']) * 100
        
        if 'execution_time_ms' in self.df.columns:
            summary['execution_time_avg'] = self.df['execution_time_ms'].mean()
        
        return summary
    
    def save_analysis_report(self, output_file='test_results/analysis_report.md'):
        """保存分析报告"""
        summary = self.generate_summary()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# 测试结果分析报告\n\n")
            f.write(f"生成时间: {datetime.now().isoformat()}\n\n")
            
            f.write("## 测试摘要\n")
            f.write(f"- 总测试数: {summary['total_tests']}\n")
            f.write(f"- 通过测试: {summary['passed_tests']}\n")
            f.write(f"- 失败测试: {summary['failed_tests']}\n")
            f.write(f"- 通过率: {summary['pass_rate']:.2f}%\n")
            f.write(f"- 平均执行时间: {summary['execution_time_avg']:.2f}ms\n\n")
            
            # 详细结果
            if self.df is not None:
                f.write("## 详细结果\n")
                failed_tests = self.df[self.df['status'] == 'FAIL']
                if len(failed_tests) > 0:
                    f.write("### 失败测试用例\n")
                    for _, test in failed_tests.iterrows():
                        f.write(f"- {test.get('test_id', 'N/A')}: {test.get('error_message', 'N/A')}\n")

# 使用示例
if __name__ == "__main__":
    analyzer = ResultAnalyzer([
        'test_results/calculator_detailed.csv',
        'test_results/user_validation_detailed.csv'
    ])
    
    analyzer.load_results()
    summary = analyzer.generate_summary()
    print("测试摘要:", summary)
    
    analyzer.save_analysis_report()
```

## 9. **最佳实践总结**

1. **分离关注点**: 将结果记录逻辑与测试逻辑分离
2. **错误处理**: 确保记录过程不会影响测试执行
3. **数据完整性**: 记录足够的信息用于后续分析
4. **性能考虑**: 批量写入或使用缓冲区提高性能
5. **文件管理**: 自动创建目录和文件头
6. **时间戳**: 记录执行时间用于性能分析
7. **状态跟踪**: 清晰区分通过、失败、跳过等状态

通过这种方案，你可以在数据驱动测试过程中自动记录每个测试用例的执行结果，便于后续的分析、报告和问题排查。