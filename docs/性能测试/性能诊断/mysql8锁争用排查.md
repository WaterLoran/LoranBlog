在 MySQL 8 中，锁争用（lock contention）是导致查询性能下降、系统吞吐量减低的常见原因。锁争用问题通常会导致查询等待时间增加，甚至发生死锁。排查锁争用可以帮助优化数据库的并发性能。下面是排查 MySQL 8 中锁争用的常用方法和步骤。

### 1. **查看当前的锁等待**

MySQL 8 提供了多种方式来检查当前是否有锁争用，包括 `performance_schema` 表和 `SHOW ENGINE INNODB STATUS` 命令。

#### 1.1 **使用 `performance_schema.data_locks` 和 `data_lock_waits`**

MySQL 8 的 `performance_schema` 模块包含 `data_locks` 和 `data_lock_waits` 表，它们可以用来查看当前系统中的锁和锁等待情况。

```sql
-- 查看当前的锁
SELECT * FROM performance_schema.data_locks;

-- 查看当前的锁等待情况
SELECT * FROM performance_schema.data_lock_waits;
```

- **`performance_schema.data_locks`**：显示系统中所有持有的锁。
- **`performance_schema.data_lock_waits`**：显示当前所有锁等待的详细信息，包括持有锁的事务和正在等待该锁的事务。

#### 1.2 **使用 `SHOW ENGINE INNODB STATUS`**

`SHOW ENGINE INNODB STATUS` 是另一种用来排查锁争用的常用命令，它显示了当前 InnoDB 存储引擎的详细运行状态，包括事务信息、锁等待、死锁等。

```sql
SHOW ENGINE INNODB STATUS;
```

在输出的 **TRANSACTIONS** 部分，你可以看到当前正在等待的锁情况。如果存在锁等待或锁超时，会在输出中清晰显示哪些事务正在等待以及等待的时间。

#### 关键信息：
- **TRANSACTIONS**：展示了当前正在进行的事务，哪些事务在等待锁。
- **WAITING FOR THIS LOCK TO BE GRANTED**：表示事务正在等待一个锁的释放。
- **LATEST DETECTED DEADLOCK**：如果有死锁发生，会在这里显示最近的死锁信息。

### 2. **使用 `SHOW PROCESSLIST` 检查锁等待**

`SHOW PROCESSLIST` 可以帮助你查看当前所有连接的状态，尤其是哪些查询正在等待锁。

```sql
SHOW FULL PROCESSLIST;
```

- **Command** 列：如果显示 `Locked`，说明该查询正在等待获取锁。
- **Time** 列：显示查询已经等待了多长时间。
- **Info** 列：显示正在执行的 SQL 语句。

你可以通过 `SHOW FULL PROCESSLIST` 来定位那些长时间处于 `Locked` 状态的查询，并结合事务或锁信息进一步分析。

### 3. **死锁检测与分析**

MySQL 8 自动检测死锁，并会记录最近一次死锁的详细信息。可以通过 `SHOW ENGINE INNODB STATUS` 查看最新的死锁报告。

#### 3.1 **查看最近的死锁信息**

```sql
SHOW ENGINE INNODB STATUS;
```

在 **LATEST DETECTED DEADLOCK** 部分，你可以看到死锁的详细信息，包括哪个事务被 MySQL 选择回滚、哪些锁导致了死锁、以及参与死锁的 SQL 语句。

#### 3.2 **启用 `innodb_print_all_deadlocks`**

如果你想让所有死锁都记录到错误日志中，而不仅仅是最近一次死锁，你可以启用 `innodb_print_all_deadlocks` 选项：

```sql
SET GLOBAL innodb_print_all_deadlocks = 'ON';
```

这会让 MySQL 将所有的死锁记录到错误日志文件中，你可以定期查看日志文件了解死锁情况。

### 4. **事务隔离级别和锁等待**

MySQL 支持不同的事务隔离级别，不同的隔离级别对锁的处理有所不同。你可以通过调整事务的隔离级别来减少锁争用。

