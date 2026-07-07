# 读取 CSV 文件数据并传递给 Pytest 脚本的完整指南

以下是多种方法来读取 CSV 文件数据并将其作为参数传递给 Pytest 测试脚本。

## 1. **基础 CSV 读取方法**

### 简单的 CSV 数据驱动测试
```python
# test_csv_data_driven.py
import pytest
import csv
import os

def read_csv_data(file_path):
    """读取 CSV 文件并返回测试数据"""
    test_cases = []
    
    with open(file_path, 'r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            # 转换数据类型（如果需要）
            test_case = {}
            for key, value in row.items():
                # 尝试转换为数字，如果失败则保持字符串
                try:
                    test_case[key] = int(value)
                except ValueError:
                    try:
                        test_case[key] = float(value)
                    except ValueError:
                        test_case[key] = value
            test_cases.append(test_case)
    
    return test_cases

# 被测函数
def calculator(operation, a, b):
    """简单计算器函数"""
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

# 方法1: 直接在测试文件中读取 CSV
CSV_FILE_PATH = "test_data/calculator_test_cases.csv"

@pytest.mark.parametrize("test_data", read_csv_data(CSV_FILE_PATH))
def test_calculator_basic(test_data):
    """基础 CSV 数据驱动测试"""
    operation = test_data["operation"]
    a = test_data["a"]
    b = test_data["b"]
    expected = test_data["expected"]
    
    result = calculator(operation, a, b)
    assert result == expected, f"{operation}({a}, {b}) 应该得到 {expected}, 但得到 {result}"
```

## 2. **创建测试数据文件**

首先创建 CSV 测试数据文件：

```csv
# test_data/calculator_test_cases.csv
operation,a,b,expected,description
add,1,2,3,正数加法
add,-1,1,0,负数加法
add,0,0,0,零加法
subtract,5,3,2,正数减法
subtract,3,5,-2,负数结果减法
multiply,4,5,20,正数乘法
multiply,-3,4,-12,负数乘法
multiply,0,10,0,零乘法
divide,10,2,5.0,正数除法
divide,7,2,3.5,小数结果除法
```

## 3. **高级 CSV 读取方法**

### 更健壮的 CSV 读取器
```python
# csv_data_loader.py
import csv
import os
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class CSVDataLoader:
    """CSV 数据加载器类"""
    
    @staticmethod
    def load_csv_data(file_path: str, required_columns: List[str] = None) -> List[Dict[str, Any]]:
        """
        加载 CSV 文件数据
        
        Args:
            file_path: CSV 文件路径
            required_columns: 必需的列名列表
            
        Returns:
            测试数据列表
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"CSV 文件不存在: {file_path}")
        
        test_cases = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                # 检测 CSV 方言
                sample = file.read(1024)
                file.seek(0)
                dialect = csv.Sniffer().sniff(sample)
                
                csv_reader = csv.DictReader(file, dialect=dialect)
                
                # 检查必需列
                if required_columns:
                    missing_columns = set(required_columns) - set(csv_reader.fieldnames)
                    if missing_columns:
                        raise ValueError(f"CSV 文件缺少必需的列: {missing_columns}")
                
                for row_num, row in enumerate(csv_reader, start=2):  # 从第2行开始（跳过标题）
                    try:
                        # 转换数据类型
                        processed_row = CSVDataLoader._process_row_data(row)
                        test_cases.append(processed_row)
                    except Exception as e:
                        logger.warning(f"处理第 {row_num} 行数据时出错: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"读取 CSV 文件失败: {e}")
            raise
        
        logger.info(f"从 {file_path} 成功加载 {len(test_cases)} 个测试用例")
        return test_cases
    
    @staticmethod
    def _process_row_data(row: Dict[str, str]) -> Dict[str, Any]:
        """处理行数据，转换数据类型"""
        processed = {}
        
        for key, value in row.items():
            if value is None or value == '':
                processed[key] = None
                continue
            
            # 去除空格
            value = value.strip()
            
            # 尝试转换数据类型
            if value.lower() in ['true', 'false']:
                processed[key] = value.lower() == 'true'
            else:
                try:
                    # 先尝试整数
                    processed[key] = int(value)
                except ValueError:
                    try:
                        # 再尝试浮点数
                        processed[key] = float(value)
                    except ValueError:
                        # 保持为字符串
                        processed[key] = value
        
        return processed
    
    @staticmethod
    def get_test_ids(test_cases: List[Dict], id_columns: List[str] = None) -> List[str]:
        """生成测试用例 ID"""
        test_ids = []
        
        for i, test_case in enumerate(test_cases, start=1):
            if id_columns:
                # 使用指定列生成 ID
                id_parts = [str(test_case.get(col, '')) for col in id_columns]
                test_id = "_".join(id_parts)
            else:
                # 使用描述或默认生成 ID
                test_id = test_case.get('description', f'test_case_{i}')
            
            # 清理 ID（移除特殊字符）
            test_id = "".join(c if c.isalnum() or c in ['_', '-'] else '_' for c in test_id)
            test_ids.append(test_id)
        
        return test_ids

# 使用示例
if __name__ == "__main__":
    # 测试数据加载器
    test_cases = CSVDataLoader.load_csv_data(
        "test_data/calculator_test_cases.csv",
        required_columns=["operation", "a", "b", "expected"]
    )
    
    print(f"加载了 {len(test_cases)} 个测试用例:")
    for case in test_cases:
        print(case)
```

