MySQL 8 中的索引问题可能会导致查询性能下降、锁争用增多或资源使用率高。因此，排查和优化数据库索引是提高查询性能的重要手段。以下是如何在 MySQL 8 中排查索引问题的详细步骤。

### 1. **检查表结构和索引使用情况**

首先，你需要确认表上是否已经存在索引，以及哪些列已经建立了索引。你可以使用 `SHOW INDEX` 命令来查看表中的索引。

#### 查看表上的索引

```sql
SHOW INDEX FROM your_table;
```

- **Key_name**：索引的名称。
- **Seq_in_index**：索引中列的位置（用于复合索引）。
- **Column_name**：索引使用的列。
- **Cardinality**：索引的基数，表示索引中唯一值的数量。基数越高，查询效率越好。

通过查看这些信息，你可以了解当前表中是否有适当的索引，哪些列已经被索引。

### 2. **使用 `EXPLAIN` 分析查询**

`EXPLAIN` 是 MySQL 提供的工具，用来查看查询的执行计划。它可以告诉你查询是否在使用索引，是否存在全表扫描等问题。

#### 使用 `EXPLAIN` 语句

```sql
EXPLAIN SELECT * FROM your_table WHERE column = 'value';
```

#### `EXPLAIN` 输出字段解读

- **id**：查询的执行顺序标识。
- **select_type**：查询的类型，如 `SIMPLE`、`SUBQUERY`。
- **table**：查询操作的表名。
- **type**：表示查询类型，越精确的类型越好。常见的类型包括：
  - **ALL**：全表扫描，性能最差。
  - **index**：全索引扫描，性能较差。
  - **range**：使用索引范围扫描，性能较好。
  - **ref**：使用非唯一索引查找行。
  - **const**：精确查找单行，性能最好。
- **possible_keys**：查询中可能使用的索引。
- **key**：查询实际使用的索引。
- **rows**：MySQL 预计扫描的行数。
- **Extra**：额外信息，如 `Using index`（索引覆盖）或 `Using filesort`（文件排序）。

#### 示例输出

```sql
EXPLAIN SELECT * FROM employees WHERE last_name = 'Smith';
```

输出示例：

```
+----+-------------+-----------+------+-----------------+------------+---------+-------+------+-------------+
| id | select_type | table     | type | possible_keys   | key        | key_len | ref   | rows | Extra       |
+----+-------------+-----------+------+-----------------+------------+---------+-------+------+-------------+
|  1 | SIMPLE      | employees | ref  | idx_last_name   | idx_last_name | 768   | const | 1    | Using index |
+----+-------------+-----------+------+-----------------+------------+---------+-------+------+-------------+
```

从结果可以看出：
- 查询使用了 `idx_last_name` 索引（`key` 列）。
- 使用 `ref` 查找类型，说明该查询通过索引查找记录，而不是全表扫描。

如果 `type` 是 `ALL`，说明查询进行了全表扫描，这可能会导致性能问题。

### 3. **识别和修复常见的索引问题**

#### 3.1 **缺少索引**

如果查询中的 `WHERE`、`JOIN` 或 `ORDER BY` 子句中的列没有建立索引，MySQL 可能会进行全表扫描或索引范围扫描，导致查询性能下降。你可以根据查询的需求，为这些列添加索引。

##### 添加单列索引

```sql
CREATE INDEX idx_column_name ON your_table (column_name);
```

#### 3.2 **复合索引不正确**

如果查询涉及多个条件，使用复合索引可以大大提高查询效率。复合索引的列顺序非常重要。应该将选择性较高的列放在前面，确保索引能高效地被使用。

##### 添加复合索引

```sql
CREATE INDEX idx_multiple_columns ON your_table (column1, column2);
```

- **例子**：如果查询是 `WHERE column1 = ? AND column2 = ?`，创建复合索引 `(column1, column2)` 会比单独为每个列创建索引更高效。

#### 3.3 **低选择性的索引**

如果索引列的选择性（唯一值的数量）较低，MySQL 可能不会使用该索引。可以通过查询索引的基数（`Cardinality`）来评估选择性：

