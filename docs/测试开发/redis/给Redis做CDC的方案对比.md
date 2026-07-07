# 给Redis做CDC的方案对比

给 Redis 做 CDC，确实有几条不同的技术路径。具体选哪个，主要看你需要追踪什么级别的变更。

### 📊 不同CDC方案对比

下面这张表格汇总了几种主流方案，可以先帮你对它们的差异有个整体把握：

| 方案                                    | 核心原理                                                     | Python 友好度             | 跟踪精度       | 覆盖命令                                                     | 架构侵入性                                     | 可靠性保障                              | 适用场景                                                     |
| :-------------------------------------- | :----------------------------------------------------------- | :------------------------ | :------------- | :----------------------------------------------------------- | :--------------------------------------------- | :-------------------------------------- | :----------------------------------------------------------- |
| **键空间通知 (Keyspace Notifications)** | 订阅Redis内部 `pub/sub` 消息                                 | ★★★★★ (`redis-py`)        | 键级别         | 仅记录**命令**类型 (如 `del`, `expire`, `set`)，**不包含值** | 极低，仅需修改配置                             | 无持久化，消费端宕机即丢失              | **轻量级监听**：通知、缓存失效、简单审计                     |
| **Redis Streams**                       | 应用代码双写，将数据变更写入 `Streams` / `RPUSH` 至 `List`   | ★★★★☆ (`redis-py`)        | **应用自定义** | 变更前后的具体值，业务上下文（如用户ID）                     | 需要修改**写入业务代码**                       | 消费者组、ACK 确认、消息持久化          | **业务审计**：强制要求记录详尽变更日志 (before/after)        |
| **AOF 日志解析 (AOF Tail)**             | 读取、解析Redis **AOF 持久化日志文件**                       | ★☆☆☆☆                     | 命令级别       | **所有写命令** (含具体值)，如 `SET key value`                | 无，完全旁路                                   | **极高**：持久化存储，异常丢失风险低    | **“事后审计/灾难恢复”**：非实时，回溯历史变更                |
| **MONITOR 命令**                        | 实时打印**所有**被执行的命令                                 | ★★★☆☆ (`pipeline` 过滤)   | 命令级别       | **所有命令** (含具体值和客户端信息)                          | 极低，建议仅在排查问题时开启                   | 无，建议仅用于短时调试                  | **实时调试**：定位Bug，实时追踪线上操作                      |
| **RDI (Redis Data Integration)**        | 企业级数据集成平台，可解析源库日志或通过触发器捕获变化，再加载到目标 Redis | ★★★★☆ (配套CLI及插件支持) | **库和表级别** | 对象模型变更 (库/表/文档)                                    | 取决于具体实现，可借助 `Debezium` 等实现低侵入 | **极高**：完善的持久化、容错和回溯机制  | **数据生命周期**：订阅业务全生命周期的近实时同步             |
| **Go语言高性能方案 (参考)**             | 伪码示例：监听Binlog变化，同步至本地缓存                     | ★★☆☆☆（适合参考）         | **数据库行级** | 操作的**具体字段值**及变更前后内容                           | 低（仅需开启MySQL Binlog）                     | 极高：依赖Kafka等成熟消息队列保证可靠性 | **源（Source）为其他数据库时**：反向将DB变更同步至Redis做缓存 |

---

### 🐍 四种立足侧重点不同的Python实现

基于前面的对比，如果你希望直接用Python抓取并处理Redis的变更，主要有这四种方式：

#### 1. 键空间通知 (Keyspace Notifications) - 最轻量
这是纯旁路监听，无需修改业务代码的理想方案，但需要提前开启此功能。

*   **前置设置**：开启键空间通知功能。例如，在`redis-cli`中执行 `CONFIG SET notify-keyspace-events KEA`。
*   **示例代码**：
    ```python
    import redis
    import time
    
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)
    pubsub = r.pubsub()
    # 订阅0号数据库所有键的键空间事件
    pubsub.psubscribe('__keyspace@0__:*') 
    
    print("开始监听所有键的变化...")
    for message in pubsub.listen():
        if message['type'] == 'pmessage':
            # channel格式：__keyspace@0__:your_key
            key = message['channel'].split(':')[-1] 
            event = message['data']  # 事件类型，如 'set', 'del', 'expire', 'hset'
    
            print(f"键 '{key}' 发生了事件：{event}")
            
            # 如果需要获取新值，需要在事件后主动GET，注意并发问题
            if event == 'set':
                new_value = r.get(key)
                print(f"   键 '{key}' 的新值是：{new_value}")
    ```