## 4. **Pytest 集成方法**

### 方法1: 使用 Fixture 提供 CSV 数据
```python
# test_calculator_with_fixture.py
import pytest
from csv_data_loader import CSVDataLoader

# 定义 CSV 文件路径
CALCULATOR_CSV = "test_data/calculator_test_cases.csv"

@pytest.fixture(scope="module")
def calculator_test_data():
    """提供计算器测试数据的 fixture"""
    return CSVDataLoader.load_csv_data(CALCULATOR_CSV)

@pytest.fixture(scope="module")
def calculator_test_ids(calculator_test_data):
    """提供测试 ID 的 fixture"""
    return CSVDataLoader.get_test_ids(calculator_test_data, ["operation", "a", "b"])

def test_calculator_with_fixture(calculator_test_data, calculator_test_ids):
    """使用 fixture 的数据驱动测试"""
    # 这个测试函数本身不直接使用参数，而是通过 fixture 获取数据
    # 实际中我们通常使用下面的参数化方法
    
    # 只是为了演示 fixture 的使用
    assert len(calculator_test_data) > 0
    assert len(calculator_test_ids) == len(calculator_test_data)

@pytest.mark.parametrize(
    "test_case",
    CSVDataLoader.load_csv_data(CALCULATOR_CSV),
    ids=CSVDataLoader.get_test_ids(CSVDataLoader.load_csv_data(CALCULATOR_CSV), ["operation", "a", "b"])
)
def test_calculator_direct(test_case):
    """直接使用 CSV 数据的参数化测试"""
    operation = test_case["operation"]
    a = test_case["a"]
    b = test_case["b"]
    expected = test_case["expected"]
    
    result = calculator(operation, a, b)
    assert result == expected
```

### 方法2: 动态参数化
```python
# test_dynamic_parametrize.py
import pytest
from csv_data_loader import CSVDataLoader

def generate_calculator_test_cases():
    """动态生成测试用例数据"""
    csv_file = "test_data/calculator_test_cases.csv"
    test_cases = CSVDataLoader.load_csv_data(csv_file)
    
    # 转换为 pytest 参数化需要的格式
    parametrize_args = []
    for case in test_cases:
        parametrize_args.append((
            case["operation"],
            case["a"], 
            case["b"],
            case["expected"]
        ))
    
    return parametrize_args

def generate_calculator_test_ids():
    """生成测试 ID"""
    csv_file = "test_data/calculator_test_cases.csv"
    test_cases = CSVDataLoader.load_csv_data(csv_file)
    return CSVDataLoader.get_test_ids(test_cases, ["operation", "a", "b"])

# 动态参数化
@pytest.mark.parametrize(
    "operation, a, b, expected",
    generate_calculator_test_cases(),
    ids=generate_calculator_test_ids()
)
def test_calculator_dynamic(operation, a, b, expected):
    """动态参数化测试"""
    result = calculator(operation, a, b)
    assert result == expected
```

## 5. **多 CSV 文件支持**

### 处理多个 CSV 文件
```python
# test_multiple_csv_files.py
import pytest
import glob
from csv_data_loader import CSVDataLoader

def get_all_csv_files(pattern="test_data/*.csv"):
    """获取所有匹配模式的 CSV 文件"""
    return glob.glob(pattern)

def load_all_test_cases():
    """从所有 CSV 文件加载测试用例"""
    all_test_cases = []
    csv_files = get_all_csv_files()
    
    for csv_file in csv_files:
        try:
            test_cases = CSVDataLoader.load_csv_data(csv_file)
            # 添加文件来源信息
            for case in test_cases:
                case["source_file"] = csv_file
            all_test_cases.extend(test_cases)
        except Exception as e:
            print(f"加载文件 {csv_file} 失败: {e}")
            continue
    
    return all_test_cases

# 从多个文件加载数据
ALL_TEST_CASES = load_all_test_cases()

@pytest.mark.parametrize(
    "test_case",
    ALL_TEST_CASES,
    ids=[f"{case.get('operation', 'unknown')}_{case.get('a', '')}_{case.get('b', '')}" for case in ALL_TEST_CASES]
)
def test_from_multiple_files(test_case):
    """从多个 CSV 文件测试"""
    if "operation" in test_case and "a" in test_case and "b" in test_case and "expected" in test_case:
        result = calculator(test_case["operation"], test_case["a"], test_case["b"])
        assert result == test_case["expected"]
    else:
        pytest.skip(f"跳过不完整的测试用例: {test_case}")
```

## 6. **带错误处理的 CSV 测试**

