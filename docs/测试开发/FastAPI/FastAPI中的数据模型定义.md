# FastAPI中的数据模型定义

下面是一个典型的 `schema.py` 文件示例，其中定义了几个数据模型（`Location`、`Meal`、`MealCreate`、`MealResponse`），展示了 FastAPI + Pydantic 数据定义的核心用法。

### 📁 `schema.py` 完整代码

```python
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl, validator
from datetime import datetime

# ---------- 1. 基础嵌套模型 ----------
class Location(BaseModel):
    """地理坐标"""
    lat: float = Field(..., ge=-90, le=90, description="纬度，范围 -90 到 90")
    lng: float = Field(..., ge=-180, le=180, description="经度，范围 -180 到 180")
    address: Optional[str] = Field(None, max_length=200, description="可选的文字地址")

# ---------- 2. 主模型（请求/通用） ----------
class Meal(BaseModel):
    """餐饮信息"""
    type: str = Field(
        ..., 
        description="餐饮类型: breakfast/lunch/dinner/snack",
        regex="^(breakfast|lunch|dinner|snack)$"  # 正则校验
    )
    name: str = Field(..., min_length=1, max_length=100, description="餐饮名称")
    address: Optional[str] = Field(default=None, description="地址")
    location: Optional[Location] = Field(default=None, description="经纬度坐标")
    description: Optional[str] = Field(default=None, max_length=500, description="描述")
    estimated_cost: int = Field(default=0, ge=0, description="预估费用(元)")
    
    # 自定义校验器（示例）
    @validator("estimated_cost")
    def cost_not_negative(cls, v):
        if v < 0:
            raise ValueError("费用不能为负数")
        return v

# ---------- 3. 创建模型（通常和 Meal 相同，但可以省略某些自动生成字段） ----------
class MealCreate(BaseModel):
    """创建餐饮时的请求体，不需要 id 和 created_at"""
    type: str = Field(..., description="餐饮类型")
    name: str = Field(..., description="餐饮名称")
    address: Optional[str] = None
    location: Optional[Location] = None
    description: Optional[str] = None
    estimated_cost: int = 0

# ---------- 4. 响应模型（包含服务器生成的字段） ----------
class MealResponse(BaseModel):
    """返回给客户端的餐饮信息，包含 id 和时间戳"""
    id: int = Field(..., description="餐饮记录的唯一标识")
    type: str
    name: str
    address: Optional[str] = None
    location: Optional[Location] = None
    description: Optional[str] = None
    estimated_cost: int
    created_at: datetime = Field(..., description="创建时间")
    
    class Config:
        orm_mode = True   # 允许从 ORM 对象或字典转换

# ---------- 5. 带分页的响应包装 ----------
class PaginatedMeals(BaseModel):
    """分页返回多个餐饮"""
    items: List[MealResponse] = Field(..., description="当前页的餐饮列表")
    total: int = Field(..., ge=0, description="总记录数")
    page: int = Field(..., ge=1, description="当前页码")
    size: int = Field(..., ge=1, le=100, description="每页大小")
```

---

## 📖 数据定义代码详解

### 1. 基础：继承 `BaseModel`

所有 Pydantic 模型都必须继承 `BaseModel`。这赋予了模型强大的数据校验、序列化/反序列化、文档生成能力。

```python
class Location(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
```

- `lat: float`：类型提示，FastAPI 会根据这个类型自动校验传入值是否为浮点数。
- `= Field(...)`：`Field` 函数用于提供**额外的校验规则和元数据**。

### 2. `Field` 的常用参数

| 参数                        | 作用                                 | 示例                         |
| :-------------------------- | :----------------------------------- | :--------------------------- |
| `default`                   | 设置默认值（如果字段可选）           | `default=None`               |
| `...` (Ellipsis)            | 表示该字段**必需**，不能省略         | `Field(...)`                 |
| `ge` / `le`                 | 数值的大于等于/小于等于              | `ge=0`, `le=100`             |
| `min_length` / `max_length` | 字符串长度限制                       | `min_length=1`               |
| `regex`                     | 正则表达式校验                       | `regex="^(breakfast\|...)$"` |
| `description`               | 字段描述，会显示在 API 文档中        | `description="餐饮名称"`     |
| `alias`                     | 字段的别名（如 JSON 中使用不同名称） | `alias="mealType"`           |

**示例解读：**
```python
type: str = Field(..., regex="^(breakfast|lunch|dinner|snack)$")
```
- `...` 表示 `type` 是必需字段。
- `regex` 限制了只能取四个枚举值之一。

### 3. 可选字段：`Optional` + `default`

```python
address: Optional[str] = Field(default=None, description="地址")
```
- `Optional[str]` 表示该字段可以是 `str` 或 `None`。
- `default=None` 表示如果请求体中不提供该字段，则默认为 `None`。
- **注意**：如果同时使用 `Optional` 和 `Field(default=...)`，默认值以 `Field` 中的为准。

