可以使用SQL命令直接比较两个数据库中某个表的数据一致性。假设您有两个数据库（`master_db` 和 `slave_db`），并且要比较其中的 `test_table` 表。以下是一些常用的SQL方法：

### 1. 使用 COUNT 比较记录数

首先，比较两张表的记录数：

```sql
SELECT 
    (SELECT COUNT(*) FROM master_db.test_table) AS master_count,
    (SELECT COUNT(*) FROM slave_db.test_table) AS slave_count;
```

### 2. 使用 MINUS 或 EXCEPT 比较数据

如果您的数据库支持 `MINUS` 或 `EXCEPT`（例如，PostgreSQL、Oracle），可以使用它们找出差异：

```sql
-- 找出在主库中但不在从库中的数据
SELECT * FROM master_db.test_table
EXCEPT
SELECT * FROM slave_db.test_table;

-- 找出在从库中但不在主库中的数据
SELECT * FROM slave_db.test_table
EXCEPT
SELECT * FROM master_db.test_table;
```

### 3. 使用 LEFT JOIN 比较数据

如果您的数据库不支持 `MINUS` 或 `EXCEPT`，可以使用 `LEFT JOIN` 来找出差异：

```sql
-- 找出在主库中但不在从库中的数据
SELECT a.* 
FROM master_db.test_table a
LEFT JOIN slave_db.test_table b ON a.id = b.id  -- 假设 id 是主键
WHERE b.id IS NULL;

-- 找出在从库中但不在主库中的数据
SELECT b.* 
FROM slave_db.test_table b
LEFT JOIN master_db.test_table a ON a.id = b.id
WHERE a.id IS NULL;
```

### 4. 校验具体字段的一致性

如果要比较具体字段的一致性，可以使用类似下面的查询：

```sql
SELECT a.id, a.field1, b.field1 
FROM master_db.test_table a
JOIN slave_db.test_table b ON a.id = b.id
WHERE a.field1 <> b.field1;
```

### 注意事项
- 确保在比较之前，两张表的结构一致。
- 以上SQL语句中的 `id` 应替换为实际的主键或唯一标识符。
- 如果数据量很大，可能会导致性能问题，建议在较小的数据集上测试。

通过这些SQL命令，您可以有效地检查两个数据库之间指定表的数据一致性。