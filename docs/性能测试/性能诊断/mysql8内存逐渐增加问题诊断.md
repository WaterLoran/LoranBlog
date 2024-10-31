在持续压测过程中，数据库内存持续增大的可能原因及对应的排查方法、命令和单位如下：

### 1. 缓存机制
- **原因**: 数据库会将数据和索引加载到内存中以提高查询速度。
- **排查方法**:
  - **命令**:
    ```sql
    SHOW STATUS LIKE 'Innodb_buffer_pool_size'; -- 字节
    SHOW STATUS LIKE 'Innodb_buffer_pool_bytes_data'; -- 字节
    SHOW STATUS LIKE 'Innodb_buffer_pool_bytes_dirty'; -- 字节
    ```
- **参考标准**: `Innodb_buffer_pool_bytes_data` 应小于 `Innodb_buffer_pool_size` 的70%-80%。

### 2. 未释放的内存
- **原因**: 内存泄漏可能导致持续的内存增长。
- **排查方法**:
  - **命令**:
    ```sql
    SHOW ENGINE INNODB STATUS;
    ```
  - **参考标准**: 检查“Memory”部分的使用情况，特别关注分配和释放的对象数量。

### 3. 连接数增加
- **原因**: 高并发可能导致打开的连接数不断增加。
- **排查方法**:
  - **命令**:
    ```sql
    SHOW STATUS LIKE 'Threads_connected'; -- 连接数
    SHOW STATUS LIKE 'Threads_running'; -- 正在运行的连接数
    ```
- **参考标准**: 监控连接数，超过200个连接时需考虑优化。

### 4. 临时表和排序
- **原因**: 大量临时表的使用会占用内存。
- **排查方法**:
  - **命令**:
    ```sql
    SHOW STATUS LIKE 'Created_tmp_tables'; -- 计数
    SHOW STATUS LIKE 'Created_tmp_disk_tables'; -- 计数
    ```
- **参考标准**: `Created_tmp_disk_tables` 的数量应尽量小于 `Created_tmp_tables`，理想状态是二者比例大约为10%。

### 5. 长时间运行的查询
- **原因**: 长时间未结束的查询占用内存。
- **排查方法**:
  - **命令**:
    ```sql
    SHOW PROCESSLIST; -- 查看所有进程
    ```
- **参考标准**: 检查运行时间超过5秒的查询，并考虑优化。

### 6. 事务和锁
- **原因**: 开启的事务和锁占用内存。
- **排查方法**:
  
  - **命令**:
    ```sql
    SHOW ENGINE INNODB STATUS;
    ```
  - **参考标准**: 查看锁和事务信息，确保没有长时间占用的事务。

### 7. 内存配置不当
- **原因**: 不合理的内存设置可能导致高内存使用。
- **排查方法**:
  - **命令**:
    ```sql
    SHOW VARIABLES LIKE 'innodb_buffer_pool_size'; -- 字节
    SHOW VARIABLES LIKE 'innodb_log_file_size'; -- 字节
    ```
- **参考标准**: `innodb_buffer_pool_size` 应为总内存的70-80%，例如总内存为16GB时，设置为12GB（`12 * 1024 * 1024 * 1024`）。

### 8. 大数据集的处理
- **原因**: 处理大批量数据时会消耗大量内存。
- **排查方法**:
  - **命令**:
    ```sql
    SHOW STATUS LIKE 'Innodb_rows_inserted'; -- 计数
    SHOW STATUS LIKE 'Innodb_rows_updated'; -- 计数
    ```
- **参考标准**: 监控插入和更新的行数，识别大批量操作，检查是否有异常增加。

### 总结
通过以上命令及其输出单位，可以有效识别和解决数据库在持续压测过程中内存持续增大的原因。定期监控并根据参考标准进行调整，有助于保持数据库性能的稳定性。