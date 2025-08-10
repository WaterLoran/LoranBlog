# YAML 数据类型详解与示例大全

YAML 支持丰富的数据类型，包括标量（scalar）、序列（sequence）和映射（mapping）三大类。下面是各种数据类型的详细说明和示例：

## 一、标量类型（Scalars）

### 1. 字符串（String）
```yaml
# 普通字符串
name: "John Doe"

# 多行字符串（保留换行）
address: |
  123 Main Street
  Anytown, CA 12345
  USA

# 多行字符串（折叠为一行）
bio: >
  This is a long biography
  that will be folded into
  a single line.

# 块字符串（保留换行和缩进）
code_block: |
  function hello() {
    console.log("Hello, world!");
  }

# 带转义字符
escaped: "Line 1\nLine 2\tTabbed"
```

### 2. 数值（Numbers）
```yaml
# 整数
age: 30
negative: -15
hex: 0xFF      # 十六进制 (255)
octal: 0o10    # 八进制 (8)
binary: 0b1100 # 二进制 (12)

# 浮点数
pi: 3.14159
scientific: 6.022e23   # 科学计数法
infinity: .inf         # 无穷大
not_a_number: .NaN     # 非数字
```

### 3. 布尔值（Boolean）
```yaml
true_value: true
false_value: false

# 替代写法
yes_value: yes      # 等同于 true
no_value: no        # 等同于 false
on_value: on        # 等同于 true
off_value: off      # 等同于 false
```

### 4. 空值（Null）
```yaml
null_value: null
tilde_null: ~       # 等同于 null
empty_null:         # 空值（不推荐）
```

## 二、集合类型（Collections）

### 1. 序列/列表（Sequence/List）
```yaml
# 简单列表
fruits:
  - Apple
  - Banana
  - Orange

# 列表嵌套
matrix:
  - [1, 2, 3]
  - [4, 5, 6]
  - [7, 8, 9]

# 混合类型列表
mixed_list:
  - 42
  - "Hello"
  - true
  - null

# 行内列表（Flow style）
colors: [red, green, blue]
```

### 2. 映射/字典（Mapping/Dictionary）
```yaml
# 简单字典
person:
  name: Alice
  age: 30
  married: false

# 嵌套字典
company:
  name: Acme Inc.
  employees:
    - John
    - Sarah
    - Mike
  address:
    street: 456 Business Ave
    city: Metropolis

# 空字典
empty_dict: {}       # 推荐写法
empty_dict2:         # 等效写法

# 行内字典（Flow style）
point: { x: 12.5, y: -3.2 }
```

### 3. 复杂嵌套结构
```yaml
# 字典中包含列表
school:
  name: "Central High"
  grades:
    - name: "Grade 10"
      students: 150
    - name: "Grade 11"
      students: 140
    - name: "Grade 12"
      students: 130

# 列表中包含字典
products:
  - id: 1001
    name: "Laptop"
    price: 999.99
    in_stock: true
  - id: 2002
    name: "Mouse"
    price: 19.99
    in_stock: false
```

## 三、特殊类型与功能

### 1. 时间戳（Timestamp）
```yaml
iso_datetime: 2023-10-05T14:30:00Z       # ISO 8601格式
date_only: 2023-10-05                     # 仅日期
time_only: 14:30:00                       # 仅时间
with_timezone: 2023-10-05T14:30:00+08:00  # 带时区
```

### 2. 强制类型转换
```yaml
# 强制转换为字符串
string_int: !!str 42
string_bool: !!str true

# 强制转换为整数
int_string: !!int "123"
int_float: !!int 45.67   # 将截断为45

# 强制转换为浮点数
float_string: !!float "3.14"

# 强制转换为布尔值
bool_string: !!bool "true"
bool_int: !!bool 1       # true
bool_int2: !!bool 0      # false
```

### 3. 锚点与引用（Anchors & Aliases）
```yaml
# 定义锚点
defaults: &default_settings
  api_url: "https://api.example.com"
  timeout: 30
  retries: 3

# 使用引用
production:
  <<: *default_settings
  api_url: "https://api.prod.example.com"

# 覆盖部分设置
staging:
  <<: *default_settings
  timeout: 60
```

### 4. 多文档支持
```yaml
# 文档1
---
name: Document 1
content: This is the first document
...

# 文档2
---
name: Document 2
content: This is the second document
...
```

### 5. 标签（Tags）
```yaml
# 自定义类型
custom_type: !MyCustomType
  field1: value1
  field2: value2

# 特殊类型
binary_data: !!binary |
  R0lGODlhDAAMAIQAAP8AAP///wAAAPDw8IqKiuDg4EZGRnp6egAAAFhYWCQkJKysrL
  y8vFxcXMrKyuDg4G5ubrCwsASJ96EAAAh+QQAAAAAACwAAAAADAAMAAAFkCAgjkRpn
  qqgignPZYBuoqqaqrW5EcTM
```

## 四、高级结构与功能

### 1. 合并键（Merge Key）
```yaml
# 定义基础设置
base: &base
  name: Base Config
  value: 100

# 合并设置
merged:
  <<: *base
  extra: "Additional data"
  value: 200  # 覆盖基础值
```

### 2. 复杂键（Complex Keys）
```yaml
# 复合键作为映射键
? [name, type]
: value

# 实际示例
? [John, admin]
: Full Access
? [Jane, user]
: Limited Access
```

### 3. 指令（Directives）
```yaml
%YAML 1.2  # YAML版本声明
%TAG ! tag:example.com,2023:  # 自定义标签前缀
---
!custom_type
  field: value
```

## 五、实际应用示例

### 1. 配置文件
```yaml
# 应用配置
app:
  name: "My Application"
  version: 1.5.0
  debug: false
  log_level: "INFO"

database:
  host: "db.example.com"
  port: 5432
  username: "admin"
  password: "secret"
  ssl: true

features:
  - "authentication"
  - "caching"
  - "analytics"
```

### 2. Kubernetes 部署描述
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
        env:
        - name: ENVIRONMENT
          value: "production"
```

### 3. CI/CD 流水线配置
```yaml
# GitHub Actions 工作流
name: CI Pipeline

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
    - name: Install Dependencies
      run: npm install
    - name: Run Tests
      run: npm test
    - name: Build Project
      run: npm run build
```

## 六、YAML 最佳实践

1. **缩进规则**：
   - 使用空格（通常2或4个），不要使用制表符
   - 保持一致的缩进层级

2. **字符串引号**：
   - 不需要引号：简单字符串（字母、数字、连字符）
   - 需要引号：包含特殊字符（`:`, `{`, `[`, `]`, `,`, `&`, `*`, `#`, `?`, `|`, `>`, `%`）
   - 双引号：支持转义序列
   - 单引号：不处理转义序列

3. **多行字符串**：
   - `|`：保留换行和尾随换行
   - `>`：折叠为单行（换行变为空格）
   - `|+`：保留尾随空行
   - `|-`：删除尾随空行

4. **注释**：
   - 使用 `#` 开始注释
   - 可以出现在行尾或独立行

5. **类型选择**：
   - 优先使用基本类型（字符串、数字、布尔）
   - 使用 `!!` 强制类型转换时需谨慎
   - 复杂结构优先使用序列和映射组合

YAML 的强大之处在于其灵活性和可读性，合理使用各种数据类型可以创建出结构清晰、易于维护的配置文件和数据交换格式。