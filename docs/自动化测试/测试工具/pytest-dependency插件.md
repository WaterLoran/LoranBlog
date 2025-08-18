在 pytest 中实现测试用例之间的依赖关系管理，主要通过 **pytest-dependency** 插件来实现。以下是详细的使用指南：

---

### 1. 安装插件
```bash
pip install pytest-dependency
```

---

### 2. 基础依赖声明
#### 标记测试为可依赖项
```python
import pytest

# 标记为可依赖项 (name 指定依赖标识)
@pytest.mark.dependency(name="login_success")
def test_login():
    assert True  # 模拟登录成功
```

#### 声明依赖关系
```python
# 依赖 login_success 测试
@pytest.mark.dependency(depends=["login_success"])
def test_create_order():
    assert True  # 只有登录成功后才能创建订单
```

---

### 3. 作用域控制
通过 `scope` 参数管理依赖范围：
```python
# 模块级作用域
@pytest.mark.dependency(name="module_setup", scope="module")
def test_setup_module():
    assert True

# 会话级作用域
@pytest.mark.dependency(name="global_init", scope="session")
def test_global_init():
    assert True
```

---

### 4. 参数化测试的依赖处理
为参数化测试指定唯一依赖名：
```python
@pytest.mark.parametrize("user", ["admin", "guest"])
@pytest.mark.dependency(name=lambda user: f"user_{user}")
def test_user_permission(user):
    assert user != "guest"  # guest 用户失败

# 依赖特定参数化结果
@pytest.mark.dependency(depends=["user_admin"])  # 只依赖 admin 成功
def test_admin_feature():
    assert True
```

---

### 5. 依赖分组
使用 `group` 管理依赖集：
```python
@pytest.mark.dependency(name="db_conn", group="database")
def test_database_connection():
    assert True

# 依赖整个分组
@pytest.mark.dependency(depends=["database"], scope="module")
def test_db_operations():
    assert True
```

---

### 6. 运行时行为
- **被依赖测试失败**：跳过所有依赖它的测试（标记为 SKIPPED）
- **被依赖测试跳过**：依赖测试也会被跳过
- **执行顺序**：pytest 会自动调整执行顺序满足依赖

---

### 7. 查看依赖关系
使用 CLI 参数查看依赖拓扑：
```bash
pytest --dependency-show=dot  # 生成 Graphviz 依赖图
pytest --dependency-show=json # 输出 JSON 格式依赖关系
```

---

### 8. 高级用法
#### 条件依赖
```python
def test_conditional_dependency(request):
    if request.config.getoption("--env") == "prod":
        # 动态添加生产环境依赖
        request.applymarker(pytest.mark.dependency(depends=["prod_check"]))
    assert True
```

#### 类级依赖
```python
@pytest.mark.dependency(scope="class")
class TestFeature:
    def test_step1(self):
        assert True
    
    @pytest.mark.dependency(depends=["TestFeature::test_step1"])
    def test_step2(self):
        assert True
```

---

### 9. 与 skip/xfail 结合
```python
@pytest.mark.dependency(name="critical")
@pytest.mark.xfail(reason="待修复")
def test_critical_feature():
    assert False

# 将跳过，因为依赖项是 xfail
@pytest.mark.dependency(depends=["critical"])
def test_dependent_feature():
    assert True
```

---

### 10. 最佳实践
1. **命名规范**：使用清晰的命名（如 `service_auth_success`）
2. **作用域最小化**：尽量使用最窄的作用域（如 function > module > session）
3. **避免循环依赖**：插件无法解析循环依赖
4. **配合标记使用**：
   ```python
   @pytest.mark.dependency(
       depends=["login"], 
       condition=os.getenv("ENV") == "prod"
   )
   ```
5. **文档化依赖**：在测试描述中说明依赖关系

---

### 错误处理示例
```python
import pytest

@pytest.mark.dependency(name="payment_gateway")
def test_payment_gateway():
    if not network_available():
        pytest.skip("网络不可用")
    assert process_payment()

# 如果网络不可用会跳过此测试
@pytest.mark.dependency(depends=["payment_gateway"])
def test_order_confirmation():
    assert send_confirmation_email()
```

通过 pytest-dependency 插件，您可以构建清晰的测试依赖拓扑，确保测试执行的逻辑正确性，特别适合：
- 端到端测试流程
- 复杂系统集成测试
- 分阶段验证的场景
- 资源初始化依赖管理

注意：过度使用依赖可能导致测试结构脆弱，建议仅在必要时使用。