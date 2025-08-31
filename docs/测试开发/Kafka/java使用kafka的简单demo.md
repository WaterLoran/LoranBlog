以下是一个简单的 Java 应用程序演示，展示如何使用 Apache Kafka 生产者和消费者。这个示例使用 Kafka 的官方客户端库来向一个 Kafka 主题中发布消息（Producer），然后从该主题中消费消息（Consumer）。

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;
import java.util.concurrent.ExecutionException;

public class KafkaDemo {

    public static void main(String[] args) {
        // Topic Name
        String topicName = "demo_topic";

        // Produce a message
        produceMessage(topicName);

        // Consume messages
        consumeMessages(topicName);
    }

    public static void produceMessage(String topicName) {
        // Set Producer properties
        Properties producerProps = new Properties();
        producerProps.put("bootstrap.servers", "localhost:9092"); // Kafka Broker
        producerProps.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

        // Create Kafka Producer
        Producer<String, String> producer = new KafkaProducer<>(producerProps);

        // Create Producer Record
        ProducerRecord<String, String> record = new ProducerRecord<>(topicName, "key1", "Hello, Kafka!");

        try {
            // Send the message and get metadata
            RecordMetadata metadata = producer.send(record).get();
            System.out.printf("Message sent to topic: %s, partition: %d, offset: %d\n", metadata.topic(), metadata.partition(), metadata.offset());
        } catch (InterruptedException | ExecutionException e) {
            e.printStackTrace();
        } finally {
            producer.close();
        }
    }

    public static void consumeMessages(String topicName) {
        // Set Consumer properties
        Properties consumerProps = new Properties();
        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092"); // Kafka Broker
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, "demo_group");
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringDeserializer");

        // Create Kafka Consumer
        Consumer<String, String> consumer = new KafkaConsumer<>(consumerProps);

        // Subscribe to the topic
        consumer.subscribe(Collections.singletonList(topicName));

        // Poll for messages
        try {
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
                for (ConsumerRecord<String, String> record : records) {
                    System.out.printf("Consumed message: key = %s, value = %s, from partition = %d, offset = %d\n",
                            record.key(), record.value(), record.partition(), record.offset());
                }
            }
        } finally {
            consumer.close();
        }
    }
}

```



### 代码说明：
1. **Producer 部分**:
   - 设置 Kafka Producer 的属性，例如 Kafka broker 地址 (`localhost:9092`)、键和值的序列化类。
   - 创建 `KafkaProducer` 对象，用于向 Kafka 发送消息。
   - 发送消息到主题 `demo_topic`。

2. **Consumer 部分**:
   - 设置 Kafka Consumer 的属性，例如 Kafka broker 地址、消费者组 ID 等。
   - 创建 `KafkaConsumer` 对象并订阅主题 `demo_topic`。
   - 不断轮询（`poll`）主题，获取新的消息并打印出来。

### 依赖
为了运行这段代码，你需要添加 Kafka 的客户端依赖，可以通过 Maven 添加以下依赖：
```xml
<dependency>
    <groupId>org.apache.kafka</groupId>
    <artifactId>kafka-clients</artifactId>
    <version>2.8.0</version> <!-- 可以根据需要更改版本 -->
</dependency>
```

### 运行步骤：
1. **启动 Kafka Broker**：
   - 首先确保 Kafka 服务已启动，并监听默认端口 (`localhost:9092`)。

2. **运行代码**：
   - 运行上述代码，首先会调用 `produceMessage()` 发送一条消息，然后调用 `consumeMessages()` 开始消费该消息。

这段代码可以让你快速理解如何使用 Java 来与 Kafka 进行交互。它包含生产消息、消费消息的完整示例，可以根据需求扩展到更复杂的场景。