- **READ UNCOMMITTED**：事务可以读取未提交的数据，几乎不会引发锁争用，但可能导致“脏读”问题。
- **READ COMMITTED**：只能读取已提交的数据，锁冲突较少，是常用的隔离级别之一。
- **REPEATABLE READ**（默认级别）：避免“幻读”和“不可重复读”，但可能增加锁争用。
- **SERIALIZABLE**：最严格的隔离级别，可能导致最多的锁争用。

#### 4.1 **查看当前隔离级别**

```sql
SHOW VARIABLES LIKE 'transaction_isolation';
```

#### 4.2 **调整隔离级别**

你可以通过降低隔离级别（如从 `SERIALIZABLE` 降为 `READ COMMITTED`）来减少锁争用：

```sql
SET GLOBAL transaction_isolation = 'READ COMMITTED';
```

也可以在事务内部指定隔离级别，以便局部控制：

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

### 5. **锁等待超时设置**

MySQL 提供了锁等待超时设置，防止长时间的锁等待影响系统性能。

#### 5.1 **查看锁等待超时设置**

```sql
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';
```

- **innodb_lock_wait_timeout**：控制事务等待锁的最大时间（单位为秒）。如果锁等待时间超过该值，MySQL 会返回错误并回滚事务。

#### 5.2 **调整锁等待超时**

你可以通过调整该参数来控制锁等待的最大时间，避免锁等待时间过长：

```sql
SET GLOBAL innodb_lock_wait_timeout = 30;  -- 设置为30秒
```

合理设置超时时间可以有效防止长时间的锁争用。

### 6. **锁争用的解决与优化**

#### 6.1 **缩短事务的执行时间**
- 确保事务尽量简短，避免长时间持有锁。可以将大型事务拆分为多个小事务，减少锁的持有时间。
- 将较复杂的查询放在事务之外，尽量减少在事务中执行复杂的查询操作。

#### 6.2 **使用合适的索引**
- 确保查询中的 `WHERE` 子句和 `JOIN` 操作使用了适当的索引，减少扫描的行数，从而减少锁的范围和锁争用。
- 避免在事务中使用 `SELECT *`，只查询必要的列，以减少锁的行数和大小。

#### 6.3 **表分区与分表**
- 如果某张表非常大，可以考虑使用 **分区表** 或 **分表** 来减少单个表的锁范围。
- 表分区有助于减少锁定的范围和影响，特别是在高并发写入的场景中。

#### 6.4 **适当使用乐观锁**
- 对于不频繁发生冲突的场景，可以考虑使用乐观锁（如通过版本号控制并发更新），从而避免传统悲观锁带来的性能问题。

#### 6.5 **避免长时间持有锁的读写操作**
- 长时间的读写操作（如批量更新、复杂查询）可能会长时间占用锁资源，建议这些操作在业务低峰期执行，或者分批处理，以减少对锁的争用。

### 7. **实时监控与报警**

为了及时发现锁争用问题，你可以使用监控工具（如 Prometheus + Grafana）来实时监控 MySQL 的锁等待、锁争用情况。你可以通过监控以下指标来识别潜在的问题：
- **锁等待时间**：通过 `performance_schema` 表获取锁等待时间。
- **事务执行时间**：监控长时间运行的事务，识别可能存在锁争用的事务。
- **死锁检测**：及时发现并报警。

### 总结

排查 MySQL 8 中的锁争用可以通过以下几步进行：
1. **使用 `performance_schema.data_locks` 和 `data_lock_waits` 查看当前的锁和锁等待情况**。
2. **使用 `SHOW ENGINE INNODB STATUS` 分析锁等待和死锁信息**。
3. **使用 `SHOW PROCESSLIST` 检查长时间等待的查询**。
4. **分析事务隔离级别**，并通过调整隔离级别减少锁争用。
5. **调整锁等待超时设置**，防止长时间锁等待影响系统性能。
6. **缩短事务执行时间、增加索引、优化查询结构**，减少锁争用。
7. **通过监控工具** 实时监控锁争用情况并进行报警。

通过以上步骤，你可以识别并解决 MySQL 8 中的锁争用问题，从而提升数据库的并发性能和响应速度。