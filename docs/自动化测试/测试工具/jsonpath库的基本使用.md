下面是常用的 JSONPath 表达式及其用法说明，涵盖不同的场景和功能。

### 1. 基本路径选择

- **表达式**：`$`
  - **说明**：表示根元素。

- **表达式**：`$.store`
  - **说明**：选择根元素下的 `store` 节点。

- **表达式**：`$.store.book`
  - **说明**：选择 `store` 下的 `book` 数组。

### 2. 数组元素选择

- **表达式**：`$.store.book[*]`
  - **说明**：选择 `book` 数组中的所有元素。

- **表达式**：`$.store.book[0]`
  - **说明**：选择 `book` 数组中的第一个元素。

- **表达式**：`$.store.book[1]`
  - **说明**：选择 `book` 数组中的第二个元素。

- **表达式**：`$.store.book[-1]`
  - **说明**：选择 `book` 数组中的最后一个元素。

### 3. 过滤条件

- **表达式**：`$.store.book[?(@.price < 10)]`
  - **说明**：选择价格低于 10 的所有书籍。

- **表达式**：`$.store.book[?(@.category == 'fiction')]`
  - **说明**：选择类别为 `fiction` 的所有书籍。

### 4. 选择特定字段

- **表达式**：`$.store.book[*].title`
  - **说明**：获取所有书籍的标题。

- **表达式**：`$.store.book[*].author`
  - **说明**：获取所有书籍的作者。

### 5. 数组操作

- **表达式**：`$.store.book.length()`
  - **说明**：获取 `book` 数组的长度。

- **表达式**：`$.store.book[0:2]`
  - **说明**：选择 `book` 数组中的前两个元素（索引 0 和 1）。

### 6. 使用通配符

- **表达式**：`$.store.book[*].*`
  - **说明**：选择所有书籍中的所有字段。

### 7. 递归下降

- **表达式**：`$.store..price`
  - **说明**：获取 `store` 下所有嵌套层级中 `price` 字段的值。

### 8. 数组的并集

- **表达式**：`$.store.book[0,1]`
  - **说明**：选择 `book` 数组中的第一个和第二个元素。

### 9. 键值选择

- **表达式**：`$.store.bicycle.color`
  - **说明**：获取 `bicycle` 的颜色属性。

### 10. 条件组合

- **表达式**：`$.store.book[?(@.price < 10 && @.category == 'fiction')]`
  - **说明**：选择价格低于 10 且类别为 `fiction` 的书籍。

### 11. 特定属性获取

- **表达式**：`$.store.book[?(@.isbn)].isbn`
  - **说明**：获取所有有 `isbn` 属性的书籍的 `isbn` 值。

### 12. 嵌套属性选择

- **表达式**：`$.store.book[0].author`
  - **说明**：获取第一个书籍的作者。

### 13. 全局选择

- **表达式**：`$..*`
  - **说明**：获取整个 JSON 文档的所有字段。

### 14. 存在性检查

- **表达式**：`$..[?(@.author)]`
  - **说明**：获取所有有 `author` 属性的节点。

### 15. 结合正则表达式

- **表达式**：`$.store.book[?(@.author =~ /.*Waugh/)]`
  - **说明**：选择作者名中包含 "Waugh" 的书籍。

### 16. 选择字符串的片段

- **表达式**：`$.store.book[0].title[0:5]`
  - **说明**：获取第一本书标题的前 5 个字符。

### 17. 使用路径选择和过滤

- **表达式**：`$.store..[?(@.price < 10)].title`
  - **说明**：获取所有价格低于 10 的书籍的标题。

### 18. 获取对象的键名

- **表达式**：`$.store.*`
  - **说明**：获取 `store` 下的所有键。

### 19. 嵌套选择

- **表达式**：`$.store..book[?(@.price < 10)]`
  - **说明**：从任意层级获取价格低于 10 的书籍。

### 20. 特定条件与逻辑运算

- **表达式**：`$.store.book[?(@.price < 10 || @.category == 'fiction')]`
  - **说明**：选择价格低于 10 或类别为 `fiction` 的书籍。

以上是 JSONPath 表达式的各种用法及其解释。这些表达式可以帮助你灵活地提取和处理 JSON 数据，根据具体需求进行调整和组合。