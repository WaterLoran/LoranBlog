要优化MySQL 8数据库的性能，可以通过以下配置和调整实现。下面列出了主要配置项、操作步骤以及参考标准：

### 1. 调整缓冲池大小
- **配置项**: `innodb_buffer_pool_size`
- **操作**:
  ```sql
  SET GLOBAL innodb_buffer_pool_size = <size_in_bytes>;
  SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
  ```
  - 通常设置为系统内存的70-80%。
- **参考标准**: 如果系统内存为16GB，可以设置为12GB（`12 * 1024 * 1024 * 1024`）。

### 2. 启用查询缓存（不推荐用于高并发）
- **配置项**: `query_cache_type` 和 `query_cache_size`
- **操作**:
  ```sql
  SET GLOBAL query_cache_type = ON;
  SET GLOBAL query_cache_size = <size_in_bytes>;
  SHOW VARIABLES LIKE 'query_cache_type';
  SHOW VARIABLES LIKE 'query_cache_size';
  ```
- **参考标准**: 大约10MB的查询缓存大小可以作为初始值，具体根据应用需求调整。

### 3. 调整日志文件大小
- **配置项**: `innodb_log_file_size`
- **操作**:
  ```sql
  SET GLOBAL innodb_log_file_size = <size_in_bytes>;
  SHOW VARIABLES LIKE 'innodb_log_file_size';
  ```
- **参考标准**: 设置为512MB或1GB，可以提高写入性能。

### 4. 优化并发性能
- **配置项**: `innodb_thread_concurrency`
- **操作**:
  ```sql
  SET GLOBAL innodb_thread_concurrency = <number>;
  SHOW VARIABLES LIKE 'innodb_thread_concurrency';
  ```
- **参考标准**: 通常设置为CPU核心数的2倍。

### 5. 启用或调整压缩
- **配置项**: `innodb_compression_algorithm`
- **操作**:
  ```sql
  SET GLOBAL innodb_compression_algorithm = 'zlib';
  SHOW VARIABLES LIKE 'innodb_compression_algorithm';
  ```
- **参考标准**: 使用`zlib`压缩算法通常能带来良好的性能与压缩比。

### 6. 调整临时表大小
- **配置项**: `tmp_table_size` 和 `max_heap_table_size`
- **操作**:
  ```sql
  SET GLOBAL tmp_table_size = <size_in_bytes>;
  SET GLOBAL max_heap_table_size = <size_in_bytes>;
  SHOW VARIABLES LIKE 'tmp_table_size';
  SHOW VARIABLES LIKE 'max_heap_table_size';
  ```
- **参考标准**: 设置为256MB可以减少磁盘临时表的使用。

### 7. 优化慢查询
- **配置项**: `slow_query_log` 和 `long_query_time`
- **操作**:
  ```sql
  SET GLOBAL slow_query_log = 'ON';
  SET GLOBAL long_query_time = 1; -- 秒
  SHOW VARIABLES LIKE 'slow_query_log';
  SHOW VARIABLES LIKE 'long_query_time';
  ```
- **参考标准**: 记录超过1秒的查询，便于后续优化。

### 8. 使用合适的存储引擎
- **选择引擎**: 使用InnoDB作为默认存储引擎。
- **操作**:
  ```sql
  SET GLOBAL default_storage_engine = 'InnoDB';
  SHOW VARIABLES LIKE 'default_storage_engine';
  ```

### 9. 调整索引
- **优化索引**: 使用`EXPLAIN`语句分析查询，添加或修改索引。
- **操作**: 
  ```sql
  CREATE INDEX idx_name ON table_name(column_name);
  SHOW INDEX FROM your_table_name; -- 替换为实际表名
  ```
- **参考标准**: 确保索引覆盖最常用的查询字段。

### 10. 监控和调优
- **工具**: 使用性能模式（Performance Schema）监控数据库性能。

- **操作**: 
  ```sql
  SELECT * FROM performance_schema.events_statements_summary_by_digest ORDER BY SUM_TIMER_WAIT DESC;
  # 查出来的数据的单位是 皮秒, 1秒=10^12皮秒
  ```
  
- **参考标准**: 定期检查执行计划，优化性能瓶颈。

查询汇总

```sql
# 1. 查询缓冲池大小
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
# 2. 查询查询缓存状态
SHOW VARIABLES LIKE 'query_cache_type';
SHOW VARIABLES LIKE 'query_cache_size';
# 3. 查询日志文件大小
SHOW VARIABLES LIKE 'innodb_log_file_size';
# 4. 查询并发性能设置
SHOW VARIABLES LIKE 'innodb_thread_concurrency';
# 5. 查询压缩算法
SHOW VARIABLES LIKE 'innodb_compression_algorithm';
# 6. 查询临时表大小
SHOW VARIABLES LIKE 'tmp_table_size';
SHOW VARIABLES LIKE 'max_heap_table_size';
#7. 查询慢查询日志状态
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
# 8. 查询默认存储引擎
SHOW VARIABLES LIKE 'default_storage_engine';
# 9. 查询当前索引信息
SHOW INDEX FROM your_table_name; -- 替换为实际表名
# 10. 查询性能模式设置# 
SHOW VARIABLES LIKE 'performance_schema';
```

通过以上配置和调整，可以显著提升MySQL 8的性能，确保其在高负载下的稳定性和响应速度。