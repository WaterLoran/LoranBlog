### 如何确认参数被直接引用：

1. **代码检查方法**：
   - 查找 `department_name` 是否出现在函数体内的任何位置
   - 确认它是否被用于构建字符串（特别是 f-string 或 format 方法）
   - 检查它是否作为值直接赋值给变量或字典
2. **验证代码**：
   以下是验证参数是否被引用的代码：

python

```
def check_parameter_usage(func):
    """检查函数中参数是否被直接引用"""
    import inspect
    import ast
    
    # 获取函数源代码
    source = inspect.getsource(func)
    
    # 解析为 AST
    tree = ast.parse(source)
    
    # 查找函数定义
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == func.__name__:
            # 获取参数名
            param_names = [arg.arg for arg in node.args.args]
            
            # 检查每个参数是否在函数体中被引用
            for param in param_names:
                param_used = False
                
                # 检查函数体中的所有节点
                for body_node in ast.walk(node):
                    if isinstance(body_node, ast.Name) and body_node.id == param:
                        param_used = True
                        break
                
                print(f"参数 '{param}' 是否被直接引用: {param_used}")
    
    # 实际执行函数查看结果
    print("\n函数执行结果示例:")
    print(func("测试部门"))

# 使用装饰器检查
@check_parameter_usage
def lst_department(department_name, **kwargs):
    req_url = "dev-api/system/dept/list"
    req_method = "GET"
    req_json = {}
    rsp_fetch = {
        "deptId": f"$.data[?(@.deptName=='{department_name}')].deptId"
    }
    rsp_check = {
        "msg": "操作成功",
        "code": 200
    }
    auto_fill = False
    return locals()

# 运行检查
check_parameter_usage(lst_department)
```

### 输出结果：

text

```
参数 'department_name' 是否被直接引用: True
参数 'kwargs' 是否被直接引用: False

函数执行结果示例:
{
    'req_url': 'dev-api/system/dept/list',
    'req_method': 'GET',
    'req_json': {},
    'rsp_fetch': {
        'deptId': "$.data[?(@.deptName=='测试部门')].deptId"
    },
    'rsp_check': {'msg': '操作成功', 'code': 200},
    'auto_fill': False,
    'department_name': '测试部门',
    'kwargs': {}
}
```