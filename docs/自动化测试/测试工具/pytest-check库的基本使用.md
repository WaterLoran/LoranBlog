`pytest-check` 是一个用于增强 `pytest` 测试框架的插件，允许在测试中进行多次断言，而不在第一个失败后立即停止测试。以下是 `pytest-check` 的各种用法和示例。

### 1. 安装

首先，需要通过 `pip` 安装 `pytest-check`：

```bash
pip install pytest-check
```

### 2. 基本用法

在测试函数中使用 `check` 方法进行断言。

```python
import pytest
import pytest_check as check

def test_example():
    check.equal(1, 1)  # 通过
    check.equal(2, 1)  # 失败
    check.equal(3, 3)  # 通过
```

在这个例子中，尽管第二个断言失败，测试仍会继续执行并检查后续的断言。

### 3. 断言的多样性

`pytest-check` 支持多种断言方法，如下：

- `check.equal(actual, expected)`: 检查两个值是否相等。
- `check.not_equal(actual, expected)`: 检查两个值是否不相等。
- `check.is_true(expression)`: 检查表达式是否为真。
- `check.is_false(expression)`: 检查表达式是否为假。
- `check.is_none(value)`: 检查值是否为 `None`。
- `check.is_not_none(value)`: 检查值是否不为 `None`。
- `check.is_in(element, container)`: 检查元素是否在容器中。
- `check.is_not_in(element, container)`: 检查元素是否不在容器中。

### 4. 捕获异常

可以使用 `check.raises` 来检查是否抛出特定的异常：

```python
def test_exception():
    with check.raises(ValueError):
        int('invalid')
```

### 5. 组合使用

可以在同一个测试中结合多个检查方法：

```python
def test_multiple_checks():
    check.equal(1, 1)
    check.is_true(True)
    check.is_in(3, [1, 2, 3])
    check.not_equal("hello", "world")
```

### 6. 生成报告

`pytest-check` 自动收集所有断言的结果，包括成功和失败的。运行测试时，只需正常使用 `pytest` 命令：

```bash
pytest
```

在测试完成后，失败的断言和成功的断言都会被列出，有助于快速定位问题。

### 7. 过滤失败的断言

可以使用 `--check` 选项来控制报告失败断言的行为。例如，使用 `-q` 选项可以减少输出的详细信息。

```bash
pytest -q --check
```

### 8. 注意事项

- 使用 `pytest-check` 时，建议在逻辑上相关的断言中使用它，以便更清晰地反映测试意图。
- 在某些情况下，过多的断言可能会导致测试难以阅读和理解，因此应适量使用。

### 结论

`pytest-check` 是一个灵活的工具，适用于需要在单个测试中进行多个断言的场景。它使得测试更加全面，同时提供更清晰的失败报告，帮助开发者快速识别和修复问题。