```sql
SHOW INDEX FROM your_table;
```

你可以通过查看 `Cardinality` 列来评估索引的选择性。如果基数较低，说明该列的重复值较多，索引的效果不理想。

#### 3.4 **冗余索引**

多个列的索引可能会冗余。例如，存在一个复合索引 `(column1, column2)` 时，不需要再为 `column1` 创建单独的索引。冗余索引会增加数据库的维护成本，可以通过 `SHOW INDEX` 查找不必要的索引，并将其删除。

##### 删除冗余索引

```sql
DROP INDEX idx_column_name ON your_table;
```

### 4. **利用 `ANALYZE TABLE` 优化索引**

`ANALYZE TABLE` 命令可以帮助你收集表和索引的统计信息，让 MySQL 优化器更好地选择执行计划。特别是在插入或更新大量数据后，索引统计信息可能会变得不准确，使用 `ANALYZE TABLE` 可以重新计算这些统计信息。

```sql
ANALYZE TABLE your_table;
```

- 这个命令会更新表的索引统计信息，帮助优化器在执行查询时做出更好的索引选择。

### 5. **索引碎片清理**

在频繁进行 `INSERT`、`UPDATE` 或 `DELETE` 操作的表中，索引可能会变得分散或产生碎片，导致查询效率下降。使用 `OPTIMIZE TABLE` 可以减少碎片、重新组织表和索引数据，从而提高性能。

```sql
OPTIMIZE TABLE your_table;
```

这会对表进行碎片整理，重新组织存储结构。

### 6. **查询优化器提示**

MySQL 8 中可以使用优化器提示（Optimizer Hints）来强制查询使用特定的索引，或者控制查询计划。优化器提示可以用于测试查询的性能，确保它们使用了正确的索引。

#### 强制使用特定索引

```sql
SELECT * FROM your_table USE INDEX (idx_column_name) WHERE column = 'value';
```

- **USE INDEX**：强制查询使用特定的索引。
- **IGNORE INDEX**：忽略某个索引，强制查询不使用指定索引。

优化器提示可以帮助你测试不同的索引选择，并选择最合适的索引执行查询。

### 7. **监控索引使用情况**

MySQL 8 中的 `performance_schema` 提供了一些表来帮助你监控查询的索引使用情况，例如 `events_statements_summary_by_digest` 表。你可以使用这些表来查看哪些查询没有使用索引，哪些查询频繁出现等。

#### 查看查询使用的索引

```sql
SELECT
    DIGEST_TEXT,
    COUNT_STAR AS exec_count,
    SUM_TIMER_WAIT/1000000000000 AS total_exec_time_sec,
    INDEX_NAME
FROM
    performance_schema.events_statements_summary_by_digest
WHERE
    INDEX_NAME IS NOT NULL
ORDER BY
    total_exec_time_sec DESC
LIMIT 10;
```

这会显示执行时间最长的查询和使用的索引。如果某些查询没有使用索引，可以检查是否应该为这些查询添加索引。

### 8. **定期监控和优化索引**

通过使用监控工具（如 **Prometheus**、**Grafana**）以及 MySQL 内置的 `performance_schema`，你可以定期监控索引的使用情况和查询性能。定期清理索引碎片、优化查询结构和索引配置，确保数据库的高效运行。

### 总结

1. **检查表结构和索引**：通过 `SHOW INDEX` 查看表中的索引，确定是否缺少关键索引。
2. **使用 `EXPLAIN` 分析查询**：查看查询的执行计划，找出是否存在全表扫描、索引未使用等问题。
3. **修复常见索引问题**：添加必要的索引、删除冗余索引、优化复合索引的顺序等。
4. **利用 `ANALYZE TABLE` 和 `OPTIMIZE TABLE`**：定期更新表和索引的统计信息，并清理索引碎片。
5. **强制使用索引**：使用优化器提示测试不同的索引选择。
6. **定期监控**

：通过 `performance_schema` 和监控工具定期查看索引的使用情况，优化查询性能。

通过这些步骤，你可以有效排查并优化 MySQL 8 中的索引问题，从而提高数据库的查询性能。