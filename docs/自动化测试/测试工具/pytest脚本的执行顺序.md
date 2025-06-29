在 pytest 中，当一个目录中的测试用例被收集后，默认执行顺序遵循 **确定性但非完全直观** 的规则。以下是关键细节和自定义控制方法：

---

### **1. 默认执行顺序**
#### **(1) 文件级排序**
- **按文件名ASCII码升序**  
  例如：  
  `test_a.py` → `test_b.py` → `test_module1.py` → `test_module2.py`

#### **(2) 类/函数级排序**
- **测试类（TestClass）内方法**：按定义顺序执行（代码中的书写顺序）。
- **测试函数（非类中的函数）**：按函数名ASCII码升序。  
  例如：  
  `test_add()` → `test_delete()` → `test_update()`

#### **(3) 目录层级**
- **深度优先遍历**：先处理子目录再返回上级。  
  目录结构示例：  
  ```
  tests/
  ├── subdir/
  │   ├── test_b.py    # 先执行
  │   └── test_c.py
  └── test_a.py        # 后执行
  ```

---

### **2. 自定义执行顺序**
#### **(1) 标记优先级（pytest-ordering插件）**
```python
# 安装：pip install pytest-ordering
@pytest.mark.run(order=1)
def test_login():
    pass

@pytest.mark.run(order=2)
def test_create_user():
    pass
```

#### **(2) 依赖控制（pytest-dependency插件）**
```python
# 安装：pip install pytest-dependency
@pytest.mark.dependency(depends=["test_login"])
def test_logout():
    pass  # 仅在 test_login 成功后执行
```

#### **(3) 钩子函数重写**
在 `conftest.py` 中修改收集逻辑：
```python
def pytest_collection_modifyitems(items):
    # 按函数名长度排序（示例）
    items.sort(key=lambda x: len(x.nodeid))
```

---

### **3. 重要注意事项**
- **避免隐式依赖**：测试用例应独立，顺序不应影响结果。
- **随机化测试**：使用 `pytest-randomly` 插件检测隐式依赖：
  ```bash
  pip install pytest-randomly
  pytest --randomly-dont-reorganize  # 仅打乱不重新排序
  ```

- **并行执行时**：`pytest-xdist` 可能进一步打乱顺序（需确保用例独立性）。

---

### **4. 查看实际执行顺序**
使用 `-v` 参数输出详细信息：
```bash
pytest -v tests/
```
或生成执行顺序报告：
```bash
pytest --collect-only -q  # 仅收集不执行
```

---

### **总结**
| **场景**         | **顺序控制方法**                     |
| ---------------- | ------------------------------------ |
| 需要固定顺序     | `pytest-ordering` 插件               |
| 用例间有依赖关系 | `pytest-dependency` 插件             |
| 完全自定义       | `pytest_collection_modifyitems` 钩子 |
| 检测隐式依赖     | `pytest-randomly` 插件               |

始终记住：**良好的测试设计应保证用例独立性**，顺序控制仅用于特殊需求。