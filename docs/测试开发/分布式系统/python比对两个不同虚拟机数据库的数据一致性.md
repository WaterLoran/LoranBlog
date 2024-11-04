如果两个主从数据库在不同的虚拟机上，您不能直接在一个SQL命令中同时查询这两个数据库。要比较它们的数据一致性，您可以使用以下几种方法：

### 方法 1: 数据导出与比较

1. **导出数据**：
   - 使用 `mysqldump` 将两个数据库中表的数据导出到文件：
     ```bash
     mysqldump -u your_user -p --no-create-info master_db test_table > master_data.sql
     mysqldump -u your_user -p --no-create-info slave_db test_table > slave_data.sql
     ```

2. **比较数据**：
   - 使用文件比较工具（如 `diff`）对导出的SQL文件进行比较：
     ```bash
     diff master_data.sql slave_data.sql
     ```

### 方法 2: 使用 ETL 工具

使用数据集成工具（如 Apache NiFi、Talend、Pentaho 等）来提取、转换和加载数据，并在数据加载后进行比较。

### 方法 3: Python 脚本

编写一个Python脚本，分别连接到两个数据库，查询数据并进行比较。以下是一个简单示例：

```python
import mysql.connector

# 数据库连接配置
MASTER_DB_CONFIG = {
    'user': 'your_user',
    'password': 'your_password',
    'host': 'master_db_host',
    'database': 'master_db',
}

SLAVE_DB_CONFIG = {
    'user': 'your_user',
    'password': 'your_password',
    'host': 'slave_db_host',
    'database': 'slave_db',
}

def fetch_data(query, config):
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()
    cursor.execute(query)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

def compare_data(master_data, slave_data):
    master_set = set(master_data)
    slave_set = set(slave_data)

    in_master_not_in_slave = master_set - slave_set
    in_slave_not_in_master = slave_set - master_set

    return in_master_not_in_slave, in_slave_not_in_master

def main():
    query = "SELECT * FROM test_table ORDER BY id;"  # 假设按 id 排序
    master_data = fetch_data(query, MASTER_DB_CONFIG)
    slave_data = fetch_data(query, SLAVE_DB_CONFIG)

    in_master_not_in_slave, in_slave_not_in_master = compare_data(master_data, slave_data)

    if in_master_not_in_slave:
        print("Records in master but not in slave:")
        for record in in_master_not_in_slave:
            print(record)

    if in_slave_not_in_master:
        print("Records in slave but not in master:")
        for record in in_slave_not_in_master:
            print(record)

if __name__ == "__main__":
    main()
```

### 注意事项
- 确保在比较之前，两个表的结构一致。
- 考虑数据量的大小，可能需要对数据进行分批处理。
- 可以根据实际需要优化数据查询和比较的逻辑。

通过以上方法，您可以有效地比较不同虚拟机上的主从数据库数据的一致性。