### 处理异常情况的 CSV 测试
```python
# test_with_error_cases.py
import pytest
from csv_data_loader import CSVDataLoader

# 包含错误测试用例的 CSV
ERROR_CASES_CSV = "test_data/calculator_error_cases.csv"

def test_error_cases():
    """测试错误情况"""
    error_cases = CSVDataLoader.load_csv_data(ERROR_CASES_CSV)
    
    for case in error_cases:
        operation = case["operation"]
        a = case["a"]
        b = case["b"]
        expected_error = case["expected_error"]
        
        with pytest.raises(ValueError) as exc_info:
            calculator(operation, a, b)
        
        assert expected_error in str(exc_info.value)

# 创建错误测试用例 CSV
ERROR_CSV_CONTENT = """operation,a,b,expected_error
divide,10,0,除数不能为零
invalid_op,1,2,不支持的运算
divide,abc,2,invalid literal for int
"""

# 保存错误测试用例
with open("test_data/calculator_error_cases.csv", "w") as f:
    f.write(ERROR_CSV_CONTENT)
```

## 7. **完整的项目结构**

### 项目目录结构
```
pytest_csv_data_driven/
├── test_data/
│   ├── calculator_test_cases.csv
│   ├── calculator_error_cases.csv
│   └── user_test_cases.csv
├── src/
│   ├── csv_data_loader.py
│   └── calculator.py
├── tests/
│   ├── test_csv_basic.py
│   ├── test_with_fixture.py
│   ├── test_dynamic_parametrize.py
│   ├── test_multiple_files.py
│   └── test_error_cases.py
├── conftest.py
├── requirements.txt
└── pytest.ini
```

### conftest.py - 全局 Fixture
```python
# conftest.py
import pytest
from src.csv_data_loader import CSVDataLoader

def pytest_configure(config):
    """Pytest 配置钩子"""
    # 添加自定义标记
    config.addinivalue_line(
        "markers", "csv_data: 标记使用 CSV 数据驱动的测试"
    )

@pytest.fixture(scope="session")
def calculator_csv_data():
    """全局的计算器 CSV 数据 fixture"""
    return CSVDataLoader.load_csv_data("test_data/calculator_test_cases.csv")

@pytest.fixture(scope="session")
def user_csv_data():
    """全局的用户 CSV 数据 fixture"""
    return CSVDataLoader.load_csv_data("test_data/user_test_cases.csv")
```

### 用户相关的 CSV 测试示例
```python
# test_user_csv.py
import pytest
from src.csv_data_loader import CSVDataLoader

class User:
    def __init__(self, username, email, age):
        self.username = username
        self.email = email
        self.age = age
    
    def is_adult(self):
        return self.age >= 18
    
    def is_valid_email(self):
        return "@" in self.email and "." in self.email

# 用户测试数据 CSV
USER_CSV_CONTENT = """username,email,age,expected_adult,expected_valid_email
alice,alice@example.com,25,True,True
bob,bob@example.com,16,False,True
charlie,charlie@example.com,30,True,True
david,invalid-email,22,True,False
eve,eve@test,18,True,False
"""

# 保存用户测试数据
with open("test_data/user_test_cases.csv", "w") as f:
    f.write(USER_CSV_CONTENT)

@pytest.mark.parametrize(
    "test_case",
    CSVDataLoader.load_csv_data("test_data/user_test_cases.csv"),
    ids=CSVDataLoader.get_test_ids(
        CSVDataLoader.load_csv_data("test_data/user_test_cases.csv"),
        ["username", "age"]
    )
)
def test_user_validation(test_case):
    """用户验证 CSV 数据驱动测试"""
    user = User(test_case["username"], test_case["email"], test_case["age"])
    
    assert user.is_adult() == test_case["expected_adult"]
    assert user.is_valid_email() == test_case["expected_valid_email"]
```

## 8. **运行测试**

### 运行所有 CSV 数据驱动测试
```bash
# 运行所有测试
pytest tests/ -v

# 运行特定文件
pytest tests/test_csv_basic.py -v

# 运行带标记的测试
pytest tests/ -m csv_data -v

# 生成详细报告
pytest tests/ -v --tb=short

# 显示测试用例名称
pytest tests/ -v --collect-only
```

### pytest.ini 配置
```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --strict-markers
markers =
    csv_data: 使用 CSV 数据驱动的测试
```

### requirements.txt
```txt
pytest>=6.0.0
pytest-html>=3.0.0
pytest-xdist>=2.0.0
```

## 9. **最佳实践总结**

1. **数据与代码分离**: 将测试数据保存在 CSV 文件中，与测试逻辑分离
2. **数据类型转换**: 自动将 CSV 中的字符串转换为适当的数据类型
3. **错误处理**: 处理文件不存在、格式错误等情况
4. **测试 ID**: 为每个测试用例生成有意义的 ID
5. **模块化设计**: 将 CSV 读取逻辑封装在独立的类或函数中
6. **多文件支持**: 支持从多个 CSV 文件加载测试数据
7. **Fixture 使用**: 使用 fixture 提高代码复用性

通过这种方式，你可以轻松地管理和维护大量的测试数据，同时保持测试代码的简洁和可维护性。