*   **关键注意**：接收到的通知本身**不包含变更后的值**。你的处理逻辑（如上例所示）需要额外调用`GET`等命令去主动获取，这在高并发场景下可能引入延迟和状态不一致的风险。

#### 2. 业务双写 (Dual Writes) - 最可靠
这种方式最可靠，因为它能保证不管Redis里数据怎么变，你的CDC都一定能记录下来。

*   **核心原理**：在业务代码中，所有对Redis进行写操作的地方，也同时将变更详情（操作类型、变更前后的值等）写入另一个专门用于CDC的数据结构，如Redis **Stream**或**List**。
*   **示例代码**：
    ```python
    import redis
    import json
    import time
    
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)
    
    def set_user_cdc(user_id, data):
        key = f"user:{user_id}"
        # 1. 获取旧值（如果需要）
        old_data = r.get(key)
        # 2. 执行实际业务SET
        r.set(key, json.dumps(data))
        # 3. 将变更记录写入Streams
        r.xadd("cdc:user:stream", {
            'key': key,
            'op': 'set',
            'old_value': old_data,
            'new_value': json.dumps(data),
            'timestamp': time.time()
        })
    
    # 消费者端读取Streams
    def consume_cdc():
        last_id = '0-0'
        while True:
            # 从Stream中读取新消息
            messages = r.xread({"cdc:user:stream": last_id}, block=0)
            for stream_name, stream_data in messages:
                for message_id, fields in stream_data:
                    # 处理变更记录
                    print(f"消费到变更: {fields}")
                    last_id = message_id
    ```
*   **方案评价**：虽然需要修改业务代码，但能提供最完整的变更信息（如新旧值），是企业级应用中确保数据一致性的常用模式。

#### 3. AOF (Append Only File) 日志分析 - 最完整
如果你想在不修改任何代码的情况下，获取最完整、最准确的变更记录，可以**另起一个消费进程专门解析AOF日志**来做到。

*   **核心原理**：借助`pycavedb`这类可以直接解析Redis同步协议的库，或使用`redis-sniffer`、`redis-record`等工具及库直接解析。
*   **示例代码（使用pycavedb库）**：
    ```python
    import cavedb
    import redis
    
    class MyCDC(cavedb.cavedb):
        def notify_command(self, replid, offset, args):
            # args就是解析出来的Redis命令
            print(f"捕获到变更命令: {args}")
            # 你可以在这里实现具体的业务处理
            return True
    
    # 假设你已经持久化了之前的同步进度
    last_offset = 0
    last_replid = ""
    
    cdc_impl = MyCDC()
    # 作为从节点连接到目标Redis
    cdc_impl.slaveof_redis("127.0.0.1", 6379, "", last_replid, last_offset)
    print("CDC 处理器已启动，正在监听变更...")
    # 主循环
    while True:
        time.sleep(1)
    ```
*   **方案评价**：此方案技术门槛最高。但它是实现全量、增量同步的无侵入式方法，非常适合于需要构建热备、异地多活等要求数据绝对准确的场景。

#### 4. Redis Streams 增强版 - 最接近MQ
如果你希望把CDC做得像专业消息队列一样可靠，可以基于Streams设计一套更完善的架构。

*   **核心原理**：在写入业务数据时，同步将变更记录推入一个专门用于CDC的Stream，并由一个健壮的消费者组来异步处理。
*   **关键优势**：无侵入式设计，利用消费者组实现水平扩展和高可用。

---

### 💎 总结

总的来说，这几种方案不是非此即彼的单选题，关键还是看你的核心需求是什么：

*   如果定位问题，看的是**命令和键**，用**键空间通知**最合适。
*   如果需要**事后回溯某个时间段**的变更，借助**AOF日志分析**是正确选择。
*   如果希望打通上下游数据库，同步对象是**表/文档**这类模型，**Debezium + Kafka + RDI**是企业级的最优解。
*   如果你的源数据库是 **MySQL/PostgreSQL** ，并且想把变更同步到Redis，此时针对的已经不是Redis自身，数据源变成了 **DB Binlog/Logical Replication**，那就需要回到更经典的CDC架构了。