另一种写法（省略 `Field`）：
```python
address: Optional[str] = None   # 同样表示可选，默认 None
```

### 4. 嵌套模型

```python
location: Optional[Location] = Field(default=None, description="经纬度坐标")
```
- 字段类型可以是另一个 Pydantic 模型 `Location`。
- 当 FastAPI 解析请求 JSON 时，会自动递归校验内部字段。
- 例如请求体：
  ```json
  {
    "type": "lunch",
    "name": "川菜馆",
    "location": {"lat": 31.23, "lng": 121.47}
  }
  ```

### 5. 自定义校验器：`@validator`

```python
@validator("estimated_cost")
def cost_not_negative(cls, v):
    if v < 0:
        raise ValueError("费用不能为负数")
    return v
```
- 装饰器 `@validator` 可以为一个或多个字段添加自定义校验逻辑。
- 校验器函数接收 `cls` 和待校验的值 `v`，返回校验后的值（或抛出 `ValueError` / `AssertionError`）。
- FastAPI 会捕获这些异常并自动返回 422 状态码及错误详情。

### 6. 配置类 `Config` 和 `orm_mode`

```python
class Config:
    orm_mode = True
```
- `orm_mode = True`（Pydantic v1）或 `from_attributes = True`（Pydantic v2）允许模型从**非字典对象**（如 SQLAlchemy 模型实例）中读取属性。
- 这样可以直接将数据库查询结果传递给响应模型，无需手动转换为字典。

### 7. 响应模型与请求模型的分离

通常我们会定义三个层次的模型：
- **`MealCreate`**：客户端创建资源时发送的数据（不含 `id`、`created_at` 等服务器生成字段）。
- **`Meal`**：内部使用的完整模型（有时省略，直接用 `MealResponse`）。
- **`MealResponse`**：返回给客户端的数据，可能包含只读字段。

**为什么需要分离？**
- 安全性：防止客户端修改 `id` 或 `created_at`。
- 文档清晰：API 文档中创建和返回的字段结构不同，更符合 RESTful 规范。

### 8. 泛型支持：`List[MealResponse]`

```python
items: List[MealResponse] = Field(...)
```
- Pydantic 支持 Python 内置的泛型类型，如 `List`、`Dict`、`Set`。
- 会自动校验列表中的每个元素是否符合 `MealResponse` 的规则。

---

## 🔧 在 FastAPI 路径函数中使用这些模型

```python
# main.py
from fastapi import FastAPI, Depends
from schema import MealCreate, MealResponse

app = FastAPI()

@app.post("/meals", response_model=MealResponse)
async def create_meal(meal: MealCreate):
    # meal 已经自动校验完成，可以直接使用
    # 假设保存到数据库，生成 id 和 created_at
    new_meal = {"id": 1, "created_at": datetime.now(), **meal.dict()}
    return new_meal
```

- 当请求到达 `POST /meals` 时，FastAPI 会自动：
  1. 读取 JSON 请求体。
  2. 根据 `MealCreate` 模型进行类型转换和校验。
  3. 如果校验失败，返回 422 错误并指明哪个字段有问题。
  4. 如果成功，将解析后的 `meal` 对象注入路径函数。
  5. 返回值被 `response_model=MealResponse` 过滤和转换，最终发送给客户端。

---

## 🧪 测试校验效果

发送一个错误的请求：
```json
{
  "type": "invalid_type",
  "name": "",
  "estimated_cost": -10
}
```

FastAPI 会返回类似这样的 422 响应：
```json
{
  "detail": [
    {
      "loc": ["body", "type"],
      "msg": "string does not match regex ...",
      "type": "value_error.str.regex"
    },
    {
      "loc": ["body", "name"],
      "msg": "ensure this value has at least 1 characters",
      "type": "value_error.any_str.min_length"
    },
    {
      "loc": ["body", "estimated_cost"],
      "msg": "费用不能为负数",
      "type": "value_error"
    }
  ]
}
```

---

## 📚 总结：数据定义的最佳实践

1. **始终使用 `Field` 添加描述**：让自动生成的 API 文档更易读。
2. **为数值字段添加 `ge`/`le` 约束**：防止非法输入。
3. **分离请求模型和响应模型**：保持 API 的安全性和清晰度。
4. **利用嵌套模型**：避免扁平化的巨型模型，提高可维护性。
5. **编写自定义校验器**：处理 `Field` 无法表达的复杂业务规则。
6. **使用 `orm_mode`**：方便从数据库 ORM 对象直接转换。

Pydantic 模型是 FastAPI 数据层的基石，理解它们就能掌握 FastAPI 中 80% 的数据处理逻辑。