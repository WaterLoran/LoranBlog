```python
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import json

# Kafka Producer Example
def produce_message(topic_name):
    # Create Kafka Producer
    producer = KafkaProducer(
        bootstrap_servers='localhost:9092',
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

    # Produce a message
    future = producer.send(topic_name, {'key': 'value', 'message': 'Hello, Kafka from Python!'})

    # Block for 'send' to ensure it completes successfully
    try:
        record_metadata = future.get(timeout=10)
        print(f"Message sent to topic: {record_metadata.topic}, partition: {record_metadata.partition}, offset: {record_metadata.offset}")
    except KafkaError as e:
        print(f"Error sending message: {e}")
    finally:
        producer.close()


# Kafka Consumer Example
def consume_messages(topic_name):
    # Create Kafka Consumer
    consumer = KafkaConsumer(
        topic_name,
        bootstrap_servers='localhost:9092',
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='python_demo_group',
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )

    # Consume messages from topic
    print("Consuming messages...")
    for message in consumer:
        print(f"Consumed message: key = {message.key}, value = {message.value}, partition = {message.partition}, offset = {message.offset}")


if __name__ == '__main__':
    # Topic name
    topic = 'demo_topic'

    # Produce a message to the topic
    produce_message(topic)

    # Consume messages from the topic
    consume_messages(topic)

```



### 代码说明

1. **Producer 部分**:
   - 使用 `KafkaProducer` 向 Kafka 发送消息，设置 Kafka broker 地址 (`localhost:9092`)。
   - 消息被序列化为 JSON 格式。
   - `producer.send()` 方法用于发送消息到指定的 Kafka 主题。

2. **Consumer 部分**:
   - 使用 `KafkaConsumer` 消费来自 Kafka 主题的消息。
   - 订阅的主题是 `demo_topic`，使用了自动提交偏移量（`enable_auto_commit=True`）。
   - 消费者设置为从头开始消费（`auto_offset_reset='earliest'`）。

### 依赖安装
- 安装 `kafka-python` 库：
  ```sh
  pip install kafka-python
  ```

### 运行步骤
1. **启动 Kafka Broker**：
   - 首先确保 Kafka 服务已经启动，监听默认端口 (`localhost:9092`)。

2. **运行代码**：
   - 运行代码文件，会先调用 `produce_message()` 发送一条消息，然后调用 `consume_messages()` 来消费该消息。

这段代码展示了如何使用 Python 与 Kafka 交互，包括生产和消费 Kafka 消息的基本操作。可以根据需求进行扩展，例如加入更多的业务逻辑或使用异步调用等。