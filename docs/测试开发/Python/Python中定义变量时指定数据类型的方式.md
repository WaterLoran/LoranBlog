# Python中定义变量时指定数据类型的方式

在Python中，定义变量时指定数据类型主要有以下几种方式：

## 1. **类型注解（Type Hints）**（Python 3.5+推荐）

这是Python官方推荐的方式，使用冒号后跟类型：

```python
# 基本类型
name: str = "张三"
age: int = 25
height: float = 1.75
is_student: bool = True

# 容器类型
from typing import List, Dict, Tuple, Set, Optional

numbers: List[int] = [1, 2, 3, 4, 5]
user_info: Dict[str, str] = {"name": "张三", "city": "北京"}
coordinates: Tuple[float, float] = (31.23, 121.47)
unique_numbers: Set[int] = {1, 2, 3, 4, 5}

# 可选类型（可能为None）
middle_name: Optional[str] = None
phone: Optional[str] = "13800138000"
```

## 2. **使用 `typing` 模块的更多特性**

```python
from typing import Union, Any, Callable

# 联合类型（多个类型之一）
id_number: Union[int, str] = 123456
id_number = "A12345"  # 也合法

# 任意类型
data: Any = {"key": "value"}

# 函数类型
process_func: Callable[[int, int], float] = lambda x, y: x / y

# 类型别名
Vector = List[float]
point: Vector = [1.0, 2.0, 3.0]
```

## 3. **Python 3.9+ 的内置泛型**

Python 3.9开始，可以直接使用内置类型而不需要导入`typing`：

```python
# Python 3.9+
numbers: list[int] = [1, 2, 3]
user_map: dict[str, int] = {"age": 25, "score": 90}
coords: tuple[float, float, float] = (1.0, 2.0, 3.0)

# 使用 | 代替 Union（Python 3.10+）
value: int | str | None = None
```

## 4. **类属性类型注解**

```python
class Person:
    # 类属性类型注解
    count: int = 0  # 类变量
    
    def __init__(self, name: str, age: int):
        # 实例属性类型注解
        self.name: str = name
        self.age: int = age
        self.hobbies: list[str] = []
```

## 5. **函数参数和返回值类型注解**

```python
def calculate_total(items: list[float], discount: float = 0.0) -> float:
    """计算总价，返回浮点数"""
    total = sum(items)
    return total * (1 - discount)

# 复杂返回类型
def parse_data(data: str) -> dict[str, Union[int, str]]:
    return {"id": 1, "name": data}
```

## 6. **使用 `__annotations__` 查看类型信息**

```python
name: str = "张三"
age: int = 25

print(__annotations__)  
# 输出: {'name': <class 'str'>, 'age': <class 'int'>}
```

## 7. **实际示例**

```python
from typing import List, Dict, Optional
from datetime import datetime

# 用户信息
class UserProfile:
    def __init__(
        self,
        username: str,
        email: str,
        age: Optional[int] = None,
        tags: List[str] = None
    ):
        self.username: str = username
        self.email: str = email
        self.age: Optional[int] = age
        self.tags: List[str] = tags if tags else []
        self.created_at: datetime = datetime.now()
        self.metadata: Dict[str, Any] = {}

# 使用示例
user: UserProfile = UserProfile(
    username="zhangsan",
    email="zhangsan@example.com",
    age=25,
    tags=["vip", "active"]
)

# 处理函数
def process_users(users: List[UserProfile]) -> Dict[str, int]:
    """统计用户年龄段"""
    result: Dict[str, int] = {}
    for user in users:
        if user.age:
            age_group = f"{(user.age // 10) * 10}s"
            result[age_group] = result.get(age_group, 0) + 1
    return result
```

## 注意事项：

1. **Python是动态类型语言**：类型注解不会在运行时强制类型检查，主要用于：
   - 代码可读性
   - IDE智能提示
   - 静态类型检查工具（如mypy、pyright）

2. **类型检查**：可以使用mypy进行静态类型检查
   ```bash
   pip install mypy
   mypy your_script.py
   ```

3. **运行时类型检查**：如果需要，可以使用`isinstance()`进行验证：
   ```python
   def add(a: int, b: int) -> int:
       if not isinstance(a, int) or not isinstance(b, int):
           raise TypeError("参数必须是整数")
       return a + b
   ```

类型注解是Python中增强代码可维护性和可读性的重要工具，特别适合大型项目。